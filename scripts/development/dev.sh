#!/bin/bash

# Daily Index Tracker - Development Helper Script
# Common development tasks automation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if virtual environment is activated
check_venv() {
    if [ -z "$VIRTUAL_ENV" ]; then
        print_error "Virtual environment not activated. Run: source venv/bin/activate"
        exit 1
    fi
}

# Show usage
show_usage() {
    echo "Daily Index Tracker - Development Helper"
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup     - Run initial development setup"
    echo "  test      - Run all tests"
    echo "  test-cov  - Run tests with coverage"
    echo "  lint      - Run code linting (flake8)"
    echo "  format    - Format code (black)"
    echo "  type      - Run type checking (mypy)"
    echo "  check     - Run all code quality checks"
    echo "  clean     - Clean up temporary files"
    echo "  n8n       - Start local N8N instance"
    echo "  deps      - Install/update dependencies"
    echo "  env       - Show environment information"
    echo ""
}

# Run setup
run_setup() {
    print_status "Running development setup..."
    ./scripts/development/setup.sh
}

# Run tests
run_tests() {
    check_venv
    print_status "Running tests..."
    pytest
    print_success "Tests completed"
}

# Run tests with coverage
run_tests_coverage() {
    check_venv
    print_status "Running tests with coverage..."
    pytest --cov=src --cov-report=html --cov-report=term
    print_success "Tests with coverage completed"
    print_status "Coverage report available in htmlcov/index.html"
}

# Run linting
run_lint() {
    check_venv
    print_status "Running code linting..."
    flake8 src/
    print_success "Linting completed"
}

# Format code
run_format() {
    check_venv
    print_status "Formatting code..."
    black src/
    print_success "Code formatting completed"
}

# Run type checking
run_type_check() {
    check_venv
    print_status "Running type checking..."
    mypy src/
    print_success "Type checking completed"
}

# Run all code quality checks
run_all_checks() {
    print_status "Running all code quality checks..."
    run_format
    run_lint
    run_type_check
    run_tests
    print_success "All checks completed successfully!"
}

# Clean temporary files
run_clean() {
    print_status "Cleaning temporary files..."
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    find . -type f -name "*.pyo" -delete 2>/dev/null || true
    find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
    rm -rf htmlcov/ 2>/dev/null || true
    rm -f .coverage 2>/dev/null || true
    print_success "Cleanup completed"
}

# Start N8N
start_n8n() {
    print_status "Starting local N8N instance..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker not found. Please install Docker to run N8N locally."
        exit 1
    fi
    
    # Create data directory if it doesn't exist
    mkdir -p n8n-data
    
    print_status "N8N will be available at http://localhost:5678"
    print_status "Default credentials: admin / password"
    print_status "Press Ctrl+C to stop N8N"
    
    docker run -it --rm \
        --name n8n \
        -p 5678:5678 \
        -v "$(pwd)/n8n-data:/home/node/.n8n" \
        -e N8N_BASIC_AUTH_ACTIVE=true \
        -e N8N_BASIC_AUTH_USER=admin \
        -e N8N_BASIC_AUTH_PASSWORD=password \
        n8nio/n8n
}

# Install/update dependencies
update_deps() {
    check_venv
    print_status "Updating dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    print_success "Dependencies updated"
}

# Show environment information
show_env() {
    echo "Development Environment Information"
    echo "=================================="
    echo "Python: $(python --version 2>&1)"
    echo "Pip: $(pip --version | cut -d' ' -f1-2)"
    echo "Virtual Environment: ${VIRTUAL_ENV:-Not activated}"
    
    if command -v node &> /dev/null; then
        echo "Node.js: $(node --version)"
    else
        echo "Node.js: Not installed"
    fi
    
    if command -v wrangler &> /dev/null; then
        echo "Wrangler: $(wrangler --version | head -n1)"
    else
        echo "Wrangler: Not installed"
    fi
    
    if command -v docker &> /dev/null; then
        echo "Docker: $(docker --version | cut -d' ' -f1-3)"
    else
        echo "Docker: Not installed"
    fi
    
    echo ""
    echo "Project Structure:"
    echo "- Source code: src/"
    echo "- Tests: src/*/test_*.py"
    echo "- Documentation: docs/"
    echo "- N8N workflows: n8n/"
    echo "- Scripts: scripts/"
}

# Main script logic
case "${1:-}" in
    setup)
        run_setup
        ;;
    test)
        run_tests
        ;;
    test-cov)
        run_tests_coverage
        ;;
    lint)
        run_lint
        ;;
    format)
        run_format
        ;;
    type)
        run_type_check
        ;;
    check)
        run_all_checks
        ;;
    clean)
        run_clean
        ;;
    n8n)
        start_n8n
        ;;
    deps)
        update_deps
        ;;
    env)
        show_env
        ;;
    *)
        show_usage
        exit 1
        ;;
esac