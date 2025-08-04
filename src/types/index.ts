/**
 * Daily Index Tracker - Type Definitions
 * 
 * Central location for all TypeScript type definitions used across the system.
 */

// Job Status Structure for tracking fan-out/fan-in operations
export interface JobStatus {
  traceId: string;
  timestamp: string; // ISO8601
  status: 'processing' | 'complete' | 'partial' | 'failed';
  kpiIds: string[];
  completedKpis: {
    collection: string[];
    charting: string[];
  };
  failedKpis: {
    collection: string[];
    charting: string[];
  };
  timeout: string; // ISO8601
  partialDelivery: boolean;
}

// KPI Package Structure
export interface KPIPackage {
  kpiId: string;
  timestamp: string; // ISO8601
  traceId: string;
  data: {
    currentValue: number;
    previousValue: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  };
  chart: {
    url: string;
    fallbackText: string;
    timeRange: '7D' | '30D' | '90D';
  };
  analysis: {
    imageAnalysis: string;
    numericalAnalysis: string;
    technicalAnalysis: string;
    synthesis: string;
  };
  alert: {
    triggered: boolean;
    message: string;
    threshold: number;
    condition: '<' | '>' | '==';
  };
}

// Queue Message Schemas
export interface IndividualQueueMessage {
  traceId: string;
  kpiId: string;
  timestamp: string;
}

export interface AggregateQueueMessage {
  traceId: string;
  timestamp: string;
  // kpiIds are retrieved from the Job Status in KV
}

// KPI Configuration
export interface KPIConfig {
  id: string;
  name: string;
  description: string;
  dataSource: DataSourceConfig;
  chart: ChartConfig;
  analysis: AnalysisConfig;
  alerts: AlertConfig;
  schedule: ScheduleConfig;
  paused: boolean;
}

export interface DataSourceConfig {
  type: 'rest' | 'graphql' | 'scraping' | 'sheets' | 'webhook';
  url: string;
  method?: string;
  headers?: Record<string, string>;
  credentials?: string; // Reference to Cloudflare Secret
}

export interface ChartConfig {
  source: 'chart-img' | 'sheets' | 'scraping';
  timeRange: '7D' | '30D' | '90D';
  fallbackUrl?: string;
}

export interface AnalysisConfig {
  enabled: boolean;
  chain: AnalysisStep[];
}

export interface AnalysisStep {
  step: 'imageAnalysis' | 'numericalAnalysis' | 'technicalAnalysis' | 'synthesis';
  model: 'openai' | 'gemini' | 'claude';
  prompt: string;
}

export interface AlertConfig {
  threshold: number;
  condition: '<' | '>' | '==';
  message: string;
}

export interface ScheduleConfig {
  collection: string; // cronExpression
  delivery: string; // cronExpression
}

// Delivery Channel Configuration
export interface DeliveryChannelConfig {
  id: string;
  type: 'email' | 'telegram' | 'discord' | 'slack';
  config: Record<string, any>;
  credentials?: string; // Reference to Cloudflare Secret
}

// System Configuration
export interface SystemConfig {
  kpis: Record<string, KPIConfig>;
  deliveryChannels: Record<string, DeliveryChannelConfig>;
}

// Partial Delivery Package Structure
export interface PartialDeliveryPackage {
  deliveryStatus: 'partial' | 'complete';
  disclaimer: string;
  successfulKpis: string[];
  failedKpis: Array<{
    kpiId: string;
    phase: 'collection' | 'charting';
    error: string;
  }>;
  kpiPackages: KPIPackage[];
  aggregateAnalysis: string;
}

// Error Logging Schema
export interface ErrorLog {
  timestamp: string; // ISO8601
  traceId: string;
  kpiId: string;
  component: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  error: any;
  retryCount: number;
}

// Cloudflare Environment Interface
export interface Env {
  // KV Store
  KV_STORE: KVNamespace;
  
  // Queues
  DATA_COLLECTION_QUEUE: Queue;
  CHART_GENERATION_QUEUE: Queue;
  LLM_ANALYSIS_QUEUE: Queue;
  PACKAGING_QUEUE: Queue;
  DELIVERY_QUEUE: Queue;
  
  // Environment variables
  ENVIRONMENT?: string;
  LOG_LEVEL?: string;
  N8N_API_URL?: string;
  DEFAULT_TIMEOUT?: string;
  
  // Secrets
  OPENAI_API_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  CHART_IMG_API_KEY?: string;
  SMTP_PASSWORD?: string;
  DISCORD_WEBHOOK_URL?: string;
  SLACK_WEBHOOK_URL?: string;
  N8N_API_KEY?: string;
}