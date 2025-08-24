/**
 * Health Check Handler
 * Provides system health status for monitoring
 */

export async function handleHealthEndpoint(request, env) {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'admin-console-worker',
      version: '1.0.0'
    };

    // Test KV store connectivity
    try {
      await env.KV_STORE.get('health-check');
      health.kvStore = 'connected';
    } catch (error) {
      health.kvStore = 'error';
      health.kvError = error.message;
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return new Response(JSON.stringify(health), {
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
      service: 'admin-console-worker',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}