/**
 * Chart Generation Worker
 * Handles chart generation for KPIs with support for multiple chart types and formats
 */

import { handleChartGenerate } from './handlers/chart-generate.js';
import { handleChartBatch } from './handlers/chart-batch.js';
import { handleChartRetrieve } from './handlers/chart-retrieve.js';
import { handleHealth } from './handlers/health.js';
import { corsMiddleware } from './middleware/cors.js';
import { authMiddleware } from './middleware/auth.js';

export default {
  async fetch(request, env, ctx) {
    try {
      // Apply CORS middleware
      const corsResponse = corsMiddleware(request);
      if (corsResponse) return corsResponse;

      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // Health check endpoint (no auth required)
      if (path === '/api/charts/health' && method === 'GET') {
        return handleHealth(request, env);
      }

      // Apply authentication middleware for all other endpoints
      const authResult = await authMiddleware(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ error: authResult.error }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Route handling
      if (path === '/api/charts/generate' && method === 'POST') {
        return handleChartGenerate(request, env, ctx);
      }

      if (path === '/api/charts/batch' && method === 'POST') {
        return handleChartBatch(request, env, ctx);
      }

      if (path.startsWith('/api/charts/') && method === 'GET') {
        const chartId = path.split('/').pop();
        return handleChartRetrieve(chartId, env);
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Chart Generation Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};