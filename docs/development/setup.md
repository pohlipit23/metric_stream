# Development Environment Setup

This guide will help you set up the local development environment for the Daily Index Tracker project.

## Prerequisites

Before starting, ensure you have the following installed on your system:

- **Git** - for version control
- **Python 3.11+** - the project requires Python 3.11 or higher
- **Node.js 18+** - for Cloudflare Wrangler CLI and frontend development
- **Docker** - for running N8N locally (optional but recommended)

## System Requirements

### Operating System Support
- Linux (Ubuntu 20.04+, Debian 11+, or equivalent)
- macOS 12+ (Monterey or later)
- Windows 10/11 with WSL2

### Hardware Requirements
- **RAM**: Minimum 8GB, recommended 16GB
- **Storage**: At least 5GB free space
- **CPU**: Multi-core processor recommended for development

## Installation Steps

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd metric_stream

# Run the automated setup script
./scripts/development/setup.sh
```

The setup script will automatically:
- Check system requirements
- Create Python virtual environment
- Install all dependencies
- Verify installation
- Create configuration files

### Option 2: Manual Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd metric_stream
```

### 2. Install System Dependencies

#### On Ubuntu/Debian:
```bash
# Update package list
sudo apt update

# Install Python 3.11+, pip, and development tools
sudo apt install -y python3.11 python3-pip python3-venv python3-dev build-essential

# Install Node.js (for Wrangler CLI)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker (optional, for N8N)
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
```

#### On macOS:
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python 3.11+
brew install python@3.11

# Install Node.js
brew install node@18

# Install Docker (optional)
brew install --cask docker
```

### 3. Install Cloudflare Wrangler CLI

```bash
# Install Wrangler globally
npm install -g wrangler

# Verify installation
wrangler --version
```

### 4. Set Up Python Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Linux/macOS
# OR
venv\Scripts\activate     # On Windows

# Upgrade pip
pip install --upgrade pip

# Install project dependencies
pip install -r requirements.txt
```

### 5. Verify Installation

```bash
# Activate virtual environment if not already active
source venv/bin/activate

# Test Python packages
python -c "import requests, pandas, matplotlib, pytest; print('✅ All key packages imported successfully')"

# Test Wrangler CLI
wrangler --version

# Test Python version
python --version
```

## Development Tools Configuration

### Using the Development Helper Script

The project includes a development helper script that automates common tasks:

```bash
# Show all available commands
./scripts/development/dev.sh

# Run all code quality checks
./scripts/development/dev.sh check

# Run tests
./scripts/development/dev.sh test

# Run tests with coverage
./scripts/development/dev.sh test-cov

# Format code
./scripts/development/dev.sh format

# Run linting
./scripts/development/dev.sh lint

# Type checking
./scripts/development/dev.sh type

# Start local N8N instance
./scripts/development/dev.sh n8n

# Clean temporary files
./scripts/development/dev.sh clean

# Show environment info
./scripts/development/dev.sh env
```

### Manual Code Quality Tools

If you prefer to run tools manually:

```bash
# Activate virtual environment
source venv/bin/activate

# Format code with Black
black src/

# Lint code with Flake8
flake8 src/

# Type checking with MyPy
mypy src/

# Run all tests
pytest

# Run tests with coverage
pytest --cov=src

# Run specific test file
pytest src/schemas/test_schemas.py
```

## Optional: N8N Local Development

For testing N8N workflows locally:

### Using Docker

```bash
# Create N8N data directory
mkdir n8n-data

# Run N8N container
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v $(pwd)/n8n-data:/home/node/.n8n \
  n8nio/n8n

# Access N8N at http://localhost:5678
```

### Using Docker Compose

Create a `docker-compose.dev.yml` file:

```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    volumes:
      - ./n8n-data:/home/node/.n8n
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
```

Then run:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

## Environment Variables

Create a `.env` file in the project root for local development:

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your local settings
nano .env
```

Example `.env` content:

```env
# Development environment
NODE_ENV=development

# N8N Configuration
N8N_HOST=localhost:5678
N8N_API_KEY=your_n8n_api_key_here

# Cloudflare Configuration (for testing)
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id

# Database (if using local database for testing)
DATABASE_URL=sqlite:///./test.db
```

## IDE Configuration

### VS Code

Recommended extensions:
- Python
- Pylance
- Black Formatter
- Flake8
- GitLens
- Docker

Create `.vscode/settings.json`:

```json
{
    "python.defaultInterpreterPath": "./venv/bin/python",
    "python.formatting.provider": "black",
    "python.linting.enabled": true,
    "python.linting.flake8Enabled": true,
    "python.linting.mypyEnabled": true,
    "files.exclude": {
        "**/__pycache__": true,
        "**/*.pyc": true,
        ".pytest_cache": true,
        ".coverage": true,
        "htmlcov": true
    }
}
```

### PyCharm

1. Open the project directory
2. Configure Python interpreter: Settings → Project → Python Interpreter → Add → Existing Environment → `./venv/bin/python`
3. Enable code formatting: Settings → Tools → External Tools → Add Black
4. Configure Flake8: Settings → Tools → External Tools → Add Flake8

## Troubleshooting

### Common Issues

#### Python Version Issues
```bash
# Check Python version
python --version

# If using wrong version, ensure you're using python3.11
python3.11 --version

# Update virtual environment if needed
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Permission Issues on Linux
```bash
# If you get permission errors with Docker
sudo usermod -aG docker $USER
# Then log out and log back in

# If you get permission errors with pip
pip install --user -r requirements.txt
```

#### Wrangler Authentication Issues
```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

#### Package Installation Issues
```bash
# Clear pip cache
pip cache purge

# Reinstall packages
pip install --no-cache-dir -r requirements.txt

# If specific packages fail, install build dependencies
sudo apt install -y python3-dev build-essential  # Ubuntu/Debian
brew install python@3.11  # macOS
```

### Getting Help

1. **Check the logs**: Most tools provide detailed error messages
2. **Virtual environment**: Ensure you're always working within the activated virtual environment
3. **Dependencies**: Make sure all system dependencies are installed
4. **Documentation**: Refer to the official documentation for specific tools
5. **Issues**: Create an issue in the project repository if you encounter persistent problems

## Next Steps

After completing the setup:

1. **Read the project documentation**: Start with `README.md` and `docs/`
2. **Explore the codebase**: Familiarize yourself with the project structure
3. **Run the tests**: Ensure everything is working correctly
4. **Set up N8N workflows**: If working on workflow development
5. **Configure Cloudflare**: If working on serverless components

## Development Workflow

### Daily Development

```bash
# Start your development session
cd metric_stream
source venv/bin/activate

# Pull latest changes
git pull origin main

# Install any new dependencies
pip install -r requirements.txt

# Run tests to ensure everything works
pytest

# Start coding!
```

### Before Committing

```bash
# Format code
black src/

# Lint code
flake8 src/

# Type check
mypy src/

# Run tests
pytest

# Commit your changes
git add .
git commit -m "Your commit message"
git push
```

This setup guide should get you up and running with the Daily Index Tracker development environment. If you encounter any issues, please refer to the troubleshooting section or create an issue in the project repository.