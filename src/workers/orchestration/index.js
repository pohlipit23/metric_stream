/**
 * Orchestration Worker
 * 
 * Monitors job status in KV store and triggers aggregate workflows when jobs are complete.
 * Implements fan-in logic to consolidate individual KPI results for downstream processing.
 */

import { handleScheduled } from './handlers/scheduled.js';
import { handleHealth } from './handlers/health.js';

export default {
  async scheduled(event, env, ctx) {
    return handleScheduled(event, env, ctx);
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return handleHealth(request, env, ctx);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};