---
inclusion: always
---

# Daily Index Tracker Architecture Guidelines

## System Overview
Crypto market monitoring system using Cloudflare Workers + N8N workflows. Event-driven architecture with KV storage for time-series data.

## Critical Rules for AI Assistant

### File Structure & Organization
- Workers live in `src/workers/{worker-name}/` with own `wrangler.toml`
- Each worker follows `handlers/`, `middleware/`, `utils/` pattern
- Shared schemas in `src/schemas/`, validation in `src/validation/`
- Admin console React app in `src/admin-console/`

### Technology Stack Requirements
- **Workers**: JavaScript ES modules, async/await, proper error handling
- **Data Processing**: Python with type hints, Pydantic validation
- **Frontend**: React functional components, Tailwind CSS
- **Infrastructure**: Cloudflare KV, Queues, R2, Pages

### N8N Integration (CRITICAL)
- **ALWAYS** use real N8N at `http://localhost:5678` - never mocks
- Development webhooks: `cbbi-multi`, `kpi-cmc`
- Test with actual workflows, validate webhook signatures
- Use ISO 8601 timestamps, implement idempotency

### KV Storage Patterns (MANDATORY)
- **Key Structure**: `{kpi_id}:{timestamp}:{data_type}`
- **Namespaces**: TIMESERIES_KV, JOBS_KV, PACKAGES_KV, CONFIG_KV
- Store metadata separately from time-series data
- Implement TTL for cleanup, use consistent JSON serialization

### Code Style (ENFORCE)
- **JavaScript**: ES modules, try-catch blocks, JSDoc comments
- **Python**: Type hints, PEP 8, structured logging
- **React**: Hooks, error boundaries, component composition
- **All**: RESTful patterns, async operations

### Security (NON-NEGOTIABLE)
- API key validation on all endpoints
- Secrets via `wrangler secret put` only
- Cloudflare Access for admin console
- Never store credentials in code

### Error Handling (REQUIRED)
- Consistent error response structures with status codes
- Trace IDs for debugging
- Dead letter queues for failed messages
- Health check endpoints on all workers

### Testing Strategy (MANDATORY)
- Test against real KV data, not mocks
- Use actual N8N workflows for integration tests
- Validate data contracts between components
- Test error scenarios and retry mechanisms

### Data Validation Rules
- Validate all webhook payloads using `src/schemas/`
- ISO 8601 timestamp format required
- Implement circuit breakers for external APIs
- Follow established schema patterns

### Deployment Patterns
- Environment-specific `wrangler.toml` configurations
- Feature flags via environment variables
- Separate dev/staging/production KV namespaces

## Worker-Specific Guidelines

### Ingestion Worker (`src/workers/ingestion/`)
- Handles N8N webhook data
- Implements idempotency checks
- Stores to TIMESERIES_KV with proper key structure

### Scheduler Worker (`src/workers/scheduler/`)
- Cron-triggered KPI collection
- Manages job queues and status tracking
- Triggers N8N workflows via API

### Admin Console Worker (`src/workers/admin-console/`)
- API backend for React frontend
- Implements authentication middleware
- Manages KPI registry in CONFIG_KV

### Orchestration Worker (`src/workers/orchestration/`)
- Handles aggregate workflow queues
- Implements job monitoring and retry logic
- Manages cross-worker communication
