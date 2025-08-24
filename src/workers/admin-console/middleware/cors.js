/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing for the Admin Console
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // In production, specify your domain
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, CF-Access-Jwt-Assertion',
  'Access-Control-Max-Age': '86400' // 24 hours
};

/**
 * Handles CORS preflight requests and adds CORS headers
 * @param {Request} request - The incoming request
 * @returns {Response|null} CORS response for OPTIONS requests, null otherwise
 */
export function corsMiddleware(request) {
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS
    });
  }

  return null; // Let the request continue
}

/**
 * Adds CORS headers to a response
 * @param {Response} response - The response to add headers to
 * @returns {Response} Response with CORS headers added
 */
export function addCorsHeaders(response) {
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });

  // Add CORS headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  return newResponse;
}