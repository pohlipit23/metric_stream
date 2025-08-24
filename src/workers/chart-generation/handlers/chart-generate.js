/**
 * Chart Generation Handler
 * Handles individual chart generation requests
 */

import { ChartGenerator } from '../utils/chart-generator.js';
import { validateChartRequest } from '../utils/validation.js';
import { storeChart } from '../utils/storage.js';

/**
 * Handle chart generation request
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment bindings
 * @param {Object} ctx - Execution context
 * @returns {Response} - Chart generation response
 */
export async function handleChartGenerate(request, env, ctx) {
  try {
    const requestData = await request.json();
    
    // Validate request
    const validation = validateChartRequest(requestData);
    if (!validation.valid) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request', 
        details: validation.errors 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { kpiId, chartType, outputFormat, timeRange, customData } = requestData;

    // Get time series data
    let timeSeriesData;
    if (customData) {
      timeSeriesData = customData;
    } else {
      const kvKey = `timeseries:${kpiId}`;
      const storedData = await env.TIMESERIES_KV.get(kvKey, 'json');
      
      if (!storedData) {
        return new Response(JSON.stringify({ 
          error: 'No data found for KPI',
          kpiId 
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      timeSeriesData = filterDataByTimeRange(storedData, timeRange);
    }

    // Generate chart
    const chartGenerator = new ChartGenerator(env);
    const chartResult = await chartGenerator.generateChart({
      kpiId,
      chartType,
      outputFormat,
      data: timeSeriesData
    });

    if (!chartResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Chart generation failed',
        message: chartResult.error 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store chart
    const chartId = generateChartId(kpiId, chartType, outputFormat);
    const storageResult = await storeChart(env, chartId, chartResult.data, {
      kpiId,
      chartType,
      outputFormat,
      generatedAt: new Date().toISOString()
    });

    if (!storageResult.success) {
      console.error('Failed to store chart:', storageResult.error);
      // Continue anyway, return the chart data directly
    }

    return new Response(JSON.stringify({
      success: true,
      chartId,
      chartUrl: storageResult.success ? storageResult.url : null,
      chartData: outputFormat === 'html' ? chartResult.data : null,
      metadata: {
        kpiId,
        chartType,
        outputFormat,
        dataPoints: timeSeriesData.length,
        generatedAt: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chart generation error:', error);
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
 * Generate unique chart ID
 * @param {string} kpiId - KPI identifier
 * @param {string} chartType - Chart type
 * @param {string} outputFormat - Output format
 * @returns {string} - Unique chart ID
 */
function generateChartId(kpiId, chartType, outputFormat) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${kpiId}-${chartType}-${outputFormat}-${timestamp}-${random}`;
}