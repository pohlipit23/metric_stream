/**
 * Batch Chart Generation Handler
 * Handles batch chart generation requests for multiple KPIs
 */

import { ChartGenerator } from '../utils/chart-generator.js';
import { validateBatchChartRequest } from '../utils/validation.js';
import { storeChart } from '../utils/storage.js';

/**
 * Handle batch chart generation request
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment bindings
 * @param {Object} ctx - Execution context
 * @returns {Response} - Batch generation response
 */
export async function handleChartBatch(request, env, ctx) {
  try {
    const requestData = await request.json();
    
    // Validate request
    const validation = validateBatchChartRequest(requestData);
    if (!validation.valid) {
      return new Response(JSON.stringify({ 
        error: 'Invalid batch request', 
        details: validation.errors 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { traceId, charts } = requestData;
    const results = [];
    const errors = [];

    // If traceId provided, get all KPIs for that trace
    let chartsToGenerate = charts;
    if (traceId && !charts) {
      chartsToGenerate = await getChartsForTrace(env, traceId);
      if (!chartsToGenerate || chartsToGenerate.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'No KPIs found for trace ID',
          traceId 
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Process charts in parallel with concurrency limit
    const concurrencyLimit = 5; // Process 5 charts at a time
    const chartGenerator = new ChartGenerator(env);

    for (let i = 0; i < chartsToGenerate.length; i += concurrencyLimit) {
      const batch = chartsToGenerate.slice(i, i + concurrencyLimit);
      
      const batchPromises = batch.map(async (chartConfig, index) => {
        try {
          const result = await generateSingleChart(env, chartGenerator, chartConfig, traceId);
          return { index: i + index, ...result };
        } catch (error) {
          console.error(`Error generating chart ${i + index}:`, error);
          return { 
            index: i + index, 
            success: false, 
            error: error.message,
            chartConfig 
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Collect results and errors
      batchResults.forEach(result => {
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      });
    }

    // Generate batch summary
    const summary = {
      totalRequested: chartsToGenerate.length,
      successful: results.length,
      failed: errors.length,
      traceId: traceId || null,
      generatedAt: new Date().toISOString()
    };

    return new Response(JSON.stringify({
      success: true,
      summary,
      results,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Batch chart generation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Generate a single chart in batch
 * @param {Object} env - Environment bindings
 * @param {ChartGenerator} chartGenerator - Chart generator instance
 * @param {Object} chartConfig - Chart configuration
 * @param {string} traceId - Trace ID (optional)
 * @returns {Object} - Generation result
 */
async function generateSingleChart(env, chartGenerator, chartConfig, traceId) {
  const { kpiId, chartType, outputFormat, timeRange, customData } = chartConfig;

  try {
    // Get time series data
    let timeSeriesData;
    if (customData) {
      timeSeriesData = customData;
    } else {
      const kvKey = `timeseries:${kpiId}`;
      const storedData = await env.TIMESERIES_KV.get(kvKey, 'json');
      
      if (!storedData) {
        throw new Error(`No data found for KPI: ${kpiId}`);
      }

      timeSeriesData = filterDataByTimeRange(storedData, timeRange);
    }

    // Generate chart
    const chartResult = await chartGenerator.generateChart({
      kpiId,
      chartType,
      outputFormat,
      data: timeSeriesData
    });

    if (!chartResult.success) {
      throw new Error(chartResult.error);
    }

    // Store chart
    const chartId = generateBatchChartId(kpiId, chartType, outputFormat, traceId);
    const storageResult = await storeChart(env, chartId, chartResult.data, {
      kpiId,
      chartType,
      outputFormat,
      traceId,
      generatedAt: new Date().toISOString(),
      batchGenerated: true
    });

    return {
      success: true,
      kpiId,
      chartId,
      chartType,
      outputFormat,
      chartUrl: storageResult.success ? storageResult.url : null,
      dataPoints: timeSeriesData.length,
      storageResult: storageResult.success
    };

  } catch (error) {
    return {
      success: false,
      kpiId,
      chartType,
      outputFormat,
      error: error.message
    };
  }
}

/**
 * Get charts configuration for a trace ID
 * @param {Object} env - Environment bindings
 * @param {string} traceId - Trace ID
 * @returns {Array} - Charts configuration
 */
async function getChartsForTrace(env, traceId) {
  try {
    // Get job data for trace ID
    const jobKey = `job:${traceId}`;
    const jobData = await env.JOBS_KV.get(jobKey, 'json');
    
    if (!jobData || !jobData.kpiIds) {
      return null;
    }

    // Get default chart configurations for each KPI
    const charts = [];
    for (const kpiId of jobData.kpiIds) {
      // Get KPI configuration from registry
      const kpiConfig = await getKPIConfig(env, kpiId);
      
      if (kpiConfig) {
        // Generate chart configs based on KPI type
        const chartConfigs = generateChartConfigsForKPI(kpiConfig);
        charts.push(...chartConfigs);
      } else {
        // Use default configuration
        charts.push({
          kpiId,
          chartType: 'line',
          outputFormat: 'png',
          timeRange: '7d'
        });
      }
    }

    return charts;

  } catch (error) {
    console.error('Error getting charts for trace:', error);
    return null;
  }
}

/**
 * Get KPI configuration from registry
 * @param {Object} env - Environment bindings
 * @param {string} kpiId - KPI ID
 * @returns {Object} - KPI configuration
 */
async function getKPIConfig(env, kpiId) {
  try {
    const configKey = `kpi:${kpiId}`;
    const config = await env.CONFIG_KV.get(configKey, 'json');
    return config;
  } catch (error) {
    console.error(`Error getting KPI config for ${kpiId}:`, error);
    return null;
  }
}

/**
 * Generate chart configurations for a KPI based on its type
 * @param {Object} kpiConfig - KPI configuration
 * @returns {Array} - Chart configurations
 */
function generateChartConfigsForKPI(kpiConfig) {
  const { kpiId, kpiType, chartPreferences = {} } = kpiConfig;
  const charts = [];

  // Default chart configuration
  const defaultChart = {
    kpiId,
    chartType: chartPreferences.defaultType || 'line',
    outputFormat: chartPreferences.defaultFormat || 'png',
    timeRange: chartPreferences.defaultTimeRange || '7d'
  };

  charts.push(defaultChart);

  // Add additional charts based on KPI type
  switch (kpiType) {
    case 'price':
      // Add candlestick chart for price data
      if (chartPreferences.includeCandlestick !== false) {
        charts.push({
          kpiId,
          chartType: 'candlestick',
          outputFormat: 'html',
          timeRange: '30d'
        });
      }
      break;

    case 'volume':
      // Add bar chart for volume data
      if (chartPreferences.includeBar !== false) {
        charts.push({
          kpiId,
          chartType: 'bar',
          outputFormat: 'svg',
          timeRange: '7d'
        });
      }
      break;

    case 'ratio':
    case 'index':
      // Keep default line chart only
      break;
  }

  // Add interactive HTML version if requested
  if (chartPreferences.includeInteractive) {
    charts.push({
      kpiId,
      chartType: defaultChart.chartType,
      outputFormat: 'html',
      timeRange: defaultChart.timeRange
    });
  }

  return charts;
}

/**
 * Filter time series data by time range
 * @param {Object} data - Time series data
 * @param {string} timeRange - Time range (e.g., '7d', '30d', '1y')
 * @returns {Array} - Filtered data points
 */
function filterDataByTimeRange(data, timeRange) {
  if (!timeRange || !data.timestamps || !data.values) {
    return data;
  }

  const now = new Date();
  const ranges = {
    '1d': 1 * 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000
  };

  const rangeMs = ranges[timeRange];
  if (!rangeMs) {
    return data; // Return all data if range not recognized
  }

  const cutoffTime = new Date(now.getTime() - rangeMs);
  const filteredData = {
    timestamps: [],
    values: [],
    metadata: data.metadata || []
  };

  for (let i = 0; i < data.timestamps.length; i++) {
    const timestamp = new Date(data.timestamps[i]);
    if (timestamp >= cutoffTime) {
      filteredData.timestamps.push(data.timestamps[i]);
      filteredData.values.push(data.values[i]);
      if (data.metadata && data.metadata[i]) {
        filteredData.metadata.push(data.metadata[i]);
      }
    }
  }

  return filteredData;
}

/**
 * Generate unique chart ID for batch generation
 * @param {string} kpiId - KPI identifier
 * @param {string} chartType - Chart type
 * @param {string} outputFormat - Output format
 * @param {string} traceId - Trace ID (optional)
 * @returns {string} - Unique chart ID
 */
function generateBatchChartId(kpiId, chartType, outputFormat, traceId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  const tracePrefix = traceId ? `${traceId}-` : '';
  return `batch-${tracePrefix}${kpiId}-${chartType}-${outputFormat}-${timestamp}-${random}`;
}