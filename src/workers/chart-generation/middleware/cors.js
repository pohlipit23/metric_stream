/**
 * CORS Middleware for Chart Generation Worker
 */

/**
 * Handle CORS preflight and add CORS headers
 * @param {Request} request - The incoming request
 * @returns {Response|null} - CORS response or null to continue
 */
export function corsMiddleware(request) {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400', // 24 hours
      }
    });
  }

  // For non-preflight requests, return null to continue processing
  return null;
}

/**
 * Add CORS headers to response
 * @param {Response} response - The response to modify
 * @returns {Response} - Response with CORS headers
 */
export function addCorsHeaders(response) {
  const newHeaders = new Headers(response.headers);
  
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}