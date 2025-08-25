/**
 * Cloudflare Scheduler Worker
 * 
 * This worker handles cron-triggered job initiation by:
 * 1. Creating new job records in KV with unique trace_id
 * 2. Reading KPI registry from KV store
 * 3. Triggering individual N8N workflows via webhook URLs
 * 4. Managing job initialization with all active KPIs
 */

import { handleScheduledEvent } from './handlers/scheduled.js';
import { handleHealth } from './handlers/health.js';

export default {
  async scheduled(event, env, ctx) {
    try {
      return await handleScheduledEvent(event, env, ctx);
    } catch (error) {
      console.error('Scheduler Worker error:', error);
      throw error;
    }
  },

  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const method = request.method;

      // Health check endpoint
      if (method === 'GET' && url.pathname === '/api/health') {
        return await handleHealth(request, env, ctx);
      }

      // Manual trigger endpoint for testing
      if (method === 'POST' && url.pathname === '/api/trigger') {
        console.log('Scheduler Worker: Manual trigger requested');
        
        // Simulate a scheduled event
        const mockEvent = {
          type: 'scheduled',
          scheduledTime: Date.now(),
          cron: '0 */6 * * *' // Every 6 hours
        };
        
        const result = await handleScheduledEvent(mockEvent, env, ctx);
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Manual trigger executed',
          job_id: result.traceId,
          trace_id: result.traceId,
          result: result
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Scheduler Worker fetch error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};