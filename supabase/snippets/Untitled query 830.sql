

select sum(count) from (select start_station_name, count(*) from trips
where start_station_id = end_station_id
group by start_station_name order by count DESC)