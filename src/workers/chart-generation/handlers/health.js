/**
 * Health Check Handler
 * Provides health status for the Chart Generation Worker
 */

import { getChartStatistics } from '../utils/storage.js';

/**
 * Handle health check request
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment bindings
 * @returns {Response} - Health check response
 */
export async function handleHealth(request, env) {
  try {
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'chart-generation-worker',
      version: '1.0.0'
    };

    if (detailed) {
      // Add detailed health information
      const detailedInfo = await getDetailedHealthInfo(env);
      Object.assign(health, detailedInfo);
    }

    return new Response(JSON.stringify(health), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return new Response(JSON.stringify({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'chart-generation-worker',
      error: error.message
    }), {
      status: 503,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

/**
 * Get detailed health information
 * @param {Object} env - Environment bindings
 * @returns {Object} - Detailed health info
 */
async function getDetailedHealthInfo(env) {
  const info = {
    dependencies: {},
    storage: {},
    capabilities: {},
    statistics: {}
  };

  try {
    // Check KV storage
    info.dependencies.timeseriesKV = await checkKVHealth(env.TIMESERIES_KV);
    info.dependencies.chartsKV = await checkKVHealth(env.CHARTS_KV);

    // Check R2 storage
    info.dependencies.chartsR2 = await checkR2Health(env.CHARTS_BUCKET);

    // Get storage statistics
    const statsResult = await getChartStatistics(env);
    if (statsResult.success) {
      info.statistics = statsResult.stats;
    }

    // Chart generation capabilities
    info.capabilities = {
      chartTypes: ['line', 'candlestick', 'bar'],
      outputFormats: ['png', 'svg', 'html'],
      maxDataPoints: 50000,
      batchProcessing: true,
      pythonIntegration: !!env.PYTHON_SERVICE_URL
    };

    // Storage info
    info.storage = {
      r2Available: !!env.CHARTS_BUCKET,
      kvAvailable: !!env.CHARTS_KV,
      timeseriesKvAvailable: !!env.TIMESERIES_KV
    };

  } catch (error) {
    console.error('Error getting detailed health info:', error);
    info.error = error.message;
  }

  return info;
}

/**
 * Check KV storage health
 * @param {Object} kv - KV namespace
 * @returns {Object} - Health status
 */
async function checkKVHealth(kv) {
  try {
    if (!kv) {
      return { status: 'unavailable', error: 'KV namespace not configured' };
    }

    // Try a simple operation
    const testKey = `health-check-${Date.now()}`;
    await kv.put(testKey, 'test', { expirationTtl: 60 });
    const result = await kv.get(testKey);
    await kv.delete(testKey);

    if (result === 'test') {
      return { status: 'healthy' };
    } else {
      return { status: 'degraded', error: 'KV read/write test failed' };
    }

  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

/**
 * Check R2 storage health
 * @param {Object} r2 - R2 bucket
 * @returns {Object} - Health status
 */
async function checkR2Health(r2) {
  try {
    if (!r2) {
      return { status: 'unavailable', error: 'R2 bucket not configured' };
    }

    // Try a simple operation
    const testKey = `health-check-${Date.now()}.txt`;
    await r2.put(testKey, 'health check test');
    const result = await r2.get(testKey);
    await r2.delete(testKey);

    if (result) {
      return { status: 'healthy' };
    } else {
      return { status: 'degraded', error: 'R2 read/write test failed' };
    }

  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}