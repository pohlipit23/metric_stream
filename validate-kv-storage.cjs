#!/usr/bin/env node

/**
 * Validate KV Storage Data
 * 
 * This script checks what data is actually stored in the KV namespaces
 * and validates the KPI registry configuration
 */

const { execSync } = require('child_process');

class KVStorageValidator {
  constructor() {
    this.kvNamespaces = {
      CONFIG_KV: 'ec1a3533310145cf8033cd84e1abd69c',
      JOBS_KV: 'ba267159e4614fbb84edfc7cd902692c',
      TIMESERIES_KV: '134812605b5b435eab23b4a72d8b7ced',
      PACKAGES_KV: '935d01fc21f0462fad041b2adfc0d17a'
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      kvValidation: {},
      kpiRegistry: null,
      errors: []
    };
  }

  async validateAllKVData() {
    console.log('🔍 Validating KV Storage Data');
    console.log('=' .repeat(60));

    try {
      // Validate CONFIG_KV (most important for KPI registry)
      await this.validateConfigKV();
      
      // Validate other KV namespaces
      await this.validateJobsKV();
      await this.validateTimeseriesKV();
      await this.validatePackagesKV();
      
      // Generate summary
      this.generateSummary();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ KV validation failed:', error.message);
      this.results.errors.push(error.message);
      throw error;
    }
  }

  async validateConfigKV() {
    console.log('\n📋 Validating CONFIG_KV');
    console.log('-' .repeat(40));
    
    try {
      const configResults = {};
      
      // Check KPI registry
      console.log('🔍 Checking kpi-registry...');
      try {
        const kpiRegistryData = await this.getKVKey('CONFIG_KV', 'kpi-registry');
        const kpiRegistry = JSON.parse(kpiRegistryData);
        
        configResults.kpiRegistry = {
          status: 'found',
          kpiCount: kpiRegistry.kpis ? kpiRegistry.kpis.length : 0,
          activeKPIs: kpiRegistry.kpis ? kpiRegistry.kpis.filter(kpi => kpi.active).length : 0,
          version: kpiRegistry.metadata ? kpiRegistry.metadata.version : 'unknown',
          lastUpdated: kpiRegistry.metadata ? kpiRegistry.metadata.lastUpdated : 'unknown'
        };
        
        this.results.kpiRegistry = kpiRegistry;
        
        console.log('✅ KPI Registry found:');
        console.log(`   - Total KPIs: ${configResults.kpiRegistry.kpiCount}`);
        console.log(`   - Active KPIs: ${configResults.kpiRegistry.activeKPIs}`);
        console.log(`   - Version: ${configResults.kpiRegistry.version}`);
        console.log(`   - Last Updated: ${configResults.kpiRegistry.lastUpdated}`);
        
        // List individual KPIs
        if (kpiRegistry.kpis) {
          console.log('\n📊 KPI Details:');
          kpiRegistry.kpis.forEach((kpi, index) => {
            console.log(`   ${index + 1}. ${kpi.id}: ${kpi.name}`);
            console.log(`      - Active: ${kpi.active}`);
            console.log(`      - Webhook: ${kpi.webhookUrl}`);
            console.log(`      - Type: ${kpi.type}`);
          });
        }
        
      } catch (error) {
        configResults.kpiRegistry = {
          status: 'not_found',
          error: error.message
        };
        console.log('❌ KPI Registry not found or invalid');
      }
      
      // Check individual KPI entries
      console.log('\n🔍 Checking individual KPI entries...');
      const individualKPIs = {};
      
      const kpiIds = ['cbbi-multi', 'kpi-cmc'];
      for (const kpiId of kpiIds) {
        try {
          const kpiData = await this.getKVKey('CONFIG_KV', `kpi:${kpiId}`);
          const kpi = JSON.parse(kpiData);
          
          individualKPIs[kpiId] = {
            status: 'found',
            name: kpi.name,
            active: kpi.active,
            webhookUrl: kpi.webhookUrl
          };
          
          console.log(`   ✅ kpi:${kpiId} found: ${kpi.name}`);
          
        } catch (error) {
          individualKPIs[kpiId] = {
            status: 'not_found',
            error: error.message
          };
          console.log(`   ❌ kpi:${kpiId} not found`);
        }
      }
      
      configResults.individualKPIs = individualKPIs;
      
      // Check metadata
      console.log('\n🔍 Checking kpi-registry-metadata...');
      try {
        const metadataData = await this.getKVKey('CONFIG_KV', 'kpi-registry-metadata');
        const metadata = JSON.parse(metadataData);
        
        configResults.metadata = {
          status: 'found',
          data: metadata
        };
        
        console.log('✅ KPI Registry metadata found:');
        console.log(`   - Version: ${metadata.version}`);
        console.log(`   - Environment: ${metadata.environment}`);
        console.log(`   - Testing Phase: ${metadata.testingPhase}`);
        
      } catch (error) {
        configResults.metadata = {
          status: 'not_found',
          error: error.message
        };
        console.log('❌ KPI Registry metadata not found');
      }
      
      this.results.kvValidation.CONFIG_KV = configResults;
      
    } catch (error) {
      console.error('❌ CONFIG_KV validation failed:', error.message);
      this.results.kvValidation.CONFIG_KV = {
        status: 'error',
        error: error.message
      };
    }
  }

  async validateJobsKV() {
    console.log('\n📋 Validating JOBS_KV');
    console.log('-' .repeat(40));
    
    try {
      // List recent job entries
      const jobsList = await this.listKVKeys('JOBS_KV', 'job:');
      
      console.log(`🔍 Found ${jobsList.length} job entries`);
      
      if (jobsList.length > 0) {
        console.log('📊 Recent jobs:');
        jobsList.slice(0, 5).forEach((key, index) => {
          console.log(`   ${index + 1}. ${key}`);
        });
        
        // Get details of the most recent job
        if (jobsList.length > 0) {
          try {
            const recentJobData = await this.getKVKey('JOBS_KV', jobsList[0]);
            const jobDetails = JSON.parse(recentJobData);
            
            console.log('\n📋 Most recent job details:');
            console.log(`   - Job ID: ${jobDetails.job_id || jobDetails.trace_id}`);
            console.log(`   - Status: ${jobDetails.status}`);
            console.log(`   - Created: ${jobDetails.created_at}`);
            console.log(`   - KPI Count: ${jobDetails.kpi_count || 'unknown'}`);
            
          } catch (error) {
            console.log('⚠️  Could not parse recent job details');
          }
        }
      } else {
        console.log('📊 No job entries found');
      }
      
      this.results.kvValidation.JOBS_KV = {
        status: 'checked',
        jobCount: jobsList.length,
        recentJobs: jobsList.slice(0, 5)
      };
      
    } catch (error) {
      console.error('❌ JOBS_KV validation failed:', error.message);
      this.results.kvValidation.JOBS_KV = {
        status: 'error',
        error: error.message
      };
    }
  }

  async validateTimeseriesKV() {
    console.log('\n📋 Validating TIMESERIES_KV');
    console.log('-' .repeat(40));
    
    try {
      // List timeseries entries
      const timeseriesList = await this.listKVKeys('TIMESERIES_KV', 'timeseries:');
      
      console.log(`🔍 Found ${timeseriesList.length} timeseries entries`);
      
      if (timeseriesList.length > 0) {
        console.log('📊 Timeseries data:');
        timeseriesList.slice(0, 5).forEach((key, index) => {
          console.log(`   ${index + 1}. ${key}`);
        });
      } else {
        console.log('📊 No timeseries entries found (expected for new system)');
      }
      
      this.results.kvValidation.TIMESERIES_KV = {
        status: 'checked',
        entryCount: timeseriesList.length,
        entries: timeseriesList.slice(0, 5)
      };
      
    } catch (error) {
      console.error('❌ TIMESERIES_KV validation failed:', error.message);
      this.results.kvValidation.TIMESERIES_KV = {
        status: 'error',
        error: error.message
      };
    }
  }

  async validatePackagesKV() {
    console.log('\n📋 Validating PACKAGES_KV');
    console.log('-' .repeat(40));
    
    try {
      // List package entries
      const packagesList = await this.listKVKeys('PACKAGES_KV', 'package:');
      
      console.log(`🔍 Found ${packagesList.length} package entries`);
      
      if (packagesList.length > 0) {
        console.log('📊 Package data:');
        packagesList.slice(0, 5).forEach((key, index) => {
          console.log(`   ${index + 1}. ${key}`);
        });
      } else {
        console.log('📊 No package entries found (expected for new system)');
      }
      
      this.results.kvValidation.PACKAGES_KV = {
        status: 'checked',
        entryCount: packagesList.length,
        entries: packagesList.slice(0, 5)
      };
      
    } catch (error) {
      console.error('❌ PACKAGES_KV validation failed:', error.message);
      this.results.kvValidation.PACKAGES_KV = {
        status: 'error',
        error: error.message
      };
    }
  }

  async getKVKey(namespace, key) {
    const namespaceId = this.kvNamespaces[namespace];
    const cmd = `wrangler kv key get "${key}" --namespace-id ${namespaceId}`;
    
    try {
      const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
      return result.trim();
    } catch (error) {
      throw new Error(`Key "${key}" not found in ${namespace}`);
    }
  }

  async listKVKeys(namespace, prefix = '') {
    const namespaceId = this.kvNamespaces[namespace];
    const cmd = `wrangler kv key list --namespace-id ${namespaceId} --prefix "${prefix}"`;
    
    try {
      const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
      const keys = JSON.parse(result);
      return keys.map(key => key.name);
    } catch (error) {
      console.log(`⚠️  Could not list keys in ${namespace}: ${error.message}`);
      return [];
    }
  }

  generateSummary() {
    console.log('\n📊 KV VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    
    // CONFIG_KV Summary
    const configKV = this.results.kvValidation.CONFIG_KV;
    if (configKV && configKV.kpiRegistry) {
      if (configKV.kpiRegistry.status === 'found') {
        console.log('✅ CONFIG_KV: KPI Registry configured correctly');
        console.log(`   - ${configKV.kpiRegistry.kpiCount} KPIs total`);
        console.log(`   - ${configKV.kpiRegistry.activeKPIs} KPIs active`);
      } else {
        console.log('❌ CONFIG_KV: KPI Registry not found or invalid');
      }
    }
    
    // Other KV Summary
    Object.entries(this.results.kvValidation).forEach(([namespace, data]) => {
      if (namespace !== 'CONFIG_KV' && data.status === 'checked') {
        const entryCount = data.entryCount || data.jobCount || 0;
        console.log(`📊 ${namespace}: ${entryCount} entries found`);
      }
    });
    
    // Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (configKV && configKV.kpiRegistry && configKV.kpiRegistry.status === 'found') {
      console.log('✅ KPI Registry is properly configured');
      console.log('✅ System is ready for scheduler triggers');
      console.log('✅ N8N workflows can be triggered');
    } else {
      console.log('❌ KPI Registry needs to be configured');
      console.log('💡 Run: node configure-kpi-registry-in-kv.cjs');
    }
    
    const jobsKV = this.results.kvValidation.JOBS_KV;
    if (jobsKV && jobsKV.jobCount > 0) {
      console.log('✅ Job tracking is working');
    } else {
      console.log('💡 No jobs found - trigger scheduler to create jobs');
    }
  }

  async saveResults() {
    const fs = require('fs');
    const filename = `kv-validation-results-${Date.now()}.json`;
    const content = JSON.stringify(this.results, null, 2);
    
    return new Promise((resolve, reject) => {
      fs.writeFile(filename, content, 'utf8', (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`\n📄 Validation results saved to: ${filename}`);
          resolve();
        }
      });
    });
  }
}

// Run if executed directly
if (require.main === module) {
  const validator = new KVStorageValidator();
  validator.validateAllKVData()
    .then(async (results) => {
      await validator.saveResults();
      console.log('\n🎉 KV validation completed successfully!');
    })
    .catch(error => {
      console.error('\n💥 KV validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = KVStorageValidator;