/**
 * Authentication Middleware
 * Validates Cloudflare Access JWT tokens
 */

/**
 * Validates Cloudflare Access authentication
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @returns {Object} Authentication result with success status and user info
 */
export async function validateCloudflareAccess(request, env) {
  try {
    // Development mode bypass
    if (env.ENVIRONMENT === 'development' || env.NODE_ENV === 'development' || !env.CF_ACCESS_DOMAIN) {
      console.log('Development mode: bypassing Cloudflare Access authentication');
      return {
        success: true,
        user: {
          id: 'dev-user',
          email: 'dev@example.com',
          name: 'Development User'
        }
      };
    }

    // Get the JWT token from Cloudflare Access header
    const cfAccessJwt = request.headers.get('CF-Access-Jwt-Assertion');
    
    if (!cfAccessJwt) {
      return {
        success: false,
        error: 'Missing Cloudflare Access JWT token'
      };
    }

    // In a real implementation, you would verify the JWT signature
    // using the Cloudflare Access public key and validate claims
    // For now, we'll do basic validation
    
    try {
      // Decode JWT payload (without verification for demo)
      const payload = JSON.parse(atob(cfAccessJwt.split('.')[1]));
      
      // Basic validation
      if (!payload.email || !payload.sub) {
        return {
          success: false,
          error: 'Invalid JWT payload'
        };
      }

      // Check token expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return {
          success: false,
          error: 'JWT token expired'
        };
      }

      return {
        success: true,
        user: {
          id: payload.sub,
          email: payload.email,
          name: payload.name || payload.email
        }
      };

    } catch (jwtError) {
      return {
        success: false,
        error: 'Invalid JWT format'
      };
    }

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication validation failed'
    };
  }
}

/**
 * Alternative API key authentication for development/testing
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @returns {Object} Authentication result
 */
export async function validateApiKey(request, env) {
  try {
    const apiKey = request.headers.get('X-API-Key') || 
                   request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return {
        success: false,
        error: 'Missing API key'
      };
    }

    // Compare with stored API key
    if (apiKey !== env.ADMIN_API_KEY) {
      return {
        success: false,
        error: 'Invalid API key'
      };
    }

    return {
      success: true,
      user: {
        id: 'api-user',
        email: 'api@system.local',
        name: 'API User'
      }
    };

  } catch (error) {
    console.error('API key validation error:', error);
    return {
      success: false,
      error: 'API key validation failed'
    };
  }
}