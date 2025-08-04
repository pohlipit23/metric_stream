#!/bin/bash

# Daily Index Tracker - Cloudflare Setup Script
# This script helps set up the required Cloudflare resources

set -e

echo "🚀 Setting up Cloudflare resources for Daily Index Tracker..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI is not installed. Please install it first:${NC}"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  You need to login to Cloudflare first:${NC}"
    echo "wrangler login"
    exit 1
fi

echo -e "${GREEN}✅ Wrangler CLI is installed and authenticated${NC}"

# Create KV Namespaces
echo -e "\n📦 Creating KV Namespaces..."

echo "Creating production KV namespace..."
KV_PROD=$(wrangler kv:namespace create "KV_STORE" --preview false | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

echo "Creating preview KV namespace..."
KV_PREVIEW=$(wrangler kv:namespace create "KV_STORE" --preview | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

echo -e "${GREEN}✅ KV Namespaces created:${NC}"
echo "  Production ID: $KV_PROD"
echo "  Preview ID: $KV_PREVIEW"

# Create Queues
echo -e "\n🔄 Creating Cloudflare Queues..."

QUEUES=(
    "data-collection-queue"
    "chart-generation-queue" 
    "llm-analysis-queue"
    "packaging-queue"
    "delivery-queue"
)

for queue in "${QUEUES[@]}"; do
    echo "Creating queue: $queue"
    wrangler queues create "$queue" || echo "Queue $queue might already exist"
done

echo -e "${GREEN}✅ All queues created${NC}"

# Update wrangler.toml with KV IDs
echo -e "\n📝 Updating wrangler.toml with KV namespace IDs..."

# Create a backup of wrangler.toml
cp wrangler.toml wrangler.toml.backup

# Update the KV namespace IDs in wrangler.toml
sed -i.tmp "s/id = \"your-kv-namespace-id\"/id = \"$KV_PROD\"/" wrangler.toml
sed -i.tmp "s/preview_id = \"your-preview-kv-namespace-id\"/preview_id = \"$KV_PREVIEW\"/" wrangler.toml
rm wrangler.toml.tmp

echo -e "${GREEN}✅ wrangler.toml updated with KV namespace IDs${NC}"

# Prompt for secrets setup
echo -e "\n🔐 Setting up secrets..."
echo -e "${YELLOW}You'll need to set up the following secrets manually:${NC}"
echo "  - OPENAI_API_KEY (for LLM analysis)"
echo "  - TELEGRAM_BOT_TOKEN (for Telegram notifications)"
echo "  - DISCORD_WEBHOOK_URL (for Discord notifications)"
echo "  - SLACK_WEBHOOK_URL (for Slack notifications)"
echo "  - CHART_IMG_API_KEY (for chart generation)"
echo "  - SMTP_PASSWORD (for email notifications)"

echo -e "\n${YELLOW}Example commands to set secrets:${NC}"
echo "wrangler secret put OPENAI_API_KEY"
echo "wrangler secret put TELEGRAM_BOT_TOKEN"
echo "wrangler secret put CHART_IMG_API_KEY"

# Create environment-specific configurations
echo -e "\n🌍 Creating environment configurations..."

# Create .env.example file
cat > .env.example << EOF
# Example environment variables for local development
# Copy this to .env and fill in your actual values

# OpenAI API Key for LLM analysis
OPENAI_API_KEY=your_openai_api_key_here

# Telegram Bot Token for notifications
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Chart generation service API key
CHART_IMG_API_KEY=your_chart_img_api_key_here

# Email SMTP configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here

# Discord webhook URL
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url

# Slack webhook URL  
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your_webhook_url

# N8N instance configuration
N8N_API_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key_here
EOF

echo -e "${GREEN}✅ Created .env.example file${NC}"

# Summary
echo -e "\n🎉 ${GREEN}Cloudflare setup completed!${NC}"
echo -e "\n📋 ${YELLOW}Next steps:${NC}"
echo "1. Set up your secrets using the wrangler secret put commands above"
echo "2. Configure your domain and DNS settings in Cloudflare Dashboard"
echo "3. Set up Cloudflare Access for the Admin Console"
echo "4. Run 'npm install' to install dependencies"
echo "5. Run 'npm run dev' to start development"

echo -e "\n📚 ${YELLOW}Important files created/updated:${NC}"
echo "  - wrangler.toml (updated with KV namespace IDs)"
echo "  - .env.example (template for environment variables)"
echo "  - wrangler.toml.backup (backup of original wrangler.toml)"

echo -e "\n🔗 ${YELLOW}Useful Cloudflare Dashboard links:${NC}"
echo "  - Workers: https://dash.cloudflare.com/workers"
echo "  - KV: https://dash.cloudflare.com/kv"
echo "  - Queues: https://dash.cloudflare.com/queues"
echo "  - Access: https://dash.cloudflare.com/zero-trust/access"