"""Load trip CSVs and station data into one SQLite db. Safe to re-run.

  trips    : every CSV in the folder, fully replaced each run
    stations : pulled from the bike share API, upserted each run
    station_stats : rebuilt from valid completed trips each run
    trips.distance_km : straight-line (haversine) start->end distance, filled after stations load

Usage: python csv_to_sqlite.py ./data warehouse.db
"""
import logging
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from time import perf_counter

import numpy as np
import pandas as pd
import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

input_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "data")
db_path = sys.argv[2] if len(sys.argv) > 2 else "warehouse.db"
STATIONS_URL = "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information"
MIN_TRIP_DURATION_SECONDS = 2
EARTH_RADIUS_KM = 6371.0088
etl_started = perf_counter()

logger.info("Starting ETL: input_dir=%s database=%s", input_dir, db_path)


# ---------- trips: CSVs -> one table (full replace) ----------
frames = []
csv_paths = sorted(input_dir.glob("*.csv"))
logger.info("Found %d CSV files in %s", len(csv_paths), input_dir)

for path in csv_paths:
    df = pd.read_csv(path, encoding="cp1252")
    df.columns = df.columns.str.lower()
    df["source_file"] = path.name  # tracks which CSV each row came from
    if frames and list(df.columns) != list(frames[0].columns):
        first = frames[0]
        expected, got = list(first.columns), list(df.columns)
        raise ValueError(
            f"Column mismatch in {path.name} vs {first['source_file'][0]}\n"
            f"  missing from {path.name}: {sorted(set(expected) - set(got))}\n"
            f"  extra in {path.name}:     {sorted(set(got) - set(expected))}\n"
            f"  expected: {[repr(c) for c in expected]}\n"
            f"  got:      {[repr(c) for c in got]}"
        )
    logger.info("Loaded %s: rows=%d columns=%d", path.name, len(df), len(df.columns))
    frames.append(df)

trips = pd.concat(frames, ignore_index=True)
# missing ids make pandas read these as float64 (3464.0); nullable Int64 stores real integers
for column in ("start_station_id", "end_station_id"):
    trips[column] = trips[column].astype("Int64")
logger.info("Combined trip data: rows=%d columns=%d", len(trips), len(trips.columns))

trip_stage_started = perf_counter()
logger.info("Replacing trips table and rebuilding station summaries")
with sqlite3.connect(db_path) as conn:
    trips.to_sql("trips", conn, if_exists="replace", index=False)
    conn.execute(
        "create index if not exists trips_start_end_station_id_idx "
        "on trips (start_station_id, end_station_id)"
    )
    conn.execute(
        "create index if not exists trips_end_station_id_idx "
        "on trips (end_station_id)"
    )
    conn.execute("""
        create table if not exists station_stats (
            station_id        integer primary key,
            start_trip_count  integer not null,
            end_trip_count    integer not null,
            round_trip_count  integer not null,
            popularity_order  integer not null,
            peak_start_day    integer,
            peak_start_hour   integer
        )
    """)
    station_stats_columns = {
        row[1] for row in conn.execute("pragma table_info(station_stats)")
    }
    for column in ("peak_start_day", "peak_start_hour"):
        if column not in station_stats_columns:
            conn.execute(f"alter table station_stats add column {column} integer")

    conn.execute("delete from station_stats")
    conn.execute("""
        with start_counts as (
            select
                start_station_id as station_id,
                count(*) as start_trip_count,
                sum(case when start_station_id = end_station_id then 1 else 0 end) as round_trip_count
            from trips
            where start_station_id is not null
              and end_station_id is not null
              and end_time is not null
              and trip_duration > ?
            group by start_station_id
        ), end_counts as (
            select
                end_station_id as station_id,
                count(*) as end_trip_count
            from trips
            where start_station_id is not null
              and end_station_id is not null
              and end_time is not null
              and trip_duration > ?
            group by end_station_id
        ), time_counts as materialized (
            select
                start_station_id as station_id,
                cast(strftime('%w', start_time) as integer) as start_day,
                cast(strftime('%H', start_time) as integer) as start_hour,
                count(*) as trip_count
            from trips
            where start_station_id is not null
              and end_station_id is not null
              and end_time is not null
              and trip_duration > ?
              and start_time is not null
              and strftime('%w', start_time) is not null
              and strftime('%H', start_time) is not null
            group by
                start_station_id,
                cast(strftime('%w', start_time) as integer),
                cast(strftime('%H', start_time) as integer)
        ), hour_counts as (
            select station_id, start_hour, sum(trip_count) as trip_count
            from time_counts
            group by station_id, start_hour
        ), ranked_hours as (
            select
                station_id,
                start_hour,
                row_number() over (
                    partition by station_id
                    order by trip_count desc, start_hour asc
                ) as position
            from hour_counts
        ), day_counts as (
            select station_id, start_day, sum(trip_count) as trip_count
            from time_counts
            group by station_id, start_day
        ), ranked_days as (
            select
                station_id,
                start_day,
                row_number() over (
                    partition by station_id
                    order by trip_count desc, start_day asc
                ) as position
            from day_counts
        ), station_ids as (
            select station_id from start_counts
            union
            select station_id from end_counts
        ), station_counts as (
            select
                station_ids.station_id,
                coalesce(start_counts.start_trip_count, 0) as start_trip_count,
                coalesce(end_counts.end_trip_count, 0) as end_trip_count,
                coalesce(start_counts.round_trip_count, 0) as round_trip_count,
                ranked_days.start_day as peak_start_day,
                ranked_hours.start_hour as peak_start_hour
            from station_ids
            left join start_counts using (station_id)
            left join end_counts using (station_id)
            left join ranked_days
                on ranked_days.station_id = station_ids.station_id
                and ranked_days.position = 1
            left join ranked_hours
                on ranked_hours.station_id = station_ids.station_id
                and ranked_hours.position = 1
        ), ranked_station_counts as (
            select
                station_id,
                start_trip_count,
                end_trip_count,
                round_trip_count,
                peak_start_day,
                peak_start_hour,
                rank() over (order by start_trip_count + end_trip_count desc) as popularity_order
            from station_counts
        )
        insert into station_stats (
            station_id,
            start_trip_count,
            end_trip_count,
            round_trip_count,
            popularity_order,
            peak_start_day,
            peak_start_hour
        )
        select
            station_id,
            start_trip_count,
            end_trip_count,
            round_trip_count,
            popularity_order,
            peak_start_day,
            peak_start_hour
        from ranked_station_counts
    """, (
        MIN_TRIP_DURATION_SECONDS,
        MIN_TRIP_DURATION_SECONDS,
        MIN_TRIP_DURATION_SECONDS,
    ))
    station_summary = conn.execute("""
        select count(*),
               coalesce(sum(start_trip_count), 0),
               coalesce(sum(end_trip_count), 0)
        from station_stats
    """).fetchone()
logger.info(
    "Trip stage complete: trips=%d stations_with_stats=%d valid_starts=%d "
    "valid_ends=%d elapsed=%.1fs",
    len(trips),
    station_summary[0],
    station_summary[1],
    station_summary[2],
    perf_counter() - trip_stage_started,
)


# ---------- stations: API -> upsert ----------
station_stage_started = perf_counter()
logger.info("Fetching current station information from %s", STATIONS_URL)
resp = requests.get(STATIONS_URL, timeout=30)
resp.raise_for_status()
stations = [
    (int(s["station_id"]), s["name"], s["lat"], s["lon"], s.get("capacity"))
    for s in resp.json()["data"]["stations"]
]
logger.info("Station feed returned %d stations", len(stations))

now = datetime.now(timezone.utc)
now_str = now.isoformat(timespec="seconds")
cutoff_str = (now - timedelta(days=1)).isoformat(timespec="seconds")

with sqlite3.connect(db_path) as conn:
    conn.execute("""
        create table if not exists stations (
            station_id   integer primary key,
            name         text,
            lat          real,
            lon          real,
            capacity     integer,
            is_active    integer,
            last_seen_at text
        )
    """)
    conn.executemany("""
        insert into stations (station_id, name, lat, lon, capacity, is_active, last_seen_at)
        values (?, ?, ?, ?, ?, 1, ?)
        on conflict (station_id) do update set
            name = excluded.name,
            lat = excluded.lat,
            lon = excluded.lon,
            capacity = excluded.capacity,
            is_active = 1,
            last_seen_at = excluded.last_seen_at
    """, [(*s, now_str) for s in stations])

    # anything not seen in the last day gets flagged inactive
    inactive_update = conn.execute(
        "update stations set is_active = 0 where is_active <> 0 and last_seen_at < ?",
        (cutoff_str,),
    )
    active_count, total_count = conn.execute(
        "select sum(is_active = 1), count(*) from stations"
    ).fetchone()
logger.info(
    "Station stage complete: feed_rows=%d active_stations=%d total_stations=%d "
    "newly_inactivated=%d elapsed=%.1fs",
    len(stations),
    active_count or 0,
    total_count,
    max(inactive_update.rowcount, 0),
    perf_counter() - station_stage_started,
)

# ---------- trip distances: haversine per station pair -> trips.distance_km ----------
distance_stage_started = perf_counter()
logger.info("Computing straight-line trip distances")


def haversine_km(lat1, lon1, lat2, lon2):
    """Vectorized great-circle distance in km."""
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = (
        np.sin((lat2 - lat1) / 2) ** 2
        + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_KM * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))


with sqlite3.connect(db_path) as conn:
    # distance only depends on the (start, end) pair, so compute it once per distinct pair
    pairs = pd.read_sql_query(
        """
        select p.start_station_id, p.end_station_id,
               s.lat as start_lat, s.lon as start_lon,
               e.lat as end_lat, e.lon as end_lon
        from (select distinct start_station_id, end_station_id from trips) as p
        left join stations as s on s.station_id = p.start_station_id
        left join stations as e on e.station_id = p.end_station_id
        """,
        conn,
    )
    pairs["distance_km"] = haversine_km(
        pairs["start_lat"], pairs["start_lon"], pairs["end_lat"], pairs["end_lon"]
    )  # NaN (-> NULL) when either station is unknown
    pairs[["start_station_id", "end_station_id", "distance_km"]].to_sql(
        "route_distances", conn, if_exists="replace", index=False
    )
    conn.execute(
        "create unique index route_distances_pair_idx "
        "on route_distances (start_station_id, end_station_id)"
    )
    conn.execute("alter table trips add column distance_km real")
    conn.execute("""
        update trips set distance_km = (
            select rd.distance_km from route_distances as rd
            where rd.start_station_id = trips.start_station_id
              and rd.end_station_id = trips.end_station_id
        )
    """)
    conn.execute("drop table route_distances")
    missing_distance = conn.execute(
        "select count(*) from trips where distance_km is null"
    ).fetchone()[0]
logger.info(
    "Distance stage complete: pairs=%d trips_without_distance=%d elapsed=%.1fs",
    len(pairs),
    missing_distance,
    perf_counter() - distance_stage_started,
)

logger.info("ETL complete: database=%s total_elapsed=%.1fs", db_path, perf_counter() - etl_started)
