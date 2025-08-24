#!/usr/bin/env node

/**
 * Debug Single KPI Test
 * Send a single KPI to test KV operations
 */

const CONFIG = {
  INGESTION_WORKER_URL: 'https://ingestion-worker.pohlipit.workers.dev',
  INGESTION_API_KEY: process.env.INGESTION_API_KEY || 'test-api-key-123'
};

async function testSingleKPI() {
  console.log('🔍 Testing single KPI to debug KV operations...\n');
  
  const testData = {
    traceId: `debug-test-${Date.now()}`,
    timestamp: new Date().toISOString(),
    kpiType: 'cmc-multi',
    kpiIds: ['cmc-btc-dominance'],
    data: {
      'cmc-btc-dominance': 58.5
    }
  };
  
  console.log('📤 Sending test data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/kpi-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.INGESTION_API_KEY,
        'User-Agent': 'Debug-Test/1.0'
      },
      body: JSON.stringify(testData)
    });
    
    const responseData = await response.json();
    
    console.log(`📥 Response (${response.status}):`, JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Request successful! Check worker logs for detailed debugging info.');
      console.log('\n🔍 To verify data was stored, run:');
      console.log(`wrangler kv key get "timeseries:cmc-btc-dominance" --namespace-id 134812605b5b435eab23b4a72d8b7ced`);
      console.log(`wrangler kv key get "package:${testData.traceId}:cmc-btc-dominance" --namespace-id 935d01fc21f0462fad041b2adfc0d17a`);
      console.log(`wrangler kv key get "job:${testData.traceId}" --namespace-id ba267159e4614fbb84edfc7cd902692c`);
    } else {
      console.log('❌ Request failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSingleKPI();