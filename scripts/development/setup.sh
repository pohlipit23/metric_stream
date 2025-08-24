#!/bin/bash

# Daily Index Tracker - Development Environment Setup Script
# This script automates the development environment setup process

set -e  # Exit on any error

echo "🚀 Daily Index Tracker - Development Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "requirements.txt" ]; then
    print_error "requirements.txt not found. Please run this script from the project root directory."
    exit 1
fi

# Check Python version
print_status "Checking Python version..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)
    
    if [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -ge 11 ]; then
        print_success "Python $PYTHON_VERSION found"
    else
        print_error "Python 3.11+ required. Found Python $PYTHON_VERSION"
        exit 1
    fi
else
    print_error "Python 3 not found. Please install Python 3.11+"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_warning "Virtual environment already exists"
fi

# Activate virtual environment and install dependencies
print_status "Installing Python dependencies..."
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip > /dev/null 2>&1

# Install requirements
if pip install -r requirements.txt > /dev/null 2>&1; then
    print_success "Python dependencies installed"
else
    print_error "Failed to install Python dependencies"
    exit 1
fi

# Test Python imports
print_status "Testing Python package imports..."
if python -c "import requests, pandas, matplotlib, pytest; print('All packages imported successfully')" > /dev/null 2>&1; then
    print_success "All Python packages working correctly"
else
    print_error "Some Python packages failed to import"
    exit 1
fi

# Check Node.js and npm
print_status "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION found"
else
    print_warning "Node.js not found. Please install Node.js 18+ for Wrangler CLI"
fi

# Check/Install Wrangler CLI
print_status "Checking Cloudflare Wrangler CLI..."
if command -v wrangler &> /dev/null; then
    WRANGLER_VERSION=$(wrangler --version | head -n1)
    print_success "Wrangler CLI found: $WRANGLER_VERSION"
else
    if command -v npm &> /dev/null; then
        print_status "Installing Wrangler CLI..."
        if npm install -g wrangler > /dev/null 2>&1; then
            print_success "Wrangler CLI installed"
        else
            print_warning "Failed to install Wrangler CLI. You may need to install it manually."
        fi
    else
        print_warning "npm not found. Please install Node.js and npm, then run: npm install -g wrangler"
    fi
fi

# Check Docker (optional)
print_status "Checking Docker (optional for N8N)..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker found: $DOCKER_VERSION"
else
    print_warning "Docker not found. Install Docker if you want to run N8N locally"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    print_success ".env file created from template"
    print_warning "Please edit .env file with your actual configuration values"
else
    print_warning ".env file already exists"
fi

# Create N8N data directory
if [ ! -d "n8n-data" ]; then
    print_status "Creating N8N data directory..."
    mkdir -p n8n-data
    print_success "N8N data directory created"
fi

# Final verification
print_status "Running final verification..."
source venv/bin/activate

# Test all components
VERIFICATION_PASSED=true

# Test Python
if ! python -c "import requests, pandas, matplotlib, pytest" > /dev/null 2>&1; then
    print_error "Python package verification failed"
    VERIFICATION_PASSED=false
fi

# Test Wrangler (if available)
if command -v wrangler &> /dev/null; then
    if ! wrangler --version > /dev/null 2>&1; then
        print_error "Wrangler CLI verification failed"
        VERIFICATION_PASSED=false
    fi
fi

if [ "$VERIFICATION_PASSED" = true ]; then
    print_success "All verifications passed!"
    echo ""
    echo "🎉 Development environment setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env file with your configuration"
    echo "2. Activate virtual environment: source venv/bin/activate"
    echo "3. Run tests: pytest"
    echo "4. Start N8N (optional): docker run -it --rm --name n8n -p 5678:5678 -v \$(pwd)/n8n-data:/home/node/.n8n n8nio/n8n"
    echo ""
    echo "For detailed documentation, see: docs/development/setup.md"
else
    print_error "Some verifications failed. Please check the errors above."
    exit 1
fi