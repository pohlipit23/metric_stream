#!/usr/bin/env node

/**
 * Test Ingestion Worker with Real N8N Data
 * 
 * This script simulates what N8N workflows should do:
 * 1. Trigger N8N workflows to get real data
 * 2. Send that real data to the Ingestion Worker
 * 3. Verify the data is stored in KV stores
 * 
 * Usage: node test-ingestion-with-real-data.js
 */

import { writeFileSync } from 'fs';

// Configuration
const CONFIG = {
  N8N_WEBHOOKS: {
    'kpi-cmc': 'http://localhost:5678/webhook/kpi-cmc',
    'kpi-cbbi': 'http://localhost:5678/webhook/kpi-cbbi'
  },
  INGESTION_WORKER_URL: 'https://ingestion-worker.pohlipit.workers.dev',
  INGESTION_API_KEY: process.env.INGESTION_API_KEY || null
};

/**
 * Get real data from N8N workflows
 */
async function getRealDataFromN8N(traceId) {
  console.log('📡 Getting real data from N8N workflows...\n');
  
  const realData = [];
  
  for (const [kpiId, webhookUrl] of Object.entries(CONFIG.N8N_WEBHOOKS)) {
    console.log(`🔄 Triggering ${kpiId} workflow...`);
    
    try {
      const triggerPayload = {
        traceId: traceId,
        kpiId: kpiId,
        timestamp: new Date().toISOString(),
        kpiType: kpiId === 'kpi-cmc' ? 'price' : 'index',
        metadata: {
          schedulerWorker: 'ingestion-test-script',
          environment: 'test'
        }
      };
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Ingestion-Test/1.0'
        },
        body: JSON.stringify(triggerPayload)
      });
      
      if (response.ok) {
        const n8nData = await response.json();
        console.log(`✅ ${kpiId}: Got real data`);
        console.log(`   KPI IDs: ${n8nData.kpiIds?.join(', ') || 'single KPI'}`);
        console.log(`   Data keys: ${Object.keys(n8nData.data || {}).join(', ')}`);
        
        realData.push({
          originalKpiId: kpiId,
          n8nResponse: n8nData
        });
      } else {
        console.log(`❌ ${kpiId}: Failed to get data (${response.status})`);
      }
      
    } catch (error) {
      console.error(`❌ ${kpiId}: Error - ${error.message}`);
    }
  }
  
  return realData;
}

/**
 * Convert N8N multi-KPI response to individual KPI updates for Ingestion Worker
 */
function convertToIngestionFormat(traceId, realDataArray) {
  console.log('\n🔄 Converting N8N data to Ingestion Worker format...\n');
  
  const ingestionPayloads = [];
  
  for (const { originalKpiId, n8nResponse } of realDataArray) {
    const { traceId: responseTraceId, timestamp, kpiType, kpiIds, data } = n8nResponse;
    
    if (kpiIds && Array.isArray(kpiIds)) {
      // Multi-KPI response - create individual payloads
      for (const kpiId of kpiIds) {
        if (data[kpiId] !== undefined) {
          const payload = {
            traceId: traceId,
            kpiId: kpiId,
            timestamp: timestamp,
            kpiType: kpiType,
            data: {
              value: data[kpiId],
              originalData: data
            },
            metadata: {
              source: 'n8n-workflow',
              originalKpiId: originalKpiId,
              multiKpiResponse: true,
              generatedAt: new Date().toISOString()
            }
          };
          
          ingestionPayloads.push(payload);
          console.log(`📦 Created payload for ${kpiId}: ${data[kpiId]}`);
        }
      }
    } else {
      // Single KPI response
      const payload = {
        traceId: traceId,
        kpiId: originalKpiId,
        timestamp: timestamp,
        kpiType: kpiType,
        data: data,
        metadata: {
          source: 'n8n-workflow',
          singleKpiResponse: true,
          generatedAt: new Date().toISOString()
        }
      };
      
      ingestionPayloads.push(payload);
      console.log(`📦 Created payload for ${originalKpiId}`);
    }
  }
  
  console.log(`\n📊 Total payloads created: ${ingestionPayloads.length}`);
  return ingestionPayloads;
}

/**
 * Send data to Ingestion Worker
 */
async function sendToIngestionWorker(payloads) {
  console.log('\n📤 Sending data to Ingestion Worker...\n');
  
  if (!CONFIG.INGESTION_API_KEY) {
    console.log('⚠️  Warning: INGESTION_API_KEY not set. Requests may fail.');
  }
  
  const results = [];
  
  for (const payload of payloads) {
    console.log(`📤 Sending ${payload.kpiId}...`);
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Ingestion-Test/1.0'
      };
      
      if (CONFIG.INGESTION_API_KEY) {
        headers['X-API-Key'] = CONFIG.INGESTION_API_KEY;
      }
      
      const response = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/kpi-data`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });
      
      const responseData = await response.json();
      
      results.push({
        kpiId: payload.kpiId,
        success: response.ok,
        status: response.status,
        response: responseData,
        payload: payload
      });
      
      if (response.ok) {
        console.log(`✅ ${payload.kpiId}: Success (${response.status})`);
        if (responseData.processed) {
          console.log(`   Processed: ${responseData.processed}, Skipped: ${responseData.skipped}, Errors: ${responseData.errors}`);
        }
      } else {
        console.log(`❌ ${payload.kpiId}: Failed (${response.status})`);
        console.log(`   Error: ${responseData.error || 'Unknown error'}`);
        
        if (response.status === 401) {
          console.log(`   💡 Authentication error. Set INGESTION_API_KEY environment variable.`);
        }
      }
      
    } catch (error) {
      console.error(`❌ ${payload.kpiId}: Network error - ${error.message}`);
      results.push({
        kpiId: payload.kpiId,
        success: false,
        error: error.message,
        payload: payload
      });
    }
  }
  
  return results;
}

/**
 * Verify data was stored in KV stores
 */
async function verifyKVStorage(traceId, kpiIds) {
  console.log('\n🔍 Verifying KV store data...\n');
  
  console.log(`📋 To verify data was stored, check these KV keys:`);
  console.log(`\n🗂️  JOBS_KV:`);
  console.log(`   job:${traceId}`);
  
  console.log(`\n📈 TIMESERIES_KV:`);
  for (const kpiId of kpiIds) {
    console.log(`   timeseries:${kpiId}`);
  }
  
  console.log(`\n📦 PACKAGES_KV:`);
  for (const kpiId of kpiIds) {
    console.log(`   package:${traceId}:${kpiId}`);
  }
  
  console.log(`\n💡 Use these commands to check:`);
  console.log(`wrangler kv key get "job:${traceId}" --namespace-id ba267159e4614fbb84edfc7cd902692c`);
  console.log(`wrangler kv key list --namespace-id 134812605b5b435eab23b4a72d8b7ced | grep timeseries`);
  console.log(`wrangler kv key list --namespace-id 935d01fc21f0462fad041b2adfc0d17a | grep package`);
}

/**
 * Main test function
 */
async function runIngestionTest() {
  console.log('🚀 Testing Ingestion Worker with Real N8N Data\n');
  console.log('=' .repeat(60));
  
  const traceId = `ingestion-test-${Date.now()}`;
  console.log(`🆔 Trace ID: ${traceId}\n`);
  
  try {
    // Step 1: Get real data from N8N
    console.log('STEP 1: Getting Real Data from N8N');
    console.log('-' .repeat(40));
    const realData = await getRealDataFromN8N(traceId);
    
    if (realData.length === 0) {
      console.log('❌ No data received from N8N workflows. Cannot proceed.');
      return;
    }
    
    // Step 2: Convert to ingestion format
    console.log('STEP 2: Converting to Ingestion Format');
    console.log('-' .repeat(40));
    const ingestionPayloads = convertToIngestionFormat(traceId, realData);
    
    // Step 3: Send to Ingestion Worker
    console.log('STEP 3: Sending to Ingestion Worker');
    console.log('-' .repeat(40));
    const ingestionResults = await sendToIngestionWorker(ingestionPayloads);
    
    // Step 4: Verify storage
    console.log('STEP 4: Verification Instructions');
    console.log('-' .repeat(40));
    const allKpiIds = ingestionPayloads.map(p => p.kpiId);
    await verifyKVStorage(traceId, allKpiIds);
    
    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      traceId: traceId,
      summary: {
        n8nWorkflowsTriggered: realData.length,
        payloadsGenerated: ingestionPayloads.length,
        ingestionSuccessful: ingestionResults.filter(r => r.success).length,
        ingestionFailed: ingestionResults.filter(r => !r.success).length,
        overallSuccess: ingestionResults.some(r => r.success)
      },
      results: {
        n8nData: realData,
        ingestionPayloads: ingestionPayloads,
        ingestionResults: ingestionResults
      }
    };
    
    writeFileSync('ingestion-test-report.json', JSON.stringify(report, null, 2));
    
    console.log('\n📊 FINAL REPORT');
    console.log('=' .repeat(60));
    console.log(`   Trace ID: ${traceId}`);
    console.log(`   N8N Workflows: ${report.summary.n8nWorkflowsTriggered}/2 successful`);
    console.log(`   Payloads Generated: ${report.summary.payloadsGenerated}`);
    console.log(`   Ingestion Success: ${report.summary.ingestionSuccessful}/${report.summary.payloadsGenerated}`);
    console.log(`   Overall Success: ${report.summary.overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Report saved to: ingestion-test-report.json`);
    
    return report;
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIngestionTest().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { runIngestionTest };