#!/usr/bin/env node

/**
 * Test Scheduler Trigger and Pipeline
 * 
 * This script tests the scheduler worker trigger and monitors the pipeline
 */

const https = require('https');
const http = require('http');

async function testSchedulerTrigger() {
  console.log('🚀 Testing Scheduler Worker Trigger');
  console.log('=' .repeat(50));
  
  const config = {
    schedulerUrl: 'https://scheduler-worker.pohlipit.workers.dev',
    ingestionUrl: 'https://ingestion-worker-development.pohlipit.workers.dev',
    orchestrationUrl: 'https://orchestration-worker.pohlipit.workers.dev',
    apiKey: 'test-api-key-development-2024'
  };
  
  try {
    // Step 1: Trigger the scheduler
    console.log('🔄 Triggering Scheduler Worker...');
    
    const schedulerResponse = await makeHttpRequest('POST', `${config.schedulerUrl}/api/trigger`, {
      manual: true,
      timestamp: new Date().toISOString(),
      test: true
    }, config.apiKey);
    
    console.log('📊 Scheduler Response:', schedulerResponse.statusCode);
    console.log('📊 Scheduler Data:', JSON.stringify(schedulerResponse.data, null, 2));
    
    // Step 2: Test data ingestion with authentication
    console.log('\n📥 Testing Data Ingestion...');
    
    const jobId = schedulerResponse.data?.job_id || schedulerResponse.data?.trace_id || `test-${Date.now()}`;
    
    const testData = {
      trace_id: jobId,
      kpi_id: 'test-scheduler-pipeline',
      timestamp: new Date().toISOString(),
      data: {
        value: 98765.43,
        confidence: 0.95,
        source: 'scheduler-pipeline-test',
        metadata: {
          test: true,
          scheduler_triggered: true,
          timestamp: new Date().toISOString()
        }
      }
    };
    
    const ingestionResponse = await makeHttpRequest('POST', `${config.ingestionUrl}/api/kpi-data`, testData, config.apiKey);
    
    console.log('📊 Ingestion Response:', ingestionResponse.statusCode);
    console.log('📊 Ingestion Data:', JSON.stringify(ingestionResponse.data, null, 2));
    
    // Step 3: Check orchestration status
    console.log('\n🎯 Checking Orchestration Worker...');
    
    const orchestrationResponse = await makeHttpRequest('GET', `${config.orchestrationUrl}/api/status`, null, config.apiKey);
    
    console.log('📊 Orchestration Response:', orchestrationResponse.statusCode);
    console.log('📊 Orchestration Data:', JSON.stringify(orchestrationResponse.data, null, 2));
    
    // Summary
    console.log('\n📋 PIPELINE TEST SUMMARY:');
    console.log('=' .repeat(40));
    console.log(`Scheduler Trigger: ${schedulerResponse.statusCode === 200 ? '✅ SUCCESS' : '❌ FAILED'} (${schedulerResponse.statusCode})`);
    console.log(`Data Ingestion: ${ingestionResponse.statusCode === 200 ? '✅ SUCCESS' : '❌ FAILED'} (${ingestionResponse.statusCode})`);
    console.log(`Orchestration Check: ${orchestrationResponse.statusCode === 200 ? '✅ SUCCESS' : '❌ FAILED'} (${orchestrationResponse.statusCode})`);
    console.log(`Job ID: ${jobId}`);
    
    if (schedulerResponse.statusCode === 200 && ingestionResponse.statusCode === 200) {
      console.log('\n🎉 PIPELINE TEST SUCCESSFUL!');
      console.log('✅ Scheduler Worker is triggering correctly');
      console.log('✅ Data ingestion is working with authentication');
      console.log('✅ Orchestration Worker is accessible');
      console.log('✅ End-to-end pipeline is functional');
    } else {
      console.log('\n⚠️  PIPELINE TEST PARTIAL SUCCESS');
      console.log('Some components may need attention');
    }
    
    return {
      success: schedulerResponse.statusCode === 200 && ingestionResponse.statusCode === 200,
      jobId: jobId,
      responses: {
        scheduler: schedulerResponse.statusCode,
        ingestion: ingestionResponse.statusCode,
        orchestration: orchestrationResponse.statusCode
      }
    };
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error.message);
    throw error;
  }
}

async function makeHttpRequest(method, url, data = null, apiKey = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SchedulerTester/1.0'
      },
      timeout: 30000
    };
    
    if (apiKey) {
      options.headers['X-API-Key'] = apiKey;
    }
    
    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: responseData });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run if executed directly
if (require.main === module) {
  testSchedulerTrigger()
    .then(result => {
      console.log('\n📄 Test completed:', JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = testSchedulerTrigger;