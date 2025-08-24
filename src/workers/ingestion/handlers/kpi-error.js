/**
 * KPI Error handler for error notifications from N8N workflows
 */

export async function handleKPIError(request, env, ctx) {
  try {
    // Parse request body
    const requestData = await request.json();
    console.log('Received KPI error:', JSON.stringify(requestData, null, 2));

    // Validate required fields
    if (!requestData.traceId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'traceId is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!requestData.error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'error field is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse error data with flexible structure
    const errorUpdate = {
      trace_id: requestData.traceId,
      error: requestData.error,
      timestamp: requestData.timestamp || new Date().toISOString(),
      kpi_id: requestData.kpiId || null,
      kpi_ids: requestData.kpiIds || null,
      retry_count: requestData.retryCount || 0,
      component: requestData.component || 'n8n-workflow',
      workflow_id: requestData.workflowId || null,
      execution_id: requestData.executionId || null
    };

    // Process the error update
    await processKPIError(errorUpdate, env);

    return new Response(JSON.stringify({
      success: true,
      message: 'Error recorded successfully',
      trace_id: errorUpdate.trace_id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('KPI error handler error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Process KPI error by updating job status and logging error details
 */
async function processKPIError(errorUpdate, env) {
  // 1. Update job status with error information
  await updateJobStatusWithError(errorUpdate, env.JOBS_KV);
  
  // 2. Log error details for debugging
  await logErrorDetails(errorUpdate, env.JOBS_KV);
}

/**
 * Update job status with error information
 */
async function updateJobStatusWithError(errorUpdate, jobsKV) {
  const key = `job:${errorUpdate.trace_id}`;
  
  try {
    // Get existing job status
    const existingJob = await jobsKV.get(key, 'json');
    
    if (!existingJob) {
      console.warn(`Job ${errorUpdate.trace_id} not found, creating new job status with error`);
      // Create new job status if it doesn't exist
      const newJob = {
        traceId: errorUpdate.trace_id,
        status: 'failed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        kpis: {},
        metadata: {
          source: 'ingestion-worker',
          hasErrors: true
        }
      };
      
      // Handle single or multiple KPI errors
      const kpiIds = errorUpdate.kpi_ids || (errorUpdate.kpi_id ? [errorUpdate.kpi_id] : ['unknown']);
      
      for (const kpiId of kpiIds) {
        newJob.kpis[kpiId] = {
          kpiId: kpiId,
          status: 'failed',
          completedAt: null,
          error: extractErrorMessage(errorUpdate.error),
          retryCount: errorUpdate.retry_count || 0
        };
      }
      
      await jobsKV.put(key, JSON.stringify(newJob));
      console.log(`Created new job status with error: ${key}`);
      return;
    }

    // Update existing job
    existingJob.updatedAt = new Date().toISOString();
    existingJob.metadata = existingJob.metadata || {};
    existingJob.metadata.hasErrors = true;
    
    // Handle single or multiple KPI errors
    const kpiIds = errorUpdate.kpi_ids || (errorUpdate.kpi_id ? [errorUpdate.kpi_id] : ['unknown']);
    
    for (const kpiId of kpiIds) {
      existingJob.kpis[kpiId] = {
        kpiId: kpiId,
        status: 'failed',
        completedAt: null,
        error: extractErrorMessage(errorUpdate.error),
        retryCount: errorUpdate.retry_count || 0
      };
    }

    // Update overall job status
    const kpiStatuses = Object.values(existingJob.kpis);
    const completedKPIs = kpiStatuses.filter(kpi => kpi.status === 'completed');
    const failedKPIs = kpiStatuses.filter(kpi => kpi.status === 'failed');
    
    if (completedKPIs.length + failedKPIs.length === kpiStatuses.length) {
      // All KPIs are done (either completed or failed)
      if (failedKPIs.length === 0) {
        existingJob.status = 'completed';
      } else if (completedKPIs.length > 0) {
        existingJob.status = 'partial';
      } else {
        existingJob.status = 'failed';
      }
    }

    await jobsKV.put(key, JSON.stringify(existingJob));
    console.log(`Updated job status with error: ${key}, KPIs: ${kpiIds.join(', ')}`);

  } catch (error) {
    console.error(`Error updating job status with error for ${errorUpdate.trace_id}:`, error);
    throw new Error(`Failed to update job status with error: ${error.message}`);
  }
}

/**
 * Log detailed error information for debugging
 */
async function logErrorDetails(errorUpdate, jobsKV) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `error-log:${errorUpdate.trace_id}:${timestamp}`;
  
  try {
    const errorLog = {
      traceId: errorUpdate.trace_id,
      timestamp: errorUpdate.timestamp,
      kpiId: errorUpdate.kpi_id,
      kpiIds: errorUpdate.kpi_ids,
      component: errorUpdate.component,
      workflowId: errorUpdate.workflow_id,
      executionId: errorUpdate.execution_id,
      retryCount: errorUpdate.retry_count,
      error: errorUpdate.error,
      errorMessage: extractErrorMessage(errorUpdate.error),
      errorCode: extractErrorCode(errorUpdate.error),
      errorType: extractErrorType(errorUpdate.error),
      loggedAt: new Date().toISOString()
    };

    // Store error log with TTL (30 days)
    await jobsKV.put(key, JSON.stringify(errorLog), { expirationTtl: 30 * 24 * 60 * 60 });
    console.log(`Logged error details: ${key}`);

  } catch (error) {
    console.error(`Error logging error details for ${errorUpdate.trace_id}:`, error);
    // Don't throw here as this is just logging
  }
}

/**
 * Extract human-readable error message from flexible error structure
 */
function extractErrorMessage(error) {
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null) {
    // Try common error message fields
    return (
      error.message || 
      error.error || 
      error.description ||
      error.msg ||
      JSON.stringify(error)
    );
  }
  
  return String(error);
}

/**
 * Extract error code from flexible error structure
 */
function extractErrorCode(error) {
  if (typeof error === 'object' && error !== null) {
    return (
      error.code ||
      error.errorCode ||
      error.status ||
      error.statusCode
    );
  }
  return null;
}

/**
 * Extract error type from flexible error structure
 */
function extractErrorType(error) {
  if (typeof error === 'object' && error !== null) {
    return (
      error.name ||
      error.type ||
      error.errorType ||
      error.category
    );
  }
  return null;
}