#!/usr/bin/env node

/**
 * Deploy Admin Console UI
 * 
 * This script helps deploy the Admin Console frontend to Cloudflare Pages
 * and provides instructions for accessing the UI
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AdminConsoleDeployer {
  constructor() {
    this.adminConsolePath = 'src/admin-console';
    this.results = {
      timestamp: new Date().toISOString(),
      buildStatus: null,
      deploymentStatus: null,
      accessInstructions: []
    };
  }

  async deployAdminConsole() {
    console.log('🚀 Deploying Admin Console UI');
    console.log('=' .repeat(50));

    try {
      // Check if admin console exists
      await this.checkAdminConsoleExists();
      
      // Build the frontend
      await this.buildFrontend();
      
      // Deploy to Cloudflare Pages
      await this.deployToPages();
      
      // Generate access instructions
      this.generateAccessInstructions();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Admin Console deployment failed:', error.message);
      throw error;
    }
  }

  async checkAdminConsoleExists() {
    console.log('\n📋 Checking Admin Console Frontend');
    console.log('-' .repeat(40));
    
    if (!fs.existsSync(this.adminConsolePath)) {
      throw new Error('Admin Console directory not found');
    }
    
    const packageJsonPath = path.join(this.adminConsolePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('Admin Console package.json not found');
    }
    
    console.log('✅ Admin Console frontend found');
    
    // Check if node_modules exists
    const nodeModulesPath = path.join(this.adminConsolePath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('📦 Installing dependencies...');
      
      try {
        execSync('npm install', { 
          cwd: this.adminConsolePath,
          encoding: 'utf8',
          stdio: 'inherit'
        });
        console.log('✅ Dependencies installed');
      } catch (error) {
        throw new Error(`Failed to install dependencies: ${error.message}`);
      }
    } else {
      console.log('✅ Dependencies already installed');
    }
  }

  async buildFrontend() {
    console.log('\n📋 Building Frontend');
    console.log('-' .repeat(40));
    
    try {
      console.log('🔨 Building React application...');
      
      const buildResult = execSync('npm run build', { 
        cwd: this.adminConsolePath,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('✅ Frontend build successful');
      
      // Check if dist directory was created
      const distPath = path.join(this.adminConsolePath, 'dist');
      if (fs.existsSync(distPath)) {
        const distFiles = fs.readdirSync(distPath);
        console.log(`📦 Build output: ${distFiles.length} files in dist/`);
        
        this.results.buildStatus = {
          status: 'success',
          outputFiles: distFiles.length,
          distPath: distPath
        };
      } else {
        throw new Error('Build output directory (dist/) not found');
      }
      
    } catch (error) {
      this.results.buildStatus = {
        status: 'failed',
        error: error.message
      };
      throw new Error(`Frontend build failed: ${error.message}`);
    }
  }

  async deployToPages() {
    console.log('\n📋 Deploying to Cloudflare Pages');
    console.log('-' .repeat(40));
    
    try {
      console.log('🚀 Deploying to Cloudflare Pages...');
      
      const deployResult = execSync('npx wrangler pages deploy dist --project-name daily-index-tracker-admin', { 
        cwd: this.adminConsolePath,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('✅ Deployment successful');
      console.log('📊 Deployment output:');
      console.log(deployResult);
      
      // Extract URL from deployment output
      const urlMatch = deployResult.match(/https:\/\/[^\s]+/);
      const deploymentUrl = urlMatch ? urlMatch[0] : 'https://daily-index-tracker-admin.pages.dev';
      
      this.results.deploymentStatus = {
        status: 'success',
        url: deploymentUrl,
        output: deployResult
      };
      
      console.log(`🌐 Admin Console URL: ${deploymentUrl}`);
      
    } catch (error) {
      this.results.deploymentStatus = {
        status: 'failed',
        error: error.message
      };
      
      // Try alternative deployment method
      console.log('⚠️  Standard deployment failed, trying alternative...');
      
      try {
        const altDeployResult = execSync('npx wrangler pages deploy dist', { 
          cwd: this.adminConsolePath,
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        console.log('✅ Alternative deployment successful');
        console.log(altDeployResult);
        
        const altUrlMatch = altDeployResult.match(/https:\/\/[^\s]+/);
        const altDeploymentUrl = altUrlMatch ? altUrlMatch[0] : 'https://pages.dev';
        
        this.results.deploymentStatus = {
          status: 'success',
          url: altDeploymentUrl,
          output: altDeployResult,
          method: 'alternative'
        };
        
        console.log(`🌐 Admin Console URL: ${altDeploymentUrl}`);
        
      } catch (altError) {
        throw new Error(`Deployment failed: ${error.message}`);
      }
    }
  }

  generateAccessInstructions() {
    console.log('\n📋 ACCESS INSTRUCTIONS');
    console.log('=' .repeat(50));
    
    const instructions = [];
    
    if (this.results.deploymentStatus && this.results.deploymentStatus.status === 'success') {
      const url = this.results.deploymentStatus.url;
      
      console.log('🌐 ADMIN CONSOLE ACCESS:');
      console.log(`URL: ${url}`);
      console.log('');
      
      console.log('🔐 AUTHENTICATION:');
      console.log('The Admin Console uses Cloudflare Access for authentication.');
      console.log('');
      console.log('📋 TO ACCESS THE UI:');
      console.log('1. Open your browser and navigate to:');
      console.log(`   ${url}`);
      console.log('');
      console.log('2. You may be prompted to authenticate through Cloudflare Access');
      console.log('   - If configured, use your email/SSO provider');
      console.log('   - If not configured, you may see a 503 error');
      console.log('');
      console.log('3. Once authenticated, you can:');
      console.log('   ✅ View KPI Registry');
      console.log('   ✅ Manage KPI configurations');
      console.log('   ✅ Monitor system status');
      console.log('   ✅ Test N8N workflows');
      console.log('   ✅ View job history');
      
      instructions.push(`Access Admin Console at: ${url}`);
      instructions.push('Configure Cloudflare Access if needed');
      
    } else {
      console.log('❌ DEPLOYMENT FAILED');
      console.log('');
      console.log('💡 ALTERNATIVE OPTIONS:');
      console.log('');
      console.log('1. 🏠 RUN LOCALLY:');
      console.log('   cd src/admin-console');
      console.log('   npm run dev');
      console.log('   # Access at http://localhost:3000');
      console.log('');
      console.log('2. 🔧 MANUAL DEPLOYMENT:');
      console.log('   cd src/admin-console');
      console.log('   npm run build');
      console.log('   npx wrangler pages deploy dist');
      
      instructions.push('Run locally or deploy manually');
    }
    
    console.log('');
    console.log('📊 KPI MANAGEMENT FEATURES:');
    console.log('');
    console.log('🔍 VIEW KPI DATA:');
    console.log('   - Navigate to "KPI Management" section');
    console.log('   - See your 2 configured KPIs:');
    console.log('     • CBBI Multi KPI (multi-indicator)');
    console.log('     • CoinMarketCap Bitcoin Price (price)');
    console.log('   - Check active/inactive status');
    console.log('   - View webhook URLs and configurations');
    console.log('');
    console.log('✏️  EDIT KPI SETTINGS:');
    console.log('   - Click on any KPI to edit');
    console.log('   - Modify webhook URLs');
    console.log('   - Update alert thresholds');
    console.log('   - Change analysis configurations');
    console.log('   - Save changes to update KV storage');
    console.log('');
    console.log('🚀 TEST WORKFLOWS:');
    console.log('   - Use "Test Workflow" buttons');
    console.log('   - Trigger N8N workflows manually');
    console.log('   - Monitor execution results');
    console.log('   - View response data and errors');
    console.log('');
    console.log('📈 MONITOR SYSTEM:');
    console.log('   - Check system status dashboard');
    console.log('   - View recent job executions');
    console.log('   - Monitor worker health');
    console.log('   - Track performance metrics');
    
    console.log('');
    console.log('💻 CLI BACKUP OPTIONS:');
    console.log('If UI is not accessible, use these CLI commands:');
    console.log('');
    console.log('📊 View KPI Data:');
    console.log('   node show-kv-data.cjs');
    console.log('');
    console.log('🔧 Update KPI Registry:');
    console.log('   node configure-kpi-registry-in-kv.cjs');
    console.log('');
    console.log('🚀 Test Pipeline:');
    console.log('   node test-scheduler-trigger.cjs');
    console.log('');
    console.log('🔍 Validate Storage:');
    console.log('   node validate-kv-storage.cjs');
    
    instructions.push('Use CLI tools as backup for KPI management');
    
    this.results.accessInstructions = instructions;
  }

  async saveResults() {
    const filename = `admin-console-deployment-${Date.now()}.json`;
    const content = JSON.stringify(this.results, null, 2);
    
    return new Promise((resolve, reject) => {
      fs.writeFile(filename, content, 'utf8', (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`\n📄 Deployment results saved to: ${filename}`);
          resolve();
        }
      });
    });
  }
}

// Run if executed directly
if (require.main === module) {
  const deployer = new AdminConsoleDeployer();
  deployer.deployAdminConsole()
    .then(async (results) => {
      await deployer.saveResults();
      console.log('\n🎉 Admin Console deployment process completed!');
    })
    .catch(error => {
      console.error('\n💥 Admin Console deployment failed:', error.message);
      console.log('\n💡 You can still run the Admin Console locally:');
      console.log('   cd src/admin-console');
      console.log('   npm run dev');
      process.exit(1);
    });
}

module.exports = AdminConsoleDeployer;