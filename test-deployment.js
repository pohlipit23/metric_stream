#!/usr/bin/env node

/**
 * Deployment Test Script
 * 
 * Tests the deployed workers to ensure they're functioning correctly
 */

const WORKERS = {
  ingestion: 'https://ingestion-worker.pohlipit.workers.dev',
  scheduler: 'https://scheduler-worker.pohlipit.workers.dev', 
  orchestration: 'https://orchestration-worker.pohlipit.workers.dev'
};

async function testWorkerHealth(name, url) {
  try {
    const healthEndpoint = name === 'orchestration' ? '/health' : '/api/health';
    const response = await fetch(`${url}${healthEndpoint}`);
    const data = await response.json();
    
    console.log(`✅ ${name.toUpperCase()} Worker: ${data.status}`);
    if (data.status !== 'healthy') {
      console.log(`   ⚠️  Status: ${data.status}`);
      if (data.kvError) console.log(`   ⚠️  KV Error: ${data.kvError}`);
      if (data.queueError) console.log(`   ⚠️  Queue Error: ${data.queueError}`);
    }
    return data.status === 'healthy';
  } catch (error) {
    console.log(`❌ ${name.toUpperCase()} Worker: ERROR - ${error.message}`);
    return false;
  }
}

async function testDeployment() {
  console.log('🚀 Testing Cloudflare Workers Deployment...\n');
  
  const results = [];
  
  for (const [name, url] of Object.entries(WORKERS)) {
    const isHealthy = await testWorkerHealth(name, url);
    results.push({ name, healthy: isHealthy });
  }
  
  console.log('\n📊 Deployment Summary:');
  const healthyCount = results.filter(r => r.healthy).length;
  console.log(`   Healthy: ${healthyCount}/${results.length} workers`);
  
  if (healthyCount === results.length) {
    console.log('✅ All workers deployed successfully!');
    console.log('\n🔗 Worker URLs:');
    for (const [name, url] of Object.entries(WORKERS)) {
      console.log(`   ${name}: ${url}`);
    }
  } else {
    console.log('❌ Some workers have issues. Check the logs above.');
    process.exit(1);
  }
}

testDeployment().catch(console.error);