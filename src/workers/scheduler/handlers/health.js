/**
 * Health Check Handler
 * 
 * Provides health status for the Scheduler Worker including:
 * - Worker status
 * - KV store connectivity
 * - Last job execution status
 */

export async function handleHealth(request, env, ctx) {
  const startTime = Date.now();
  
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      worker: 'scheduler-worker',
      version: '1.0.0'
    };

    // Test KV connectivity
    try {
      // Test JOBS_KV connectivity
      await env.JOBS_KV.get('health-check');
      health.kvStores = {
        jobs: 'connected',
        config: 'connected'
      };

      // Test CONFIG_KV connectivity
      await env.CONFIG_KV.get('health-check');
    } catch (kvError) {
      console.warn('Health check: KV connectivity issue:', kvError);
      health.kvStores = {
        jobs: 'error',
        config: 'error'
      };
      health.warnings = ['KV store connectivity issues'];
    }

    // Get last job execution info if available
    try {
      const lastJobKey = await env.JOBS_KV.get('last-job-trace-id');
      if (lastJobKey) {
        const lastJob = await env.JOBS_KV.get(`job:${lastJobKey}`);
        if (lastJob) {
          const jobData = JSON.parse(lastJob);
          health.lastJob = {
            traceId: jobData.traceId,
            status: jobData.status,
            createdAt: jobData.createdAt,
            kpiCount: Object.keys(jobData.kpis).length
          };
        }
      }
    } catch (jobError) {
      console.warn('Health check: Could not retrieve last job info:', jobError);
    }

    // Calculate response time
    health.responseTime = Date.now() - startTime;

    return new Response(JSON.stringify(health, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      worker: 'scheduler-worker',
      error: error.message,
      responseTime: Date.now() - startTime
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
}