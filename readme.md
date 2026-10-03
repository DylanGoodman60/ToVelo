# Tovelo

1. put raw csv's into data/
2. `pip install requirements.txt`
3. `python ETL.py` idempotent load warehouse.db
4. `uvicorn api.main:app --reload` api
5. `npm run dev`
