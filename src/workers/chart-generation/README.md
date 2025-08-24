# Chart Generation Worker

A Cloudflare Worker that generates charts for KPI time series data with support for multiple chart types and output formats.

## Features

- **Multiple Chart Types**: Line charts, candlestick charts, bar charts
- **Multiple Output Formats**: PNG, SVG, interactive HTML
- **Efficient Processing**: Optimized for large time series datasets
- **Storage Options**: Cloudflare R2 and KV storage
- **Batch Processing**: Generate multiple charts in a single request
- **Authentication**: API key-based authentication

## API Endpoints

### POST /api/charts/generate
Generate a single chart for a KPI.

**Request Body:**
```json
{
  "kpiId": "btc-price",
  "chartType": "line",
  "outputFormat": "png",
  "timeRange": "7d",
  "customData": [...] // Optional: provide custom data instead of reading from KV
}
```

### POST /api/charts/batch
Generate multiple charts for a trace ID.

**Request Body:**
```json
{
  "traceId": "trace-123",
  "charts": [
    {
      "kpiId": "btc-price",
      "chartType": "line",
      "outputFormat": "png"
    }
  ]
}
```

### GET /api/charts/:chartId
Retrieve a generated chart by ID.

### GET /api/charts/health
Health check endpoint.

## Chart Types

- **line**: Standard line chart for time series data
- **candlestick**: OHLC candlestick chart for price data
- **bar**: Bar chart for categorical or discrete data

## Output Formats

- **png**: Static PNG image
- **svg**: Scalable vector graphics
- **html**: Interactive HTML chart

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Deploy to staging
npm run deploy

# Deploy to production
npm run deploy:prod
```

## Configuration

Set the following secrets using `wrangler secret put`:

- `CHART_API_KEY`: API key for authentication
- `EXTERNAL_CHART_API_KEY`: API key for external chart services (optional)

## Storage

Charts are stored in:
- **R2 Bucket**: For long-term storage of generated charts
- **KV Store**: For chart metadata and quick access URLs