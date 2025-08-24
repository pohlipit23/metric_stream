/**
 * Authentication Middleware for Chart Generation Worker
 */

/**
 * Validate API key authentication
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment bindings
 * @returns {Object} - Authentication result
 */
export async function authMiddleware(request, env) {
  try {
    // Get API key from headers
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') ||
                   request.headers.get('X-API-Key');

    if (!apiKey) {
      return {
        success: false,
        error: 'API key required'
      };
    }

    // Validate API key
    const validApiKey = env.CHART_API_KEY;
    if (!validApiKey) {
      console.error('CHART_API_KEY not configured');
      return {
        success: false,
        error: 'Authentication not configured'
      };
    }

    if (apiKey !== validApiKey) {
      return {
        success: false,
        error: 'Invalid API key'
      };
    }

    return {
      success: true,
      apiKey: apiKey
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Validate request rate limiting (optional)
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment bindings
 * @returns {Object} - Rate limit result
 */
export async function rateLimitMiddleware(request, env) {
  try {
    // Get client identifier (IP or API key)
    const clientId = request.headers.get('CF-Connecting-IP') || 
                     request.headers.get('X-API-Key') || 
                     'unknown';

    const rateLimitKey = `rate_limit:${clientId}`;
    const windowSize = 60; // 1 minute window
    const maxRequests = 100; // 100 requests per minute

    // Get current count
    const currentCount = await env.CHARTS_KV.get(rateLimitKey);
    const count = currentCount ? parseInt(currentCount) : 0;

    if (count >= maxRequests) {
      return {
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: windowSize
      };
    }

    // Increment counter
    await env.CHARTS_KV.put(rateLimitKey, (count + 1).toString(), {
      expirationTtl: windowSize
    });

    return {
      success: true,
      remaining: maxRequests - count - 1
    };

  } catch (error) {
    console.error('Rate limiting error:', error);
    // Don't block requests if rate limiting fails
    return { success: true };
  }
}