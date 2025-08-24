#!/usr/bin/env node

/**
 * Debug API Connection Script
 * Helps troubleshoot the KPI Registry API connection issues
 */

import fetch from 'node-fetch';

console.log('🔍 API Connection Debug Tool');
console.log('============================\n');

async function testEndpoint(url, description) {
  console.log(`Testing: ${description}`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${contentType}`);
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`Response: ${JSON.stringify(data, null, 2)}`);
    } else {
      const text = await response.text();
      console.log(`Response (first 200 chars): ${text.substring(0, 200)}...`);
    }
    
    console.log('✅ Request completed\n');
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }
}

async function runTests() {
  // Test different possible endpoints
  const tests = [
    {
      url: 'http://localhost:8787/health',
      description: 'Health check endpoint'
    },
    {
      url: 'http://localhost:8787/api/kpis',
      description: 'KPI list endpoint'
    },
    {
      url: 'http://localhost:5173/api/kpis',
      description: 'Frontend proxy to API'
    },
    {
      url: 'http://localhost:8787/',
      description: 'Worker root endpoint'
    }
  ];

  for (const test of tests) {
    await testEndpoint(test.url, test.description);
  }
  
  console.log('🔧 Troubleshooting Tips:');
  console.log('========================');
  console.log('1. Make sure the worker is running: cd src/workers/admin-console && npm run dev');
  console.log('2. Check if port 8787 is available: netstat -an | grep 8787');
  console.log('3. Verify the worker starts without errors');
  console.log('4. Check if there\'s a proxy configuration in the frontend');
  console.log('5. Try accessing http://localhost:8787/health directly in browser');
}

runTests().catch(console.error);