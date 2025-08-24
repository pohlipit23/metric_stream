/**
 * Scheduler Worker Error Handling Validation
 * 
 * Tests error handling paths in the scheduler worker including:
 * - N8N webhook trigger failures
 * - Network timeout scenarios
 * - Invalid KPI registry data
 * - Job creation failures
 * - Retry logic validation
 */

/**
 * Test configuration
 */
const TEST_CONFIG = {
  testTraceId: `scheduler-test-${Date.now()}`,
  validKPIs: [
    {
      id: 'btc-price',
      name: 'Bitcoin Price',
      type: 'price',
      webhookUrl: 'https://httpbin.org/post', // Valid test endpoint
      description: 'Bitcoin price tracking'
    },
    {
      id: 'eth-price', 
      name: 'Ethereum Price',
      type: 'price',
      webhookUrl: 'https://httpbin.org/delay/1', // Slow but valid endpoint
      description: 'Ethereum price tracking'
    }
  ],
  invalidKPIs: [
    {
      id: 'invalid-kpi',
      name: 'Invalid KPI',
      type: 'price',
      webhookUrl: 'http://invalid-host-12345.com/webhook', // Invalid endpoint
      description: 'KPI with invalid webhook'
    }
  ]
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
 * Mock Environment for testing
 */
function createMockEnv() {
  return {
    KV_STORE: new MockKVStore(),
    N8N_API_KEY: 'test-api-key',
    ENVIRONMENT: 'test'
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
 * Import scheduler utilities for testing
 */
async function importSchedulerUtils() {
  try {
    // Try to import actual utilities
    const { generateTraceId } = await import('./src/workers/scheduler/utils/trace-id.js');
    const { createJobRecord } = await import('./src/workers/scheduler/utils/job-manager.js');
    const { getActiveKPIs } = await import('./src/workers/scheduler/utils/kpi-registry.js');
    const { triggerN8NWorkflows, triggerIndividualKPIWorkflow, triggerWorkflowWithRetry } = 
      await import('./src/workers/scheduler/utils/n8n-trigger.js');
    
    return {
      generateTraceId,
      createJobRecord,
      getActiveKPIs,
      triggerN8NWorkflows,
      triggerIndividualKPIWorkflow,
      triggerWorkflowWithRetry
    };
  } catch (error) {
    console.warn('Could not import scheduler utilities, using mock implementations');
    
    // Provide mock implementations
    return {
      generateTraceId: () => `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      
      createJobRecord: async (env, traceId, activeKPIs, timestamp) => {
        const jobRecord = {
          traceId,
          status: 'active',
          createdAt: timestamp,
          kpiIds: activeKPIs.map(kpi => kpi.id),
          completedKpis: [],
          failedKpis: []
        };
        
        await env.KV_STORE.put(`job:${traceId}`, JSON.stringify(jobRecord));
        return true;
      },
      
      getActiveKPIs: async (env) => {
        const registryData = await env.KV_STORE.get('kpi-registry', 'json');
        return registryData ? registryData.kpis : [];
      },
      
      triggerN8NWorkflows: async (env, traceId, activeKPIs, timestamp) => {
        const results = [];
        
        for (const kpi of activeKPIs) {
          try {
            const response = await fetch(kpi.webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ traceId, kpiId: kpi.id, timestamp })
            });
            
            results.push({
              kpiId: kpi.id,
              success: response.ok,
              error: response.ok ? null : `HTTP ${response.status}`,
              responseTime: 100
            });
          } catch (error) {
            results.push({
              kpiId: kpi.id,
              success: false,
              error: error.message,
              responseTime: null
            });
          }
        }
        
        return results;
      },
      
      triggerIndividualKPIWorkflow: async (env, traceId, kpi, timestamp) => {
        try {
          const response = await fetch(kpi.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ traceId, kpiId: kpi.id, timestamp })
          });
          
          return {
            success: response.ok,
            error: response.ok ? null : `HTTP ${response.status}`,
            responseTime: 100
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            responseTime: null
          };
        }
      },
      
      triggerWorkflowWithRetry: async (env, traceId, kpi, timestamp, maxRetries = 3) => {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await fetch(kpi.webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ traceId, kpiId: kpi.id, timestamp })
            });
            
            if (response.ok) {
              return { success: true, error: null, responseTime: 100 };
            }
            
            lastError = `HTTP ${response.status}`;
          } catch (error) {
            lastError = error.message;
          }
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
        
        return {
          success: false,
          error: `All ${maxRetries} attempts failed. Last error: ${lastError}`,
          responseTime: null
        };
      }
    };
  }
}

/**
 * Test 1: Empty KPI Registry Handling
 */
async function testEmptyKPIRegistry() {
  console.log('\n📋 Testing Empty KPI Registry Handling...');
  
  const { getActiveKPIs } = await importSchedulerUtils();
  const env = createMockEnv();
  
  // Set empty registry
  await env.KV_STORE.put('kpi-registry', JSON.stringify({ kpis: [] }));
  
  try {
    const activeKPIs = await getActiveKPIs(env);
    const passed = Array.isArray(activeKPIs) && activeKPIs.length === 0;
    
    logTest(
      'Empty KPI Registry Handling',
      passed,
      `Expected empty array, got: ${JSON.stringify(activeKPIs)}`
    );
  } catch (error) {
    logTest(
      'Empty KPI Registry Handling',
      false,
      `Unexpected error: ${error.message}`
    );
  }
}

/**
 * Test 2: Missing KPI Registry Handling
 */
async function testMissingKPIRegistry() {
  console.log('\n🔍 Testing Missing KPI Registry Handling...');
  
  const { getActiveKPIs } = await importSchedulerUtils();
  const env = createMockEnv();
  
  // Don't set any registry data
  
  try {
    const activeKPIs = await getActiveKPIs(env);
    const passed = Array.isArray(activeKPIs) && activeKPIs.length === 0;
    
    logTest(
      'Missing KPI Registry Handling',
      passed,
      `Expected empty array for missing registry, got: ${JSON.stringify(activeKPIs)}`
    );
  } catch (error) {
    logTest(
      'Missing KPI Registry Handling',
      false,
      `Unexpected error: ${error.message}`
    );
  }
}

/**
 * Test 3: Job Creation Failure Handling
 */
async function testJobCreationFailure() {
  console.log('\n💾 Testing Job Creation Failure Handling...');
  
  const { createJobRecord, generateTraceId } = await importSchedulerUtils();
  const env = createMockEnv();
  
  // Set KV to fail on put operations
  env.KV_STORE.setFailure('put');
  
  const traceId = generateTraceId();
  const timestamp = new Date().toISOString();
  
  try {
    const result = await createJobRecord(env, traceId, TEST_CONFIG.validKPIs, timestamp);
    logTest(
      'Job Creation Failure Handling',
      false,
      'Expected error but job creation succeeded'
    );
  } catch (error) {
    const passed = error.message.includes('KV') || error.message.includes('put') || error.message.includes('Mock');
    logTest(
      'Job Creation Failure Handling',
      passed,
      `Caught expected error: ${error.message}`
    );
  }
  
  env.KV_STORE.clearFailure();
}

/**
 * Test 4: N8N Webhook Trigger Failures
 */
async function testN8NWebhookFailures() {
  console.log('\n🌐 Testing N8N Webhook Trigger Failures...');
  
  const { triggerN8NWorkflows, generateTraceId } = await importSchedulerUtils();
  const env = createMockEnv();
  
  const traceId = generateTraceId();
  const timestamp = new Date().toISOString();
  
  // Test with mix of valid and invalid KPIs
  const mixedKPIs = [...TEST_CONFIG.validKPIs, ...TEST_CONFIG.invalidKPIs];
  
  try {
    const results = await triggerN8NWorkflows(env, traceId, mixedKPIs, timestamp);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    // Should have some successes and some failures
    const passed = successCount > 0 && failureCount > 0 && results.length === mixedKPIs.length;
    
    logTest(
      'Mixed Webhook Trigger Results',
      passed,
      `${successCount} succeeded, ${failureCount} failed out of ${results.length} total`
    );
    
    // Check that failed KPIs have error messages
    const failedResults = results.filter(r => !r.success);
    const hasErrorMessages = failedResults.every(r => r.error && r.error.length > 0);
    
    logTest(
      'Failed Webhook Error Messages',
      hasErrorMessages,
      `All ${failedResults.length} failed webhooks have error messages`
    );
    
  } catch (error) {
    logTest(
      'N8N Webhook Trigger Failures',
      false,
      `Unexpected error: ${error.message}`
    );
  }
}

/**
 * Test 5: Individual Webhook Retry Logic
 */
async function testWebhookRetryLogic() {
  console.log('\n🔄 Testing Webhook Retry Logic...');
  
  const { triggerWorkflowWithRetry, generateTraceId } = await importSchedulerUtils();
  const env = createMockEnv();
  
  const traceId = generateTraceId();
  const timestamp = new Date().toISOString();
  
  // Test with invalid KPI (should fail all retries)
  const invalidKPI = TEST_CONFIG.invalidKPIs[0];
  
  const startTime = Date.now();
  
  try {
    const result = await triggerWorkflowWithRetry(env, traceId, invalidKPI, timestamp, 3);
    const duration = Date.now() - startTime;
    
    // Should fail after retries
    const passed = !result.success && result.error.includes('attempts failed');
    
    logTest(
      'Webhook Retry Logic - Failure After Retries',
      passed,
      `Failed as expected after retries in ${duration}ms: ${result.error}`
    );
    
    // Should take some time due to retry delays
    const hasRetryDelay = duration > 2000; // Should take at least 2 seconds with backoff
    
    logTest(
      'Webhook Retry Logic - Exponential Backoff',
      hasRetryDelay,
      `Retry duration: ${duration}ms (expected > 2000ms for 3 retries)`
    );
    
  } catch (error) {
    logTest(
      'Webhook Retry Logic',
      false,
      `Unexpected error: ${error.message}`
    );
  }
}

/**
 * Test 6: Webhook URL Validation
 */
async function testWebhookUrlValidation() {
  console.log('\n🔗 Testing Webhook URL Validation...');
  
  try {
    // Try to import validation function
    const { validateWebhookUrl } = await import('./src/workers/scheduler/utils/n8n-trigger.js');
    
    const testCases = [
      { url: 'https://valid-host.com/webhook', valid: true, description: 'Valid HTTPS URL' },
      { url: 'http://valid-host.com/webhook', valid: true, description: 'Valid HTTP URL' },
      { url: 'ftp://invalid-protocol.com', valid: false, description: 'Invalid protocol' },
      { url: 'not-a-url', valid: false, description: 'Invalid URL format' },
      { url: '', valid: false, description: 'Empty URL' },
      { url: 'https://', valid: false, description: 'Incomplete URL' }
    ];
    
    for (const testCase of testCases) {
      const result = validateWebhookUrl(testCase.url);
      const passed = result.valid === testCase.valid;
      
      logTest(
        `URL Validation - ${testCase.description}`,
        passed,
        `Expected valid=${testCase.valid}, got valid=${result.valid}, error=${result.error}`
      );
    }
    
  } catch (error) {
    console.log('   Webhook URL validation function not available, skipping validation tests');
    logTest(
      'Webhook URL Validation Function',
      false,
      'Function not available for testing'
    );
  }
}

/**
 * Test 7: Trace ID Generation
 */
async function testTraceIdGeneration() {
  console.log('\n🆔 Testing Trace ID Generation...');
  
  const { generateTraceId } = await importSchedulerUtils();
  
  try {
    // Generate multiple trace IDs
    const traceIds = [];
    for (let i = 0; i < 10; i++) {
      traceIds.push(generateTraceId());
    }
    
    // Check uniqueness
    const uniqueIds = new Set(traceIds);
    const allUnique = uniqueIds.size === traceIds.length;
    
    logTest(
      'Trace ID Uniqueness',
      allUnique,
      `Generated ${traceIds.length} IDs, ${uniqueIds.size} unique`
    );
    
    // Check format (should be strings with reasonable length)
    const validFormat = traceIds.every(id => 
      typeof id === 'string' && id.length > 10 && id.length < 100
    );
    
    logTest(
      'Trace ID Format',
      validFormat,
      `All IDs are strings with reasonable length (10-100 chars)`
    );
    
  } catch (error) {
    logTest(
      'Trace ID Generation',
      false,
      `Error generating trace IDs: ${error.message}`
    );
  }
}

/**
 * Test 8: Complete Scheduler Flow with Errors
 */
async function testCompleteSchedulerFlowWithErrors() {
  console.log('\n🔄 Testing Complete Scheduler Flow with Errors...');
  
  const {
    generateTraceId,
    createJobRecord,
    getActiveKPIs,
    triggerN8NWorkflows
  } = await importSchedulerUtils();
  
  const env = createMockEnv();
  
  // Set up KPI registry with mixed valid/invalid KPIs
  await env.KV_STORE.put('kpi-registry', JSON.stringify({
    kpis: [...TEST_CONFIG.validKPIs, ...TEST_CONFIG.invalidKPIs]
  }));
  
  try {
    // Step 1: Generate trace ID
    const traceId = generateTraceId();
    const timestamp = new Date().toISOString();
    
    // Step 2: Get active KPIs
    const activeKPIs = await getActiveKPIs(env);
    
    // Step 3: Create job record
    const jobCreated = await createJobRecord(env, traceId, activeKPIs, timestamp);
    
    // Step 4: Trigger workflows
    const triggerResults = await triggerN8NWorkflows(env, traceId, activeKPIs, timestamp);
    
    // Verify results
    const hasValidKPIs = activeKPIs.length > 0;
    const hasJobRecord = jobCreated;
    const hasTriggerResults = Array.isArray(triggerResults) && triggerResults.length === activeKPIs.length;
    const hasMixedResults = triggerResults.some(r => r.success) && triggerResults.some(r => !r.success);
    
    logTest(
      'Complete Flow - KPI Registry Loading',
      hasValidKPIs,
      `Loaded ${activeKPIs.length} KPIs from registry`
    );
    
    logTest(
      'Complete Flow - Job Record Creation',
      hasJobRecord,
      `Job record created: ${jobCreated}`
    );
    
    logTest(
      'Complete Flow - Workflow Triggering',
      hasTriggerResults,
      `Triggered ${triggerResults.length} workflows`
    );
    
    logTest(
      'Complete Flow - Mixed Results Handling',
      hasMixedResults,
      `Mixed results: ${triggerResults.filter(r => r.success).length} success, ${triggerResults.filter(r => !r.success).length} failed`
    );
    
  } catch (error) {
    logTest(
      'Complete Scheduler Flow with Errors',
      false,
      `Flow error: ${error.message}`
    );
  }
}

/**
 * Test 9: Concurrent Webhook Triggering
 */
async function testConcurrentWebhookTriggering() {
  console.log('\n⚡ Testing Concurrent Webhook Triggering...');
  
  const { triggerN8NWorkflows, generateTraceId } = await importSchedulerUtils();
  const env = createMockEnv();
  
  const traceId = generateTraceId();
  const timestamp = new Date().toISOString();
  
  // Create multiple KPIs for concurrent testing
  const concurrentKPIs = [
    ...TEST_CONFIG.validKPIs,
    {
      id: 'slow-kpi',
      name: 'Slow KPI',
      type: 'test',
      webhookUrl: 'https://httpbin.org/delay/2', // 2 second delay
      description: 'Slow responding KPI'
    }
  ];
  
  const startTime = Date.now();
  
  try {
    const results = await triggerN8NWorkflows(env, traceId, concurrentKPIs, timestamp);
    const duration = Date.now() - startTime;
    
    // Should complete faster than sequential execution (< 3 seconds for 2s delay)
    const isConcurrent = duration < 3000;
    
    logTest(
      'Concurrent Webhook Execution',
      isConcurrent,
      `Completed ${results.length} webhooks in ${duration}ms (expected < 3000ms for concurrent execution)`
    );
    
    // All webhooks should have been attempted
    const allAttempted = results.length === concurrentKPIs.length;
    
    logTest(
      'All Webhooks Attempted',
      allAttempted,
      `Attempted ${results.length} out of ${concurrentKPIs.length} webhooks`
    );
    
  } catch (error) {
    logTest(
      'Concurrent Webhook Triggering',
      false,
      `Error in concurrent execution: ${error.message}`
    );
  }
}

/**
 * Main test execution
 */
async function runSchedulerErrorHandlingValidation() {
  console.log('🚀 Starting Scheduler Worker Error Handling Validation');
  console.log('=' .repeat(70));
  
  const startTime = Date.now();
  
  try {
    // Run all tests
    await testEmptyKPIRegistry();
    await testMissingKPIRegistry();
    await testJobCreationFailure();
    await testN8NWebhookFailures();
    await testWebhookRetryLogic();
    await testWebhookUrlValidation();
    await testTraceIdGeneration();
    await testCompleteSchedulerFlowWithErrors();
    await testConcurrentWebhookTriggering();
    
  } catch (error) {
    console.error('❌ Test suite execution error:', error);
    testResults.errors.push(`Test suite error: ${error.message}`);
  }
  
  const duration = Date.now() - startTime;
  
  // Print summary
  console.log('\n' + '=' .repeat(70));
  console.log('📊 SCHEDULER ERROR HANDLING VALIDATION SUMMARY');
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
  const resultsFile = `scheduler-error-handling-results-${Date.now()}.json`;
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
  runSchedulerErrorHandlingValidation().then(results => {
    if (results.failed > 0) {
      console.log('\n❌ Some scheduler error handling tests failed.');
      process.exit(1);
    } else {
      console.log('\n✅ All scheduler error handling tests passed!');
      process.exit(0);
    }
  }).catch(error => {
    console.error('Fatal error running scheduler test suite:', error);
    process.exit(1);
  });
}

export {
  runSchedulerErrorHandlingValidation,
  testResults
};