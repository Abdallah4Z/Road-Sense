FROM python:3.10-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml requirements.txt ./
COPY src/ src/
COPY configs/ configs/
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip config set global.timeout 120 && \
    pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
        torch torchvision && \
    pip install --no-cache-dir -e . && \
    pip install --no-cache-dir prometheus-client prometheus-fastapi-instrumentator

FROM python:3.10-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.10/site-packages/ /usr/local/lib/python3.10/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/
COPY --from=builder /app/src/ /app/src/
COPY --from=builder /app/configs/ /app/configs/
COPY --from=builder /app/pyproject.toml /app/pyproject.toml

# Models are mounted as a volume at runtime
# COPY models/checkpoints/ /app/models/checkpoints/
# COPY models/exports/ /app/models/exports/
# Use: docker run -v /path/to/models:/app/models

# Copy model weights directly into image
COPY models/checkpoints/HPO_run/weights/best.pt /app/models/checkpoints/HPO_run/weights/best.pt

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
RUN mkdir -p /app/models/exports

EXPOSE 8000

CMD ["python3", "src/models/api_server.py", "--port", "8000", "--host", "0.0.0.0", "--weights", "models/checkpoints/HPO_run/weights/best.pt"]
