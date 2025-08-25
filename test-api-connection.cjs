#!/usr/bin/env node

/**
 * Test API Connection
 * Tests both direct API access and proxy configuration
 */

async function testDirectAPI() {
  console.log('🔍 Testing Direct API Access')
  console.log('----------------------------------------')
  
  try {
    const response = await fetch('https://admin-console-worker.pohlipit.workers.dev/api/kpis')
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Direct API: Working')
      console.log(`   Status: ${response.status}`)
      console.log(`   KPIs found: ${data.data?.length || 0}`)
      
      if (data.data && data.data.length > 0) {
        console.log('   Sample KPI fields:')
        const sampleKpi = data.data[0]
        Object.keys(sampleKpi).forEach(key => {
          console.log(`     - ${key}: ${typeof sampleKpi[key]}`)
        })
      }
      
      return true
    } else {
      console.log(`❌ Direct API: Status ${response.status}`)
      const text = await response.text()
      console.log(`   Response: ${text.substring(0, 200)}...`)
      return false
    }
  } catch (error) {
    console.log(`❌ Direct API: ${error.message}`)
    return false
  }
}

async function testProxyAPI() {
  console.log('\n🔍 Testing Proxy API Access (if UI is running)')
  console.log('----------------------------------------')
  
  try {
    const response = await fetch('http://localhost:5173/api/kpis')
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Proxy API: Working')
      console.log(`   Status: ${response.status}`)
      console.log(`   KPIs found: ${data.data?.length || 0}`)
      return true
    } else {
      console.log(`❌ Proxy API: Status ${response.status}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Proxy API: ${error.message}`)
    console.log('   (This is expected if the UI dev server is not running)')
    return false
  }
}

function showInstructions() {
  console.log('\n💡 INSTRUCTIONS')
  console.log('============================================================')
  
  console.log('\n🔧 API Configuration:')
  console.log('   Direct API URL: https://admin-console-worker.pohlipit.workers.dev')
  console.log('   Proxy Configuration: Updated in vite.config.js')
  console.log('   Frontend expects: webhook_url, analysis_config (snake_case)')
  console.log('   API returns: webhookUrl, analysisConfig (camelCase)')
  console.log('   Solution: Added conversion functions in KPIRegistry.jsx')
  
  console.log('\n🚀 To test the UI:')
  console.log('   1. cd src/admin-console')
  console.log('   2. npm run dev')
  console.log('   3. Open http://localhost:5173')
  console.log('   4. Navigate to /kpis to see the KPI Registry')
  
  console.log('\n🔍 Expected behavior:')
  console.log('   - UI should load without "Network error" messages')
  console.log('   - KPI list should show 2 configured KPIs')
  console.log('   - Webhook URLs should be visible and correct')
}

async function main() {
  console.log('🔍 API CONNECTION TEST')
  console.log('============================================================')
  
  const directWorking = await testDirectAPI()
  const proxyWorking = await testProxyAPI()
  
  showInstructions()
  
  console.log('\n🎯 SUMMARY')
  console.log('============================================================')
  console.log(`Direct API: ${directWorking ? '✅ Working' : '❌ Issues'}`)
  console.log(`Proxy API: ${proxyWorking ? '✅ Working' : '⚠️  UI not running'}`)
  
  if (directWorking) {
    console.log('\n✅ API is accessible and returning data')
    console.log('   The frontend should now work with the updated proxy configuration')
  } else {
    console.log('\n❌ API issues detected - check Cloudflare Worker deployment')
  }
}

main().catch(console.error)