# Technology Stack

## Architecture
**Hybrid serverless + workflow automation system**
- **Cloudflare Developer Platform**: Serverless components (Workers, Pages, KV, Queues, R2)
- **N8N**: Workflow automation for data collection and processing
- **Event-driven**: Queue-based fan-out/fan-in pattern

## Core Technologies

### Frontend
- **Framework**: React/Vue.js on Cloudflare Pages
- **Authentication**: Cloudflare Access with SSO
- **Styling**: Modern, minimalistic light theme with full responsiveness

### Backend Services
- **Cloudflare Workers**: Serverless functions for core logic
- **Cloudflare KV**: Key-value storage for time series and job data
- **Cloudflare Queues**: Message queues for workflow orchestration
- **Cloudflare R2**: Object storage for documents and archives

### Workflow Engine
- **N8N**: Self-hosted or cloud instance for data workflows
- **Docker**: Local N8N development environment
- **Webhook Integration**: Direct triggers between Cloudflare and N8N

### External Integrations
- **LLM Services**: OpenRouter, Gemini, Claude for analysis
- **Chart Generation**: chart-img.com, matplotlib, plotly, Chart.js
- **Notifications**: Gmail, Telegram, Discord, Slack, SMS providers

## Development Tools

### Local Development
```bash
# Setup N8N development environment
docker-compose up -d n8n

# Install Cloudflare CLI
npm install -g wrangler

# Local testing with Miniflare
npm run dev
```

### Testing Framework
- **Unit Tests**: Jest/Vitest for components and Workers
- **Integration Tests**: Playwright for Admin Console
- **Load Testing**: Artillery.io for performance validation
- **E2E Testing**: Custom N8N workflows for pipeline testing

### Common Commands
```bash
# Deploy Workers
wrangler deploy

# Deploy Pages
wrangler pages deploy

# Manage KV namespaces
wrangler kv:namespace create "TIMESERIES"
wrangler kv:key put --binding=TIMESERIES "key" "value"

# Queue operations
wrangler queues create LLM_ANALYSIS_QUEUE
wrangler queues producer send LLM_ANALYSIS_QUEUE "message"

# Local development
npm run dev          # Start local development server
npm test            # Run test suite
npm run build       # Build for production
```

## Security & Credentials
- **Cloudflare Secrets**: Core system credentials
- **N8N Credential Manager**: Third-party service API keys
- **Rate Limiting**: All public endpoints protected
- **HTTPS**: All communications encrypted