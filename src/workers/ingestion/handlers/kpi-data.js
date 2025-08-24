/**
 * KPI Data handler for successful KPI data updates from N8N workflows
 */

import { parseKPIPayload } from '../utils/parsers.js';
import { checkIdempotency, recordIdempotency } from '../utils/idempotency.js';

export async function handleKPIData(request, env, ctx) {
  try {
    // Parse request body
    const requestData = await request.json();
    console.log('Received KPI data:', JSON.stringify(requestData, null, 2));

    // Parse and validate the payload using flexible parsing
    const parsedData = parseKPIPayload(requestData);
    
    // Handle multi-KPI responses by converting to individual updates
    const kpiUpdates = Array.isArray(parsedData) ? parsedData : [parsedData];
    
    const results = [];
    
    for (const kpiUpdate of kpiUpdates) {
      try {
        // Check idempotency to prevent duplicate processing
        const isDuplicate = await checkIdempotency(
          env.TIMESERIES_KV, 
          kpiUpdate.kpi_id, 
          kpiUpdate.timestamp
        );
        
        if (isDuplicate) {
          console.log(`Duplicate data point detected for KPI ${kpiUpdate.kpi_id} at ${kpiUpdate.timestamp}`);
          results.push({
            kpi_id: kpiUpdate.kpi_id,
            status: 'skipped',
            reason: 'duplicate_timestamp'
          });
          continue;
        }

        // Process the KPI update
        await processKPIUpdate(kpiUpdate, env);
        
        // Record idempotency after successful processing
        await recordIdempotency(
          env.TIMESERIES_KV, 
          kpiUpdate.kpi_id, 
          kpiUpdate.timestamp
        );

        results.push({
          kpi_id: kpiUpdate.kpi_id,
          status: 'processed',
          timestamp: kpiUpdate.timestamp
        });

      } catch (error) {
        console.error(`Error processing KPI ${kpiUpdate.kpi_id}:`, error);
        results.push({
          kpi_id: kpiUpdate.kpi_id,
          status: 'error',
          error: error.message
        });
      }
    }

    // Return processing results
    return new Response(JSON.stringify({
      success: true,
      processed: results.filter(r => r.status === 'processed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      results: results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('KPI data handler error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Process a single KPI update by updating time series, creating package, and updating job status
 */
async function processKPIUpdate(kpiUpdate, env) {
  console.log(`🔄 Processing KPI update for ${kpiUpdate.kpi_id}`);
  console.log(`   Trace ID: ${kpiUpdate.trace_id}`);
  console.log(`   Timestamp: ${kpiUpdate.timestamp}`);
  console.log(`   KPI Type: ${kpiUpdate.kpi_type}`);
  console.log(`   Data:`, JSON.stringify(kpiUpdate.data));
  
  try {
    // 1. Update time series data
    console.log(`📈 Step 1: Updating time series for ${kpiUpdate.kpi_id}`);
    await updateTimeSeries(kpiUpdate, env.TIMESERIES_KV);
    console.log(`✅ Step 1: Time series updated successfully`);
    
    // 2. Create KPI package
    console.log(`📦 Step 2: Creating KPI package for ${kpiUpdate.kpi_id}`);
    await createKPIPackage(kpiUpdate, env.PACKAGES_KV);
    console.log(`✅ Step 2: KPI package created successfully`);
    
    // 3. Update job status
    console.log(`🗂️  Step 3: Updating job status for ${kpiUpdate.kpi_id}`);
    await updateJobStatus(kpiUpdate, env.JOBS_KV);
    console.log(`✅ Step 3: Job status updated successfully`);
    
    console.log(`🎉 All steps completed for ${kpiUpdate.kpi_id}`);
    
  } catch (error) {
    console.error(`❌ Error in processKPIUpdate for ${kpiUpdate.kpi_id}:`, error);
    throw error;
  }
}

/**
 * Update time series data in KV store
 */
async function updateTimeSeries(kpiUpdate, timeseriesKV) {
  const key = `timeseries:${kpiUpdate.kpi_id}`;
  
  try {
    console.log(`📈 updateTimeSeries: Starting for key: ${key}`);
    console.log(`📈 updateTimeSeries: KV binding available:`, !!timeseriesKV);
    
    // Get existing time series data
    console.log(`📈 updateTimeSeries: Getting existing data...`);
    const existingData = await timeseriesKV.get(key, 'json');
    console.log(`📈 updateTimeSeries: Existing data found:`, !!existingData);
    
    let timeSeriesData;
    if (existingData) {
      timeSeriesData = existingData;
      console.log(`📈 updateTimeSeries: Using existing data with ${existingData.dataPoints?.length || 0} points`);
    } else {
      // Initialize new time series
      timeSeriesData = {
        kpiId: kpiUpdate.kpi_id,
        kpiType: kpiUpdate.kpi_type,
        dataPoints: [],
        lastUpdated: new Date().toISOString(),
        metadata: {
          created: new Date().toISOString(),
          totalPoints: 0
        }
      };
      console.log(`📈 updateTimeSeries: Created new time series structure`);
    }

    // Create new data point
    const primaryValue = extractPrimaryValue(kpiUpdate.data);
    console.log(`📈 updateTimeSeries: Extracted primary value: ${primaryValue}`);
    
    const newDataPoint = {
      timestamp: kpiUpdate.timestamp,
      value: primaryValue,
      metadata: {
        kpiType: kpiUpdate.kpi_type,
        originalData: kpiUpdate.data,
        chart: kpiUpdate.chart || null
      }
    };
    console.log(`📈 updateTimeSeries: Created new data point:`, JSON.stringify(newDataPoint));

    // Append new data point
    timeSeriesData.dataPoints.push(newDataPoint);
    timeSeriesData.lastUpdated = new Date().toISOString();
    timeSeriesData.metadata.totalPoints = timeSeriesData.dataPoints.length;

    // Sort data points by timestamp to maintain chronological order
    timeSeriesData.dataPoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    console.log(`📈 updateTimeSeries: Updated data structure, total points: ${timeSeriesData.dataPoints.length}`);

    // Store updated time series
    console.log(`📈 updateTimeSeries: Storing data to KV...`);
    const jsonData = JSON.stringify(timeSeriesData);
    console.log(`📈 updateTimeSeries: JSON data size: ${jsonData.length} characters`);
    
    await timeseriesKV.put(key, jsonData);
    console.log(`📈 updateTimeSeries: KV put operation completed successfully`);
    
    // Verify the data was stored
    console.log(`📈 updateTimeSeries: Verifying storage...`);
    const verifyData = await timeseriesKV.get(key, 'json');
    console.log(`📈 updateTimeSeries: Verification result:`, !!verifyData);
    if (verifyData) {
      console.log(`📈 updateTimeSeries: Verified ${verifyData.dataPoints?.length || 0} data points stored`);
    }
    
    console.log(`✅ Updated time series for KPI ${kpiUpdate.kpi_id}, total points: ${timeSeriesData.dataPoints.length}`);

  } catch (error) {
    console.error(`❌ Error updating time series for KPI ${kpiUpdate.kpi_id}:`, error);
    console.error(`❌ Error stack:`, error.stack);
    throw new Error(`Failed to update time series: ${error.message}`);
  }
}

/**
 * Create KPI package in KV store
 */
async function createKPIPackage(kpiUpdate, packagesKV) {
  const key = `package:${kpiUpdate.trace_id}:${kpiUpdate.kpi_id}`;
  
  try {
    console.log(`📦 createKPIPackage: Starting for key: ${key}`);
    console.log(`📦 createKPIPackage: KV binding available:`, !!packagesKV);
    
    const kpiPackage = {
      traceId: kpiUpdate.trace_id,
      kpiId: kpiUpdate.kpi_id,
      timestamp: kpiUpdate.timestamp,
      kpiType: kpiUpdate.kpi_type,
      data: kpiUpdate.data,
      metadata: {
        createdAt: new Date().toISOString(),
        source: 'n8n-workflow',
        ...(kpiUpdate.metadata || {})
      },
      chart: kpiUpdate.chart || null,
      analysis: null // Will be populated by LLM analysis workflow
    };
    
    console.log(`📦 createKPIPackage: Created package structure:`, JSON.stringify(kpiPackage, null, 2));

    console.log(`📦 createKPIPackage: Storing package to KV...`);
    await packagesKV.put(key, JSON.stringify(kpiPackage));
    console.log(`📦 createKPIPackage: KV put operation completed`);
    
    // Verify the package was stored
    console.log(`📦 createKPIPackage: Verifying storage...`);
    const verifyPackage = await packagesKV.get(key, 'json');
    console.log(`📦 createKPIPackage: Verification result:`, !!verifyPackage);
    
    console.log(`✅ Created KPI package: ${key}`);

  } catch (error) {
    console.error(`❌ Error creating KPI package for ${kpiUpdate.kpi_id}:`, error);
    console.error(`❌ Error stack:`, error.stack);
    throw new Error(`Failed to create KPI package: ${error.message}`);
  }
}

/**
 * Update job status tracking in KV store
 */
async function updateJobStatus(kpiUpdate, jobsKV) {
  const key = `job:${kpiUpdate.trace_id}`;
  
  try {
    console.log(`🗂️  updateJobStatus: Starting for key: ${key}`);
    console.log(`🗂️  updateJobStatus: KV binding available:`, !!jobsKV);
    
    // Get existing job status
    console.log(`🗂️  updateJobStatus: Getting existing job...`);
    const existingJob = await jobsKV.get(key, 'json');
    console.log(`🗂️  updateJobStatus: Existing job found:`, !!existingJob);
    
    if (!existingJob) {
      console.log(`🗂️  updateJobStatus: Job ${kpiUpdate.trace_id} not found, creating new job status`);
      // Create new job status if it doesn't exist
      const newJob = {
        traceId: kpiUpdate.trace_id,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        kpis: {},
        metadata: {
          source: 'ingestion-worker'
        }
      };
      
      newJob.kpis[kpiUpdate.kpi_id] = {
        kpiId: kpiUpdate.kpi_id,
        status: 'completed',
        completedAt: new Date().toISOString(),
        error: null,
        retryCount: 0
      };
      
      console.log(`🗂️  updateJobStatus: Created new job structure:`, JSON.stringify(newJob, null, 2));
      console.log(`🗂️  updateJobStatus: Storing new job to KV...`);
      await jobsKV.put(key, JSON.stringify(newJob));
      console.log(`🗂️  updateJobStatus: New job stored successfully`);
      
      // Verify the job was stored
      console.log(`🗂️  updateJobStatus: Verifying new job storage...`);
      const verifyJob = await jobsKV.get(key, 'json');
      console.log(`🗂️  updateJobStatus: New job verification result:`, !!verifyJob);
      
      console.log(`✅ Created new job status: ${key}`);
      return;
    }

    console.log(`🗂️  updateJobStatus: Updating existing job with ${Object.keys(existingJob.kpis || {}).length} existing KPIs`);
    
    // Update existing job
    existingJob.updatedAt = new Date().toISOString();
    
    // Update KPI status
    existingJob.kpis[kpiUpdate.kpi_id] = {
      kpiId: kpiUpdate.kpi_id,
      status: 'completed',
      completedAt: new Date().toISOString(),
      error: null,
      retryCount: 0
    };

    console.log(`🗂️  updateJobStatus: Updated KPI status for ${kpiUpdate.kpi_id}`);

    // Check if all KPIs are completed
    const kpiStatuses = Object.values(existingJob.kpis);
    const completedKPIs = kpiStatuses.filter(kpi => kpi.status === 'completed');
    const failedKPIs = kpiStatuses.filter(kpi => kpi.status === 'failed');
    
    console.log(`🗂️  updateJobStatus: KPI status summary - Completed: ${completedKPIs.length}, Failed: ${failedKPIs.length}, Total: ${kpiStatuses.length}`);
    
    if (completedKPIs.length + failedKPIs.length === kpiStatuses.length) {
      // All KPIs are done (either completed or failed)
      if (failedKPIs.length === 0) {
        existingJob.status = 'completed';
      } else if (completedKPIs.length > 0) {
        existingJob.status = 'partial';
      } else {
        existingJob.status = 'failed';
      }
      console.log(`🗂️  updateJobStatus: Updated overall job status to: ${existingJob.status}`);
    }

    console.log(`🗂️  updateJobStatus: Storing updated job to KV...`);
    await jobsKV.put(key, JSON.stringify(existingJob));
    console.log(`🗂️  updateJobStatus: Updated job stored successfully`);
    
    // Verify the job was updated
    console.log(`🗂️  updateJobStatus: Verifying updated job storage...`);
    const verifyUpdatedJob = await jobsKV.get(key, 'json');
    console.log(`🗂️  updateJobStatus: Updated job verification result:`, !!verifyUpdatedJob);
    if (verifyUpdatedJob) {
      console.log(`🗂️  updateJobStatus: Verified job has ${Object.keys(verifyUpdatedJob.kpis || {}).length} KPIs`);
    }

    console.log(`✅ Updated job status: ${key}, KPI ${kpiUpdate.kpi_id} completed`);

  } catch (error) {
    console.error(`❌ Error updating job status for ${kpiUpdate.trace_id}:`, error);
    console.error(`❌ Error stack:`, error.stack);
    throw new Error(`Failed to update job status: ${error.message}`);
  }
}

/**
 * Extract primary value from flexible KPI data structure
 */
function extractPrimaryValue(data) {
  if (typeof data === 'number') {
    return data;
  }
  
  if (typeof data === 'object' && data !== null) {
    // Try common value fields
    if ('value' in data) return data.value;
    if ('price' in data) return data.price;
    if ('amount' in data) return data.amount;
    if ('count' in data) return data.count;
    if ('percentage' in data) return data.percentage;
    if ('ratio' in data) return data.ratio;
    
    // If no common field found, return the first numeric value
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'number') {
        return value;
      }
    }
  }
  
  // Fallback: try to convert to number
  const numValue = Number(data);
  return isNaN(numValue) ? 0 : numValue;
}