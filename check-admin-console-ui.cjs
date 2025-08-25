#!/usr/bin/env node

/**
 * Check Admin Console UI and KPI Setup
 * 
 * This script helps you access and validate the Admin Console UI
 * and provides instructions for checking KPI setup through the frontend
 */

const https = require('https');
const http = require('http');

class AdminConsoleChecker {
  constructor() {
    this.config = {
      adminConsoleUrl: 'https://admin-console-worker.pohlipit.workers.dev',
      adminConsoleFrontendUrl: 'https://daily-index-tracker-admin.pages.dev', // Cloudflare Pages URL
      localFrontendUrl: 'http://localhost:3000', // Local development URL
      apiKey: 'test-api-key-development-2024'
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      backendStatus: {},
      frontendStatus: {},
      kpiEndpoints: {},
      instructions: []
    };
  }

  async checkAdminConsole() {
    console.log('🔍 Checking Admin Console UI and KPI Setup');
    console.log('=' .repeat(60));

    try {
      // Check backend API endpoints
      await this.checkBackendEndpoints();
      
      // Check frontend accessibility
      await this.checkFrontendAccess();
      
      // Test KPI-related endpoints
      await this.testKPIEndpoints();
      
      // Generate UI access instructions
      this.generateUIInstructions();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Admin Console check failed:', error.message);
      throw error;
    }
  }

  async checkBackendEndpoints() {
    console.log('\n📋 Checking Admin Console Backend');
    console.log('-' .repeat(40));
    
    const endpoints = [
      { path: '/health', method: 'GET', auth: false },
      { path: '/api/kpis', method: 'GET', auth: true },
      { path: '/api/config', method: 'GET', auth: true },
      { path: '/api/jobs', method: 'GET', auth: true }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Testing ${endpoint.method} ${endpoint.path}...`);
        
        const response = await this.makeHttpRequest(
          endpoint.method,
          `${this.config.adminConsoleUrl}${endpoint.path}`,
          null,
          endpoint.auth ? this.config.apiKey : null
        );
        
        this.results.backendStatus[endpoint.path] = {
          status: 'accessible',
          statusCode: response.statusCode,
          response: response.data
        };
        
        if (response.statusCode === 200) {
          console.log(`   ✅ ${endpoint.path}: Working (${response.statusCode})`);
        } else if (response.statusCode === 401 && endpoint.auth) {
          console.log(`   🔐 ${endpoint.path}: Authentication required (${response.statusCode})`);
        } else if (response.statusCode === 503) {
          console.log(`   ⚠️  ${endpoint.path}: Service unavailable - may need Cloudflare Access (${response.statusCode})`);
        } else {
          console.log(`   ⚠️  ${endpoint.path}: Unexpected response (${response.statusCode})`);
        }
        
      } catch (error) {
        this.results.backendStatus[endpoint.path] = {
          status: 'failed',
          error: error.message
        };
        console.log(`   ❌ ${endpoint.path}: Failed - ${error.message}`);
      }
    }
  }

  async checkFrontendAccess() {
    console.log('\n📋 Checking Admin Console Frontend');
    console.log('-' .repeat(40));
    
    const frontendUrls = [
      { name: 'Cloudflare Pages', url: this.config.adminConsoleFrontendUrl },
      { name: 'Local Development', url: this.config.localFrontendUrl }
    ];
    
    for (const frontend of frontendUrls) {
      try {
        console.log(`🔍 Testing ${frontend.name} at ${frontend.url}...`);
        
        const response = await this.makeHttpRequest('GET', frontend.url);
        
        this.results.frontendStatus[frontend.name] = {
          status: 'accessible',
          statusCode: response.statusCode,
          url: frontend.url
        };
        
        if (response.statusCode === 200) {
          console.log(`   ✅ ${frontend.name}: Accessible (${response.statusCode})`);
        } else {
          console.log(`   ⚠️  ${frontend.name}: Response ${response.statusCode}`);
        }
        
      } catch (error) {
        this.results.frontendStatus[frontend.name] = {
          status: 'failed',
          error: error.message,
          url: frontend.url
        };
        console.log(`   ❌ ${frontend.name}: Not accessible - ${error.message}`);
      }
    }
  }

  async testKPIEndpoints() {
    console.log('\n📋 Testing KPI-Related Endpoints');
    console.log('-' .repeat(40));
    
    const kpiEndpoints = [
      { path: '/api/kpis', method: 'GET', description: 'List all KPIs' },
      { path: '/api/kpis/cbbi-multi', method: 'GET', description: 'Get CBBI Multi KPI' },
      { path: '/api/kpis/kpi-cmc', method: 'GET', description: 'Get CMC KPI' }
    ];
    
    for (const endpoint of kpiEndpoints) {
      try {
        console.log(`🔍 Testing ${endpoint.description}...`);
        
        const response = await this.makeHttpRequest(
          endpoint.method,
          `${this.config.adminConsoleUrl}${endpoint.path}`,
          null,
          this.config.apiKey
        );
        
        this.results.kpiEndpoints[endpoint.path] = {
          status: 'tested',
          statusCode: response.statusCode,
          description: endpoint.description,
          response: response.data
        };
        
        if (response.statusCode === 200) {
          console.log(`   ✅ ${endpoint.description}: Working`);
          if (response.data && response.data.data) {
            if (Array.isArray(response.data.data)) {
              console.log(`      Found ${response.data.data.length} KPIs`);
            } else {
              console.log(`      KPI: ${response.data.data.name || 'Unknown'}`);
            }
          }
        } else if (response.statusCode === 401) {
          console.log(`   🔐 ${endpoint.description}: Authentication required`);
        } else if (response.statusCode === 404) {
          console.log(`   📭 ${endpoint.description}: Not found (may be expected)`);
        } else if (response.statusCode === 503) {
          console.log(`   ⚠️  ${endpoint.description}: Service unavailable`);
        } else {
          console.log(`   ⚠️  ${endpoint.description}: Response ${response.statusCode}`);
        }
        
      } catch (error) {
        this.results.kpiEndpoints[endpoint.path] = {
          status: 'failed',
          error: error.message,
          description: endpoint.description
        };
        console.log(`   ❌ ${endpoint.description}: Failed - ${error.message}`);
      }
    }
  }

  generateUIInstructions() {
    console.log('\n📋 UI ACCESS INSTRUCTIONS');
    console.log('=' .repeat(60));
    
    const instructions = [];
    
    // Backend access instructions
    console.log('\n🔧 BACKEND API ACCESS:');
    console.log(`Admin Console API: ${this.config.adminConsoleUrl}`);
    
    if (this.results.backendStatus['/health'] && this.results.backendStatus['/health'].statusCode === 200) {
      console.log('✅ Backend is accessible');
      instructions.push('Backend API is working correctly');
    } else {
      console.log('❌ Backend may not be accessible');
      instructions.push('Check backend deployment and configuration');
    }
    
    // Authentication instructions
    console.log('\n🔐 AUTHENTICATION:');
    const hasAuthErrors = Object.values(this.results.backendStatus).some(status => status.statusCode === 503);
    
    if (hasAuthErrors) {
      console.log('⚠️  Some endpoints return 503 - Cloudflare Access may be required');
      console.log('💡 To access the Admin Console UI:');
      console.log('   1. Ensure you have Cloudflare Access configured');
      console.log('   2. Log in through your Cloudflare Access provider');
      console.log('   3. Access the Admin Console at the frontend URL');
      instructions.push('Configure Cloudflare Access authentication');
    } else {
      console.log('✅ Authentication appears to be working');
      instructions.push('Authentication is configured correctly');
    }
    
    // Frontend access instructions
    console.log('\n🌐 FRONTEND ACCESS:');
    
    const accessibleFrontends = Object.entries(this.results.frontendStatus)
      .filter(([name, status]) => status.statusCode === 200);
    
    if (accessibleFrontends.length > 0) {
      console.log('✅ Frontend options available:');
      accessibleFrontends.forEach(([name, status]) => {
        console.log(`   - ${name}: ${status.url}`);
      });
      instructions.push('Frontend is accessible through available URLs');
    } else {
      console.log('❌ No accessible frontends found');
      console.log('💡 Frontend deployment options:');
      console.log('   1. Deploy to Cloudflare Pages:');
      console.log('      - Build the React app: npm run build');
      console.log('      - Deploy to Pages: wrangler pages deploy dist');
      console.log('   2. Run locally:');
      console.log('      - Start dev server: npm run dev');
      console.log('      - Access at: http://localhost:3000');
      instructions.push('Deploy or start the frontend application');
    }
    
    // KPI management instructions
    console.log('\n📊 KPI MANAGEMENT THROUGH UI:');
    console.log('Once you have access to the Admin Console UI:');
    console.log('');
    console.log('1. 📋 VIEW KPI REGISTRY:');
    console.log('   - Navigate to "KPI Management" section');
    console.log('   - View list of configured KPIs');
    console.log('   - Check KPI status (active/inactive)');
    console.log('');
    console.log('2. ✏️  EDIT KPI CONFIGURATION:');
    console.log('   - Click on a KPI to view details');
    console.log('   - Edit webhook URLs, thresholds, metadata');
    console.log('   - Save changes to update CONFIG_KV');
    console.log('');
    console.log('3. ➕ ADD NEW KPIs:');
    console.log('   - Click "Add New KPI" button');
    console.log('   - Fill in KPI details (name, type, webhook URL)');
    console.log('   - Configure analysis parameters');
    console.log('   - Save to add to registry');
    console.log('');
    console.log('4. 🔄 TEST KPI WORKFLOWS:');
    console.log('   - Use "Test Workflow" button for each KPI');
    console.log('   - Trigger manual N8N workflow execution');
    console.log('   - Monitor execution status and results');
    console.log('');
    console.log('5. 📊 MONITOR SYSTEM STATUS:');
    console.log('   - Check "System Status" dashboard');
    console.log('   - View recent job executions');
    console.log('   - Monitor worker health and performance');
    
    instructions.push('Use Admin Console UI for comprehensive KPI management');
    
    // CLI alternatives
    console.log('\n💻 CLI ALTERNATIVES:');
    console.log('If UI is not accessible, use CLI commands:');
    console.log('');
    console.log('📋 Validate KV Storage:');
    console.log('   node validate-kv-storage.cjs');
    console.log('');
    console.log('🔧 Configure KPI Registry:');
    console.log('   node configure-kpi-registry-in-kv.cjs');
    console.log('');
    console.log('🚀 Test Scheduler:');
    console.log('   node test-scheduler-trigger.cjs');
    console.log('');
    console.log('📊 Check KV Data Directly:');
    console.log('   wrangler kv key get "kpi-registry" --namespace-id ec1a3533310145cf8033cd84e1abd69c');
    
    instructions.push('Use CLI tools as backup for KPI management');
    
    this.results.instructions = instructions;
  }

  async makeHttpRequest(method, url, data = null, apiKey = null) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AdminConsoleChecker/1.0'
        },
        timeout: 10000 // 10 second timeout
      };
      
      if (apiKey) {
        options.headers['X-API-Key'] = apiKey;
      }
      
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

  async saveResults() {
    const fs = require('fs');
    const filename = `admin-console-check-${Date.now()}.json`;
    const content = JSON.stringify(this.results, null, 2);
    
    return new Promise((resolve, reject) => {
      fs.writeFile(filename, content, 'utf8', (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`\n📄 Check results saved to: ${filename}`);
          resolve();
        }
      });
    });
  }
}

// Run if executed directly
if (require.main === module) {
  const checker = new AdminConsoleChecker();
  checker.checkAdminConsole()
    .then(async (results) => {
      await checker.saveResults();
      console.log('\n🎉 Admin Console check completed!');
    })
    .catch(error => {
      console.error('\n💥 Admin Console check failed:', error.message);
      process.exit(1);
    });
}

module.exports = AdminConsoleChecker;