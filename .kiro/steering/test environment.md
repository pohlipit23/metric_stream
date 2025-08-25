---
inclusion: always
---

# Test Environment Guidelines

## N8N Development Webhooks (MANDATORY)

When testing or developing integrations, **ALWAYS** use these registered N8N webhooks running on `http://localhost:5678`:

### Data Collection Endpoints
- **KPI 1 - CoinMarketCap**: `http://localhost:5678/webhook/kpi-cmc`
- **KPI 2 - CBBI**: `http://localhost:5678/webhook/kpi-cbbi`

### Processing Endpoints  
- **Chart Generation**: `http://localhost:5678/webhook/chart-generation`
- **LLM Analysis**: `http://localhost:5678/webhook/llm-analysis`

## Testing Rules for AI Assistant

### Webhook Testing Requirements
- **NEVER** create mock webhooks - always use real N8N endpoints above
- Test webhook responses with actual data payloads
- Validate webhook signatures and authentication
- Ensure N8N instance is running before testing (`docker-compose up` if needed)

### Development Workflow
1. N8N development server will always be available on http://localhost:5678 and does not need to be confirmed
2. Use registered webhooks for all integration testing
3. Test with real data flows, not simulated responses
4. Validate error handling with actual webhook failures

### Data Validation Testing
- Test webhook payload validation using actual N8N responses
- Verify timestamp formats (ISO 8601) from real webhook data
- Test idempotency with duplicate webhook calls
- Validate KV storage patterns with real data

### Integration Testing Protocol
- Always test full N8N → Worker → KV data flow
- Use development KV namespaces for testing
- Test both success and failure scenarios
- Verify queue processing with actual messages

## Environment Setup Requirements
- N8N will be accessible at `localhost:5678`
- Development KV namespaces configured in `wrangler.toml`
- Local Cloudflare Workers development environment
- Docker available for N8N container management

