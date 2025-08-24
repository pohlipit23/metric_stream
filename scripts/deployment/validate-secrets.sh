#!/bin/bash

# Daily Index Tracker - Secrets Validation Script
# This script validates that all required secrets are properly configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Required secrets for each environment
REQUIRED_SECRETS=(
    "N8N_API_KEY"
    "N8N_BASE_URL"
    "N8N_WEBHOOK_SECRET"
    "INGESTION_API_KEY"
    "ADMIN_CONSOLE_SECRET"
    "ORCHESTRATION_API_KEY"
    "SCHEDULER_API_KEY"
    "R2_ACCESS_KEY_ID"
    "R2_SECRET_ACCESS_KEY"
    "CF_ACCESS_CLIENT_ID"
    "CF_ACCESS_CLIENT_SECRET"
)

# Optional secrets (warn if missing but don't fail)
OPTIONAL_SECRETS=(
    "SENTRY_DSN"
)

# Function to validate secrets for an environment
validate_environment_secrets() {
    local env=$1
    local missing_required=0
    local missing_optional=0
    
    echo -e "${BLUE}🔍 Validating secrets for environment: ${env}${NC}"
    echo
    
    # Get list of configured secrets
    if [ "$env" = "default" ]; then
        secret_list=$(wrangler secret list 2>/dev/null || echo "")
    else
        secret_list=$(wrangler secret list --env "$env" 2>/dev/null || echo "")
    fi
    
    # Check required secrets
    echo -e "${BLUE}Required Secrets:${NC}"
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if echo "$secret_list" | grep -q "$secret"; then
            echo -e "  ✅ ${secret}"
        else
            echo -e "  ❌ ${secret} ${RED}(MISSING - REQUIRED)${NC}"
            ((missing_required++))
        fi
    done
    
    echo
    echo -e "${BLUE}Optional Secrets:${NC}"
    for secret in "${OPTIONAL_SECRETS[@]}"; do
        if echo "$secret_list" | grep -q "$secret"; then
            echo -e "  ✅ ${secret}"
        else
            echo -e "  ⚠️  ${secret} ${YELLOW}(missing - optional)${NC}"
            ((missing_optional++))
        fi
    done
    
    echo
    
    # Summary
    if [ $missing_required -eq 0 ]; then
        echo -e "${GREEN}✅ All required secrets are configured for ${env}${NC}"
    else
        echo -e "${RED}❌ ${missing_required} required secrets are missing for ${env}${NC}"
    fi
    
    if [ $missing_optional -gt 0 ]; then
        echo -e "${YELLOW}⚠️  ${missing_optional} optional secrets are missing for ${env}${NC}"
        echo -e "${YELLOW}   Some features may not work without these secrets${NC}"
    fi
    
    echo
    return $missing_required
}

# Function to test secret connectivity
test_secret_connectivity() {
    local env=$1
    echo -e "${BLUE}🔗 Testing secret connectivity for environment: ${env}${NC}"
    
    # This would require actual API calls to test connectivity
    # For now, we'll just validate the format of some secrets
    echo -e "${YELLOW}Note: Connectivity testing requires actual API calls${NC}"
    echo -e "${YELLOW}Manual testing recommended after deployment${NC}"
    echo
}

# Main execution
echo -e "${BLUE}Daily Index Tracker - Secrets Validation${NC}"
echo -e "${YELLOW}This script validates that all required secrets are configured.${NC}"
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

# Ask which environment to validate
echo "Which environment would you like to validate?"
echo "1) Development"
echo "2) Staging"
echo "3) Production"
echo "4) All environments"
read -p "Enter your choice (1-4): " env_choice

total_errors=0

case $env_choice in
    1)
        validate_environment_secrets "development"
        total_errors=$?
        ;;
    2)
        validate_environment_secrets "staging"
        total_errors=$?
        ;;
    3)
        validate_environment_secrets "production"
        total_errors=$?
        ;;
    4)
        echo -e "${BLUE}Validating all environments...${NC}"
        echo
        
        validate_environment_secrets "development"
        dev_errors=$?
        
        validate_environment_secrets "staging"
        staging_errors=$?
        
        validate_environment_secrets "production"
        prod_errors=$?
        
        total_errors=$((dev_errors + staging_errors + prod_errors))
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo -e "${BLUE}📊 Validation Summary${NC}"
echo "===================="

if [ $total_errors -eq 0 ]; then
    echo -e "${GREEN}🎉 All validations passed successfully!${NC}"
    echo -e "${GREEN}Your secrets are properly configured.${NC}"
    echo
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Deploy your workers: npm run deploy"
    echo "2. Test the system functionality"
    echo "3. Monitor logs for any authentication issues"
else
    echo -e "${RED}❌ Validation failed with ${total_errors} missing required secrets.${NC}"
    echo -e "${RED}Please configure the missing secrets before deploying.${NC}"
    echo
    echo -e "${BLUE}To configure missing secrets:${NC}"
    echo "1. Run: ./scripts/deployment/configure-secrets.sh"
    echo "2. Or manually set secrets: wrangler secret put SECRET_NAME --env ENVIRONMENT"
    echo "3. Re-run this validation script"
fi

echo
echo -e "${YELLOW}💡 Tips:${NC}"
echo "- Use different API keys for different environments"
echo "- Regularly rotate your secrets for security"
echo "- Monitor secret usage in the Cloudflare dashboard"
echo "- Keep backups of critical API keys in a secure location"

exit $total_errors