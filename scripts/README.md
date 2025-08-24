# Scripts

This directory contains utility scripts for the Daily Index Tracker system.

## Structure

- `deployment/` - Deployment and infrastructure scripts
- `development/` - Development environment setup scripts
- `data/` - Data import, export, and migration scripts
- `monitoring/` - Health check and monitoring scripts

## Script Categories

### Deployment Scripts
- Cloudflare Worker deployment automation
- Wrangler configuration management
- Environment setup and teardown

### Development Scripts
- Local development environment setup
- Docker Compose configurations
- Testing utilities

### Data Management Scripts
- Historical data import utilities
- KV store backup and restore
- Data validation and cleanup

### Monitoring Scripts
- Health check endpoints
- Performance monitoring
- Log analysis utilities

## Usage

Each script includes usage instructions and examples. Run scripts from the project root directory unless otherwise specified.

## Requirements

- Python 3.11+
- Cloudflare Wrangler CLI
- Docker (for local development)
- Required Python packages (see individual script requirements)