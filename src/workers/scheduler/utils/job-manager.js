/**
 * Job Management Utility
 * 
 * Handles job record creation and management in Cloudflare KV.
 * Creates job records with unique trace_id and initializes KPI status tracking.
 */

export async function createJobRecord(env, traceId, activeKPIs, timestamp) {
  try {
    // Initialize KPI status map
    const kpiStatusMap = {};
    activeKPIs.forEach(kpi => {
      kpiStatusMap[kpi.id] = {
        kpiId: kpi.id,
        status: 'pending',
        completedAt: null,
        error: null,
        retryCount: 0
      };
    });

    // Create job record
    const jobRecord = {
      traceId,
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
      kpis: kpiStatusMap,
      metadata: {
        totalKPIs: activeKPIs.length,
        completedKPIs: 0,
        failedKPIs: 0,
        environment: env.ENVIRONMENT || 'development'
      }
    };

    // Store job record in KV
    const jobKey = `job:${traceId}`;
    await env.JOBS_KV.put(jobKey, JSON.stringify(jobRecord));

    // Update last job trace ID for health checks
    await env.JOBS_KV.put('last-job-trace-id', traceId);

    console.log(`Job Manager: Created job record ${traceId} with ${activeKPIs.length} KPIs`);
    return true;

  } catch (error) {
    console.error('Job Manager: Error creating job record:', error);
    return false;
  }
}

export async function getJobRecord(env, traceId) {
  try {
    const jobKey = `job:${traceId}`;
    const jobData = await env.JOBS_KV.get(jobKey);
    
    if (!jobData) {
      return null;
    }

    return JSON.parse(jobData);
  } catch (error) {
    console.error(`Job Manager: Error retrieving job record ${traceId}:`, error);
    return null;
  }
}

export async function updateJobStatus(env, traceId, status, metadata = {}) {
  try {
    const jobRecord = await getJobRecord(env, traceId);
    if (!jobRecord) {
      console.error(`Job Manager: Job record ${traceId} not found for status update`);
      return false;
    }

    // Update job status and timestamp
    jobRecord.status = status;
    jobRecord.updatedAt = new Date().toISOString();
    
    // Merge additional metadata
    jobRecord.metadata = { ...jobRecord.metadata, ...metadata };

    // Store updated record
    const jobKey = `job:${traceId}`;
    await env.JOBS_KV.put(jobKey, JSON.stringify(jobRecord));

    console.log(`Job Manager: Updated job ${traceId} status to ${status}`);
    return true;

  } catch (error) {
    console.error(`Job Manager: Error updating job status for ${traceId}:`, error);
    return false;
  }
}

export async function updateKPIStatus(env, traceId, kpiId, status, error = null) {
  try {
    const jobRecord = await getJobRecord(env, traceId);
    if (!jobRecord) {
      console.error(`Job Manager: Job record ${traceId} not found for KPI status update`);
      return false;
    }

    // Update KPI status
    if (jobRecord.kpis[kpiId]) {
      jobRecord.kpis[kpiId].status = status;
      jobRecord.kpis[kpiId].completedAt = new Date().toISOString();
      
      if (error) {
        jobRecord.kpis[kpiId].error = error;
        jobRecord.kpis[kpiId].retryCount = (jobRecord.kpis[kpiId].retryCount || 0) + 1;
      }
    }

    // Update job metadata counters
    const kpiStatuses = Object.values(jobRecord.kpis);
    jobRecord.metadata.completedKPIs = kpiStatuses.filter(k => k.status === 'completed').length;
    jobRecord.metadata.failedKPIs = kpiStatuses.filter(k => k.status === 'failed').length;

    // Update job timestamp
    jobRecord.updatedAt = new Date().toISOString();

    // Store updated record
    const jobKey = `job:${traceId}`;
    await env.JOBS_KV.put(jobKey, JSON.stringify(jobRecord));

    console.log(`Job Manager: Updated KPI ${kpiId} status to ${status} for job ${traceId}`);
    return true;

  } catch (error) {
    console.error(`Job Manager: Error updating KPI status for ${traceId}/${kpiId}:`, error);
    return false;
  }
}