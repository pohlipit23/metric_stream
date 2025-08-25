#!/usr/bin/env node

/**
 * Comprehensive End-to-End Development Environment Testing
 * Tests the complete data pipeline with real N8N workflows
 */

const config = {
  schedulerWorkerUrl: 'https://scheduler-worker.pohlipit.workers.dev',
  ingestionWorkerUrl: 'https://ingestion-worker.pohlipit.workers.dev',
  orchestrationWorkerUrl: 'https://orchestration-worker.pohlipit.workers.dev',
  adminConsoleWorkerUrl: 'https://admin-console-worker.pohlipit.workers.dev',
  n8nBaseUrl: 'http://localhost:5678',
  testTraceId: `test-${Date.now()}`,
  testApiKey: 'dev-test-api-key-2025',
  adminApiKey: 'admin-dev-api-key-2025'
};

/**
 * Test 1: Trigger Scheduler Worker manually
 */
async function testSchedulerWorker() {
  console.log('\n🚀 Testing Scheduler Worker...');
  
  try {
    // Trigger the scheduler worker manually via HTTP request
    const response = await fetch(config.schedulerWorkerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.testApiKey
      },
      body: JSON.stringify({
        trigger: 'manual',
        testMode: true,
        traceId: config.testTraceId
      })
    });

    const result = await response.text();
    console.log(`📊 Scheduler Response (${response.status}):`, result);

    if (response.ok) {
      console.log('✅ Scheduler Worker triggered successfully');
      return { success: true, traceId: config.testTraceId };
    } else {
      console.log('❌ Scheduler Worker failed');
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Error triggering Scheduler Worker:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Check if N8N webhooks are accessible
 */
async function testN8NWebhooks() {
  console.log('\n🔗 Testing N8N Webhook Connectivity...');
  
  const webhooks = [
    'http://localhost:5678/webhook/cbbi-multi',
    'http://localhost:5678/webhook/kpi-cmc'
  ];

  const results = [];

  for (const webhook of webhooks) {
    try {
      console.log(`Testing webhook: ${webhook}`);
      
      const response = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          traceId: config.testTraceId,
          kpiId: webhook.includes('cbbi-multi') ? 'cbbi-multi' : 'kpi-cmc',
          test: true
        })
      });

      const result = await response.text();
      console.log(`📊 Webhook Response (${response.status}):`, result.substring(0, 200));

      results.push({
        webhook,
        status: response.status,
        success: response.status !== 404,
        response: result
      });

    } catch (error) {
      console.error(`❌ Error testing webhook ${webhook}:`, error.message);
      results.push({
        webhook,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Test 3: Simulate KPI data ingestion
 */
async function testDataIngestion() {
  console.log('\n📥 Testing Data Ingestion...');
  
  const testData = [
    {
      kpiId: 'cbbi-multi',
      traceId: config.testTraceId,
      timestamp: new Date().toISOString(),
      kpiType: 'multi-indicator',
      data: {
        'btc-price-usd': 120000,
        'rhodl': 0.75,
        'confidence': 65
      },
      metadata: {
        source: 'test-simulation',
        testMode: true
      }
    },
    {
      kpiId: 'kpi-cmc',
      traceId: config.testTraceId,
      timestamp: new Date().toISOString(),
      kpiType: 'price',
      data: {
        value: 119500,
        volume: 25000000000
      },
      metadata: {
        source: 'test-simulation',
        testMode: true
      }
    }
  ];

  const results = [];

  for (const data of testData) {
    try {
      console.log(`Ingesting data for KPI: ${data.kpiId}`);
      
      const response = await fetch(`${config.ingestionWorkerUrl}/api/kpi-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.testApiKey
        },
        body: JSON.stringify(data)
      });

      const result = await response.text();
      console.log(`📊 Ingestion Response (${response.status}):`, result);

      results.push({
        kpiId: data.kpiId,
        status: response.status,
        success: response.ok,
        response: result
      });

    } catch (error) {
      console.error(`❌ Error ingesting data for ${data.kpiId}:`, error.message);
      results.push({
        kpiId: data.kpiId,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Test 4: Check KV store data
 */
async function testKVStoreData() {
  console.log('\n🗄️ Testing KV Store Data...');
  
  try {
    // Check if we can access the admin console to verify KV data
    const response = await fetch(`${config.adminConsoleWorkerUrl}/api/kpis`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.adminApiKey
      }
    });

    const result = await response.text();
    console.log(`📊 KPI Registry Response (${response.status}):`, result);

    if (response.ok) {
      const data = JSON.parse(result);
      console.log('✅ KV Store accessible via Admin Console');
      console.log(`📋 Found ${data.kpis ? data.kpis.length : 0} KPIs in registry`);
      return { success: true, data };
    } else {
      console.log('❌ KV Store access failed');
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Error accessing KV Store:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 5: Check Orchestration Worker status
 */
async function testOrchestrationWorker() {
  console.log('\n🎯 Testing Orchestration Worker...');
  
  try {
    const response = await fetch(`${config.orchestrationWorkerUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.text();
    console.log(`📊 Orchestration Health Response (${response.status}):`, result);

    if (response.ok) {
      console.log('✅ Orchestration Worker is healthy');
      return { success: true, response: result };
    } else {
      console.log('❌ Orchestration Worker health check failed');
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Error checking Orchestration Worker:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main test execution
 */
async function runEndToEndTests() {
  console.log('🧪 Starting Comprehensive End-to-End Development Environment Testing');
  console.log(`🆔 Test Trace ID: ${config.testTraceId}`);
  console.log('=' .repeat(80));

  const testResults = {
    timestamp: new Date().toISOString(),
    traceId: config.testTraceId,
    tests: {}
  };

  // Test 1: Scheduler Worker
  testResults.tests.scheduler = await testSchedulerWorker();
  
  // Test 2: N8N Webhooks
  testResults.tests.n8nWebhooks = await testN8NWebhooks();
  
  // Test 3: Data Ingestion
  testResults.tests.dataIngestion = await testDataIngestion();
  
  // Test 4: KV Store
  testResults.tests.kvStore = await testKVStoreData();
  
  // Test 5: Orchestration Worker
  testResults.tests.orchestration = await testOrchestrationWorker();

  // Summary
  console.log('\n' + '=' .repeat(80));
  console.log('📋 TEST SUMMARY');
  console.log('=' .repeat(80));

  const testNames = Object.keys(testResults.tests);
  let successCount = 0;

  testNames.forEach(testName => {
    const test = testResults.tests[testName];
    const success = Array.isArray(test) ? 
      test.some(t => t.success) : 
      test.success;
    
    console.log(`${success ? '✅' : '❌'} ${testName}: ${success ? 'PASSED' : 'FAILED'}`);
    if (success) successCount++;
  });

  const successRate = (successCount / testNames.length * 100).toFixed(1);
  console.log(`\n🎯 Overall Success Rate: ${successRate}% (${successCount}/${testNames.length})`);

  // Save results
  const fs = require('fs');
  const filename = `end-to-end-test-results-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(testResults, null, 2));
  console.log(`💾 Results saved to: ${filename}`);

  return testResults;
}

// Run tests if called directly
if (require.main === module) {
  runEndToEndTests().catch(console.error);
}

module.exports = { runEndToEndTests, config };