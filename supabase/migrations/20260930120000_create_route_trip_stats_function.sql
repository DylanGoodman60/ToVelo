create index if not exists trips_start_end_station_id_idx
    on public.trips (start_station_id, end_station_id);

create or replace function public.get_route_trip_stats(
    p_start_station_id integer,
    p_end_station_id integer
)
returns table (
    completed_trip_count bigint,
    average_duration_seconds numeric,
    tenth_percentile_duration_seconds numeric,
    fastest_duration_seconds integer,
    average_straight_line_speed_kmh numeric
)
language sql
stable
security invoker
set search_path = ''
as $function$
    with station_distance as (
        select
            case
                when start_station.lat is null or end_station.lat is null then null::double precision
                else 2 * 6371.0088 * asin(sqrt(least(1.0, greatest(0.0,
                    power(sin(radians(end_station.lat - start_station.lat) / 2), 2)
                    + cos(radians(start_station.lat))
                    * cos(radians(end_station.lat))
                    * power(sin(radians(end_station.lon - start_station.lon) / 2), 2)
                ))))
            end as distance_km
        from (select 1) as seed
        left join public.stations as start_station
            on start_station.station_id = p_start_station_id
        left join public.stations as end_station
            on end_station.station_id = p_end_station_id
    ), qualifying_trips as (
        select
            trip.trip_duration_seconds,
            station_distance.distance_km
        from public.trips as trip
        cross join station_distance
        where trip.start_station_id = p_start_station_id
            and trip.end_station_id = p_end_station_id
            and trip.end_time is not null
            and trip.trip_duration_seconds > 0
    )
    select
        count(*)::bigint,
        avg(trip_duration_seconds)::numeric,
        percentile_cont(0.10) within group (order by trip_duration_seconds)::numeric,
        min(trip_duration_seconds)::integer,
        avg(distance_km * 3600.0 / trip_duration_seconds)::numeric
    from qualifying_trips;
$function$;

comment on function public.get_route_trip_stats(integer, integer) is
    'Returns directional completed-trip count and time statistics for a station pair. Speed is the average straight-line station-to-station estimate in km/h; the percentile value is the 10th-percentile duration cutoff.';

revoke all on function public.get_route_trip_stats(integer, integer) from public;
grant execute on function public.get_route_trip_stats(integer, integer) to anon, authenticated, service_role;
