# Orchestration Worker

The Orchestration Worker is responsible for monitoring job status in the KV store and triggering aggregate workflows when jobs are complete or timeout is reached. It implements the fan-in logic that consolidates individual KPI results for downstream processing.

## Key Responsibilities

- **Job Status Monitoring**: Periodically polls KV store to check job completion status
- **Timeout Detection**: Identifies jobs that have exceeded the configured timeout threshold
- **Fan-in Logic**: Triggers aggregate workflows when all KPIs are complete or timeout is reached
- **Queue Management**: Sends messages to `LLM_ANALYSIS_QUEUE` to initiate downstream processing
- **Partial Data Handling**: Supports processing incomplete jobs with partial data
- **Configuration Management**: Supports configurable polling frequency and timeout thresholds

## Architecture

The worker runs on a scheduled basis (configurable cron trigger) and:

1. Scans active jobs in KV store
2. Checks completion status for each job
3. Determines if jobs are ready for aggregate processing
4. Triggers downstream workflows via queue messages
5. Updates job status to prevent duplicate processing

## Configuration

- `POLLING_FREQUENCY_MINUTES`: How often to check job status (default: 5 minutes)
- `JOB_TIMEOUT_MINUTES`: Maximum time to wait for job completion (default: 30 minutes)
- `ENABLE_PARTIAL_DATA`: Whether to process jobs with partial data (default: true)

## Endpoints

- `GET /health`: Health check endpoint for monitoring

## Queue Integration

- **LLM_ANALYSIS_QUEUE**: Sends messages containing `traceId` when jobs are ready for analysis

## KV Store Keys

- `job:{traceId}`: Job status and metadata
- `orchestration:last_run`: Timestamp of last orchestration run
- `orchestration:config`: Runtime configuration overrides

## Error Handling

- Comprehensive error logging for troubleshooting
- Graceful handling of KV store failures
- Queue message retry logic
- Partial data processing capabilities

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy to Cloudflare
npm run deploy
```

## Testing

```bash
# Run tests
npm test
```