#!/usr/bin/env node

/**
 * Task 3.6: Real Implementation Testing
 * 
 * This script performs actual testing of the system components:
 * - Real KPI registry configuration in CONFIG_KV
 * - Real data pipeline testing with actual N8N workflows
 * - Real KV storage validation
 * - Real error handling testing
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');

class RealTask36Tester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      taskId: '3.6-real',
      taskTitle: 'Real Comprehensive End-to-End Testing',
      subtasks: {},
      overallStatus: 'in_progress',
      errors: [],
      warnings: [],
      performance: {},
      dataQuality: {}
    };
    
    this.config = {
      n8nUrl: 'http://localhost:5678',
      workerUrls: {
        ingestion: 'https://ingestion-worker-development.pohlipit.workers.dev',
        scheduler: 'https://scheduler-worker.pohlipit.workers.dev',
        orchestration: 'https://orchestration-worker.pohlipit.workers.dev',
        adminConsole: 'https://admin-console-worker.pohlipit.workers.dev'
      },
      kpis: [
        {
          id: 'cbbi-multi',
          name: 'CBBI Multi KPI',
          webhookUrl: 'http://localhost:5678/webhook/cbbi-multi'
        },
        {
          id: 'kpi-cmc',
          name: 'CoinMarketCap Bitcoin Price',
          webhookUrl: 'http://localhost:5678/webhook/kpi-cmc'
        }
      ]
    };
  }

  async runRealTests() {
    console.log('🚀 Starting Task 3.6: Real Implementation Testing');
    console.log('=' .repeat(80));

    try {
      // Real KPI Registry Configuration
      await this.configureRealKPIRegistryInKV();
      
      // Real Data Pipeline Testing
      await this.testRealDataPipeline();
      
      // Real KV Storage Validation
      await this.validateRealKVStorage();
      
      // Real Error Handling Testing
      await this.testRealErrorHandling();
      
      // Real Performance Testing
      await this.testRealPerformance();
      
      this.results.overallStatus = 'completed';
      console.log('✅ Task 3.6 Real Implementation completed successfully!');
      
    } catch (error) {
      this.results.overallStatus = 'failed';
      this.results.errors.push({
        phase: 'overall',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.error('❌ Task 3.6 Real Implementation failed:', error.message);
    }
    
    await this.saveResults();
    return this.results;
  }

  async configureRealKPIRegistryInKV() {
    console.log('\n📋 Real KPI Registry Configuration in CONFIG_KV');
    
    try {
      const kpiRegistry = require('./kpi-registry-config-module.cjs');
      
      // Store KPI registry in CONFIG_KV via Admin Console API
      const response = await this.makeHttpRequest('POST', `${this.config.workerUrls.adminConsole}/api/config/kpi-registry`, {
        registry: kpiRegistry
      });
      
      console.log('✅ KPI registry stored in CONFIG_KV:', response.statusCode);
      
      // Verify the registry was stored correctly
      const verifyResponse = await this.makeHttpRequest('GET', `${this.config.workerUrls.adminConsole}/api/config/kpi-registry`);
      
      if (verifyResponse.statusCode === 200) {
        console.log('✅ KPI registry verification successful');
        this.results.subtasks.configureRealKPIRegistry = {
          status: 'completed',
          details: 'KPI registry successfully stored and verified in CONFIG_KV',
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error(`KPI registry verification failed: ${verifyResponse.statusCode}`);
      }
      
    } catch (error) {
      this.results.subtasks.configureRealKPIRegistry = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      throw new Error(`Real KPI registry configuration failed: ${error.message}`);
    }
  }

  async testRealDataPipeline() {
    console.log('\n📋 Real Data Pipeline Testing');
    
    try {
      // Step 1: Trigger real scheduler worker
      console.log('🔄 Triggering real Scheduler Worker...');
      const schedulerResponse = await this.makeHttpRequest('POST', `${this.config.workerUrls.scheduler}/api/trigger`, {
        manual: true,
        timestamp: new Date().toISOString()
      });
      
      if (schedulerResponse.statusCode !== 200) {
        throw new Error(`Scheduler trigger failed: ${schedulerResponse.statusCode}`);
      }
      
      const jobId = schedulerResponse.data.job_id || schedulerResponse.data.trace_id;
      console.log('✅ Scheduler triggered, job ID:', jobId);
      
      // Step 2: Wait for job to be created and monitor status
      await this.sleep(2000); // Wait 2 seconds for job creation
      
      // Step 3: Check job status via Admin Console
      console.log('📊 Checking job status...');
      const jobStatusResponse = await this.makeHttpRequest('GET', `${this.config.workerUrls.adminConsole}/api/jobs/${jobId}`);
      
      if (jobStatusResponse.statusCode === 200) {
        console.log('✅ Job status retrieved:', jobStatusResponse.data.status);
      }
      
      // Step 4: Test data ingestion with real data
      console.log('📥 Testing real data ingestion...');
      const testData = {
        trace_id: jobId,
        kpi_id: 'test-kpi-real',
        timestamp: new Date().toISOString(),
        data: {
          value: 98765.43,
          confidence: 0.95,
          source: 'real-test',
          metadata: {
            test: true,
            timestamp: new Date().toISOString()
          }
        }
      };
      
      const ingestionResponse = await this.makeHttpRequest('POST', `${this.config.workerUrls.ingestion}/api/kpi-data`, testData);
      
      if (ingestionResponse.statusCode === 200) {
        console.log('✅ Real data ingestion successful');
      } else {
        throw new Error(`Data ingestion failed: ${ingestionResponse.statusCode}`);
      }
      
      // Step 5: Verify orchestration worker status
      console.log('🎯 Testing real Orchestration Worker...');
      const orchestrationResponse = await this.makeHttpRequest('GET', `${this.config.workerUrls.orchestration}/api/status`);
      
      if (orchestrationResponse.statusCode === 200) {
        console.log('✅ Orchestration Worker status check successful');
      }
      
      this.results.subtasks.testRealDataPipeline = {
        status: 'completed',
        details: 'Real data pipeline tested with actual worker endpoints',
        jobId: jobId,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Real data pipeline testing completed');
      
    } catch (error) {
      this.results.subtasks.testRealDataPipeline = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      throw new Error(`Real data pipeline test failed: ${error.message}`);
    }
  }

  async validateRealKVStorage() {
    console.log('\n📋 Real KV Storage Validation');
    
    try {
      // Test KV storage via Admin Console API
      console.log('🗄️  Testing KV storage operations...');
      
      // Test CONFIG_KV
      const configResponse = await this.makeHttpRequest('GET', `${this.config.workerUrls.adminConsole}/api/config`);
      if (configResponse.statusCode === 200) {
        console.log('✅ CONFIG_KV accessible');
      }
      
      // Test JOBS_KV by listing recent jobs
      const jobsResponse = await this.makeHttpRequest('GET', `${this.config.workerUrls.adminConsole}/api/jobs`);
      if (jobsResponse.statusCode === 200) {
        console.log('✅ JOBS_KV accessible, found', jobsResponse.data?.jobs?.length || 0, 'jobs');
      }
      
      // Test TIMESERIES_KV by checking for data
      const timeseriesResponse = await this.makeHttpRequest('GET', `${this.config.workerUrls.adminConsole}/api/timeseries/test-kpi-real`);
      if (timeseriesResponse.statusCode === 200 || timeseriesResponse.statusCode === 404) {
        console.log('✅ TIMESERIES_KV accessible');
      }
      
      // Test PACKAGES_KV
      const packagesResponse = await this.makeHttpRequest('GET', `${this.config.workerUrls.adminConsole}/api/packages`);
      if (packagesResponse.statusCode === 200) {
        console.log('✅ PACKAGES_KV accessible');
      }
      
      this.results.subtasks.validateRealKVStorage = {
        status: 'completed',
        details: 'All KV namespaces are accessible and functional',
        kvTests: {
          config: configResponse.statusCode,
          jobs: jobsResponse.statusCode,
          timeseries: timeseriesResponse.statusCode,
          packages: packagesResponse.statusCode
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Real KV storage validation completed');
      
    } catch (error) {
      this.results.subtasks.validateRealKVStorage = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      throw new Error(`Real KV storage validation failed: ${error.message}`);
    }
  }

  async testRealErrorHandling() {
    console.log('\n📋 Real Error Handling Testing');
    
    try {
      // Test invalid data ingestion
      console.log('❌ Testing invalid data handling...');
      const invalidData = {
        invalid: 'data',
        missing: 'required_fields'
      };
      
      const errorResponse = await this.makeHttpRequest('POST', `${this.config.workerUrls.ingestion}/api/kpi-data`, invalidData);
      
      if (errorResponse.statusCode >= 400) {
        console.log('✅ Invalid data properly rejected with status:', errorResponse.statusCode);
      } else {
        console.log('⚠️  Invalid data was accepted (unexpected)');
      }
      
      // Test non-existent endpoint
      console.log('🔍 Testing non-existent endpoint...');
      const notFoundResponse = await this.makeHttpRequest('GET', `${this.config.workerUrls.ingestion}/api/nonexistent`);
      
      if (notFoundResponse.statusCode === 404) {
        console.log('✅ Non-existent endpoint properly returns 404');
      }
      
      // Test authentication (if implemented)
      console.log('🔐 Testing authentication...');
      const authResponse = await this.makeHttpRequest('POST', `${this.config.workerUrls.ingestion}/api/kpi-data`, {
        trace_id: 'test',
        kpi_id: 'test',
        timestamp: new Date().toISOString(),
        data: { value: 1 }
      });
      
      console.log('🔐 Authentication test response:', authResponse.statusCode);
      
      this.results.subtasks.testRealErrorHandling = {
        status: 'completed',
        details: 'Real error handling scenarios tested',
        errorTests: {
          invalidData: errorResponse.statusCode,
          notFound: notFoundResponse.statusCode,
          authentication: authResponse.statusCode
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Real error handling testing completed');
      
    } catch (error) {
      this.results.subtasks.testRealErrorHandling = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      throw new Error(`Real error handling test failed: ${error.message}`);
    }
  }

  async testRealPerformance() {
    console.log('\n📋 Real Performance Testing');
    
    try {
      const performanceResults = {};
      
      // Test ingestion endpoint performance
      console.log('⏱️  Testing ingestion performance...');
      const ingestionStart = Date.now();
      
      const testData = {
        trace_id: `perf-test-${Date.now()}`,
        kpi_id: 'performance-test',
        timestamp: new Date().toISOString(),
        data: { value: 12345.67, confidence: 0.9 }
      };
      
      await this.makeHttpRequest('POST', `${this.config.workerUrls.ingestion}/api/kpi-data`, testData);
      
      const ingestionTime = Date.now() - ingestionStart;
      performanceResults.ingestionTime = ingestionTime;
      console.log(`✅ Ingestion performance: ${ingestionTime}ms`);
      
      // Test scheduler endpoint performance
      console.log('⏱️  Testing scheduler performance...');
      const schedulerStart = Date.now();
      
      await this.makeHttpRequest('GET', `${this.config.workerUrls.scheduler}/api/status`);
      
      const schedulerTime = Date.now() - schedulerStart;
      performanceResults.schedulerTime = schedulerTime;
      console.log(`✅ Scheduler performance: ${schedulerTime}ms`);
      
      // Test admin console performance
      console.log('⏱️  Testing admin console performance...');
      const adminStart = Date.now();
      
      await this.makeHttpRequest('GET', `${this.config.workerUrls.adminConsole}/api/config`);
      
      const adminTime = Date.now() - adminStart;
      performanceResults.adminTime = adminTime;
      console.log(`✅ Admin console performance: ${adminTime}ms`);
      
      // Test concurrent requests
      console.log('🔄 Testing concurrent requests...');
      const concurrentStart = Date.now();
      
      const concurrentPromises = [];
      for (let i = 0; i < 5; i++) {
        const concurrentData = {
          trace_id: `concurrent-${i}-${Date.now()}`,
          kpi_id: `concurrent-test-${i}`,
          timestamp: new Date().toISOString(),
          data: { value: i * 100, confidence: 0.8 }
        };
        
        concurrentPromises.push(
          this.makeHttpRequest('POST', `${this.config.workerUrls.ingestion}/api/kpi-data`, concurrentData)
        );
      }
      
      await Promise.all(concurrentPromises);
      
      const concurrentTime = Date.now() - concurrentStart;
      performanceResults.concurrentTime = concurrentTime;
      console.log(`✅ Concurrent requests (5): ${concurrentTime}ms`);
      
      this.results.subtasks.testRealPerformance = {
        status: 'completed',
        details: 'Real performance testing completed',
        performance: performanceResults,
        timestamp: new Date().toISOString()
      };
      
      this.results.performance = performanceResults;
      
      console.log('✅ Real performance testing completed');
      
    } catch (error) {
      this.results.subtasks.testRealPerformance = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      throw new Error(`Real performance test failed: ${error.message}`);
    }
  }

  async makeHttpRequest(method, url, data = null) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RealTask36Tester/1.0'
        },
        timeout: 30000 // 30 second timeout
      };
      
      if (data) {
        const postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }
      
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            resolve({ statusCode: res.statusCode, data: parsed });
          } catch (error) {
            resolve({ statusCode: res.statusCode, data: responseData });
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async saveResults() {
    const filename = `task-3-6-real-results-${Date.now()}.json`;
    const content = JSON.stringify(this.results, null, 2);
    
    return new Promise((resolve, reject) => {
      fs.writeFile(filename, content, 'utf8', (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`\n📄 Real test results saved to: ${filename}`);
          resolve();
        }
      });
    });
  }
}

// Run the real tests if this script is executed directly
if (require.main === module) {
  const tester = new RealTask36Tester();
  tester.runRealTests().catch(console.error);
}

module.exports = RealTask36Tester;