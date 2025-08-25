
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
        "indicators": [
          "price",
          "rhodl",
          "confidence"
        ],
        "alertThresholds": {
          "price": {
            "high": 150000,
            "low": 80000
          },
          "rhodl": {
            "high": 0.9,
            "low": 0.3
          },
          "confidence": {
            "high": 90,
            "low": 10
          }
        }
      },
      "metadata": {
        "source": "colintalkscrypto",
        "category": "multi-indicator",
        "created": "2025-08-24T03:09:48.979Z",
        "dataPoints": [
          "btc-price-usd",
          "rhodl",
          "confidence"
        ]
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
        "created": "2025-08-24T03:09:48.979Z"
      }
    }
  ],
  "metadata": {
    "lastUpdated": "2025-08-24T03:09:48.979Z",
    "version": "1.0.0-development",
    "totalKPIs": 2,
    "activeKPIs": 2,
    "environment": "development",
    "testingPhase": "comprehensive-end-to-end"
  }
};

// This would be stored in CONFIG_KV with key 'kpi-registry'
console.log('KPI Registry to be stored:');
console.log(JSON.stringify(kpiRegistry, null, 2));
