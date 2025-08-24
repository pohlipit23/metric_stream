#!/bin/bash

# Setup script for Ingestion Worker secrets
# Run this script to configure the API key for the Ingestion Worker

API_KEY="ed774c2e9ea976b733b306524f547623098310dd21453b0fec56055ab8b5b359"

echo "Setting up Ingestion Worker secrets..."

# Navigate to the ingestion worker directory
cd src/workers/ingestion

# Set the API key secret
echo "Setting INGESTION_API_KEY..."
echo "$API_KEY" | wrangler secret put INGESTION_API_KEY

# Optional: Set N8N webhook secret (you can change this if needed)
N8N_SECRET="n8n_webhook_secret_$(openssl rand -hex 16)"
echo "Setting N8N_WEBHOOK_SECRET..."
echo "$N8N_SECRET" | wrangler secret put N8N_WEBHOOK_SECRET

echo ""
echo "✅ Secrets configured successfully!"
echo ""
echo "📋 API Key for N8N workflows: $API_KEY"
echo "📋 N8N Webhook Secret: $N8N_SECRET"
echo ""
echo "Use this API key in your N8N workflows when calling the Ingestion Worker endpoints."
echo "Add it as 'X-API-Key' header or 'Authorization: Bearer <key>' header."