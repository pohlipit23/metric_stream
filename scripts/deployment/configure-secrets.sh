#!/bin/bash

# Daily Index Tracker - Cloudflare Secrets Configuration Script
# This script configures all necessary secrets for the Daily Index Tracker system

set -e

echo "🔐 Configuring Cloudflare Secrets for Daily Index Tracker..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to set secret with confirmation
set_secret() {
    local secret_name=$1
    local description=$2
    local environment=${3:-""}
    
    echo -e "${BLUE}Setting secret: ${secret_name}${NC}"
    echo -e "${YELLOW}Description: ${description}${NC}"
    
    if [ -n "$environment" ]; then
        echo -e "${YELLOW}Environment: ${environment}${NC}"
        read -s -p "Enter value for ${secret_name}: " secret_value
        echo
        wrangler secret put "$secret_name" --env "$environment" <<< "$secret_value"
    else
        read -s -p "Enter value for ${secret_name}: " secret_value
        echo
        wrangler secret put "$secret_name" <<< "$secret_value"
    fi
    
    echo -e "${GREEN}✅ Secret ${secret_name} configured successfully${NC}"
    echo
}

# Function to configure secrets for an environment
configure_environment_secrets() {
    local env=$1
    echo -e "${BLUE}🌍 Configuring secrets for environment: ${env}${NC}"
    echo
    
    # N8N Integration Secrets
    set_secret "N8N_API_KEY" "API key for N8N instance authentication" "$env"
    set_secret "N8N_BASE_URL" "Base URL for N8N instance (e.g., https://your-n8n-instance.com)" "$env"
    set_secret "N8N_WEBHOOK_SECRET" "Shared secret for N8N webhook authentication" "$env"
    
    # System Authentication Secrets
    set_secret "INGESTION_API_KEY" "API key for Ingestion Worker authentication" "$env"
    set_secret "ADMIN_CONSOLE_SECRET" "Secret key for Admin Console authentication" "$env"
    set_secret "ORCHESTRATION_API_KEY" "API key for Orchestration Worker" "$env"
    set_secret "SCHEDULER_API_KEY" "API key for Scheduler Worker" "$env"
    
    # Database and Storage Keys
    set_secret "R2_ACCESS_KEY_ID" "Cloudflare R2 Access Key ID for bucket operations" "$env"
    set_secret "R2_SECRET_ACCESS_KEY" "Cloudflare R2 Secret Access Key for bucket operations" "$env"
    
    # Monitoring and Analytics
    set_secret "SENTRY_DSN" "Sentry DSN for error tracking and monitoring" "$env"
    
    # Cloudflare Access Configuration
    set_secret "CF_ACCESS_CLIENT_ID" "Cloudflare Access Client ID for authentication" "$env"
    set_secret "CF_ACCESS_CLIENT_SECRET" "Cloudflare Access Client Secret for authentication" "$env"
    
    echo -e "${GREEN}✅ All secrets configured for environment: ${env}${NC}"
    echo
}

# Main execution
echo -e "${BLUE}Daily Index Tracker - Cloudflare Secrets Configuration${NC}"
echo -e "${YELLOW}This script will configure all necessary secrets for the system.${NC}"
echo -e "${YELLOW}You will be prompted to enter each secret value.${NC}"
echo

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI is not installed. Please install it first:${NC}"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is authenticated
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}❌ You are not authenticated with Cloudflare. Please login first:${NC}"
    echo "wrangler login"
    exit 1
fi

echo -e "${GREEN}✅ Wrangler CLI is installed and authenticated${NC}"
echo

# Ask which environment to configure
echo "Which environment would you like to configure?"
echo "1) Development"
echo "2) Staging" 
echo "3) Production"
echo "4) All environments"
read -p "Enter your choice (1-4): " env_choice

case $env_choice in
    1)
        configure_environment_secrets "development"
        ;;
    2)
        configure_environment_secrets "staging"
        ;;
    3)
        configure_environment_secrets "production"
        ;;
    4)
        configure_environment_secrets "development"
        configure_environment_secrets "staging"
        configure_environment_secrets "production"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 Cloudflare Secrets configuration completed successfully!${NC}"
echo
echo -e "${BLUE}Next steps:${NC}"
echo "1. Verify secrets are configured: wrangler secret list"
echo "2. Configure external service API keys in N8N (see N8N Integration Guide)"
echo "3. Deploy your workers: npm run deploy"
echo "4. Test the system functionality"
echo
echo -e "${YELLOW}📝 Important Note:${NC}"
echo "External service API keys (LLM services, notifications, chart generation) are"
echo "configured directly in N8N workflows and credentials, NOT in Cloudflare."
echo "This script only configures secrets needed for Cloudflare Workers operation."
echo
echo -e "${YELLOW}⚠️  Security Note:${NC}"
echo "- Keep your secret values secure and never commit them to version control"
echo "- Regularly rotate API keys and tokens"
echo "- Monitor secret usage in Cloudflare dashboard"
echo "- Use different secrets for different environments"