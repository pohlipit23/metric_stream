#!/usr/bin/env node

/**
 * Test script to validate ingestion worker with proper authentication
 */

const https = require('https');

// Test data for both KPIs
const testData = {
  'cbbi-multi': {
    kpi_id: 'cbbi-multi',
    kpi_type: 'multi-indicator',
    trace_id: `test-${Date.now()}-cbbi`,
    timestamp: new Date().toISOString(),
    data: {
      price: 67234.56,
      rhodl: 0.45,
      confidence: 75
    },
    metadata: {
      source: 'colintalkscrypto',
      collection_method: 'api',
      test: true
    }
  },
  'kpi-cmc': {
    kpi_id: 'kpi-cmc',
    kpi_type: 'price',
    trace_id: `test-${Date.now()}-cmc`,
    timestamp: new Date().toISOString(),
    data: {
      price: 67234.56
    },
    metadata: {
      source: 'coinmarketcap',
      collection_method: 'api',
      test: true
    }
  }
};

async function testIngestionEndpoint(kpiId, data, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'ingestion-worker.pohlipit.workers.dev',
      port: 443,
      path: '/api/kpi-data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
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

    req.write(postData);
    req.end();
  });
}

async function checkKVStorage(kpiId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'ingestion-worker.pohlipit.workers.dev',
      port: 443,
      path: '/api/debug-kv',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (error) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function main() {
  console.log('🧪 Testing Ingestion Worker Authentication & Data Storage\n');
  
  // Test different API key scenarios
  const testApiKeys = [
    'invalid-key',
    'dev-ingestion-key-2025',
    'test-key-123',
    'ingestion-api-key'
  ];

  console.log('📋 Step 1: Testing API Key Authentication\n');
  
  let validApiKey = null;
  
  for (const apiKey of testApiKeys) {
    console.log(`Testing API key: ${apiKey.substring(0, 8)}...`);
    
    try {
      const result = await testIngestionEndpoint('cbbi-multi', testData['cbbi-multi'], apiKey);
      
      if (result.status === 200 || result.status === 201) {
        console.log(`✅ Valid API key found: ${apiKey.substring(0, 8)}...`);
        validApiKey = apiKey;
        break;
      } else if (result.status === 401) {
        console.log(`❌ Invalid API key: ${apiKey.substring(0, 8)}...`);
      } else {
        console.log(`⚠️  Unexpected response (${result.status}): ${JSON.stringify(result.data).substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`❌ Error testing API key: ${error.message}`);
    }
  }
  
  if (!validApiKey) {
    console.log('\n❌ No valid API key found. Please check the INGESTION_API_KEY secret.');
    console.log('\nTo check current secrets: cd src/workers/ingestion && wrangler secret list');
    console.log('To set a new secret: cd src/workers/ingestion && wrangler secret put INGESTION_API_KEY');
    return;
  }
  
  console.log(`\n📋 Step 2: Testing Data Ingestion with valid API key\n`);
  
  // Test both KPIs
  for (const [kpiId, data] of Object.entries(testData)) {
    console.log(`Testing KPI: ${kpiId}`);
    
    try {
      const result = await testIngestionEndpoint(kpiId, data, validApiKey);
      
      console.log(`Status: ${result.status}`);
      console.log(`Response: ${JSON.stringify(result.data, null, 2)}`);
      
      if (result.status === 200 || result.status === 201) {
        console.log(`✅ ${kpiId} data ingested successfully`);
      } else {
        console.log(`❌ ${kpiId} ingestion failed`);
      }
    } catch (error) {
      console.log(`❌ Error ingesting ${kpiId}: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('📋 Step 3: Checking KV Storage\n');
  
  try {
    const kvStatus = await checkKVStorage();
    console.log('KV Storage Status:');
    console.log(JSON.stringify(kvStatus, null, 2));
  } catch (error) {
    console.log(`❌ Error checking KV storage: ${error.message}`);
  }
  
  console.log('\n🎯 Test Complete!');
}

main().catch(console.error);