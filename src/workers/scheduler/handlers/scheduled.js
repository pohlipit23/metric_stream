/**
 * Scheduled Event Handler
 * 
 * Handles cron-triggered events for job initiation:
 * 1. Creates new job records with unique trace_id
 * 2. Reads KPI registry from KV store
 * 3. Triggers individual N8N workflows
 * 4. Manages error handling for failed triggers
 */

import { generateTraceId } from '../utils/trace-id.js';
import { createJobRecord } from '../utils/job-manager.js';
import { getActiveKPIs } from '../utils/kpi-registry.js';
import { triggerN8NWorkflows } from '../utils/n8n-trigger.js';

export async function handleScheduledEvent(event, env, ctx) {
  const startTime = Date.now();
  console.log('Scheduler Worker: Starting scheduled job initiation');

  try {
    // Generate unique trace ID for this job
    const traceId = generateTraceId();
    const timestamp = new Date().toISOString();

    console.log(`Scheduler Worker: Generated trace ID: ${traceId}`);

    // Read active KPIs from registry
    const activeKPIs = await getActiveKPIs(env);
    if (!activeKPIs || activeKPIs.length === 0) {
      console.warn('Scheduler Worker: No active KPIs found in registry');
      return {
        success: false,
        error: 'No active KPIs found',
        traceId,
        timestamp
      };
    }

    console.log(`Scheduler Worker: Found ${activeKPIs.length} active KPIs`);

    // Create job record in KV
    const jobCreated = await createJobRecord(env, traceId, activeKPIs, timestamp);
    if (!jobCreated) {
      console.error('Scheduler Worker: Failed to create job record');
      return {
        success: false,
        error: 'Failed to create job record',
        traceId,
        timestamp
      };
    }

    console.log(`Scheduler Worker: Created job record for trace ID: ${traceId}`);

    // Trigger N8N workflows for all active KPIs
    const triggerResults = await triggerN8NWorkflows(env, traceId, activeKPIs, timestamp);

    // Calculate execution time
    const executionTime = Date.now() - startTime;

    // Log results
    const successCount = triggerResults.filter(r => r.success).length;
    const failureCount = triggerResults.filter(r => !r.success).length;

    console.log(`Scheduler Worker: Job initiation completed in ${executionTime}ms`);
    console.log(`Scheduler Worker: ${successCount} workflows triggered successfully, ${failureCount} failed`);

    // Return execution summary
    return {
      success: true,
      traceId,
      timestamp,
      executionTime,
      kpiCount: activeKPIs.length,
      successCount,
      failureCount,
      results: triggerResults
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('Scheduler Worker: Error during scheduled execution:', error);
    
    return {
      success: false,
      error: error.message,
      executionTime,
      timestamp: new Date().toISOString()
    };
  }
}