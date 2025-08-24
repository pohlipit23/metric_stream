# Ingestion Worker

The Ingestion Worker is a Cloudflare Worker that handles incoming KPI data from N8N workflows and manages KV store updates for time series data, KPI packages, and job status tracking.

## Features

- **Flexible JSON Parsing**: Handles both individual KPI responses and multi-KPI responses from N8N workflows
- **Idempotency**: Prevents duplicate data points for the same timestamp and KPI
- **Time Series Management**: Appends new data points to existing time series in KV
- **KPI Package Creation**: Creates initial KPI packages for downstream processing
- **Job Status Tracking**: Updates job completion status for orchestration
- **Error Handling**: Processes both success and error responses from N8N workflows
- **Authentication**: Validates requests using API key authentication
- **CORS Support**: Handles cross-origin requests properly

## API Endpoints

### POST /api/kpi-data

Receives successful KPI data updates from N8N workflows.

**Authentication**: Requires `X-API-Key` header or `Authorization: Bearer <token>`

**Request Body Examples**:

Individual KPI Response:
```json
{
  "traceId": "trace_20250814_143022_abc123",
  "kpiId": "btc-price-usd",
  "timestamp": "2025-08-14T14:30:22.000Z",
  "kpiType": "price",
  "data": {
    "value": 45000.50,
    "volume": 1000000
  },
  "chart": {
    "url": "https://example.com/chart.png",
    "type": "line",
    "timeRange": "24h"
  },
  "metadata": {
    "source": "coinmarketcap"
  }
}
```

Multi-KPI Response (CBBI):
```json
{
  "traceId": "trace_20250814_143022_abc123",
  "timestamp": "2025-08-14T14:30:22.000Z",
  "kpiType": "cbbi-multi",
  "kpiIds": ["cbbi-btc-price-usd", "cbbi-rhodl", "cbbi-mvrv", "cbbi-confidence"],
  "data": {
    "cbbi-btc-price-usd": 45000.50,
    "cbbi-rhodl": 0.75,
    "cbbi-mvrv": 0.65,
    "cbbi-confidence": 0.80
  }
}
```

**Response**:
```json
{
  "success": true,
  "processed": 1,
  "skipped": 0,
  "errors": 0,
  "results": [
    {
      "kpi_id": "btc-price-usd",
      "status": "processed",
      "timestamp": "2025-08-14T14:30:22.000Z"
    }
  ]
}
```

### POST /api/kpi-error

Receives error notifications from N8N workflows.

**Authentication**: Requires `X-API-Key` header or `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "traceId": "trace_20250814_143022_abc123",
  "kpiId": "btc-price-usd",
  "timestamp": "2025-08-14T14:30:22.000Z",
  "error": {
    "message": "API rate limit exceeded",
    "code": "RATE_LIMIT",
    "status": 429
  },
  "component": "data-collection",
  "retryCount": 2
}
```

**Response**:
```json
{
  "success": true,
  "message": "Error recorded successfully",
  "trace_id": "trace_20250814_143022_abc123"
}
```

### GET /api/health

Health check endpoint for monitoring.

**No authentication required**

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-14T14:30:22.000Z",
  "service": "ingestion-worker",
  "version": "1.0.0",
  "environment": "development",
  "kv_timeseries": "connected",
  "kv_jobs": "connected",
  "kv_packages": "connected"
}
```

## KV Store Schema

### Time Series Data (`timeseries:{kpi_id}`)

```json
{
  "kpiId": "btc-price-usd",
  "kpiType": "price",
  "dataPoints": [
    {
      "timestamp": "2025-08-14T14:30:22.000Z",
      "value": 45000.50,
      "metadata": {
        "kpiType": "price",
        "originalData": {
          "value": 45000.50,
          "volume": 1000000
        },
        "chart": {
          "url": "https://example.com/chart.png",
          "chart_type": "line",
          "time_range": "24h"
        }
      }
    }
  ],
  "lastUpdated": "2025-08-14T14:30:22.000Z",
  "metadata": {
    "created": "2025-08-14T14:30:22.000Z",
    "totalPoints": 1
  }
}
```

### KPI Package (`package:{trace_id}:{kpi_id}`)

```json
{
  "traceId": "trace_20250814_143022_abc123",
  "kpiId": "btc-price-usd",
  "timestamp": "2025-08-14T14:30:22.000Z",
  "kpiType": "price",
  "data": {
    "value": 45000.50,
    "volume": 1000000
  },
  "metadata": {
    "createdAt": "2025-08-14T14:30:22.000Z",
    "source": "n8n-workflow"
  },
  "chart": {
    "url": "https://example.com/chart.png",
    "chart_type": "line",
    "time_range": "24h"
  },
  "analysis": null
}
```

### Job Status (`job:{trace_id}`)

```json
{
  "traceId": "trace_20250814_143022_abc123",
  "status": "pending",
  "createdAt": "2025-08-14T14:30:00.000Z",
  "updatedAt": "2025-08-14T14:30:22.000Z",
  "kpis": {
    "btc-price-usd": {
      "kpiId": "btc-price-usd",
      "status": "completed",
      "completedAt": "2025-08-14T14:30:22.000Z",
      "error": null,
      "retryCount": 0
    }
  },
  "metadata": {
    "source": "ingestion-worker"
  }
}
```

## Configuration

### Environment Variables

Set via `wrangler.toml`:
- `ENVIRONMENT`: Deployment environment (development/staging/production)

### Secrets

Set via `wrangler secret put`:
- `INGESTION_API_KEY`: API key for authentication
- `N8N_WEBHOOK_SECRET`: Optional shared secret for N8N webhook validation

### KV Namespaces

Required KV namespaces:
- `TIMESERIES_KV`: Stores time series data and idempotency records
- `JOBS_KV`: Stores job status and error logs
- `PACKAGES_KV`: Stores KPI packages

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Deploy to Cloudflare
npm run deploy
```

### Testing

```bash
# Run tests
npm test
```

## Error Handling

The worker implements comprehensive error handling:

1. **Request Validation**: Validates required fields and data structure
2. **Authentication**: Validates API keys and optional webhook signatures
3. **Idempotency**: Prevents duplicate data processing
4. **KV Operations**: Handles KV store errors gracefully
5. **Logging**: Comprehensive error logging for debugging

## Monitoring

- Health check endpoint at `/api/health`
- Comprehensive logging for all operations
- Error details stored in KV for debugging
- Idempotency statistics available via utility functions

## Security

- API key authentication required for data endpoints
- Optional N8N webhook signature validation
- CORS headers configured appropriately
- Input validation and sanitization
- Rate limiting (configured at Cloudflare level)