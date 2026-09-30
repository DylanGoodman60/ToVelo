select start_station_name, end_station_name, count(*) from trips
where start_station_name <> end_station_name
group by start_station_name, end_station_name order by count DESC