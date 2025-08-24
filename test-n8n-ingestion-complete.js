#!/usr/bin/env node

/**
 * Complete N8N to Ingestion Worker Flow Test
 * 
 * This script tests the complete data flow with proper authentication:
 * 1. Triggers N8N workflows with correct payloads
 * 2. Captures N8N responses (simulating real workflow data)
 * 3. Sends N8N response data to Ingestion Worker with proper API key
 * 4. Verifies data is processed and stored correctly
 * 5. Checks KV store operations via debug endpoints
 * 
 * Usage: node test-n8n-ingestion-complete.js
 */

import { writeFileSync } from 'fs';

// Configuration
const CONFIG = {
  // N8N Configuration
  N8N_WEBHOOKS: {
    'kpi-cmc': 'http://localhost:5678/webhook/kpi-cmc',
    'kpi-cbbi': 'http://localhost:5678/webhook/kpi-cbbi'
  },
  
  // Cloudflare Workers
  INGESTION_WORKER_URL: process.env.INGESTION_WORKER_URL || 'https://ingestion-worker.pohlipit.workers.dev',
  
  // API Keys - Use the correct API key from environment or default
  INGESTION_API_KEY: process.env.INGESTION_API_KEY || 'your-secure-api-key-here',
  
  // Test Configuration
  TEST_TIMEOUT: 60000 // 60 seconds
};

/**
 * Step 1: Trigger N8N workflows and capture responses
 */
async function triggerN8NWorkflows() {
  console.log('🎯 Step 1: Triggering N8N Workflows\n');
  
  const testTraceId = `complete-test-${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  console.log(`🆔 Test Trace ID: ${testTraceId}`);
  console.log(`⏰ Timestamp: ${timestamp}\n`);
  
  const workflowResponses = [];
  
  for (const [kpiId, webhookUrl] of Object.entries(CONFIG.N8N_WEBHOOKS)) {
    console.log(`📤 Triggering ${kpiId} workflow...`);
    console.log(`   Webhook: ${webhookUrl}`);
    
    try {
      // Create trigger payload
      const triggerPayload = {
        traceId: testTraceId,
        kpiId: kpiId,
        timestamp: timestamp,
        kpiType: kpiId === 'kpi-cmc' ? 'price' : 'index',
        metadata: {
          schedulerWorker: 'complete-test',
          environment: 'test',
          source: 'complete-flow-test'
        }
      };
      
      console.log(`   Sending trigger...`);
      
      const startTime = Date.now();
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Complete-Flow-Test/1.0'
        },
        body: JSON.stringify(triggerPayload)
      });
      
      const responseTime = Date.now() - startTime;
      
      let responseData;
      try {
        const responseText = await response.text();
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        responseData = { message: 'Non-JSON response', body: responseText };
      }
      
      const workflowResult = {
        kpiId,
        webhookUrl,
        triggerPayload,
        success: response.ok,
        status: response.status,
        responseTime,
        responseData,
        error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
      };
      
      workflowResponses.push(workflowResult);
      
      if (response.ok) {
        console.log(`   ✅ Triggered successfully (${responseTime}ms)`);
        console.log(`   Response data:`, JSON.stringify(responseData, null, 4));
      } else {
        console.log(`   ❌ Trigger failed (${response.status}) in ${responseTime}ms`);
        console.log(`   Error:`, JSON.stringify(responseData, null, 4));
      }
      
    } catch (error) {
      console.error(`   ❌ Network error: ${error.message}`);
      workflowResponses.push({
        kpiId,
        webhookUrl,
        success: false,
        error: error.message,
        responseTime: null
      });
    }
    
    console.log(''); // Add spacing
  }
  
  return {
    traceId: testTraceId,
    timestamp,
    workflowResponses
  };
}

/**
 * Step 2: Convert N8N responses to Ingestion Worker format and send
 */
async function sendDataToIngestionWorker(workflowResults) {
  console.log('📨 Step 2: Sending Data to Ingestion Worker\n');
  
  const ingestionResults = [];
  
  for (const workflowResult of workflowResults.workflowResponses) {
    if (!workflowResult.success) {
      console.log(`⏭️  Skipping ${workflowResult.kpiId} - workflow failed`);
      continue;
    }
    
    console.log(`📤 Processing ${workflowResult.kpiId} response for Ingestion Worker...`);
    
    try {
      // Convert N8N response to Ingestion Worker format
      const ingestionPayload = convertN8NResponseToIngestionFormat(
        workflowResult,
        workflowResults.traceId,
        workflowResults.timestamp
      );
      
      console.log(`   Ingestion payload:`, JSON.stringify(ingestionPayload, null, 4));
      
      // Send to Ingestion Worker
      const startTime = Date.now();
      const response = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/kpi-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': CONFIG.INGESTION_API_KEY,
          'User-Agent': 'Complete-Flow-Test/1.0'
        },
        body: JSON.stringify(ingestionPayload)
      });
      
      const responseTime = Date.now() - startTime;
      
      let responseData;
      try {
        const responseText = await response.text();
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        responseData = { message: 'Non-JSON response', body: responseText };
      }
      
      const ingestionResult = {
        kpiId: workflowResult.kpiId,
        success: response.ok,
        status: response.status,
        responseTime,
        responseData,
        error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
      };
      
      ingestionResults.push(ingestionResult);
      
      if (response.ok) {
        console.log(`   ✅ Ingestion successful (${responseTime}ms)`);
        console.log(`   Response:`, JSON.stringify(responseData, null, 4));
      } else {
        console.log(`   ❌ Ingestion failed (${response.status}) in ${responseTime}ms`);
        console.log(`   Error:`, JSON.stringify(responseData, null, 4));
      }
      
    } catch (error) {
      console.error(`   ❌ Ingestion error: ${error.message}`);
      ingestionResults.push({
        kpiId: workflowResult.kpiId,
        success: false,
        error: error.message,
        responseTime: null
      });
    }
    
    console.log(''); // Add spacing
  }
  
  return ingestionResults;
}

/**
 * Convert N8N workflow response to Ingestion Worker format
 */
function convertN8NResponseToIngestionFormat(workflowResult, traceId, timestamp) {
  const { kpiId, responseData } = workflowResult;
  
  // Handle different N8N response formats
  if (responseData.kpiType === 'cmc-multi' && responseData.kpiIds && responseData.data) {
    // Multi-KPI response from CMC workflow - convert to individual KPI updates
    const kpiUpdates = [];
    
    for (const individualKpiId of responseData.kpiIds) {
      if (responseData.data[individualKpiId] !== undefined) {
        kpiUpdates.push({
          traceId: traceId,
          kpiId: individualKpiId,
          timestamp: responseData.timestamp || timestamp,
          kpiType: 'price', // CMC data is price type
          data: {
            value: responseData.data[individualKpiId],
            source: 'coinmarketcap',
            originalKpiId: kpiId
          },
          metadata: {
            source: 'n8n-workflow',
            originalResponse: responseData,
            workflowKpiId: kpiId
          }
        });
      }
    }
    
    return kpiUpdates; // Return array for multi-KPI
  } else {
    // Single KPI response or simple response
    return {
      traceId: traceId,
      kpiId: kpiId,
      timestamp: responseData.timestamp || timestamp,
      kpiType: kpiId === 'kpi-cmc' ? 'price' : 'index',
      data: responseData,
      metadata: {
        source: 'n8n-workflow',
        originalKpiId: kpiId
      }
    };
  }
}

/**
 * Step 3: Verify KV store operations using debug endpoints
 */
async function verifyKVStoreOperations(traceId) {
  console.log('🔍 Step 3: Verifying KV Store Operations\n');
  
  console.log(`   Trace ID: ${traceId}`);
  
  const verificationResults = {
    kvBindings: null,
    debugKPI: null
  };
  
  try {
    // Test KV bindings
    console.log('📊 Testing KV bindings...');
    const kvResponse = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/debug-kv`, {
      method: 'GET',
      headers: { 'User-Agent': 'Complete-Flow-Test/1.0' }
    });
    
    if (kvResponse.ok) {
      const kvData = await kvResponse.json();
      verificationResults.kvBindings = kvData;
      console.log('   ✅ KV bindings test successful');
      console.log('   Results:', JSON.stringify(kvData, null, 4));
    } else {
      console.log(`   ❌ KV bindings test failed: ${kvResponse.status}`);
      verificationResults.kvBindings = { error: `HTTP ${kvResponse.status}` };
    }
    
  } catch (error) {
    console.log(`   ❌ KV bindings test error: ${error.message}`);
    verificationResults.kvBindings = { error: error.message };
  }
  
  try {
    // Test KPI processing with sample data
    console.log('\n🧪 Testing KPI processing...');
    const testKPIPayload = {
      traceId: traceId,
      kpiId: 'debug-test-kpi',
      timestamp: new Date().toISOString(),
      kpiType: 'test',
      data: {
        value: 123.45,
        metadata: { test: true }
      },
      metadata: {
        source: 'debug-test'
      }
    };
    
    const debugResponse = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/debug-kpi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Complete-Flow-Test/1.0'
      },
      body: JSON.stringify(testKPIPayload)
    });
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      verificationResults.debugKPI = debugData;
      console.log('   ✅ KPI processing test successful');
      console.log('   Results:', JSON.stringify(debugData, null, 4));
    } else {
      console.log(`   ❌ KPI processing test failed: ${debugResponse.status}`);
      const errorText = await debugResponse.text();
      verificationResults.debugKPI = { error: `HTTP ${debugResponse.status}: ${errorText}` };
    }
    
  } catch (error) {
    console.log(`   ❌ KPI processing test error: ${error.message}`);
    verificationResults.debugKPI = { error: error.message };
  }
  
  console.log('');
  return verificationResults;
}

/**
 * Step 4: Generate comprehensive test report
 */
async function generateTestReport(testResults) {
  console.log('📊 Step 4: Generating Test Report\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    testDuration: Date.now() - parseInt(testResults.workflowResults.traceId.split('-')[2]),
    traceId: testResults.workflowResults.traceId,
    configuration: {
      n8nWebhooks: CONFIG.N8N_WEBHOOKS,
      ingestionWorkerUrl: CONFIG.INGESTION_WORKER_URL,
      apiKeyConfigured: !!CONFIG.INGESTION_API_KEY
    },
    results: testResults,
    summary: {
      workflowsTriggered: testResults.workflowResults.workflowResponses.filter(w => w.success).length,
      totalWorkflows: testResults.workflowResults.workflowResponses.length,
      ingestionSuccessful: testResults.ingestionResults.filter(i => i.success).length,
      totalIngestionAttempts: testResults.ingestionResults.length,
      kvOperationsWorking: testResults.kvVerification.kvBindings?.tests ? 
        Object.values(testResults.kvVerification.kvBindings.tests).filter(t => t.put === 'success').length : 0,
      overallSuccess: false
    },
    issues: [],
    recommendations: []
  };
  
  // Calculate overall success
  report.summary.overallSuccess = (
    report.summary.workflowsTriggered > 0 &&
    report.summary.ingestionSuccessful > 0 &&
    report.summary.kvOperationsWorking > 0
  );
  
  // Identify issues and recommendations
  if (report.summary.workflowsTriggered === 0) {
    report.issues.push('No N8N workflows triggered successfully');
    report.recommendations.push('Check N8N connectivity and webhook configurations');
  }
  
  if (report.summary.ingestionSuccessful === 0) {
    report.issues.push('No data successfully ingested');
    report.recommendations.push('Check Ingestion Worker API key configuration');
    report.recommendations.push('Verify Ingestion Worker endpoints are accessible');
  }
  
  if (report.summary.kvOperationsWorking === 0) {
    report.issues.push('KV store operations not working');
    report.recommendations.push('Check Cloudflare KV namespace bindings');
    report.recommendations.push('Verify KV store permissions and configuration');
  }
  
  // Save report
  const reportFilename = `n8n-ingestion-complete-test-${Date.now()}.json`;
  writeFileSync(reportFilename, JSON.stringify(report, null, 2));
  
  // Display summary
  console.log('=' .repeat(60));
  console.log('📊 COMPLETE FLOW TEST REPORT');
  console.log('=' .repeat(60));
  console.log(`   Test Duration: ${Math.round(report.testDuration / 1000)}s`);
  console.log(`   Trace ID: ${report.traceId}`);
  console.log(`   N8N Workflows: ${report.summary.workflowsTriggered}/${report.summary.totalWorkflows} successful`);
  console.log(`   Data Ingestion: ${report.summary.ingestionSuccessful}/${report.summary.totalIngestionAttempts} successful`);
  console.log(`   KV Operations: ${report.summary.kvOperationsWorking} working`);
  console.log(`   Overall Success: ${report.summary.overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (report.issues.length > 0) {
    console.log('\n❌ ISSUES IDENTIFIED:');
    report.issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }
  
  if (report.recommendations.length > 0) {
    console.log('\n🔧 RECOMMENDATIONS:');
    report.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
  }
  
  console.log('\n🎯 VERIFICATION STEPS:');
  console.log(`   1. Check Cloudflare KV browser for trace ID: ${report.traceId}`);
  console.log('   2. Look for keys matching patterns:');
  console.log(`      - job:${report.traceId}`);
  console.log(`      - timeseries:* (updated with new data)`);
  console.log(`      - package:${report.traceId}:*`);
  console.log('   3. Review N8N execution logs');
  console.log('   4. Check Ingestion Worker logs in Cloudflare dashboard');
  
  console.log(`\n📄 Full report saved to: ${reportFilename}`);
  
  return report;
}

/**
 * Run complete test flow
 */
async function runCompleteTest() {
  console.log('🚀 Complete N8N to Ingestion Worker Flow Test\n');
  console.log('=' .repeat(60));
  console.log('Testing complete data flow from N8N workflows to Ingestion Worker');
  console.log('=' .repeat(60));
  console.log('');
  
  try {
    // Step 1: Trigger N8N workflows
    const workflowResults = await triggerN8NWorkflows();
    
    // Step 2: Send data to Ingestion Worker
    const ingestionResults = await sendDataToIngestionWorker(workflowResults);
    
    // Step 3: Verify KV store operations
    const kvVerification = await verifyKVStoreOperations(workflowResults.traceId);
    
    // Step 4: Generate report
    const testResults = {
      workflowResults,
      ingestionResults,
      kvVerification
    };
    
    const report = await generateTestReport(testResults);
    
    return report;
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'test';
  
  try {
    switch (command) {
      case 'test':
        await runCompleteTest();
        break;
        
      case 'help':
      default:
        console.log('🚀 Complete N8N to Ingestion Worker Flow Test\n');
        console.log('Available commands:');
        console.log('  test - Run complete flow test (default)');
        console.log('  help - Show this help message');
        console.log('\nEnvironment Variables:');
        console.log('  INGESTION_API_KEY - API key for Ingestion Worker authentication');
        console.log('  INGESTION_WORKER_URL - Ingestion Worker URL');
        console.log('\nThis test verifies:');
        console.log('  ✓ N8N workflows receive triggers and respond with data');
        console.log('  ✓ Data is properly formatted and sent to Ingestion Worker');
        console.log('  ✓ Ingestion Worker processes data with correct authentication');
        console.log('  ✓ KV store operations work correctly');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runCompleteTest };