/**
 * Validation Utilities
 * Handles validation for KPI registry entries and system configuration
 */

/**
 * Validates a KPI registry entry
 * @param {Object} kpiData - KPI data to validate
 * @param {boolean} isUpdate - Whether this is an update (allows partial data)
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateKPIRegistryEntry(kpiData, isUpdate = false) {
  const errors = [];

  // Required fields for creation
  if (!isUpdate) {
    if (!kpiData.name || typeof kpiData.name !== 'string' || kpiData.name.trim().length === 0) {
      errors.push('Name is required and must be a non-empty string');
    }

    if (!kpiData.webhook_url || typeof kpiData.webhook_url !== 'string') {
      errors.push('Webhook URL is required and must be a string');
    }
  }

  // Validate name if provided
  if (kpiData.name !== undefined) {
    if (typeof kpiData.name !== 'string' || kpiData.name.trim().length === 0) {
      errors.push('Name must be a non-empty string');
    } else if (kpiData.name.length > 100) {
      errors.push('Name must be 100 characters or less');
    }
  }

  // Validate description if provided
  if (kpiData.description !== undefined) {
    if (typeof kpiData.description !== 'string') {
      errors.push('Description must be a string');
    } else if (kpiData.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }
  }

  // Validate webhook URL if provided
  if (kpiData.webhook_url !== undefined) {
    if (typeof kpiData.webhook_url !== 'string') {
      errors.push('Webhook URL must be a string');
    } else {
      try {
        new URL(kpiData.webhook_url);
      } catch (urlError) {
        errors.push('Webhook URL must be a valid URL');
      }
    }
  }

  // Validate analysis config if provided
  if (kpiData.analysis_config !== undefined) {
    if (typeof kpiData.analysis_config !== 'object' || kpiData.analysis_config === null) {
      errors.push('Analysis config must be an object');
    } else {
      const analysisErrors = validateAnalysisConfig(kpiData.analysis_config);
      errors.push(...analysisErrors);
    }
  }

  // Validate active flag if provided
  if (kpiData.active !== undefined && typeof kpiData.active !== 'boolean') {
    errors.push('Active must be a boolean value');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates system configuration
 * @param {Object} configData - Configuration data to validate
 * @returns {Object} Validation result
 */
export function validateSystemConfig(configData) {
  const errors = [];

  // Validate job lifecycle settings
  if (configData.job_lifecycle) {
    const lifecycle = configData.job_lifecycle;
    
    if (lifecycle.timeout_minutes !== undefined) {
      if (!Number.isInteger(lifecycle.timeout_minutes) || lifecycle.timeout_minutes < 1 || lifecycle.timeout_minutes > 120) {
        errors.push('Job timeout must be an integer between 1 and 120 minutes');
      }
    }

    if (lifecycle.orchestration_polling_minutes !== undefined) {
      if (!Number.isInteger(lifecycle.orchestration_polling_minutes) || lifecycle.orchestration_polling_minutes < 1 || lifecycle.orchestration_polling_minutes > 10) {
        errors.push('Orchestration polling interval must be an integer between 1 and 10 minutes');
      }
    }

    if (lifecycle.partial_data_delivery !== undefined && typeof lifecycle.partial_data_delivery !== 'boolean') {
      errors.push('Partial data delivery must be a boolean value');
    }
  }

  // Validate retry configuration if present
  if (configData.retry) {
    const retryValidation = validateRetryConfig(configData.retry);
    if (!retryValidation.valid) {
      errors.push(...retryValidation.errors);
    }
  }

  // Validate fallback configuration if present
  if (configData.fallback) {
    const fallbackValidation = validateFallbackConfig(configData.fallback);
    if (!fallbackValidation.valid) {
      errors.push(...fallbackValidation.errors);
    }
  }

  // Validate version format if present
  if (configData.version !== undefined) {
    if (typeof configData.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(configData.version)) {
      errors.push('Version must be in semantic versioning format (e.g., 1.0.0)');
    }
  }

  // Validate change log if present
  if (configData.change_log !== undefined) {
    if (!Array.isArray(configData.change_log)) {
      errors.push('Change log must be an array');
    } else {
      configData.change_log.forEach((entry, index) => {
        if (!entry.timestamp || !entry.user || !entry.action) {
          errors.push(`Change log entry ${index + 1} must have timestamp, user, and action fields`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates retry configuration
 * @param {Object} retryConfig - Retry configuration to validate
 * @returns {Object} Validation result
 */
export function validateRetryConfig(retryConfig) {
  const errors = [];
  const validComponents = ['chart_generation', 'llm_analysis', 'data_collection', 'delivery'];

  for (const [component, config] of Object.entries(retryConfig)) {
    if (!validComponents.includes(component)) {
      errors.push(`Invalid retry component: ${component}`);
      continue;
    }

    if (typeof config !== 'object' || config === null) {
      errors.push(`Retry config for ${component} must be an object`);
      continue;
    }

    // Validate max_retries
    if (config.max_retries !== undefined) {
      if (!Number.isInteger(config.max_retries) || config.max_retries < 0 || config.max_retries > 10) {
        errors.push(`Max retries for ${component} must be an integer between 0 and 10`);
      }
    }

    // Validate backoff_intervals
    if (config.backoff_intervals !== undefined) {
      if (!Array.isArray(config.backoff_intervals)) {
        errors.push(`Backoff intervals for ${component} must be an array`);
      } else {
        for (const interval of config.backoff_intervals) {
          if (!Number.isInteger(interval) || interval < 100 || interval > 60000) {
            errors.push(`Backoff intervals for ${component} must be integers between 100 and 60000 milliseconds`);
            break;
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates fallback configuration
 * @param {Object} fallbackConfig - Fallback configuration to validate
 * @returns {Object} Validation result
 */
export function validateFallbackConfig(fallbackConfig) {
  const errors = [];
  const validComponents = ['chart_generation', 'llm_analysis', 'data_collection', 'delivery'];

  for (const [component, config] of Object.entries(fallbackConfig)) {
    if (!validComponents.includes(component)) {
      errors.push(`Invalid fallback component: ${component}`);
      continue;
    }

    if (typeof config !== 'object' || config === null) {
      errors.push(`Fallback config for ${component} must be an object`);
      continue;
    }

    // Component-specific validation
    if (component === 'chart_generation') {
      if (config.fallback_image_url !== undefined) {
        try {
          new URL(config.fallback_image_url);
        } catch (urlError) {
          errors.push(`Fallback image URL for ${component} must be a valid URL`);
        }
      }

      if (config.fallback_text !== undefined && typeof config.fallback_text !== 'string') {
        errors.push(`Fallback text for ${component} must be a string`);
      }
    }

    if (component === 'llm_analysis') {
      if (config.disclaimer !== undefined && typeof config.disclaimer !== 'string') {
        errors.push(`Disclaimer for ${component} must be a string`);
      }
    }

    if (component === 'data_collection') {
      if (config.skip_on_failure !== undefined && typeof config.skip_on_failure !== 'boolean') {
        errors.push(`Skip on failure for ${component} must be a boolean`);
      }

      if (config.log_errors !== undefined && typeof config.log_errors !== 'boolean') {
        errors.push(`Log errors for ${component} must be a boolean`);
      }
    }

    if (component === 'delivery') {
      if (config.retry_on_next_cycle !== undefined && typeof config.retry_on_next_cycle !== 'boolean') {
        errors.push(`Retry on next cycle for ${component} must be a boolean`);
      }

      if (config.alert_admin !== undefined && typeof config.alert_admin !== 'boolean') {
        errors.push(`Alert admin for ${component} must be a boolean`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Generates a unique KPI ID from the KPI name
 * @param {string} name - KPI name
 * @returns {string} Generated KPI ID
 */
export function generateKPIId(name) {
  // Convert to lowercase, replace spaces and special characters with hyphens
  const baseId = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Add timestamp suffix to ensure uniqueness
  const timestamp = Date.now().toString(36);
  
  return `${baseId}-${timestamp}`;
}

/**
 * Validates analysis configuration for a KPI
 * @param {Object} analysisConfig - Analysis configuration to validate
 * @returns {Array} Array of validation errors
 */
function validateAnalysisConfig(analysisConfig) {
  const errors = [];

  // Validate chart method
  if (analysisConfig.chart_method !== undefined) {
    const validChartMethods = ['external', 'n8n', 'cloudflare', 'none'];
    if (!validChartMethods.includes(analysisConfig.chart_method)) {
      errors.push('Chart method must be one of: external, n8n, cloudflare, none');
    }
  }

  // Validate chart type
  if (analysisConfig.chart_type !== undefined) {
    const validChartTypes = ['line', 'candlestick', 'bar', 'area'];
    if (!validChartTypes.includes(analysisConfig.chart_type)) {
      errors.push('Chart type must be one of: line, candlestick, bar, area');
    }
  }

  // Validate LLM priority
  if (analysisConfig.llm_priority !== undefined) {
    const validPriorities = ['high', 'standard', 'low', 'none'];
    if (!validPriorities.includes(analysisConfig.llm_priority)) {
      errors.push('LLM priority must be one of: high, standard, low, none');
    }
  }

  // Validate custom prompt
  if (analysisConfig.custom_prompt !== undefined) {
    if (typeof analysisConfig.custom_prompt !== 'string') {
      errors.push('Custom prompt must be a string');
    } else if (analysisConfig.custom_prompt.length > 2000) {
      errors.push('Custom prompt must be 2000 characters or less');
    }
  }

  // Validate retention days
  if (analysisConfig.retention_days !== undefined) {
    if (!Number.isInteger(analysisConfig.retention_days) || 
        analysisConfig.retention_days < 30 || 
        analysisConfig.retention_days > 3650) {
      errors.push('Retention days must be an integer between 30 and 3650');
    }
  }

  // Validate alert thresholds
  if (analysisConfig.alert_high !== undefined && analysisConfig.alert_high !== null) {
    if (typeof analysisConfig.alert_high !== 'number' || !isFinite(analysisConfig.alert_high)) {
      errors.push('High alert threshold must be a valid number');
    }
  }

  if (analysisConfig.alert_low !== undefined && analysisConfig.alert_low !== null) {
    if (typeof analysisConfig.alert_low !== 'number' || !isFinite(analysisConfig.alert_low)) {
      errors.push('Low alert threshold must be a valid number');
    }
  }

  // Validate that high threshold is greater than low threshold if both are set
  if (analysisConfig.alert_high !== undefined && analysisConfig.alert_high !== null &&
      analysisConfig.alert_low !== undefined && analysisConfig.alert_low !== null) {
    if (analysisConfig.alert_high <= analysisConfig.alert_low) {
      errors.push('High alert threshold must be greater than low alert threshold');
    }
  }

  return errors;
}

/**
 * Validates a cron expression (basic validation)
 * @param {string} cronExpression - Cron expression to validate
 * @returns {Object} Validation result
 */
export function validateCronExpression(cronExpression) {
  const errors = [];

  if (typeof cronExpression !== 'string') {
    errors.push('Cron expression must be a string');
    return { valid: false, errors };
  }

  const parts = cronExpression.trim().split(/\s+/);
  
  if (parts.length !== 5) {
    errors.push('Cron expression must have exactly 5 parts: minute hour day month weekday');
    return { valid: false, errors };
  }

  // Basic validation for each part
  const [minute, hour, day, month, weekday] = parts;

  // Validate minute (0-59)
  if (!isValidCronField(minute, 0, 59)) {
    errors.push('Invalid minute field (must be 0-59, *, or valid expression)');
  }

  // Validate hour (0-23)
  if (!isValidCronField(hour, 0, 23)) {
    errors.push('Invalid hour field (must be 0-23, *, or valid expression)');
  }

  // Validate day (1-31)
  if (!isValidCronField(day, 1, 31)) {
    errors.push('Invalid day field (must be 1-31, *, or valid expression)');
  }

  // Validate month (1-12)
  if (!isValidCronField(month, 1, 12)) {
    errors.push('Invalid month field (must be 1-12, *, or valid expression)');
  }

  // Validate weekday (0-7, where 0 and 7 are Sunday)
  if (!isValidCronField(weekday, 0, 7)) {
    errors.push('Invalid weekday field (must be 0-7, *, or valid expression)');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates a single cron field
 * @param {string} field - Cron field to validate
 * @param {number} min - Minimum valid value
 * @param {number} max - Maximum valid value
 * @returns {boolean} Whether the field is valid
 */
function isValidCronField(field, min, max) {
  // Allow wildcard
  if (field === '*') return true;

  // Allow ranges (e.g., 1-5)
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number);
    return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
  }

  // Allow lists (e.g., 1,3,5)
  if (field.includes(',')) {
    const values = field.split(',').map(Number);
    return values.every(val => !isNaN(val) && val >= min && val <= max);
  }

  // Allow step values (e.g., */5)
  if (field.includes('/')) {
    const [base, step] = field.split('/');
    const stepNum = Number(step);
    return (base === '*' || isValidCronField(base, min, max)) && 
           !isNaN(stepNum) && stepNum > 0 && stepNum <= max;
  }

  // Single number
  const num = Number(field);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * Validates schedule configuration
 * @param {Object} scheduleData - Schedule configuration to validate
 * @returns {Object} Validation result
 */
export function validateScheduleConfig(scheduleData) {
  const errors = [];

  // Validate cron expression
  if (scheduleData.cron_expression) {
    const cronValidation = validateCronExpression(scheduleData.cron_expression);
    if (!cronValidation.valid) {
      errors.push(...cronValidation.errors);
    }
  }

  // Validate timezone
  if (scheduleData.timezone !== undefined) {
    if (typeof scheduleData.timezone !== 'string') {
      errors.push('Timezone must be a string');
    }
    // Basic timezone validation - in production, use a proper timezone library
    const validTimezones = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'];
    if (!validTimezones.includes(scheduleData.timezone) && !scheduleData.timezone.match(/^[A-Z][a-z]+\/[A-Z][a-z_]+$/)) {
      // Allow common timezone format but warn about validation
      console.warn(`Timezone ${scheduleData.timezone} not in common list, but format appears valid`);
    }
  }

  // Validate enabled flag
  if (scheduleData.enabled !== undefined && typeof scheduleData.enabled !== 'boolean') {
    errors.push('Enabled must be a boolean value');
  }

  // Validate timeout minutes
  if (scheduleData.job_timeout_minutes !== undefined) {
    if (!Number.isInteger(scheduleData.job_timeout_minutes) || 
        scheduleData.job_timeout_minutes < 1 || 
        scheduleData.job_timeout_minutes > 120) {
      errors.push('Job timeout must be an integer between 1 and 120 minutes');
    }
  }

  // Validate orchestration polling minutes
  if (scheduleData.orchestration_polling_minutes !== undefined) {
    if (!Number.isInteger(scheduleData.orchestration_polling_minutes) || 
        scheduleData.orchestration_polling_minutes < 1 || 
        scheduleData.orchestration_polling_minutes > 10) {
      errors.push('Orchestration polling interval must be an integer between 1 and 10 minutes');
    }
  }

  // Validate schedule name
  if (scheduleData.name !== undefined) {
    if (typeof scheduleData.name !== 'string' || scheduleData.name.trim().length === 0) {
      errors.push('Schedule name must be a non-empty string');
    } else if (scheduleData.name.length > 100) {
      errors.push('Schedule name must be 100 characters or less');
    }
  }

  // Validate schedule type
  if (scheduleData.type !== undefined) {
    const validTypes = ['kpi_collection', 'maintenance', 'backup', 'cleanup'];
    if (!validTypes.includes(scheduleData.type)) {
      errors.push(`Schedule type must be one of: ${validTypes.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validates complete configuration object
 * @param {Object} config - Complete configuration object
 * @returns {Object} Validation result with detailed breakdown
 */
export function validateCompleteConfiguration(config) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    sections: {}
  };

  // Validate system configuration
  if (config.system) {
    const systemValidation = validateSystemConfig(config.system);
    results.sections.system = systemValidation;
    if (!systemValidation.valid) {
      results.valid = false;
      results.errors.push(...systemValidation.errors.map(err => `System: ${err}`));
    }
  }

  // Validate schedule configuration
  if (config.schedule) {
    const scheduleValidation = validateScheduleConfig(config.schedule);
    results.sections.schedule = scheduleValidation;
    if (!scheduleValidation.valid) {
      results.valid = false;
      results.errors.push(...scheduleValidation.errors.map(err => `Schedule: ${err}`));
    }
  }

  // Validate retry configuration
  if (config.retry) {
    const retryValidation = validateRetryConfig(config.retry);
    results.sections.retry = retryValidation;
    if (!retryValidation.valid) {
      results.valid = false;
      results.errors.push(...retryValidation.errors.map(err => `Retry: ${err}`));
    }
  }

  // Validate fallback configuration
  if (config.fallback) {
    const fallbackValidation = validateFallbackConfig(config.fallback);
    results.sections.fallback = fallbackValidation;
    if (!fallbackValidation.valid) {
      results.valid = false;
      results.errors.push(...fallbackValidation.errors.map(err => `Fallback: ${err}`));
    }
  }

  // Check for required sections
  const requiredSections = ['system'];
  for (const section of requiredSections) {
    if (!config[section]) {
      results.warnings.push(`Missing recommended configuration section: ${section}`);
    }
  }

  return results;
}