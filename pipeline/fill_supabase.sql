bikeshare D ATTACH 'host=127.0.0.1 port=54322 dbname=postgres user=postgres password=postgres' AS pg (TYPE postgres);
bikeshare D INSERT INTO pg.trips SELECT * FROM trips_clean;
