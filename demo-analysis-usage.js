#!/usr/bin/env node

/**
 * Demo: Practical Time Series Analysis Usage
 * 
 * This script demonstrates how to use KV storage data for practical
 * time series analysis in a production environment.
 * 
 * Usage: node demo-analysis-usage.js
 */

import { readFileSync, existsSync } from 'fs';

/**
 * Demo: Market Alert System
 */
function demoMarketAlerts(kvData) {
  console.log('🚨 Demo: Market Alert System');
  console.log('=' .repeat(40));
  
  const alerts = [];
  
  for (const [key, data] of Object.entries(kvData)) {
    const kpiId = key.replace('timeseries:', '');
    
    if (!data.dataPoints || data.dataPoints.length < 2) continue;
    
    const values = data.dataPoints.map(p => p.value);
    const currentValue = values[values.length - 1];
    const previousValue = values[values.length - 2];
    
    const dailyChange = ((currentValue - previousValue) / previousValue) * 100;
    
    // Alert conditions
    if (Math.abs(dailyChange) > 5) {
      alerts.push({
        type: 'HIGH_VOLATILITY',
        kpiId: kpiId,
        change: dailyChange,
        message: `${kpiId} moved ${dailyChange.toFixed(2)}% in 24h`,
        severity: Math.abs(dailyChange) > 10 ? 'CRITICAL' : 'WARNING'
      });
    }
    
    if (kpiId.includes('btc-dominance') && currentValue > 60) {
      alerts.push({
        type: 'BTC_DOMINANCE_HIGH',
        kpiId: kpiId,
        value: currentValue,
        message: `Bitcoin dominance at ${currentValue.toFixed(1)}% - potential altcoin weakness`,
        severity: 'INFO'
      });
    }
    
    if (kpiId.includes('mvrv') && currentValue < 0.8) {
      alerts.push({
        type: 'MVRV_UNDERVALUED',
        kpiId: kpiId,
        value: currentValue,
        message: `MVRV at ${currentValue.toFixed(3)} - potential buying opportunity`,
        severity: 'INFO'
      });
    }
  }
  
  console.log(`📊 Generated ${alerts.length} alerts:`);
  alerts.forEach(alert => {
    const icon = alert.severity === 'CRITICAL' ? '🔴' : alert.severity === 'WARNING' ? '🟡' : '🔵';
    console.log(`${icon} [${alert.severity}] ${alert.message}`);
  });
  
  return alerts;
}

/**
 * Demo: Portfolio Risk Assessment
 */
function demoRiskAssessment(kvData) {
  console.log('\n📊 Demo: Portfolio Risk Assessment');
  console.log('=' .repeat(40));
  
  const riskMetrics = {};
  
  for (const [key, data] of Object.entries(kvData)) {
    const kpiId = key.replace('timeseries:', '');
    
    if (!data.dataPoints || data.dataPoints.length < 7) continue;
    
    const values = data.dataPoints.map(p => p.value);
    
    // Calculate returns
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i - 1]) / values[i - 1]);
    }
    
    // Risk metrics
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(365); // Annualized
    
    const maxDrawdown = calculateMaxDrawdown(values);
    const sharpeRatio = mean / Math.sqrt(variance); // Simplified Sharpe ratio
    
    riskMetrics[kpiId] = {
      volatility: volatility * 100,
      maxDrawdown: maxDrawdown * 100,
      sharpeRatio: sharpeRatio,
      riskLevel: volatility > 0.5 ? 'HIGH' : volatility > 0.2 ? 'MEDIUM' : 'LOW'
    };
    
    console.log(`📈 ${kpiId}:`);
    console.log(`   Volatility: ${(volatility * 100).toFixed(1)}% (${riskMetrics[kpiId].riskLevel})`);
    console.log(`   Max Drawdown: ${(maxDrawdown * 100).toFixed(1)}%`);
    console.log(`   Sharpe Ratio: ${sharpeRatio.toFixed(2)}`);
  }
  
  return riskMetrics;
}

/**
 * Demo: Trading Signal Generation
 */
function demoTradingSignals(kvData) {
  console.log('\n📈 Demo: Trading Signal Generation');
  console.log('=' .repeat(40));
  
  const signals = [];
  
  for (const [key, data] of Object.entries(kvData)) {
    const kpiId = key.replace('timeseries:', '');
    
    if (!data.dataPoints || data.dataPoints.length < 14) continue;
    
    const values = data.dataPoints.map(p => p.value);
    
    // Calculate moving averages
    const ma7 = calculateMovingAverage(values, 7);
    const ma14 = calculateMovingAverage(values, 14);
    
    if (ma7.length > 0 && ma14.length > 0) {
      const currentMA7 = ma7[ma7.length - 1];
      const currentMA14 = ma14[ma14.length - 1];
      const prevMA7 = ma7.length > 1 ? ma7[ma7.length - 2] : currentMA7;
      const prevMA14 = ma14.length > 1 ? ma14[ma14.length - 2] : currentMA14;
      
      // Golden Cross / Death Cross signals
      if (prevMA7 <= prevMA14 && currentMA7 > currentMA14) {
        signals.push({
          type: 'GOLDEN_CROSS',
          kpiId: kpiId,
          signal: 'BUY',
          message: `${kpiId}: MA7 crossed above MA14 - Bullish signal`,
          strength: 'MODERATE'
        });
      } else if (prevMA7 >= prevMA14 && currentMA7 < currentMA14) {
        signals.push({
          type: 'DEATH_CROSS',
          kpiId: kpiId,
          signal: 'SELL',
          message: `${kpiId}: MA7 crossed below MA14 - Bearish signal`,
          strength: 'MODERATE'
        });
      }
    }
    
    // RSI-like momentum signals
    const recentValues = values.slice(-14);
    const momentum = (recentValues[recentValues.length - 1] - recentValues[0]) / recentValues[0];
    
    if (momentum > 0.1) {
      signals.push({
        type: 'MOMENTUM_BUY',
        kpiId: kpiId,
        signal: 'BUY',
        message: `${kpiId}: Strong upward momentum (+${(momentum * 100).toFixed(1)}%)`,
        strength: 'STRONG'
      });
    } else if (momentum < -0.1) {
      signals.push({
        type: 'MOMENTUM_SELL',
        kpiId: kpiId,
        signal: 'SELL',
        message: `${kpiId}: Strong downward momentum (${(momentum * 100).toFixed(1)}%)`,
        strength: 'STRONG'
      });
    }
  }
  
  console.log(`📊 Generated ${signals.length} trading signals:`);
  signals.forEach(signal => {
    const icon = signal.signal === 'BUY' ? '🟢' : '🔴';
    console.log(`${icon} [${signal.strength}] ${signal.message}`);
  });
  
  return signals;
}

/**
 * Demo: Market Correlation Analysis
 */
function demoCorrelationAnalysis(kvData) {
  console.log('\n🔗 Demo: Market Correlation Analysis');
  console.log('=' .repeat(40));
  
  const kpiKeys = Object.keys(kvData);
  const correlations = [];
  
  for (let i = 0; i < kpiKeys.length; i++) {
    for (let j = i + 1; j < kpiKeys.length; j++) {
      const kpi1 = kpiKeys[i].replace('timeseries:', '');
      const kpi2 = kpiKeys[j].replace('timeseries:', '');
      
      const data1 = kvData[kpiKeys[i]];
      const data2 = kvData[kpiKeys[j]];
      
      if (data1.dataPoints && data2.dataPoints && 
          data1.dataPoints.length > 10 && data2.dataPoints.length > 10) {
        
        const values1 = data1.dataPoints.map(p => p.value);
        const values2 = data2.dataPoints.map(p => p.value);
        
        const correlation = calculateCorrelation(values1, values2);
        
        if (!isNaN(correlation)) {
          correlations.push({
            kpi1: kpi1,
            kpi2: kpi2,
            correlation: correlation,
            strength: Math.abs(correlation) > 0.7 ? 'STRONG' : 
                     Math.abs(correlation) > 0.3 ? 'MODERATE' : 'WEAK',
            direction: correlation > 0 ? 'POSITIVE' : 'NEGATIVE'
          });
        }
      }
    }
  }
  
  // Sort by correlation strength
  correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  
  console.log('📊 Top correlations:');
  correlations.slice(0, 5).forEach(corr => {
    const icon = corr.direction === 'POSITIVE' ? '📈' : '📉';
    console.log(`${icon} ${corr.kpi1} ↔ ${corr.kpi2}: ${corr.correlation.toFixed(3)} (${corr.strength})`);
  });
  
  return correlations;
}

/**
 * Demo: Market Regime Detection
 */
function demoMarketRegime(kvData) {
  console.log('\n🎯 Demo: Market Regime Detection');
  console.log('=' .repeat(40));
  
  const regimes = {};
  
  // Analyze Bitcoin dominance for market regime
  const btcDominanceKey = Object.keys(kvData).find(k => k.includes('btc-dominance'));
  if (btcDominanceKey) {
    const btcData = kvData[btcDominanceKey];
    const values = btcData.dataPoints.map(p => p.value);
    const currentDominance = values[values.length - 1];
    
    if (currentDominance > 60) {
      regimes.market = 'BTC_DOMINANCE';
      regimes.description = 'Bitcoin dominance phase - BTC outperforming altcoins';
    } else if (currentDominance < 45) {
      regimes.market = 'ALTCOIN_SEASON';
      regimes.description = 'Altcoin season - Alternative cryptocurrencies gaining market share';
    } else {
      regimes.market = 'BALANCED';
      regimes.description = 'Balanced market - Mixed performance across assets';
    }
  }
  
  // Analyze total market cap for growth phase
  const marketCapKey = Object.keys(kvData).find(k => k.includes('totalmarketcap'));
  if (marketCapKey) {
    const mcData = kvData[marketCapKey];
    const values = mcData.dataPoints.map(p => p.value);
    
    if (values.length > 7) {
      const weeklyGrowth = (values[values.length - 1] - values[values.length - 8]) / values[values.length - 8];
      
      if (weeklyGrowth > 0.05) {
        regimes.growth = 'EXPANSION';
        regimes.growthDescription = 'Market expansion phase - Strong capital inflow';
      } else if (weeklyGrowth < -0.05) {
        regimes.growth = 'CONTRACTION';
        regimes.growthDescription = 'Market contraction phase - Capital outflow';
      } else {
        regimes.growth = 'CONSOLIDATION';
        regimes.growthDescription = 'Market consolidation phase - Sideways movement';
      }
    }
  }
  
  console.log('📊 Current Market Regime:');
  if (regimes.market) {
    console.log(`   Market Phase: ${regimes.market}`);
    console.log(`   Description: ${regimes.description}`);
  }
  if (regimes.growth) {
    console.log(`   Growth Phase: ${regimes.growth}`);
    console.log(`   Description: ${regimes.growthDescription}`);
  }
  
  return regimes;
}

/**
 * Helper Functions
 */
function calculateMaxDrawdown(values) {
  let maxDrawdown = 0;
  let peak = values[0];
  
  for (let i = 1; i < values.length; i++) {
    if (values[i] > peak) {
      peak = values[i];
    } else {
      const drawdown = (peak - values[i]) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  }
  
  return maxDrawdown;
}

function calculateMovingAverage(values, period) {
  const ma = [];
  for (let i = period - 1; i < values.length; i++) {
    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    ma.push(sum / period);
  }
  return ma;
}

function calculateCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;
  
  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);
  
  const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
  const yMean = ySlice.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let xSumSq = 0;
  let ySumSq = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = xSlice[i] - xMean;
    const yDiff = ySlice[i] - yMean;
    
    numerator += xDiff * yDiff;
    xSumSq += xDiff * xDiff;
    ySumSq += yDiff * yDiff;
  }
  
  const denominator = Math.sqrt(xSumSq * ySumSq);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Main demo function
 */
function runDemo() {
  console.log('🚀 Time Series Analysis Demo - Practical Usage Examples\n');
  
  // Load real data if available, otherwise use mock data
  let kvData;
  if (existsSync('real-data-kv-format.json')) {
    kvData = JSON.parse(readFileSync('real-data-kv-format.json', 'utf8'));
    console.log('📊 Using real webhook data for demo\n');
  } else if (existsSync('mock-timeseries-data.json')) {
    kvData = JSON.parse(readFileSync('mock-timeseries-data.json', 'utf8'));
    console.log('📊 Using mock data for demo\n');
  } else {
    console.log('❌ No data available. Run time series tests first.');
    console.log('   npm run test:timeseries');
    console.log('   or');
    console.log('   npm run test:real-analysis');
    return;
  }
  
  console.log(`📈 Analyzing ${Object.keys(kvData).length} KPIs\n`);
  
  // Run all demo analyses
  const alerts = demoMarketAlerts(kvData);
  const riskMetrics = demoRiskAssessment(kvData);
  const signals = demoTradingSignals(kvData);
  const correlations = demoCorrelationAnalysis(kvData);
  const regimes = demoMarketRegime(kvData);
  
  // Summary
  console.log('\n🎉 Demo Complete - Analysis Capabilities Demonstrated:');
  console.log('=' .repeat(50));
  console.log(`✅ Market Alerts: ${alerts.length} alerts generated`);
  console.log(`✅ Risk Assessment: ${Object.keys(riskMetrics).length} assets analyzed`);
  console.log(`✅ Trading Signals: ${signals.length} signals generated`);
  console.log(`✅ Correlations: ${correlations.length} relationships analyzed`);
  console.log(`✅ Market Regime: ${Object.keys(regimes).length} regime indicators`);
  
  console.log('\n💡 This demonstrates that KV storage data supports:');
  console.log('   📊 Real-time market monitoring');
  console.log('   🚨 Automated alert systems');
  console.log('   📈 Technical analysis and signals');
  console.log('   🔗 Cross-asset correlation analysis');
  console.log('   🎯 Market regime detection');
  console.log('   📊 Risk management systems');
}

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo();
}

export { 
  demoMarketAlerts, 
  demoRiskAssessment, 
  demoTradingSignals, 
  demoCorrelationAnalysis, 
  demoMarketRegime 
};