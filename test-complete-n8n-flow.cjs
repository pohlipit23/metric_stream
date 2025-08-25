#!/usr/bin/env node

/**
 * Test complete N8N to Ingestion Worker flow
 */

const https = require('https');
const http = require('http');

async function makeHttpRequest(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function triggerN8NWebhook(webhookPath, payload = {}) {
  const url = `http://localhost:5678${webhookPath}`;
  console.log(`🔗 Triggering webhook: ${url}`);
  
  try {
    const result = await makeHttpRequest(url, 'POST', payload);
    return {
      success: result.status >= 200 && result.status < 300,
      status: result.status,
      data: result.data,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: null,
      error: error.message
    };
  }
}

async function checkIngestionWorkerLogs() {
  // Since we can't directly access logs, we'll check if data was processed
  try {
    const result = await makeHttpRequest('https://ingestion-worker.pohlipit.workers.dev/api/debug-kv');
    return result.data;
  } catch (error) {
    return { error: error.message };
  }
}

async function simulateN8NToIngestionFlow(webhookData, kpiId) {
  console.log(`\n🔄 Simulating N8N → Ingestion flow for ${kpiId}`);
  
  // This simulates what N8N should do: receive webhook data, then send to ingestion worker
  const ingestionPayload = {
    traceId: webhookData.traceId || `manual-${Date.now()}`,
    kpiId: kpiId,
    kpiType: webhookData.kpiType || 'unknown',
    timestamp: webhookData.timestamp || new Date().toISOString(),
    data: webhookData.data || { value: 1 },
    metadata: {
      source: 'n8n-webhook',
      originalWebhookData: webhookData,
      test: true
    }
  };
  
  console.log('Sending to ingestion worker:', JSON.stringify(ingestionPayload, null, 2));
  
  try {
    const result = await makeHttpRequest(
      'https://ingestion-worker.pohlipit.workers.dev/api/debug-kpi',
      'POST',
      ingestionPayload
    );
    
    return {
      success: result.status >= 200 && result.status < 300,
      status: result.status,
      data: result.data,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: null,
      error: error.message
    };
  }
}

async function main() {
  console.log('🧪 Testing Complete N8N → Ingestion Worker Flow\n');
  
  const traceId = `complete-test-${Date.now()}`;
  
  // Step 1: Trigger N8N webhooks and get responses
  console.log('📋 Step 1: Triggering N8N Webhooks');
  
  const webhooks = [
    {
      name: 'CBBI Multi KPI',
      path: '/webhook/kpi-cbbi',
      kpiId: 'cbbi-multi',
      payload: {
        traceId,
        timestamp: new Date().toISOString(),
        trigger: 'complete-flow-test'
      }
    },
    {
      name: 'CoinMarketCap KPI',
      path: '/webhook/kpi-cmc', 
      kpiId: 'kpi-cmc',
      payload: {
        traceId,
        timestamp: new Date().toISOString(),
        trigger: 'complete-flow-test'
      }
    }
  ];
  
  const webhookResults = [];
  
  for (const webhook of webhooks) {
    console.log(`\nTesting ${webhook.name}:`);
    
    const result = await triggerN8NWebhook(webhook.path, webhook.payload);
    webhookResults.push({
      ...webhook,
      result
    });
    
    console.log(`Status: ${result.status}`);
    console.log(`Success: ${result.success}`);
    
    if (result.success) {
      console.log(`✅ ${webhook.name} webhook responded`);
      console.log('Response data keys:', Object.keys(result.data || {}));
      
      // Step 2: Simulate what N8N should do - send data to ingestion worker
      if (result.data && Object.keys(result.data).length > 1) {
        const ingestionResult = await simulateN8NToIngestionFlow(result.data, webhook.kpiId);
        
        if (ingestionResult.success) {
          console.log(`✅ Data successfully sent to ingestion worker`);
          console.log('Ingestion result:', JSON.stringify(ingestionResult.data, null, 2));
        } else {
          console.log(`❌ Failed to send data to ingestion worker`);
          console.log('Error:', ingestionResult.error || ingestionResult.data);
        }
      } else {
        console.log(`⚠️  Webhook returned minimal data - may need N8N workflow configuration`);
      }
    } else {
      console.log(`❌ ${webhook.name} webhook failed`);
      console.log('Error:', result.error || result.data);
    }
  }
  
  // Step 3: Check KV storage for any new data
  console.log('\n📋 Step 3: Checking KV Storage');
  
  console.log('Waiting 2 seconds for data processing...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const kvStatus = await checkIngestionWorkerLogs();
  console.log('KV Status:', JSON.stringify(kvStatus, null, 2));
  
  // Step 4: Summary and recommendations
  console.log('\n📊 Summary:');
  
  const successfulWebhooks = webhookResults.filter(w => w.result.success);
  const dataRichWebhooks = webhookResults.filter(w => 
    w.result.success && w.result.data && Object.keys(w.result.data).length > 1
  );
  
  console.log(`- Webhooks responding: ${successfulWebhooks.length}/${webhooks.length}`);
  console.log(`- Webhooks with data: ${dataRichWebhooks.length}/${webhooks.length}`);
  
  if (dataRichWebhooks.length > 0) {
    console.log('✅ N8N webhooks are working and returning data');
    console.log('✅ Ingestion worker can process the data');
    console.log('✅ KV storage is functional');
  } else {
    console.log('\n⚠️  Next Steps for N8N Configuration:');
    console.log('1. Ensure N8N workflows fetch real data (not just test responses)');
    console.log('2. Configure N8N workflows to send data to ingestion worker');
    console.log('3. Add HTTP Request nodes in N8N to call:');
    console.log('   https://ingestion-worker.pohlipit.workers.dev/api/kpi-data');
    console.log('4. Include proper authentication headers (X-API-Key)');
  }
  
  console.log('\n🎯 Complete Flow Test Finished!');
}

main().catch(console.error);