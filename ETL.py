"""Load trip CSVs and station data into one SQLite db. Safe to re-run.

  trips    : every CSV in the folder, fully replaced each run
  stations : pulled from the bike share API, upserted each run

Usage: python csv_to_sqlite.py ./data warehouse.db
"""
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import requests

input_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "data")
db_path = sys.argv[2] if len(sys.argv) > 2 else "warehouse.db"
STATIONS_URL = "https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information"


# ---------- trips: CSVs -> one table (full replace) ----------
frames = []
for path in sorted(input_dir.glob("*.csv")):
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
    print(f"{path.name}: {len(df)} rows, {len(df.columns)} cols")
    frames.append(df)

trips = pd.concat(frames, ignore_index=True)

with sqlite3.connect(db_path) as conn:
    trips.to_sql("trips", conn, if_exists="replace", index=False)
    conn.execute(
        "create index if not exists trips_start_end_station_id_idx "
        "on trips (start_station_id, end_station_id)"
    )
print(f"trips: {len(trips)} rows loaded")


# ---------- stations: API -> upsert ----------
resp = requests.get(STATIONS_URL, timeout=30)
resp.raise_for_status()
stations = [
    (int(s["station_id"]), s["name"], s["lat"], s["lon"], s.get("capacity"))
    for s in resp.json()["data"]["stations"]
]

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
    conn.execute(
        "update stations set is_active = 0 where last_seen_at < ?", (cutoff_str,)
    )
print(f"stations: {len(stations)} upserted")

print(f"Done -> {db_path}")
