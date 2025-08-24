# Cloudflare Deployment Guide

This guide walks you through deploying the Daily Index Tracker system to Cloudflare.

## Prerequisites

Before deploying, ensure you have:

1. **Cloudflare Account**: A Cloudflare account with Workers and Pages enabled
2. **Wrangler CLI**: Installed and authenticated
3. **Node.js**: Version 18+ installed
4. **N8N Instance**: Either N8N Cloud or self-hosted instance configured

## Installation and Setup

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (if needed)
pip install -r requirements.txt

# Install Wrangler CLI globally (if not already installed)
npm install -g wrangler
```

### 2. Authenticate with Cloudflare

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

## Deployment Process

### Step 1: Configure Cloudflare Resources

The `wrangler.toml` file defines all necessary Cloudflare resources. Review and customize it if needed:

```bash
# Review the configuration
cat wrangler.toml

# Validate the configuration
wrangler validate
```

### Step 2: Create Cloudflare Resources

Deploy the configuration to create all necessary resources:

```bash
# Create resources for development environment
wrangler deploy --env development

# Create resources for staging environment
wrangler deploy --env staging

# Create resources for production environment
wrangler deploy --env production
```

### Step 3: Configure Secrets

Configure Cloudflare-specific secrets using the provided script:

```bash
# Run the interactive secrets configuration script
./scripts/deployment/configure-secrets.sh

# Or configure secrets manually for each environment
wrangler secret put N8N_API_KEY --env production
wrangler secret put N8N_BASE_URL --env production
# ... (continue for all required secrets)
```

**Important**: This only configures secrets needed for Cloudflare Workers. External service API keys (LLM services, notifications, chart generation) are configured directly in N8N workflows and credentials.

### Step 4: Validate Configuration

Validate that all secrets are properly configured:

```bash
# Validate secrets for all environments
./scripts/deployment/validate-secrets.sh

# Or validate specific environment
wrangler secret list --env production
```

### Step 5: Deploy Workers

Deploy all workers to Cloudflare:

```bash
# Deploy to development
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy
```

### Step 6: Deploy Admin Console

Deploy the Admin Console frontend to Cloudflare Pages:

```bash
# Build the frontend
npm run build:frontend

# Deploy to Pages
wrangler pages deploy src/admin-console/dist --project-name daily-index-tracker-admin
```

## Environment-Specific Deployment

### Development Environment

```bash
# Configure development environment
wrangler secret put N8N_BASE_URL --env development
# Enter: http://localhost:5678 (for local N8N)

# Deploy development workers
wrangler deploy --env development

# Test the deployment
curl https://daily-index-tracker-dev.your-subdomain.workers.dev/health
```

### Staging Environment

```bash
# Configure staging environment with test credentials
./scripts/deployment/configure-secrets.sh
# Select option 2 for staging

# Deploy staging workers
wrangler deploy --env staging

# Run integration tests
npm run test:integration:staging
```

### Production Environment

```bash
# Configure production environment with real credentials
./scripts/deployment/configure-secrets.sh
# Select option 3 for production

# Deploy production workers
wrangler deploy --env production

# Verify deployment
./scripts/deployment/validate-secrets.sh
# Select option 3 for production
```

## Post-Deployment Configuration

### 1. Configure Cloudflare Access

Set up Cloudflare Access for the Admin Console:

```bash
# Configure Access policies in Cloudflare dashboard
# Navigate to: Zero Trust > Access > Applications
# Create new application for Admin Console
```

### 2. Set Up Custom Domains

Configure custom domains for your workers:

```bash
# Add custom domain in Cloudflare dashboard
# Navigate to: Workers & Pages > daily-index-tracker > Settings > Domains
```

### 3. Configure Cron Triggers

Set up scheduled triggers for the system:

```bash
# Cron triggers are defined in wrangler.toml
# Verify they are active in Cloudflare dashboard
# Navigate to: Workers & Pages > daily-index-tracker > Settings > Triggers
```

## Monitoring and Maintenance

### 1. Monitor Deployments

```bash
# View worker logs
wrangler tail --env production

# Monitor specific worker
wrangler tail ingestion-worker --env production

# View analytics
wrangler analytics --env production
```

### 2. Update Deployments

```bash
# Update workers
wrangler deploy --env production

# Update Pages
wrangler pages deploy src/admin-console/dist --project-name daily-index-tracker-admin-prod
```

### 3. Rollback if Needed

```bash
# List deployments
wrangler deployments list --env production

# Rollback to previous version
wrangler rollback [DEPLOYMENT_ID] --env production
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   ```bash
   # Re-authenticate with Cloudflare
   wrangler logout
   wrangler login
   ```

2. **Secret Configuration Issues**
   ```bash
   # Validate secrets
   ./scripts/deployment/validate-secrets.sh
   
   # Reconfigure missing secrets
   wrangler secret put SECRET_NAME --env production
   ```

3. **Resource Limit Errors**
   ```bash
   # Check resource usage in Cloudflare dashboard
   # Upgrade plan if necessary
   ```

4. **N8N Integration Issues**
   ```bash
   # Test N8N connectivity
   curl -H "Authorization: Bearer $N8N_API_KEY" $N8N_BASE_URL/api/v1/workflows
   ```

### Getting Help

If you encounter deployment issues:

1. Check the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
2. Review worker logs: `wrangler tail --env production`
3. Validate configuration: `wrangler validate`
4. Check resource limits in Cloudflare dashboard
5. Verify N8N instance accessibility

## Security Considerations

### 1. Secret Management

- Use different API keys for different environments
- Rotate secrets regularly (every 90 days recommended)
- Never commit secrets to version control
- Use Cloudflare Access to control admin access

### 2. Network Security

- Configure proper CORS policies
- Set up rate limiting for public endpoints
- Use HTTPS for all communications
- Implement proper firewall rules for N8N instance

### 3. Access Control

- Configure Cloudflare Access for Admin Console
- Use principle of least privilege for API keys
- Monitor access logs regularly
- Implement audit logging

## Performance Optimization

### 1. Worker Optimization

- Monitor worker execution times
- Optimize code for cold start performance
- Use appropriate worker memory limits
- Implement proper caching strategies

### 2. KV Store Optimization

- Use appropriate TTL values
- Implement data archiving for old records
- Monitor KV storage usage
- Optimize key naming conventions

### 3. Queue Optimization

- Monitor queue depth and processing times
- Adjust batch sizes and timeouts as needed
- Implement proper error handling and retries
- Use dead letter queues for failed messages

## Backup and Recovery

### 1. Data Backup

- Regular backups of KV store data
- Export configuration settings
- Backup R2 stored documents
- Document recovery procedures

### 2. Disaster Recovery

- Maintain deployment scripts and configurations
- Document rollback procedures
- Test recovery processes regularly
- Keep offline backups of critical data

## Cost Management

### 1. Monitor Usage

- Track worker invocations and duration
- Monitor KV operations and storage
- Review queue message volume
- Analyze R2 storage and bandwidth usage

### 2. Optimize Costs

- Implement data archiving policies
- Optimize worker execution efficiency
- Use appropriate caching strategies
- Monitor and adjust resource limits

## Next Steps

After successful deployment:

1. **Configure N8N Workflows**: Set up individual KPI workflows in N8N
2. **Import Historical Data**: Use Admin Console to import historical KPI data
3. **Test End-to-End**: Run complete system tests
4. **Set Up Monitoring**: Configure alerts and monitoring dashboards
5. **Train Users**: Provide training on Admin Console usage

## Related Documentation

- [Secrets Configuration Guide](./secrets-configuration.md)
- [N8N Integration Guide](../integration/n8n-integration.md)
- [Admin Console User Guide](../user/admin-console.md)
- [API Documentation](../api/README.md)