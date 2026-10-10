"""Read-only API over warehouse.db.

Run from the project root:  uvicorn api.main:app --reload
"""
import os
import logging
import sqlite3
import time
from functools import lru_cache
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, Response, status
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

DB_PATH = Path(os.environ.get("DB_PATH", Path(__file__).resolve().parent.parent / "warehouse.db"))
MIN_TRIP_DURATION_SECONDS = 2
# warehouse.db is read-only and only changes on redeploy, so responses are safe to cache
CACHE_CONTROL = "public, max-age=3600"
IS_PROD = os.environ.get("APP_ENV") == "production"

logger = logging.getLogger(__name__)

# behind a proxy, run uvicorn with --proxy-headers so this sees the client IP, not the proxy's
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    openapi_url=None if IS_PROD else "/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def query(sql: str, params: dict | tuple = ()) -> list[dict]:
    # new read-only connection per request (sqlite connections aren't thread-safe to share)
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        return [dict(row) for row in conn.execute(sql, params)]
    finally:
        conn.close()


@lru_cache(maxsize=1)
def station_ids() -> frozenset[int]:
    # all stations, not just active ones: historical trips reference retired stations too
    return frozenset(row["station_id"] for row in query("select station_id from stations"))


@lru_cache(maxsize=1)
def active_stations() -> list[dict]:
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


@app.get("/api/stations")
@limiter.limit("30/minute")
def get_stations(request: Request, response: Response):
    response.headers["Cache-Control"] = CACHE_CONTROL
    return active_stations()


ROUTE_STATS_SQL = """
with qualifying_trips as (
    -- distance_km is precomputed (haversine) by ETL.py
    select t.trip_duration as duration, t.distance_km
    from trips as t
    where :start_id <> :end_id
      and t.start_station_id = :start_id
      and t.end_station_id = :end_id
      and t.end_time is not null
    and t.trip_duration > :min_duration
)
select
    count(*)                                       as completed_trip_count,
    avg(duration)                                  as average_duration_seconds,
    avg(distance_km * 3600.0 / duration)           as average_straight_line_speed_kmh
from qualifying_trips
"""

FASTEST_TRIPS_SQL = """
select t.trip_id,
       t.trip_duration as duration_seconds,
       t.distance_km * 3600.0 / t.trip_duration as straight_line_speed_kmh,
       t.start_time,
       t.end_time
from trips as t
where :start_id <> :end_id
  and t.start_station_id = :start_id
  and t.end_station_id = :end_id
  and t.end_time is not null
  and t.trip_duration > :min_duration
order by t.trip_duration, t.trip_id
limit 3
"""


@lru_cache(maxsize=10_000)
def route_stats(start: int, end: int) -> dict:
    params = {
        "start_id": start,
        "end_id": end,
        "min_duration": MIN_TRIP_DURATION_SECONDS,
    }
    stats = query(ROUTE_STATS_SQL, params)[0]
    stats["fastest_trips"] = query(FASTEST_TRIPS_SQL, params)
    return stats


@app.get("/api/route-stats")
@limiter.limit("60/minute")
def get_route_stats(request: Request, response: Response, start: int, end: int):
    known = station_ids()
    if start not in known or end not in known:
        raise HTTPException(status_code=404, detail="Unknown station id")
    response.headers["Cache-Control"] = CACHE_CONTROL
    return route_stats(start, end)

@app.get("/api/health")
def health_check(response: Response):
    try:
        query("select 1")
        return {"status": "healthy", "timestamp": time.time()}
    except Exception:
        logger.exception("Health check failed")
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unhealthy"}