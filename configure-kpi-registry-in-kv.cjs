#!/usr/bin/env node

/**
 * Configure KPI Registry in CONFIG_KV
 * 
 * This script stores the real KPI registry configuration directly in CONFIG_KV
 * using wrangler kv:key put commands
 */

const { execSync } = require('child_process');
const fs = require('fs');

const kpiRegistry = require('./kpi-registry-config-module.cjs');

async function configureKPIRegistryInKV() {
  console.log('🔧 Configuring KPI Registry in CONFIG_KV...');
  console.log('=' .repeat(60));
  
  try {
    // Convert KPI registry to JSON string
    const registryJson = JSON.stringify(kpiRegistry, null, 2);
    
    // Write to temporary file for wrangler command
    const tempFile = 'temp-kpi-registry.json';
    fs.writeFileSync(tempFile, registryJson);
    
    console.log('📝 KPI Registry to be stored:');
    console.log(registryJson);
    
    // Store in CONFIG_KV using wrangler
    console.log('\n🗄️  Storing in CONFIG_KV...');
    
    try {
      const kvNamespaceId = 'ec1a3533310145cf8033cd84e1abd69c'; // CONFIG_KV namespace ID
      
      const wranglerCmd = `wrangler kv key put kpi-registry --path ${tempFile} --namespace-id ${kvNamespaceId}`;
      console.log('Executing:', wranglerCmd);
      
      const result = execSync(wranglerCmd, { encoding: 'utf8' });
      console.log('✅ KV storage result:', result);
      
      // Also store individual KPIs for easier access
      for (const kpi of kpiRegistry.kpis) {
        const kpiKey = `kpi:${kpi.id}`;
        const kpiFile = `temp-kpi-${kpi.id}.json`;
        fs.writeFileSync(kpiFile, JSON.stringify(kpi, null, 2));
        
        const kpiCmd = `wrangler kv key put "${kpiKey}" --path ${kpiFile} --namespace-id ${kvNamespaceId}`;
        console.log('Executing:', kpiCmd);
        
        const kpiResult = execSync(kpiCmd, { encoding: 'utf8' });
        console.log(`✅ KPI ${kpi.id} stored:`, kpiResult);
        
        // Clean up temp file
        fs.unlinkSync(kpiFile);
      }
      
      // Store metadata
      const metadataFile = 'temp-metadata.json';
      fs.writeFileSync(metadataFile, JSON.stringify(kpiRegistry.metadata, null, 2));
      
      const metadataCmd = `wrangler kv key put kpi-registry-metadata --path ${metadataFile} --namespace-id ${kvNamespaceId}`;
      console.log('Executing:', metadataCmd);
      
      const metadataResult = execSync(metadataCmd, { encoding: 'utf8' });
      console.log('✅ Metadata stored:', metadataResult);
      
      // Clean up temp files
      fs.unlinkSync(tempFile);
      fs.unlinkSync(metadataFile);
      
      console.log('\n✅ KPI Registry successfully configured in CONFIG_KV!');
      console.log(`📊 Stored ${kpiRegistry.kpis.length} KPIs:`);
      
      kpiRegistry.kpis.forEach(kpi => {
        console.log(`  - ${kpi.id}: ${kpi.name}`);
        console.log(`    Webhook: ${kpi.webhookUrl}`);
        console.log(`    Active: ${kpi.active}`);
      });
      
      return {
        success: true,
        kpiCount: kpiRegistry.kpis.length,
        kpis: kpiRegistry.kpis.map(kpi => ({
          id: kpi.id,
          name: kpi.name,
          webhookUrl: kpi.webhookUrl,
          active: kpi.active
        }))
      };
      
    } catch (error) {
      console.error('❌ Failed to store in CONFIG_KV:', error.message);
      
      // Clean up temp files on error
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
      
      throw error;
    }
    
  } catch (error) {
    console.error('❌ KPI Registry configuration failed:', error.message);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  configureKPIRegistryInKV()
    .then(result => {
      console.log('\n🎉 Configuration completed successfully!');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('\n💥 Configuration failed:', error.message);
      process.exit(1);
    });
}

module.exports = configureKPIRegistryInKV;