#!/usr/bin/env node

/**
 * Test CBBI webhook specifically for valid data
 */

const http = require('http');
const https = require('https');

async function triggerCBBIWebhook() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      traceId: `cbbi-test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      trigger: 'cbbi-validation-test'
    });
    
    const options = {
      hostname: 'localhost',
      port: 5678,
      path: '/webhook/kpi-cbbi',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsed
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function sendToIngestionWorker(webhookData) {
  return new Promise((resolve, reject) => {
    const ingestionPayload = {
      traceId: webhookData.traceId || `cbbi-ingestion-${Date.now()}`,
      kpiId: 'cbbi-multi',
      kpiType: webhookData.kpiType || 'multi-indicator',
      timestamp: webhookData.timestamp || new Date().toISOString(),
      data: webhookData.data || webhookData,
      metadata: {
        source: 'n8n-cbbi-webhook',
        originalWebhookData: webhookData,
        test: false
      }
    };
    
    const postData = JSON.stringify(ingestionPayload);
    
    const options = {
      hostname: 'ingestion-worker.pohlipit.workers.dev',
      port: 443,
      path: '/api/debug-kpi',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsed
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🧪 Testing CBBI Webhook for Valid Data\n');
  
  console.log('📤 Triggering CBBI webhook...');
  
  try {
    const webhookResult = await triggerCBBIWebhook();
    
    console.log('📥 CBBI Webhook Response:');
    console.log(`Status: ${webhookResult.status}`);
    console.log('Data:', JSON.stringify(webhookResult.data, null, 2));
    
    // Analyze the response
    const data = webhookResult.data;
    const dataKeys = Object.keys(data || {});
    
    console.log(`\n🔍 Response Analysis:`);
    console.log(`- Status Code: ${webhookResult.status}`);
    console.log(`- Response Keys: [${dataKeys.join(', ')}]`);
    console.log(`- Data Type: ${typeof data}`);
    console.log(`- Has Real Data: ${dataKeys.length > 1 && !dataKeys.includes('myField')}`);
    
    if (webhookResult.status === 200) {
      if (dataKeys.length > 1 && !dataKeys.includes('myField')) {
        console.log('\n✅ CBBI webhook is returning valid data!');
        
        // Test sending to ingestion worker
        console.log('\n📤 Sending CBBI data to ingestion worker...');
        
        const ingestionResult = await sendToIngestionWorker(data);
        
        console.log('📥 Ingestion Worker Response:');
        console.log(`Status: ${ingestionResult.status}`);
        console.log('Result:', JSON.stringify(ingestionResult.data, null, 2));
        
        if (ingestionResult.status === 200 && ingestionResult.data.step3_timeseries?.success) {
          console.log('\n✅ CBBI data successfully stored in KV!');
          console.log(`Timeseries key: ${ingestionResult.data.step3_timeseries.key}`);
          console.log(`Package key: ${ingestionResult.data.step4_package?.key}`);
          console.log(`Job key: ${ingestionResult.data.step5_job?.key}`);
          
          // Validate the data structure
          if (data.data) {
            console.log('\n📊 CBBI Data Structure:');
            const cbbiData = data.data;
            const cbbiKeys = Object.keys(cbbiData);
            
            console.log(`- Data Keys: [${cbbiKeys.join(', ')}]`);
            
            // Check for expected CBBI indicators
            const expectedIndicators = ['price', 'rhodl', 'mvrv', 'confidence'];
            const foundIndicators = expectedIndicators.filter(indicator => 
              cbbiKeys.some(key => key.toLowerCase().includes(indicator))
            );
            
            console.log(`- Expected Indicators: [${expectedIndicators.join(', ')}]`);
            console.log(`- Found Indicators: [${foundIndicators.join(', ')}]`);
            console.log(`- Coverage: ${foundIndicators.length}/${expectedIndicators.length} indicators`);
            
            if (foundIndicators.length >= 2) {
              console.log('\n✅ CBBI webhook contains multi-indicator data as expected!');
            } else {
              console.log('\n⚠️  CBBI webhook may need configuration to include more indicators');
            }
          }
          
        } else {
          console.log('\n❌ Failed to store CBBI data in ingestion worker');
        }
        
      } else if (dataKeys.includes('myField')) {
        console.log('\n⚠️  CBBI webhook is still returning test data');
        console.log('The webhook needs to be configured to fetch real CBBI data');
      } else {
        console.log('\n⚠️  CBBI webhook returned minimal data');
        console.log('Response may be empty or contain only basic fields');
      }
    } else {
      console.log('\n❌ CBBI webhook failed to respond properly');
    }
    
  } catch (error) {
    console.log('❌ Error testing CBBI webhook:', error.message);
  }
  
  console.log('\n📊 CBBI Webhook Test Summary:');
  console.log('- Webhook URL: http://localhost:5678/webhook/kpi-cbbi');
  console.log('- Expected Data: CBBI multi-indicator data (price, RHODL, MVRV, confidence)');
  console.log('- Integration: Should send data to ingestion worker automatically');
  
  console.log('\n🎯 CBBI Test Complete!');
}

main().catch(console.error);