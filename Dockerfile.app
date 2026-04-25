FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    cmake \
    build-essential \
    libopenblas-dev \
    liblapack-dev \
    && rm -rf /var/lib/apt/lists*

COPY app/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY app/ /app/

EXPOSE 8000
