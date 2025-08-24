---
inclusion: always
---

# Daily Index Tracker Architecture Guidelines

## Project Overview
This is a hybrid crypto market monitoring system combining Cloudflare Workers for serverless components with N8N for workflow automation. The architecture is event-driven, queue-based, and designed for scalability.

## Technology Stack & Language Preferences
- **Primary Languages**: JavaScript/Node.js for Cloudflare Workers, Python for data processing and validation
- **Frontend**: React with Tailwind CSS for the Admin Console
- **Infrastructure**: Cloudflare Workers, KV Store, Queues, R2, Pages
- **Workflow Engine**: N8N (self-hosted or cloud)
- **Development Tools**: Wrangler CLI, Docker for local N8N

## Architecture Patterns

### Microservices Structure
- **Ingestion Worker**: Handles webhook data from N8N workflows
- **Scheduler Worker**: Triggers KPI collection workflows via cron
- **Admin Console Worker**: API backend for management interface
- **Orchestration Worker**: Manages aggregate workflow queues
- Each worker has its own `wrangler.toml` and deployment lifecycle

### Data Storage Strategy
- **TIMESERIES_KV**: Time-series data with timestamp-based keys
- **JOBS_KV**: Job status tracking and metadata
- **PACKAGES_KV**: Aggregated analysis packages
- **CONFIG_KV**: System configuration and KPI registry
- **R2 Buckets**: Long-term archival and document storage

### Event-Driven Architecture
- Use Cloudflare Queues for async processing
- Implement dead letter queues for error handling
- Follow producer-consumer patterns for scalability

## Development Practices

### N8N Integration
- Always use the real N8N development instance at `http://localhost:5678`
- Use registered development webhooks:
  - `http://localhost:5678/webhook/cbbi-multi`
  - `http://localhost:5678/webhook/kpi-cmc`
- Test with actual N8N workflows, not mocks

### Code Organization
- Keep worker logic in separate directories under `src/workers/`
- Use shared utilities in `src/schemas/` and `src/validation/`
- Maintain consistent error handling across all workers
- Follow the established handler/middleware/utils pattern

### Security & Authentication
- Use Cloudflare Access for Admin Console authentication
- Implement API key validation for all worker endpoints
- Store secrets via `wrangler secret put`, never in code
- Validate webhook signatures from N8N

### Testing Strategy
- Test against real KV data, not mocks
- Use actual N8N workflows for integration testing
- Validate data contracts between N8N and workers
- Test error handling and retry mechanisms

## Code Style Guidelines

### JavaScript/Node.js (Workers)
- Use ES modules (`import/export`)
- Implement proper error handling with try-catch
- Use async/await for asynchronous operations
- Follow RESTful API patterns for endpoints
- Include comprehensive JSDoc comments

### Python (Data Processing)
- Use type hints for all function parameters and returns
- Follow PEP 8 style guidelines
- Use Pydantic for data validation schemas
- Implement proper logging with structured output

### React (Admin Console)
- Use functional components with hooks
- Implement proper error boundaries
- Use Tailwind CSS for styling
- Follow component composition patterns

## Deployment & Environment Management

### Environment Strategy
- **Development**: Local testing with preview KV namespaces
- **Staging**: Pre-production validation environment
- **Production**: Live system with production resources

### Configuration Management
- Use environment-specific `wrangler.toml` configurations
- Manage secrets through Wrangler CLI
- Implement feature flags via environment variables

## Data Contracts & Validation

### N8N to Worker Communication
- Validate all incoming webhook payloads
- Use consistent timestamp formats (ISO 8601)
- Implement idempotency for data ingestion
- Follow established schema patterns in `src/schemas/`

### KV Storage Patterns
- Use hierarchical key structures: `kpi_id:timestamp:data_type`
- Implement TTL for time-series data cleanup
- Store metadata separately from time-series data
- Use consistent JSON serialization

## Error Handling & Monitoring

### Error Response Patterns
- Return consistent error structures with status codes
- Log errors with trace IDs for debugging
- Implement circuit breaker patterns for external APIs
- Use dead letter queues for failed queue messages

### Monitoring Requirements
- Implement health check endpoints for all workers
- Track key metrics: response times, error rates, queue depths
- Set up alerting for critical system failures
- Monitor KV storage usage and performance

## Documentation Standards
- Update API documentation for endpoint changes
- Maintain deployment guides for infrastructure changes
- Document data schemas and validation rules
- Keep README files current for each worker
