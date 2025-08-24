/**
 * Cloudflare Worker for KPI Data Ingestion
 * 
 * This worker handles incoming KPI data from N8N workflows and manages
 * KV store updates for time series data, KPI packages, and job status tracking.
 */

import { handleKPIData } from './handlers/kpi-data.js';
import { handleKPIError } from './handlers/kpi-error.js';
import { handleHealth } from './handlers/health.js';
import { corsMiddleware } from './middleware/cors.js';
import { authMiddleware } from './middleware/auth.js';

/**
 * Debug KPI processing step by step
 */
async function handleDebugKPI(request, env, ctx) {
  try {
    const requestData = await request.json();
    console.log('🔍 DEBUG: Received request data:', JSON.stringify(requestData, null, 2));
    
    const result = {
      step1_parsing: null,
      step2_idempotency: null,
      step3_timeseries: null,
      step4_package: null,
      step5_job: null,
      errors: []
    };
    
    try {
      // Step 1: Parse the payload
      console.log('🔍 DEBUG: Step 1 - Parsing payload');
      const { parseKPIPayload } = await import('./utils/parsers.js');
      const parsedData = parseKPIPayload(requestData);
      const kpiUpdates = Array.isArray(parsedData) ? parsedData : [parsedData];
      result.step1_parsing = { success: true, kpiCount: kpiUpdates.length };
      console.log('🔍 DEBUG: Step 1 - Parsed successfully, KPI count:', kpiUpdates.length);
      
      if (kpiUpdates.length > 0) {
        const kpiUpdate = kpiUpdates[0]; // Test with first KPI
        console.log('🔍 DEBUG: Testing with KPI:', JSON.stringify(kpiUpdate, null, 2));
        
        // Step 2: Test idempotency
        console.log('🔍 DEBUG: Step 2 - Testing idempotency');
        try {
          const { checkIdempotency } = await import('./utils/idempotency.js');
          const isDuplicate = await checkIdempotency(env.TIMESERIES_KV, kpiUpdate.kpi_id, kpiUpdate.timestamp);
          result.step2_idempotency = { success: true, isDuplicate };
          console.log('🔍 DEBUG: Step 2 - Idempotency check completed, isDuplicate:', isDuplicate);
        } catch (error) {
          result.step2_idempotency = { success: false, error: error.message };
          result.errors.push(`Step 2 error: ${error.message}`);
          console.error('🔍 DEBUG: Step 2 - Idempotency error:', error);
        }
        
        // Step 3: Test time series update
        console.log('🔍 DEBUG: Step 3 - Testing time series update');
        try {
          const key = `timeseries:${kpiUpdate.kpi_id}`;
          const timeSeriesData = {
            kpiId: kpiUpdate.kpi_id,
            kpiType: kpiUpdate.kpi_type,
            dataPoints: [{
              timestamp: kpiUpdate.timestamp,
              value: 58.5,
              metadata: { test: true }
            }],
            lastUpdated: new Date().toISOString(),
            metadata: { created: new Date().toISOString(), totalPoints: 1 }
          };
          
          console.log('🔍 DEBUG: Step 3 - Storing to key:', key);
          await env.TIMESERIES_KV.put(key, JSON.stringify(timeSeriesData));
          console.log('🔍 DEBUG: Step 3 - Put operation completed');
          
          const retrieved = await env.TIMESERIES_KV.get(key, 'json');
          console.log('🔍 DEBUG: Step 3 - Retrieved data:', !!retrieved);
          
          result.step3_timeseries = { 
            success: true, 
            key, 
            stored: !!retrieved,
            dataPoints: retrieved?.dataPoints?.length || 0
          };
        } catch (error) {
          result.step3_timeseries = { success: false, error: error.message };
          result.errors.push(`Step 3 error: ${error.message}`);
          console.error('🔍 DEBUG: Step 3 - Time series error:', error);
        }
        
        // Step 4: Test package creation
        console.log('🔍 DEBUG: Step 4 - Testing package creation');
        try {
          const packageKey = `package:${kpiUpdate.trace_id}:${kpiUpdate.kpi_id}`;
          const packageData = {
            traceId: kpiUpdate.trace_id,
            kpiId: kpiUpdate.kpi_id,
            timestamp: kpiUpdate.timestamp,
            data: kpiUpdate.data,
            metadata: { test: true }
          };
          
          console.log('🔍 DEBUG: Step 4 - Storing to key:', packageKey);
          await env.PACKAGES_KV.put(packageKey, JSON.stringify(packageData));
          console.log('🔍 DEBUG: Step 4 - Put operation completed');
          
          const retrieved = await env.PACKAGES_KV.get(packageKey, 'json');
          console.log('🔍 DEBUG: Step 4 - Retrieved package:', !!retrieved);
          
          result.step4_package = { 
            success: true, 
            key: packageKey, 
            stored: !!retrieved 
          };
        } catch (error) {
          result.step4_package = { success: false, error: error.message };
          result.errors.push(`Step 4 error: ${error.message}`);
          console.error('🔍 DEBUG: Step 4 - Package error:', error);
        }
        
        // Step 5: Test job status
        console.log('🔍 DEBUG: Step 5 - Testing job status');
        try {
          const jobKey = `job:${kpiUpdate.trace_id}`;
          const jobData = {
            traceId: kpiUpdate.trace_id,
            status: 'pending',
            kpis: {
              [kpiUpdate.kpi_id]: { status: 'completed' }
            },
            metadata: { test: true }
          };
          
          console.log('🔍 DEBUG: Step 5 - Storing to key:', jobKey);
          await env.JOBS_KV.put(jobKey, JSON.stringify(jobData));
          console.log('🔍 DEBUG: Step 5 - Put operation completed');
          
          const retrieved = await env.JOBS_KV.get(jobKey, 'json');
          console.log('🔍 DEBUG: Step 5 - Retrieved job:', !!retrieved);
          
          result.step5_job = { 
            success: true, 
            key: jobKey, 
            stored: !!retrieved 
          };
        } catch (error) {
          result.step5_job = { success: false, error: error.message };
          result.errors.push(`Step 5 error: ${error.message}`);
          console.error('🔍 DEBUG: Step 5 - Job error:', error);
        }
      }
      
    } catch (error) {
      result.errors.push(`General error: ${error.message}`);
      console.error('🔍 DEBUG: General error:', error);
    }
    
    console.log('🔍 DEBUG: Final result:', JSON.stringify(result, null, 2));
    
    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('🔍 DEBUG: Handler error:', error);
    return new Response(JSON.stringify({
      error: 'Debug handler failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Debug KV bindings and operations
 */
async function handleDebugKV(request, env, ctx) {
  try {
    const testKey = `debug-test-${Date.now()}`;
    const testValue = { message: 'KV test', timestamp: new Date().toISOString() };
    
    const debug = {
      bindings: {
        TIMESERIES_KV: !!env.TIMESERIES_KV,
        JOBS_KV: !!env.JOBS_KV,
        PACKAGES_KV: !!env.PACKAGES_KV
      },
      tests: {}
    };
    
    // Test TIMESERIES_KV
    if (env.TIMESERIES_KV) {
      try {
        await env.TIMESERIES_KV.put(testKey, JSON.stringify(testValue));
        const retrieved = await env.TIMESERIES_KV.get(testKey, 'json');
        debug.tests.TIMESERIES_KV = {
          put: 'success',
          get: retrieved ? 'success' : 'failed',
          data_matches: retrieved && retrieved.message === testValue.message
        };
        await env.TIMESERIES_KV.delete(testKey); // cleanup
      } catch (error) {
        debug.tests.TIMESERIES_KV = { error: error.message };
      }
    }
    
    // Test JOBS_KV
    if (env.JOBS_KV) {
      try {
        await env.JOBS_KV.put(testKey, JSON.stringify(testValue));
        const retrieved = await env.JOBS_KV.get(testKey, 'json');
        debug.tests.JOBS_KV = {
          put: 'success',
          get: retrieved ? 'success' : 'failed',
          data_matches: retrieved && retrieved.message === testValue.message
        };
        await env.JOBS_KV.delete(testKey); // cleanup
      } catch (error) {
        debug.tests.JOBS_KV = { error: error.message };
      }
    }
    
    // Test PACKAGES_KV
    if (env.PACKAGES_KV) {
      try {
        await env.PACKAGES_KV.put(testKey, JSON.stringify(testValue));
        const retrieved = await env.PACKAGES_KV.get(testKey, 'json');
        debug.tests.PACKAGES_KV = {
          put: 'success',
          get: retrieved ? 'success' : 'failed',
          data_matches: retrieved && retrieved.message === testValue.message
        };
        await env.PACKAGES_KV.delete(testKey); // cleanup
      } catch (error) {
        debug.tests.PACKAGES_KV = { error: error.message };
      }
    }
    
    return new Response(JSON.stringify(debug, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Debug KV failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    try {
      // Apply CORS middleware
      const corsResponse = corsMiddleware(request);
      if (corsResponse) return corsResponse;

      // Parse URL and method
      const url = new URL(request.url);
      const method = request.method;

      // Route handling
      if (method === 'POST' && url.pathname === '/api/kpi-data') {
        // Authenticate request
        const authResult = await authMiddleware(request, env);
        if (!authResult.success) {
          return new Response(JSON.stringify({ error: authResult.error }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return await handleKPIData(request, env, ctx);
      }

      if (method === 'POST' && url.pathname === '/api/kpi-error') {
        // Authenticate request
        const authResult = await authMiddleware(request, env);
        if (!authResult.success) {
          return new Response(JSON.stringify({ error: authResult.error }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return await handleKPIError(request, env, ctx);
      }

      if (method === 'GET' && url.pathname === '/api/health') {
        return await handleHealth(request, env, ctx);
      }

      if (method === 'GET' && url.pathname === '/api/debug-kv') {
        return await handleDebugKV(request, env, ctx);
      }

      if (method === 'POST' && url.pathname === '/api/debug-kpi') {
        return await handleDebugKPI(request, env, ctx);
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Worker error:', error);
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