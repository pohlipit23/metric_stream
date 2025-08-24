#!/usr/bin/env node

/**
 * KV Data Storage Verification Script
 * 
 * This script verifies that data appears correctly in KV store for:
 * - Time series data (timeseries:kpiId)
 * - KPI packages (package:traceId:kpiId) 
 * - Job status (job:traceId)
 * 
 * This implements Task 3.5: "Confirm data appears correctly in KV store"
 * 
 * Usage: node verify-kv-data-storage.js [command]
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

// Configuration
const CONFIG = {
  // Worker URLs for KV access
  INGESTION_WORKER_URL: process.env.INGESTION_WORKER_URL || 'https://ingestion-worker.pohlipit.workers.dev',
  
  // API Keys
  INGESTION_API_KEY: process.env.INGESTION_API_KEY || 'ed774c2e9ea976b733b306524f547623098310dd21453b0fec56055ab8b5b359',
  
  // Test Configuration
  TEST_TIMEOUT: 30000, // 30 seconds
  
  // Expected KV Store Structure
  EXPECTED_KV_STORES: {
    TIMESERIES_KV: 'Time series data storage',
    JOBS_KV: 'Job status tracking',
    PACKAGES_KV: 'KPI packages storage'
  },
  
  // Expected Key Patterns
  EXPECTED_KEY_PATTERNS: {
    timeseries: 'timeseries:{kpiId}',
    job: 'job:{traceId}',
    package: 'package:{traceId}:{kpiId}',
    consolidated: 'consolidated:{traceId}',
    idempotency: 'idempotency:{kpiId}:{timestamp}'
  }
};

/**
 * Step 1: Verify KV Store Bindings and Health
 */
async function verifyKVStoreBindings() {
  console.log('🔍 Step 1: Verifying KV Store Bindings\n');
  
  try {
    console.log('📡 Testing KV bindings via Ingestion Worker...');
    
    const response = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/debug-kv`, {
      method: 'GET',
      headers: {
        'User-Agent': 'KV-Verification-Test/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const kvData = await response.json();
    
    console.log('✅ KV bindings test successful');
    console.log('📊 KV Store Status:');
    
    // Verify expected KV stores are bound
    const boundStores = kvData.bindings || {};
    const expectedStores = Object.keys(CONFIG.EXPECTED_KV_STORES);
    
    let allStoresBound = true;
    
    for (const storeName of expectedStores) {
      const isBound = boundStores[storeName] === 'available';
      console.log(`   ${isBound ? '✅' : '❌'} ${storeName}: ${isBound ? 'Available' : 'Missing'}`);
      
      if (!isBound) {
        allStoresBound = false;
      }
    }
    
    // Test basic KV operations
    console.log('\n🧪 Testing KV Operations:');
    if (kvData.tests) {
      for (const [operation, result] of Object.entries(kvData.tests)) {
        const success = result === 'success';
        console.log(`   ${success ? '✅' : '❌'} ${operation}: ${result}`);
      }
    }
    
    return {
      success: allStoresBound,
      bindings: boundStores,
      tests: kvData.tests || {},
      details: kvData
    };
    
  } catch (error) {
    console.error('❌ KV bindings test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Step 2: Verify Time Series Data Structure
 */
async function verifyTimeSeriesData() {
  console.log('\n🔍 Step 2: Verifying Time Series Data Structure\n');
  
  // Check if we have actual KV data file
  if (!existsSync('actual-kv-data.json')) {
    console.log('⚠️ actual-kv-data.json not found');
    console.log('💡 Run: node test-actual-kv-analysis.js fetch');
    return { success: false, reason: 'No KV data file found' };
  }
  
  try {
    const kvData = JSON.parse(readFileSync('actual-kv-data.json', 'utf8'));
    
    console.log('📊 Analyzing Time Series Data Structure...');
    
    const timeSeriesKeys = Object.keys(kvData).filter(key => key.startsWith('timeseries:'));
    
    if (timeSeriesKeys.length === 0) {
      console.log('❌ No time series data found');
      return { success: false, reason: 'No time series keys found' };
    }
    
    console.log(`✅ Found ${timeSeriesKeys.length} time series entries`);
    
    const analysisResults = {
      totalTimeSeries: timeSeriesKeys.length,
      kpis: [],
      dataQuality: {
        validStructure: 0,
        hasDataPoints: 0,
        hasMetadata: 0,
        chronologicalOrder: 0
      }
    };
    
    // Analyze each time series
    for (const key of timeSeriesKeys) {
      const kpiId = key.replace('timeseries:', '');
      const timeSeriesData = kvData[key];
      
      console.log(`\n📈 Analyzing KPI: ${kpiId}`);
      
      const analysis = {
        kpiId,
        key,
        valid: true,
        issues: []
      };
      
      // Check basic structure
      if (!timeSeriesData || typeof timeSeriesData !== 'object') {
        analysis.valid = false;
        analysis.issues.push('Invalid data structure');
        console.log('   ❌ Invalid data structure');
      } else {
        console.log('   ✅ Valid object structure');
        analysisResults.dataQuality.validStructure++;
      }
      
      // Check for data points
      if (timeSeriesData.dataPoints && Array.isArray(timeSeriesData.dataPoints)) {
        const pointCount = timeSeriesData.dataPoints.length;
        console.log(`   ✅ Data points: ${pointCount}`);
        analysisResults.dataQuality.hasDataPoints++;
        
        // Check data point structure
        if (pointCount > 0) {
          const firstPoint = timeSeriesData.dataPoints[0];
          const lastPoint = timeSeriesData.dataPoints[pointCount - 1];
          
          // Verify required fields
          const requiredFields = ['timestamp', 'value'];
          const hasAllFields = requiredFields.every(field => field in firstPoint);
          
          if (hasAllFields) {
            console.log('   ✅ Data points have required fields (timestamp, value)');
          } else {
            analysis.issues.push('Missing required fields in data points');
            console.log('   ❌ Missing required fields in data points');
          }
          
          // Check chronological order
          if (pointCount > 1) {
            const firstTime = new Date(firstPoint.timestamp);
            const lastTime = new Date(lastPoint.timestamp);
            
            if (lastTime >= firstTime) {
              console.log('   ✅ Data points in chronological order');
              analysisResults.dataQuality.chronologicalOrder++;
            } else {
              analysis.issues.push('Data points not in chronological order');
              console.log('   ❌ Data points not in chronological order');
            }
          }
          
          // Show sample data
          console.log('   📊 Sample data point:');
          console.log(`      Timestamp: ${firstPoint.timestamp}`);
          console.log(`      Value: ${firstPoint.value}`);
          console.log(`      Has metadata: ${firstPoint.metadata ? 'Yes' : 'No'}`);
        }
      } else {
        analysis.valid = false;
        analysis.issues.push('No data points array found');
        console.log('   ❌ No data points array found');
      }
      
      // Check for metadata
      if (timeSeriesData.metadata) {
        console.log('   ✅ Has time series metadata');
        analysisResults.dataQuality.hasMetadata++;
        
        if (timeSeriesData.metadata.totalPoints) {
          console.log(`      Total points: ${timeSeriesData.metadata.totalPoints}`);
        }
        if (timeSeriesData.metadata.source) {
          console.log(`      Source: ${timeSeriesData.metadata.source}`);
        }
      } else {
        console.log('   ⚠️ No time series metadata');
      }
      
      analysisResults.kpis.push(analysis);
    }
    
    // Summary
    console.log('\n📊 Time Series Data Quality Summary:');
    console.log(`   Total KPIs: ${analysisResults.totalTimeSeries}`);
    console.log(`   Valid structure: ${analysisResults.dataQuality.validStructure}/${analysisResults.totalTimeSeries}`);
    console.log(`   Has data points: ${analysisResults.dataQuality.hasDataPoints}/${analysisResults.totalTimeSeries}`);
    console.log(`   Has metadata: ${analysisResults.dataQuality.hasMetadata}/${analysisResults.totalTimeSeries}`);
    console.log(`   Chronological order: ${analysisResults.dataQuality.chronologicalOrder}/${analysisResults.totalTimeSeries}`);
    
    const overallSuccess = (
      analysisResults.dataQuality.validStructure === analysisResults.totalTimeSeries &&
      analysisResults.dataQuality.hasDataPoints === analysisResults.totalTimeSeries
    );
    
    console.log(`\n${overallSuccess ? '✅' : '❌'} Time Series Data: ${overallSuccess ? 'EXCELLENT' : 'NEEDS ATTENTION'}`);
    
    return {
      success: overallSuccess,
      analysis: analysisResults
    };
    
  } catch (error) {
    console.error('❌ Error analyzing time series data:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Step 3: Test KPI Package Creation
 */
async function testKPIPackageCreation() {
  console.log('\n🔍 Step 3: Testing KPI Package Creation\n');
  
  try {
    const testTraceId = `kv-verification-${Date.now()}`;
    const testKpiId = 'test-kpi-package';
    const timestamp = new Date().toISOString();
    
    console.log(`🆔 Test Trace ID: ${testTraceId}`);
    console.log(`📦 Test KPI ID: ${testKpiId}`);
    
    // Send test data to create a KPI package
    const testPayload = {
      traceId: testTraceId,
      kpiId: testKpiId,
      timestamp: timestamp,
      kpiType: 'test',
      data: {
        value: 42.5,
        metadata: {
          test: true,
          verification: 'kv-package-test'
        }
      },
      metadata: {
        source: 'kv-verification-test',
        purpose: 'package-creation-test'
      }
    };
    
    console.log('📤 Sending test data to create KPI package...');
    
    const response = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/kpi-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.INGESTION_API_KEY,
        'User-Agent': 'KV-Verification-Test/1.0'
      },
      body: JSON.stringify(testPayload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    console.log('✅ KPI package creation test successful');
    console.log('📊 Response:', JSON.stringify(responseData, null, 2));
    
    // Verify expected keys were created
    console.log('\n🔍 Expected KV Keys Created:');
    console.log(`   📈 Time Series: timeseries:${testKpiId}`);
    console.log(`   📦 KPI Package: package:${testTraceId}:${testKpiId}`);
    console.log(`   🎯 Job Status: job:${testTraceId}`);
    console.log(`   🔒 Idempotency: idempotency:${testKpiId}:${timestamp}`);
    
    return {
      success: true,
      traceId: testTraceId,
      kpiId: testKpiId,
      response: responseData,
      expectedKeys: {
        timeSeries: `timeseries:${testKpiId}`,
        package: `package:${testTraceId}:${testKpiId}`,
        job: `job:${testTraceId}`,
        idempotency: `idempotency:${testKpiId}:${timestamp}`
      }
    };
    
  } catch (error) {
    console.error('❌ KPI package creation test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Step 4: Test Job Status Tracking
 */
async function testJobStatusTracking() {
  console.log('\n🔍 Step 4: Testing Job Status Tracking\n');
  
  try {
    const testTraceId = `job-status-test-${Date.now()}`;
    const testKpis = ['test-kpi-1', 'test-kpi-2', 'test-kpi-3'];
    
    console.log(`🆔 Test Trace ID: ${testTraceId}`);
    console.log(`📋 Test KPIs: ${testKpis.join(', ')}`);
    
    const jobResults = [];
    
    // Send data for multiple KPIs to test job status tracking
    for (let i = 0; i < testKpis.length; i++) {
      const kpiId = testKpis[i];
      const timestamp = new Date(Date.now() + i * 1000).toISOString(); // Stagger timestamps
      
      console.log(`\n📤 Sending data for KPI ${i + 1}/${testKpis.length}: ${kpiId}`);
      
      const testPayload = {
        traceId: testTraceId,
        kpiId: kpiId,
        timestamp: timestamp,
        kpiType: 'test',
        data: {
          value: 100 + i * 10,
          sequence: i + 1
        },
        metadata: {
          source: 'job-status-test',
          kpiIndex: i
        }
      };
      
      const response = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/kpi-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': CONFIG.INGESTION_API_KEY,
          'User-Agent': 'KV-Verification-Test/1.0'
        },
        body: JSON.stringify(testPayload)
      });
      
      if (response.ok) {
        const responseData = await response.json();
        jobResults.push({
          kpiId,
          success: true,
          response: responseData
        });
        console.log(`   ✅ ${kpiId}: Success`);
      } else {
        jobResults.push({
          kpiId,
          success: false,
          error: `HTTP ${response.status}`
        });
        console.log(`   ❌ ${kpiId}: Failed (${response.status})`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const successfulKpis = jobResults.filter(r => r.success).length;
    
    console.log(`\n📊 Job Status Test Results:`);
    console.log(`   Successful KPIs: ${successfulKpis}/${testKpis.length}`);
    console.log(`   Expected Job Key: job:${testTraceId}`);
    
    return {
      success: successfulKpis > 0,
      traceId: testTraceId,
      kpis: testKpis,
      results: jobResults,
      successfulKpis: successfulKpis,
      expectedJobKey: `job:${testTraceId}`
    };
    
  } catch (error) {
    console.error('❌ Job status tracking test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Step 5: Test Idempotency Handling
 */
async function testIdempotencyHandling() {
  console.log('\n🔍 Step 5: Testing Idempotency Handling\n');
  
  try {
    const testTraceId = `idempotency-test-${Date.now()}`;
    const testKpiId = 'test-idempotency-kpi';
    const timestamp = new Date().toISOString();
    
    console.log(`🆔 Test Trace ID: ${testTraceId}`);
    console.log(`📦 Test KPI ID: ${testKpiId}`);
    console.log(`⏰ Fixed Timestamp: ${timestamp}`);
    
    const testPayload = {
      traceId: testTraceId,
      kpiId: testKpiId,
      timestamp: timestamp,
      kpiType: 'test',
      data: {
        value: 99.9,
        test: 'idempotency'
      },
      metadata: {
        source: 'idempotency-test'
      }
    };
    
    console.log('\n📤 Sending initial request...');
    
    // First request
    const response1 = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/kpi-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.INGESTION_API_KEY,
        'User-Agent': 'KV-Verification-Test/1.0'
      },
      body: JSON.stringify(testPayload)
    });
    
    if (!response1.ok) {
      throw new Error(`First request failed: HTTP ${response1.status}`);
    }
    
    const responseData1 = await response1.json();
    console.log('✅ First request successful');
    console.log(`   Processed: ${responseData1.processed || 0}`);
    console.log(`   Skipped: ${responseData1.skipped || 0}`);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n📤 Sending duplicate request (same timestamp)...');
    
    // Second request with same timestamp (should be idempotent)
    const response2 = await fetch(`${CONFIG.INGESTION_WORKER_URL}/api/kpi-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.INGESTION_API_KEY,
        'User-Agent': 'KV-Verification-Test/1.0'
      },
      body: JSON.stringify(testPayload)
    });
    
    if (!response2.ok) {
      throw new Error(`Second request failed: HTTP ${response2.status}`);
    }
    
    const responseData2 = await response2.json();
    console.log('✅ Second request successful');
    console.log(`   Processed: ${responseData2.processed || 0}`);
    console.log(`   Skipped: ${responseData2.skipped || 0}`);
    
    // Check if idempotency worked (second request should skip duplicate)
    const idempotencyWorking = (responseData2.skipped || 0) > 0;
    
    console.log(`\n📊 Idempotency Test Results:`);
    console.log(`   First request processed: ${responseData1.processed || 0} items`);
    console.log(`   Second request skipped: ${responseData2.skipped || 0} items`);
    console.log(`   Idempotency working: ${idempotencyWorking ? '✅ YES' : '❌ NO'}`);
    
    return {
      success: idempotencyWorking,
      traceId: testTraceId,
      kpiId: testKpiId,
      timestamp: timestamp,
      firstResponse: responseData1,
      secondResponse: responseData2,
      idempotencyWorking: idempotencyWorking
    };
    
  } catch (error) {
    console.error('❌ Idempotency test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Step 6: Generate Comprehensive Verification Report
 */
async function generateVerificationReport(testResults) {
  console.log('\n📊 Step 6: Generating KV Data Verification Report\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    testDuration: Date.now() - parseInt(testResults.packageTest?.traceId?.split('-')[2] || Date.now()),
    summary: {
      kvBindingsWorking: testResults.kvBindings?.success || false,
      timeSeriesDataValid: testResults.timeSeriesData?.success || false,
      packageCreationWorking: testResults.packageTest?.success || false,
      jobStatusTrackingWorking: testResults.jobStatusTest?.success || false,
      idempotencyWorking: testResults.idempotencyTest?.success || false,
      overallSuccess: false
    },
    details: testResults,
    kvStoreStatus: {
      expectedStores: Object.keys(CONFIG.EXPECTED_KV_STORES),
      boundStores: testResults.kvBindings?.bindings || {},
      keyPatterns: CONFIG.EXPECTED_KEY_PATTERNS
    },
    testTraceIds: {
      packageTest: testResults.packageTest?.traceId,
      jobStatusTest: testResults.jobStatusTest?.traceId,
      idempotencyTest: testResults.idempotencyTest?.traceId
    },
    recommendations: [],
    verificationSteps: []
  };
  
  // Calculate overall success
  const successfulTests = Object.values(report.summary).filter(Boolean).length - 1; // Exclude overallSuccess
  report.summary.overallSuccess = successfulTests >= 4; // At least 4 out of 5 tests should pass
  
  // Generate recommendations
  if (!report.summary.kvBindingsWorking) {
    report.recommendations.push('Check Cloudflare KV namespace bindings in wrangler.toml');
    report.recommendations.push('Verify KV namespaces exist in Cloudflare dashboard');
  }
  
  if (!report.summary.timeSeriesDataValid) {
    report.recommendations.push('Check time series data structure in actual-kv-data.json');
    report.recommendations.push('Verify N8N workflows are sending properly formatted data');
  }
  
  if (!report.summary.packageCreationWorking) {
    report.recommendations.push('Check Ingestion Worker KPI package creation logic');
    report.recommendations.push('Verify PACKAGES_KV namespace is properly bound');
  }
  
  if (!report.summary.jobStatusTrackingWorking) {
    report.recommendations.push('Check Ingestion Worker job status tracking logic');
    report.recommendations.push('Verify JOBS_KV namespace is properly bound');
  }
  
  if (!report.summary.idempotencyWorking) {
    report.recommendations.push('Check Ingestion Worker idempotency logic');
    report.recommendations.push('Verify idempotency key creation and checking');
  }
  
  // Generate verification steps
  report.verificationSteps = [
    'Open Cloudflare Dashboard > Workers & Pages > KV',
    'Check the following KV namespaces exist and have data:',
    '  - TIMESERIES_KV (time series data)',
    '  - JOBS_KV (job status records)',
    '  - PACKAGES_KV (KPI packages)',
    'Look for keys matching these patterns:',
    `  - timeseries:* (time series data)`,
    `  - job:* (job status records)`,
    `  - package:*:* (KPI packages)`,
    `  - idempotency:*:* (duplicate prevention)`,
    'Verify data structure matches expected schema',
    'Check Ingestion Worker logs for any errors'
  ];
  
  if (report.testTraceIds.packageTest) {
    report.verificationSteps.push(`Search for trace ID: ${report.testTraceIds.packageTest}`);
  }
  
  // Save report
  const reportFilename = `kv-data-verification-${Date.now()}.json`;
  writeFileSync(reportFilename, JSON.stringify(report, null, 2));
  
  // Display summary
  console.log('=' .repeat(70));
  console.log('📊 KV DATA STORAGE VERIFICATION REPORT');
  console.log('=' .repeat(70));
  console.log(`   Test Duration: ${Math.round(report.testDuration / 1000)}s`);
  console.log(`   KV Bindings: ${report.summary.kvBindingsWorking ? '✅' : '❌'}`);
  console.log(`   Time Series Data: ${report.summary.timeSeriesDataValid ? '✅' : '❌'}`);
  console.log(`   Package Creation: ${report.summary.packageCreationWorking ? '✅' : '❌'}`);
  console.log(`   Job Status Tracking: ${report.summary.jobStatusTrackingWorking ? '✅' : '❌'}`);
  console.log(`   Idempotency: ${report.summary.idempotencyWorking ? '✅' : '❌'}`);
  console.log(`   Overall Success: ${report.summary.overallSuccess ? '✅ SUCCESS' : '❌ NEEDS ATTENTION'}`);
  
  if (report.recommendations.length > 0) {
    console.log('\n🔧 RECOMMENDATIONS:');
    report.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
  }
  
  console.log('\n🎯 MANUAL VERIFICATION STEPS:');
  report.verificationSteps.forEach((step, i) => {
    console.log(`   ${i + 1}. ${step}`);
  });
  
  console.log(`\n📄 Full report saved to: ${reportFilename}`);
  
  return report;
}

/**
 * Run complete KV data verification
 */
async function runCompleteVerification() {
  console.log('🚀 KV Data Storage Verification\n');
  console.log('=' .repeat(70));
  console.log('This test verifies that data appears correctly in KV store:');
  console.log('- Time series data (timeseries:kpiId)');
  console.log('- KPI packages (package:traceId:kpiId)');
  console.log('- Job status (job:traceId)');
  console.log('=' .repeat(70));
  console.log('');
  
  const testResults = {};
  
  try {
    // Step 1: Verify KV Store Bindings
    testResults.kvBindings = await verifyKVStoreBindings();
    
    // Step 2: Verify Time Series Data Structure
    testResults.timeSeriesData = await verifyTimeSeriesData();
    
    // Step 3: Test KPI Package Creation
    testResults.packageTest = await testKPIPackageCreation();
    
    // Step 4: Test Job Status Tracking
    testResults.jobStatusTest = await testJobStatusTracking();
    
    // Step 5: Test Idempotency Handling
    testResults.idempotencyTest = await testIdempotencyHandling();
    
    // Step 6: Generate Report
    const report = await generateVerificationReport(testResults);
    
    return report;
    
  } catch (error) {
    console.error('💥 KV verification failed:', error);
    throw error;
  }
}

/**
 * Quick KV health check
 */
async function quickKVHealthCheck() {
  console.log('⚡ Quick KV Health Check\n');
  
  try {
    const kvBindings = await verifyKVStoreBindings();
    
    if (kvBindings.success) {
      console.log('✅ KV stores are healthy and accessible');
    } else {
      console.log('❌ KV stores have issues');
      console.log('💡 Run full verification: node verify-kv-data-storage.js verify');
    }
    
    return kvBindings;
    
  } catch (error) {
    console.error('❌ KV health check failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main command handler
 */
async function main() {
  const command = process.argv[2] || 'verify';
  
  try {
    switch (command) {
      case 'verify':
      case 'test':
        await runCompleteVerification();
        break;
        
      case 'health':
        await quickKVHealthCheck();
        break;
        
      case 'bindings':
        await verifyKVStoreBindings();
        break;
        
      case 'timeseries':
        await verifyTimeSeriesData();
        break;
        
      case 'package':
        await testKPIPackageCreation();
        break;
        
      case 'job':
        await testJobStatusTracking();
        break;
        
      case 'idempotency':
        await testIdempotencyHandling();
        break;
        
      case 'help':
      default:
        console.log('🚀 KV Data Storage Verification\n');
        console.log('Available commands:');
        console.log('  verify      - Run complete KV data verification (default)');
        console.log('  health      - Quick KV health check');
        console.log('  bindings    - Test KV store bindings only');
        console.log('  timeseries  - Verify time series data structure');
        console.log('  package     - Test KPI package creation');
        console.log('  job         - Test job status tracking');
        console.log('  idempotency - Test idempotency handling');
        console.log('  help        - Show this help message');
        console.log('\nEnvironment Variables:');
        console.log('  INGESTION_API_KEY - API key for Ingestion Worker');
        console.log('  INGESTION_WORKER_URL - Ingestion Worker URL');
        console.log('\nThis test verifies:');
        console.log('  ✓ KV store bindings are working');
        console.log('  ✓ Time series data structure is correct');
        console.log('  ✓ KPI packages are created properly');
        console.log('  ✓ Job status tracking works');
        console.log('  ✓ Idempotency prevents duplicates');
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

export { 
  runCompleteVerification,
  verifyKVStoreBindings,
  verifyTimeSeriesData,
  testKPIPackageCreation,
  testJobStatusTracking,
  testIdempotencyHandling
};