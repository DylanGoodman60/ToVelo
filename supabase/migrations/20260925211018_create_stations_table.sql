create table stations (
    station_id integer primary key,
    name text not null,
    lat double precision not null,
    lon double precision not null,
    capacity integer,
    is_active boolean not null default true,
    last_seen_at timestamptz not null default now()
);
