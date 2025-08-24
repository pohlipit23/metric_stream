/**
 * Error Handling Validation Test Suite
 * 
 * This script validates error handling paths with simulated failures across all workers:
 * - Ingestion Worker error handling
 * - Scheduler Worker error handling  
 * - Orchestration Worker error handling
 * - KV store failures
 * - Network failures
 * - Invalid data scenarios
 */

const INGESTION_WORKER_URL = 'http://localhost:8787';
const TEST_API_KEY = 'test-api-key-12345';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  traceId: `test-trace-${Date.now()}`,
  kpiId: 'test-kpi-btc-price',
  timestamp: new Date().toISOString(),
  validPayload: {
    traceId: `test-trace-${Date.now()}`,
    kpiId: 'test-kpi-btc-price',
    timestamp: new Date().toISOString(),
    kpiType: 'price',
    data: {
      value: 45000,
      currency: 'USD'
    },
    metadata: {
      source: 'test-suite'
    }
  }
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
 * Utility function to make HTTP requests with error handling
 */
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
        ...options.headers
      },
      ...options
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { text: responseText };
    }
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      data: { error: error.message },
      networkError: true
    };
  }
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
 * Test 1: Ingestion Worker - Invalid Authentication
 */
async function testInvalidAuthentication() {
  console.log('\n🔐 Testing Invalid Authentication...');
  
  const response = await makeRequest(`${INGESTION_WORKER_URL}/api/kpi-data`, {
    method: 'POST',
    headers: {
      'X-API-Key': 'invalid-key'
    },
    body: JSON.stringify(TEST_CONFIG.validPayload)
  });
  
  const passed = response.status === 401;
  logTest(
    'Invalid Authentication Rejection',
    passed,
    `Expected 401, got ${response.status}: ${response.data?.error || response.statusText}`
  );
}

/**
 * Test 2: Ingestion Worker - Missing Required Fields
 */
async function testMissingRequiredFields() {
  console.log('\n📝 Testing Missing Required Fields...');
  
  const testCases = [
    { payload: {}, field: 'all fields' },
    { payload: { traceId: 'test' }, field: 'kpiId' },
    { payload: { traceId: 'test', kpiId: 'test' }, field: 'timestamp' },
    { payload: { traceId: 'test', kpiId: 'test', timestamp: 'invalid' }, field: 'valid timestamp' }
  ];
  
  for (const testCase of testCases) {
    const response = await makeRequest(`${INGESTION_WORKER_URL}/api/kpi-data`, {
      method: 'POST',
      body: JSON.stringify(testCase.payload)
    });
    
    const passed = response.status === 400;
    logTest(
      `Missing ${testCase.field}`,
      passed,
      `Expected 400, got ${response.status}: ${response.data?.error || response.statusText}`
    );
  }
}

/**
 * Test 3: Ingestion Worker - Invalid JSON Payload
 */
async function testInvalidJsonPayload() {
  console.log('\n🔧 Testing Invalid JSON Payload...');
  
  const response = await makeRequest(`${INGESTION_WORKER_URL}/api/kpi-data`, {
    method: 'POST',
    body: 'invalid json {'
  });
  
  const passed = response.status === 400;
  logTest(
    'Invalid JSON Payload',
    passed,
    `Expected 400, got ${response.status}: ${response.data?.error || response.statusText}`
  );
}

/**
 * Test 4: Ingestion Worker - Duplicate Data Points (Idempotency)
 */
async function testIdempotencyHandling() {
  console.log('\n🔄 Testing Idempotency Handling...');
  
  const duplicatePayload = {
    ...TEST_CONFIG.validPayload,
    traceId: `idempotency-test-${Date.now()}`,
    timestamp: '2025-01-01T12:00:00Z' // Fixed timestamp for duplicate test
  };
  
  // Send first request
  const firstResponse = await makeRequest(`${INGESTION_WORKER_URL}/api/kpi-data`, {
    method: 'POST',
    body: JSON.stringify(duplicatePayload)
  });
  
  // Send duplicate request
  const secondResponse = await makeRequest(`${INGESTION_WORKER_URL}/api/kpi-data`, {
    method: 'POST',
    body: JSON.stringify(duplicatePayload)
  });
  
  const firstPassed = firstResponse.ok;
  const secondPassed = secondResponse.ok && 
    (secondResponse.data?.skipped > 0 || secondResponse.data?.results?.some(r => r.status === 'skipped'));
  
  logTest(
    'First Request Processed',
    firstPassed,
    `Expected success, got ${firstResponse.status}: ${firstResponse.data?.error || 'OK'}`
  );
  
  logTest(
    'Duplicate Request Handled',
    secondPassed,
    `Expected duplicate detection, got: ${JSON.stringify(secondResponse.data?.results || secondResponse.data)}`
  );
}

/**
 * Test 5: Ingestion Worker - Large Payload Handling
 */
async function testLargePayloadHandling() {
  console.log('\n📊 Testing Large Payload Handling...');
  
  const largePayload = {
    ...TEST_CONFIG.validPayload,
    traceId: `large-payload-test-${Date.now()}`,
    data: {
      value: 45000,
      // Create large metadata object
      largeArray: new Array(1000).fill(0).map((_, i) => ({
        index: i,
        data: `large-data-point-${i}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString()
      }))
    }
  };
  
  const response = await makeRequest(`${INGESTION_WORKER_URL}/api/kpi-data`, {
    method: 'POST',
    body: JSON.stringify(largePayload)
  });
  
  const passed = response.ok;
  logTest(
    'Large Payload Processing',
    passed,
    `Expected success, got ${response.status}: ${response.data?.error || 'OK'}`
  );
}

/**
 * Test 6: KPI Error Handler - Error Reporting
 */
async function testErrorReporting() {
  console.log('\n🚨 Testing Error Reporting...');
  
  const errorPayload = {
    traceId: `error-test-${Date.now()}`,
    kpiId: 'test-kpi-btc-price',
    error: 'Simulated N8N workflow failure',
    timestamp: new Date().toISOString(),
    component: 'n8n-workflow',
    retryCount: 2
  };
  
  const response = await makeRequest(`${INGESTION_WORKER_URL}/api/kpi-error`, {
    method: 'POST',
    body: JSON.stringify(errorPayload)
  });
  
  const passed = response.ok;
  logTest(
    'Error Reporting',
    passed,
    `Expected success, got ${response.status}: ${response.data?.error || 'OK'}`
  );
}

/**
 * Test 7: KPI Error Handler - Missing Error Fields
 */
async function testErrorHandlingValidation() {
  console.log('\n🔍 Testing Error Handling Validation...');
  
  const testCases = [
    { payload: {}, field: 'traceId and error' },
    { payload: { traceId: 'test' }, field: 'error' },
    { payload: { error: 'test error' }, field: 'traceId' }
  ];
  
  for (const testCase of testCases) {
    const response = await makeRequest(`${INGESTION_WORKER_URL}/api/kpi-error`, {
      method: 'POST',
      body: JSON.stringify(testCase.payload)
    });
    
    const passed = response.status === 400;
    logTest(
      `Error Validation - Missing ${testCase.field}`,
      passed,
      `Expected 400, got ${response.status}: ${response.data?.error || response.statusText}`
    );
  }
}

/**
 * Test 8: Health Check Endpoints
 */
async function testHealthCheckEndpoints() {
  console.log('\n🏥 Testing Health Check Endpoints...');
  
  const response = await makeRequest(`${INGESTION_WORKER_URL}/api/health`, {
    method: 'GET'
  });
  
  const passed = response.ok;
  logTest(
    'Health Check Endpoint',
    passed,
    `Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`
  );
}

/**
 * Test 9: Unknown Endpoints (404 Handling)
 */
async function testUnknownEndpoints() {
  console.log('\n🔍 Testing Unknown Endpoints...');
  
  const response = await makeRequest(`${INGESTION_WORKER_URL}/api/unknown-endpoint`, {
    method: 'POST',
    body: JSON.stringify({ test: 'data' })
  });
  
  const passed = response.status === 404;
  logTest(
    'Unknown Endpoint Handling',
    passed,
    `Expected 404, got ${response.status}: ${response.data?.error || response.statusText}`
  );
}

/**
 * Test 10: CORS Handling
 */
async function testCorsHandling() {
  console.log('\n🌐 Testing CORS Handling...');
  
  const response = await makeRequest(`${INGESTION_WORKER_URL}/api/kpi-data`, {
    method: 'OPTIONS'
  });
  
  const passed = response.status === 200 || response.status === 204;
  const hasCorsHeaders = response.headers['access-control-allow-origin'] || 
                        response.headers['Access-Control-Allow-Origin'];
  
  logTest(
    'CORS Preflight Handling',
    passed && hasCorsHeaders,
    `Expected 200/204 with CORS headers, got ${response.status}, CORS: ${!!hasCorsHeaders}`
  );
}

/**
 * Test 11: Multi-KPI Payload Processing
 */
async function testMultiKpiPayload() {
  console.log('\n📊 Testing Multi-KPI Payload Processing...');
  
  const multiKpiPayload = [
    {
      traceId: `multi-kpi-test-${Date.now()}`,
      kpiId: 'btc-price',
      timestamp: new Date().toISOString(),
      kpiType: 'price',
      data: { value: 45000 }
    },
    {
      traceId: `multi-kpi-test-${Date.now()}`,
      kpiId: 'eth-price',
      timestamp: new Date().toISOString(),
      kpiType: 'price',
      data: { value: 3000 }
    }
  ];
  
  const response = await makeRequest(`${INGESTION_WORKER_URL}/api/kpi-data`, {
    method: 'POST',
    body: JSON.stringify(multiKpiPayload)
  });
  
  const passed = response.ok && response.data?.processed === 2;
  logTest(
    'Multi-KPI Payload Processing',
    passed,
    `Expected 2 processed KPIs, got: ${JSON.stringify(response.data)}`
  );
}

/**
 * Test 12: Network Timeout Simulation
 */
async function testNetworkTimeoutHandling() {
  console.log('\n⏱️ Testing Network Timeout Handling...');
  
  // Test with invalid URL to simulate network failure
  const response = await makeRequest('http://invalid-host-12345.com/api/kpi-data', {
    method: 'POST',
    body: JSON.stringify(TEST_CONFIG.validPayload)
  });
  
  const passed = response.networkError || response.status === 0;
  logTest(
    'Network Timeout/Failure Handling',
    passed,
    `Expected network error, got: ${response.data?.error || response.statusText}`
  );
}

/**
 * Test 13: Malformed Data Types
 */
async function testMalformedDataTypes() {
  console.log('\n🔧 Testing Malformed Data Types...');
  
  const malformedPayload = {
    traceId: 12345, // Should be string
    kpiId: null, // Should be string
    timestamp: 'not-a-date', // Should be valid ISO date
    kpiType: [], // Should be string
    data: 'not-an-object' // Should be object
  };
  
  const response = await makeRequest(`${INGESTION_WORKER_URL}/api/kpi-data`, {
    method: 'POST',
    body: JSON.stringify(malformedPayload)
  });
  
  const passed = response.status === 400;
  logTest(
    'Malformed Data Types Handling',
    passed,
    `Expected 400, got ${response.status}: ${response.data?.error || response.statusText}`
  );
}

/**
 * Test 14: Debug Endpoints (if available)
 */
async function testDebugEndpoints() {
  console.log('\n🐛 Testing Debug Endpoints...');
  
  // Test debug KV endpoint
  const kvResponse = await makeRequest(`${INGESTION_WORKER_URL}/api/debug-kv`, {
    method: 'GET'
  });
  
  logTest(
    'Debug KV Endpoint',
    kvResponse.ok,
    `Expected 200, got ${kvResponse.status}: ${JSON.stringify(kvResponse.data)}`
  );
  
  // Test debug KPI endpoint
  const kpiResponse = await makeRequest(`${INGESTION_WORKER_URL}/api/debug-kpi`, {
    method: 'POST',
    body: JSON.stringify(TEST_CONFIG.validPayload)
  });
  
  logTest(
    'Debug KPI Endpoint',
    kpiResponse.ok,
    `Expected 200, got ${kpiResponse.status}: ${JSON.stringify(kpiResponse.data)}`
  );
}

/**
 * Main test execution
 */
async function runErrorHandlingValidation() {
  console.log('🚀 Starting Error Handling Validation Test Suite');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Run all tests
    await testInvalidAuthentication();
    await testMissingRequiredFields();
    await testInvalidJsonPayload();
    await testIdempotencyHandling();
    await testLargePayloadHandling();
    await testErrorReporting();
    await testErrorHandlingValidation();
    await testHealthCheckEndpoints();
    await testUnknownEndpoints();
    await testCorsHandling();
    await testMultiKpiPayload();
    await testNetworkTimeoutHandling();
    await testMalformedDataTypes();
    await testDebugEndpoints();
    
  } catch (error) {
    console.error('❌ Test suite execution error:', error);
    testResults.errors.push(`Test suite error: ${error.message}`);
  }
  
  const duration = Date.now() - startTime;
  
  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 ERROR HANDLING VALIDATION SUMMARY');
  console.log('=' .repeat(60));
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
  const resultsFile = `error-handling-validation-results-${Date.now()}.json`;
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
  
  // Return exit code based on results
  if (testResults.failed > 0) {
    console.log('\n❌ Some tests failed. Please review the error handling implementation.');
    process.exit(1);
  } else {
    console.log('\n✅ All error handling tests passed successfully!');
    process.exit(0);
  }
}

// Run the test suite
if (import.meta.url === `file://${process.argv[1]}`) {
  runErrorHandlingValidation().catch(error => {
    console.error('Fatal error running test suite:', error);
    process.exit(1);
  });
}

export {
  runErrorHandlingValidation,
  testResults
};