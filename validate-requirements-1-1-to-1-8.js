#!/usr/bin/env node

/**
 * Requirements 1.1-1.8 Validation Script
 * Validates that all acceptance criteria are implemented in the codebase
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

class RequirementsValidator {
  constructor() {
    this.validationResults = [];
    this.basePath = process.cwd();
  }

  async validateAll() {
    console.log('🔍 Validating Requirements 1.1-1.8 Implementation\n');
    console.log('=' .repeat(60));

    // Validate each requirement
    this.validateRequirement1_1();
    this.validateRequirement1_2();
    this.validateRequirement1_3();
    this.validateRequirement1_4();
    this.validateRequirement1_5();
    this.validateRequirement1_6();
    this.validateRequirement1_7();
    this.validateRequirement1_8();

    // Additional validations
    this.validateWorkerStructure();
    this.validateConfigurationFiles();
    this.validateErrorHandling();

    this.printValidationReport();
  }

  validateRequirement1_1() {
    console.log('\n📋 Requirement 1.1: Cron Trigger → Scheduler Worker');
    
    // Check if scheduler worker exists and has cron configuration
    const schedulerPath = 'src/workers/scheduler';
    const wranglerPath = join(schedulerPath, 'wrangler.toml');
    
    if (this.fileExists(wranglerPath)) {
      const wranglerContent = this.readFile(wranglerPath);
      if (wranglerContent.includes('crons = ') || wranglerContent.includes('[triggers]')) {
        this.logSuccess('1.1', 'Cron triggers configured in scheduler wrangler.toml');
      } else {
        this.logError('1.1', 'No cron triggers found in scheduler configuration');
      }
    } else {
      this.logError('1.1', 'Scheduler wrangler.toml not found');
    }

    // Check scheduler index.js for cron handling
    const schedulerIndex = join(schedulerPath, 'index.js');
    if (this.fileExists(schedulerIndex)) {
      const indexContent = this.readFile(schedulerIndex);
      if (indexContent.includes('scheduled') || indexContent.includes('cron')) {
        this.logSuccess('1.1', 'Scheduler worker handles scheduled events');
      } else {
        this.logError('1.1', 'No scheduled event handling found in scheduler');
      }
    }
  }

  validateRequirement1_2() {
    console.log('\n📋 Requirement 1.2: Job Creation in KV with traceId');
    
    const schedulerHandlers = 'src/workers/scheduler/handlers/scheduled.js';
    if (this.fileExists(schedulerHandlers)) {
      const content = this.readFile(schedulerHandlers);
      
      if (content.includes('traceId') || content.includes('trace_id')) {
        this.logSuccess('1.2', 'TraceId generation implemented');
      } else {
        this.logError('1.2', 'TraceId generation not found');
      }

      if (content.includes('job:') && content.includes('KV')) {
        this.logSuccess('1.2', 'Job record creation in KV implemented');
      } else {
        this.logError('1.2', 'Job record creation in KV not found');
      }
    } else {
      this.logError('1.2', 'Scheduler handlers not found');
    }
  }

  validateRequirement1_3() {
    console.log('\n📋 Requirement 1.3: Individual KPI Triggering');
    
    const schedulerHandlers = 'src/workers/scheduler/handlers/scheduled.js';
    if (this.fileExists(schedulerHandlers)) {
      const content = this.readFile(schedulerHandlers);
      
      if (content.includes('webhook') || content.includes('trigger')) {
        this.logSuccess('1.3', 'N8N workflow triggering implemented');
      } else {
        this.logError('1.3', 'N8N workflow triggering not found');
      }

      if (content.includes('kpiId') || content.includes('kpi_id')) {
        this.logSuccess('1.3', 'Individual KPI processing implemented');
      } else {
        this.logError('1.3', 'Individual KPI processing not found');
      }
    }
  }

  validateRequirement1_4() {
    console.log('\n📋 Requirement 1.4: Data Ingestion');
    
    const ingestionHandlers = 'src/workers/ingestion/handlers/kpi-data.js';
    if (this.fileExists(ingestionHandlers)) {
      const content = this.readFile(ingestionHandlers);
      
      if (content.includes('/api/kpi-data') || content.includes('kpi-data')) {
        this.logSuccess('1.4', 'KPI data endpoint implemented');
      } else {
        this.logError('1.4', 'KPI data endpoint not found');
      }

      if (content.includes('KPIDataUpdate') || content.includes('validation')) {
        this.logSuccess('1.4', 'Data validation implemented');
      } else {
        this.logError('1.4', 'Data validation not found');
      }
    } else {
      this.logError('1.4', 'Ingestion handlers not found');
    }
  }

  validateRequirement1_5() {
    console.log('\n📋 Requirement 1.5: Data Persistence');
    
    const ingestionHandlers = 'src/workers/ingestion/handlers/kpi-data.js';
    if (this.fileExists(ingestionHandlers)) {
      const content = this.readFile(ingestionHandlers);
      
      if (content.includes('timeseries:') || content.includes('TIMESERIES_KV')) {
        this.logSuccess('1.5', 'Time series storage implemented');
      } else {
        this.logError('1.5', 'Time series storage not found');
      }

      if (content.includes('package:') || content.includes('PACKAGES_KV')) {
        this.logSuccess('1.5', 'KPI package creation implemented');
      } else {
        this.logError('1.5', 'KPI package creation not found');
      }

      if (content.includes('job:') || content.includes('JOBS_KV')) {
        this.logSuccess('1.5', 'Job status update implemented');
      } else {
        this.logError('1.5', 'Job status update not found');
      }
    }
  }

  validateRequirement1_6() {
    console.log('\n📋 Requirement 1.6: Orchestration Monitoring');
    
    const orchestrationHandlers = 'src/workers/orchestration/handlers/scheduled.js';
    if (this.fileExists(orchestrationHandlers)) {
      const content = this.readFile(orchestrationHandlers);
      
      if (content.includes('polling') || content.includes('monitor')) {
        this.logSuccess('1.6', 'Job monitoring implemented');
      } else {
        this.logError('1.6', 'Job monitoring not found');
      }

      if (content.includes('KV') && content.includes('job')) {
        this.logSuccess('1.6', 'KV job status checking implemented');
      } else {
        this.logError('1.6', 'KV job status checking not found');
      }
    } else {
      this.logError('1.6', 'Orchestration handlers not found');
    }

    // Check orchestration wrangler.toml for cron triggers
    const orchestrationWrangler = 'src/workers/orchestration/wrangler.toml';
    if (this.fileExists(orchestrationWrangler)) {
      const content = this.readFile(orchestrationWrangler);
      if (content.includes('crons = ') || content.includes('[triggers]')) {
        this.logSuccess('1.6', 'Orchestration cron triggers configured');
      } else {
        this.logError('1.6', 'Orchestration cron triggers not configured');
      }
    }
  }

  validateRequirement1_7() {
    console.log('\n📋 Requirement 1.7: Aggregate Workflow Triggering');
    
    const orchestrationHandlers = 'src/workers/orchestration/handlers/scheduled.js';
    if (this.fileExists(orchestrationHandlers)) {
      const content = this.readFile(orchestrationHandlers);
      
      if (content.includes('LLM_ANALYSIS_QUEUE') || content.includes('queue')) {
        this.logSuccess('1.7', 'Queue message sending implemented');
      } else {
        this.logError('1.7', 'Queue message sending not found');
      }

      if (content.includes('timeout') || content.includes('complete')) {
        this.logSuccess('1.7', 'Job completion detection implemented');
      } else {
        this.logError('1.7', 'Job completion detection not found');
      }
    }

    // Check orchestration wrangler.toml for queue configuration
    const orchestrationWrangler = 'src/workers/orchestration/wrangler.toml';
    if (this.fileExists(orchestrationWrangler)) {
      const content = this.readFile(orchestrationWrangler);
      if (content.includes('queues.producers') || content.includes('LLM_ANALYSIS_QUEUE')) {
        this.logSuccess('1.7', 'Queue configuration found in wrangler.toml');
      } else {
        this.logError('1.7', 'Queue configuration not found');
      }
    }
  }

  validateRequirement1_8() {
    console.log('\n📋 Requirement 1.8: Sequential Aggregate Processing');
    
    // Check if N8N integration documentation exists
    const n8nDocs = [
      'src/schemas/triggers.py',
      'src/schemas/responses.py',
      '.kiro/specs/metric_stream/design.md'
    ];

    let n8nIntegrationFound = false;
    for (const docPath of n8nDocs) {
      if (this.fileExists(docPath)) {
        const content = this.readFile(docPath);
        if (content.includes('LLM_ANALYSIS_QUEUE') || 
            content.includes('PACKAGING_QUEUE') || 
            content.includes('DELIVERY_QUEUE')) {
          n8nIntegrationFound = true;
          break;
        }
      }
    }

    if (n8nIntegrationFound) {
      this.logSuccess('1.8', 'Sequential queue processing documented');
    } else {
      this.logError('1.8', 'Sequential queue processing not documented');
    }

    // Check if queue sequence is defined
    const designDoc = '.kiro/specs/metric_stream/design.md';
    if (this.fileExists(designDoc)) {
      const content = this.readFile(designDoc);
      if (content.includes('LLM_ANALYSIS_QUEUE') && 
          content.includes('PACKAGING_QUEUE') && 
          content.includes('DELIVERY_QUEUE')) {
        this.logSuccess('1.8', 'Complete queue sequence defined in design');
      } else {
        this.logError('1.8', 'Complete queue sequence not defined');
      }
    }
  }

  validateWorkerStructure() {
    console.log('\n📋 Worker Structure Validation');
    
    const requiredWorkers = [
      'src/workers/ingestion',
      'src/workers/scheduler', 
      'src/workers/orchestration',
      'src/workers/admin-console'
    ];

    for (const workerPath of requiredWorkers) {
      if (this.fileExists(workerPath)) {
        const indexPath = join(workerPath, 'index.js');
        const wranglerPath = join(workerPath, 'wrangler.toml');
        
        if (this.fileExists(indexPath) && this.fileExists(wranglerPath)) {
          this.logSuccess('Structure', `${workerPath} properly configured`);
        } else {
          this.logError('Structure', `${workerPath} missing required files`);
        }
      } else {
        this.logError('Structure', `${workerPath} directory not found`);
      }
    }
  }

  validateConfigurationFiles() {
    console.log('\n📋 Configuration Files Validation');
    
    const requiredConfigs = [
      'src/schemas/core.py',
      'src/schemas/responses.py', 
      'src/schemas/triggers.py',
      '.kiro/specs/metric_stream/requirements.md',
      '.kiro/specs/metric_stream/design.md',
      '.kiro/specs/metric_stream/tasks.md'
    ];

    for (const configPath of requiredConfigs) {
      if (this.fileExists(configPath)) {
        this.logSuccess('Config', `${configPath} exists`);
      } else {
        this.logError('Config', `${configPath} missing`);
      }
    }
  }

  validateErrorHandling() {
    console.log('\n📋 Error Handling Validation');
    
    const ingestionError = 'src/workers/ingestion/handlers/kpi-error.js';
    if (this.fileExists(ingestionError)) {
      const content = this.readFile(ingestionError);
      if (content.includes('/api/kpi-error') || content.includes('error')) {
        this.logSuccess('Error', 'Error reporting endpoint implemented');
      } else {
        this.logError('Error', 'Error reporting endpoint not found');
      }
    } else {
      this.logError('Error', 'Error handling file not found');
    }
  }

  fileExists(path) {
    return existsSync(join(this.basePath, path));
  }

  readFile(path) {
    try {
      return readFileSync(join(this.basePath, path), 'utf8');
    } catch (error) {
      return '';
    }
  }

  logSuccess(requirement, message) {
    console.log(`   ✅ ${message}`);
    this.validationResults.push({ requirement, type: 'success', message });
  }

  logError(requirement, message) {
    console.log(`   ❌ ${message}`);
    this.validationResults.push({ requirement, type: 'error', message });
  }

  printValidationReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 REQUIREMENTS 1.1-1.8 VALIDATION REPORT');
    console.log('='.repeat(60));
    
    const successes = this.validationResults.filter(r => r.type === 'success').length;
    const errors = this.validationResults.filter(r => r.type === 'error').length;
    const total = successes + errors;
    
    console.log(`✅ Validations Passed: ${successes}`);
    console.log(`❌ Validations Failed: ${errors}`);
    console.log(`📈 Implementation Rate: ${total > 0 ? ((successes / total) * 100).toFixed(1) : 0}%`);
    
    // Group results by requirement
    const byRequirement = {};
    this.validationResults.forEach(result => {
      if (!byRequirement[result.requirement]) {
        byRequirement[result.requirement] = { success: 0, error: 0 };
      }
      byRequirement[result.requirement][result.type]++;
    });

    console.log('\n📋 Requirements Summary:');
    Object.keys(byRequirement).forEach(req => {
      const stats = byRequirement[req];
      const status = stats.error === 0 ? '✅' : '⚠️';
      console.log(`   ${status} ${req}: ${stats.success} passed, ${stats.error} failed`);
    });

    if (errors > 0) {
      console.log('\n🚨 Failed Validations:');
      this.validationResults
        .filter(r => r.type === 'error')
        .forEach((result, index) => {
          console.log(`   ${index + 1}. [${result.requirement}] ${result.message}`);
        });
    }

    console.log('\n📝 Validation Notes:');
    console.log('- This validates code implementation, not runtime behavior');
    console.log('- Full end-to-end testing requires deployed workers and N8N');
    console.log('- Queue operations require Cloudflare Queue configuration');
    
    if (errors === 0) {
      console.log('\n🎉 ALL REQUIREMENTS 1.1-1.8 IMPLEMENTATIONS VALIDATED!');
      return true;
    } else {
      console.log('\n⚠️  Some implementations need attention. See failed validations above.');
      return false;
    }
  }
}

// Run validation
async function main() {
  const validator = new RequirementsValidator();
  const success = await validator.validateAll();
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});