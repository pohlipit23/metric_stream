#!/usr/bin/env node

/**
 * Time Series Analysis Test for KV Storage Data
 * 
 * This script tests the suitability of KV storage data for time series analysis
 * by creating mock data, performing various analyses, and validating results.
 * 
 * Usage: node test-timeseries-analysis.js [command]
 * Commands:
 *   generate  - Generate mock time series data
 *   analyze   - Perform time series analysis
 *   validate  - Validate data structure for analysis
 *   all       - Run all tests
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

// Configuration
const CONFIG = {
  // Mock data generation settings
  MOCK_DATA_POINTS: 100,
  START_DATE: new Date('2024-01-01'),
  END_DATE: new Date('2025-08-15'),
  
  // Analysis settings
  MOVING_AVERAGE_PERIODS: [7, 14, 30],
  VOLATILITY_WINDOW: 14,
  CORRELATION_WINDOW: 30,
  
  // KPI configurations for testing
  TEST_KPIS: [
    {
      id: 'cmc-btc-dominance',
      type: 'percentage',
      baseValue: 58.7,
      volatility: 0.05,
      trend: 0.001
    },
    {
      id: 'cmc-totalmarketcap-usd',
      type: 'currency',
      baseValue: 4000000000000,
      volatility: 0.08,
      trend: 0.002
    },
    {
      id: 'cbbi-mvrv',
      type: 'ratio',
      baseValue: 0.84,
      volatility: 0.15,
      trend: -0.001
    },
    {
      id: 'cbbi-confidence',
      type: 'ratio',
      baseValue: 0.79,
      volatility: 0.12,
      trend: 0.0005
    }
  ]
};

/**
 * Generate mock time series data that matches KV storage structure
 */
function generateMockTimeSeriesData() {
  console.log('📊 Generating mock time series data...');
  
  const mockData = {};
  
  for (const kpiConfig of CONFIG.TEST_KPIS) {
    console.log(`📊 Generating data for KPI: ${kpiConfig.id}`);
    
    const dataPoints = [];
    const timeSpan = CONFIG.END_DATE - CONFIG.START_DATE;
    const interval = timeSpan / CONFIG.MOCK_DATA_POINTS;
    
    let currentValue = kpiConfig.baseValue;
    
    for (let i = 0; i < CONFIG.MOCK_DATA_POINTS; i++) {
      const timestamp = new Date(CONFIG.START_DATE.getTime() + (i * interval));
      
      // Apply trend and random volatility
      const trendEffect = kpiConfig.trend * i;
      const volatilityEffect = (Math.random() - 0.5) * 2 * kpiConfig.volatility * currentValue;
      
      currentValue = kpiConfig.baseValue + (kpiConfig.baseValue * trendEffect) + volatilityEffect;
      
      // Ensure positive values for currency and ratios
      if (kpiConfig.type === 'currency' || kpiConfig.type === 'ratio') {
        currentValue = Math.max(currentValue, kpiConfig.baseValue * 0.1);
      }
      
      // Create data point matching KV storage structure
      const dataPoint = {
        timestamp: timestamp.toISOString(),
        value: currentValue,
        metadata: {
          kpiType: kpiConfig.type,
          originalData: {
            value: currentValue,
            generated: true,
            iteration: i
          },
          chart: null
        }
      };
      
      dataPoints.push(dataPoint);
    }
    
    // Create time series structure matching KV storage
    const timeSeriesData = {
      kpiId: kpiConfig.id,
      kpiType: kpiConfig.type,
      dataPoints: dataPoints,
      lastUpdated: new Date().toISOString(),
      metadata: {
        created: CONFIG.START_DATE.toISOString(),
        totalPoints: dataPoints.length,
        mockGenerated: true,
        config: kpiConfig
      }
    };
    
    mockData[`timeseries:${kpiConfig.id}`] = timeSeriesData;
  }
  
  // Save mock data to file
  writeFileSync('mock-timeseries-data.json', JSON.stringify(mockData, null, 2));
  
  console.log(`✅ Generated mock data for ${CONFIG.TEST_KPIS.length} KPIs`);
  console.log(`✅ Total data points: ${CONFIG.MOCK_DATA_POINTS * CONFIG.TEST_KPIS.length}`);
  console.log(`✅ Data saved to: mock-timeseries-data.json`);
  
  return mockData;
}

/**
 * Validate KV storage data structure for analysis suitability
 */
function validateDataStructure(timeSeriesData) {
  console.log('🔍 Validating data structure for analysis...');
  
  const validationResults = {
    overall: true,
    issues: [],
    kpis: {}
  };
  
  for (const [key, data] of Object.entries(timeSeriesData)) {
    const kpiId = key.replace('timeseries:', '');
    console.log(`🔍 Validating KPI: ${kpiId}`);
    
    const kpiValidation = {
      valid: true,
      issues: [],
      dataPoints: data.dataPoints?.length || 0,
      timeRange: null,
      gaps: [],
      duplicates: []
    };
    
    // Check required fields
    const requiredFields = ['kpiId', 'kpiType', 'dataPoints', 'lastUpdated'];
    for (const field of requiredFields) {
      if (!data[field]) {
        kpiValidation.issues.push(`Missing required field: ${field}`);
        kpiValidation.valid = false;
      }
    }
    
    // Validate data points
    if (data.dataPoints && Array.isArray(data.dataPoints)) {
      if (data.dataPoints.length === 0) {
        kpiValidation.issues.push('No data points available');
        kpiValidation.valid = false;
      } else {
        // Check data point structure
        const timestamps = [];
        const values = [];
        
        for (let i = 0; i < data.dataPoints.length; i++) {
          const point = data.dataPoints[i];
          
          // Check required fields in data points
          if (!point.timestamp) {
            kpiValidation.issues.push(`Data point ${i}: Missing timestamp`);
            kpiValidation.valid = false;
          } else {
            timestamps.push(new Date(point.timestamp));
          }
          
          if (point.value === undefined || point.value === null) {
            kpiValidation.issues.push(`Data point ${i}: Missing value`);
            kpiValidation.valid = false;
          } else if (typeof point.value !== 'number') {
            kpiValidation.issues.push(`Data point ${i}: Value is not a number`);
            kpiValidation.valid = false;
          } else {
            values.push(point.value);
          }
        }
        
        // Check chronological order
        const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
        const isChronological = timestamps.every((ts, i) => ts.getTime() === sortedTimestamps[i].getTime());
        
        if (!isChronological) {
          kpiValidation.issues.push('Data points are not in chronological order');
          kpiValidation.valid = false;
        }
        
        // Check for duplicates
        const timestampStrings = timestamps.map(ts => ts.toISOString());
        const uniqueTimestamps = new Set(timestampStrings);
        if (uniqueTimestamps.size !== timestampStrings.length) {
          kpiValidation.issues.push('Duplicate timestamps found');
          kpiValidation.duplicates = timestampStrings.filter((ts, i) => timestampStrings.indexOf(ts) !== i);
        }
        
        // Calculate time range
        if (timestamps.length > 1) {
          kpiValidation.timeRange = {
            start: timestamps[0].toISOString(),
            end: timestamps[timestamps.length - 1].toISOString(),
            duration: timestamps[timestamps.length - 1] - timestamps[0]
          };
        }
        
        // Check for significant gaps (more than 2x expected interval)
        if (timestamps.length > 2) {
          const intervals = [];
          for (let i = 1; i < timestamps.length; i++) {
            intervals.push(timestamps[i] - timestamps[i - 1]);
          }
          
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const maxExpectedInterval = avgInterval * 2;
          
          for (let i = 1; i < timestamps.length; i++) {
            const interval = timestamps[i] - timestamps[i - 1];
            if (interval > maxExpectedInterval) {
              kpiValidation.gaps.push({
                after: timestamps[i - 1].toISOString(),
                before: timestamps[i].toISOString(),
                duration: interval
              });
            }
          }
        }
        
        // Statistical validation
        if (values.length > 0) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
          const stdDev = Math.sqrt(variance);
          
          kpiValidation.statistics = {
            count: values.length,
            mean: mean,
            min: Math.min(...values),
            max: Math.max(...values),
            stdDev: stdDev,
            variance: variance
          };
          
          // Check for constant values (no variance)
          if (stdDev === 0) {
            kpiValidation.issues.push('All values are identical (no variance)');
          }
          
          // Check for extreme outliers (more than 4 standard deviations)
          const outliers = values.filter(v => Math.abs(v - mean) > 4 * stdDev);
          if (outliers.length > 0) {
            kpiValidation.issues.push(`${outliers.length} extreme outliers detected`);
          }
        }
      }
    } else {
      kpiValidation.issues.push('dataPoints is not an array');
      kpiValidation.valid = false;
    }
    
    validationResults.kpis[kpiId] = kpiValidation;
    
    if (!kpiValidation.valid) {
      validationResults.overall = false;
      validationResults.issues.push(`KPI ${kpiId}: ${kpiValidation.issues.join(', ')}`);
    }
    
    console.log(`${kpiValidation.valid ? '✅' : '❌'} KPI ${kpiId}: ${kpiValidation.issues.length} issues`);
  }
  
  console.log(`\n📊 Validation Summary:`);
  console.log(`   Overall Valid: ${validationResults.overall ? '✅' : '❌'}`);
  console.log(`   KPIs Validated: ${Object.keys(validationResults.kpis).length}`);
  console.log(`   Valid KPIs: ${Object.values(validationResults.kpis).filter(k => k.valid).length}`);
  console.log(`   Invalid KPIs: ${Object.values(validationResults.kpis).filter(k => !k.valid).length}`);
  
  return validationResults;
}

/**
 * Perform time series analysis on KV storage data
 */
function performTimeSeriesAnalysis(timeSeriesData) {
  console.log('📈 Performing time series analysis...');
  
  const analysisResults = {
    timestamp: new Date().toISOString(),
    kpis: {},
    correlations: {},
    summary: {}
  };
  
  const allKPIData = {};
  
  // Analyze each KPI individually
  for (const [key, data] of Object.entries(timeSeriesData)) {
    const kpiId = key.replace('timeseries:', '');
    console.log(`📈 Analyzing KPI: ${kpiId}`);
    
    if (!data.dataPoints || data.dataPoints.length === 0) {
      console.log(`⚠️  Skipping ${kpiId}: No data points`);
      continue;
    }
    
    const values = data.dataPoints.map(p => p.value);
    const timestamps = data.dataPoints.map(p => new Date(p.timestamp));
    
    // Store for correlation analysis
    allKPIData[kpiId] = { values, timestamps, dataPoints: data.dataPoints };
    
    // Basic statistics
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate returns (percentage change)
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      const returnValue = (values[i] - values[i - 1]) / values[i - 1];
      returns.push(returnValue);
    }
    
    // Moving averages
    const movingAverages = {};
    for (const period of CONFIG.MOVING_AVERAGE_PERIODS) {
      if (values.length >= period) {
        const ma = [];
        for (let i = period - 1; i < values.length; i++) {
          const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
          ma.push(sum / period);
        }
        movingAverages[`MA${period}`] = ma;
      }
    }
    
    // Volatility (rolling standard deviation of returns)
    const volatility = [];
    if (returns.length >= CONFIG.VOLATILITY_WINDOW) {
      for (let i = CONFIG.VOLATILITY_WINDOW - 1; i < returns.length; i++) {
        const windowReturns = returns.slice(i - CONFIG.VOLATILITY_WINDOW + 1, i + 1);
        const windowMean = windowReturns.reduce((a, b) => a + b, 0) / windowReturns.length;
        const windowVariance = windowReturns.reduce((a, b) => a + Math.pow(b - windowMean, 2), 0) / windowReturns.length;
        volatility.push(Math.sqrt(windowVariance));
      }
    }
    
    // Trend analysis (linear regression)
    const n = values.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const rSquared = calculateRSquared(values, xValues, slope, intercept);
    
    // Support and resistance levels
    const supportResistance = calculateSupportResistance(values);
    
    analysisResults.kpis[kpiId] = {
      basicStats: {
        count: values.length,
        mean: mean,
        min: Math.min(...values),
        max: Math.max(...values),
        stdDev: stdDev,
        variance: variance,
        range: Math.max(...values) - Math.min(...values)
      },
      returns: {
        count: returns.length,
        mean: returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0,
        stdDev: returns.length > 0 ? Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - (returns.reduce((c, d) => c + d, 0) / returns.length), 2), 0) / returns.length) : 0,
        min: returns.length > 0 ? Math.min(...returns) : 0,
        max: returns.length > 0 ? Math.max(...returns) : 0
      },
      movingAverages: movingAverages,
      volatility: {
        current: volatility.length > 0 ? volatility[volatility.length - 1] : 0,
        average: volatility.length > 0 ? volatility.reduce((a, b) => a + b, 0) / volatility.length : 0,
        timeSeries: volatility
      },
      trend: {
        slope: slope,
        intercept: intercept,
        rSquared: rSquared,
        direction: slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'flat',
        strength: Math.abs(rSquared) > 0.7 ? 'strong' : Math.abs(rSquared) > 0.3 ? 'moderate' : 'weak'
      },
      supportResistance: supportResistance,
      timeRange: {
        start: timestamps[0].toISOString(),
        end: timestamps[timestamps.length - 1].toISOString(),
        duration: timestamps[timestamps.length - 1] - timestamps[0]
      }
    };
    
    console.log(`✅ ${kpiId}: Analyzed ${values.length} data points`);
  }
  
  // Cross-KPI correlation analysis
  console.log('📊 Calculating cross-KPI correlations...');
  const kpiIds = Object.keys(allKPIData);
  
  for (let i = 0; i < kpiIds.length; i++) {
    for (let j = i + 1; j < kpiIds.length; j++) {
      const kpi1 = kpiIds[i];
      const kpi2 = kpiIds[j];
      
      const correlation = calculateCorrelation(
        allKPIData[kpi1].values,
        allKPIData[kpi2].values
      );
      
      analysisResults.correlations[`${kpi1}_${kpi2}`] = {
        kpi1: kpi1,
        kpi2: kpi2,
        correlation: correlation,
        strength: Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.3 ? 'moderate' : 'weak',
        direction: correlation > 0 ? 'positive' : 'negative'
      };
    }
  }
  
  // Generate summary
  analysisResults.summary = {
    totalKPIs: Object.keys(analysisResults.kpis).length,
    totalDataPoints: Object.values(analysisResults.kpis).reduce((sum, kpi) => sum + kpi.basicStats.count, 0),
    averageDataPointsPerKPI: Object.values(analysisResults.kpis).reduce((sum, kpi) => sum + kpi.basicStats.count, 0) / Object.keys(analysisResults.kpis).length,
    strongTrends: Object.values(analysisResults.kpis).filter(kpi => kpi.trend.strength === 'strong').length,
    strongCorrelations: Object.values(analysisResults.correlations).filter(corr => corr.strength === 'strong').length,
    analysisQuality: 'good' // This could be calculated based on data completeness, etc.
  };
  
  console.log(`\n📊 Analysis Summary:`);
  console.log(`   KPIs Analyzed: ${analysisResults.summary.totalKPIs}`);
  console.log(`   Total Data Points: ${analysisResults.summary.totalDataPoints}`);
  console.log(`   Strong Trends: ${analysisResults.summary.strongTrends}`);
  console.log(`   Strong Correlations: ${analysisResults.summary.strongCorrelations}`);
  
  return analysisResults;
}

/**
 * Calculate R-squared for linear regression
 */
function calculateRSquared(yValues, xValues, slope, intercept) {
  const yMean = yValues.reduce((a, b) => a + b, 0) / yValues.length;
  
  let ssRes = 0; // Sum of squares of residuals
  let ssTot = 0; // Total sum of squares
  
  for (let i = 0; i < yValues.length; i++) {
    const yPred = slope * xValues[i] + intercept;
    ssRes += Math.pow(yValues[i] - yPred, 2);
    ssTot += Math.pow(yValues[i] - yMean, 2);
  }
  
  return 1 - (ssRes / ssTot);
}

/**
 * Calculate correlation coefficient between two arrays
 */
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
 * Calculate support and resistance levels
 */
function calculateSupportResistance(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  return {
    support: {
      strong: sorted[Math.floor(n * 0.1)], // 10th percentile
      moderate: sorted[Math.floor(n * 0.25)] // 25th percentile
    },
    resistance: {
      moderate: sorted[Math.floor(n * 0.75)], // 75th percentile
      strong: sorted[Math.floor(n * 0.9)] // 90th percentile
    },
    median: sorted[Math.floor(n * 0.5)]
  };
}

/**
 * Generate analysis report
 */
function generateAnalysisReport(validationResults, analysisResults) {
  console.log('\n📋 Generating analysis report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    validation: validationResults,
    analysis: analysisResults,
    recommendations: [],
    suitabilityScore: 0
  };
  
  // Calculate suitability score
  let score = 0;
  let maxScore = 0;
  
  // Data structure validation (40 points)
  maxScore += 40;
  if (validationResults.overall) {
    score += 40;
  } else {
    score += Math.max(0, 40 - validationResults.issues.length * 5);
  }
  
  // Data completeness (30 points)
  maxScore += 30;
  const avgDataPoints = analysisResults.summary?.averageDataPointsPerKPI || 0;
  if (avgDataPoints >= 100) score += 30;
  else if (avgDataPoints >= 50) score += 20;
  else if (avgDataPoints >= 20) score += 10;
  
  // Analysis quality (30 points)
  maxScore += 30;
  const strongTrends = analysisResults.summary?.strongTrends || 0;
  const totalKPIs = analysisResults.summary?.totalKPIs || 1;
  const trendRatio = strongTrends / totalKPIs;
  
  if (trendRatio >= 0.5) score += 15;
  else if (trendRatio >= 0.25) score += 10;
  else if (trendRatio >= 0.1) score += 5;
  
  const strongCorrelations = analysisResults.summary?.strongCorrelations || 0;
  if (strongCorrelations >= 2) score += 15;
  else if (strongCorrelations >= 1) score += 10;
  else score += 5;
  
  report.suitabilityScore = Math.round((score / maxScore) * 100);
  
  // Generate recommendations
  if (report.suitabilityScore >= 80) {
    report.recommendations.push('✅ Data structure is excellent for time series analysis');
    report.recommendations.push('✅ Sufficient data points for reliable analysis');
    report.recommendations.push('✅ Good trend detection and correlation analysis possible');
  } else if (report.suitabilityScore >= 60) {
    report.recommendations.push('⚠️ Data structure is good but could be improved');
    if (avgDataPoints < 50) {
      report.recommendations.push('📈 Consider collecting more data points for better analysis');
    }
    if (strongTrends === 0) {
      report.recommendations.push('📊 Monitor for trend development over time');
    }
  } else {
    report.recommendations.push('❌ Data structure needs improvement for reliable analysis');
    if (!validationResults.overall) {
      report.recommendations.push('🔧 Fix data validation issues first');
    }
    if (avgDataPoints < 20) {
      report.recommendations.push('📊 Collect significantly more data points');
    }
  }
  
  // Specific recommendations based on validation issues
  for (const [kpiId, kpiValidation] of Object.entries(validationResults.kpis)) {
    if (!kpiValidation.valid) {
      report.recommendations.push(`🔧 Fix issues in KPI ${kpiId}: ${kpiValidation.issues.join(', ')}`);
    }
    if (kpiValidation.gaps.length > 0) {
      report.recommendations.push(`📅 Fill data gaps in KPI ${kpiId} (${kpiValidation.gaps.length} gaps found)`);
    }
  }
  
  // Save report
  writeFileSync('timeseries-analysis-report.json', JSON.stringify(report, null, 2));
  
  console.log(`\n📊 Analysis Report Generated:`);
  console.log(`   Suitability Score: ${report.suitabilityScore}/100`);
  console.log(`   Recommendations: ${report.recommendations.length}`);
  console.log(`   Report saved to: timeseries-analysis-report.json`);
  
  return report;
}

/**
 * Main command handler
 */
async function main() {
  const command = process.argv[2] || 'help';
  
  console.log('📊 Time Series Analysis Test for KV Storage Data\n');
  
  try {
    let mockData, validationResults, analysisResults;
    
    switch (command) {
      case 'generate':
        generateMockTimeSeriesData();
        break;
        
      case 'validate':
        if (!existsSync('mock-timeseries-data.json')) {
          console.log('⚠️ Mock data not found. Generating...');
          mockData = generateMockTimeSeriesData();
        } else {
          mockData = JSON.parse(readFileSync('mock-timeseries-data.json', 'utf8'));
        }
        validationResults = validateDataStructure(mockData);
        writeFileSync('validation-results.json', JSON.stringify(validationResults, null, 2));
        break;
        
      case 'analyze':
        if (!existsSync('mock-timeseries-data.json')) {
          console.log('⚠️ Mock data not found. Generating...');
          mockData = generateMockTimeSeriesData();
        } else {
          mockData = JSON.parse(readFileSync('mock-timeseries-data.json', 'utf8'));
        }
        analysisResults = performTimeSeriesAnalysis(mockData);
        writeFileSync('analysis-results.json', JSON.stringify(analysisResults, null, 2));
        break;
        
      case 'all':
        console.log('🚀 Running complete time series analysis test...\n');
        
        // Step 1: Generate mock data
        mockData = generateMockTimeSeriesData();
        
        // Step 2: Validate data structure
        console.log('\n' + '='.repeat(50));
        validationResults = validateDataStructure(mockData);
        
        // Step 3: Perform analysis
        console.log('\n' + '='.repeat(50));
        analysisResults = performTimeSeriesAnalysis(mockData);
        
        // Step 4: Generate report
        console.log('\n' + '='.repeat(50));
        const report = generateAnalysisReport(validationResults, analysisResults);
        
        console.log('\n🎉 Complete analysis finished!');
        console.log(`📊 Suitability Score: ${report.suitabilityScore}/100`);
        
        if (report.suitabilityScore >= 80) {
          console.log('✅ KV storage data structure is excellent for time series analysis!');
        } else if (report.suitabilityScore >= 60) {
          console.log('⚠️ KV storage data structure is good but has room for improvement');
        } else {
          console.log('❌ KV storage data structure needs significant improvement');
        }
        
        break;
        
      case 'help':
      default:
        console.log('Available commands:');
        console.log('  generate  - Generate mock time series data');
        console.log('  validate  - Validate data structure for analysis');
        console.log('  analyze   - Perform time series analysis');
        console.log('  all       - Run complete analysis test');
        console.log('  help      - Show this help message');
        console.log('\nUsage: node test-timeseries-analysis.js [command]');
        console.log('\nFiles generated:');
        console.log('  mock-timeseries-data.json     - Mock KV storage data');
        console.log('  validation-results.json       - Data validation results');
        console.log('  analysis-results.json         - Time series analysis results');
        console.log('  timeseries-analysis-report.json - Complete analysis report');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { 
  generateMockTimeSeriesData, 
  validateDataStructure, 
  performTimeSeriesAnalysis,
  generateAnalysisReport
};