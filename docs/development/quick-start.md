# Quick Start Guide

This is a condensed version of the development setup for experienced developers.

## Prerequisites
- Python 3.11+
- Node.js 18+
- Git

## Quick Setup

```bash
# Clone and enter project
git clone <repository-url>
cd metric_stream

# Install Wrangler CLI
npm install -g wrangler

# Set up Python environment
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Verify installation
python -c "import requests, pandas, matplotlib, pytest; print('✅ Setup complete')"
wrangler --version
```

## Development Commands

```bash
# Activate environment (always do this first)
source venv/bin/activate

# Code formatting and linting
black src/
flake8 src/
mypy src/

# Testing
pytest
pytest --cov=src

# N8N local development (optional)
docker run -it --rm --name n8n -p 5678:5678 -v $(pwd)/n8n-data:/home/node/.n8n n8nio/n8n
```

## Project Structure

```
metric_stream/
├── src/                    # Source code
│   ├── schemas/           # Data schemas and validation
│   └── validation/        # Validation logic
├── docs/                  # Documentation
├── n8n/                   # N8N workflows and templates
├── scripts/               # Utility scripts
├── venv/                  # Python virtual environment
├── requirements.txt       # Python dependencies
└── README.md             # Project overview
```

## Key Files

- `requirements.txt` - Python dependencies
- `src/schemas/core.py` - Core data structures
- `docs/development/setup.md` - Detailed setup guide
- `.kiro/specs/metric_stream/` - Project specifications

For detailed setup instructions, see [docs/development/setup.md](setup.md).