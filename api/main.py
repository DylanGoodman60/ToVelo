"""Read-only API over warehouse.db.

Run from the project root:  uvicorn api.main:app --reload
"""
import math
import sqlite3
from pathlib import Path

from fastapi import FastAPI

DB_PATH = Path(__file__).resolve().parent.parent / "warehouse.db"
MIN_TRIP_DURATION_SECONDS = 2

app = FastAPI()


def haversine_km(lat1, lon1, lat2, lon2):
    """Great-circle distance in km. SQLite has no trig functions guaranteed, so we register this."""
    if None in (lat1, lon1, lat2, lon2):
        return None
    a = (
        math.sin(math.radians(lat2 - lat1) / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    )
    return 2 * 6371.0088 * math.asin(math.sqrt(min(1.0, max(0.0, a))))


def query(sql: str, params: dict | tuple = ()) -> list[dict]:
    # new read-only connection per request (sqlite connections aren't thread-safe to share)
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    conn.create_function("haversine", 4, haversine_km, deterministic=True)
    try:
        return [dict(row) for row in conn.execute(sql, params)]
    finally:
        conn.close()


@app.get("/api/stations")
def get_stations():
    return query(
        """
        select
            stations.station_id,
            stations.name,
            stations.lat,
            stations.lon,
            coalesce(station_stats.start_trip_count, 0) as start_trip_count,
            coalesce(station_stats.end_trip_count, 0) as end_trip_count,
            coalesce(station_stats.round_trip_count, 0) as round_trip_count,
            station_stats.popularity_order,
            station_stats.peak_start_day,
            station_stats.peak_start_hour
        from stations
        left join station_stats using (station_id)
        where stations.is_active = 1
        """
    )


ROUTE_STATS_SQL = """
with station_distance as (
    select haversine(s.lat, s.lon, e.lat, e.lon) as distance_km
    from (select 1) as seed
    left join stations as s on s.station_id = :start_id
    left join stations as e on e.station_id = :end_id
),
qualifying_trips as (
    select t.trip_duration as duration, sd.distance_km
    from trips as t
    cross join station_distance as sd
    where :start_id <> :end_id
      and t.start_station_id = :start_id
      and t.end_station_id = :end_id
      and t.end_time is not null
    and t.trip_duration > :min_duration
),
-- SQLite has no percentile_cont, so interpolate the 10th percentile by hand:
-- position = 0.10 * (n - 1) over the sorted durations (0-indexed)
ranked as (
    select duration,
           row_number() over (order by duration) - 1 as rn,
           count(*) over () as n
    from qualifying_trips
),
pct as (
    select
        max(case when rn = cast(0.10 * (n - 1) as integer) then duration end) as lo,
        max(case when rn = min(cast(0.10 * (n - 1) as integer) + 1, n - 1) then duration end) as hi,
        max(0.10 * (n - 1) - cast(0.10 * (n - 1) as integer)) as frac
    from ranked
)
select
    count(*)                                       as completed_trip_count,
    avg(duration)                                  as average_duration_seconds,
    (select lo + frac * (hi - lo) from pct)        as tenth_percentile_duration_seconds,
    min(duration)                                  as fastest_duration_seconds,
    avg(distance_km * 3600.0 / duration)           as average_straight_line_speed_kmh
from qualifying_trips
"""


@app.get("/api/route-stats")
def get_route_stats(start: int, end: int):
    return query(
        ROUTE_STATS_SQL,
        {
            "start_id": start,
            "end_id": end,
            "min_duration": MIN_TRIP_DURATION_SECONDS,
        },
    )[0]