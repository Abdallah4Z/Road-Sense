#!/bin/bash
set -e

# ============================================
# Azure Deployment Script — Road-Sense API
# ============================================
# Prerequisites:
#   - Azure CLI installed (az)
#   - Logged in: az login
#   - Docker installed
# ============================================

RESOURCE_GROUP="road-sense-rg"
LOCATION="eastus"
ACR_NAME="roadsenseacr"  # must be globally unique
IMAGE_NAME="road-sense-api"
IMAGE_TAG="latest"
DNS_LABEL="road-sense-api"  # must be globally unique

echo "============================================"
echo " Road-Sense Azure Deployment"
echo "============================================"

# 1. Create resource group
echo ""
echo "[1/8] Creating resource group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
echo "  ✓ Resource group: $RESOURCE_GROUP"

# 2. Create Azure Container Registry
echo ""
echo "[2/8] Creating Azure Container Registry..."
az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ACR_NAME" \
    --sku Basic \
    --admin-enabled true \
    --output none
echo "  ✓ ACR: $ACR_NAME"

# 3. Build Docker image locally
echo ""
echo "[3/8] Building Docker image..."
docker build -t "$ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG" -f Dockerfile .
echo "  ✓ Image built"

# 4. Push to ACR
echo ""
echo "[4/8] Pushing to ACR..."
az acr login --name "$ACR_NAME"
docker push "$ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG"
echo "  ✓ Image pushed"

# 5. Create container instance
echo ""
echo "[5/8] Deploying to Azure Container Instances..."
CONTAINER_NAME="road-sense-api"

az container delete \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --yes 2>/dev/null || true

az container create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --image "$ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG" \
    --registry-login-server "$ACR_NAME.azurecr.io" \
    --registry-username "$(az acr credential show --name "$ACR_NAME" --query username -o tsv)" \
    --registry-password "$(az acr credential show --name "$ACR_NAME" --query passwords[0].value -o tsv)" \
    --dns-name-label "$DNS_LABEL" \
    --ports 8000 \
    --cpu 4 \
    --memory 8 \
    --environment-variables PYTHONUNBUFFERED=1 \
    --output none
echo "  ✓ Container instance: $CONTAINER_NAME"

# 6. Wait for healthy
echo ""
echo "[6/8] Waiting for container to be healthy..."
FQDN="$DNS_LABEL.$LOCATION.azurecontainer.io"
echo "  URL: http://$FQDN:8000"
for i in $(seq 1 30); do
    sleep 5
    STATUS=$(az container show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$CONTAINER_NAME" \
        --query instanceView.currentState.state -o tsv 2>/dev/null || echo "Pending")
    echo "  Status: $STATUS"
    if [ "$STATUS" = "Running" ]; then
        break
    fi
done

# 7. Test the endpoint
echo ""
echo "[7/8] Testing API health endpoint..."
sleep 10
HEALTH=$(curl -sf "http://$FQDN:8000/health" 2>/dev/null || echo "unreachable")
echo "  Health: $HEALTH"

# 8. Print summary
echo ""
echo "============================================"
echo " DEPLOYMENT COMPLETE"
echo "============================================"
echo "  API Endpoint:  http://$FQDN:8000"
echo "  Health Check:  http://$FQDN:8000/health"
echo "  Detect:        POST http://$FQDN:8000/detect"
echo ""
echo "  Cleanup:       az group delete --name $RESOURCE_GROUP --yes --no-wait"
echo "============================================"
