/**
 * KPI Registry Utility
 * 
 * Handles reading and managing KPI registry from Cloudflare KV store.
 * Provides functions to retrieve active KPIs and their configuration.
 */

export async function getActiveKPIs(env) {
  try {
    // Read KPI registry from CONFIG_KV
    const registryData = await env.CONFIG_KV.get('kpi-registry');
    
    if (!registryData) {
      console.warn('KPI Registry: No KPI registry found in CONFIG_KV');
      return [];
    }

    const registry = JSON.parse(registryData);
    
    // Filter for active KPIs only
    const activeKPIs = registry.kpis ? registry.kpis.filter(kpi => kpi.active === true) : [];
    
    console.log(`KPI Registry: Found ${activeKPIs.length} active KPIs out of ${registry.kpis?.length || 0} total`);
    
    // Validate KPI structure
    const validKPIs = activeKPIs.filter(kpi => validateKPIStructure(kpi));
    
    if (validKPIs.length !== activeKPIs.length) {
      console.warn(`KPI Registry: ${activeKPIs.length - validKPIs.length} KPIs failed validation`);
    }
    
    return validKPIs;

  } catch (error) {
    console.error('KPI Registry: Error reading KPI registry:', error);
    return [];
  }
}

export async function getKPIById(env, kpiId) {
  try {
    const activeKPIs = await getActiveKPIs(env);
    return activeKPIs.find(kpi => kpi.id === kpiId) || null;
  } catch (error) {
    console.error(`KPI Registry: Error getting KPI ${kpiId}:`, error);
    return null;
  }
}

export async function getKPIsByType(env, kpiType) {
  try {
    const activeKPIs = await getActiveKPIs(env);
    return activeKPIs.filter(kpi => kpi.type === kpiType);
  } catch (error) {
    console.error(`KPI Registry: Error getting KPIs by type ${kpiType}:`, error);
    return [];
  }
}

function validateKPIStructure(kpi) {
  // Required fields for KPI registry entry
  const requiredFields = ['id', 'name', 'type', 'webhookUrl'];
  
  for (const field of requiredFields) {
    if (!kpi[field]) {
      console.warn(`KPI Registry: KPI missing required field '${field}':`, kpi);
      return false;
    }
  }

  // Validate webhook URL format
  if (!isValidWebhookUrl(kpi.webhookUrl)) {
    console.warn(`KPI Registry: Invalid webhook URL for KPI ${kpi.id}:`, kpi.webhookUrl);
    return false;
  }

  return true;
}

function isValidWebhookUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
  } catch (error) {
    return false;
  }
}

// Example KPI registry structure for reference:
export const EXAMPLE_KPI_REGISTRY = {
  kpis: [
    {
      id: 'cmc-btc-price',
      name: 'Bitcoin Price (CMC)',
      description: 'Current Bitcoin price from CoinMarketCap',
      type: 'price',
      active: true,
      webhookUrl: 'https://n8n.example.com/webhook/btc-price',
      analysisConfig: {
        chartType: 'line',
        alertThresholds: {
          high: 50000,
          low: 30000
        }
      },
      metadata: {
        source: 'coinmarketcap',
        updateFrequency: 'daily',
        category: 'price'
      }
    },
    {
      id: 'mvrv-z-score',
      name: 'MVRV Z-Score',
      description: 'Market Value to Realized Value Z-Score',
      type: 'ratio',
      active: true,
      webhookUrl: 'https://n8n.example.com/webhook/mvrv-z-score',
      analysisConfig: {
        chartType: 'line',
        alertThresholds: {
          high: 7,
          low: -1
        }
      },
      metadata: {
        source: 'glassnode',
        updateFrequency: 'daily',
        category: 'onchain'
      }
    }
  ],
  metadata: {
    lastUpdated: '2025-08-14T12:00:00Z',
    version: '1.0.0',
    totalKPIs: 2,
    activeKPIs: 2
  }
};