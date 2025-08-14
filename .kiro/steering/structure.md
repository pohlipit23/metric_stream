# Project Structure

## Repository Organization

```
├── .kiro/
│   ├── specs/metric_stream/     # Project specifications
│   └── steering/                # AI assistant guidance rules
├── src/
│   ├── workers/                 # Cloudflare Workers
│   │   ├── scheduler/           # Job scheduling and KPI triggering
│   │   ├── ingestion/           # Data ingestion from N8N workflows
│   │   ├── orchestration/       # Fan-in logic and queue management
│   │   ├── admin-console/       # Admin API backend
│   │   └── chart-generation/    # Chart generation service
│   ├── frontend/                # Admin Console React/Vue app
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Admin Console pages
│   │   └── utils/               # Frontend utilities
│   └── shared/                  # Shared types and utilities
│       ├── types/               # TypeScript interfaces
│       └── utils/               # Common functions
├── n8n/
│   ├── workflows/               # N8N workflow definitions
│   │   ├── kpi-individual/      # Individual KPI workflows
│   │   └── aggregate/           # LLM, packaging, delivery workflows
│   └── docker-compose.yml       # Local N8N development setup
├── scripts/
│   ├── deploy/                  # Deployment scripts
│   └── setup/                   # Environment setup scripts
└── docs/                        # Additional documentation
```

## Key Directories

### `/src/workers/`
Each Cloudflare Worker has its own directory with:
- `index.ts` - Main worker logic
- `types.ts` - Worker-specific types
- `wrangler.toml` - Worker configuration

### `/src/shared/`
Common code shared across workers:
- **Data Contracts**: `KPIDataUpdate`, `KPIErrorUpdate` interfaces
- **KV Key Patterns**: Standardized key naming conventions
- **Validation Logic**: Shared validation functions

### `/n8n/workflows/`
N8N workflow definitions organized by type:
- **Individual KPI Workflows**: One per KPI type (price, ratio, index)
- **Aggregate Workflows**: LLM analysis, packaging, delivery

## Data Storage Patterns

### Cloudflare KV Key Conventions
```typescript
// Time series data
`timeseries:{kpiId}`

// Job tracking
`job:{traceId}`

// Individual KPI packages
`package:{traceId}:{kpiId}`

// Consolidated packages
`consolidated:{traceId}`

// System configuration
`config:system`

// Import tracking
`import-status:{kpiId}:{importId}`
`import-errors:{kpiId}:{timestamp}`
```

### Queue Message Patterns
- **LLM_ANALYSIS_QUEUE**: `{ traceId: string }`
- **PACKAGING_QUEUE**: `{ traceId: string }`
- **DELIVERY_QUEUE**: `{ traceId: string }`

## Component Boundaries

### Cloudflare Responsibilities
- **Scheduler Worker**: Job creation and KPI triggering
- **Ingestion Worker**: Data validation and KV updates
- **Orchestration Worker**: Fan-in logic and queue management
- **Admin Console**: Configuration and monitoring UI

### N8N Responsibilities
- **Data Collection**: External API calls and scraping
- **Chart Generation**: Visual data representation
- **LLM Analysis**: AI-powered insights generation
- **Delivery**: Multi-channel notification sending

## Development Phases
Project follows sequential implementation phases:
1. **N8N Prototyping** - Define data contracts
2. **Foundation Setup** - Environment and infrastructure
3. **Core Pipeline** - Basic data flow (MVP)
4. **Admin Console** - Management interface
5. **Orchestration** - Advanced workflow management
6. **Feature Expansion** - Charts, imports, monitoring
7. **Hardening** - Security, testing, error handling
8. **Deployment** - Production readiness