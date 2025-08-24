#!/usr/bin/env node

/**
 * Test N8N to Ingestion Worker Data Flow
 * 
 * This script simulates the exact data flow that should happen:
 * 1. Get real data from N8N workflows (as they return it)
 * 2. Send that exact data to Ingestion Worker (as N8N should do)
 * 3. Verify the data is processed and stored correctly
 * 
 * Usage: node test-n8n-to-ingestion.js
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
 * Get real data from N8N and send it directly to Ingestion Worker
 */
async function testN8NToIngestionFlow() {
  console.log('🚀 Testing N8N to Ingestion Worker Data Flow\n');
  console.log('=' .repeat(60));
  
  const traceId = `n8n-ingestion-test-${Date.now()}`;
  console.log(`🆔 Trace ID: ${traceId}\n`);
  
  if (!CONFIG.INGESTION_API_KEY) {
    console.log('⚠️  Warning: INGESTION_API_KEY not set. Requests may fail.\n');
  }
  
  const results = [];
  
  for (const [kpiId, webhookUrl] of Object.entries(CONFIG.N8N_WEBHOOKS)) {
    console.log(`🔄 Processing ${kpiId}...`);
    console.log('-' .repeat(30));
    
    try {
      // Step 1: Trigger N8N workflow
      console.log(`📡 1. Triggering N8N workflow at ${webhookUrl}`);
      
      const triggerPayload = {
        traceId: traceId,
        kpiId: kpiId,
        timestamp: new Date().toISOString(),
        kpiType: kpiId === 'kpi-cmc' ? 'price' : 'index',
        metadata: {
          schedulerWorker: 'n8n-ingestion-test',
          environment: 'test'
        }
      };
      
      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'N8N-Ingestion-Test/1.0'
        },
        body: JSON.stringify(triggerPayload)
      });
      
      if (!n8nResponse.ok) {
        throw new Error(`N8N workflow failed: ${n8nResponse.status} ${n8nResponse.statusText}`);
      }
      
      const n8nData = await n8nResponse.json();
      console.log(`✅ N8N workflow successful`);
      console.log(`   Response type: ${n8nData.kpiType}`);
      console.log(`   KPI IDs: ${n8nData.kpiIds?.join(', ') || 'single KPI'}`);
      console.log(`   Data keys: ${Object.keys(n8nData.data || {}).join(', ')}`);
      
      // Step 2: Send N8N data directly to Ingestion Worker
      console.log(`\n📤 2. Sending N8N data to Ingestion Worker`);
      
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'N8N-Workflow/1.0'
      };
      
      if (CONFIG.INGESTION_API_KEY) {
        headers['X-API-Key'] = CONFIG.INGESTION_API_KEY;
      }
      
      const ingestionResponse = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/kpi-data`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(n8nData)
      });
      
      const ingestionData = await ingestionResponse.json();
      
      if (ingestionResponse.ok) {
        console.log(`✅ Ingestion Worker successful (${ingestionResponse.status})`);
        console.log(`   Processed: ${ingestionData.processed || 0}`);
        console.log(`   Skipped: ${ingestionData.skipped || 0}`);
        console.log(`   Errors: ${ingestionData.errors || 0}`);
        
        if (ingestionData.results) {
          console.log(`   Individual results:`);
          ingestionData.results.forEach(result => {
            console.log(`     ${result.kpi_id}: ${result.status}`);
          });
        }
      } else {
        console.log(`❌ Ingestion Worker failed (${ingestionResponse.status})`);
        console.log(`   Error: ${ingestionData.error || 'Unknown error'}`);
      }
      
      results.push({
        kpiId: kpiId,
        n8nSuccess: true,
        n8nData: n8nData,
        ingestionSuccess: ingestionResponse.ok,
        ingestionStatus: ingestionResponse.status,
        ingestionData: ingestionData,
        overallSuccess: ingestionResponse.ok
      });
      
    } catch (error) {
      console.error(`❌ Error processing ${kpiId}: ${error.message}`);
      results.push({
        kpiId: kpiId,
        n8nSuccess: false,
        ingestionSuccess: false,
        error: error.message,
        overallSuccess: false
      });
    }
    
    console.log(''); // Add spacing
  }
  
  // Generate summary report
  const report = {
    timestamp: new Date().toISOString(),
    traceId: traceId,
    summary: {
      totalWorkflows: results.length,
      n8nSuccessful: results.filter(r => r.n8nSuccess).length,
      ingestionSuccessful: results.filter(r => r.ingestionSuccess).length,
      overallSuccessful: results.filter(r => r.overallSuccess).length,
      overallSuccess: results.every(r => r.overallSuccess)
    },
    results: results
  };
  
  writeFileSync('n8n-ingestion-test-report.json', JSON.stringify(report, null, 2));
  
  console.log('📊 FINAL SUMMARY');
  console.log('=' .repeat(60));
  console.log(`   Trace ID: ${traceId}`);
  console.log(`   N8N Workflows: ${report.summary.n8nSuccessful}/${report.summary.totalWorkflows} successful`);
  console.log(`   Ingestion Processing: ${report.summary.ingestionSuccessful}/${report.summary.totalWorkflows} successful`);
  console.log(`   Overall Success: ${report.summary.overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`   Report saved to: n8n-ingestion-test-report.json`);
  
  // Provide KV verification instructions
  if (report.summary.ingestionSuccessful > 0) {
    console.log('\n🔍 VERIFICATION INSTRUCTIONS:');
    console.log('Check these KV keys to verify data was stored:');
    
    // Extract all KPI IDs from successful results
    const allKpiIds = [];
    results.forEach(result => {
      if (result.ingestionSuccess && result.n8nData?.kpiIds) {
        allKpiIds.push(...result.n8nData.kpiIds);
      }
    });
    
    if (allKpiIds.length > 0) {
      console.log('\n📈 TIMESERIES_KV:');
      allKpiIds.forEach(kpiId => {
        console.log(`   wrangler kv key get "timeseries:${kpiId}" --namespace-id 134812605b5b435eab23b4a72d8b7ced`);
      });
      
      console.log('\n📦 PACKAGES_KV:');
      allKpiIds.forEach(kpiId => {
        console.log(`   wrangler kv key get "package:${traceId}:${kpiId}" --namespace-id 935d01fc21f0462fad041b2adfc0d17a`);
      });
      
      console.log('\n🗂️  JOBS_KV:');
      console.log(`   wrangler kv key get "job:${traceId}" --namespace-id ba267159e4614fbb84edfc7cd902692c`);
    }
  }
  
  return report;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testN8NToIngestionFlow().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { testN8NToIngestionFlow };