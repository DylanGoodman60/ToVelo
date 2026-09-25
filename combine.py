import duckdb

con = duckdb.connect("bikeshare.duckdb")

con.execute("""
    CREATE OR REPLACE TABLE raw_trips AS
    SELECT *, filename AS source_file
    FROM read_csv_auto('clean/*.csv', union_by_name=True, filename=true)
""")
