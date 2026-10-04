FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    DB_PATH=/data/warehouse.db

WORKDIR /srv
COPY api/requirements.txt api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt
COPY api/main.py api/main.py

RUN useradd --system --no-create-home app
USER app

EXPOSE 8000
# one worker: the response cache and rate-limit counters live in process memory.
# --proxy-headers trusts X-Forwarded-For from Caddy, which is the only thing that can reach this port.
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--forwarded-allow-ips=*", "--no-server-header"]
