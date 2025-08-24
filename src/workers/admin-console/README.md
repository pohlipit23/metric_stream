# Admin Console Worker

The Admin Console Worker provides API endpoints for managing KPI registry entries and system configuration for the Daily Index Tracker system.

## Features

- **KPI Registry Management**: CRUD operations for KPI entries
- **System Configuration**: Manage retry, fallback, and job lifecycle settings
- **Schedule Management**: Configure cron expressions and job timing
- **Historical Data Import**: Import CSV data for KPI time series
- **Authentication**: Cloudflare Access integration with fallback API key support
- **CORS Support**: Cross-origin resource sharing for frontend integration

## API Endpoints

### KPI Registry Management

- `GET /api/kpis` - List all KPI registry entries
- `POST /api/kpis` - Create new KPI registry entry
- `GET /api/kpis/:id` - Get specific KPI by ID
- `PUT /api/kpis/:id` - Update existing KPI
- `DELETE /api/kpis/:id` - Delete KPI
- `POST /api/kpis/:id/import` - Import historical CSV data for KPI

### System Configuration

- `GET /api/config` - Get current system configuration
- `PUT /api/config` - Update system configuration
- `PUT /api/config/retry` - Update retry settings for all components
- `PUT /api/config/fallback` - Update fallback settings
- `GET /api/config/schedules` - Get schedule configuration
- `PUT /api/config/schedules` - Update schedule configuration

### Health Check

- `GET /health` - Health check endpoint (no authentication required)

## Authentication

The worker supports two authentication methods:

1. **Cloudflare Access** (Primary): Uses `CF-Access-Jwt-Assertion` header
2. **API Key** (Fallback): Uses `X-API-Key` header or `Authorization: Bearer <key>`

## Configuration

### Environment Variables

Set these in your `wrangler.toml` or via `wrangler secret put`:

- `CLOUDFLARE_ACCESS_JWT_SECRET` - Secret for validating Cloudflare Access JWTs
- `N8N_API_KEY` - API key for N8N workflow management
- `ADMIN_API_KEY` - API key for development/testing authentication

### KV Namespace

The worker requires a KV namespace binding named `KV_STORE`.

## Data Structures

### KPI Registry Entry

```json
{
  "id": "btc-price-1234567890",
  "name": "BTC Price",
  "description": "Bitcoin price tracking",
  "webhook_url": "https://n8n.example.com/webhook/btc-price",
  "analysis_config": {
    "chart_type": "line",
    "analysis_depth": "detailed"
  },
  "active": true,
  "created_at": "2025-01-01T00:00:00Z",
  "created_by": "user@example.com",
  "updated_at": "2025-01-01T00:00:00Z",
  "updated_by": "user@example.com"
}
```

### System Configuration

```json
{
  "retry": {
    "chart_generation": {
      "max_retries": 3,
      "backoff_intervals": [1000, 2000, 4000]
    },
    "llm_analysis": {
      "max_retries": 2,
      "backoff_intervals": [2000, 4000]
    }
  },
  "fallback": {
    "chart_generation": {
      "fallback_image_url": "https://example.com/fallback.png",
      "fallback_text": "Chart generation failed"
    }
  },
  "job_lifecycle": {
    "timeout_minutes": 30,
    "partial_data_delivery": true,
    "orchestration_polling_minutes": 2
  }
}
```

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Deploy to Cloudflare
npm run deploy
```

### Testing

```bash
# Run tests
npm test
```

## KV Store Key Patterns

The worker follows these KV key naming conventions:

- `kpi-registry:{kpiId}` - KPI registry entries
- `config:system` - System configuration
- `config:schedule` - Schedule configuration
- `timeseries:{kpiId}` - Time series data for KPIs
- `import-status:{kpiId}:{importId}` - Historical data import status
- `import-errors:{kpiId}:{importId}` - Import error logs

## Error Handling

The worker provides comprehensive error handling with:

- Input validation for all endpoints
- Structured error responses with details
- Proper HTTP status codes
- Error logging for debugging
- Graceful fallbacks for missing data

## Security

- All endpoints (except health check) require authentication
- CORS headers configured for frontend integration
- Input validation and sanitization
- Secure credential management via Cloudflare Secrets
- Rate limiting should be configured at the Cloudflare level