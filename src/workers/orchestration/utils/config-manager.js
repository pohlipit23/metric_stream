/**
 * Configuration Manager
 * 
 * Handles configuration loading and management for the orchestration worker
 */

export class ConfigManager {
  constructor(env) {
    this.env = env;
    this.defaultConfig = {
      pollingFrequencyMinutes: 5,
      jobTimeoutMinutes: 30,
      enablePartialData: true,
      maxJobsPerRun: 50,
      retryFailedJobs: false,
      partialDataThreshold: 0.5 // Minimum 50% of KPIs must be complete for partial processing
    };
  }

  /**
   * Get current configuration (environment variables + KV overrides)
   */
  async getConfig() {
    try {
      // Start with default configuration
      let config = { ...this.defaultConfig };

      // Override with environment variables
      if (this.env.POLLING_FREQUENCY_MINUTES) {
        config.pollingFrequencyMinutes = parseInt(this.env.POLLING_FREQUENCY_MINUTES);
      }
      
      if (this.env.JOB_TIMEOUT_MINUTES) {
        config.jobTimeoutMinutes = parseInt(this.env.JOB_TIMEOUT_MINUTES);
      }
      
      if (this.env.ENABLE_PARTIAL_DATA !== undefined) {
        config.enablePartialData = this.env.ENABLE_PARTIAL_DATA === 'true';
      }

      if (this.env.MAX_JOBS_PER_RUN) {
        config.maxJobsPerRun = parseInt(this.env.MAX_JOBS_PER_RUN);
      }

      if (this.env.RETRY_FAILED_JOBS !== undefined) {
        config.retryFailedJobs = this.env.RETRY_FAILED_JOBS === 'true';
      }

      if (this.env.PARTIAL_DATA_THRESHOLD) {
        config.partialDataThreshold = parseFloat(this.env.PARTIAL_DATA_THRESHOLD);
      }

      // Override with KV store configuration (allows runtime updates)
      try {
        const kvConfig = await this.env.KV_STORE.get('orchestration:config');
        if (kvConfig) {
          const parsedKvConfig = JSON.parse(kvConfig);
          config = { ...config, ...parsedKvConfig };
        }
      } catch (error) {
        console.warn('Error loading KV configuration, using environment/defaults:', error);
      }

      // Validate configuration
      config = this.validateConfig(config);

      return config;
    } catch (error) {
      console.error('Error loading configuration, using defaults:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Update configuration in KV store
   */
  async updateConfig(newConfig) {
    try {
      const currentConfig = await this.getConfig();
      const updatedConfig = { ...currentConfig, ...newConfig };
      
      // Validate the updated configuration
      const validatedConfig = this.validateConfig(updatedConfig);
      
      await this.env.KV_STORE.put('orchestration:config', JSON.stringify(validatedConfig));
      
      console.log('Configuration updated:', validatedConfig);
      return validatedConfig;
      
    } catch (error) {
      console.error('Error updating configuration:', error);
      throw error;
    }
  }

  /**
   * Validate configuration values
   */
  validateConfig(config) {
    const validated = { ...config };

    // Ensure positive values
    if (validated.pollingFrequencyMinutes <= 0) {
      console.warn('Invalid polling frequency, using default');
      validated.pollingFrequencyMinutes = this.defaultConfig.pollingFrequencyMinutes;
    }

    if (validated.jobTimeoutMinutes <= 0) {
      console.warn('Invalid job timeout, using default');
      validated.jobTimeoutMinutes = this.defaultConfig.jobTimeoutMinutes;
    }

    if (validated.maxJobsPerRun <= 0) {
      console.warn('Invalid max jobs per run, using default');
      validated.maxJobsPerRun = this.defaultConfig.maxJobsPerRun;
    }

    // Ensure threshold is between 0 and 1
    if (validated.partialDataThreshold < 0 || validated.partialDataThreshold > 1) {
      console.warn('Invalid partial data threshold, using default');
      validated.partialDataThreshold = this.defaultConfig.partialDataThreshold;
    }

    // Ensure boolean values
    validated.enablePartialData = Boolean(validated.enablePartialData);
    validated.retryFailedJobs = Boolean(validated.retryFailedJobs);

    return validated;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return { ...this.defaultConfig };
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig() {
    try {
      await this.env.KV_STORE.delete('orchestration:config');
      console.log('Configuration reset to defaults');
      return this.defaultConfig;
    } catch (error) {
      console.error('Error resetting configuration:', error);
      throw error;
    }
  }

  /**
   * Check if partial data processing should be enabled for a job
   */
  shouldProcessPartialData(completedKpis, totalKpis, config) {
    if (!config.enablePartialData) {
      return false;
    }

    if (completedKpis === 0) {
      return false;
    }

    const completionRatio = completedKpis / totalKpis;
    return completionRatio >= config.partialDataThreshold;
  }
}