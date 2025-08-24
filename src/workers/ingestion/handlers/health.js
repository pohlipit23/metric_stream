/**
 * Health check handler for the Ingestion Worker
 */

export async function handleHealth(request, env, ctx) {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ingestion-worker',
      version: '1.0.0',
      environment: env.ENVIRONMENT || 'unknown'
    };

    // Test KV namespace connectivity
    try {
      await env.TIMESERIES_KV.get('health-check');
      health.kv_timeseries = 'connected';
    } catch (error) {
      health.kv_timeseries = 'error';
      health.status = 'degraded';
    }

    try {
      await env.JOBS_KV.get('health-check');
      health.kv_jobs = 'connected';
    } catch (error) {
      health.kv_jobs = 'error';
      health.status = 'degraded';
    }

    try {
      await env.PACKAGES_KV.get('health-check');
      health.kv_packages = 'connected';
    } catch (error) {
      health.kv_packages = 'error';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return new Response(JSON.stringify(health), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Health check error:', error);
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}