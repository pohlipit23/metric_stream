const fs = require('fs');

console.log('🚀 KPI Registry Implementation Check');
console.log('===================================\n');

// Check key files exist and have expected content
const checks = [
  {
    file: 'src/admin-console/src/pages/KPIRegistry.jsx',
    patterns: ['kpiAPI', 'useAuth', 'validateForm', 'testWebhook'],
    name: 'KPI Registry Component'
  },
  {
    file: 'src/admin-console/src/utils/api.js', 
    patterns: ['kpiAPI', 'APIError', 'async list()', 'async create('],
    name: 'API Utilities'
  },
  {
    file: 'src/workers/admin-console/handlers/kpi-registry.js',
    patterns: ['handleKPIEndpoints', 'validateKPIRegistryEntry', 'createKPI'],
    name: 'Backend Handler'
  },
  {
    file: 'src/workers/admin-console/utils/validation.js',
    patterns: ['validateAnalysisConfig', 'chart_method', 'llm_priority'],
    name: 'Validation Logic'
  }
];

let allPassed = true;

checks.forEach(check => {
  console.log(`📁 Checking ${check.name}...`);
  
  try {
    const content = fs.readFileSync(check.file, 'utf8');
    
    check.patterns.forEach(pattern => {
      if (content.includes(pattern)) {
        console.log(`  ✅ ${pattern}`);
      } else {
        console.log(`  ❌ ${pattern} - MISSING`);
        allPassed = false;
      }
    });
    
  } catch (error) {
    console.log(`  ❌ File not found: ${check.file}`);
    allPassed = false;
  }
  
  console.log();
});

console.log('📊 Overall Status');
console.log('=================');

if (allPassed) {
  console.log('✅ All checks passed! Implementation looks good.');
} else {
  console.log('⚠️  Some checks failed. Review the missing items above.');
}

console.log('\n🚀 Ready to Test!');
console.log('=================');
console.log('1. Start frontend: cd src/admin-console && npm run dev');
console.log('2. Start backend:  cd src/workers/admin-console && npm run dev'); 
console.log('3. Open: http://localhost:5173/kpi-registry');
console.log('\n✨ See TESTING_GUIDE.md for detailed test cases!');