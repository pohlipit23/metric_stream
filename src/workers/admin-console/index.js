/**
 * Admin Console Worker - Main Entry Point
 * Handles API endpoints for KPI registry management and system configuration
 */

import { handleKPIEndpoints } from './handlers/kpi-registry.js';
import { handleConfigEndpoints } from './handlers/config.js';
import { handleWorkflowEndpoints } from './handlers/workflow.js';
import { handleHealthEndpoint } from './handlers/health.js';
import { validateCloudflareAccess } from './middleware/auth.js';
import { corsMiddleware } from './middleware/cors.js';

export default {
  async fetch(request, env, ctx) {
    try {
      // Apply CORS middleware
      const corsResponse = corsMiddleware(request);
      if (corsResponse) return corsResponse;

      const url = new URL(request.url);
      const path = url.pathname;

      // Health check endpoint (no auth required)
      if (path === '/health') {
        return handleHealthEndpoint(request, env);
      }

      // Validate Cloudflare Access authentication for all other endpoints
      const authResult = await validateCloudflareAccess(request, env);
      if (!authResult.success) {
        return new Response(JSON.stringify({ error: authResult.error }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Route to appropriate handlers
      if (path.startsWith('/api/kpis')) {
        return handleKPIEndpoints(request, env, authResult.user);
      }

      if (path.startsWith('/api/workflows')) {
        return handleWorkflowEndpoints(request, env, authResult.user);
      }

      if (path.startsWith('/api/config')) {
        return handleConfigEndpoints(request, env, authResult.user);
      }

      if (path.startsWith('/api/schedules')) {
        return handleConfigEndpoints(request, env, authResult.user);
      }

      // 404 for unknown endpoints
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Admin Console Worker Error:', error);
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