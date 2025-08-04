# Requirements Document

## Introduction

The Daily Index Tracker is a hybrid crypto market monitoring system that combines the Cloudflare Developer Platform for serverless components with a hosted N8N instance for workflow automation. The system tracks and reports on pre-defined Key Performance Indicators (KPIs) relevant to the cryptocurrency market, delivering scheduled, enriched KPI reports to end users through various channels with AI-generated contextual market insights.

The system follows a queue-based, event-driven architecture where serverless components (Admin Console, Scheduler Workers, Queues, KV storage) run on Cloudflare, while workflow processing occurs on a hosted N8N instance. The architecture implements a fan-out/fan-in pattern to handle both parallel individual KPI processing and aggregate analysis that considers all KPIs in a cycle.

## Requirements

### Requirement 1

**User Story:** As a crypto market analyst, I want to receive scheduled KPI reports containing current values, trends, and AI analysis, so that I can stay informed about market conditions without manual monitoring.

#### Acceptance Criteria

1.  WHEN a Cloudflare Cron Trigger activates THEN the system SHALL invoke the **Scheduler Worker** to initiate the fan-out process.
2.  WHEN the Scheduler Worker is invoked THEN it SHALL create a job record in KV with a unique `traceId` and send one message per KPI to the `DATA_COLLECTION_QUEUE`.
3.  WHEN the Orchestration Worker detects all KPIs are complete or timeout is reached THEN it SHALL send a single message to the `LLM_ANALYSIS_QUEUE` containing the `traceId`.
4.  WHEN the Delivery workflow executes THEN it SHALL retrieve all KPI packages for the `traceId` from the Cloudflare KV store.
5.  IF the `alert.triggered` flag in any KPI package is true THEN the system SHALL include the pre-configured alert messages in the final notification.
6.  WHEN a delivery is initiated THEN it SHALL complete within 60 seconds.
7.  WHEN multiple KPIs are processed in a cycle THEN they SHALL be **formatted and consolidated into a single message body** suitable for the target channel.
8.  WHEN partial data scenarios occur THEN the system SHALL deliver successfully collected KPIs with a disclaimer about incomplete data.

### Requirement 2

**User Story:** As a crypto market analyst, I want to see visual trend indicators for each KPI, so that I can quickly assess market movements at a glance.

#### Acceptance Criteria

1.  WHEN a chart generation workflow is triggered THEN it SHALL use the appropriate **N8N node** to call the external service (e.g., HTTP Request node for chart-img.com) based on the `chartSource` configuration.
2.  WHEN configuring a KPI THEN the Admin Console SHALL provide a dropdown menu with options for **chart-img.com, Google Sheets chart export, web scraping, or other confogured chart sources**.
3.  WHEN chart generation fails THEN the system SHALL retry up to 3 times with exponential backoff.
4.  IF chart generation fails after 3 retries THEN the system SHALL use a **pre-configured, static fallback image URL** or a text summary.
5.  WHEN configuring time ranges THEN each KPI SHALL have individually configurable chart time periods (e.g., 7D, 30D, 90D) in the Admin Console.

### Requirement 3

**User Story:** As a crypto market analyst, I want to receive AI-generated insights that analyze KPI relationships and trends, so that I can understand market context without manual analysis.

#### Acceptance Criteria

1.  WHEN the Orchestration Worker determines all KPIs are complete or timeout is reached THEN it SHALL trigger the LLM analysis workflow **by placing a message containing the `traceId` on the `LLM_ANALYSIS_QUEUE`**.
2.  WHEN the LLM analysis workflow executes THEN it SHALL read all KPI data for the `traceId` from KV and use multiple LLM models in a sequential chain as defined in the KPI configuration.
3.  WHEN performing analysis THEN the system SHALL include distinct, chained steps for **image analysis of charts, numerical trend analysis, technical analysis and a final synthesis step**.
4.  WHEN generating final analysis THEN the synthesis step SHALL consider relationships between all successfully collected KPIs in the current cycle.
5.  WHEN LLM analysis completes THEN the workflow SHALL **update all relevant KPI Packages in the Cloudflare KV store** with the new analysis and send a message to the `PACKAGING_QUEUE`.
6.  IF LLM analysis fails THEN the system SHALL log the failure and the KPI packages SHALL be delivered without the `analysis` section.

### Requirement 4

**User Story:** As a system administrator, I want to configure LLM models and prompts for analysis, so that I can customize the AI insights based on our specific needs.

#### Acceptance Criteria

1.  WHEN configuring analysis settings THEN the Admin Console SHALL provide UI elements to select LLM models (e.g., OpenAI, Gemini, Claude) for each analysis step.
2.  WHEN defining analysis steps THEN the Admin Console SHALL allow admins to define a **JSON structure representing the chain of prompts and models**, which the N8N workflow will interpret.
3.  WHEN prompts are edited THEN the N8N workflow SHALL dynamically use the updated prompts passed to it in the input message from the queue.
4.  IF a configuration is invalid (e.g., a prompt is empty for a required step) THEN the Admin Console SHALL flag these errors and prevent saving.
5.  WHEN configuration changes are made THEN they SHALL apply only to future analysis runs.

### Requirement 5

**User Story:** As a system administrator, I want to configure KPI data sources and behaviors, so that I can customize how each KPI is collected and processed.

#### Acceptance Criteria

1.  WHEN configuring a KPI THEN the Admin Console SHALL provide forms for defining display formats, calculation periods, and chart ranges.
2.  WHEN setting up alerts THEN the system SHALL allow configuration of numerical thresholds (e.g., `<`, `>`, `==`) and templated alert messages per KPI.
3.  WHEN saving KPI configuration THEN the system SHALL perform validation (e.g., ensuring URLs are valid, thresholds are numbers).
4.  IF required fields are missing or invalid THEN the system SHALL prevent saving and display clear validation errors next to the corresponding fields.
5.  WHEN KPI parameters are defined THEN they SHALL be stored and passed to N8N workflows for processing via queue messages.

### Requirement 6

**User Story:** As a system administrator, I want to define collection and delivery schedules, so that I can control when KPIs are processed and delivered to users.

#### Acceptance Criteria

1.  WHEN configuring schedules THEN the Admin Console SHALL allow setting collection intervals (using cron expressions) and delivery intervals for each KPI.
2.  WHEN schedules are saved THEN the Admin Console SHALL use the Cloudflare API to create or update the corresponding Cloudflare Cron Triggers.
3.  WHEN workflows execute THEN the system SHALL follow the queue-based sequence: Data Collection → Chart Generation → LLM Analysis → Packaging → Delivery.
4.  WHEN the Scheduler Worker runs THEN it SHALL create a job with unique `traceId` and fan out messages to the `DATA_COLLECTION_QUEUE` for all active KPIs.
5.  WHEN the Orchestration Worker runs THEN it SHALL monitor job status in KV and trigger aggregate workflows when KPIs are complete or timeout is reached.

### Requirement 7

**User Story:** As a system architect, I want a modular and scalable architecture, so that components can operate independently and handle failures gracefully.

#### Acceptance Criteria

1.  WHEN the system operates THEN the hosted N8N instance and Cloudflare serverless components SHALL scale independently.
2.  WHEN data is passed between components THEN the Cloudflare KV store and Cloudflare Queues SHALL act as the sole interfaces.
3.  WHEN a workflow fails (e.g., a single KPI's chart generation) THEN other parallel workflows SHALL continue operating without interruption.
4.  WHEN failures occur THEN the system SHALL implement a fan-out/fan-in pattern where individual KPI failures don't block aggregate processing.
5.  WHEN components communicate THEN they SHALL use the pre-defined JSON schema for queue messages, with different schemas for individual vs aggregate processing.
6.  WHEN partial data scenarios occur THEN the Orchestration Worker SHALL proceed with available data after timeout and mark the job status as "partial".

### Requirement 8

**User Story:** As a system administrator, I want a secure web interface to manage configurations, so that I can control the system without technical expertise.

#### Acceptance Criteria

1.  WHEN accessing the console THEN users SHALL authenticate via Cloudflare Access.
2.  WHEN managing configurations THEN the console SHALL support full CRUD operations for KPIs and delivery channels.
3.  WHEN controlling workflows THEN the console SHALL enable/disable N8N workflows by making API calls to the N8N API.
4.  WHEN storing credentials THEN the **Admin Console's backing Worker** SHALL have permissions to write to Cloudflare's secret management, while N8N SHALL have read-only access.
5.  WHEN invalid inputs are entered THEN the UI SHALL provide real-time validation and display clear error messages.

### Requirement 9

**User Story:** As a system operator, I want comprehensive monitoring and logging, so that I can troubleshoot issues and ensure system reliability.

#### Acceptance Criteria

1.  WHEN operations execute THEN all N8N workflows and Cloudflare Workers SHALL generate structured JSON logs with `traceId` correlation.
2.  WHEN logs are created THEN they SHALL include `traceId`, `kpiId`, component name, and error details for comprehensive troubleshooting.
3.  WHEN searching logs THEN a **Cloudflare Logpush destination** SHALL enable filtering by `kpiId`, `traceId`, or service name.
4.  WHEN failures occur THEN retry logic SHALL include exponential backoff (Chart: 3 retries 1s/2s/4s, LLM: 2 retries 2s/4s, Data: 3 retries 1s/2s/4s, Delivery: 2 retries 5s/10s).
5.  WHEN job status tracking occurs THEN the Orchestration Worker SHALL monitor KV store entries to determine when to proceed with aggregate processing.
6.  WHEN system uptime drops below 99.9% THEN an **automated monitoring service** SHALL trigger an alert to a pre-configured administrator channel.

### Requirement 10

**User Story:** As a system administrator, I want to integrate diverse data sources, so that I can collect KPI data from various APIs and services.

#### Acceptance Criteria

1.  WHEN configuring data sources THEN the system SHALL support REST APIs, GraphQL APIs, web scraping, Google Sheets, and webhooks.
2.  WHEN data sources are configured THEN credentials SHALL be managed in the Admin Console and **stored as secrets in Cloudflare Secret Management**.
3.  WHEN ingesting data THEN the appropriate N8N nodes SHALL be used based on the configuration passed in the queue message.
4.  WHEN rate limits are encountered THEN the system SHALL handle them gracefully using N8N's built-in retry and backoff mechanisms.
5.  WHEN data source configurations change THEN the updated details SHALL be passed to N8N workflows dynamically in subsequent runs.

### Requirement 11

**User Story:** As a system administrator, I want to granular operational controls, so that I can manage individual components without affecting the entire system.

#### Acceptance Criteria

1.  WHEN managing workflows THEN the Admin Console SHALL provide Start/Stop/Pause controls for individual N8N workflows via N8N API calls.
2.  WHEN pausing a KPI THEN it SHALL be marked as `"paused": true` in its configuration, and the **Scheduler Worker SHALL filter it out** before initiating workflows.
3.  WHEN resuming from pause THEN the system SHALL resume cleanly on the next scheduled run once the "paused" flag is removed.
4.  WHEN controlling workflows THEN changes SHALL be applied immediately via N8N API calls.
5.  WHEN a specific KPI is paused THEN other KPIs SHALL continue to be processed normally.

### Requirement 12

**User Story:** As a system architect, I want the system to scale to enterprise levels, so that it can handle large deployments and concurrent operations.

#### Acceptance Criteria

1.  WHEN scaling THEN the system SHALL support up to 200 KPIs and 5,000 delivery endpoints.
2.  WHEN workflows execute concurrently THEN there SHALL be no performance degradation.
3.  WHEN load testing THEN the system SHALL maintain stability and meet performance targets under the maximum specified load.
4.  WHEN scaling horizontally THEN additional N8N workers or Cloudflare resources SHALL be addable without requiring re-architecture.
5.  WHEN concurrent operations run THEN N8N workflows SHALL handle them without race conditions or data corruption.

### Requirement 13

**User Story:** As a security officer, I want enterprise-grade security and availability, so that the system meets organizational standards.

#### Acceptance Criteria

1.  WHEN storing credentials THEN all sensitive data (API keys, tokens) SHALL use Cloudflare Secret Management.
2.  WHEN hosting services THEN all custom services, including the Admin Console and Workers, SHALL run on the Cloudflare Developer Platform.
3.  WHEN monitoring availability THEN the system SHALL maintain a 99.9% availability target, tracked by an external monitoring service.
4.  WHEN availability drops below the target THEN alerts SHALL be triggered on SLA breach.
5.  WHEN accessing secrets THEN N8N and Workers SHALL retrieve them securely at runtime from Cloudflare Secrets.

### Requirement 14

**User Story:** As a system architect, I want orchestrated job management with fan-out/fan-in processing, so that individual KPI processing can occur in parallel while aggregate analysis considers all KPIs together.

#### Acceptance Criteria

1.  WHEN a job is initiated THEN the Scheduler Worker SHALL create a job record in KV with a unique `traceId` and list of `kpiIds`.
2.  WHEN individual KPI processing occurs THEN each workflow SHALL update the job status in KV to track completion of collection and charting phases.
3.  WHEN the Orchestration Worker runs THEN it SHALL periodically check job status in KV and determine when all KPIs are complete or timeout is reached.
4.  WHEN aggregate processing is triggered THEN the Orchestration Worker SHALL send a single message containing the `traceId` to the `LLM_ANALYSIS_QUEUE`.
5.  WHEN partial data scenarios occur THEN the system SHALL proceed with available KPIs and mark the job status as "partial" with appropriate disclaimers.
6.  WHEN job tracking occurs THEN the system SHALL maintain separate counters for completed and failed KPIs in both collection and charting phases.

### Requirement 15

**User Story:** As a system architect, I want flexible N8N deployment options, so that I can choose between managed and self-hosted solutions based on operational requirements.

#### Acceptance Criteria

1.  WHEN deploying for production THEN the system SHALL support both N8N Cloud (managed) and self-hosted N8N on VPS deployment options.
2.  WHEN using N8N Cloud THEN the system SHALL leverage the fully managed service for automatic updates and built-in scaling.
3.  WHEN using self-hosted N8N THEN the system SHALL meet minimum requirements of 2 vCPUs, 4GB RAM, 20GB SSD storage.
4.  WHEN developing locally THEN the system SHALL support N8N running via Docker for development and testing.
5.  WHEN integrating with Cloudflare THEN N8N SHALL connect via Queue consumption, KV Store API access, and Cloudflare Secrets for credentials.
6.  WHEN scaling is required THEN the system SHALL support both horizontal scaling (multiple N8N instances) and vertical scaling (increased resources).

### Requirement 16

**User Story:** As a system administrator, I want a modern and intuitive admin interface design, so that I can efficiently manage the system with a pleasant user experience across all devices.

#### Acceptance Criteria

1.  WHEN accessing the Admin Console THEN it SHALL display a **light theme with modern, minimalistic design** principles.
2.  WHEN viewing the interface THEN it SHALL be **fully responsive** and adapt seamlessly to desktop, tablet, and mobile screen sizes.
3.  WHEN navigating the console THEN the UI SHALL use **clean typography, consistent spacing, and intuitive iconography** for optimal usability.
4.  WHEN interacting with forms and controls THEN they SHALL follow **modern web design patterns** with clear visual hierarchy and accessible color contrast.
5.  WHEN displaying data and configurations THEN the interface SHALL use **organized layouts with appropriate white space** to reduce cognitive load and improve readability.

