/**
 * Comprehensive Error Handling Validation Test Runner
 * 
 * Executes all error handling validation tests across all workers:
 * - Ingestion Worker error handling
 * - Scheduler Worker error handling
 * - Orchestration Worker error handling
 * 
 * Provides consolidated reporting and validation results.
 */

import fs from 'fs';
import path from 'path';

/**
 * Test suite configuration
 */
const TEST_CONFIG = {
  ingestionWorkerUrl: process.env.INGESTION_WORKER_URL || 'http://localhost:8787',
  testApiKey: process.env.TEST_API_KEY || 'test-api-key-12345',
  timeout: 30000, // 30 second timeout per test suite
  outputDir: './error-handling-test-results'
};

/**
 * Consolidated test results
 */
const consolidatedResults = {
  suites: {},
  summary: {
    totalPassed: 0,
    totalFailed: 0,
    totalDuration: 0,
    startTime: null,
    endTime: null
  },
  errors: []
};

/**
 * Utility functions
 */
function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 ${title}`);
  console.log('='.repeat(80));
}

function logSubsection(title) {
  console.log('\n' + '-'.repeat(60));
  console.log(`📋 ${title}`);
  console.log('-'.repeat(60));
}

/**
 * Create output directory for test results
 */
function createOutputDirectory() {
  if (!fs.existsSync(TEST_CONFIG.outputDir)) {
    fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${TEST_CONFIG.outputDir}`);
  }
}

/**
 * Run ingestion worker error handling tests
 */
async function runIngestionWorkerTests() {
  logSubsection('Ingestion Worker Error Handling Tests');
  
  try {
    // Import and run the ingestion worker tests
    const { runErrorHandlingValidation } = await import('./test-error-handling-validation.js');
    
    const startTime = Date.now();
    await runErrorHandlingValidation();
    const duration = Date.now() - startTime;
    
    // Get results from the test module
    const { testResults } = await import('./test-error-handling-validation.js');
    
    consolidatedResults.suites.ingestion = {
      name: 'Ingestion Worker',
      passed: testResults.passed,
      failed: testResults.failed,
      duration,
      details: testResults.details,
      errors: testResults.errors
    };
    
    console.log(`✅ Ingestion Worker tests completed: ${testResults.passed} passed, ${testResults.failed} failed`);
    
  } catch (error) {
    console.error(`❌ Ingestion Worker tests failed: ${error.message}`);
    
    consolidatedResults.suites.ingestion = {
      name: 'Ingestion Worker',
      passed: 0,
      failed: 1,
      duration: 0,
      details: [],
      errors: [`Suite execution error: ${error.message}`]
    };
    
    consolidatedResults.errors.push(`Ingestion Worker: ${error.message}`);
  }
}

/**
 * Run scheduler worker error handling tests
 */
async function runSchedulerWorkerTests() {
  logSubsection('Scheduler Worker Error Handling Tests');
  
  try {
    // Import and run the scheduler worker tests
    const { runSchedulerErrorHandlingValidation } = await import('./test-scheduler-error-handling.js');
    
    const startTime = Date.now();
    const results = await runSchedulerErrorHandlingValidation();
    const duration = Date.now() - startTime;
    
    consolidatedResults.suites.scheduler = {
      name: 'Scheduler Worker',
      passed: results.passed,
      failed: results.failed,
      duration,
      details: [],
      errors: results.errors
    };
    
    console.log(`✅ Scheduler Worker tests completed: ${results.passed} passed, ${results.failed} failed`);
    
  } catch (error) {
    console.error(`❌ Scheduler Worker tests failed: ${error.message}`);
    
    consolidatedResults.suites.scheduler = {
      name: 'Scheduler Worker',
      passed: 0,
      failed: 1,
      duration: 0,
      details: [],
      errors: [`Suite execution error: ${error.message}`]
    };
    
    consolidatedResults.errors.push(`Scheduler Worker: ${error.message}`);
  }
}

/**
 * Run orchestration worker error handling tests
 */
async function runOrchestrationWorkerTests() {
  logSubsection('Orchestration Worker Error Handling Tests');
  
  try {
    // Import and run the orchestration worker tests
    const { runOrchestrationErrorHandlingValidation } = await import('./test-orchestration-error-handling.js');
    
    const startTime = Date.now();
    const results = await runOrchestrationErrorHandlingValidation();
    const duration = Date.now() - startTime;
    
    consolidatedResults.suites.orchestration = {
      name: 'Orchestration Worker',
      passed: results.passed,
      failed: results.failed,
      duration,
      details: [],
      errors: results.errors
    };
    
    console.log(`✅ Orchestration Worker tests completed: ${results.passed} passed, ${results.failed} failed`);
    
  } catch (error) {
    console.error(`❌ Orchestration Worker tests failed: ${error.message}`);
    
    consolidatedResults.suites.orchestration = {
      name: 'Orchestration Worker',
      passed: 0,
      failed: 1,
      duration: 0,
      details: [],
      errors: [`Suite execution error: ${error.message}`]
    };
    
    consolidatedResults.errors.push(`Orchestration Worker: ${error.message}`);
  }
}

/**
 * Calculate consolidated summary
 */
function calculateSummary() {
  consolidatedResults.summary.totalPassed = Object.values(consolidatedResults.suites)
    .reduce((sum, suite) => sum + suite.passed, 0);
    
  consolidatedResults.summary.totalFailed = Object.values(consolidatedResults.suites)
    .reduce((sum, suite) => sum + suite.failed, 0);
    
  consolidatedResults.summary.totalDuration = Object.values(consolidatedResults.suites)
    .reduce((sum, suite) => sum + suite.duration, 0);
}

/**
 * Generate consolidated report
 */
function generateConsolidatedReport() {
  logSection('CONSOLIDATED ERROR HANDLING VALIDATION REPORT');
  
  const { summary } = consolidatedResults;
  const totalTests = summary.totalPassed + summary.totalFailed;
  const successRate = totalTests > 0 ? (summary.totalPassed / totalTests * 100).toFixed(1) : 0;
  
  console.log(`⏱️  Total execution time: ${summary.totalDuration}ms`);
  console.log(`📊 Total tests: ${totalTests}`);
  console.log(`✅ Total passed: ${summary.totalPassed}`);
  console.log(`❌ Total failed: ${summary.totalFailed}`);
  console.log(`📈 Overall success rate: ${successRate}%`);
  
  // Per-suite breakdown
  console.log('\n📋 Per-Suite Results:');
  Object.values(consolidatedResults.suites).forEach(suite => {
    const suiteTotal = suite.passed + suite.failed;
    const suiteRate = suiteTotal > 0 ? (suite.passed / suiteTotal * 100).toFixed(1) : 0;
    console.log(`   ${suite.name}: ${suite.passed}/${suiteTotal} passed (${suiteRate}%) - ${suite.duration}ms`);
  });
  
  // Error summary
  if (consolidatedResults.errors.length > 0) {
    console.log('\n🚨 Suite-Level Errors:');
    consolidatedResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  // Detailed failures
  const allFailures = [];
  Object.values(consolidatedResults.suites).forEach(suite => {
    suite.errors.forEach(error => {
      allFailures.push(`${suite.name}: ${error}`);
    });
  });
  
  if (allFailures.length > 0) {
    console.log('\n🔍 Detailed Test Failures:');
    allFailures.forEach((failure, index) => {
      console.log(`   ${index + 1}. ${failure}`);
    });
  }
}

/**
 * Save consolidated results to file
 */
function saveConsolidatedResults() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(TEST_CONFIG.outputDir, `consolidated-error-handling-results-${timestamp}.json`);
  
  const reportData = {
    ...consolidatedResults,
    metadata: {
      testConfig: TEST_CONFIG,
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    }
  };
  
  fs.writeFileSync(resultsFile, JSON.stringify(reportData, null, 2));
  console.log(`\n📄 Consolidated results saved to: ${resultsFile}`);
  
  // Also save a summary report
  const summaryFile = path.join(TEST_CONFIG.outputDir, `error-handling-summary-${timestamp}.md`);
  const summaryContent = generateMarkdownSummary(reportData);
  fs.writeFileSync(summaryFile, summaryContent);
  console.log(`📄 Summary report saved to: ${summaryFile}`);
}

/**
 * Generate markdown summary report
 */
function generateMarkdownSummary(reportData) {
  const { summary, suites } = reportData;
  const totalTests = summary.totalPassed + summary.totalFailed;
  const successRate = totalTests > 0 ? (summary.totalPassed / totalTests * 100).toFixed(1) : 0;
  
  return `# Error Handling Validation Report

## Summary

- **Total Tests**: ${totalTests}
- **Passed**: ${summary.totalPassed}
- **Failed**: ${summary.totalFailed}
- **Success Rate**: ${successRate}%
- **Total Duration**: ${summary.totalDuration}ms
- **Generated**: ${new Date().toISOString()}

## Per-Suite Results

${Object.values(suites).map(suite => {
  const suiteTotal = suite.passed + suite.failed;
  const suiteRate = suiteTotal > 0 ? (suite.passed / suiteTotal * 100).toFixed(1) : 0;
  return `### ${suite.name}

- **Tests**: ${suiteTotal}
- **Passed**: ${suite.passed}
- **Failed**: ${suite.failed}
- **Success Rate**: ${suiteRate}%
- **Duration**: ${suite.duration}ms

${suite.errors.length > 0 ? `**Errors:**
${suite.errors.map(error => `- ${error}`).join('\n')}` : '✅ No errors'}
`;
}).join('\n')}

## Recommendations

${summary.totalFailed > 0 ? `
⚠️ **Action Required**: ${summary.totalFailed} tests failed. Please review the error handling implementation in the affected components.

### Priority Areas:
${Object.values(suites).filter(suite => suite.failed > 0).map(suite => 
  `- **${suite.name}**: ${suite.failed} failed tests`
).join('\n')}
` : '✅ **All Tests Passed**: Error handling validation completed successfully across all components.'}

## Next Steps

1. Review failed tests and implement necessary fixes
2. Re-run validation after fixes are applied
3. Consider adding additional edge case tests based on findings
4. Update error handling documentation if needed
`;
}

/**
 * Check prerequisites
 */
async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  // Check if ingestion worker is running (for live tests)
  try {
    const response = await fetch(`${TEST_CONFIG.ingestionWorkerUrl}/api/health`);
    if (response.ok) {
      console.log('✅ Ingestion Worker is accessible');
    } else {
      console.log('⚠️  Ingestion Worker health check failed, some tests may fail');
    }
  } catch (error) {
    console.log('⚠️  Ingestion Worker not accessible, using mock tests only');
  }
  
  // Check if test files exist
  const testFiles = [
    './test-error-handling-validation.js',
    './test-scheduler-error-handling.js',
    './test-orchestration-error-handling.js'
  ];
  
  for (const file of testFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} found`);
    } else {
      console.log(`❌ ${file} not found`);
      throw new Error(`Required test file not found: ${file}`);
    }
  }
}

/**
 * Main test execution
 */
async function runAllErrorHandlingTests() {
  console.log('🚀 Starting Comprehensive Error Handling Validation');
  console.log('🎯 Testing all workers: Ingestion, Scheduler, Orchestration');
  
  consolidatedResults.summary.startTime = new Date().toISOString();
  const overallStartTime = Date.now();
  
  try {
    // Setup
    createOutputDirectory();
    await checkPrerequisites();
    
    // Run all test suites
    await runIngestionWorkerTests();
    await runSchedulerWorkerTests();
    await runOrchestrationWorkerTests();
    
    // Calculate results
    consolidatedResults.summary.endTime = new Date().toISOString();
    consolidatedResults.summary.totalDuration = Date.now() - overallStartTime;
    calculateSummary();
    
    // Generate reports
    generateConsolidatedReport();
    saveConsolidatedResults();
    
    // Determine exit code
    const hasFailures = consolidatedResults.summary.totalFailed > 0 || consolidatedResults.errors.length > 0;
    
    if (hasFailures) {
      console.log('\n❌ Error handling validation completed with failures.');
      console.log('📋 Please review the detailed results and fix the identified issues.');
      process.exit(1);
    } else {
      console.log('\n✅ All error handling validation tests passed successfully!');
      console.log('🎉 The system demonstrates robust error handling across all components.');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n💥 Fatal error during test execution:', error);
    
    // Save error report
    const errorReport = {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      partialResults: consolidatedResults
    };
    
    const errorFile = path.join(TEST_CONFIG.outputDir, `error-report-${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify(errorReport, null, 2));
    console.log(`📄 Error report saved to: ${errorFile}`);
    
    process.exit(1);
  }
}

// Run the comprehensive test suite
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllErrorHandlingTests().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export {
  runAllErrorHandlingTests,
  consolidatedResults
};