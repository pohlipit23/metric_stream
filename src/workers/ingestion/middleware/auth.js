/**
 * Authentication middleware for the Ingestion Worker
 */

export async function authMiddleware(request, env) {
  try {
    // Get API key from headers
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return {
        success: false,
        error: 'Missing API key. Provide X-API-Key header or Authorization Bearer token.'
      };
    }

    // Validate against stored API key
    const validApiKey = env.INGESTION_API_KEY;
    if (!validApiKey) {
      console.error('INGESTION_API_KEY not configured in environment');
      return {
        success: false,
        error: 'Server configuration error'
      };
    }

    if (apiKey !== validApiKey) {
      return {
        success: false,
        error: 'Invalid API key'
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Validate N8N webhook signature (optional additional security)
 */
export async function validateN8NWebhook(request, env) {
  try {
    const signature = request.headers.get('X-N8N-Signature');
    const webhookSecret = env.N8N_WEBHOOK_SECRET;
    
    if (!signature || !webhookSecret) {
      // If no signature or secret configured, skip validation
      return { success: true };
    }

    // Get request body for signature validation
    const body = await request.text();
    
    // Create expected signature
    const crypto = globalThis.crypto || require('crypto');
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== expectedSignature) {
      return {
        success: false,
        error: 'Invalid webhook signature'
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Webhook validation error:', error);
    return {
      success: false,
      error: 'Webhook validation failed'
    };
  }
}