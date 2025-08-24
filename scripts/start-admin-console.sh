#!/bin/bash

# Start Admin Console Development Environment
# This script starts both the backend worker and frontend React app

set -e

echo "🚀 Starting Admin Console Development Environment..."

# Check if required directories exist
if [ ! -d "src/workers/admin-console" ]; then
    echo "❌ Admin Console Worker directory not found"
    exit 1
fi

if [ ! -d "src/admin-console" ]; then
    echo "❌ Admin Console frontend directory not found"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo "🧹 Cleaning up background processes..."
    if [ ! -z "$WORKER_PID" ]; then
        kill $WORKER_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start Admin Console Worker in background
echo "📡 Starting Admin Console Worker on port 8787..."
cd src/workers/admin-console
wrangler dev --port 8787 --local &
WORKER_PID=$!
cd ../../..

# Wait a moment for worker to start
sleep 3

# Check if worker is running
if ! curl -s http://localhost:8787/health > /dev/null 2>&1; then
    echo "⚠️  Worker health check failed, but continuing..."
fi

# Start React frontend in background
echo "🎨 Starting React frontend on port 5173..."
cd src/admin-console
npm run dev &
FRONTEND_PID=$!
cd ../..

# Wait a moment for frontend to start
sleep 5

echo ""
echo "✅ Admin Console is starting up!"
echo ""
echo "📍 URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8787"
echo "   System Config: http://localhost:5173/system-config"
echo ""
echo "🔧 API Endpoints:"
echo "   Health: http://localhost:8787/health"
echo "   Config: http://localhost:8787/api/config"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $WORKER_PID $FRONTEND_PID