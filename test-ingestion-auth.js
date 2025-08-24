#!/usr/bin/env node

/**
 * Test Ingestion Worker Authentication
 * 
 * This script tests different API keys to find the correct one
 */

const CONFIG = {
  INGESTION_WORKER_URL: process.env.INGESTION_WORKER_URL || 'https://ingestion-worker.pohlipit.workers.dev',
  TEST_API_KEYS: [
    process.env.INGESTION_API_KEY || 'ed774c2e9ea976b733b306524f547623098310dd21453b0fec56055ab8b5b359',
    'test-api-key-12345',
    'your-secure-api-key-here',
    'development-api-key',
    'ingestion-api-key',
    'secure-key-123'
  ]
};

async function testAPIKey(apiKey) {
  const testPayload = {
    traceId: `auth-test-${Date.now()}`,
    kpiId: 'test-kpi',
    timestamp: new Date().toISOString(),
    kpiType: 'test',
    data: { value: 42 }
  };

  try {
    const response = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/kpi-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'User-Agent': 'Auth-Test/1.0'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { body: responseText };
    }

    return {
      apiKey,
      success: response.ok,
      status: response.status,
      response: responseData
    };

  } catch (error) {
    return {
      apiKey,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🔐 Testing Ingestion Worker Authentication\n');
  
  for (const apiKey of CONFIG.TEST_API_KEYS) {
    console.log(`Testing API key: ${apiKey}`);
    const result = await testAPIKey(apiKey);
    
    if (result.success) {
      console.log(`✅ SUCCESS with key: ${apiKey}`);
      console.log(`   Response:`, JSON.stringify(result.response, null, 2));
      break;
    } else {
      console.log(`❌ Failed: ${result.status || 'Network error'}`);
      if (result.response?.error) {
        console.log(`   Error: ${result.response.error}`);
      }
    }
    console.log('');
  }
  
  // Test with Authorization header instead of X-API-Key
  console.log('Testing with Authorization header...');
  const authResult = await testAuthorizationHeader('test-api-key-12345');
  if (authResult.success) {
    console.log(`✅ SUCCESS with Authorization header`);
    console.log(`   Response:`, JSON.stringify(authResult.response, null, 2));
  } else {
    console.log(`❌ Failed with Authorization header: ${authResult.status}`);
  }
}

async function testAuthorizationHeader(apiKey) {
  const testPayload = {
    traceId: `auth-test-${Date.now()}`,
    kpiId: 'test-kpi',
    timestamp: new Date().toISOString(),
    kpiType: 'test',
    data: { value: 42 }
  };

  try {
    const response = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/kpi-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Auth-Test/1.0'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { body: responseText };
    }

    return {
      success: response.ok,
      status: response.status,
      response: responseData
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

main().catch(console.error);