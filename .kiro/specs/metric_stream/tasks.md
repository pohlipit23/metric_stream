# Implementation Plan: Daily Index Tracker

This document outlines the implementation tasks based on the `design.md`. The project is divided into sequential phases to ensure a logical build-out, starting with a core MVP and progressively adding features and robustness.

---

## Phase 1: N8N Prototyping & Data Contract Definition

**Goal**: Manually prototype N8N workflows to define a stable data contract (the JSON payload structure) before Cloudflare development begins.

- [ ] **Task 1.1: Develop Prototype N8N Workflows**
  - [ ] In the local N8N instance, manually build representative workflows for 2-3 distinct KPI types (e.g., a simple Price KPI, a Ratio KPI, an Index KPI) to understand data structure variations.

- [ ] **Task 1.2: Generate Sample Payloads**
  - [ ] Execute the prototype workflows.
  - [ ] Capture and save the exact JSON output for both successful runs and simulated error conditions.

- [ ] **Task 1.3: Define Finalized Data Contract**
  - [ ] Analyze the sample payloads.
  - [ ] Formally define and document the `KPIDataUpdate` and `KPIErrorUpdate` schemas (e.g., as TypeScript interfaces in a shared `types` directory).
  - [ ] This contract will govern the development of the Ingestion Worker.

- [ ] **Task 1.4: Validate Data Structures and Update Design Document**
  - [ ] Review all JSON payloads and data structures generated from the N8N prototype workflows.
  - [ ] Validate that the actual data structures align with the assumptions in the design document.
  - [ ] Update the `design.md` file with the real schemas, interfaces, and data flow patterns discovered during N8N prototyping.
  - [ ] Document any deviations from the original design and adjust the architecture accordingly.
  - [ ] Ensure the KV store schema and key naming conventions match the actual data structures.
  - [ ] Update the Ingestion Worker specifications in the design to reflect the finalized JSON payload formats.
  - [ ] Define backward compatibility strategies for data structure evolution to ensure future N8N workflow changes don't break existing system components.
  - [ ] Create versioning scheme for data contracts to handle schema migrations gracefully.

---

## Phase 2: Foundation & Environment Setup

**Goal**: Prepare the project structure, development environment, and initial cloud infrastructure.

- [ ] **Task 1.1: Initialize Project Repository**
  - [ ] Initialize a Git repository.
  - [ ] Create a standard project structure (`src`, `n8n`, `scripts`, `docs`).
  - [ ] Add `.gitignore` and basic repository configuration.

- [ ] **Task 1.2: Setup Local Development Environment**
  - [ ] Create a `docker-compose.yml` for running a local N8N instance.
  - [ ] Install and configure Node.js, npm, and the Cloudflare Wrangler CLI.
  - [ ] Document the setup process for new developers.

- [ ] **Task 1.3: Provision Cloudflare Resources**
  - [ ] Write a Wrangler script (`wrangler.toml`) to define and provision:
    - [ ] KV Namespaces (for time series, jobs, packages, config).
    - [ ] Queues (`LLM_ANALYSIS_QUEUE`, `PACKAGING_QUEUE`, `DELIVERY_QUEUE`).
    - [ ] Cloudflare Pages project for the Admin Console.
    - [ ] R2 bucket for long-term data archiving.
  - [ ] Configure Cloudflare Secrets for storing API keys and credentials.

- [ ] **Task 1.4: Configure N8N Instance**
  - [ ] Start the local N8N Docker container.
  - [ ] Establish a secure way to manage N8N credentials for accessing Cloudflare and other external services.

---

## Phase 3: Core Data Pipeline (MVP)**

**Goal**: Implement the simplest end-to-end "happy path" for data ingestion.

- [ ] **Task 2.1: Develop a Single N8N KPI Workflow**
  - [ ] Create a workflow for one sample KPI (e.g., BTC Price).
  - [ ] The workflow should:
    - [ ] Be triggered by a webhook.
    - [ ] Fetch data from an external API.
    - [ ] Format the data into the preliminary `KPIDataUpdate` JSON structure.
    - [ ] Send the data to the (yet to be created) Ingestion Worker.

- [ ] **Task 2.2: Implement the Ingestion Worker**
  - [ ] Create a new Cloudflare Worker.
  - [ ] Implement the `/api/kpi-data` endpoint.
  - [ ] Add logic for:
    - [ ] Request validation (shared secret/API key).
    - [ ] Flexible JSON payload parsing.
    - [ ] Idempotency check (prevent duplicate `timestamp` for a `kpiId`).
    - [ ] Appending the new data point to the `timeseries:{kpiId}` key in KV.
    - [ ] Creating/updating the `job:{traceId}` key in KV to track progress.

- [ ] **Task 2.3: Implement the Scheduler Worker**
  - [ ] Create a new Cloudflare Worker.
  - [ ] Add logic to:
    - [ ] Be triggered by a Cron Trigger.
    - [ ] Create a new job record in KV with a unique `traceId`.
    - [ ] Trigger the sample N8N KPI workflow via its webhook URL.

- [ ] **Task 2.4: End-to-End Test**
  - [ ] Manually trigger the Scheduler Worker.
  - [ ] Verify that the N8N workflow runs, calls the Ingestion Worker, and that data correctly appears in the KV store for both the time series and the job status.

---

## Phase 4: Admin Console & Configuration

**Goal**: Build the user interface for managing and monitoring the system.

- [ ] **Task 3.1: Scaffold Admin Console Frontend & Backend**
  - [ ] Initialize a React/Vue project for the frontend under Cloudflare Pages.
  - [ ] Create the Admin Console Worker to serve as the API backend.
  - [ ] Set up Cloudflare Access for authentication.

- [ ] **Task 3.2: Implement KPI Registry Management**
  - [ ] Design the UI for CRUD operations on KPIs.
  - [ ] Implement the corresponding API endpoints in the Admin Console Worker (`/api/kpis`).
  - [ ] Ensure KPI configurations (name, description, webhook URL) are stored securely in KV.

- [ ] **Task 3.3: Implement System Configuration Management**
  - [ ] Design the UI for managing system-level settings (timeouts, polling intervals).
  - [ ] Implement the `/api/config` endpoints in the Admin Console Worker.

---

## Phase 5: Orchestration & Aggregate Workflows

**Goal**: Implement the fan-in mechanism and the downstream analysis, packaging, and delivery workflows.

- [ ] **Task 4.1: Implement the Orchestration Worker**
  - [ ] Create a scheduled Cloudflare Worker.
  - [ ] Add logic to periodically poll the status of jobs (`job:{traceId}`) in KV.
  - [ ] Implement the fan-in logic: when a job is complete or timed out, send a message with the `traceId` to the `LLM_ANALYSIS_QUEUE`.

- [ ] **Task 4.2: Develop N8N LLM Analysis Workflow**
  - [ ] Create a new N8N workflow triggered by messages from `LLM_ANALYSIS_QUEUE`.
  - [ ] The workflow should:
    - [ ] Read all KPI data for the `traceId` from KV.
    - [ ] Integrate with an LLM service for consolidated and individual analysis.
    - [ ] Send analysis results back to the Ingestion Worker to update KPI packages in KV.
    - [ ] Send a message to the `PACKAGING_QUEUE`.

- [ ] **Task 4.3: Develop N8N Packaging Workflow**
  - [ ] Create a new N8N workflow triggered by `PACKAGING_QUEUE`.
  - [ ] The workflow should:
    - [ ] Read all data for the `traceId` from KV.
    - [ ] Generate a comprehensive document (PDF or Google Doc).
    - [ ] Store the document in R2 and its link in KV.
    - [ ] Format messages for each delivery channel.
    - [ ] Store the final consolidated package in KV.
    - [ ] Send a message to the `DELIVERY_QUEUE`.

- [ ] **Task 4.4: Develop N8N Delivery Workflow**
  - [ ] Create a new N8N workflow triggered by `DELIVERY_QUEUE`.
  - [ ] The workflow should:
    - [ ] Read the consolidated package from KV.
    - [ ] Use N8N's notification nodes to send messages to configured channels.
    - [ ] Update the `delivery:{traceId}` status in KV.
  - [ ] Implement failure-handling logic for incomplete aggregate workflows:
    - [ ] Add timeout detection for stalled aggregate workflows.
    - [ ] Create fallback delivery mechanisms when LLM analysis or packaging fails.
    - [ ] Implement partial delivery with disclaimers when some components are unavailable.
    - [ ] Add orchestration recovery mechanisms to restart failed aggregate workflows.

---

## Phase 6: Feature Expansion

**Goal**: Add advanced features and complete the Admin Console functionality.

- [ ] **Task 5.1: Implement Chart Generation**
  - [ ] Create the optional Chart Generation Worker.
  - [ ] Implement its API (`/api/charts/generate`).
  - [ ] Integrate all three chart generation options (external service, N8N node, CF Worker) into the N8N KPI workflow structure, making it a configurable choice.

- [ ] **Task 5.2: Implement Historical Data Import**
  - [ ] Build the UI in the Admin Console for CSV file upload.
  - [ ] Implement the `/api/kpis/:id/import` endpoint in the Admin Console Worker, including validation and error logging.

- [ ] **Task 5.3: Complete Admin Console Features**
  - [ ] Implement Schedule Management UI and APIs.
  - [ ] Implement N8N Workflow Control (Start/Stop/Pause) via the N8N REST API.
  - [ ] Implement configuration for Retries and Fallbacks.
  - [ ] Build the Monitoring Dashboard to display system health metrics.

---

## Phase 7: Hardening, Testing & Security

**Goal**: Ensure the system is reliable, secure, and ready for production.

- [ ] **Task 6.1: Implement Full Error Handling**
  - [ ] Implement all retry, fallback, and partial data handling logic as specified in the design document across all components.
  - [ ] Ensure robust error logging for easier debugging.

- [ ] **Task 6.2: Security Audit and Hardening**
  - [ ] Review all authentication and authorization mechanisms.
  - [ ] Ensure secrets are managed securely via Cloudflare Secrets and N8N credentials manager.
  - [ ] Configure rate limiting and firewall rules for each Cloudflare Worker:
    - [ ] Implement rate limiting for Ingestion Worker `/api/kpi-data` endpoint.
    - [ ] Configure rate limiting for Admin Console Worker API endpoints.
    - [ ] Set up rate limiting for Chart Generation Worker endpoints.
    - [ ] Configure firewall rules for N8N instance access.
    - [ ] Implement CORS policies for Admin Console frontend.
    - [ ] Set up DDoS protection for all public-facing endpoints.

- [ ] **Task 6.3: Write Tests**
  - [ ] Write unit tests for all Cloudflare Workers (using Miniflare) and Admin Console components (using Jest/Vitest).
  - [ ] Create integration tests (e.g., using Playwright) for key user flows in the Admin Console.
  - [ ] Create end-to-end tests for the entire data pipeline.

- [ ] **Task 6.4: Load Testing**
  - [ ] Develop a load testing plan using a tool like Artillery.io.
  - [ ] Test the system against the specified limits (200 concurrent KPIs, 5,000 delivery endpoints).

---

## Phase 7: Deployment & Documentation

**Goal**: Deploy the application to production and provide necessary documentation.

- [ ] **Task 7.1: Create CI/CD Pipelines**
  - [ ] Set up GitHub Actions (or similar) to automatically deploy the Admin Console (Pages) and Workers on pushes to the main branch.

- [ ] **Task 7.2: Implement Data Archiving**
  - [ ] Create the scheduled Cleanup Worker to archive old time series data from KV to R2.
  - [ ] Implement logic to prune archived data from KV.

- [ ] **Task 7.2.1: Implement Comprehensive Monitoring and Health Checks**
  - [ ] Create health check endpoints for all Cloudflare Workers (`/health`).
  - [ ] Implement monitoring dashboard in Admin Console for key metrics:
    - [ ] Queue depth monitoring for all Cloudflare Queues.
    - [ ] Job completion times and success rates.
    - [ ] KPI failure rates and error tracking.
    - [ ] Worker execution times and performance metrics.
    - [ ] LLM API latency and success rates.
    - [ ] KV storage usage and capacity monitoring.
  - [ ] Set up alerting mechanisms for system failures and performance degradation.
  - [ ] Create automated health checks that validate end-to-end system functionality.
  - [ ] Implement log aggregation and analysis for troubleshooting.

- [ ] **Task 7.3: Finalize Documentation**
  - [ ] Write user documentation for the Admin Console.
  - [ ] Create a runbook for operating and maintaining the system.
  - [ ] Ensure all code is well-commented where necessary.
  - [ ] Create comprehensive API documentation:
    - [ ] Document all Ingestion Worker endpoints (`/api/kpi-data`, `/api/kpi-error`, `/api/health`) with request/response schemas.
    - [ ] Document all Admin Console Worker endpoints with authentication requirements and payload formats.
    - [ ] Document Chart Generation Worker API endpoints with usage examples.
    - [ ] Create OpenAPI/Swagger specifications for all API endpoints.
    - [ ] Include authentication and authorization details for each endpoint.
    - [ ] Provide code examples and integration guides for future developers.
  - [ ] Create N8N workflow documentation:
    - [ ] Document the structure and configuration of each N8N workflow type.
    - [ ] Provide troubleshooting guides for common N8N workflow issues.
    - [ ] Document the data flow and dependencies between workflows.

- [ ] **Task 7.4: Go-Live**
  - [ ] Execute a final production deployment.
  - [ ] Perform a go-live checklist, including importing initial historical data.
  - [ ] Monitor the system closely during its initial run.
