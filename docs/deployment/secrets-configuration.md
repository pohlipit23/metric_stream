# Cloudflare Secrets Configuration

This document outlines all the secrets and credentials required for the Daily Index Tracker system to function properly in Cloudflare Workers.

## Overview

The Daily Index Tracker uses Cloudflare Secrets to securely store API keys, tokens, and other sensitive configuration data needed for Cloudflare Workers to communicate with N8N and manage internal system operations. 

**Important**: External service API keys (LLM services, notification services, chart generation) are stored and managed entirely within N8N, not in Cloudflare. N8N handles all external communications.

## Secret Categories

### 1. N8N Integration Secrets

These secrets enable communication between Cloudflare Workers and the N8N instance.

| Secret Name | Description | Required | Example Value |
|-------------|-------------|----------|---------------|
| `N8N_API_KEY` | API key for N8N instance authentication | Yes | `n8n_api_1234567890abcdef` |
| `N8N_BASE_URL` | Base URL for N8N instance | Yes | `https://your-n8n-instance.com` |
| `N8N_WEBHOOK_SECRET` | Shared secret for webhook authentication | Yes | `webhook_secret_xyz789` |

### 2. System Authentication Secrets

Internal system authentication between Cloudflare components.

| Secret Name | Description | Required | Example Value |
|-------------|-------------|----------|---------------|
| `INGESTION_API_KEY` | API key for Ingestion Worker authentication | Yes | `ing_api_key_abc123` |
| `ADMIN_CONSOLE_SECRET` | Secret key for Admin Console authentication | Yes | `admin_secret_def456` |
| `ORCHESTRATION_API_KEY` | API key for Orchestration Worker | Yes | `orch_api_key_ghi789` |
| `SCHEDULER_API_KEY` | API key for Scheduler Worker | Yes | `sched_api_key_jkl012` |

### 3. Storage and Database Keys

Keys for accessing Cloudflare R2 and other storage services.

| Secret Name | Description | Required | Example Value |
|-------------|-------------|----------|---------------|
| `R2_ACCESS_KEY_ID` | Cloudflare R2 Access Key ID for bucket operations | Yes | `1234567890abcdef1234567890abcdef` |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 Secret Access Key for bucket operations | Yes | `abcdef1234567890abcdef1234567890abcdef12` |

### 4. Monitoring and Analytics

Keys for system monitoring and error tracking services.

| Secret Name | Description | Required | Example Value |
|-------------|-------------|----------|---------------|
| `SENTRY_DSN` | Sentry DSN for error tracking and monitoring | Optional | `https://abc123@o123456.ingest.sentry.io/123456` |

### 5. Cloudflare Access Configuration

Configuration for Cloudflare Access authentication.

| Secret Name | Description | Required | Example Value |
|-------------|-------------|----------|---------------|
| `CF_ACCESS_CLIENT_ID` | Cloudflare Access Client ID for authentication | Yes | `1234567890abcdef1234567890abcdef.access` |
| `CF_ACCESS_CLIENT_SECRET` | Cloudflare Access Client Secret for authentication | Yes | `abcdef1234567890abcdef1234567890abcdef12` |

## Secrets NOT Stored in Cloudflare

The following secrets are managed entirely within N8N and should NOT be configured in Cloudflare:

### External Service API Keys (N8N Only)
- `OPENROUTER_API_KEY` - OpenRouter API key for LLM services
- `GEMINI_API_KEY` - Google Gemini API key for LLM services  
- `CLAUDE_API_KEY` - Anthropic Claude API key for LLM services
- `CHART_IMG_API_KEY` - chart-img.com API key for external chart generation

### Notification Service Keys (N8N Only)
- `GMAIL_CLIENT_ID` - Gmail OAuth Client ID for email notifications
- `GMAIL_CLIENT_SECRET` - Gmail OAuth Client Secret for email notifications
- `TELEGRAM_BOT_TOKEN` - Telegram Bot Token for Telegram notifications
- `DISCORD_WEBHOOK_URL` - Discord Webhook URL for Discord notifications
- `SLACK_BOT_TOKEN` - Slack Bot Token for Slack notifications
- `TWILIO_ACCOUNT_SID` - Twilio Account SID for SMS notifications
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token for SMS notifications

These secrets are configured directly in N8N workflows and credentials, as N8N handles all external service communications.

## Configuration Methods

### Method 1: Automated Script (Recommended)

Use the provided configuration script to set up all secrets interactively:

```bash
# Make the script executable
chmod +x scripts/deployment/configure-secrets.sh

# Run the configuration script
./scripts/deployment/configure-secrets.sh
```

The script will:
- Check for Wrangler CLI installation and authentication
- Prompt you to select the environment(s) to configure
- Guide you through entering each secret value
- Validate the configuration

### Method 2: Manual Configuration

Configure secrets manually using the Wrangler CLI:

```bash
# Set a secret for the default environment
wrangler secret put SECRET_NAME

# Set a secret for a specific environment
wrangler secret put SECRET_NAME --env production
```

### Method 3: Bulk Configuration

For bulk configuration, you can use a script with environment variables:

```bash
# Set environment variables
export N8N_API_KEY="your_n8n_api_key"
export N8N_BASE_URL="https://your-n8n-instance.com"

# Use wrangler with environment variables
echo "$N8N_API_KEY" | wrangler secret put N8N_API_KEY --env production
echo "$N8N_BASE_URL" | wrangler secret put N8N_BASE_URL --env production
```

## Environment-Specific Configuration

### Development Environment

For development, you can use test/mock values for most external services:

```bash
# Configure development secrets
wrangler secret put N8N_API_KEY --env development
wrangler secret put N8N_BASE_URL --env development  # http://localhost:5678
wrangler secret put INGESTION_API_KEY --env development
```

### Staging Environment

Staging should use separate API keys from production but connect to real services:

```bash
# Configure staging secrets
wrangler secret put N8N_API_KEY --env staging
wrangler secret put OPENROUTER_API_KEY --env staging
wrangler secret put TELEGRAM_BOT_TOKEN --env staging
```

### Production Environment

Production requires all real API keys and should be configured with maximum security:

```bash
# Configure production secrets
wrangler secret put N8N_API_KEY --env production
wrangler secret put OPENROUTER_API_KEY --env production
wrangler secret put GMAIL_CLIENT_ID --env production
```

## Security Best Practices

### 1. Secret Rotation

- Rotate API keys and tokens regularly (recommended: every 90 days)
- Update secrets in both Cloudflare and N8N when rotating
- Monitor for any unauthorized access or unusual activity

### 2. Environment Separation

- Use completely different API keys for different environments
- Never use production keys in development or staging
- Implement proper access controls for each environment

### 3. Access Control

- Limit access to secrets to only necessary team members
- Use Cloudflare Access to control who can view/modify secrets
- Implement audit logging for secret access

### 4. Backup and Recovery

- Keep secure backups of critical API keys
- Document the process for regenerating lost keys
- Have a recovery plan for compromised secrets

## Verification

After configuring secrets, verify they are properly set:

```bash
# List all secrets for an environment
wrangler secret list --env production

# Test worker deployment with secrets
wrangler deploy --env production

# Check worker logs for any authentication errors
wrangler tail --env production
```

## Troubleshooting

### Common Issues

1. **Secret Not Found Error**
   - Verify the secret name matches exactly (case-sensitive)
   - Check that the secret is set for the correct environment
   - Ensure the worker is deployed after setting secrets

2. **Authentication Failures**
   - Verify API key format and validity
   - Check that the service endpoint URLs are correct
   - Ensure proper permissions are set for the API keys

3. **N8N Integration Issues**
   - Verify N8N instance is accessible from Cloudflare
   - Check that webhook URLs are correctly configured
   - Ensure N8N API key has proper permissions

### Getting Help

If you encounter issues with secret configuration:

1. Check the Cloudflare dashboard for secret status
2. Review worker logs for authentication errors
3. Verify API key validity with the respective services
4. Consult the N8N documentation for integration requirements

## Related Documentation

- [Cloudflare Workers Secrets Documentation](https://developers.cloudflare.com/workers/configuration/secrets/)
- [N8N API Documentation](https://docs.n8n.io/api/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)