# Azure Deployment — Road-Sense

This directory contains scripts and templates for deploying the Road-Sense API to Microsoft Azure.

## Quick Deploy

```bash
# Prerequisites
az login
docker --version

# Deploy everything
chmod +x infra/azure/deploy.sh
./infra/azure/deploy.sh
```

## What Gets Deployed

| Resource | Service | Purpose |
|----------|---------|---------|
| API Server | **Azure Container Instances** | Runs the FastAPI detection server |
| Container Registry | **Azure Container Registry** | Stores Docker images |
| Public Endpoint | **DNS label + public IP** | Accessible at `http://<name>.<region>.azurecontainer.io:8000` |

## Architecture

```
Client → ACI (road-sense-api) :8000
            ├── /health     → {"status": "ok"}
            ├── /detect     → POST image → detection results
            └── /metrics    → Prometheus metrics
```

## Testing the Deployed API

```bash
# Health check
curl http://road-sense-api.eastus.azurecontainer.io:8000/health

# Single image detection
curl -X POST http://road-sense-api.eastus.azurecontainer.io:8000/detect \
    -F "file=@test.jpg"

# Load testing (from project root)
pip install locust
locust -f scripts/locustfile.py --host=http://road-sense-api.eastus.azurecontainer.io:8000
```

## Clean Up

```bash
az group delete --name road-sense-rg --yes --no-wait
```

## Alternative: Azure VM (GPU Support)

For GPU-accelerated inference (NVIDIA), use a VM with a GPU instead of ACI:

```bash
# Create GPU VM with NVIDIA drivers
az vm create \
    --resource-group road-sense-rg \
    --name road-sense-vm \
    --size Standard_NC6s_v3 \
    --image Ubuntu2204 \
    --admin-username azureuser \
    --generate-ssh-keys

# SSH in, install Docker, pull image, run with --gpus all
```
