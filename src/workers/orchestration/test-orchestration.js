/**
 * Test Orchestration Worker - Job Completion Detection and Queue Triggering
 * 
 * This test validates that the Orchestration Worker correctly:
 * 1. Detects when jobs are complete
 * 2. Detects when jobs have timed out
 * 3. Triggers LLM Analysis Queue when appropriate
 * 4. Handles partial data scenarios
 * 5. Updates job status correctly
 */

import { handleScheduled } from './handlers/scheduled.js';

// Mock environment for testing
class MockKVStore {
  constructor() {
    this.data = new Map();
  }

  async get(key) {
    return this.data.get(key) || null;
  }

  async put(key, value, options = {}) {
    this.data.set(key, value);
    if (options.expirationTtl) {
      // In a real implementation, we'd handle TTL
      console.log(`Set TTL for ${key}: ${options.expirationTtl}s`);
    }
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

  // Helper method for testing
  clear() {
    this.data.clear();
  }

  // Helper method to inspect data
  getAllData() {
    const result = {};
    for (const [key, value] of this.data) {
      result[key] = value;
    }
    return result;
  }
}

class MockQueue {
  constructor(name) {
    this.name = name;
    this.messages = [];
  }

  async send(message) {
    this.messages.push({
      message,
      timestamp: new Date().toISOString()
    });
    console.log(`Queue ${this.name} received message:`, message);
  }

  // Helper method for testing
  getMessages() {
    return this.messages;
  }

  clear() {
    this.messages = [];
  }
}

// Test scenarios
async function runTests() {
  console.log('🧪 Starting Orchestration Worker Tests\n');

  // Test 1: Complete job detection and queue triggering
  await testCompleteJobDetection();

  // Test 2: Timeout detection with partial data
  await testTimeoutWithPartialData();

  // Test 3: Timeout detection without sufficient data
  await testTimeoutWithoutSufficientData();

  // Test 4: Job in progress (no action needed)
  await testJobInProgress();

  // Test 5: Multiple jobs processing
  await testMultipleJobs();

  console.log('\n✅ All Orchestration Worker tests completed!');
}

/**
 * Test 1: Complete job detection and queue triggering
 */
async function testCompleteJobDetection() {
  console.log('📋 Test 1: Complete job detection and queue triggering');

  const kvStore = new MockKVStore();
  const llmQueue = new MockQueue('LLM_ANALYSIS_QUEUE');

  // Create a complete job
  const traceId = 'test-trace-001';
  const job = {
    traceId,
    status: 'active',
    kpiIds: ['btc-price', 'eth-price', 'mvrv-zscore'],
    completedKpis: ['btc-price', 'eth-price', 'mvrv-zscore'],
    failedKpis: [],
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };

  await kvStore.put(`job:${traceId}`, JSON.stringify(job));

  // Mock environment
  const env = {
    KV_STORE: kvStore,
    LLM_ANALYSIS_QUEUE: llmQueue,
    POLLING_FREQUENCY_MINUTES: '5',
    JOB_TIMEOUT_MINUTES: '30',
    ENABLE_PARTIAL_DATA: 'true'
  };

  // Run orchestration
  await handleScheduled({}, env, {});

  // Verify results
  const messages = llmQueue.getMessages();
  console.log(`  ✓ Queue messages sent: ${messages.length}`);
  
  if (messages.length === 1) {
    const message = messages[0].message;
    console.log(`  ✓ Message trace ID: ${message.traceId}`);
    console.log(`  ✓ Message type: ${message.type}`);
    console.log(`  ✓ Partial flag: ${message.partial}`);
    
    if (message.traceId === traceId && message.type === 'llm_analysis_trigger' && !message.partial) {
      console.log('  ✅ Test 1 PASSED: Complete job correctly triggered LLM analysis\n');
    } else {
      console.log('  ❌ Test 1 FAILED: Incorrect message content\n');
    }
  } else {
    console.log('  ❌ Test 1 FAILED: Expected 1 message, got ' + messages.length + '\n');
  }

  // Check job status update
  const updatedJobData = await kvStore.get(`job:${traceId}`);
  const updatedJob = JSON.parse(updatedJobData);
  console.log(`  ✓ Job status updated to: ${updatedJob.status}`);
  
  if (updatedJob.status === 'complete') {
    console.log('  ✅ Job status correctly updated to complete\n');
  } else {
    console.log('  ❌ Job status not updated correctly\n');
  }
}

/**
 * Test 2: Timeout detection with partial data
 */
async function testTimeoutWithPartialData() {
  console.log('📋 Test 2: Timeout detection with partial data');

  const kvStore = new MockKVStore();
  const llmQueue = new MockQueue('LLM_ANALYSIS_QUEUE');

  // Create a timed-out job with partial data
  const traceId = 'test-trace-002';
  const oldTimestamp = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45 minutes ago
  
  const job = {
    traceId,
    status: 'active',
    kpiIds: ['btc-price', 'eth-price', 'mvrv-zscore'],
    completedKpis: ['btc-price', 'eth-price'], // 2 out of 3 completed
    failedKpis: [],
    createdAt: oldTimestamp,
    lastUpdated: oldTimestamp
  };

  await kvStore.put(`job:${traceId}`, JSON.stringify(job));

  // Mock environment
  const env = {
    KV_STORE: kvStore,
    LLM_ANALYSIS_QUEUE: llmQueue,
    POLLING_FREQUENCY_MINUTES: '5',
    JOB_TIMEOUT_MINUTES: '30',
    ENABLE_PARTIAL_DATA: 'true'
  };

  // Run orchestration
  await handleScheduled({}, env, {});

  // Verify results
  const messages = llmQueue.getMessages();
  console.log(`  ✓ Queue messages sent: ${messages.length}`);
  
  if (messages.length === 1) {
    const message = messages[0].message;
    console.log(`  ✓ Message trace ID: ${message.traceId}`);
    console.log(`  ✓ Partial flag: ${message.partial}`);
    
    if (message.traceId === traceId && message.partial === true) {
      console.log('  ✅ Test 2 PASSED: Timed-out job with partial data correctly triggered\n');
    } else {
      console.log('  ❌ Test 2 FAILED: Incorrect partial data handling\n');
    }
  } else {
    console.log('  ❌ Test 2 FAILED: Expected 1 message, got ' + messages.length + '\n');
  }

  // Check job status update
  const updatedJobData = await kvStore.get(`job:${traceId}`);
  const updatedJob = JSON.parse(updatedJobData);
  console.log(`  ✓ Job status updated to: ${updatedJob.status}`);
  
  if (updatedJob.status === 'partial') {
    console.log('  ✅ Job status correctly updated to partial\n');
  } else {
    console.log('  ❌ Job status not updated correctly\n');
  }
}

/**
 * Test 3: Timeout detection without sufficient data
 */
async function testTimeoutWithoutSufficientData() {
  console.log('📋 Test 3: Timeout detection without sufficient data');

  const kvStore = new MockKVStore();
  const llmQueue = new MockQueue('LLM_ANALYSIS_QUEUE');

  // Create a timed-out job with insufficient data
  const traceId = 'test-trace-003';
  const oldTimestamp = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45 minutes ago
  
  const job = {
    traceId,
    status: 'active',
    kpiIds: ['btc-price', 'eth-price', 'mvrv-zscore'],
    completedKpis: ['btc-price'], // Only 1 out of 3 completed (33% < 50% threshold)
    failedKpis: [],
    createdAt: oldTimestamp,
    lastUpdated: oldTimestamp
  };

  await kvStore.put(`job:${traceId}`, JSON.stringify(job));

  // Mock environment
  const env = {
    KV_STORE: kvStore,
    LLM_ANALYSIS_QUEUE: llmQueue,
    POLLING_FREQUENCY_MINUTES: '5',
    JOB_TIMEOUT_MINUTES: '30',
    ENABLE_PARTIAL_DATA: 'true'
  };

  // Run orchestration
  await handleScheduled({}, env, {});

  // Verify results
  const messages = llmQueue.getMessages();
  console.log(`  ✓ Queue messages sent: ${messages.length}`);
  
  if (messages.length === 0) {
    console.log('  ✅ Test 3 PASSED: Insufficient data correctly prevented queue trigger\n');
  } else {
    console.log('  ❌ Test 3 FAILED: Queue should not have been triggered\n');
  }

  // Check job status update
  const updatedJobData = await kvStore.get(`job:${traceId}`);
  const updatedJob = JSON.parse(updatedJobData);
  console.log(`  ✓ Job status updated to: ${updatedJob.status}`);
  
  if (updatedJob.status === 'timeout') {
    console.log('  ✅ Job status correctly updated to timeout\n');
  } else {
    console.log('  ❌ Job status not updated correctly\n');
  }
}

/**
 * Test 4: Job in progress (no action needed)
 */
async function testJobInProgress() {
  console.log('📋 Test 4: Job in progress (no action needed)');

  const kvStore = new MockKVStore();
  const llmQueue = new MockQueue('LLM_ANALYSIS_QUEUE');

  // Create a job that's still in progress
  const traceId = 'test-trace-004';
  const recentTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
  
  const job = {
    traceId,
    status: 'active',
    kpiIds: ['btc-price', 'eth-price', 'mvrv-zscore'],
    completedKpis: ['btc-price'], // 1 out of 3 completed, but not timed out yet
    failedKpis: [],
    createdAt: recentTimestamp,
    lastUpdated: recentTimestamp
  };

  await kvStore.put(`job:${traceId}`, JSON.stringify(job));

  // Mock environment
  const env = {
    KV_STORE: kvStore,
    LLM_ANALYSIS_QUEUE: llmQueue,
    POLLING_FREQUENCY_MINUTES: '5',
    JOB_TIMEOUT_MINUTES: '30',
    ENABLE_PARTIAL_DATA: 'true'
  };

  // Run orchestration
  await handleScheduled({}, env, {});

  // Verify results
  const messages = llmQueue.getMessages();
  console.log(`  ✓ Queue messages sent: ${messages.length}`);
  
  if (messages.length === 0) {
    console.log('  ✅ Test 4 PASSED: Job in progress correctly left alone\n');
  } else {
    console.log('  ❌ Test 4 FAILED: Job in progress should not trigger queue\n');
  }

  // Check job status (should remain unchanged)
  const updatedJobData = await kvStore.get(`job:${traceId}`);
  const updatedJob = JSON.parse(updatedJobData);
  console.log(`  ✓ Job status: ${updatedJob.status}`);
  
  if (updatedJob.status === 'active') {
    console.log('  ✅ Job status correctly remained active\n');
  } else {
    console.log('  ❌ Job status should have remained active\n');
  }
}

/**
 * Test 5: Multiple jobs processing
 */
async function testMultipleJobs() {
  console.log('📋 Test 5: Multiple jobs processing');

  const kvStore = new MockKVStore();
  const llmQueue = new MockQueue('LLM_ANALYSIS_QUEUE');

  // Create multiple jobs with different statuses
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
      completedKpis: ['dominance'], // Timed out with partial data
      failedKpis: [],
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    }
  ];

  // Store all jobs
  for (const job of jobs) {
    await kvStore.put(`job:${job.traceId}`, JSON.stringify(job));
  }

  // Mock environment
  const env = {
    KV_STORE: kvStore,
    LLM_ANALYSIS_QUEUE: llmQueue,
    POLLING_FREQUENCY_MINUTES: '5',
    JOB_TIMEOUT_MINUTES: '30',
    ENABLE_PARTIAL_DATA: 'true'
  };

  // Run orchestration
  await handleScheduled({}, env, {});

  // Verify results
  const messages = llmQueue.getMessages();
  console.log(`  ✓ Queue messages sent: ${messages.length}`);
  
  if (messages.length === 2) {
    // Should trigger for complete job (multi-001) and partial job (multi-003)
    const traceIds = messages.map(m => m.message.traceId).sort();
    const expectedTraceIds = ['multi-001', 'multi-003'].sort();
    
    if (JSON.stringify(traceIds) === JSON.stringify(expectedTraceIds)) {
      console.log('  ✅ Test 5 PASSED: Multiple jobs processed correctly\n');
    } else {
      console.log('  ❌ Test 5 FAILED: Incorrect jobs triggered\n');
      console.log('    Expected:', expectedTraceIds);
      console.log('    Got:', traceIds);
    }
  } else {
    console.log('  ❌ Test 5 FAILED: Expected 2 messages, got ' + messages.length + '\n');
  }

  // Check individual job statuses
  for (const job of jobs) {
    const updatedJobData = await kvStore.get(`job:${job.traceId}`);
    const updatedJob = JSON.parse(updatedJobData);
    console.log(`  ✓ Job ${job.traceId} status: ${updatedJob.status}`);
  }
}

/**
 * Test queue trigger recording
 */
async function testQueueTriggerRecording() {
  console.log('📋 Test 6: Queue trigger recording');

  const kvStore = new MockKVStore();
  const llmQueue = new MockQueue('LLM_ANALYSIS_QUEUE');

  // Create a complete job
  const traceId = 'test-trace-006';
  const job = {
    traceId,
    status: 'active',
    kpiIds: ['btc-price'],
    completedKpis: ['btc-price'],
    failedKpis: [],
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };

  await kvStore.put(`job:${traceId}`, JSON.stringify(job));

  // Mock environment
  const env = {
    KV_STORE: kvStore,
    LLM_ANALYSIS_QUEUE: llmQueue,
    POLLING_FREQUENCY_MINUTES: '5',
    JOB_TIMEOUT_MINUTES: '30',
    ENABLE_PARTIAL_DATA: 'true'
  };

  // Run orchestration
  await handleScheduled({}, env, {});

  // Check if queue trigger was recorded
  const triggerKey = `queue_trigger:${traceId}:LLM_ANALYSIS_QUEUE`;
  const triggerData = await kvStore.get(triggerKey);
  
  if (triggerData) {
    const trigger = JSON.parse(triggerData);
    console.log(`  ✓ Queue trigger recorded for ${trigger.traceId}`);
    console.log(`  ✓ Trigger timestamp: ${trigger.timestamp}`);
    console.log('  ✅ Test 6 PASSED: Queue trigger recording works\n');
  } else {
    console.log('  ❌ Test 6 FAILED: Queue trigger not recorded\n');
  }
}

// Run all tests
async function runAllTests() {
  await runTests();
  await testQueueTriggerRecording();
}

runAllTests().catch(console.error);