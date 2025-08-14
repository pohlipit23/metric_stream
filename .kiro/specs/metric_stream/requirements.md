---
title: "Requirements Document"
type: "spec"
---

# Requirements Document

## Introduction

The Daily Index Tracker is a hybrid crypto market monitoring system that combines the Cloudflare Developer Platform for serverless components with a hosted N8N instance for workflow automation. The system follows a queue-based, event-driven architecture that ensures scalability, reliability, and modularity.

The design implements a decoupled architecture where serverless components (Admin Console, Scheduler Workers, Queues, KV storage) run on Cloudflare, while workflow processing occurs on a hosted N8N instance (either N8N Cloud or self-hosted on a VPS). Each KPI has its own dedicated N8N workflow that handles both data collection and chart generation, while aggregate processes (LLM analysis, packaging, and delivery) operate as shared N8N workflows orchestrated through Cloudflare Queues.

## Core System Requirements

### Requirement 1: Orchestrated Job Management & Data Flow

**User Story:** As a system architect, I want a fully orchestrated, event-driven workflow that ensures reliable, sequential processing from data collection to final delivery.

#### Acceptance Criteria

1.  **Initiation (Fan-out)**: WHEN a Cloudflare Cron Trigger activates, THEN the system SHALL invoke the **Scheduler Worker**.
2.  **Job Creation**: WHEN the Scheduler Worker is invoked, THEN it SHALL create a job record in Cloudflare KV with a unique `traceId` and the list of `kpiIds` for the run. The key for this record SHALL be `job:{traceId}`.
3.  **Individual KPI Triggering**: WHEN a job is created, THEN the Scheduler Worker SHALL trigger each active KPI's individual N8N workflow via a **unique, direct webhook URL**, passing the `traceId` and `kpiId`.
4.  **Data Ingestion**: WHEN an individual N8N workflow completes data collection and chart generation, THEN it SHALL send a `POST` request to the **Ingestion Worker's `/api/kpi-data` endpoint** with a payload conforming to the `KPIDataUpdate` interface.
5.  **Data Persistence**: WHEN the Ingestion Worker receives data, THEN it SHALL append the new data to the KPI's time series record (key: `timeseries:{kpiId}`), create the initial KPI Package (key: `package:{traceId}:{kpiId}`), and update the central job status in KV.
6.  **Aggregation (Fan-in)**: WHEN a job is in progress, THEN a scheduled **Orchestration Worker** SHALL periodically monitor the job status in KV.
7.  **Aggregate Workflow Triggering**: IF the Orchestration Worker detects that all KPIs are complete OR a configurable timeout is reached, THEN it SHALL send a single message containing the `traceId` to the `LLM_ANALYSIS_QUEUE`.
8.  **Sequential Aggregate Processing**: WHEN aggregate processing begins, THEN the system SHALL follow a strict, queue-based sequence:
    -   `LLM_ANALYSIS_QUEUE` -> LLM Analysis Workflow
    -   `PACKAGING_QUEUE` -> Packaging Workflow
    -   `DELIVERY_QUEUE` -> Delivery Workflow
9.  **Final Delivery**: WHEN the Delivery workflow executes, THEN it SHALL retrieve the final, consolidated packages from KV and send them to all configured notification channels.

### Requirement 2: KPI Registry Management

**User Story:** As a system administrator, I want to manage KPI registry entries and link them to N8N workflows, so that I can control which KPIs are tracked and how they are processed.

#### Acceptance Criteria

1.  **KPI Registry Management**: WHEN managing KPIs, THEN the Admin Console SHALL provide simple CRUD operations for KPI registry (name, description, webhook URL, analysis parameters).
2.  **N8N Workflow Linking**: WHEN creating a KPI entry, THEN the Admin Console SHALL allow linking each KPI registry entry to its corresponding N8N workflow webhook URL.
3.  **Workflow Control**: WHEN managing workflows, THEN the Admin Console SHALL allow Start/Stop/Pause of individual N8N workflows by making authenticated requests to the N8N REST API.
4.  **Schedule Management**: WHEN configuring schedules, THEN the Admin Console SHALL allow configuration of cron expressions and management of Cloudflare Cron Triggers.
5.  **Analysis Configuration**: WHEN setting up analysis, THEN the system SHALL allow configuration of LLM analysis chains with JSON prompt structures.
6.  **N8N Workflow Configuration**: WHEN configuring data sources and chart settings, THEN these SHALL be configured entirely within the individual N8N workflows, not in the Admin Console.
7.  **Validation**: WHEN saving a KPI registry entry, THEN the system SHALL perform validation and prevent saving if invalid, displaying clear errors.

### Requirement 3: AI-Generated Analysis

**User Story:** As a crypto market analyst, I want to receive AI-generated insights that analyze KPI relationships and trends, so that I can understand market context without manual analysis.

#### Acceptance Criteria

1.  **Triggering**: WHEN the Orchestration Worker determines a job is ready for aggregation, THEN it SHALL trigger the LLM analysis workflow by placing a message with the `traceId` on the `LLM_ANALYSIS_QUEUE`.
2.  **Analysis Structure**: WHEN the LLM workflow runs, THEN it SHALL perform both a **Consolidated Analysis** across all available KPIs and **Individual Deep Dives** for each KPI using internal N8N fan-out.
3.  **Analysis Steps**: WHEN performing analysis, THEN the system SHALL execute a sequential chain of distinct steps: **image analysis** (of charts), **numerical analysis**, **technical analysis**, and a final **synthesis** step.
4.  **LLM Service Integration**: WHEN performing analysis, THEN the system SHALL integrate with LLM services including OpenRouter, Gemini, and Claude.
5.  **Output**: WHEN LLM analysis completes, THEN the workflow SHALL send analysis updates for each individual KPI and the overall consolidated package back to Cloudflare Ingestion Worker, then send a message to the `PACKAGING_QUEUE`.
6.  **Failure Handling**: IF LLM analysis fails after configurable retries, THEN the system SHALL log the failure and the KPI packages SHALL be delivered without the `analysis` section.

### Requirement 4: Document Generation and Multi-Channel Delivery

**User Story:** As a crypto market analyst, I want to receive consolidated, well-formatted reports with comprehensive documents on my preferred channels, so I can consume market updates efficiently.

#### Acceptance Criteria

1.  **Document Generation**: WHEN the Packaging workflow is triggered by a message from the `PACKAGING_QUEUE`, THEN it SHALL create a comprehensive document (PDF or Google Doc) containing all KPI data, charts, and analysis.
2.  **Document Storage**: WHEN a document is generated, THEN it SHALL be stored in Cloudflare R2 or KV store with a unique URL for access.
3.  **Channel-Specific Formatting**: WHEN creating packages, THEN the workflow SHALL generate properly formatted messages for each configured channel (Email, Telegram, Discord, Slack, SMS) with document links.
4.  **Message Structure**: WHEN formatting messages, THEN each delivery channel SHALL receive a brief summary with key highlights and a link to the comprehensive document.
5.  **Delivery Workflow**: WHEN the Delivery workflow is triggered by a message from the `DELIVERY_QUEUE`, THEN it SHALL use dedicated N8N nodes (Gmail, Slack, Telegram, Discord, SMS, Webhook) to send the packages.
6.  **Credential Management**: WHEN sending notifications, THEN N8N SHALL use its own internal credential management system to handle API keys and tokens for delivery services.
7.  **Retry Logic**: WHEN delivery fails, THEN the system SHALL implement retry logic with exponential backoff for each delivery channel.

## Non-Functional Requirements

### Requirement 5: Architecture & Scalability

**User Story:** As a system architect, I want a modular, scalable, and resilient architecture, so that components can operate independently and handle enterprise-level load.

#### Acceptance Criteria

1.  **Hybrid Architecture**: WHEN the system operates, THEN it SHALL use direct N8N workflow triggering for individual KPIs and Cloudflare Queues for aggregate processing workflows.
2.  **Orchestration Layer**: WHEN managing workflows, THEN the system SHALL include an Orchestration Worker that monitors job status in KV and triggers aggregate workflows when ready.
3.  **Fan-out/Fan-in Pattern**: WHEN processing jobs, THEN the system SHALL implement a fan-out/fan-in pattern where individual KPI failures do not block aggregate processing for successfully collected KPIs.
4.  **Component Independence**: WHEN the system operates, THEN the hosted N8N instance and Cloudflare serverless components SHALL function and scale independently.
5.  **Chart Generation Options**: WHEN generating charts, THEN the system SHALL support multiple options including external services (chart-img.com), N8N Python nodes, Cloudflare Workers, or application-level generation.
6.  **Idempotency**: WHEN processing data, THEN the Ingestion Worker and all queue-triggered workflows SHALL be idempotent to prevent data duplication.

### Requirement 6: Security

**User Story:** As a security officer, I want enterprise-grade security, so that all data and credentials are protected according to industry best practices.

#### Acceptance Criteria

1.  **Authentication**: WHEN accessing the Admin Console, THEN users SHALL authenticate via **Cloudflare Access**, with SSO integration.
2.  **Secrets Management**:
    -   Core system credentials (e.g., N8N API keys for the Admin Console Worker) SHALL be stored securely in **Cloudflare Secrets**.
    -   Credentials for third-party notification services (e.g., Gmail, Telegram API keys) SHALL be managed and stored within the **N8N instance's secure credential system**.
3.  **Network Security**: WHEN services communicate, THEN all communication SHALL be over HTTPS. The N8N instance SHALL be protected by firewall rules, and the Admin Console's public endpoints SHALL be protected by Cloudflare Rate Limiting.
4.  **Authorization**: WHEN components interact, THEN they SHALL operate under the principle of least privilege (e.g., the Admin Console Worker uses an N8N API key to manage workflows).

### Requirement 7: Data Management & Retention

**User Story:** As a system administrator, I want clear data management policies and the ability to backfill historical data, so that the system is maintainable and accurate from day one.

#### Acceptance Criteria

1.  **Historical Data Import**: WHEN deploying the system for the first time, THEN the Admin Console SHALL provide an interface to upload a **CSV file** (`timestamp`, `value`, `metadata`) to manually backfill historical time series data for each KPI.
2.  **Data Validation**: WHEN importing historical data, THEN the system SHALL validate ISO 8601 timestamp format, numerical values, chronological order, and detect duplicate timestamps.
3.  **Error Logging**: WHEN validation errors occur during import, THEN they SHALL be written to a dedicated log (`import-errors:{kpiId}:{timestamp}`) for manual investigation.
4.  **Import Status Tracking**: WHEN importing data, THEN the system SHALL create import status records with success/failure counts and error references.
5.  **Time Series Storage**: WHEN new data is ingested, THEN it SHALL be appended to the flexible time series record in KV with structure determined by KPI type.
6.  **Data Retention Policy**: WHEN time series data becomes older than **365 days**, THEN it SHALL be automatically exported to Cloudflare R2 and pruned from the active KV store.
7.  **KV Key Management**: WHEN managing storage, THEN the system SHALL implement TTL (Time To Live) for temporary keys and automatic cleanup via dedicated Cloudflare Worker.
8.  **KV Key Naming**: WHEN storing data in KV, THEN the system SHALL adhere to the following key naming conventions:
    -   Time Series: `timeseries:{kpiId}`
    -   Job Status: `job:{traceId}`
    -   Individual KPI Package: `package:{traceId}:{kpiId}`
    -   Consolidated Package: `consolidated:{traceId}`
    -   Comprehensive Document: `document:{traceId}`
    -   Delivery Status: `delivery:{traceId}`
    -   System Config: `config:system`
    -   Import Errors: `import-errors:{kpiId}:{timestamp}`
    -   Import Status: `import-status:{kpiId}:{importId}`

### Requirement 8: Error Handling & Monitoring

**User Story:** As a system operator, I want robust error handling and comprehensive monitoring, so that I can ensure system reliability and troubleshoot issues effectively.

#### Acceptance Criteria

1.  **Configurable Retry Strategy**: WHEN failures occur, THEN components SHALL implement configurable retry counts and backoff intervals with default values:
    - Chart Generation: 3 retries with 1s, 2s, 4s backoff
    - LLM Analysis: 2 retries with 2s, 4s backoff  
    - Data Collection: 3 retries with 1s, 2s, 4s backoff
    - Delivery: 2 retries with 5s, 10s backoff
2.  **Fallback Configuration**: WHEN components fail after all retries, THEN the system SHALL use configurable fallback mechanisms:
    - Chart Generation: fallback image URL or fallback text summary
    - LLM Analysis: deliver KPI package without analysis section
    - Data Collection: log error and skip KPI for current cycle
    - Delivery: log error and attempt delivery on next scheduled run
3.  **N8N Error Handling**: WHEN N8N workflows fail, THEN they SHALL perform configurable retry attempts with exponential backoff and send direct alerts to system administrator on final failure.
4.  **Partial Data Handling**: WHEN some KPIs in a job fail collection, THEN the system SHALL:
    - Wait for configurable timeout period before proceeding
    - Process successfully collected KPIs with disclaimer about partial data
    - Mark job status as "partial" instead of "complete"
    - Include information about failed KPIs in delivery notifications
5.  **Job Lifecycle Management**: WHEN managing jobs, THEN the Admin Console SHALL allow configuration of job-level settings including timeout thresholds and rules for partial data delivery.
6.  **Monitoring Dashboard**: WHEN monitoring the system, THEN the Admin Console SHALL display key metrics including **queue depth, job completion times, KPI failure rates, Worker execution times, LLM API latency, and KV storage usage**.
7.  **Orchestration Monitoring**: WHEN the Orchestration Worker runs, THEN it SHALL run periodically with configurable polling frequency to monitor job status in KV.
8.  **Idempotency**: WHEN processing duplicate messages, THEN all queue-triggered workflows and the Ingestion Worker SHALL handle duplicate processing gracefully to prevent data corruption.

### Requirement 9: Admin Console UI/UX

**User Story:** As a system administrator, I want a modern and intuitive admin interface, so that I can efficiently manage the system with a pleasant user experience.

#### Acceptance Criteria

1.  **Technology Stack**: WHEN building the Admin Console, THEN it SHALL be implemented using Cloudflare Pages with React/Vue.js frontend.
2.  **Authentication**: WHEN accessing the Admin Console, THEN users SHALL authenticate via Cloudflare Access.
3.  **Aesthetic**: WHEN accessing the Admin Console, THEN it SHALL display a **light theme with a modern, minimalistic design**.
4.  **Responsiveness**: WHEN viewing the interface, THEN it SHALL be **fully responsive** and adapt seamlessly to desktop, tablet, and mobile screen sizes.
5.  **Usability**: WHEN navigating, THEN the UI SHALL use clean typography, consistent spacing, intuitive iconography, and accessible color contrast to ensure optimal usability and readability.
6.  **API Endpoints**: WHEN the frontend interacts with the backend, THEN it SHALL use the defined Admin Console Worker API endpoints for KPI management, workflow control, schedule management, and configuration management.

### Requirement 10: Ingestion and Chart Generation Workers

**User Story:** As a system architect, I want dedicated workers for data ingestion and chart generation, so that the system can efficiently process KPI data and generate visualizations.

#### Acceptance Criteria

1.  **Ingestion Worker**: WHEN KPI data is received from N8N workflows, THEN the Ingestion Worker SHALL validate data structure, manage time series updates, create KPI packages, and track job status.
2.  **Chart Generation Worker**: WHEN charts need to be generated, THEN the Chart Generation Worker SHALL support multiple chart types (line charts, candlestick charts, bar charts), efficient processing for large datasets, and storage in Cloudflare R2 or external storage.
3.  **Data Validation**: WHEN receiving data, THEN the Ingestion Worker SHALL validate request structure and authentication using shared secret or API key.
4.  **Idempotency**: WHEN processing data, THEN the Ingestion Worker SHALL prevent duplicate data points for the same timestamp and KPI.
5.  **Chart Generation Options**: WHEN generating charts, THEN the system SHALL support Python libraries (matplotlib, plotly, seaborn), JavaScript libraries (Chart.js, D3.js), external services (chart-img.com), or hybrid approaches based on data size and complexity.
6.  **Chart Storage and Formats**: WHEN storing charts, THEN the Chart Generation Worker SHALL support PNG, SVG, or interactive HTML formats and store generated charts in Cloudflare R2 or external storage.
7.  **API Endpoints**: WHEN interacting with workers, THEN they SHALL provide endpoints for:
    - Ingestion Worker: `/api/kpi-data`, `/api/kpi-error`, `/api/health`
    - Chart Generation Worker: `/api/charts/generate`, `/api/charts/:chartId`, `/api/charts/batch`, `/api/charts/health`

### Requirement 11: N8N Integration and Workflow Management

**User Story:** As a system integrator, I want seamless integration between N8N workflows and Cloudflare components, so that data flows efficiently through the system.

#### Acceptance Criteria

1.  **N8N Instance Options**: WHEN deploying N8N, THEN the system SHALL support both N8N Cloud and self-hosted VPS instances.
2.  **Individual KPI Workflows**: WHEN processing individual KPIs, THEN each KPI SHALL have its own dedicated N8N workflow triggered via unique webhook URLs.
3.  **Aggregate Workflows**: WHEN processing aggregate data, THEN N8N SHALL provide shared workflows for LLM Analysis, Packaging, and Delivery triggered by Cloudflare Queues.
4.  **Data Flow**: WHEN N8N workflows complete, THEN they SHALL send formatted data to Cloudflare Ingestion Worker endpoints and handle error reporting.
5.  **Queue Integration**: WHEN processing aggregate workflows, THEN N8N SHALL poll Cloudflare Queues for new messages and access KV Store using API key authentication.
6.  **Credential Management**: WHEN handling external services, THEN N8N SHALL manage notification service credentials internally using its secure credential system.

### Requirement 12: Testing and Development Strategy

**User Story:** As a developer, I want comprehensive testing capabilities and a local development environment, so that I can develop and test the system reliably before deployment.

#### Acceptance Criteria

1.  **Development Environment**: WHEN developing locally, THEN the system SHALL provide:
    - N8N Docker container running on `localhost:5678`
    - Miniflare for local Cloudflare Workers testing
    - Local KV store and queue simulation
2.  **Unit Testing**: WHEN testing individual components, THEN the system SHALL use:
    - Jest/Vitest for React components and API endpoints
    - N8N's built-in testing capabilities for individual nodes
    - Miniflare for Cloudflare Workers testing
3.  **Integration Testing**: WHEN testing component interactions, THEN the system SHALL test:
    - Queue message flow between local N8N and Miniflare components
    - Webhook communication between Miniflare workers and local N8N instance
    - KV store operations using Miniflare KV simulation
    - External service integration using mock APIs
4.  **Load Testing**: WHEN testing system capacity, THEN the system SHALL test:
    - Concurrent processing of 200 KPIs simultaneously
    - Queue throughput under high message volume
    - Delivery scalability to 5,000 endpoints
5.  **Testing Tools**: WHEN implementing tests, THEN the system SHALL use:
    - Jest, Vitest, Miniflare for unit tests
    - Playwright for Admin Console testing
    - Artillery.io for load testing
    - Custom N8N test workflows for integration testing
6.  **Development Phases**: WHEN developing the system, THEN it SHALL follow:
    - Phase 1: Individual component testing
    - Phase 2: Local integration testing
    - Phase 3: Staging environment testing
    - Phase 4: Production deployment and monitoring

### Requirement 13: Infrastructure and Resource Management

**User Story:** As a system administrator, I want clear infrastructure requirements and resource limits, so that I can properly provision and manage the system.

#### Acceptance Criteria

1.  **Cloudflare Resource Limits**: WHEN deploying on Cloudflare, THEN the system SHALL operate within:
    - KV Store: 1GB per namespace
    - Queues: 10,000 messages per queue
    - Workers: 128MB memory, 30-second execution time per invocation
    - Cron Triggers: Up to 1,000 scheduled triggers per account
2.  **Network Architecture**: WHEN designing network topology, THEN the system SHALL implement proper separation between Cloudflare Edge, Cloudflare Core, and N8N Infrastructure components.
3.  **Security Architecture**: WHEN implementing security, THEN the system SHALL ensure:
    - All communications over HTTPS
    - Strict CORS policies for Admin Console
    - Cloudflare rate limiting for all public endpoints
    - N8N instance protection via firewall rules and network isolation
4.  **Resource Monitoring**: WHEN monitoring infrastructure, THEN the system SHALL track resource usage and provide alerts for approaching limits.