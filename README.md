# Daily Index Tracker

A hybrid crypto market monitoring system that combines the Cloudflare Developer Platform for serverless components with a hosted N8N instance for workflow automation. The system follows a queue-based, event-driven architecture that ensures scalability, reliability, and modularity.

## Architecture Overview

The system implements a decoupled architecture where:
- **Serverless components** (Admin Console, Scheduler Workers, Queues, KV storage) run on Cloudflare
- **Workflow processing** occurs on a hosted N8N instance (either N8N Cloud or self-hosted on a VPS)
- **Individual KPI workflows** handle data collection and chart generation
- **Aggregate workflows** manage LLM analysis, packaging, and delivery

## Key Features

- **Automated KPI Tracking**: Collect and monitor multiple crypto market indicators
- **AI-Powered Analysis**: Generate insights using LLM services (OpenRouter, Gemini, Claude)
- **Multi-Channel Delivery**: Send reports via Email, Telegram, Discord, Slack, SMS
- **Comprehensive Reporting**: Generate PDF documents with charts and analysis
- **Scalable Architecture**: Handle 200+ concurrent KPIs and 5,000+ delivery endpoints
- **Admin Console**: Web-based interface for system management and monitoring

## Project Structure

```
metric_stream/
├── src/                    # Source code for Cloudflare Workers and core logic
│   ├── schemas/           # Data schemas and validation
│   └── validation/        # Data validation and compatibility
├── n8n/                   # N8N workflow configurations
│   ├── workflows/         # Individual workflow JSON exports
│   ├── templates/         # Workflow templates and examples
│   └── docs/             # N8N-specific documentation
├── scripts/               # Utility scripts
│   ├── deployment/        # Deployment automation
│   ├── development/       # Development environment setup
│   ├── data/             # Data management utilities
│   └── monitoring/        # Health checks and monitoring
├── docs/                  # Comprehensive documentation
│   ├── architecture/      # System design and architecture
│   ├── api/              # API specifications
│   ├── deployment/        # Deployment guides
│   ├── development/       # Development setup
│   ├── user/             # User guides
│   └── integration/       # Integration documentation
└── .kiro/                 # Kiro AI assistant specifications
    └── specs/metric_stream/  # Feature specifications and tasks
```

## Technology Stack

### Cloudflare Platform
- **Workers**: Serverless compute for API endpoints and orchestration
- **KV Store**: Time series data and job status tracking
- **Queues**: Event-driven workflow orchestration
- **Pages**: Admin Console frontend hosting
- **R2**: Document storage and data archiving

### N8N Workflows
- **Individual KPI Workflows**: Data collection and chart generation
- **Aggregate Workflows**: LLM analysis, packaging, and delivery
- **Integration Nodes**: External service connections

### Development Tools
- **Python 3.11+**: Core application logic
- **React/Vue.js**: Admin Console frontend
- **Docker**: Local development environment
- **Wrangler CLI**: Cloudflare deployment and management

## Quick Start

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher
- Cloudflare account with Workers/KV/Queues enabled
- N8N instance (Cloud or self-hosted)
- Docker (for local development)

### Development Setup

For detailed development environment setup, see **[Development Setup Guide](docs/development/setup.md)**.

**Quick Start for Developers:**
```bash
# Clone and setup
git clone <repository-url>
cd metric_stream

# Install Wrangler CLI
npm install -g wrangler

# Setup Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Verify installation
python -c "import requests, pandas, matplotlib, pytest; print('✅ Setup complete')"
```

**Additional Resources:**
- [Quick Start Guide](docs/development/quick-start.md) - Condensed setup for experienced developers
- [Full Setup Guide](docs/development/setup.md) - Comprehensive installation and configuration
- [Troubleshooting](docs/development/setup.md#troubleshooting) - Common issues and solutions

### Deployment
1. Configure production environment variables
2. Deploy Cloudflare Workers: `wrangler deploy`
3. Set up N8N workflows
4. Configure monitoring and alerting

## Documentation

- **[Architecture Overview](docs/architecture/)** - System design and component relationships
- **[API Documentation](docs/api/)** - Endpoint specifications and integration guides
- **[Deployment Guide](docs/deployment/)** - Production deployment procedures
- **[Development Setup](docs/development/)** - Local development environment
- **[User Guide](docs/user/)** - Admin Console and system management
- **[Integration Guide](docs/integration/)** - N8N and external service setup

## Development Phases

The project follows a structured implementation approach:

1. **Phase 1**: N8N Prototyping & Data Contract Definition
2. **Phase 2**: Foundation & Environment Setup
3. **Phase 3**: Core Data Pipeline (MVP)
4. **Phase 4**: Admin Console & Configuration
5. **Phase 5**: Orchestration & Aggregate Workflows
6. **Phase 6**: Feature Expansion
7. **Phase 7**: Hardening, Testing & Security
8. **Phase 8**: Deployment & Documentation

## Contributing

1. Review the [Development Guide](docs/development/)
2. Follow the established project structure
3. Ensure all tests pass before submitting changes
4. Update documentation for new features
5. Follow security best practices

## Security

- All communications over HTTPS
- Cloudflare Access authentication for Admin Console
- Secure credential management via Cloudflare Secrets and N8N
- Rate limiting and DDoS protection
- Regular security audits and updates

## Monitoring

- Health check endpoints for all components
- Comprehensive monitoring dashboard
- Automated alerting for system failures
- Performance metrics and capacity monitoring
- Log aggregation and analysis

## License

[License information to be added]

## Support

For questions, issues, or contributions:
- Review the documentation in the `docs/` directory
- Check existing issues and discussions
- Follow the contribution guidelines

---

**Status**: In Development  
**Version**: 0.1.0  
**Last Updated**: August 2025