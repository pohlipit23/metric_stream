#!/usr/bin/env node

/**
 * Fix Webhook URLs in KV Storage
 * Updates the KPI registry to use the correct webhook URLs
 */

const { execSync } = require('child_process')

console.log('🔧 FIXING WEBHOOK URLs IN KV STORAGE')
console.log('============================================================')

// Get current registry
console.log('📋 Getting current KPI registry...')
const currentRegistry = JSON.parse(
  execSync('wrangler kv key get "kpi-registry" --namespace-id ec1a3533310145cf8033cd84e1abd69c', { encoding: 'utf8' })
)

console.log('Current webhook URLs:')
currentRegistry.kpis.forEach(kpi => {
  console.log(`   ${kpi.id}: ${kpi.webhookUrl}`)
})

// Update webhook URLs to correct ones
console.log('\n🔄 Updating webhook URLs...')
const updatedRegistry = {
  ...currentRegistry,
  kpis: currentRegistry.kpis.map(kpi => {
    if (kpi.id === 'cbbi-multi') {
      return {
        ...kpi,
        webhookUrl: 'http://localhost:5678/webhook/kpi-cbbi'
      }
    }
    if (kpi.id === 'kpi-cmc') {
      return {
        ...kpi,
        webhookUrl: 'http://localhost:5678/webhook/kpi-cmc'
      }
    }
    return kpi
  }),
  metadata: {
    ...currentRegistry.metadata,
    lastUpdated: new Date().toISOString()
  }
}

console.log('Updated webhook URLs:')
updatedRegistry.kpis.forEach(kpi => {
  console.log(`   ${kpi.id}: ${kpi.webhookUrl}`)
})

// Save updated registry
console.log('\n💾 Saving updated registry to KV...')
const registryJson = JSON.stringify(updatedRegistry, null, 2)
require('fs').writeFileSync('temp-registry.json', registryJson)

try {
  execSync('wrangler kv key put "kpi-registry" --path temp-registry.json --namespace-id ec1a3533310145cf8033cd84e1abd69c')
  console.log('✅ Registry updated successfully')
  
  // Update individual KPI entries
  console.log('\n🔄 Updating individual KPI entries...')
  
  updatedRegistry.kpis.forEach(kpi => {
    const kpiJson = JSON.stringify(kpi, null, 2)
    require('fs').writeFileSync(`temp-kpi-${kpi.id}.json`, kpiJson)
    
    try {
      execSync(`wrangler kv key put "kpi:${kpi.id}" --path temp-kpi-${kpi.id}.json --namespace-id ec1a3533310145cf8033cd84e1abd69c`)
      console.log(`✅ Updated kpi:${kpi.id}`)
    } catch (error) {
      console.log(`❌ Failed to update kpi:${kpi.id}: ${error.message}`)
    }
  })
  
  // Update metadata
  const metadataJson = JSON.stringify(updatedRegistry.metadata, null, 2)
  require('fs').writeFileSync('temp-metadata.json', metadataJson)
  
  try {
    execSync('wrangler kv key put "kpi-registry-metadata" --path temp-metadata.json --namespace-id ec1a3533310145cf8033cd84e1abd69c')
    console.log('✅ Updated registry metadata')
  } catch (error) {
    console.log(`❌ Failed to update metadata: ${error.message}`)
  }
  
} catch (error) {
  console.log(`❌ Failed to update registry: ${error.message}`)
}

// Cleanup temp files
console.log('\n🧹 Cleaning up temp files...')
try {
  require('fs').unlinkSync('temp-registry.json')
  require('fs').unlinkSync('temp-kpi-cbbi-multi.json')
  require('fs').unlinkSync('temp-kpi-kpi-cmc.json')
  require('fs').unlinkSync('temp-metadata.json')
  console.log('✅ Cleanup complete')
} catch (error) {
  console.log('⚠️  Some temp files may remain')
}

console.log('\n🎉 WEBHOOK URLs UPDATED!')
console.log('============================================================')
console.log('Correct webhook URLs now stored:')
console.log('   cbbi-multi: http://localhost:5678/webhook/kpi-cbbi')
console.log('   kpi-cmc: http://localhost:5678/webhook/kpi-cmc')
console.log('')
console.log('💡 Verify with: node show-kv-data.cjs')