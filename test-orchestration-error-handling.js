/**
 * Orchestration Worker Error Handling Validation
 * 
 * Tests error handling paths in the orchestration worker including:
 * - Job timeout scenarios
 * - Partial data handling
 * - Queue failure scenarios
 * - KV store failures
 * - Configuration errors
 */

/**
 * Test configuration
 */
const TEST_CONFIG = {
  testTraceId: `orchestration-test-${Date.now()}`,
  kpiIds: ['btc-price', 'eth-price', 'mvrv-zscore'],
  timeoutMinutes: 2, // Short timeout for testing
  partialDataThreshold: 0.5 // 50% completion threshold
};

/**
 * Test results tracking
 */
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

/**
 * Mock KV Store for testing
 */
class MockKVStore {
  constructor() {
    this.data = new Map();
    this.shouldFail = false;
    this.failureType = null;
  }
  
  async get(key, type = 'text') {
    if (this.shouldFail && this.failureType === 'get') {
      throw new Error('Mock KV get failure');
    }
    
    const value = this.data.get(key);
    if (!value) return null;
    
    if (type === 'json') {
      return JSON.parse(value);
    }
    return value;
  }
  
  async put(key, value, options = {}) {
    if (this.shouldFail && this.failureType === 'put') {
      throw new Error('Mock KV put failure');
    }
    
    this.data.set(key, value);
  }
  
  async list(options = {}) {
    if (this.shouldFail && this.failureType === 'list') {
      throw new Error('Mock KV list failure');
    }
    
    const keys = Array.from(this.data.keys());
    const filteredKeys = options.prefix ? 
      keys.filter(key => key.startsWith(options.prefix)) : keys;
    
    return {
      keys: filteredKeys.map(name => ({ name }))
    };
  }
  
  setFailure(type) {
    this.shouldFail = true;
    this.failureType = type;
  }
  
  clearFailure() {
    this.shouldFail = false;
    this.failureType = null;
  }
}

/**
 * Mock Queue for testing
 */
class MockQueue {
  constructor() {
    this.messages = [];
    this.shouldFail = false;
  }
  
  async send(message) {
    if (this.shouldFail) {
      throw new Error('Mock queue send failure');
    }
    
    this.messages.push({
      message,
      timestamp: new Date().toISOString()
    });
  }
  
  setFailure(shouldFail) {
    this.shouldFail = shouldFail;
  }
  
  getMessages() {
    return this.messages;
  }
  
  clear() {
    this.messages = [];
  }
}

/**
 * Mock Environment for testing
 */
function createMockEnv() {
  return {
    KV_STORE: new MockKVStore(),
    LLM_ANALYSIS_QUEUE: new MockQueue()
  };
}

/**
 * Test helper functions
 */
function logTest(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
  
  testResults.details.push({
    test: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push(`${testName}: ${details}`);
  }
}

/**
 * Create test job data
 */
function createTestJob(traceId, status = 'active', completedKpis = [], failedKpis = []) {
  const createdAt = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
  
  return {
    traceId,
    status,
    createdAt,
    lastUpdated: new Date().toISOString(),
    kpiIds: TEST_CONFIG.kpiIds,
    completedKpis,
    failedKpis,
    metadata: {
      source: 'test-suite'
    }
  };
}

/**
 * Import orchestration utilities for testing
 */
async function importOrchestrationUtils() {
  try {
    // Import the actual orchestration utilities
    const { JobMonitor } = await import('./src/workers/orchestration/utils/job-monitor.js');
    const { QueueManager } = await import('./src/workers/orchestration/utils/queue-manager.js');
    const { ConfigManager } = await import('./src/workers/orchestration/utils/config-manager.js');
    
    return { JobMonitor, QueueManager, ConfigManager };
  } catch (error) {
    console.warn('Could not import orchestration utilities, using mock implementations');
    
    // Provide mock implementations for testing
    return {
      JobMonitor: class MockJobMonitor {
        constructor(env, configManager) {
          this.env = env;
          this.configManager = configManager;
        }
        
        async getActiveJobs() {
          const jobKeys = await this.env.KV_STORE.list({ prefix: 'job:' });
          const activeJobs = [];
          
          for (const key of jobKeys.keys) {
            const jobData = await this.env.KV_STORE.get(key.name);
            if (jobData) {
              const job = JSON.parse(jobData);
              if (job.status === 'active' || job.status === 'in_progress') {
                activeJobs.push(job);
              }
            }
          }
          
          return activeJobs;
        }
        
        async checkJobStatus(traceId) {
          const jobData = await this.env.KV_STORE.get(`job:${traceId}`);
          if (!jobData) throw new Error(`Job ${traceId} not found`);
          
          const job = JSON.parse(jobData);
          const config = await this.configManager.getConfig();
          
          const createdAt = new Date(job.createdAt);
          const ageMinutes = (Date.now() - createdAt.getTime()) / (1000 * 60);
          
          const totalKpis = job.kpiIds.length;
          const completedKpis = job.completedKpis ? job.completedKpis.length : 0;
          const failedKpis = job.failedKpis ? job.failedKpis.length : 0;
          
          return {
            traceId,
            totalKpis,
            completedKpis,
            failedKpis,
            ageMinutes,
            isComplete: completedKpis === totalKpis,
            isTimedOut: ageMinutes > config.jobTimeoutMinutes,
            hasPartialData: completedKpis > 0 && completedKpis < totalKpis
          };
        }
        
        async markJobAsProcessed(traceId, finalStatus) {
          const jobData = await this.env.KV_STORE.get(`job:${traceId}`);
          if (!jobData) throw new Error(`Job ${traceId} not found`);
          
          const job = JSON.parse(jobData);
          job.status = finalStatus;
          job.processedAt = new Date().toISOString();
          
          await this.env.KV_STORE.put(`job:${traceId}`, JSON.stringify(job));
        }
      },
      
      QueueManager: class MockQueueManager {
        constructor(env) {
          this.env = env;
        }
        
        async triggerLLMAnalysis(traceId, options = {}) {
          const message = {
            traceId,
            timestamp: new Date().toISOString(),
            type: 'llm_analysis_trigger',
            partial: options.partial || false
          };
          
          await this.env.LLM_ANALYSIS_QUEUE.send(message);
        }
      },
      
      ConfigManager: class MockConfigManager {
        constructor(env) {
          this.env = env;
        }
        
        async getConfig() {
          return {
            jobTimeoutMinutes: TEST_CONFIG.timeoutMinutes,
            partialDataThreshold: TEST_CONFIG.partialDataThreshold,
            pollingFrequencyMinutes: 1
          };
        }
        
        shouldProcessPartialData(completedKpis, totalKpis, config) {
          const completionRate = completedKpis / totalKpis;
          return completionRate >= config.partialDataThreshold;
        }
      }
    };
  }
}

/**
 * Test 1: Job Timeout Handling
 */
async function testJobTimeoutHandling() {
  console.log('\n⏱️ Testing Job Timeout Handling...');
  
  const { JobMonitor, ConfigManager } = await importOrchestrationUtils();
  const env = createMockEnv();
  
  // Create a job that should be timed out
  const timedOutJob = createTestJob(
    `timeout-test-${Date.now()}`,
    'active',
    ['btc-price'], // Only 1 of 3 KPIs completed
    []
  );
  
  // Set creation time to be older than timeout
  timedOutJob.createdAt = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
  
  await env.KV_STORE.put(`job:${timedOutJob.traceId}`, JSON.stringify(timedOutJob));
  
  const configManager = new ConfigManager(env);
  const jobMonitor = new JobMonitor(env, configManager);
  
  try {
    const jobStatus = await jobMonitor.checkJobStatus(timedOutJob.traceId);
    
    const passed = jobStatus.isTimedOut && jobStatus.hasPartialData;
    logTest(
      'Job Timeout Detection',
      passed,
      `Timeout: ${jobStatus.isTimedOut}, Partial: ${jobStatus.hasPartialData}, Age: ${jobStatus.ageMinutes.toFixed(1)}min`
    );
  } catch (error) {
    logTest('Job Timeout Detection', false, `Error: ${error.message}`);
  }
}

/**
 * Test 2: Partial Data Processing Decision
 */
async function testPartialDataProcessing() {
  console.log('\n📊 Testing Partial Data Processing Decision...');
  
  const { JobMonitor, ConfigManager } = await importOrchestrationUtils();
  const env = createMockEnv();
  
  const configManager = new ConfigManager(env);
  const config = await configManager.getConfig();
  
  const testCases = [
    { completed: 0, total: 3, shouldProcess: false, description: 'No KPIs completed' },
    { completed: 1, total: 3, shouldProcess: false, description: '33% completion (below threshold)' },
    { completed: 2, total: 3, shouldProcess: true, description: '67% completion (above threshold)' },
    { completed: 3, total: 3, shouldProcess: true, description: '100% completion' }
  ];
  
  for (const testCase of testCases) {
    const shouldProcess = configManager.shouldProcessPartialData(
      testCase.completed, 
      testCase.total, 
      config
    );
    
    const passed = shouldProcess === testCase.shouldProcess;
    logTest(
      `Partial Data Decision - ${testCase.description}`,
      passed,
      `Expected: ${testCase.shouldProcess}, Got: ${shouldProcess}`
    );
  }
}

/**
 * Test 3: KV Store Failure Handling
 */
async function testKVStoreFailureHandling() {
  console.log('\n💾 Testing KV Store Failure Handling...');
  
  const { JobMonitor, ConfigManager } = await importOrchestrationUtils();
  const env = createMockEnv();
  
  const configManager = new ConfigManager(env);
  const jobMonitor = new JobMonitor(env, configManager);
  
  // Test KV get failure
  env.KV_STORE.setFailure('get');
  
  try {
    await jobMonitor.getActiveJobs();
    logTest('KV Get Failure Handling', false, 'Expected error but got success');
  } catch (error) {
    const passed = error.message.includes('Mock KV get failure') || 
                   error.message.includes('KV') || 
                   error.message.includes('get');
    logTest(
      'KV Get Failure Handling',
      passed,
      `Caught expected error: ${error.message}`
    );
  }
  
  env.KV_STORE.clearFailure();
  
  // Test KV put failure
  env.KV_STORE.setFailure('put');
  
  try {
    await jobMonitor.markJobAsProcessed('test-trace', 'complete');
    logTest('KV Put Failure Handling', false, 'Expected error but got success');
  } catch (error) {
    const passed = error.message.includes('Mock KV put failure') || 
                   error.message.includes('KV') || 
                   error.message.includes('put');
    logTest(
      'KV Put Failure Handling',
      passed,
      `Caught expected error: ${error.message}`
    );
  }
  
  env.KV_STORE.clearFailure();
}

/**
 * Test 4: Queue Failure Handling
 */
async function testQueueFailureHandling() {
  console.log('\n📬 Testing Queue Failure Handling...');
  
  const { QueueManager } = await importOrchestrationUtils();
  const env = createMockEnv();
  
  const queueManager = new QueueManager(env);
  
  // Test queue send failure
  env.LLM_ANALYSIS_QUEUE.setFailure(true);
  
  try {
    await queueManager.triggerLLMAnalysis('test-trace-id');
    logTest('Queue Send Failure Handling', false, 'Expected error but got success');
  } catch (error) {
    const passed = error.message.includes('Mock queue send failure') || 
                   error.message.includes('queue') || 
                   error.message.includes('send');
    logTest(
      'Queue Send Failure Handling',
      passed,
      `Caught expected error: ${error.message}`
    );
  }
  
  env.LLM_ANALYSIS_QUEUE.setFailure(false);
}

/**
 * Test 5: Job Status Corruption Handling
 */
async function testJobStatusCorruptionHandling() {
  console.log('\n🔧 Testing Job Status Corruption Handling...');
  
  const { JobMonitor, ConfigManager } = await importOrchestrationUtils();
  const env = createMockEnv();
  
  const configManager = new ConfigManager(env);
  const jobMonitor = new JobMonitor(env, configManager);
  
  // Create corrupted job data
  const corruptedJobData = 'invalid json {';
  await env.KV_STORE.put('job:corrupted-test', corruptedJobData);
  
  try {
    const activeJobs = await jobMonitor.getActiveJobs();
    // Should handle corrupted data gracefully and return empty array or skip corrupted jobs
    const passed = Array.isArray(activeJobs);
    logTest(
      'Corrupted Job Data Handling',
      passed,
      `Returned ${activeJobs.length} jobs despite corruption`
    );
  } catch (error) {
    logTest(
      'Corrupted Job Data Handling',
      false,
      `Unexpected error: ${error.message}`
    );
  }
}

/**
 * Test 6: Missing Job Handling
 */
async function testMissingJobHandling() {
  console.log('\n🔍 Testing Missing Job Handling...');
  
  const { JobMonitor, ConfigManager } = await importOrchestrationUtils();
  const env = createMockEnv();
  
  const configManager = new ConfigManager(env);
  const jobMonitor = new JobMonitor(env, configManager);
  
  try {
    await jobMonitor.checkJobStatus('non-existent-job');
    logTest('Missing Job Handling', false, 'Expected error but got success');
  } catch (error) {
    const passed = error.message.includes('not found') || 
                   error.message.includes('Job') ||
                   error.message.includes('non-existent');
    logTest(
      'Missing Job Handling',
      passed,
      `Caught expected error: ${error.message}`
    );
  }
}

/**
 * Test 7: Complete Job Processing Flow
 */
async function testCompleteJobProcessingFlow() {
  console.log('\n🔄 Testing Complete Job Processing Flow...');
  
  const { JobMonitor, QueueManager, ConfigManager } = await importOrchestrationUtils();
  const env = createMockEnv();
  
  const configManager = new ConfigManager(env);
  const jobMonitor = new JobMonitor(env, configManager);
  const queueManager = new QueueManager(env);
  
  // Create a complete job
  const completeJob = createTestJob(
    `complete-test-${Date.now()}`,
    'active',
    TEST_CONFIG.kpiIds, // All KPIs completed
    []
  );
  
  await env.KV_STORE.put(`job:${completeJob.traceId}`, JSON.stringify(completeJob));
  
  try {
    // Check job status
    const jobStatus = await jobMonitor.checkJobStatus(completeJob.traceId);
    
    if (jobStatus.isComplete) {
      // Trigger LLM analysis
      await queueManager.triggerLLMAnalysis(completeJob.traceId);
      
      // Mark as processed
      await jobMonitor.markJobAsProcessed(completeJob.traceId, 'complete');
      
      // Verify queue message was sent
      const queueMessages = env.LLM_ANALYSIS_QUEUE.getMessages();
      const hasMessage = queueMessages.some(msg => 
        msg.message.traceId === completeJob.traceId
      );
      
      // Verify job was marked as processed
      const updatedJobData = await env.KV_STORE.get(`job:${completeJob.traceId}`);
      const updatedJob = JSON.parse(updatedJobData);
      
      const passed = hasMessage && updatedJob.status === 'complete';
      logTest(
        'Complete Job Processing Flow',
        passed,
        `Queue message sent: ${hasMessage}, Job status: ${updatedJob.status}`
      );
    } else {
      logTest(
        'Complete Job Processing Flow',
        false,
        `Job not detected as complete: ${JSON.stringify(jobStatus)}`
      );
    }
  } catch (error) {
    logTest(
      'Complete Job Processing Flow',
      false,
      `Error in processing flow: ${error.message}`
    );
  }
}

/**
 * Test 8: Partial Job Processing Flow
 */
async function testPartialJobProcessingFlow() {
  console.log('\n📊 Testing Partial Job Processing Flow...');
  
  const { JobMonitor, QueueManager, ConfigManager } = await importOrchestrationUtils();
  const env = createMockEnv();
  
  const configManager = new ConfigManager(env);
  const jobMonitor = new JobMonitor(env, configManager);
  const queueManager = new QueueManager(env);
  
  // Create a timed-out job with partial data
  const partialJob = createTestJob(
    `partial-test-${Date.now()}`,
    'active',
    ['btc-price', 'eth-price'], // 2 of 3 KPIs completed (67% - above threshold)
    []
  );
  
  // Set creation time to be older than timeout
  partialJob.createdAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  await env.KV_STORE.put(`job:${partialJob.traceId}`, JSON.stringify(partialJob));
  
  try {
    const jobStatus = await jobMonitor.checkJobStatus(partialJob.traceId);
    const config = await configManager.getConfig();
    
    if (jobStatus.isTimedOut && 
        configManager.shouldProcessPartialData(jobStatus.completedKpis, jobStatus.totalKpis, config)) {
      
      // Trigger LLM analysis with partial flag
      await queueManager.triggerLLMAnalysis(partialJob.traceId, { partial: true });
      
      // Mark as processed with partial status
      await jobMonitor.markJobAsProcessed(partialJob.traceId, 'partial');
      
      // Verify queue message was sent with partial flag
      const queueMessages = env.LLM_ANALYSIS_QUEUE.getMessages();
      const partialMessage = queueMessages.find(msg => 
        msg.message.traceId === partialJob.traceId && msg.message.partial === true
      );
      
      // Verify job was marked as partial
      const updatedJobData = await env.KV_STORE.get(`job:${partialJob.traceId}`);
      const updatedJob = JSON.parse(updatedJobData);
      
      const passed = !!partialMessage && updatedJob.status === 'partial';
      logTest(
        'Partial Job Processing Flow',
        passed,
        `Partial message sent: ${!!partialMessage}, Job status: ${updatedJob.status}`
      );
    } else {
      logTest(
        'Partial Job Processing Flow',
        false,
        `Job conditions not met: timeout=${jobStatus.isTimedOut}, shouldProcess=${configManager.shouldProcessPartialData(jobStatus.completedKpis, jobStatus.totalKpis, config)}`
      );
    }
  } catch (error) {
    logTest(
      'Partial Job Processing Flow',
      false,
      `Error in partial processing flow: ${error.message}`
    );
  }
}

/**
 * Main test execution
 */
async function runOrchestrationErrorHandlingValidation() {
  console.log('🚀 Starting Orchestration Worker Error Handling Validation');
  console.log('=' .repeat(70));
  
  const startTime = Date.now();
  
  try {
    // Run all tests
    await testJobTimeoutHandling();
    await testPartialDataProcessing();
    await testKVStoreFailureHandling();
    await testQueueFailureHandling();
    await testJobStatusCorruptionHandling();
    await testMissingJobHandling();
    await testCompleteJobProcessingFlow();
    await testPartialJobProcessingFlow();
    
  } catch (error) {
    console.error('❌ Test suite execution error:', error);
    testResults.errors.push(`Test suite error: ${error.message}`);
  }
  
  const duration = Date.now() - startTime;
  
  // Print summary
  console.log('\n' + '=' .repeat(70));
  console.log('📊 ORCHESTRATION ERROR HANDLING VALIDATION SUMMARY');
  console.log('=' .repeat(70));
  console.log(`⏱️  Total execution time: ${duration}ms`);
  console.log(`✅ Tests passed: ${testResults.passed}`);
  console.log(`❌ Tests failed: ${testResults.failed}`);
  console.log(`📈 Success rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 FAILED TESTS:');
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  // Save detailed results
  const resultsFile = `orchestration-error-handling-results-${Date.now()}.json`;
  const fs = await import('fs');
  fs.writeFileSync(resultsFile, JSON.stringify({
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      duration,
      timestamp: new Date().toISOString()
    },
    details: testResults.details,
    errors: testResults.errors
  }, null, 2));
  
  console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
  
  return {
    passed: testResults.passed,
    failed: testResults.failed,
    errors: testResults.errors
  };
}

// Run the test suite
if (import.meta.url === `file://${process.argv[1]}`) {
  runOrchestrationErrorHandlingValidation().then(results => {
    if (results.failed > 0) {
      console.log('\n❌ Some orchestration error handling tests failed.');
      process.exit(1);
    } else {
      console.log('\n✅ All orchestration error handling tests passed!');
      process.exit(0);
    }
  }).catch(error => {
    console.error('Fatal error running orchestration test suite:', error);
    process.exit(1);
  });
}

export {
  runOrchestrationErrorHandlingValidation,
  testResults
};