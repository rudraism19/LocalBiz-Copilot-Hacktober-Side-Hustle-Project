FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY ai_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY ai_service ./ai_service

# Pre-set default configuration for containerized deployment
ENV AI_MODEL_ID="Qwen/Qwen2.5-0.5B-Instruct"
ENV AI_DEVICE="cpu"
ENV AI_SERVICE_HOST="0.0.0.0"
ENV AI_SERVICE_PORT=8000
ENV AI_LOAD_ON_STARTUP="true"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "ai_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
