create table trips (
    trip_id bigint primary key,
    trip_duration_seconds integer,
    start_station_id integer,
    start_time timestamp,
    start_station_name text,
    end_station_id integer,
    end_time timestamp,
    end_station_name text,
    bike_id integer,
    user_type text,
    bike_model text,
    source_file text
);

create index on trips (start_time);
create index on trips (start_station_id);
