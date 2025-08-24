/**
 * Health Check Handler
 * 
 * Provides health status for the Orchestration Worker
 */

export async function handleHealth(request, env, ctx) {
  try {
    // Basic health check - verify KV store connectivity
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      worker: 'orchestration-worker',
      version: '1.0.0'
    };

    // Test KV store connectivity
    try {
      await env.JOBS_KV.get('health:test');
      await env.CONFIG_KV.get('health:test');
      healthCheck.kvStore = 'connected';
    } catch (error) {
      healthCheck.kvStore = 'error';
      healthCheck.kvError = error.message;
      healthCheck.status = 'degraded';
    }

    // Test queue connectivity
    try {
      // Just check if queue binding exists
      if (env.LLM_ANALYSIS_QUEUE) {
        healthCheck.queue = 'connected';
      } else {
        healthCheck.queue = 'not_configured';
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.queue = 'error';
      healthCheck.queueError = error.message;
      healthCheck.status = 'degraded';
    }

    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    
    return new Response(JSON.stringify(healthCheck, null, 2), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    }, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}