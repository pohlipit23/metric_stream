/**
 * Idempotency utilities for preventing duplicate data processing
 */

/**
 * Check if a KPI data point already exists for the given timestamp
 */
export async function checkIdempotency(timeseriesKV, kpiId, timestamp) {
  try {
    // Create idempotency key
    const idempotencyKey = `idempotency:${kpiId}:${timestamp}`;
    
    // Check if this combination already exists
    const existing = await timeseriesKV.get(idempotencyKey);
    
    return existing !== null;

  } catch (error) {
    console.error(`Error checking idempotency for ${kpiId}:${timestamp}:`, error);
    // In case of error, assume it's not a duplicate to avoid blocking valid data
    return false;
  }
}

/**
 * Record idempotency after successful processing
 */
export async function recordIdempotency(timeseriesKV, kpiId, timestamp) {
  try {
    // Create idempotency key
    const idempotencyKey = `idempotency:${kpiId}:${timestamp}`;
    
    // Store idempotency record with metadata
    const idempotencyRecord = {
      kpiId: kpiId,
      timestamp: timestamp,
      processedAt: new Date().toISOString(),
      source: 'ingestion-worker'
    };
    
    // Store with TTL of 7 days (604800 seconds)
    // This prevents the idempotency store from growing indefinitely
    await timeseriesKV.put(
      idempotencyKey, 
      JSON.stringify(idempotencyRecord),
      { expirationTtl: 7 * 24 * 60 * 60 }
    );

  } catch (error) {
    console.error(`Error recording idempotency for ${kpiId}:${timestamp}:`, error);
    // Don't throw here as the main processing was successful
  }
}

/**
 * Check idempotency for multiple KPI updates
 */
export async function checkBatchIdempotency(timeseriesKV, kpiUpdates) {
  const results = [];
  
  for (const update of kpiUpdates) {
    const isDuplicate = await checkIdempotency(
      timeseriesKV, 
      update.kpi_id, 
      update.timestamp
    );
    
    results.push({
      kpi_id: update.kpi_id,
      timestamp: update.timestamp,
      is_duplicate: isDuplicate
    });
  }
  
  return results;
}

/**
 * Record idempotency for multiple KPI updates
 */
export async function recordBatchIdempotency(timeseriesKV, kpiUpdates) {
  const promises = kpiUpdates.map(update => 
    recordIdempotency(timeseriesKV, update.kpi_id, update.timestamp)
  );
  
  // Wait for all idempotency records to be stored
  await Promise.allSettled(promises);
}

/**
 * Clean up old idempotency records (maintenance function)
 * This would typically be called by a separate cleanup worker
 */
export async function cleanupIdempotencyRecords(timeseriesKV, olderThanDays = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const cutoffTimestamp = cutoffDate.toISOString();
    
    // List all idempotency keys
    const listResult = await timeseriesKV.list({ prefix: 'idempotency:' });
    
    const keysToDelete = [];
    
    for (const key of listResult.keys) {
      try {
        const record = await timeseriesKV.get(key.name, 'json');
        if (record && record.processedAt < cutoffTimestamp) {
          keysToDelete.push(key.name);
        }
      } catch (error) {
        console.error(`Error checking idempotency record ${key.name}:`, error);
        // Add to deletion list if we can't read it
        keysToDelete.push(key.name);
      }
    }
    
    // Delete old records in batches
    const batchSize = 100;
    for (let i = 0; i < keysToDelete.length; i += batchSize) {
      const batch = keysToDelete.slice(i, i + batchSize);
      const deletePromises = batch.map(key => timeseriesKV.delete(key));
      await Promise.allSettled(deletePromises);
    }
    
    console.log(`Cleaned up ${keysToDelete.length} old idempotency records`);
    return keysToDelete.length;

  } catch (error) {
    console.error('Error cleaning up idempotency records:', error);
    throw error;
  }
}

/**
 * Get idempotency statistics for monitoring
 */
export async function getIdempotencyStats(timeseriesKV) {
  try {
    const listResult = await timeseriesKV.list({ prefix: 'idempotency:' });
    
    const stats = {
      total_records: listResult.keys.length,
      oldest_record: null,
      newest_record: null,
      records_by_kpi: {}
    };
    
    let oldestDate = null;
    let newestDate = null;
    
    for (const key of listResult.keys.slice(0, 100)) { // Sample first 100 for performance
      try {
        const record = await timeseriesKV.get(key.name, 'json');
        if (record) {
          const processedDate = new Date(record.processedAt);
          
          if (!oldestDate || processedDate < oldestDate) {
            oldestDate = processedDate;
            stats.oldest_record = record.processedAt;
          }
          
          if (!newestDate || processedDate > newestDate) {
            newestDate = processedDate;
            stats.newest_record = record.processedAt;
          }
          
          // Count by KPI
          const kpiId = record.kpiId;
          stats.records_by_kpi[kpiId] = (stats.records_by_kpi[kpiId] || 0) + 1;
        }
      } catch (error) {
        console.error(`Error reading idempotency record ${key.name}:`, error);
      }
    }
    
    return stats;

  } catch (error) {
    console.error('Error getting idempotency stats:', error);
    throw error;
  }
}