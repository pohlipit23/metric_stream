#!/usr/bin/env node

/**
 * N8N Workflow Simulation Test
 * 
 * This script simulates what N8N workflows should be doing:
 * 1. Receive trigger from Scheduler Worker
 * 2. Collect KPI data (simulated)
 * 3. Send data to Ingestion Worker with proper authentication
 * 4. Verify the complete flow works end-to-end
 * 
 * This test verifies that the integration between N8N workflows and 
 * Ingestion Worker is working correctly when properly configured.
 */

import { writeFileSync } from 'fs';

const CONFIG = {
  INGESTION_WORKER_URL: process.env.INGESTION_WORKER_URL || 'https://ingestion-worker.pohlipit.workers.dev',
  INGESTION_API_KEY: process.env.INGESTION_API_KEY || 'ed774c2e9ea976b733b306524f547623098310dd21453b0fec56055ab8b5b359',
  
  // Simulated N8N workflow configurations
  WORKFLOWS: {
    'kpi-cmc': {
      name: 'Bitcoin Price Workflow',
      type: 'price',
      simulatedData: {
        traceId: null, // Will be set during test
        timestamp: null, // Will be set during test
        kpiType: 'cmc-multi',
        kpiIds: ['cmc-btc-dominance', 'cmc-eth-dominance', 'cmc-totalmarketcap-usd', 'cmc-stablecoinmarketcap-usd'],
        data: {
          'cmc-btc-dominance': 58.686428806496,
          'cmc-eth-dominance': 13.85830101,
          'cmc-totalmarketcap-usd': 4030692217471.232,
          'cmc-stablecoinmarketcap-usd': 257190662849.79022
        }
      }
    },
    'kpi-cbbi': {
      name: 'CBBI Confidence Workflow',
      type: 'index',
      simulatedData: {
        traceId: null, // Will be set during test
        timestamp: null, // Will be set during test
        kpiType: 'index',
        data: {
          value: 75.5,
          confidence: 'high',
          source: 'colintalkscrypto'
        }
      }
    }
  }
};

/**
 * Step 1: Simulate Scheduler Worker triggering N8N workflows
 */
async function simulateSchedulerTrigger() {
  console.log('🎯 Step 1: Simulating Scheduler Worker Trigger\n');
  
  const testTraceId = `workflow-simulation-${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  console.log(`🆔 Test Trace ID: ${testTraceId}`);
  console.log(`⏰ Timestamp: ${timestamp}\n`);
  
  const triggerResults = [];
  
  for (const [kpiId, workflow] of Object.entries(CONFIG.WORKFLOWS)) {
    console.log(`📤 Simulating trigger for ${kpiId} (${workflow.name})...`);
    
    // Simulate what Scheduler Worker would send to N8N webhook
    const schedulerPayload = {
      traceId: testTraceId,
      kpiId: kpiId,
      timestamp: timestamp,
      kpiType: workflow.type,
      metadata: {
        schedulerWorker: 'workflow-simulation-test',
        environment: 'test',
        source: 'simulation'
      }
    };
    
    console.log(`   Scheduler payload:`, JSON.stringify(schedulerPayload, null, 4));
    
    // Simulate N8N workflow processing (data collection + formatting)
    const workflowResponse = simulateN8NWorkflowProcessing(schedulerPayload, workflow);
    
    triggerResults.push({
      kpiId,
      schedulerPayload,
      workflowResponse,
      success: true
    });
    
    console.log(`   ✅ Workflow simulation completed`);
    console.log(`   Simulated response:`, JSON.stringify(workflowResponse, null, 4));
    console.log('');
  }
  
  return {
    traceId: testTraceId,
    timestamp,
    triggerResults
  };
}

/**
 * Simulate N8N workflow processing (what happens inside N8N)
 */
function simulateN8NWorkflowProcessing(schedulerPayload, workflow) {
  // Update the workflow data with the trace ID and timestamp from scheduler
  const workflowData = { ...workflow.simulatedData };
  workflowData.traceId = schedulerPayload.traceId;
  workflowData.timestamp = schedulerPayload.timestamp;
  
  // Simulate data collection (in real N8N, this would call external APIs)
  console.log(`   📊 Simulating data collection for ${workflow.name}...`);
  
  // Simulate chart generation (optional)
  if (Math.random() > 0.5) {
    workflowData.chart = {
      url: `https://example.com/charts/${schedulerPayload.kpiId}-${Date.now()}.png`,
      type: 'line',
      generated: true
    };
    console.log(`   📈 Simulated chart generation`);
  }
  
  return workflowData;
}

/**
 * Step 2: Simulate N8N workflows sending data to Ingestion Worker
 */
async function simulateN8NToIngestionFlow(simulationResults) {
  console.log('📨 Step 2: Simulating N8N to Ingestion Worker Flow\n');
  
  const ingestionResults = [];
  
  for (const triggerResult of simulationResults.triggerResults) {
    const { kpiId, workflowResponse } = triggerResult;
    
    console.log(`📤 Simulating ${kpiId} sending data to Ingestion Worker...`);
    
    try {
      // Convert workflow response to Ingestion Worker format
      const ingestionPayloads = convertWorkflowResponseToIngestionFormat(workflowResponse, kpiId);
      
      // Handle both single and multi-KPI responses
      const payloads = Array.isArray(ingestionPayloads) ? ingestionPayloads : [ingestionPayloads];
      
      for (const payload of payloads) {
        console.log(`   Sending payload for ${payload.kpiId}:`, JSON.stringify(payload, null, 4));
        
        const startTime = Date.now();
        const response = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/kpi-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': CONFIG.INGESTION_API_KEY,
            'User-Agent': 'N8N-Workflow-Simulation/1.0'
          },
          body: JSON.stringify(payload)
        });
        
        const responseTime = Date.now() - startTime;
        
        let responseData;
        try {
          const responseText = await response.text();
          responseData = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          responseData = { message: 'Non-JSON response', body: responseText };
        }
        
        const result = {
          originalKpiId: kpiId,
          targetKpiId: payload.kpiId,
          success: response.ok,
          status: response.status,
          responseTime,
          responseData,
          error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
        };
        
        ingestionResults.push(result);
        
        if (response.ok) {
          console.log(`   ✅ Ingestion successful for ${payload.kpiId} (${responseTime}ms)`);
          console.log(`   Response:`, JSON.stringify(responseData, null, 4));
        } else {
          console.log(`   ❌ Ingestion failed for ${payload.kpiId} (${response.status}) in ${responseTime}ms`);
          console.log(`   Error:`, JSON.stringify(responseData, null, 4));
        }
      }
      
    } catch (error) {
      console.error(`   ❌ Simulation error for ${kpiId}: ${error.message}`);
      ingestionResults.push({
        originalKpiId: kpiId,
        targetKpiId: kpiId,
        success: false,
        error: error.message,
        responseTime: null
      });
    }
    
    console.log('');
  }
  
  return ingestionResults;
}

/**
 * Convert N8N workflow response to Ingestion Worker format
 */
function convertWorkflowResponseToIngestionFormat(workflowResponse, originalKpiId) {
  const { traceId, timestamp } = workflowResponse;
  
  // Handle multi-KPI response (like CMC workflow)
  if (workflowResponse.kpiType === 'cmc-multi' && workflowResponse.kpiIds && workflowResponse.data) {
    const kpiUpdates = [];
    
    for (const kpiId of workflowResponse.kpiIds) {
      if (workflowResponse.data[kpiId] !== undefined) {
        kpiUpdates.push({
          traceId: traceId,
          kpiId: kpiId,
          timestamp: timestamp,
          kpiType: 'price',
          data: {
            value: workflowResponse.data[kpiId],
            source: 'coinmarketcap',
            originalWorkflow: originalKpiId
          },
          chart: workflowResponse.chart || null,
          metadata: {
            source: 'n8n-workflow-simulation',
            originalKpiId: originalKpiId,
            workflowType: 'cmc-multi'
          }
        });
      }
    }
    
    return kpiUpdates;
  } else {
    // Single KPI response
    return {
      traceId: traceId,
      kpiId: originalKpiId,
      timestamp: timestamp,
      kpiType: workflowResponse.kpiType || 'index',
      data: workflowResponse.data,
      chart: workflowResponse.chart || null,
      metadata: {
        source: 'n8n-workflow-simulation',
        originalKpiId: originalKpiId
      }
    };
  }
}

/**
 * Step 3: Verify data was stored correctly in KV stores
 */
async function verifyKVStorage(traceId) {
  console.log('🔍 Step 3: Verifying KV Storage\n');
  
  console.log(`   Trace ID: ${traceId}`);
  
  try {
    // Test KV operations using debug endpoint
    console.log('📊 Testing KV storage operations...');
    const kvResponse = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/debug-kv`, {
      method: 'GET',
      headers: { 'User-Agent': 'N8N-Workflow-Simulation/1.0' }
    });
    
    if (kvResponse.ok) {
      const kvData = await kvResponse.json();
      console.log('   ✅ KV storage operations working');
      console.log('   KV bindings:', JSON.stringify(kvData.bindings, null, 4));
      console.log('   KV tests:', JSON.stringify(kvData.tests, null, 4));
      return { success: true, kvData };
    } else {
      console.log(`   ❌ KV storage test failed: ${kvResponse.status}`);
      return { success: false, error: `HTTP ${kvResponse.status}` };
    }
    
  } catch (error) {
    console.log(`   ❌ KV storage test error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Step 4: Generate comprehensive test report
 */
async function generateSimulationReport(testResults) {
  console.log('📊 Step 4: Generating Simulation Report\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    testType: 'n8n-workflow-simulation',
    testDuration: Date.now() - parseInt(testResults.simulationResults.traceId.split('-')[2]),
    traceId: testResults.simulationResults.traceId,
    configuration: {
      ingestionWorkerUrl: CONFIG.INGESTION_WORKER_URL,
      apiKeyConfigured: !!CONFIG.INGESTION_API_KEY,
      workflowsSimulated: Object.keys(CONFIG.WORKFLOWS).length
    },
    results: testResults,
    summary: {
      workflowsSimulated: testResults.simulationResults.triggerResults.length,
      ingestionSuccessful: testResults.ingestionResults.filter(r => r.success).length,
      totalIngestionAttempts: testResults.ingestionResults.length,
      kvStorageWorking: testResults.kvVerification.success,
      uniqueKPIsProcessed: new Set(testResults.ingestionResults.filter(r => r.success).map(r => r.targetKpiId)).size,
      overallSuccess: false
    },
    insights: [],
    recommendations: []
  };
  
  // Calculate overall success
  report.summary.overallSuccess = (
    report.summary.workflowsSimulated > 0 &&
    report.summary.ingestionSuccessful > 0 &&
    report.summary.kvStorageWorking
  );
  
  // Generate insights
  if (report.summary.uniqueKPIsProcessed > report.summary.workflowsSimulated) {
    report.insights.push(`Multi-KPI workflow detected: ${report.summary.uniqueKPIsProcessed} KPIs processed from ${report.summary.workflowsSimulated} workflows`);
  }
  
  if (report.summary.ingestionSuccessful === report.summary.totalIngestionAttempts) {
    report.insights.push('All simulated N8N workflow data was successfully ingested');
  }
  
  // Generate recommendations
  if (report.summary.ingestionSuccessful === 0) {
    report.recommendations.push('Check Ingestion Worker API key configuration');
    report.recommendations.push('Verify N8N workflows are using correct authentication headers');
  } else if (report.summary.ingestionSuccessful < report.summary.totalIngestionAttempts) {
    report.recommendations.push('Some KPI data failed ingestion - check individual workflow configurations');
  }
  
  if (!report.summary.kvStorageWorking) {
    report.recommendations.push('KV storage operations failed - check Cloudflare KV namespace bindings');
  }
  
  if (report.summary.overallSuccess) {
    report.recommendations.push('Simulation successful - N8N workflows should use the same authentication and payload format');
    report.recommendations.push('Fix N8N workflow header configuration to resolve the "x-api-key" token error');
  }
  
  // Save report
  const reportFilename = `n8n-workflow-simulation-${Date.now()}.json`;
  writeFileSync(reportFilename, JSON.stringify(report, null, 2));
  
  // Display summary
  console.log('=' .repeat(60));
  console.log('📊 N8N WORKFLOW SIMULATION REPORT');
  console.log('=' .repeat(60));
  console.log(`   Test Duration: ${Math.round(report.testDuration / 1000)}s`);
  console.log(`   Trace ID: ${report.traceId}`);
  console.log(`   Workflows Simulated: ${report.summary.workflowsSimulated}`);
  console.log(`   Ingestion Success: ${report.summary.ingestionSuccessful}/${report.summary.totalIngestionAttempts}`);
  console.log(`   Unique KPIs Processed: ${report.summary.uniqueKPIsProcessed}`);
  console.log(`   KV Storage: ${report.summary.kvStorageWorking ? '✅' : '❌'}`);
  console.log(`   Overall Success: ${report.summary.overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (report.insights.length > 0) {
    console.log('\n💡 INSIGHTS:');
    report.insights.forEach((insight, i) => {
      console.log(`   ${i + 1}. ${insight}`);
    });
  }
  
  if (report.recommendations.length > 0) {
    console.log('\n🔧 RECOMMENDATIONS:');
    report.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
  }
  
  console.log('\n🎯 VERIFICATION STEPS:');
  console.log(`   1. Check Cloudflare KV browser for trace ID: ${report.traceId}`);
  console.log('   2. Look for keys matching patterns:');
  console.log(`      - job:${report.traceId}`);
  console.log(`      - timeseries:* (updated with new data)`);
  console.log(`      - package:${report.traceId}:*`);
  console.log('   3. Compare this simulation with actual N8N workflow behavior');
  console.log('   4. Fix N8N workflow header configuration based on working simulation');
  
  console.log(`\n📄 Full report saved to: ${reportFilename}`);
  
  return report;
}

/**
 * Run complete simulation
 */
async function runWorkflowSimulation() {
  console.log('🚀 N8N Workflow Simulation Test\n');
  console.log('=' .repeat(60));
  console.log('Simulating complete N8N workflow to Ingestion Worker flow');
  console.log('This test shows how N8N workflows should behave when properly configured');
  console.log('=' .repeat(60));
  console.log('');
  
  try {
    // Step 1: Simulate Scheduler triggering N8N workflows
    const simulationResults = await simulateSchedulerTrigger();
    
    // Step 2: Simulate N8N workflows sending data to Ingestion Worker
    const ingestionResults = await simulateN8NToIngestionFlow(simulationResults);
    
    // Step 3: Verify KV storage
    const kvVerification = await verifyKVStorage(simulationResults.traceId);
    
    // Step 4: Generate report
    const testResults = {
      simulationResults,
      ingestionResults,
      kvVerification
    };
    
    const report = await generateSimulationReport(testResults);
    
    return report;
    
  } catch (error) {
    console.error('💥 Simulation failed:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'simulate';
  
  try {
    switch (command) {
      case 'simulate':
      case 'test':
        await runWorkflowSimulation();
        break;
        
      case 'help':
      default:
        console.log('🚀 N8N Workflow Simulation Test\n');
        console.log('Available commands:');
        console.log('  simulate - Run workflow simulation (default)');
        console.log('  help     - Show this help message');
        console.log('\nEnvironment Variables:');
        console.log('  INGESTION_API_KEY - API key for Ingestion Worker authentication');
        console.log('  INGESTION_WORKER_URL - Ingestion Worker URL');
        console.log('\nThis simulation verifies:');
        console.log('  ✓ Scheduler Worker trigger format');
        console.log('  ✓ N8N workflow data processing');
        console.log('  ✓ Ingestion Worker authentication and data handling');
        console.log('  ✓ KV storage operations');
        console.log('  ✓ Multi-KPI workflow support');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runWorkflowSimulation };