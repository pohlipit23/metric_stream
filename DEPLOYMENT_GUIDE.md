# Ingestion Worker Deployment Guide

## Quick Setup

### 1. Create KV Namespaces
```bash
./create-kv-namespaces.sh
```
This will create the required KV namespaces and show you the IDs to update in `wrangler.toml`.

### 2. Set API Key Secret
```bash
./setup-ingestion-secrets.sh
```
This will configure the API key and optional N8N webhook secret.

### 3. Deploy the Worker
```bash
cd src/workers/ingestion
npm install
wrangler deploy
```

### 4. Test the Deployment
Update the `WORKER_URL` in `test-ingestion-api-key.js` with your deployed worker URL, then run:
```bash
node test-ingestion-api-key.js
```

## API Key Information

**Generated API Key**: `ed774c2e9ea976b733b306524f547623098310dd21453b0fec56055ab8b5b359`

### Usage in N8N Workflows

Add this header to your HTTP Request nodes:
- **Header Name**: `X-API-Key`
- **Header Value**: `ed774c2e9ea976b733b306524f547623098310dd21453b0fec56055ab8b5b359`

Or alternatively:
- **Header Name**: `Authorization`
- **Header Value**: `Bearer ed774c2e9ea976b733b306524f547623098310dd21453b0fec56055ab8b5b359`

## Endpoints

Once deployed, your worker will have these endpoints:

- `POST /api/kpi-data` - Receive KPI data from N8N workflows
- `POST /api/kpi-error` - Receive error notifications from N8N workflows  
- `GET /api/health` - Health check (no authentication required)

## Security Notes

- The API key is stored as a Cloudflare Worker secret
- All data endpoints require authentication
- CORS is configured for cross-origin requests
- Optional N8N webhook signature validation available

## Monitoring

- Use the `/api/health` endpoint for monitoring
- Check Cloudflare Worker logs for detailed operation logs
- KV stores contain comprehensive data for debugging