#!/bin/bash

# Daily Index Tracker - Development Environment with Real Data
# This script starts the Admin Console Worker and Frontend with real configuration data

set -e

echo "🚀 Starting Daily Index Tracker Development Environment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required directories exist
if [ ! -d "src/workers/admin-console" ]; then
    echo -e "${RED}❌ Admin Console Worker directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

if [ ! -d "src/admin-console" ]; then
    echo -e "${RED}❌ Admin Console Frontend directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo -e "${YELLOW}🔄 Killing existing process on port $port${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Check and clean up ports
if check_port 8787; then
    echo -e "${YELLOW}⚠️  Port 8787 is already in use${NC}"
    kill_port 8787
fi

if check_port 5173; then
    echo -e "${YELLOW}⚠️  Port 5173 is already in use${NC}"
    kill_port 5173
fi

# Create log directory
mkdir -p logs

echo -e "${BLUE}📦 Installing dependencies...${NC}"

# Install Admin Console Worker dependencies
cd src/workers/admin-console
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing Admin Console Worker dependencies...${NC}"
    npm install
fi

# Install Admin Console Frontend dependencies
cd ../../admin-console
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing Admin Console Frontend dependencies...${NC}"
    npm install
fi

cd ../../..

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Start Admin Console Worker in background
echo -e "${BLUE}🔧 Starting Admin Console Worker on port 8787...${NC}"
cd src/workers/admin-console
wrangler dev --port 8787 > ../../../logs/admin-worker.log 2>&1 &
WORKER_PID=$!
cd ../../..

# Wait for worker to start
echo -e "${YELLOW}⏳ Waiting for Admin Console Worker to start...${NC}"
sleep 5

# Check if worker is running
if ! kill -0 $WORKER_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start Admin Console Worker${NC}"
    echo "Check logs/admin-worker.log for details"
    exit 1
fi

# Test worker health
echo -e "${BLUE}🔍 Testing Admin Console Worker health...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:8787/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Admin Console Worker is healthy${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Admin Console Worker health check failed${NC}"
        echo "Check logs/admin-worker.log for details"
        kill $WORKER_PID 2>/dev/null || true
        exit 1
    fi
    echo -e "${YELLOW}⏳ Waiting for worker... (attempt $i/10)${NC}"
    sleep 2
done

# Initialize configuration data
echo -e "${BLUE}📝 Initializing configuration data...${NC}"
node scripts/initialize-config.js

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to initialize configuration data${NC}"
    kill $WORKER_PID 2>/dev/null || true
    exit 1
fi

# Start Admin Console Frontend
echo -e "${BLUE}🎨 Starting Admin Console Frontend on port 5173...${NC}"
cd src/admin-console
npm run dev > ../../logs/admin-frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

# Wait for frontend to start
echo -e "${YELLOW}⏳ Waiting for Admin Console Frontend to start...${NC}"
sleep 5

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start Admin Console Frontend${NC}"
    echo "Check logs/admin-frontend.log for details"
    kill $WORKER_PID 2>/dev/null || true
    exit 1
fi

# Test frontend
echo -e "${BLUE}🔍 Testing Admin Console Frontend...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Admin Console Frontend is running${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Admin Console Frontend is not responding${NC}"
        echo "Check logs/admin-frontend.log for details"
        kill $WORKER_PID $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
    echo -e "${YELLOW}⏳ Waiting for frontend... (attempt $i/10)${NC}"
    sleep 2
done

echo ""
echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo "=================================================="
echo -e "${BLUE}📱 Admin Console Frontend:${NC} http://localhost:5173"
echo -e "${BLUE}🔧 Admin Console Worker API:${NC} http://localhost:8787"
echo -e "${BLUE}⚙️  System Configuration:${NC} http://localhost:5173/system-config"
echo ""
echo -e "${YELLOW}📊 Available test data:${NC}"
echo "  • System configuration with real retry/fallback settings"
echo "  • Schedule configuration with cron expressions"
echo "  • Sample KPI registry entries (CBBI, CoinMarketCap)"
echo ""
echo -e "${BLUE}📝 Log files:${NC}"
echo "  • Admin Worker: logs/admin-worker.log"
echo "  • Frontend: logs/admin-frontend.log"
echo ""
echo -e "${YELLOW}🛑 To stop the development environment:${NC}"
echo "  Press Ctrl+C or run: kill $WORKER_PID $FRONTEND_PID"
echo ""

# Save PIDs for cleanup
echo $WORKER_PID > .dev-worker.pid
echo $FRONTEND_PID > .dev-frontend.pid

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down development environment...${NC}"
    kill $WORKER_PID $FRONTEND_PID 2>/dev/null || true
    rm -f .dev-worker.pid .dev-frontend.pid
    echo -e "${GREEN}✅ Development environment stopped${NC}"
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Keep script running and show logs
echo -e "${BLUE}📋 Showing live logs (Ctrl+C to stop):${NC}"
echo "=================================================="

# Follow logs from both services
tail -f logs/admin-worker.log logs/admin-frontend.log &
TAIL_PID=$!

# Wait for user to stop
wait $TAIL_PID 2>/dev/null || true