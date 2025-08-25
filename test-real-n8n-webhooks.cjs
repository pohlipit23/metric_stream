#!/usr/bin/env node

/**
 * Test real N8N webhooks and validate data storage
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

async function checkN8NStatus() {
  try {
    const result = await makeHttpRequest('http://localhost:5678/healthz');
    return { running: true, status: result.status };
  } catch (error) {
    return { running: false, error: error.message };
  }
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

async function checkKVData() {
  try {
    const result = await makeHttpRequest('https://ingestion-worker.pohlipit.workers.dev/api/debug-kv');
    return result.data;
  } catch (error) {
    return { error: error.message };
  }
}

async function checkTimeseriesData(kpiId) {
  try {
    // Use wrangler to check KV data
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync(`cd src/workers/ingestion && wrangler kv key get "timeseries:${kpiId}" --binding TIMESERIES_KV`);
    return JSON.parse(stdout);
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🧪 Testing Real N8N Webhooks and Data Storage\n');
  
  const traceId = `real-test-${Date.now()}`;
  
  // Step 1: Check N8N status
  console.log('📋 Step 1: Checking N8N Status');
  const n8nStatus = await checkN8NStatus();
  console.log('N8N Status:', n8nStatus);
  
  if (!n8nStatus.running) {
    console.log('❌ N8N is not running. Please start N8N first.');
    return;
  }
  
  console.log('✅ N8N is running\n');
  
  // Step 2: Test webhook endpoints
  console.log('📋 Step 2: Testing N8N Webhook Endpoints');
  
  const webhooks = [
    {
      name: 'CBBI Multi KPI',
      path: '/webhook/kpi-cbbi',
      kpiId: 'cbbi-multi',
      payload: {
        traceId,
        timestamp: new Date().toISOString(),
        trigger: 'manual-test'
      }
    },
    {
      name: 'CoinMarketCap KPI',
      path: '/webhook/kpi-cmc', 
      kpiId: 'kpi-cmc',
      payload: {
        traceId,
        timestamp: new Date().toISOString(),
        trigger: 'manual-test'
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
      console.log(`✅ ${webhook.name} webhook responded successfully`);
      console.log('Response:', JSON.stringify(result.data, null, 2));
    } else {
      console.log(`❌ ${webhook.name} webhook failed`);
      console.log('Error:', result.error || result.data);
    }
  }
  
  // Step 3: Check if any webhooks succeeded and validate data flow
  const successfulWebhooks = webhookResults.filter(w => w.result.success);
  
  if (successfulWebhooks.length > 0) {
    console.log(`\n📋 Step 3: Validating Data Flow (${successfulWebhooks.length} successful webhooks)`);
    
    // Wait a moment for data processing
    console.log('Waiting 3 seconds for data processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check KV storage
    console.log('\nChecking KV Storage:');
    const kvData = await checkKVData();
    console.log('KV Status:', JSON.stringify(kvData, null, 2));
    
    // Check specific timeseries data
    for (const webhook of successfulWebhooks) {
      console.log(`\nChecking timeseries data for ${webhook.kpiId}:`);
      const timeseriesData = await checkTimeseriesData(webhook.kpiId);
      
      if (timeseriesData) {
        console.log(`✅ Found timeseries data for ${webhook.kpiId}`);
        console.log('Data points:', timeseriesData.dataPoints?.length || 0);
        console.log('Last updated:', timeseriesData.lastUpdated);
      } else {
        console.log(`❌ No timeseries data found for ${webhook.kpiId}`);
      }
    }
  } else {
    console.log('\n❌ No webhooks succeeded. Cannot validate data flow.');
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('1. Check if N8N workflows are activated');
    console.log('2. Verify webhook URLs in N8N match the KPI configuration');
    console.log('3. Check N8N workflow logs for errors');
    console.log('4. Ensure N8N workflows have proper authentication headers');
  }
  
  // Step 4: Summary
  console.log('\n📊 Test Summary:');
  console.log(`- N8N Running: ${n8nStatus.running ? '✅' : '❌'}`);
  console.log(`- Webhooks Tested: ${webhooks.length}`);
  console.log(`- Successful Webhooks: ${successfulWebhooks.length}`);
  console.log(`- Data Flow Validated: ${successfulWebhooks.length > 0 ? '✅' : '❌'}`);
  
  if (successfulWebhooks.length === 0) {
    console.log('\n⚠️  Next Steps:');
    console.log('1. Access N8N at http://localhost:5678');
    console.log('2. Check workflow status and activate if needed');
    console.log('3. Test webhooks manually in N8N interface');
    console.log('4. Fix any authentication or configuration issues');
  }
  
  console.log('\n🎯 Test Complete!');
}

main().catch(console.error);