CREATE OR REPLACE TABLE trips_clean AS
            SELECT
                Trip_Id::BIGINT AS trip_id,
                Trip_Duration::INTEGER AS trip_duration_seconds,
                Start_Station_Id::INTEGER AS start_station_id,
                Start_Time::TIMESTAMP AS start_time,
                Start_Station_Name AS start_station_name,
                End_Station_Id::INTEGER AS end_station_id,
                End_Time::TIMESTAMP AS end_time,
                End_Station_Name AS end_station_name,
                Bike_Id::INTEGER AS bike_id,
                User_Type AS user_type,
                Bike_Model AS bike_model,
                source_file
            FROM raw_trips;

COPY trips_clean TO 'trips_clean.parquet' (FORMAT PARQUET);
