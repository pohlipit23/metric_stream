#!/usr/bin/env node

/**
 * KPI Registry Implementation Test Suite
 * Tests the complete KPI Registry Management UI implementation
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🧪 KPI Registry Implementation Test Suite');
console.log('==========================================\n');

/**
 * Test Results Tracker
 */
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

/**
 * 1. File Structure Tests
 */
console.log('📁 Testing File Structure...\n');

// Check if all required files exist
const requiredFiles = [
  'src/admin-console/src/pages/KPIRegistry.jsx',
  'src/admin-console/src/utils/api.js',
  'src/workers/admin-console/handlers/kpi-registry.js',
  'src/workers/admin-console/utils/validation.js',
  'src/workers/admin-console/utils/kv-operations.js'
];

requiredFiles.forEach(file => {
  const exists = existsSync(file);
  logTest(`File exists: ${file}`, exists);
});

/**
 * 2. Frontend Component Tests
 */
console.log('\n🎨 Testing Frontend Components...\n');

try {
  const kpiRegistryContent = readFileSync('src/admin-console/src/pages/KPIRegistry.jsx', 'utf8');
  
  // Test for required imports
  const requiredImports = [
    'useAuth',
    'kpiAPI',
    'APIError',
    'useState',
    'useEffect'
  ];
  
  requiredImports.forEach(importName => {
    const hasImport = kpiRegistryContent.includes(importName);
    logTest(`Has required import: ${importName}`, hasImport);
  });
  
  // Test for CRUD operations
  const crudOperations = [
    'loadKPIs',
    'saveKPI',
    'deleteKPI',
    'handleEdit',
    'handleDelete'
  ];
  
  crudOperations.forEach(operation => {
    const hasOperation = kpiRegistryContent.includes(operation);
    logTest(`Has CRUD operation: ${operation}`, hasOperation);
  });
  
  // Test for form fields
  const formFields = [
    'name',
    'description', 
    'webhook_url',
    'analysis_config',
    'active'
  ];
  
  formFields.forEach(field => {
    const hasField = kpiRegistryContent.includes(field);
    logTest(`Has form field: ${field}`, hasField);
  });
  
  // Test for analysis configuration options
  const analysisOptions = [
    'chart_method',
    'chart_type',
    'llm_priority',
    'custom_prompt',
    'retention_days',
    'alert_high',
    'alert_low'
  ];
  
  analysisOptions.forEach(option => {
    const hasOption = kpiRegistryContent.includes(option);
    logTest(`Has analysis config: ${option}`, hasOption);
  });
  
  // Test for validation
  const validationFeatures = [
    'validateForm',
    'formErrors',
    'setFormErrors'
  ];
  
  validationFeatures.forEach(feature => {
    const hasFeature = kpiRegistryContent.includes(feature);
    logTest(`Has validation feature: ${feature}`, hasFeature);
  });
  
  // Test for webhook testing
  const webhookFeatures = [
    'testWebhook',
    'testingWebhook',
    'webhookTestResult'
  ];
  
  webhookFeatures.forEach(feature => {
    const hasFeature = kpiRegistryContent.includes(feature);
    logTest(`Has webhook testing: ${feature}`, hasFeature);
  });

} catch (error) {
  logTest('Frontend component analysis', false, error.message);
}

/**
 * 3. API Utility Tests
 */
console.log('\n🔌 Testing API Utilities...\n');

try {
  const apiContent = readFileSync('src/admin-console/src/utils/api.js', 'utf8');
  
  // Test for API operations
  const apiOperations = [
    'kpiAPI.list',
    'kpiAPI.create',
    'kpiAPI.update',
    'kpiAPI.delete',
    'kpiAPI.get',
    'APIError'
  ];
  
  apiOperations.forEach(operation => {
    const hasOperation = apiContent.includes(operation);
    logTest(`Has API operation: ${operation}`, hasOperation);
  });
  
  // Test for proper error handling
  const errorHandling = [
    'APIError',
    'credentials: \'include\'',
    'Content-Type',
    'try {',
    'catch'
  ];
  
  errorHandling.forEach(feature => {
    const hasFeature = apiContent.includes(feature);
    logTest(`Has error handling feature: ${feature}`, hasFeature);
  });

} catch (error) {
  logTest('API utilities analysis', false, error.message);
}

/**
 * 4. Backend Handler Tests
 */
console.log('\n⚙️ Testing Backend Handlers...\n');

try {
  const handlerContent = readFileSync('src/workers/admin-console/handlers/kpi-registry.js', 'utf8');
  
  // Test for handler functions
  const handlerFunctions = [
    'handleKPIEndpoints',
    'listKPIs',
    'createKPI',
    'updateKPI',
    'deleteKPI',
    'getKPI'
  ];
  
  handlerFunctions.forEach(func => {
    const hasFunction = handlerContent.includes(func);
    logTest(`Has handler function: ${func}`, hasFunction);
  });
  
  // Test for validation integration
  const validationIntegration = [
    'validateKPIRegistryEntry',
    'validation.valid',
    'validation.errors'
  ];
  
  validationIntegration.forEach(feature => {
    const hasFeature = handlerContent.includes(feature);
    logTest(`Has validation integration: ${feature}`, hasFeature);
  });

} catch (error) {
  logTest('Backend handler analysis', false, error.message);
}

/**
 * 5. Validation Tests
 */
console.log('\n✅ Testing Validation Logic...\n');

try {
  const validationContent = readFileSync('src/workers/admin-console/utils/validation.js', 'utf8');
  
  // Test for validation functions
  const validationFunctions = [
    'validateKPIRegistryEntry',
    'validateAnalysisConfig',
    'generateKPIId'
  ];
  
  validationFunctions.forEach(func => {
    const hasFunction = validationContent.includes(func);
    logTest(`Has validation function: ${func}`, hasFunction);
  });
  
  // Test for analysis config validation
  const analysisValidation = [
    'chart_method',
    'chart_type', 
    'llm_priority',
    'retention_days',
    'alert_high',
    'alert_low'
  ];
  
  analysisValidation.forEach(field => {
    const hasValidation = validationContent.includes(field);
    logTest(`Has analysis validation for: ${field}`, hasValidation);
  });

} catch (error) {
  logTest('Validation logic analysis', false, error.message);
}

/**
 * 6. Integration Tests
 */
console.log('\n🔗 Testing Integration Points...\n');

// Test AuthContext integration
try {
  const kpiContent = readFileSync('src/admin-console/src/pages/KPIRegistry.jsx', 'utf8');
  const authIntegration = [
    'useAuth()',
    'isAuthenticated',
    'credentials: \'include\''
  ];
  
  authIntegration.forEach(feature => {
    const hasFeature = kpiContent.includes(feature);
    logTest(`Has auth integration: ${feature}`, hasFeature);
  });
} catch (error) {
  logTest('Auth integration analysis', false, error.message);
}

/**
 * 7. Manual Testing Instructions
 */
console.log('\n📋 Manual Testing Instructions...\n');

const manualTests = [
  {
    name: 'Start Admin Console',
    command: 'cd src/admin-console && npm run dev',
    description: 'Start the development server and navigate to /kpi-registry'
  },
  {
    name: 'Start Admin Console Worker',
    command: 'cd src/workers/admin-console && npm run dev',
    description: 'Start the worker in development mode'
  },
  {
    name: 'Test KPI Creation',
    description: 'Click "Add KPI" and fill out the form with valid data'
  },
  {
    name: 'Test Form Validation',
    description: 'Try submitting empty form to see validation errors'
  },
  {
    name: 'Test Webhook Testing',
    description: 'Enter a webhook URL and click "Test Webhook"'
  },
  {
    name: 'Test KPI Editing',
    description: 'Click edit button on existing KPI and modify data'
  },
  {
    name: 'Test KPI Deletion',
    description: 'Click delete button and confirm deletion'
  }
];

manualTests.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name}`);
  if (test.command) console.log(`   Command: ${test.command}`);
  console.log(`   Action: ${test.description}\n`);
});

/**
 * 8. Test Summary
 */
console.log('📊 Test Summary');
console.log('===============\n');

console.log(`Total Tests: ${testResults.tests.length}`);
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%\n`);

if (testResults.failed > 0) {
  console.log('❌ Failed Tests:');
  testResults.tests
    .filter(test => !test.passed)
    .forEach(test => {
      console.log(`   - ${test.name}: ${test.details}`);
    });
  console.log();
}

/**
 * 9. Next Steps
 */
console.log('🚀 Next Steps for Testing');
console.log('=========================\n');

console.log('1. Run the manual tests above to verify UI functionality');
console.log('2. Test API endpoints directly using curl or Postman');
console.log('3. Test with real N8N webhook URLs');
console.log('4. Test error scenarios (network failures, invalid data)');
console.log('5. Test authentication flows');
console.log('6. Test responsive design on different screen sizes\n');

/**
 * 10. API Testing Examples
 */
console.log('🔧 API Testing Examples');
console.log('=======================\n');

const apiTests = [
  {
    name: 'List KPIs',
    method: 'GET',
    url: 'http://localhost:8787/api/kpis',
    description: 'Should return array of KPIs'
  },
  {
    name: 'Create KPI',
    method: 'POST',
    url: 'http://localhost:8787/api/kpis',
    body: {
      name: 'Test KPI',
      description: 'Test description',
      webhook_url: 'https://n8n.example.com/webhook/test',
      analysis_config: {
        chart_method: 'external',
        chart_type: 'line',
        llm_priority: 'standard'
      },
      active: true
    },
    description: 'Should create new KPI and return created object'
  },
  {
    name: 'Test Validation',
    method: 'POST', 
    url: 'http://localhost:8787/api/kpis',
    body: {
      name: '',
      webhook_url: 'invalid-url'
    },
    description: 'Should return validation errors'
  }
];

apiTests.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name}`);
  console.log(`   ${test.method} ${test.url}`);
  if (test.body) {
    console.log(`   Body: ${JSON.stringify(test.body, null, 2)}`);
  }
  console.log(`   Expected: ${test.description}\n`);
});

console.log('✨ Testing complete! Review the results above and run manual tests.');

process.exit(testResults.failed > 0 ? 1 : 0);