/**
 * Job Monitor
 * 
 * Handles job status monitoring and completion detection
 */

export class JobMonitor {
  constructor(env, configManager) {
    this.env = env;
    this.configManager = configManager;
  }

  /**
   * Get all active jobs that need monitoring
   */
  async getActiveJobs() {
    try {
      // List all job keys in KV store
      const jobKeys = await this.env.KV_STORE.list({ prefix: 'job:' });
      const activeJobs = [];

      for (const key of jobKeys.keys) {
        try {
          const jobData = await this.env.KV_STORE.get(key.name);
          if (!jobData) continue;

          const job = JSON.parse(jobData);
          
          // Only monitor jobs that are in 'active' or 'in_progress' status
          if (job.status === 'active' || job.status === 'in_progress') {
            activeJobs.push({
              traceId: job.traceId,
              createdAt: job.createdAt,
              kpiIds: job.kpiIds,
              status: job.status
            });
          }
        } catch (error) {
          console.error(`Error parsing job data for key ${key.name}:`, error);
        }
      }

      return activeJobs;
    } catch (error) {
      console.error('Error getting active jobs:', error);
      return [];
    }
  }

  /**
   * Check the completion status of a specific job
   */
  async checkJobStatus(traceId) {
    try {
      const jobKey = `job:${traceId}`;
      const jobData = await this.env.KV_STORE.get(jobKey);
      
      if (!jobData) {
        throw new Error(`Job ${traceId} not found`);
      }

      const job = JSON.parse(jobData);
      const config = await this.configManager.getConfig();
      
      // Calculate job age
      const createdAt = new Date(job.createdAt);
      const now = new Date();
      const ageMinutes = (now - createdAt) / (1000 * 60);
      
      // Count completed KPIs
      const totalKpis = job.kpiIds.length;
      const completedKpis = job.completedKpis ? job.completedKpis.length : 0;
      const failedKpis = job.failedKpis ? job.failedKpis.length : 0;
      
      // Determine job status
      const isComplete = completedKpis === totalKpis;
      const isTimedOut = ageMinutes > config.jobTimeoutMinutes;
      const hasPartialData = completedKpis > 0 && completedKpis < totalKpis;
      
      return {
        traceId,
        totalKpis,
        completedKpis,
        failedKpis,
        ageMinutes,
        isComplete,
        isTimedOut,
        hasPartialData,
        status: job.status,
        createdAt: job.createdAt,
        lastUpdated: job.lastUpdated
      };
      
    } catch (error) {
      console.error(`Error checking job status for ${traceId}:`, error);
      throw error;
    }
  }

  /**
   * Mark a job as processed to prevent duplicate processing
   */
  async markJobAsProcessed(traceId, finalStatus) {
    try {
      const jobKey = `job:${traceId}`;
      const jobData = await this.env.KV_STORE.get(jobKey);
      
      if (!jobData) {
        throw new Error(`Job ${traceId} not found`);
      }

      const job = JSON.parse(jobData);
      
      // Update job status
      job.status = finalStatus;
      job.processedAt = new Date().toISOString();
      job.lastUpdated = new Date().toISOString();
      
      // Add processing metadata
      if (finalStatus === 'partial') {
        job.processingNote = 'Processed with partial data due to timeout';
      } else if (finalStatus === 'timeout') {
        job.processingNote = 'Job timed out without sufficient data';
      } else if (finalStatus === 'complete') {
        job.processingNote = 'All KPIs completed successfully';
      }
      
      await this.env.KV_STORE.put(jobKey, JSON.stringify(job));
      
      console.log(`Job ${traceId} marked as ${finalStatus}`);
      
    } catch (error) {
      console.error(`Error marking job ${traceId} as processed:`, error);
      throw error;
    }
  }

  /**
   * Get job statistics for monitoring
   */
  async getJobStatistics() {
    try {
      const jobKeys = await this.env.KV_STORE.list({ prefix: 'job:' });
      const stats = {
        total: 0,
        active: 0,
        complete: 0,
        partial: 0,
        timeout: 0,
        failed: 0
      };

      for (const key of jobKeys.keys) {
        try {
          const jobData = await this.env.KV_STORE.get(key.name);
          if (!jobData) continue;

          const job = JSON.parse(jobData);
          stats.total++;
          
          if (stats[job.status] !== undefined) {
            stats[job.status]++;
          }
        } catch (error) {
          console.error(`Error parsing job for stats: ${key.name}`, error);
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting job statistics:', error);
      return null;
    }
  }
}