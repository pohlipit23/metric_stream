#!/usr/bin/env node

/**
 * Configure KPI Registry for Development Environment Testing
 * Updates the CONFIG_KV with real KPI configurations for testing
 */

const kpiRegistry = {
  "kpis": [
    {
      "id": "cbbi-multi",
      "name": "CBBI Multi KPI",
      "description": "CBBI Multi-indicator analysis including price, RHODL, and confidence metrics",
      "type": "multi-indicator",
      "active": true,
      "webhookUrl": "http://localhost:5678/webhook/cbbi-multi",
      "analysisConfig": {
        "chartType": "multi-line",
        "indicators": ["price", "rhodl", "confidence"],
        "alertThresholds": {
          "price": { "high": 150000, "low": 80000 },
          "rhodl": { "high": 0.9, "low": 0.3 },
          "confidence": { "high": 90, "low": 10 }
        }
      },
      "metadata": {
        "source": "colintalkscrypto",
        "category": "multi-indicator",
        "created": new Date().toISOString(),
        "dataPoints": ["btc-price-usd", "rhodl", "confidence"]
      }
    },
    {
      "id": "kpi-cmc",
      "name": "CoinMarketCap Bitcoin Price",
      "description": "Real-time Bitcoin price data from CoinMarketCap API",
      "type": "price",
      "active": true,
      "webhookUrl": "http://localhost:5678/webhook/kpi-cmc",
      "analysisConfig": {
        "chartType": "line",
        "alertThresholds": {
          "high": 150000,
          "low": 80000
        }
      },
      "metadata": {
        "source": "coinmarketcap",
        "category": "price",
        "created": new Date().toISOString()
      }
    }
  ],
  "metadata": {
    "lastUpdated": new Date().toISOString(),
    "version": "1.0.0-development",
    "totalKPIs": 2,
    "activeKPIs": 2,
    "environment": "development",
    "testingPhase": "comprehensive-end-to-end"
  }
};

console.log('KPI Registry Configuration:');
console.log(JSON.stringify(kpiRegistry, null, 2));

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = kpiRegistry;
}