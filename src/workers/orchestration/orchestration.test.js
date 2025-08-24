/**
 * Vitest Test Suite for Orchestration Worker
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleScheduled } from './handlers/scheduled.js';
import { JobMonitor } from './utils/job-monitor.js';
import { QueueManager } from './utils/queue-manager.js';
import { ConfigManager } from './utils/config-manager.js';

// Mock KV Store
class MockKVStore {
  constructor() {
    this.data = new Map();
  }

  async get(key) {
    return this.data.get(key) || null;
  }

  async put(key, value, options = {}) {
    this.data.set(key, value);
  }

  async delete(key) {
    return this.data.delete(key);
  }

  async list(options = {}) {
    const keys = [];
    for (const [key] of this.data) {
      if (!options.prefix || key.startsWith(options.prefix)) {
        keys.push({ name: key });
      }
    }
    return { keys };
  }

  clear() {
    this.data.clear();
  }
}

// Mock Queue
class MockQueue {
  constructor() {
    this.messages = [];
  }

  async send(message) {
    this.messages.push(message);
  }

  getMessages() {
    return this.messages;
  }

  clear() {
    this.messages = [];
  }
}

describe('Orchestration Worker', () => {
  let mockKV;
  let mockQueue;
  let mockEnv;

  beforeEach(() => {
    mockKV = new MockKVStore();
    mockQueue = new MockQueue();
    mockEnv = {
      KV_STORE: mockKV,
      LLM_ANALYSIS_QUEUE: mockQueue,
      POLLING_FREQUENCY_MINUTES: '5',
      JOB_TIMEOUT_MINUTES: '30',
      ENABLE_PARTIAL_DATA: 'true'
    };
  });

  describe('Job Completion Detection', () => {
    it('should detect and process complete jobs', async () => {
      // Setup complete job
      const job = {
        traceId: 'test-001',
        status: 'active',
        kpiIds: ['btc-price', 'eth-price'],
        completedKpis: ['btc-price', 'eth-price'],
        failedKpis: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      await mockKV.put('job:test-001', JSON.stringify(job));

      // Run orchestration
      await handleScheduled({}, mockEnv, {});

      // Verify queue message sent
      const messages = mockQueue.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].traceId).toBe('test-001');
      expect(messages[0].partial).toBe(false);

      // Verify job status updated
      const updatedJob = JSON.parse(await mockKV.get('job:test-001'));
      expect(updatedJob.status).toBe('complete');
    });

    it('should detect jobs in progress and leave them alone', async () => {
      // Setup job in progress
      const job = {
        traceId: 'test-002',
        status: 'active',
        kpiIds: ['btc-price', 'eth-price', 'mvrv-zscore'],
        completedKpis: ['btc-price'],
        failedKpis: [],
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      };

      await mockKV.put('job:test-002', JSON.stringify(job));

      // Run orchestration
      await handleScheduled({}, mockEnv, {});

      // Verify no queue messages sent
      const messages = mockQueue.getMessages();
      expect(messages).toHaveLength(0);

      // Verify job status unchanged
      const updatedJob = JSON.parse(await mockKV.get('job:test-002'));
      expect(updatedJob.status).toBe('active');
    });
  });

  describe('Timeout Detection', () => {
    it('should process timed-out jobs with sufficient partial data', async () => {
      // Setup timed-out job with partial data above threshold
      const job = {
        traceId: 'test-003',
        status: 'active',
        kpiIds: ['btc-price', 'eth-price', 'mvrv-zscore'],
        completedKpis: ['btc-price', 'eth-price'], // 2/3 = 66% > 50% threshold
        failedKpis: [],
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        lastUpdated: new Date(Date.now() - 45 * 60 * 1000).toISOString()
      };

      await mockKV.put('job:test-003', JSON.stringify(job));

      // Run orchestration
      await handleScheduled({}, mockEnv, {});

      // Verify partial processing triggered
      const messages = mockQueue.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].traceId).toBe('test-003');
      expect(messages[0].partial).toBe(true);

      // Verify job marked as partial
      const updatedJob = JSON.parse(await mockKV.get('job:test-003'));
      expect(updatedJob.status).toBe('partial');
    });

    it('should timeout jobs with insufficient partial data', async () => {
      // Setup timed-out job with insufficient data
      const job = {
        traceId: 'test-004',
        status: 'active',
        kpiIds: ['btc-price', 'eth-price', 'mvrv-zscore'],
        completedKpis: ['btc-price'], // 1/3 = 33% < 50% threshold
        failedKpis: [],
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        lastUpdated: new Date(Date.now() - 45 * 60 * 1000).toISOString()
      };

      await mockKV.put('job:test-004', JSON.stringify(job));

      // Run orchestration
      await handleScheduled({}, mockEnv, {});

      // Verify no queue messages sent
      const messages = mockQueue.getMessages();
      expect(messages).toHaveLength(0);

      // Verify job marked as timeout
      const updatedJob = JSON.parse(await mockKV.get('job:test-004'));
      expect(updatedJob.status).toBe('timeout');
    });
  });

  describe('Multiple Jobs Processing', () => {
    it('should process multiple jobs with different statuses correctly', async () => {
      // Setup multiple jobs
      const jobs = [
        {
          traceId: 'multi-001',
          status: 'active',
          kpiIds: ['btc-price', 'eth-price'],
          completedKpis: ['btc-price', 'eth-price'], // Complete
          failedKpis: [],
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        {
          traceId: 'multi-002',
          status: 'active',
          kpiIds: ['mvrv-zscore', 'fear-greed'],
          completedKpis: ['mvrv-zscore'], // In progress
          failedKpis: [],
          createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        },
        {
          traceId: 'multi-003',
          status: 'active',
          kpiIds: ['dominance', 'volume'],
          completedKpis: ['dominance'], // Timed out with 50% data
          failedKpis: [],
          createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          lastUpdated: new Date(Date.now() - 45 * 60 * 1000).toISOString()
        }
      ];

      // Store all jobs
      for (const job of jobs) {
        await mockKV.put(`job:${job.traceId}`, JSON.stringify(job));
      }

      // Run orchestration
      await handleScheduled({}, mockEnv, {});

      // Verify correct number of messages sent
      const messages = mockQueue.getMessages();
      expect(messages).toHaveLength(2); // Complete job + partial job

      // Verify correct jobs triggered
      const triggeredTraceIds = messages.map(m => m.traceId).sort();
      expect(triggeredTraceIds).toEqual(['multi-001', 'multi-003']);

      // Verify job statuses
      const job1 = JSON.parse(await mockKV.get('job:multi-001'));
      const job2 = JSON.parse(await mockKV.get('job:multi-002'));
      const job3 = JSON.parse(await mockKV.get('job:multi-003'));

      expect(job1.status).toBe('complete');
      expect(job2.status).toBe('active'); // Still in progress
      expect(job3.status).toBe('partial');
    });
  });
});

describe('JobMonitor', () => {
  let jobMonitor;
  let mockKV;
  let configManager;

  beforeEach(() => {
    mockKV = new MockKVStore();
    const mockEnv = { KV_STORE: mockKV };
    configManager = new ConfigManager(mockEnv);
    jobMonitor = new JobMonitor(mockEnv, configManager);
  });

  describe('getActiveJobs', () => {
    it('should return only active and in_progress jobs', async () => {
      // Setup jobs with different statuses
      const jobs = [
        { traceId: 'job1', status: 'active', kpiIds: ['kpi1'] },
        { traceId: 'job2', status: 'complete', kpiIds: ['kpi2'] },
        { traceId: 'job3', status: 'in_progress', kpiIds: ['kpi3'] },
        { traceId: 'job4', status: 'timeout', kpiIds: ['kpi4'] }
      ];

      for (const job of jobs) {
        await mockKV.put(`job:${job.traceId}`, JSON.stringify(job));
      }

      const activeJobs = await jobMonitor.getActiveJobs();
      
      expect(activeJobs).toHaveLength(2);
      expect(activeJobs.map(j => j.traceId).sort()).toEqual(['job1', 'job3']);
    });
  });

  describe('checkJobStatus', () => {
    it('should correctly identify complete jobs', async () => {
      const job = {
        traceId: 'test-job',
        status: 'active',
        kpiIds: ['kpi1', 'kpi2'],
        completedKpis: ['kpi1', 'kpi2'],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      await mockKV.put('job:test-job', JSON.stringify(job));

      const status = await jobMonitor.checkJobStatus('test-job');
      
      expect(status.isComplete).toBe(true);
      expect(status.isTimedOut).toBe(false);
      expect(status.completedKpis).toBe(2);
      expect(status.totalKpis).toBe(2);
    });

    it('should correctly identify timed-out jobs', async () => {
      const job = {
        traceId: 'test-job',
        status: 'active',
        kpiIds: ['kpi1', 'kpi2'],
        completedKpis: ['kpi1'],
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        lastUpdated: new Date(Date.now() - 45 * 60 * 1000).toISOString()
      };

      await mockKV.put('job:test-job', JSON.stringify(job));

      const status = await jobMonitor.checkJobStatus('test-job');
      
      expect(status.isComplete).toBe(false);
      expect(status.isTimedOut).toBe(true);
      expect(status.hasPartialData).toBe(true);
    });
  });
});

describe('QueueManager', () => {
  let queueManager;
  let mockQueue;
  let mockKV;

  beforeEach(() => {
    mockQueue = new MockQueue();
    mockKV = new MockKVStore();
    const mockEnv = { 
      LLM_ANALYSIS_QUEUE: mockQueue,
      KV_STORE: mockKV
    };
    queueManager = new QueueManager(mockEnv);
  });

  describe('triggerLLMAnalysis', () => {
    it('should send correct message format to queue', async () => {
      await queueManager.triggerLLMAnalysis('test-trace-123');

      const messages = mockQueue.getMessages();
      expect(messages).toHaveLength(1);
      
      const message = messages[0];
      expect(message.traceId).toBe('test-trace-123');
      expect(message.type).toBe('llm_analysis_trigger');
      expect(message.partial).toBe(false);
      expect(message.metadata.triggeredBy).toBe('orchestration-worker');
    });

    it('should handle partial data flag correctly', async () => {
      await queueManager.triggerLLMAnalysis('test-trace-456', { partial: true });

      const messages = mockQueue.getMessages();
      const message = messages[0];
      expect(message.partial).toBe(true);
    });

    it('should record queue triggers in KV store', async () => {
      await queueManager.triggerLLMAnalysis('test-trace-789');

      const triggerKey = 'queue_trigger:test-trace-789:LLM_ANALYSIS_QUEUE';
      const triggerData = await mockKV.get(triggerKey);
      
      expect(triggerData).toBeTruthy();
      
      const trigger = JSON.parse(triggerData);
      expect(trigger.traceId).toBe('test-trace-789');
      expect(trigger.queueName).toBe('LLM_ANALYSIS_QUEUE');
    });
  });
});

describe('ConfigManager', () => {
  let configManager;
  let mockKV;

  beforeEach(() => {
    mockKV = new MockKVStore();
    const mockEnv = { KV_STORE: mockKV };
    configManager = new ConfigManager(mockEnv);
  });

  describe('shouldProcessPartialData', () => {
    it('should return true when above threshold', () => {
      const config = { enablePartialData: true, partialDataThreshold: 0.5 };
      
      const result = configManager.shouldProcessPartialData(3, 4, config); // 75%
      expect(result).toBe(true);
    });

    it('should return false when below threshold', () => {
      const config = { enablePartialData: true, partialDataThreshold: 0.5 };
      
      const result = configManager.shouldProcessPartialData(1, 4, config); // 25%
      expect(result).toBe(false);
    });

    it('should return false when partial data disabled', () => {
      const config = { enablePartialData: false, partialDataThreshold: 0.5 };
      
      const result = configManager.shouldProcessPartialData(3, 4, config);
      expect(result).toBe(false);
    });

    it('should return false when no completed KPIs', () => {
      const config = { enablePartialData: true, partialDataThreshold: 0.5 };
      
      const result = configManager.shouldProcessPartialData(0, 4, config);
      expect(result).toBe(false);
    });
  });
});