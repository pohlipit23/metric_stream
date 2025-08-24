#!/usr/bin/env node

/**
 * KPI Registry Integration Test with Real N8N Instance
 * Tests the complete KPI Registry implementation using actual N8N webhooks
 * Following architecture guidelines - no mocks, real N8N integration
 */

import fetch from 'node-fetch';

console.log('🚀 KPI Registry Integration Test with N8N');
console.log('==========================================\n');

// Test configuration using real N8N development webhooks
const TEST_CONFIG = {
  n8nBaseUrl: 'http://localhost:5678',
  adminConsoleUrl: 'http://localhost:8787',
  frontendUrl: 'http://localhost:5173',
  registeredWebhooks: [
    'http://localhost:5678/webhook/cbbi-multi',
    'http://localhost:5678/webhook/kpi-cmc'
  ]
};

const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

/**
 * Test N8N connectivity and webhook availability
 */
async function testN8NConnectivity() {
  console.log('🔗 Testing N8N Connectivity...\n');
  
  try {
    // Test N8N health
    const healthResponse = await fetch(`${TEST_CONFIG.n8nBaseUrl}/healthz`);
    const healthData = await healthResponse.json();
    logTest('N8N Health Check', healthData.status === 'ok', `Status: ${healthData.status}`);
    
    // Test registered webhooks
    for (const webhookUrl of TEST_CONFIG.registeredWebhooks) {
      try {
        const testPayload = {
          test: true,
          timestamp: new Date().toISOString(),
          source: 'kpi-registry-test'
        };
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload)
        });
        
        logTest(`Webhook accessible: ${webhookUrl}`, 
          response.status < 500, 
          `Status: ${response.status}`);
          
      } catch (error) {
        logTest(`Webhook accessible: ${webhookUrl}`, false, error.message);
      }
    }
    
  } catch (error) {
    logTest('N8N Health Check', false, error.message);
  }
}

/**
 * Test Admin Console Worker API
 */
async function testAdminConsoleAPI() {
  console.log('\n⚙️ Testing Admin Console Worker API...\n');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${TEST_CONFIG.adminConsoleUrl}/health`);
    const healthData = await healthResponse.json();
    logTest('Admin Console Health', healthResponse.ok, `Status: ${healthResponse.status}`);
    
    // Test KPI list endpoint
    const kpiListResponse = await fetch(`${TEST_CONFIG.adminConsoleUrl}/api/kpis`);
    logTest('KPI List Endpoint', kpiListResponse.ok, `Status: ${kpiListResponse.status}`);
    
    if (kpiListResponse.ok) {
      const kpiData = await kpiListResponse.json();
      logTest('KPI List Response Format', 
        kpiData.hasOwnProperty('data') || Array.isArray(kpiData.data), 
        `Response has data property`);
    }
    
  } catch (error) {
    logTest('Admin Console API', false, error.message);
  }
}

/**
 * Test KPI Creation with Real N8N Webhooks
 */
async function testKPICreationWithN8N() {
  console.log('\n📝 Testing KPI Creation with Real N8N Webhooks...\n');
  
  const testKPIs = [
    {
      name: 'CBBI Multi Test KPI',
      description: 'Test KPI using real CBBI Multi webhook',
      webhook_url: 'http://localhost:5678/webhook/cbbi-multi',
      analysis_config: {
        chart_method: 'external',
        chart_type: 'line',
        llm_priority: 'standard',
        retention_days: 365,
        alert_high: 80,
        alert_low: 20
      },
      active: true
    },
    {
      name: 'CMC KPI Test',
      description: 'Test KPI using real CMC webhook',
      webhook_url: 'http://localhost:5678/webhook/kpi-cmc',
      analysis_config: {
        chart_method: 'n8n',
        chart_type: 'candlestick',
        llm_priority: 'high',
        retention_days: 180,
        custom_prompt: 'Analyze cryptocurrency market trends'
      },
      active: true
    }
  ];
  
  const createdKPIs = [];
  
  for (const kpiData of testKPIs) {
    try {
      // Create KPI
      const createResponse = await fetch(`${TEST_CONFIG.adminConsoleUrl}/api/kpis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kpiData)
      });
      
      if (createResponse.ok) {
        const createdKPI = await createResponse.json();
        createdKPIs.push(createdKPI.data);
        logTest(`Create KPI: ${kpiData.name}`, true, `ID: ${createdKPI.data.id}`);
        
        // Test webhook connectivity for created KPI
        await testWebhookConnectivity(kpiData.webhook_url, createdKPI.data.id);
        
      } else {
        const errorData = await createResponse.json();
        logTest(`Create KPI: ${kpiData.name}`, false, 
          `Status: ${createResponse.status}, Error: ${errorData.error}`);
      }
      
    } catch (error) {
      logTest(`Create KPI: ${kpiData.name}`, false, error.message);
    }
  }
  
  return createdKPIs;
}

/**
 * Test webhook connectivity for a specific KPI
 */
async function testWebhookConnectivity(webhookUrl, kpiId) {
  try {
    const testPayload = {
      trace_id: `test-${Date.now()}`,
      kpi_id: kpiId,
      timestamp: new Date().toISOString(),
      test: true,
      data: {
        value: Math.random() * 100,
        metadata: {
          source: 'integration-test',
          test_run: true
        }
      }
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    
    logTest(`Webhook Test: ${webhookUrl}`, 
      response.status < 500, 
      `Status: ${response.status} for KPI ${kpiId}`);
      
  } catch (error) {
    logTest(`Webhook Test: ${webhookUrl}`, false, error.message);
  }
}

/**
 * Test KPI CRUD operations
 */
async function testKPICRUDOperations(createdKPIs) {
  console.log('\n🔄 Testing KPI CRUD Operations...\n');
  
  if (createdKPIs.length === 0) {
    logTest('CRUD Operations', false, 'No KPIs created to test with');
    return;
  }
  
  const testKPI = createdKPIs[0];
  
  try {
    // Test GET specific KPI
    const getResponse = await fetch(`${TEST_CONFIG.adminConsoleUrl}/api/kpis/${testKPI.id}`);
    logTest('Get Specific KPI', getResponse.ok, `Status: ${getResponse.status}`);
    
    // Test UPDATE KPI
    const updateData = {
      ...testKPI,
      description: 'Updated description via integration test',
      analysis_config: {
        ...testKPI.analysis_config,
        llm_priority: 'low'
      }
    };
    
    const updateResponse = await fetch(`${TEST_CONFIG.adminConsoleUrl}/api/kpis/${testKPI.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    logTest('Update KPI', updateResponse.ok, `Status: ${updateResponse.status}`);
    
    // Test validation with invalid data
    const invalidData = {
      name: '', // Invalid: empty name
      webhook_url: 'not-a-url', // Invalid: not a URL
      analysis_config: {
        retention_days: 10 // Invalid: below minimum
      }
    };
    
    const validationResponse = await fetch(`${TEST_CONFIG.adminConsoleUrl}/api/kpis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData)
    });
    
    logTest('Validation Handling', 
      !validationResponse.ok && validationResponse.status === 400,
      `Status: ${validationResponse.status} (should be 400)`);
    
  } catch (error) {
    logTest('CRUD Operations', false, error.message);
  }
}

/**
 * Test Frontend Integration
 */
async function testFrontendIntegration() {
  console.log('\n🎨 Testing Frontend Integration...\n');
  
  try {
    // Test frontend accessibility
    const frontendResponse = await fetch(TEST_CONFIG.frontendUrl);
    logTest('Frontend Accessible', frontendResponse.ok, `Status: ${frontendResponse.status}`);
    
    // Test API proxy through frontend
    const proxyResponse = await fetch(`${TEST_CONFIG.frontendUrl}/api/kpis`);
    logTest('Frontend API Proxy', proxyResponse.ok, `Status: ${proxyResponse.status}`);
    
  } catch (error) {
    logTest('Frontend Integration', false, error.message);
  }
}

/**
 * Test Analysis Configuration Validation
 */
async function testAnalysisConfigValidation() {
  console.log('\n🧪 Testing Analysis Configuration Validation...\n');
  
  const validationTests = [
    {
      name: 'Valid External Chart Config',
      config: {
        chart_method: 'external',
        chart_type: 'line',
        llm_priority: 'standard',
        retention_days: 365
      },
      shouldPass: true
    },
    {
      name: 'Invalid Chart Method',
      config: {
        chart_method: 'invalid-method',
        chart_type: 'line'
      },
      shouldPass: false
    },
    {
      name: 'Invalid Retention Days',
      config: {
        chart_method: 'external',
        retention_days: 10 // Below minimum of 30
      },
      shouldPass: false
    },
    {
      name: 'Invalid Alert Thresholds',
      config: {
        chart_method: 'external',
        alert_high: 20,
        alert_low: 80 // High should be greater than low
      },
      shouldPass: false
    }
  ];
  
  for (const test of validationTests) {
    try {
      const testKPI = {
        name: `Validation Test: ${test.name}`,
        webhook_url: 'http://localhost:5678/webhook/cbbi-multi',
        analysis_config: test.config,
        active: true
      };
      
      const response = await fetch(`${TEST_CONFIG.adminConsoleUrl}/api/kpis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testKPI)
      });
      
      const passed = test.shouldPass ? response.ok : !response.ok;
      logTest(test.name, passed, 
        `Expected ${test.shouldPass ? 'success' : 'failure'}, got ${response.status}`);
      
      // Clean up if created successfully
      if (response.ok && test.shouldPass) {
        const created = await response.json();
        await fetch(`${TEST_CONFIG.adminConsoleUrl}/api/kpis/${created.data.id}`, {
          method: 'DELETE'
        });
      }
      
    } catch (error) {
      logTest(test.name, false, error.message);
    }
  }
}

/**
 * Cleanup created test KPIs
 */
async function cleanupTestKPIs(createdKPIs) {
  console.log('\n🧹 Cleaning up test KPIs...\n');
  
  for (const kpi of createdKPIs) {
    try {
      const deleteResponse = await fetch(`${TEST_CONFIG.adminConsoleUrl}/api/kpis/${kpi.id}`, {
        method: 'DELETE'
      });
      
      logTest(`Cleanup KPI: ${kpi.name}`, deleteResponse.ok, `Status: ${deleteResponse.status}`);
      
    } catch (error) {
      logTest(`Cleanup KPI: ${kpi.name}`, false, error.message);
    }
  }
}

/**
 * Main test execution
 */
async function runIntegrationTests() {
  console.log('Starting comprehensive integration tests with real N8N instance...\n');
  
  // Test N8N connectivity
  await testN8NConnectivity();
  
  // Test Admin Console API
  await testAdminConsoleAPI();
  
  // Test KPI creation with real webhooks
  const createdKPIs = await testKPICreationWithN8N();
  
  // Test CRUD operations
  await testKPICRUDOperations(createdKPIs);
  
  // Test frontend integration
  await testFrontendIntegration();
  
  // Test analysis configuration validation
  await testAnalysisConfigValidation();
  
  // Cleanup
  await cleanupTestKPIs(createdKPIs);
  
  // Print summary
  console.log('\n📊 Integration Test Summary');
  console.log('===========================');
  console.log(`Total Tests: ${testResults.tests.length}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%\n`);
  
  if (testResults.failed > 0) {
    console.log('❌ Failed Tests:');
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   - ${test.name}: ${test.details}`);
      });
    console.log();
  }
  
  // Test status
  if (testResults.failed === 0) {
    console.log('🎉 All integration tests passed! KPI Registry is working correctly with N8N.');
  } else {
    console.log('⚠️  Some tests failed. Review the issues above.');
  }
  
  console.log('\n🔗 Test Environment:');
  console.log(`N8N Instance: ${TEST_CONFIG.n8nBaseUrl}`);
  console.log(`Admin Console: ${TEST_CONFIG.adminConsoleUrl}`);
  console.log(`Frontend: ${TEST_CONFIG.frontendUrl}`);
  console.log(`Registered Webhooks: ${TEST_CONFIG.registeredWebhooks.join(', ')}`);
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
runIntegrationTests().catch(console.error);