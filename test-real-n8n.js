#!/usr/bin/env node

/**
 * Real N8N Integration Test
 * 
 * This script tests the actual N8N integration by:
 * 1. Manually triggering the Scheduler Worker
 * 2. Monitoring for webhook calls to N8N
 * 3. Verifying data flow to Ingestion Worker
 */

import { readFileSync } from 'fs';

// Real worker URLs
const CONFIG = {
  INGESTION_WORKER_URL: 'https://ingestion-worker.pohlipit.workers.dev',
  SCHEDULER_WORKER_URL: 'https://scheduler-worker.pohlipit.workers.dev',
  N8N_BASE_URL: 'https://n8n.pohlipit.com'
};

/**
 * Test the health of all workers
 */
async function testWorkerHealth() {
  console.log('🔍 Testing worker health...');
  
  const workers = [
    { name: 'Ingestion Worker', url: `${CONFIG.INGESTION_WORKER_URL}/api/health` },
    { name: 'Scheduler Worker', url: `${CONFIG.SCHEDULER_WORKER_URL}/api/health` }
  ];
  
  for (const worker of workers) {
    try {
      const response = await fetch(worker.url);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${worker.name}: Healthy`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Environment: ${data.environment}`);
      } else {
        console.log(`❌ ${worker.name}: Unhealthy (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${worker.name}: Error - ${error.message}`);
    }
  }
}

/**
 * Manually trigger the scheduler worker
 */
async function triggerScheduler() {
  console.log('🎯 Manually triggering Scheduler Worker...');
  
  try {
    // Since the scheduler is normally triggered by cron, we need to call it directly
    // The scheduler worker should have a manual trigger endpoint or we can invoke the scheduled handler
    
    const response = await fetch(`${CONFIG.SCHEDULER_WORKER_URL}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Manual-Test-Script/1.0'
      },
      body: JSON.stringify({
        type: 'scheduled',
        scheduledTime: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Scheduler triggered successfully');
      console.log(`   Trace ID: ${result.traceId}`);
      console.log(`   KPIs triggered: ${result.kpiCount}`);
      console.log(`   Success count: ${result.successCount}`);
      console.log(`   Failure count: ${result.failureCount}`);
      
      return result;
    } else {
      const errorText = await response.text();
      console.log(`❌ Failed to trigger scheduler: ${response.status}`);
      console.log(`   Error: ${errorText}`);
      return null;
    }
    
  } catch (error) {
    console.log(`❌ Error triggering scheduler: ${error.message}`);
    return null;
  }
}

/**
 * Test N8N webhook endpoints
 */
async function testN8NWebhooks() {
  console.log('📡 Testing N8N webhook endpoints...');
  
  const webhooks = [
    'https://n8n.pohlipit.com/webhook/test-btc-price',
    'https://n8n.pohlipit.com/webhook/test-mvrv-score'
  ];
  
  for (const webhook of webhooks) {
    try {
      console.log(`📡 Testing webhook: ${webhook}`);
      
      const testPayload = {
        traceId: `manual-test-${Date.now()}`,
        kpiId: webhook.includes('btc-price') ? 'test-btc-price' : 'test-mvrv-score',
        timestamp: new Date().toISOString(),
        kpiType: webhook.includes('btc-price') ? 'price' : 'ratio',
        metadata: {
          source: 'manual-test',
          testRun: true
        }
      };
      
      const response = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Manual-Test-Script/1.0'
        },
        body: JSON.stringify(testPayload)
      });
      
      if (response.ok) {
        const result = await response.text();
        console.log(`✅ Webhook responded successfully`);
        console.log(`   Response: ${result}`);
      } else {
        console.log(`❌ Webhook failed: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      console.log(`❌ Webhook error: ${error.message}`);
    }
  }
}

/**
 * Monitor KV stores for data updates
 */
async function monitorKVStores(traceId) {
  console.log('📊 Monitoring KV stores for data updates...');
  console.log(`   Trace ID: ${traceId}`);
  
  // Note: We can't directly access KV stores from this script
  // But we can check the ingestion worker logs or create a monitoring endpoint
  
  console.log('📊 To monitor KV stores:');
  console.log('   1. Check Cloudflare dashboard for KV store contents');
  console.log('   2. Look for keys like:');
  console.log(`      - job:${traceId}`);
  console.log(`      - package:${traceId}:test-btc-price`);
  console.log(`      - package:${traceId}:test-mvrv-score`);
  console.log(`      - timeseries:test-btc-price`);
  console.log(`      - timeseries:test-mvrv-score`);
}

/**
 * Send test data directly to ingestion worker
 */
async function sendTestDataToIngestion() {
  console.log('📤 Sending test data to Ingestion Worker...');
  
  const testTraceId = `manual-test-${Date.now()}`;
  const testData = {
    traceId: testTraceId,
    kpiId: 'test-btc-price',
    timestamp: new Date().toISOString(),
    kpiType: 'price',
    data: {
      value: 45000 + Math.random() * 5000,
      volume: 1000000000
    },
    metadata: {
      source: 'manual-test-direct',
      testRun: true
    },
    chart: {
      url: `https://example.com/charts/btc-price-${Date.now()}.png`,
      type: 'line'
    }
  };
  
  try {
    const response = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/kpi-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Manual-Test-Script/1.0'
      },
      body: JSON.stringify(testData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test data sent successfully');
      console.log(`   Processed: ${result.processed}`);
      console.log(`   Skipped: ${result.skipped}`);
      console.log(`   Errors: ${result.errors}`);
      return testTraceId;
    } else {
      const errorData = await response.json();
      console.log(`❌ Failed to send test data: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(errorData, null, 2)}`);
      return null;
    }
    
  } catch (error) {
    console.log(`❌ Error sending test data: ${error.message}`);
    return null;
  }
}

/**
 * Main test execution
 */
async function runRealN8NTest() {
  console.log('🚀 Starting Real N8N Integration Test\n');
  
  try {
    // Step 1: Test worker health
    await testWorkerHealth();
    console.log('');
    
    // Step 2: Test N8N webhooks directly
    await testN8NWebhooks();
    console.log('');
    
    // Step 3: Send test data to ingestion worker
    const testTraceId = await sendTestDataToIngestion();
    console.log('');
    
    // Step 4: Trigger the scheduler
    const schedulerResult = await triggerScheduler();
    console.log('');
    
    // Step 5: Monitor for results
    if (schedulerResult && schedulerResult.traceId) {
      await monitorKVStores(schedulerResult.traceId);
    } else if (testTraceId) {
      await monitorKVStores(testTraceId);
    }
    
    console.log('\n📋 Test Summary:');
    console.log('✅ Worker health checks completed');
    console.log('✅ N8N webhook tests completed');
    console.log('✅ Direct ingestion test completed');
    console.log('✅ Scheduler trigger attempted');
    
    console.log('\n🔍 Next Steps:');
    console.log('1. Check N8N instance logs for webhook reception');
    console.log('2. Monitor Cloudflare KV stores for data updates');
    console.log('3. Check worker logs in Cloudflare dashboard');
    console.log('4. Verify N8N workflows are configured and active');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const command = process.argv[2] || 'full';

switch (command) {
  case 'health':
    testWorkerHealth();
    break;
  case 'webhooks':
    testN8NWebhooks();
    break;
  case 'ingestion':
    sendTestDataToIngestion();
    break;
  case 'scheduler':
    triggerScheduler();
    break;
  case 'full':
  default:
    runRealN8NTest();
    break;
}

export { testWorkerHealth, testN8NWebhooks, sendTestDataToIngestion, triggerScheduler };