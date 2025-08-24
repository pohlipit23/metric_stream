#!/usr/bin/env node

/**
 * Initialize Configuration Script
 * Sets up real default configuration data in KV store for testing
 */

const CONFIG = {
  ADMIN_CONSOLE_URL: process.env.ADMIN_CONSOLE_URL || 'http://localhost:8787',
  API_KEY: process.env.ADMIN_API_KEY || 'test-admin-key-12345'
};

/**
 * Default system configuration based on the architecture
 */
const DEFAULT_SYSTEM_CONFIG = {
  retry: {
    chart_generation: {
      max_retries: 3,
      backoff_intervals: [1000, 2000, 4000] // milliseconds
    },
    llm_analysis: {
      max_retries: 2,
      backoff_intervals: [2000, 4000]
    },
    data_collection: {
      max_retries: 3,
      backoff_intervals: [1000, 2000, 4000]
    },
    delivery: {
      max_retries: 2,
      backoff_intervals: [5000, 10000]
    }
  },
  fallback: {
    chart_generation: {
      fallback_image_url: 'https://via.placeholder.com/800x400/f3f4f6/6b7280?text=Chart+Generation+Failed',
      fallback_text: 'Chart generation temporarily unavailable'
    },
    llm_analysis: {
      disclaimer: 'AI analysis temporarily unavailable. Data provided without insights.'
    },
    data_collection: {
      skip_on_failure: true,
      log_errors: true
    },
    delivery: {
      retry_on_next_cycle: true,
      alert_admin: true
    }
  },
  job_lifecycle: {
    timeout_minutes: 30,
    partial_data_delivery: true,
    orchestration_polling_minutes: 2
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 'system',
  updated_by: 'system'
};

/**
 * Default schedule configuration
 */
const DEFAULT_SCHEDULE_CONFIG = {
  cron_expression: '0 9 * * *', // Daily at 9 AM UTC
  timezone: 'UTC',
  enabled: true,
  job_timeout_minutes: 30,
  orchestration_polling_minutes: 2,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 'system',
  updated_by: 'system'
};

/**
 * Sample KPI registry entries for testing
 */
const SAMPLE_KPIS = [
  {
    id: 'cbbi-multi',
    name: 'CBBI Multi-Timeframe Analysis',
    description: 'Colin Talks Crypto Bitcoin Bull/Bear Index across multiple timeframes',
    webhook_url: 'http://localhost:5678/webhook/cbbi-multi',
    analysis_config: {
      chart_method: 'n8n',
      chart_type: 'line',
      llm_priority: 'high',
      custom_prompt: 'Analyze the CBBI trends across different timeframes and provide insights on market sentiment.',
      retention_days: 365,
      alert_high: 0.8,
      alert_low: 0.2
    },
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'system'
  },
  {
    id: 'kpi-cmc',
    name: 'CoinMarketCap Market Data',
    description: 'Top cryptocurrency market data from CoinMarketCap',
    webhook_url: 'http://localhost:5678/webhook/kpi-cmc',
    analysis_config: {
      chart_method: 'n8n',
      chart_type: 'candlestick',
      llm_priority: 'standard',
      custom_prompt: 'Analyze the top cryptocurrency market movements and identify key trends.',
      retention_days: 180,
      alert_high: null,
      alert_low: null
    },
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'system'
  }
];

/**
 * Initialize configuration in KV store via Admin Console Worker API
 */
async function initializeConfiguration() {
  console.log('🚀 Initializing configuration data...');
  
  try {
    // Initialize system configuration
    console.log('📝 Setting up system configuration...');
    const systemConfigResponse = await fetch(`${CONFIG.ADMIN_CONSOLE_URL}/api/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.API_KEY}`,
        'X-Admin-Key': CONFIG.API_KEY
      },
      body: JSON.stringify(DEFAULT_SYSTEM_CONFIG)
    });

    if (!systemConfigResponse.ok) {
      const errorText = await systemConfigResponse.text();
      console.error('❌ Failed to initialize system config:', errorText);
    } else {
      const result = await systemConfigResponse.json();
      console.log('✅ System configuration initialized successfully');
    }

    // Initialize schedule configuration
    console.log('📅 Setting up schedule configuration...');
    const scheduleConfigResponse = await fetch(`${CONFIG.ADMIN_CONSOLE_URL}/api/config/schedules`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.API_KEY}`,
        'X-Admin-Key': CONFIG.API_KEY
      },
      body: JSON.stringify(DEFAULT_SCHEDULE_CONFIG)
    });

    if (!scheduleConfigResponse.ok) {
      const errorText = await scheduleConfigResponse.text();
      console.error('❌ Failed to initialize schedule config:', errorText);
    } else {
      const result = await scheduleConfigResponse.json();
      console.log('✅ Schedule configuration initialized successfully');
    }

    // Initialize sample KPIs
    console.log('📊 Setting up sample KPI registry entries...');
    for (const kpi of SAMPLE_KPIS) {
      const kpiResponse = await fetch(`${CONFIG.ADMIN_CONSOLE_URL}/api/kpis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.API_KEY}`,
          'X-Admin-Key': CONFIG.API_KEY
        },
        body: JSON.stringify(kpi)
      });

      if (!kpiResponse.ok) {
        const errorText = await kpiResponse.text();
        console.error(`❌ Failed to create KPI ${kpi.id}:`, errorText);
      } else {
        const result = await kpiResponse.json();
        console.log(`✅ KPI ${kpi.id} created successfully`);
      }
    }

    console.log('\n🎉 Configuration initialization complete!');
    console.log('\nYou can now test the Admin Console at:');
    console.log(`Frontend: http://localhost:5173`);
    console.log(`Backend API: ${CONFIG.ADMIN_CONSOLE_URL}`);
    console.log('\nSystem Configuration page: http://localhost:5173/system-config');

  } catch (error) {
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  }
}

/**
 * Verify worker is running
 */
async function verifyWorker() {
  try {
    console.log('🔍 Checking if Admin Console Worker is running...');
    const response = await fetch(`${CONFIG.ADMIN_CONSOLE_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`Worker health check failed: ${response.status}`);
    }
    
    const health = await response.json();
    console.log('✅ Admin Console Worker is healthy:', health);
    return true;
  } catch (error) {
    console.error('❌ Admin Console Worker is not running or not accessible:');
    console.error('   Error:', error.message);
    console.error('\n💡 Please start the worker first:');
    console.error('   cd src/workers/admin-console');
    console.error('   wrangler dev --port 8787');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔧 Daily Index Tracker - Configuration Initializer\n');
  
  const workerRunning = await verifyWorker();
  if (!workerRunning) {
    process.exit(1);
  }
  
  await initializeConfiguration();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { initializeConfiguration, DEFAULT_SYSTEM_CONFIG, DEFAULT_SCHEDULE_CONFIG, SAMPLE_KPIS };