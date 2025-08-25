#!/usr/bin/env node

/**
 * Comprehensive Validation Script
 * Tests UI accessibility and validates KV storage data
 */

const { execSync } = require('child_process')

console.log('🔍 COMPREHENSIVE VALIDATION')
console.log('============================================================')

async function testBackendAPI() {
  console.log('\n📋 Testing Backend API')
  console.log('----------------------------------------')
  
  const endpoints = [
    { path: '/health', description: 'Health Check' },
    { path: '/api/kpis', description: 'List KPIs' },
    { path: '/api/config', description: 'System Config' }
  ]
  
  const baseUrl = 'https://admin-console-worker.pohlipit.workers.dev'
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`)
      const status = response.status
      
      if (status === 200) {
        console.log(`✅ ${endpoint.description}: Working (${status})`)
        
        if (endpoint.path === '/api/kpis') {
          const data = await response.json()
          console.log(`   📊 Found ${data.data?.length || 0} KPIs`)
        }
      } else {
        console.log(`⚠️  ${endpoint.description}: Status ${status}`)
      }
    } catch (error) {
      console.log(`❌ ${endpoint.description}: ${error.message}`)
    }
  }
}

async function testLocalUI() {
  console.log('\n🌐 Testing Local UI')
  console.log('----------------------------------------')
  
  try {
    const response = await fetch('http://localhost:5173')
    if (response.ok) {
      console.log('✅ Local UI: Accessible at http://localhost:5173')
      return true
    } else {
      console.log(`⚠️  Local UI: Status ${response.status}`)
      return false
    }
  } catch (error) {
    console.log('❌ Local UI: Not running')
    console.log('💡 Start with: cd src/admin-console && npm run dev')
    return false
  }
}

function validateKVStorage() {
  console.log('\n📊 Validating KV Storage')
  console.log('----------------------------------------')
  
  try {
    // Get KPI registry
    const registryResult = execSync('wrangler kv key get "kpi-registry" --namespace-id ec1a3533310145cf8033cd84e1abd69c', { encoding: 'utf8' })
    const registry = JSON.parse(registryResult)
    
    console.log(`✅ KPI Registry: Found ${registry.kpis?.length || 0} KPIs`)
    
    // Validate each KPI
    registry.kpis?.forEach((kpi, index) => {
      console.log(`   ${index + 1}. ${kpi.name} (${kpi.id})`)
      console.log(`      - Type: ${kpi.type}`)
      console.log(`      - Active: ${kpi.active ? '✅' : '❌'}`)
      console.log(`      - Webhook: ${kpi.webhookUrl}`)
    })
    
    // Check individual KPI entries
    console.log('\n📋 Individual KPI Entries:')
    registry.kpis?.forEach(kpi => {
      try {
        const kpiResult = execSync(`wrangler kv key get "kpi:${kpi.id}" --namespace-id ec1a3533310145cf8033cd84e1abd69c`, { encoding: 'utf8' })
        const kpiData = JSON.parse(kpiResult)
        console.log(`   ✅ ${kpi.id}: Individual entry exists`)
      } catch (error) {
        console.log(`   ❌ ${kpi.id}: Individual entry missing`)
      }
    })
    
    return true
  } catch (error) {
    console.log(`❌ KV Storage validation failed: ${error.message}`)
    return false
  }
}

function showUIAccessInstructions() {
  console.log('\n🎯 UI ACCESS INSTRUCTIONS')
  console.log('============================================================')
  
  console.log('\n🔧 BACKEND API:')
  console.log('   URL: https://admin-console-worker.pohlipit.workers.dev')
  console.log('   Endpoints:')
  console.log('   - GET /api/kpis - List all KPIs')
  console.log('   - GET /api/kpis/{id} - Get specific KPI')
  console.log('   - GET /health - Health check')
  
  console.log('\n🌐 FRONTEND UI:')
  console.log('   Local Development: http://localhost:5173')
  console.log('   Start command: cd src/admin-console && npm run dev')
  
  console.log('\n📊 KPI MANAGEMENT:')
  console.log('   1. View KPI Registry - See all configured KPIs')
  console.log('   2. Edit KPI Settings - Modify thresholds and webhooks')
  console.log('   3. Test Workflows - Trigger N8N workflows manually')
  console.log('   4. Monitor Status - Check system health and jobs')
  
  console.log('\n🔍 VALIDATION COMMANDS:')
  console.log('   - Validate KV: node validate-kv-storage.cjs')
  console.log('   - Show KV Data: node show-kv-data.cjs')
  console.log('   - Test Scheduler: node test-scheduler-trigger.cjs')
  console.log('   - Check UI: node check-admin-console-ui.cjs')
}

async function main() {
  console.log('Starting comprehensive validation...\n')
  
  // Test backend API
  await testBackendAPI()
  
  // Test local UI
  const uiRunning = await testLocalUI()
  
  // Validate KV storage
  const kvValid = validateKVStorage()
  
  // Show instructions
  showUIAccessInstructions()
  
  console.log('\n🎉 VALIDATION SUMMARY')
  console.log('============================================================')
  console.log(`Backend API: ${kvValid ? '✅ Working' : '❌ Issues'}`)
  console.log(`Local UI: ${uiRunning ? '✅ Running' : '⚠️  Not started'}`)
  console.log(`KV Storage: ${kvValid ? '✅ Valid' : '❌ Issues'}`)
  
  if (kvValid && !uiRunning) {
    console.log('\n💡 Next Steps:')
    console.log('   1. Start the UI: cd src/admin-console && npm run dev')
    console.log('   2. Access at: http://localhost:5173')
    console.log('   3. View KPI configuration in the UI')
  }
  
  console.log('\n✅ Validation complete!')
}

main().catch(console.error)