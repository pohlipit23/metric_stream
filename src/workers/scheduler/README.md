# Scheduler Worker

The Scheduler Worker is a Cloudflare Worker responsible for initiating scheduled jobs by triggering individual N8N workflows for active KPIs.

## Overview

This worker handles the "fan-out" phase of the Daily Index Tracker system by:

1. **Job Initiation**: Responds to cron triggers to start new data collection jobs
2. **Trace ID Generation**: Creates unique trace IDs for job tracking across the system
3. **KPI Registry Reading**: Retrieves active KPIs from the Cloudflare KV store
4. **N8N Workflow Triggering**: Sends HTTP requests to individual N8N workflow webhooks
5. **Job Status Tracking**: Creates and manages job records in KV for orchestration

## Architecture

### Cron Triggers
- Configured via `wrangler.toml` cron expressions
- Default: Daily at 12:00 UTC (`0 12 * * *`)
- Configurable through Admin Console (future enhancement)

### Data Flow
1. Cron trigger activates the `scheduled()` handler
2. Generate unique trace ID for the job
3. Read active KPIs from `CONFIG_KV` registry
4. Create job record in `JOBS_KV` with pending status
5. Trigger individual N8N workflows concurrently via webhooks
6. Log results and update job status

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns worker status, KV connectivity, and last job information
- No authentication required

## Configuration

### Environment Variables
- `ENVIRONMENT`: Deployment environment (development/production)

### Secrets
- `N8N_API_KEY`: Optional API key for N8N webhook authentication
- `SCHEDULER_API_KEY`: API key for scheduler authentication (future use)

### KV Namespaces
- `JOBS_KV`: Job status tracking and execution history
- `CONFIG_KV`: KPI registry and system configuration

## KPI Registry Structure

The worker reads KPI configuration from `CONFIG_KV` with key `kpi-registry`:

```json
{
  "kpis": [
    {
      "id": "cmc-btc-price",
      "name": "Bitcoin Price (CMC)",
      "description": "Current Bitcoin price from CoinMarketCap",
      "type": "price",
      "active": true,
      "webhookUrl": "https://n8n.example.com/webhook/btc-price",
      "analysisConfig": {
        "chartType": "line",
        "alertThresholds": {
          "high": 50000,
          "low": 30000
        }
      },
      "metadata": {
        "source": "coinmarketcap",
        "updateFrequency": "daily",
        "category": "price"
      }
    }
  ],
  "metadata": {
    "lastUpdated": "2025-08-14T12:00:00Z",
    "version": "1.0.0",
    "totalKPIs": 1,
    "activeKPIs": 1
  }
}
```

## Job Record Structure

Job records are stored in `JOBS_KV` with key pattern `job:{traceId}`:

```json
{
  "traceId": "trace_20250814_120000_abc12345",
  "status": "pending",
  "createdAt": "2025-08-14T12:00:00Z",
  "updatedAt": "2025-08-14T12:00:00Z",
  "kpis": {
    "cmc-btc-price": {
      "kpiId": "cmc-btc-price",
      "status": "pending",
      "completedAt": null,
      "error": null,
      "retryCount": 0
    }
  },
  "metadata": {
    "totalKPIs": 1,
    "completedKPIs": 0,
    "failedKPIs": 0,
    "environment": "development"
  }
}
```

## N8N Webhook Payload

The worker sends `IndividualKPITrigger` payloads to N8N workflows:

```json
{
  "traceId": "trace_20250814_120000_abc12345",
  "kpiId": "cmc-btc-price",
  "timestamp": "2025-08-14T12:00:00Z",
  "kpiType": "price",
  "metadata": {
    "schedulerWorker": "scheduler-worker",
    "environment": "development",
    "kpiName": "Bitcoin Price (CMC)",
    "kpiDescription": "Current Bitcoin price from CoinMarketCap"
  }
}
```

## Error Handling

### Workflow Trigger Failures
- Concurrent triggering with individual error tracking
- HTTP timeout and connection error handling
- Detailed logging for troubleshooting
- Results aggregation for job completion analysis

### KV Store Errors
- Graceful handling of KV connectivity issues
- Fallback behavior for missing registry data
- Health check integration for monitoring

### Retry Logic
- Optional retry mechanism with exponential backoff
- Configurable retry counts and delays
- Individual KPI failure isolation

## Monitoring

### Health Checks
- Worker status and version information
- KV store connectivity validation
- Last job execution summary
- Response time measurement

### Logging
- Structured console logging for all operations
- Execution time tracking
- Success/failure rate monitoring
- Detailed error information

## Development

### Local Testing
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

### Deployment
```bash
# Deploy to Cloudflare
npm run deploy
```

## Integration Points

### Upstream Dependencies
- Cloudflare Cron Triggers (job initiation)
- CONFIG_KV (KPI registry)

### Downstream Dependencies
- N8N Individual KPI Workflows (webhook triggers)
- JOBS_KV (job status tracking)
- Orchestration Worker (job monitoring)

## Requirements Fulfilled

This implementation addresses the following requirements:

- **1.1**: Cron trigger activation and Scheduler Worker invocation
- **1.2**: Job record creation with unique `traceId` and `kpiIds`
- **1.3**: Individual KPI workflow triggering via webhook URLs
- **2.1**: KPI registry management and active KPI filtering

## Future Enhancements

- Admin Console integration for cron schedule management
- Advanced retry strategies with circuit breaker patterns
- Webhook authentication and security enhancements
- Performance metrics and alerting integration
- Multi-region deployment support