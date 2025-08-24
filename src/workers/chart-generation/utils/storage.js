/**
 * Chart Storage Utilities
 * Handles storing charts in Cloudflare R2 and KV with unique URLs
 */

/**
 * Store chart in R2 and KV with metadata
 * @param {Object} env - Environment bindings
 * @param {string} chartId - Unique chart identifier
 * @param {string|Buffer} chartData - Chart data
 * @param {Object} metadata - Chart metadata
 * @returns {Object} - Storage result
 */
export async function storeChart(env, chartId, chartData, metadata) {
  try {
    const { kpiId, chartType, outputFormat, generatedAt } = metadata;
    
    // Generate storage key and URL
    const storageKey = generateStorageKey(chartId, kpiId, chartType, outputFormat);
    const publicUrl = generatePublicUrl(env, storageKey);

    // Store in R2
    const r2Result = await storeInR2(env, storageKey, chartData, metadata);
    if (!r2Result.success) {
      console.error('R2 storage failed:', r2Result.error);
      // Continue with KV storage as fallback
    }

    // Store metadata in KV
    const kvResult = await storeMetadataInKV(env, chartId, {
      ...metadata,
      storageKey,
      publicUrl,
      r2Stored: r2Result.success,
      storedAt: new Date().toISOString()
    });

    return {
      success: true,
      chartId,
      url: publicUrl,
      storageKey,
      r2Stored: r2Result.success,
      kvStored: kvResult.success
    };

  } catch (error) {
    console.error('Chart storage error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Store chart data in Cloudflare R2
 * @param {Object} env - Environment bindings
 * @param {string} key - Storage key
 * @param {string|Buffer} data - Chart data
 * @param {Object} metadata - Chart metadata
 * @returns {Object} - Storage result
 */
async function storeInR2(env, key, data, metadata) {
  try {
    const { chartType, outputFormat } = metadata;
    
    // Determine content type
    const contentType = getContentType(outputFormat);
    
    // Convert data to appropriate format
    let dataToStore;
    if (typeof data === 'string') {
      dataToStore = new TextEncoder().encode(data);
    } else if (data instanceof ArrayBuffer) {
      dataToStore = data;
    } else {
      dataToStore = data;
    }

    // Store in R2
    await env.CHARTS_BUCKET.put(key, dataToStore, {
      httpMetadata: {
        contentType: contentType,
        cacheControl: 'public, max-age=31536000', // 1 year cache
      },
      customMetadata: {
        chartId: metadata.chartId || 'unknown',
        kpiId: metadata.kpiId || 'unknown',
        chartType: chartType,
        outputFormat: outputFormat,
        generatedAt: metadata.generatedAt || new Date().toISOString()
      }
    });

    return { success: true };

  } catch (error) {
    console.error('R2 storage error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Store chart metadata in KV
 * @param {Object} env - Environment bindings
 * @param {string} chartId - Chart ID
 * @param {Object} metadata - Chart metadata
 * @returns {Object} - Storage result
 */
async function storeMetadataInKV(env, chartId, metadata) {
  try {
    const kvKey = `chart:${chartId}`;
    
    await env.CHARTS_KV.put(kvKey, JSON.stringify(metadata), {
      expirationTtl: 86400 * 30 // 30 days TTL
    });

    return { success: true };

  } catch (error) {
    console.error('KV storage error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve chart from storage
 * @param {Object} env - Environment bindings
 * @param {string} chartId - Chart ID
 * @returns {Object} - Retrieval result
 */
export async function retrieveChart(env, chartId) {
  try {
    // Get metadata from KV
    const kvKey = `chart:${chartId}`;
    const metadataStr = await env.CHARTS_KV.get(kvKey);
    
    if (!metadataStr) {
      return {
        success: false,
        error: 'Chart not found'
      };
    }

    const metadata = JSON.parse(metadataStr);

    // If stored in R2, get from R2
    if (metadata.r2Stored && metadata.storageKey) {
      const r2Object = await env.CHARTS_BUCKET.get(metadata.storageKey);
      
      if (r2Object) {
        const data = await r2Object.arrayBuffer();
        return {
          success: true,
          data: data,
          metadata: metadata,
          contentType: getContentType(metadata.outputFormat)
        };
      }
    }

    // Fallback: return metadata with public URL
    return {
      success: true,
      data: null,
      metadata: metadata,
      publicUrl: metadata.publicUrl
    };

  } catch (error) {
    console.error('Chart retrieval error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate storage key for R2
 * @param {string} chartId - Chart ID
 * @param {string} kpiId - KPI ID
 * @param {string} chartType - Chart type
 * @param {string} outputFormat - Output format
 * @returns {string} - Storage key
 */
function generateStorageKey(chartId, kpiId, chartType, outputFormat) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Organize by date for better management
  return `charts/${year}/${month}/${day}/${kpiId}/${chartType}/${chartId}.${outputFormat}`;
}

/**
 * Generate public URL for chart
 * @param {Object} env - Environment bindings
 * @param {string} storageKey - Storage key
 * @returns {string} - Public URL
 */
function generatePublicUrl(env, storageKey) {
  // This would be the public URL for the R2 bucket
  // Format: https://your-bucket.your-account.r2.cloudflarestorage.com/path
  const bucketDomain = env.CHARTS_BUCKET_DOMAIN || 'charts.example.com';
  return `https://${bucketDomain}/${storageKey}`;
}

/**
 * Get content type for output format
 * @param {string} outputFormat - Output format
 * @returns {string} - Content type
 */
function getContentType(outputFormat) {
  const contentTypes = {
    'png': 'image/png',
    'svg': 'image/svg+xml',
    'html': 'text/html',
    'pdf': 'application/pdf',
    'json': 'application/json'
  };

  return contentTypes[outputFormat] || 'application/octet-stream';
}

/**
 * Clean up old charts
 * @param {Object} env - Environment bindings
 * @param {number} maxAgeMs - Maximum age in milliseconds
 * @returns {Object} - Cleanup result
 */
export async function cleanupOldCharts(env, maxAgeMs = 30 * 24 * 60 * 60 * 1000) { // 30 days default
  try {
    const cutoffTime = new Date(Date.now() - maxAgeMs);
    let deletedCount = 0;
    let errorCount = 0;

    // List all chart metadata from KV
    const listResult = await env.CHARTS_KV.list({ prefix: 'chart:' });
    
    for (const key of listResult.keys) {
      try {
        const metadataStr = await env.CHARTS_KV.get(key.name);
        if (!metadataStr) continue;

        const metadata = JSON.parse(metadataStr);
        const generatedAt = new Date(metadata.generatedAt);

        if (generatedAt < cutoffTime) {
          // Delete from R2 if stored there
          if (metadata.r2Stored && metadata.storageKey) {
            await env.CHARTS_BUCKET.delete(metadata.storageKey);
          }

          // Delete from KV
          await env.CHARTS_KV.delete(key.name);
          deletedCount++;
        }

      } catch (error) {
        console.error(`Error cleaning up chart ${key.name}:`, error);
        errorCount++;
      }
    }

    return {
      success: true,
      deletedCount,
      errorCount,
      cutoffTime: cutoffTime.toISOString()
    };

  } catch (error) {
    console.error('Cleanup error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get chart statistics
 * @param {Object} env - Environment bindings
 * @returns {Object} - Statistics
 */
export async function getChartStatistics(env) {
  try {
    const listResult = await env.CHARTS_KV.list({ prefix: 'chart:' });
    const stats = {
      totalCharts: listResult.keys.length,
      chartTypes: {},
      outputFormats: {},
      kpis: {},
      oldestChart: null,
      newestChart: null
    };

    for (const key of listResult.keys) {
      try {
        const metadataStr = await env.CHARTS_KV.get(key.name);
        if (!metadataStr) continue;

        const metadata = JSON.parse(metadataStr);
        
        // Count by chart type
        stats.chartTypes[metadata.chartType] = (stats.chartTypes[metadata.chartType] || 0) + 1;
        
        // Count by output format
        stats.outputFormats[metadata.outputFormat] = (stats.outputFormats[metadata.outputFormat] || 0) + 1;
        
        // Count by KPI
        stats.kpis[metadata.kpiId] = (stats.kpis[metadata.kpiId] || 0) + 1;
        
        // Track oldest and newest
        const generatedAt = new Date(metadata.generatedAt);
        if (!stats.oldestChart || generatedAt < new Date(stats.oldestChart)) {
          stats.oldestChart = metadata.generatedAt;
        }
        if (!stats.newestChart || generatedAt > new Date(stats.newestChart)) {
          stats.newestChart = metadata.generatedAt;
        }

      } catch (error) {
        console.error(`Error processing chart ${key.name}:`, error);
      }
    }

    return {
      success: true,
      stats
    };

  } catch (error) {
    console.error('Statistics error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}