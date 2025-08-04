# Daily Index Tracker

A hybrid crypto market monitoring system that combines the Cloudflare Developer Platform for serverless components with a hosted N8N instance for workflow automation.

## Architecture Overview

The system tracks and reports on pre-defined Key Performance Indicators (KPIs) relevant to the cryptocurrency market, delivering scheduled, enriched KPI reports to end users through various channels with AI-generated contextual market insights.

## Prerequisites

### Cloudflare Account Setup

1. **Create Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com) with appropriate billing plan
2. **Enable Required Services**:
   - Cloudflare Workers (Paid plan required for KV and Queues)
   - Cloudflare KV
   - Cloudflare Queues
   - Cloudflare Pages
   - Cloudflare Access

### Domain Configuration

1. Add your domain to Cloudflare
2. Update nameservers to Cloudflare's
3. Configure DNS records for your application

### Development Environment

1. Install Node.js (v18 or later)
2. Install Wrangler CLI: `npm install -g wrangler`
3. Authenticate with Cloudflare: `wrangler login`

## Initial Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Cloudflare Resources

#### Create KV Namespace
```bash
# Development
wrangler kv:namespace create "KV_STORE"
wrangler kv:namespace create "KV_STORE" --preview

# Update wrangler.toml with the returned IDs
```

#### Create Queues
```bash
wrangler queues create data-collection-queue
wrangler queues create chart-generation-queue
wrangler queues create llm-analysis-queue
wrangler queues create packaging-queue
wrangler queues create delivery-queue
```

#### Set up Secrets
```bash
# Example secrets (replace with actual values)
wrangler secret put OPENAI_API_KEY
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put CHART_IMG_API_KEY
```

### 3. Deploy Workers
```bash
# Development
npm run dev

# Staging
npm run deploy:staging

# Production
npm run deploy:production
```

## Project Structure

```
├── src/
│   ├── workers/           # Cloudflare Workers
│   │   ├── scheduler.ts   # Scheduler Worker
│   │   ├── orchestrator.ts # Orchestration Worker
│   │   └── admin-api.ts   # Admin Console API Worker
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── index.ts           # Main entry point
├── admin-console/         # Admin Console frontend
├── n8n-workflows/         # N8N workflow definitions
└── docs/                  # Documentation
```

## Security Configuration

### Cloudflare Access
1. Navigate to Cloudflare Dashboard > Zero Trust > Access
2. Create application for Admin Console
3. Configure authentication policies
4. Set up user groups and permissions

### Rate Limiting
Configure rate limiting rules in Cloudflare Dashboard for API endpoints.

## Monitoring and Logging

### Logpush Configuration
Set up Cloudflare Logpush to send logs to your preferred destination for monitoring and troubleshooting.

### Analytics
Enable Cloudflare Analytics for Workers to monitor performance and usage.

## Next Steps

After completing the Cloudflare setup:
1. Set up development environment and tooling (Task 0.2)
2. Configure external service accounts (Task 0.3)
3. Set up Docker-hosted N8N for development (Task 0.4)

## Support

For issues and questions, refer to:
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Cloudflare Queues Documentation](https://developers.cloudflare.com/queues/)