# Cloudflare Setup Guide for Daily Index Tracker

This guide walks you through setting up all required Cloudflare services for the Daily Index Tracker system.

## Prerequisites

### 1. Cloudflare Account
- Sign up at [cloudflare.com](https://cloudflare.com)
- **Important**: You need a **paid plan** (Workers Paid at minimum) to access:
  - Cloudflare KV
  - Cloudflare Queues
  - Cloudflare Access
  - Higher resource limits

### 2. Domain Setup
- Add your domain to Cloudflare
- Update nameservers to Cloudflare's nameservers
- Ensure DNS is properly configured

## Step-by-Step Setup

### Step 1: Install Wrangler CLI

```bash
# Install globally
npm install -g wrangler

# Verify installation
wrangler --version

# Login to Cloudflare
wrangler login
```

### Step 2: Run Automated Setup Script

```bash
# Make the script executable (if not already)
chmod +x scripts/setup-cloudflare.sh

# Run the setup script
./scripts/setup-cloudflare.sh
```

This script will:
- Create KV namespaces for data storage
- Create all required Cloudflare Queues
- Update `wrangler.toml` with the correct resource IDs
- Provide guidance for setting up secrets

### Step 3: Configure Secrets

Set up the required secrets for external service integration:

```bash
# OpenAI API Key (for LLM analysis)
wrangler secret put OPENAI_API_KEY

# Telegram Bot Token (create bot via @BotFather)
wrangler secret put TELEGRAM_BOT_TOKEN

# Chart generation service API key
wrangler secret put CHART_IMG_API_KEY

# Email SMTP credentials
wrangler secret put SMTP_PASSWORD

# Discord webhook URL
wrangler secret put DISCORD_WEBHOOK_URL

# Slack webhook URL
wrangler secret put SLACK_WEBHOOK_URL
```

### Step 4: Configure Cloudflare Access

1. Navigate to **Cloudflare Dashboard > Zero Trust > Access**
2. Click **Add an application**
3. Choose **Self-hosted**
4. Configure application settings:
   - **Application name**: Daily Index Tracker Admin Console
   - **Subdomain**: admin (or your preferred subdomain)
   - **Domain**: your-domain.com
   - **Path**: / (or specific path if needed)

5. Set up authentication policies:
   - **Policy name**: Admin Access
   - **Action**: Allow
   - **Include**: Add your email or group
   - **Session duration**: 24 hours (or as needed)

### Step 5: Configure Rate Limiting

1. Go to **Cloudflare Dashboard > Security > WAF**
2. Create rate limiting rules for API endpoints:
   - **Admin API**: 100 requests per minute per IP
   - **Public endpoints**: 50 requests per minute per IP

### Step 6: Set up Monitoring

#### Enable Analytics
1. Go to **Cloudflare Dashboard > Analytics & Logs > Workers**
2. Enable analytics for all workers

#### Configure Logpush (Optional but Recommended)
1. Go to **Cloudflare Dashboard > Analytics & Logs > Logpush**
2. Create a new Logpush job for Workers logs
3. Configure destination (e.g., S3, Google Cloud Storage, or HTTP endpoint)

## Resource Configuration Details

### KV Namespaces
The system uses one primary KV namespace for:
- Job status tracking
- KPI package storage
- System configuration
- User settings

### Queues Configuration
Five queues orchestrate the workflow:

1. **data-collection-queue**: Triggers individual KPI data collection
2. **chart-generation-queue**: Triggers chart generation for KPIs
3. **llm-analysis-queue**: Triggers aggregate LLM analysis
4. **packaging-queue**: Triggers message packaging and formatting
5. **delivery-queue**: Triggers final delivery to notification channels

### Environment Variables
Configure these in `wrangler.toml` under `[vars]`:

```toml
[vars]
ENVIRONMENT = "development"  # or "staging", "production"
LOG_LEVEL = "info"          # or "debug", "warn", "error"
N8N_API_URL = "https://your-n8n-instance.com"
DEFAULT_TIMEOUT = "300000"  # 5 minutes in milliseconds
```

## Security Best Practices

### 1. Access Control
- Use Cloudflare Access for all admin interfaces
- Implement principle of least privilege
- Regularly review access policies

### 2. API Security
- Enable rate limiting on all endpoints
- Use HTTPS only
- Implement proper CORS policies
- Validate all inputs

### 3. Secret Management
- Store all sensitive data in Cloudflare Secrets
- Never commit secrets to version control
- Rotate secrets regularly
- Use environment-specific secrets

### 4. Network Security
- Enable Cloudflare's security features (DDoS protection, WAF)
- Configure appropriate firewall rules
- Monitor for suspicious activity

## Troubleshooting

### Common Issues

#### 1. "Insufficient plan" errors
- Ensure you have a paid Cloudflare plan
- KV and Queues require Workers Paid plan or higher

#### 2. Authentication failures
- Verify `wrangler login` was successful
- Check API token permissions if using tokens

#### 3. Resource creation failures
- Check account limits and quotas
- Ensure proper permissions for resource creation

#### 4. DNS/Domain issues
- Verify domain is added to Cloudflare
- Check nameserver configuration
- Ensure DNS records are properly configured

### Getting Help

1. **Cloudflare Documentation**: [developers.cloudflare.com](https://developers.cloudflare.com)
2. **Cloudflare Community**: [community.cloudflare.com](https://community.cloudflare.com)
3. **Wrangler CLI Help**: `wrangler help`

## Next Steps

After completing this setup:

1. ✅ **Task 0.1 Complete**: Cloudflare account and services configured
2. ➡️ **Task 0.2**: Set up development environment and tooling
3. ➡️ **Task 0.3**: Configure external service accounts
4. ➡️ **Task 0.4**: Set up Docker-hosted N8N for development

## Verification Checklist

- [ ] Cloudflare account with paid plan active
- [ ] Domain added and DNS configured
- [ ] Wrangler CLI installed and authenticated
- [ ] KV namespace created and configured in wrangler.toml
- [ ] All 5 queues created successfully
- [ ] Required secrets configured
- [ ] Cloudflare Access application created
- [ ] Rate limiting rules configured
- [ ] Analytics and monitoring enabled
- [ ] Security settings reviewed and configured

Once all items are checked, you're ready to proceed to the next phase of development!