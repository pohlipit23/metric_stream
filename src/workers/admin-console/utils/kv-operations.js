/**
 * KV Store Operations
 * Handles all Cloudflare KV store operations for the Admin Console
 */

/**
 * KV Operations class for managing data persistence
 */
export class KVOperations {
  
  // KV Key Patterns (following the design document)
  static KV_KEYS = {
    KPI_REGISTRY: 'kpi-registry:',
    SYSTEM_CONFIG: 'config:system',
    SCHEDULE_CONFIG: 'config:schedule',
    TIMESERIES: 'timeseries:',
    IMPORT_STATUS: 'import-status:',
    IMPORT_ERRORS: 'import-errors:'
  };

  /**
   * List all KPI registry entries
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @returns {Array} Array of KPI registry entries
   */
  static async listKPIs(kvStore) {
    try {
      const listResult = await kvStore.list({ prefix: this.KV_KEYS.KPI_REGISTRY });
      const kpis = [];

      for (const key of listResult.keys) {
        const kpiData = await kvStore.get(key.name, 'json');
        if (kpiData) {
          kpis.push(kpiData);
        }
      }

      // Sort by creation date (newest first)
      return kpis.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    } catch (error) {
      console.error('Error listing KPIs:', error);
      throw new Error('Failed to list KPIs from KV store');
    }
  }

  /**
   * Get a specific KPI by ID
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @param {string} kpiId - KPI identifier
   * @returns {Object|null} KPI data or null if not found
   */
  static async getKPI(kvStore, kpiId) {
    try {
      const key = `${this.KV_KEYS.KPI_REGISTRY}${kpiId}`;
      return await kvStore.get(key, 'json');
    } catch (error) {
      console.error('Error getting KPI:', error);
      throw new Error('Failed to get KPI from KV store');
    }
  }

  /**
   * Save a KPI registry entry
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @param {string} kpiId - KPI identifier
   * @param {Object} kpiData - KPI data to save
   */
  static async saveKPI(kvStore, kpiId, kpiData) {
    try {
      const key = `${this.KV_KEYS.KPI_REGISTRY}${kpiId}`;
      await kvStore.put(key, JSON.stringify(kpiData));
    } catch (error) {
      console.error('Error saving KPI:', error);
      throw new Error('Failed to save KPI to KV store');
    }
  }

  /**
   * Delete a KPI registry entry
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @param {string} kpiId - KPI identifier
   */
  static async deleteKPI(kvStore, kpiId) {
    try {
      const key = `${this.KV_KEYS.KPI_REGISTRY}${kpiId}`;
      await kvStore.delete(key);
      
      // Also clean up related time series data (optional - could be kept for historical purposes)
      const timeseriesKey = `${this.KV_KEYS.TIMESERIES}${kpiId}`;
      await kvStore.delete(timeseriesKey);
      
    } catch (error) {
      console.error('Error deleting KPI:', error);
      throw new Error('Failed to delete KPI from KV store');
    }
  }

  /**
   * Get system configuration
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @returns {Object} System configuration
   */
  static async getSystemConfig(kvStore) {
    try {
      const config = await kvStore.get(this.KV_KEYS.SYSTEM_CONFIG, 'json');
      
      // Return default configuration if none exists
      if (!config) {
        return this.getDefaultSystemConfig();
      }
      
      return config;
    } catch (error) {
      console.error('Error getting system config:', error);
      throw new Error('Failed to get system configuration from KV store');
    }
  }

  /**
   * Save system configuration
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @param {Object} configData - Configuration data to save
   */
  static async saveSystemConfig(kvStore, configData) {
    try {
      await kvStore.put(this.KV_KEYS.SYSTEM_CONFIG, JSON.stringify(configData));
    } catch (error) {
      console.error('Error saving system config:', error);
      throw new Error('Failed to save system configuration to KV store');
    }
  }

  /**
   * Get schedule configuration
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @returns {Object} Schedule configuration
   */
  static async getScheduleConfig(kvStore) {
    try {
      const config = await kvStore.get(this.KV_KEYS.SCHEDULE_CONFIG, 'json');
      
      // Return default schedule configuration if none exists
      if (!config) {
        return this.getDefaultScheduleConfig();
      }
      
      return config;
    } catch (error) {
      console.error('Error getting schedule config:', error);
      throw new Error('Failed to get schedule configuration from KV store');
    }
  }

  /**
   * Save schedule configuration
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @param {Object} scheduleData - Schedule configuration data to save
   */
  static async saveScheduleConfig(kvStore, scheduleData) {
    try {
      await kvStore.put(this.KV_KEYS.SCHEDULE_CONFIG, JSON.stringify(scheduleData));
    } catch (error) {
      console.error('Error saving schedule config:', error);
      throw new Error('Failed to save schedule configuration to KV store');
    }
  }

  /**
   * Import historical data for a KPI
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @param {string} kpiId - KPI identifier
   * @param {string} csvData - CSV data to import
   * @param {string} userEmail - Email of user performing import
   * @returns {Object} Import result with success status and stats
   */
  static async importHistoricalData(kvStore, kpiId, csvData, userEmail) {
    try {
      const importId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const errors = [];
      const dataPoints = [];
      
      // Parse CSV data
      const lines = csvData.trim().split('\n');
      
      if (lines.length < 2) {
        return {
          success: false,
          errors: ['CSV file must contain at least a header row and one data row']
        };
      }
      
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      // Validate headers
      if (!headers.includes('timestamp') || !headers.includes('value')) {
        return {
          success: false,
          errors: ['CSV must contain timestamp and value columns. Found columns: ' + headers.join(', ')]
        };
      }

      const timestampIndex = headers.indexOf('timestamp');
      const valueIndex = headers.indexOf('value');
      const metadataIndex = headers.indexOf('metadata');

      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const row = this.parseCSVLine(line);
        
        if (row.length < 2) continue; // Skip rows with insufficient data
        
        try {
          const timestamp = row[timestampIndex];
          const value = parseFloat(row[valueIndex]);
          const metadata = metadataIndex >= 0 ? row[metadataIndex] : null;

          // Validate timestamp format (ISO 8601)
          const parsedDate = new Date(timestamp);
          if (isNaN(parsedDate.getTime())) {
            errors.push(`Row ${i + 1}: Invalid timestamp format: ${timestamp}`);
            continue;
          }

          // Validate value
          if (isNaN(value)) {
            errors.push(`Row ${i + 1}: Invalid value: ${row[valueIndex]}`);
            continue;
          }

          let parsedMetadata = { source: 'manual_import' };
          if (metadata && metadata.trim() !== '') {
            try {
              parsedMetadata = JSON.parse(metadata.trim());
            } catch (metadataError) {
              // Store as string if not valid JSON
              parsedMetadata = { raw: metadata.trim(), source: 'manual_import' };
            }
          }

          dataPoints.push({
            timestamp: parsedDate.toISOString(),
            value: value,
            metadata: parsedMetadata
          });

        } catch (rowError) {
          errors.push(`Row ${i + 1}: ${rowError.message}`);
        }
      }

      // Sort data points by timestamp
      dataPoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Check for duplicate timestamps
      const timestamps = new Set();
      const duplicates = [];
      dataPoints.forEach((point, index) => {
        if (timestamps.has(point.timestamp)) {
          duplicates.push(`Duplicate timestamp: ${point.timestamp}`);
        }
        timestamps.add(point.timestamp);
      });

      if (duplicates.length > 0) {
        errors.push(...duplicates);
      }

      // If there are critical errors, return failure
      if (errors.length > dataPoints.length * 0.1) { // Allow up to 10% error rate
        // Store import errors for review
        const errorKey = `${this.KV_KEYS.IMPORT_ERRORS}${kpiId}:${importId}`;
        await kvStore.put(errorKey, JSON.stringify({
          kpi_id: kpiId,
          import_id: importId,
          errors: errors,
          timestamp: new Date().toISOString(),
          imported_by: userEmail
        }));

        return {
          success: false,
          errors: errors,
          import_id: importId
        };
      }

      // Get existing time series data
      const timeseriesKey = `${this.KV_KEYS.TIMESERIES}${kpiId}`;
      let existingData = await kvStore.get(timeseriesKey, 'json') || {
        timestamps: [],
        values: [],
        metadata: []
      };

      // Merge with existing data (avoid duplicates)
      const existingTimestamps = new Set(existingData.timestamps);
      let addedCount = 0;

      dataPoints.forEach(point => {
        if (!existingTimestamps.has(point.timestamp)) {
          existingData.timestamps.push(point.timestamp);
          existingData.values.push(point.value);
          existingData.metadata.push(point.metadata);
          addedCount++;
        }
      });

      // Sort all data by timestamp
      const combined = existingData.timestamps.map((timestamp, index) => ({
        timestamp,
        value: existingData.values[index],
        metadata: existingData.metadata[index]
      }));

      combined.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Update arrays
      existingData.timestamps = combined.map(item => item.timestamp);
      existingData.values = combined.map(item => item.value);
      existingData.metadata = combined.map(item => item.metadata);

      // Save updated time series
      await kvStore.put(timeseriesKey, JSON.stringify(existingData));

      // Save import status
      const statusKey = `${this.KV_KEYS.IMPORT_STATUS}${kpiId}:${importId}`;
      const importStatus = {
        kpi_id: kpiId,
        import_id: importId,
        total_rows: lines.length - 1,
        successful_imports: addedCount,
        errors_count: errors.length,
        timestamp: new Date().toISOString(),
        imported_by: userEmail
      };

      await kvStore.put(statusKey, JSON.stringify(importStatus));

      // Store errors if any
      if (errors.length > 0) {
        const errorKey = `${this.KV_KEYS.IMPORT_ERRORS}${kpiId}:${importId}`;
        await kvStore.put(errorKey, JSON.stringify({
          kpi_id: kpiId,
          import_id: importId,
          errors: errors,
          timestamp: new Date().toISOString(),
          imported_by: userEmail
        }));
      }

      return {
        success: true,
        stats: importStatus,
        errors: errors.length > 0 ? errors : null
      };

    } catch (error) {
      console.error('Error importing historical data:', error);
      throw new Error('Failed to import historical data');
    }
  }

  /**
   * Generate sample CSV data for a KPI based on existing time-series data
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @param {string} kpiId - KPI identifier
   * @param {Object} kpi - KPI configuration object
   * @returns {string} Sample CSV content
   */
  static async generateSampleCSVForKPI(kvStore, kpiId, kpi) {
    try {
      // Get existing time series data
      const timeseriesKey = `${this.KV_KEYS.TIMESERIES}${kpiId}`;
      const existingData = await kvStore.get(timeseriesKey, 'json');

      let sampleData = [];

      if (existingData && existingData.timestamps && existingData.timestamps.length > 0) {
        // Use real data from the last 5 entries as sample
        const dataLength = existingData.timestamps.length;
        const startIndex = Math.max(0, dataLength - 5);
        
        for (let i = startIndex; i < dataLength; i++) {
          const timestamp = existingData.timestamps[i];
          const value = existingData.values[i];
          const metadata = existingData.metadata[i] || { source: 'historical_data' };
          
          sampleData.push({
            timestamp,
            value,
            metadata: JSON.stringify(metadata)
          });
        }
      } else {
        // Generate synthetic sample data based on KPI type/name
        const baseValue = this.generateBaseValueForKPI(kpi);
        const now = new Date();
        
        for (let i = 4; i >= 0; i--) {
          const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000)); // Hourly intervals
          const value = this.generateSampleValue(baseValue, i);
          const metadata = {
            source: 'sample_data',
            kpi_name: kpi.name,
            generated_at: new Date().toISOString()
          };
          
          sampleData.push({
            timestamp: timestamp.toISOString(),
            value,
            metadata: JSON.stringify(metadata)
          });
        }
      }

      // Convert to CSV format
      const csvRows = ['timestamp,value,metadata'];
      
      sampleData.forEach(row => {
        const csvRow = [
          row.timestamp,
          row.value.toString(),
          `"${row.metadata.replace(/"/g, '""')}"`
        ];
        csvRows.push(csvRow.join(','));
      });

      return csvRows.join('\n');

    } catch (error) {
      console.error('Error generating sample CSV for KPI:', error);
      
      // Fallback to generic sample data
      return this.generateGenericSampleCSV(kpi);
    }
  }

  /**
   * Generate a base value for sample data based on KPI characteristics
   * @param {Object} kpi - KPI configuration object
   * @returns {number} Base value for sample generation
   */
  static generateBaseValueForKPI(kpi) {
    const name = kpi.name.toLowerCase();
    
    // Generate realistic base values based on common KPI types
    if (name.includes('price') || name.includes('btc') || name.includes('bitcoin')) {
      return 45000; // Bitcoin price range
    } else if (name.includes('eth') || name.includes('ethereum')) {
      return 2500; // Ethereum price range
    } else if (name.includes('volume') || name.includes('trading')) {
      return 1000000; // Trading volume
    } else if (name.includes('market') && name.includes('cap')) {
      return 800000000000; // Market cap
    } else if (name.includes('percentage') || name.includes('percent') || name.includes('%')) {
      return 50; // Percentage values
    } else if (name.includes('count') || name.includes('number')) {
      return 1000; // Count values
    } else if (name.includes('ratio') || name.includes('index')) {
      return 1.5; // Ratio/index values
    } else {
      return 100; // Generic default
    }
  }

  /**
   * Generate a sample value with some variation
   * @param {number} baseValue - Base value to vary from
   * @param {number} index - Index for variation pattern
   * @returns {number} Generated sample value
   */
  static generateSampleValue(baseValue, index) {
    // Create some realistic variation (±5% with trend)
    const variation = (Math.random() - 0.5) * 0.1; // ±5%
    const trend = index * 0.01; // Slight upward trend
    const result = baseValue * (1 + variation + trend);
    
    // Round appropriately based on value size
    if (result > 1000) {
      return Math.round(result * 100) / 100; // 2 decimal places for large values
    } else if (result > 1) {
      return Math.round(result * 100) / 100; // 2 decimal places
    } else {
      return Math.round(result * 10000) / 10000; // 4 decimal places for small values
    }
  }

  /**
   * Generate generic sample CSV when no specific data is available
   * @param {Object} kpi - KPI configuration object
   * @returns {string} Generic sample CSV content
   */
  static generateGenericSampleCSV(kpi) {
    const baseValue = this.generateBaseValueForKPI(kpi);
    const now = new Date();
    const csvRows = ['timestamp,value,metadata'];
    
    for (let i = 4; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const value = this.generateSampleValue(baseValue, i);
      const metadata = JSON.stringify({
        source: 'sample_data',
        kpi_name: kpi.name,
        note: 'This is sample data for import template'
      });
      
      csvRows.push(`${timestamp.toISOString()},${value},"${metadata.replace(/"/g, '""')}"`);
    }
    
    return csvRows.join('\n');
  }

  /**
   * Parse a single CSV line, handling quoted values
   * @param {string} line - CSV line to parse
   * @returns {Array} Array of values
   */
  static parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    values.push(current.trim());
    
    return values;
  }

  /**
   * Validate and save system configuration with backup
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @param {Object} configData - Configuration data to save
   * @param {string} userEmail - Email of user making changes
   */
  static async saveSystemConfigWithValidation(kvStore, configData, userEmail) {
    try {
      // Create backup of existing configuration
      const existingConfig = await this.getSystemConfig(kvStore);
      const backupKey = `${this.KV_KEYS.SYSTEM_CONFIG}:backup:${Date.now()}`;
      await kvStore.put(backupKey, JSON.stringify({
        ...existingConfig,
        backup_created_at: new Date().toISOString(),
        backup_created_by: userEmail
      }));

      // Save new configuration
      await this.saveSystemConfig(kvStore, configData);

      // Clean up old backups (keep last 5)
      const backupList = await kvStore.list({ prefix: `${this.KV_KEYS.SYSTEM_CONFIG}:backup:` });
      if (backupList.keys.length > 5) {
        const sortedBackups = backupList.keys.sort((a, b) => b.name.localeCompare(a.name));
        for (let i = 5; i < sortedBackups.length; i++) {
          await kvStore.delete(sortedBackups[i].name);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving system config with validation:', error);
      throw new Error('Failed to save system configuration with backup');
    }
  }

  /**
   * Get configuration backup history
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @returns {Array} Array of backup configurations
   */
  static async getConfigurationBackups(kvStore) {
    try {
      const backupList = await kvStore.list({ prefix: `${this.KV_KEYS.SYSTEM_CONFIG}:backup:` });
      const backups = [];

      for (const key of backupList.keys.slice(0, 10)) { // Get last 10 backups
        const backupData = await kvStore.get(key.name, 'json');
        if (backupData) {
          backups.push({
            id: key.name.split(':').pop(),
            timestamp: backupData.backup_created_at,
            created_by: backupData.backup_created_by,
            version: backupData.version || '1.0.0',
            key: key.name
          });
        }
      }

      return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error getting configuration backups:', error);
      return [];
    }
  }

  /**
   * Restore configuration from backup
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @param {string} backupKey - Backup key to restore from
   * @param {string} userEmail - Email of user performing restore
   */
  static async restoreConfigurationFromBackup(kvStore, backupKey, userEmail) {
    try {
      const backupData = await kvStore.get(backupKey, 'json');
      if (!backupData) {
        throw new Error('Backup not found');
      }

      // Remove backup metadata and add restore metadata
      const { backup_created_at, backup_created_by, ...configData } = backupData;
      const restoredConfig = {
        ...configData,
        restored_at: new Date().toISOString(),
        restored_by: userEmail,
        restored_from: backupKey,
        updated_at: new Date().toISOString(),
        updated_by: userEmail
      };

      await this.saveSystemConfig(kvStore, restoredConfig);
      return { success: true, data: restoredConfig };
    } catch (error) {
      console.error('Error restoring configuration from backup:', error);
      throw new Error('Failed to restore configuration from backup');
    }
  }

  /**
   * Get default system configuration
   * @returns {Object} Default system configuration
   */
  static getDefaultSystemConfig() {
    return {
      version: '1.0.0',
      retry: {
        chart_generation: {
          max_retries: 3,
          backoff_intervals: [1000, 2000, 4000] // milliseconds
        },
        llm_analysis: {
          max_retries: 2,
          backoff_intervals: [2000, 4000]
        },
        data_collection: {
          max_retries: 3,
          backoff_intervals: [1000, 2000, 4000]
        },
        delivery: {
          max_retries: 2,
          backoff_intervals: [5000, 10000]
        }
      },
      fallback: {
        chart_generation: {
          fallback_image_url: 'https://via.placeholder.com/800x400?text=Chart+Generation+Failed',
          fallback_text: 'Chart generation temporarily unavailable'
        },
        llm_analysis: {
          disclaimer: 'AI analysis temporarily unavailable. Data provided without insights.'
        },
        data_collection: {
          skip_on_failure: true,
          log_errors: true
        },
        delivery: {
          retry_on_next_cycle: true,
          alert_admin: true
        }
      },
      job_lifecycle: {
        timeout_minutes: 30,
        partial_data_delivery: true,
        orchestration_polling_minutes: 2
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      change_log: []
    };
  }

  /**
   * Validate and save schedule configuration
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @param {Object} scheduleData - Schedule configuration data to save
   * @param {string} userEmail - Email of user making changes
   */
  static async saveScheduleConfigWithValidation(kvStore, scheduleData, userEmail) {
    try {
      // Import validation function
      const { validateScheduleConfig } = await import('./validation.js');
      
      // Validate schedule configuration
      const validation = validateScheduleConfig(scheduleData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Create backup of existing configuration
      const existingConfig = await this.getScheduleConfig(kvStore);
      const backupKey = `${this.KV_KEYS.SCHEDULE_CONFIG}:backup:${Date.now()}`;
      await kvStore.put(backupKey, JSON.stringify({
        ...existingConfig,
        backup_created_at: new Date().toISOString(),
        backup_created_by: userEmail
      }));

      // Save new configuration
      await this.saveScheduleConfig(kvStore, scheduleData);

      return { success: true };
    } catch (error) {
      console.error('Error saving schedule config with validation:', error);
      throw error;
    }
  }

  /**
   * Get configuration health status
   * @param {KVNamespace} kvStore - Cloudflare KV namespace
   * @returns {Object} Configuration health status
   */
  static async getConfigurationHealth(kvStore) {
    try {
      const systemConfig = await this.getSystemConfig(kvStore);
      const scheduleConfig = await this.getScheduleConfig(kvStore);
      
      const health = {
        overall_status: 'healthy',
        checks: {
          system_config_exists: !!systemConfig,
          schedule_config_exists: !!scheduleConfig,
          system_config_valid: true,
          schedule_config_valid: true,
          kv_store_accessible: true
        },
        last_updated: {
          system: systemConfig.updated_at || systemConfig.created_at,
          schedule: scheduleConfig.updated_at || scheduleConfig.created_at
        },
        warnings: [],
        errors: []
      };

      // Validate configurations
      try {
        const { validateSystemConfig, validateScheduleConfig } = await import('./validation.js');
        
        const systemValidation = validateSystemConfig(systemConfig);
        if (!systemValidation.valid) {
          health.checks.system_config_valid = false;
          health.errors.push(...systemValidation.errors.map(err => `System config: ${err}`));
        }

        const scheduleValidation = validateScheduleConfig(scheduleConfig);
        if (!scheduleValidation.valid) {
          health.checks.schedule_config_valid = false;
          health.errors.push(...scheduleValidation.errors.map(err => `Schedule config: ${err}`));
        }
      } catch (validationError) {
        health.warnings.push('Could not validate configurations: ' + validationError.message);
      }

      // Check for outdated configurations
      const now = new Date();
      const systemAge = now - new Date(systemConfig.updated_at || systemConfig.created_at);
      const scheduleAge = now - new Date(scheduleConfig.updated_at || scheduleConfig.created_at);
      
      if (systemAge > 30 * 24 * 60 * 60 * 1000) { // 30 days
        health.warnings.push('System configuration has not been updated in over 30 days');
      }
      
      if (scheduleAge > 30 * 24 * 60 * 60 * 1000) { // 30 days
        health.warnings.push('Schedule configuration has not been updated in over 30 days');
      }

      // Determine overall status
      if (health.errors.length > 0) {
        health.overall_status = 'unhealthy';
      } else if (health.warnings.length > 0) {
        health.overall_status = 'warning';
      }

      return health;
    } catch (error) {
      console.error('Error getting configuration health:', error);
      return {
        overall_status: 'error',
        checks: {
          kv_store_accessible: false
        },
        errors: ['Failed to access configuration store: ' + error.message],
        warnings: [],
        last_updated: {}
      };
    }
  }

  /**
   * Get default schedule configuration
   * @returns {Object} Default schedule configuration
   */
  static getDefaultScheduleConfig() {
    return {
      id: 'main-scheduler',
      name: 'Main KPI Collection Schedule',
      type: 'kpi_collection',
      cron_expression: '0 9 * * *', // Daily at 9 AM UTC
      timezone: 'UTC',
      enabled: true,
      job_timeout_minutes: 30,
      orchestration_polling_minutes: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}