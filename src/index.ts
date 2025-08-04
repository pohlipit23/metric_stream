/**
 * Daily Index Tracker - Main Entry Point
 * 
 * This is the main entry point for the Cloudflare Worker.
 * It handles routing and delegates to appropriate handlers.
 */

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Basic health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: env.ENVIRONMENT || 'unknown'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Default response for unhandled routes
    return new Response(JSON.stringify({
      error: 'Not Found',
      message: 'The requested endpoint was not found'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};

// Environment interface for TypeScript
interface Env {
  // KV Store
  KV_STORE: KVNamespace;
  
  // Queues
  DATA_COLLECTION_QUEUE: Queue;
  CHART_GENERATION_QUEUE: Queue;
  LLM_ANALYSIS_QUEUE: Queue;
  PACKAGING_QUEUE: Queue;
  DELIVERY_QUEUE: Queue;
  
  // Environment variables
  ENVIRONMENT?: string;
  LOG_LEVEL?: string;
  
  // Secrets (accessed via env.SECRET_NAME)
  OPENAI_API_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  CHART_IMG_API_KEY?: string;
  SMTP_PASSWORD?: string;
  DISCORD_WEBHOOK_URL?: string;
  SLACK_WEBHOOK_URL?: string;
}