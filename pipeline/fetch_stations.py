import requests
import psycopg2
import duckdb

resp = requests.get("https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information")
resp.raise_for_status()
stations = resp.json()["data"]["stations"]

rows = [
    {
        "station_id": int(s["station_id"]),
        "name": s["name"],
        "lat": s["lat"],
        "lon": s["lon"],
        "capacity": s.get("capacity"),
    }
    for s in stations
]


conn = psycopg2.connect("postgresql://postgres:postgres@127.0.0.1:54322/postgres")
cur = conn.cursor()

for r in rows:
    cur.execute("""
        insert into stations (station_id, name, lat, lon, capacity, is_active, last_seen_at)
        values (%s, %s, %s, %s, %s, true, now())
        on conflict (station_id) do update set
            name = excluded.name,
            lat = excluded.lat,
            lon = excluded.lon,
            capacity = excluded.capacity,
            is_active = true,
            last_seen_at = now()
    """, (r["station_id"], r["name"], r["lat"], r["lon"], r["capacity"]))

# anything not seen in this run gets flagged inactive
cur.execute("""
    update stations set is_active = false
    where last_seen_at < now() - interval '1 day'
""")

conn.commit()
