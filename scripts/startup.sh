#!/bin/bash
set -e

MODEL_DIR="/app/models/checkpoints/HPO_run/weights"
MODEL_PATH="$MODEL_DIR/best.pt"
MODEL_URL="https://github.com/Abdallah4Z/Road-Sense/raw/main/models/checkpoints/HPO_run/weights/best.pt"

if [ ! -f "$MODEL_PATH" ]; then
    echo "Model not found at $MODEL_PATH"
    echo "Downloading from GitHub..."
    mkdir -p "$MODEL_DIR"
    python3 -c "
import requests
url = '$MODEL_URL'
dest = '$MODEL_PATH'
print(f'Downloading model ({url})...')
r = requests.get(url, timeout=600, allow_redirects=True)
with open(dest, 'wb') as f:
    f.write(r.content)
size_mb = len(r.content) / (1024 * 1024)
print(f'Downloaded: {size_mb:.1f} MB')
"
fi

if [ ! -f "$MODEL_PATH" ]; then
    echo "ERROR: Failed to download model"
    echo "Place model at $MODEL_PATH and restart"
    sleep 10
    exit 1
fi

echo "Starting API server..."
exec python3 src/models/api_server.py --port 8000 --host 0.0.0.0
