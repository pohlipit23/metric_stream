/**
 * Scheduled Handler
 * 
 * Main orchestration logic that monitors job status and triggers aggregate workflows
 */

import { JobMonitor } from '../utils/job-monitor.js';
import { QueueManager } from '../utils/queue-manager.js';
import { ConfigManager } from '../utils/config-manager.js';

export async function handleScheduled(event, env, ctx) {
  const startTime = Date.now();
  
  try {
    console.log('Orchestration Worker: Starting scheduled run');
    
    // Initialize managers
    const configManager = new ConfigManager(env);
    const jobMonitor = new JobMonitor(env, configManager);
    const queueManager = new QueueManager(env);
    
    // Load configuration
    const config = await configManager.getConfig();
    console.log('Orchestration config:', config);
    
    // Get active jobs that need monitoring
    const activeJobs = await jobMonitor.getActiveJobs();
    console.log(`Found ${activeJobs.length} active jobs to monitor`);
    
    if (activeJobs.length === 0) {
      console.log('No active jobs found, skipping orchestration');
      await recordOrchestrationRun(env, startTime, 0, 0, 0);
      return;
    }
    
    let completedJobs = 0;
    let timedOutJobs = 0;
    let partialJobs = 0;
    
    // Process each active job
    for (const job of activeJobs) {
      try {
        const jobStatus = await jobMonitor.checkJobStatus(job.traceId);
        
        if (jobStatus.isComplete) {
          console.log(`Job ${job.traceId} is complete with ${jobStatus.completedKpis}/${jobStatus.totalKpis} KPIs`);
          
          // Trigger aggregate workflow
          await queueManager.triggerLLMAnalysis(job.traceId);
          await jobMonitor.markJobAsProcessed(job.traceId, 'complete');
          completedJobs++;
          
        } else if (jobStatus.isTimedOut) {
          console.log(`Job ${job.traceId} has timed out with ${jobStatus.completedKpis}/${jobStatus.totalKpis} KPIs`);
          
          if (configManager.shouldProcessPartialData(jobStatus.completedKpis, jobStatus.totalKpis, config)) {
            // Process with partial data
            await queueManager.triggerLLMAnalysis(job.traceId, { partial: true });
            await jobMonitor.markJobAsProcessed(job.traceId, 'partial');
            partialJobs++;
          } else {
            // Mark as failed
            await jobMonitor.markJobAsProcessed(job.traceId, 'timeout');
            timedOutJobs++;
          }
          
        } else {
          console.log(`Job ${job.traceId} still in progress: ${jobStatus.completedKpis}/${jobStatus.totalKpis} KPIs completed`);
        }
        
      } catch (error) {
        console.error(`Error processing job ${job.traceId}:`, error);
        // Continue with other jobs
      }
    }
    
    // Record orchestration run statistics
    await recordOrchestrationRun(env, startTime, completedJobs, timedOutJobs, partialJobs);
    
    const duration = Date.now() - startTime;
    console.log(`Orchestration Worker: Completed run in ${duration}ms - ${completedJobs} completed, ${timedOutJobs} timed out, ${partialJobs} partial`);
    
  } catch (error) {
    console.error('Orchestration Worker: Error in scheduled run:', error);
    
    // Record failed run
    try {
      await env.JOBS_KV.put('orchestration:last_error', JSON.stringify({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      }));
    } catch (kvError) {
      console.error('Failed to record error in KV:', kvError);
    }
    
    throw error;
  }
}

/**
 * Record orchestration run statistics
 */
async function recordOrchestrationRun(env, startTime, completed, timedOut, partial) {
  try {
    const runStats = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      jobsProcessed: {
        completed,
        timedOut,
        partial,
        total: completed + timedOut + partial
      }
    };
    
    await env.JOBS_KV.put('orchestration:last_run', JSON.stringify(runStats));
  } catch (error) {
    console.error('Failed to record orchestration run stats:', error);
  }
}