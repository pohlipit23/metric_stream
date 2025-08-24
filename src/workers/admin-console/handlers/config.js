/**
 * System Configuration Management Handler
 * Handles system-wide configuration settings
 */

import { addCorsHeaders } from '../middleware/cors.js';
import { validateSystemConfig, validateRetryConfig, validateFallbackConfig, validateScheduleConfig } from '../utils/validation.js';
import { KVOperations } from '../utils/kv-operations.js';
import { 
  formatSuccessResponse, 
  formatErrorResponse, 
  withErrorHandling, 
  validateRequestBody,
  handleKVOperation,
  validateRequiredParams,
  sanitizeConfigForResponse,
  logConfigurationChange,
  ValidationError,
  ConfigurationNotFoundError
} from '../utils/error-handling.js';

/**
 * Handles all configuration-related API endpoints
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Object} user - Authenticated user information
 * @returns {Response} API response
 */
export async function handleConfigEndpoints(request, env, user) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    let response;

    // Route to appropriate handlers with error handling
    const routes = {
      'GET /api/config': () => withErrorHandling(getSystemConfig, 'get-system-config')(env),
      'PUT /api/config': () => withErrorHandling(updateSystemConfig, 'update-system-config')(request, env, user),
      'PUT /api/config/retry': () => withErrorHandling(updateRetryConfig, 'update-retry-config')(request, env, user),
      'PUT /api/config/fallback': () => withErrorHandling(updateFallbackConfig, 'update-fallback-config')(request, env, user),
      'GET /api/config/schedules': () => withErrorHandling(getScheduleConfig, 'get-schedule-config')(env),
      'PUT /api/config/schedules': () => withErrorHandling(updateScheduleConfig, 'update-schedule-config')(request, env, user),
      'POST /api/config/schedules/test': () => withErrorHandling(testScheduleExpression, 'test-schedule-expression')(request, env, user),
      'POST /api/config/schedules/next-runs': () => withErrorHandling(getNextScheduleRuns, 'get-next-schedule-runs')(request, env, user),
      'GET /api/config/schedules/status': () => withErrorHandling(getScheduleStatus, 'get-schedule-status')(env),
      'POST /api/config/schedules/enable': () => withErrorHandling(enableSchedule, 'enable-schedule')(request, env, user),
      'POST /api/config/schedules/disable': () => withErrorHandling(disableSchedule, 'disable-schedule')(request, env, user),
      'GET /api/config/schedules/cron-triggers': () => withErrorHandling(getCronTriggers, 'get-cron-triggers')(env),
      'POST /api/config/schedules/cron-triggers': () => withErrorHandling(updateCronTriggers, 'update-cron-triggers')(request, env, user),
      'GET /api/schedules': () => withErrorHandling(getSchedules, 'get-schedules')(env),
      'POST /api/schedules': () => withErrorHandling(createSchedule, 'create-schedule')(request, env, user),
      'POST /api/schedules/validate': () => withErrorHandling(validateScheduleExpression, 'validate-schedule-expression')(request, env, user),
      'GET /api/config/health': () => withErrorHandling(getConfigurationHealth, 'get-config-health')(env),
      'GET /api/config/backups': () => withErrorHandling(getConfigurationBackups, 'get-config-backups')(env),
      'POST /api/config/restore': () => withErrorHandling(restoreConfigurationBackup, 'restore-config-backup')(request, env, user)
    };

    const routeKey = `${method} ${path}`;
    
    // Handle dynamic routes
    if (path.startsWith('/api/schedules/') && path !== '/api/schedules/validate') {
      const scheduleId = path.split('/')[3];
      if (!scheduleId) {
        throw new ValidationError('Schedule ID is required');
      }

      if (method === 'GET') {
        response = await withErrorHandling(getSchedule, 'get-schedule')(env, scheduleId);
      } else if (method === 'PUT') {
        response = await withErrorHandling(updateSchedule, 'update-schedule')(request, env, user, scheduleId);
      } else if (method === 'DELETE') {
        response = await withErrorHandling(deleteSchedule, 'delete-schedule')(env, user, scheduleId);
      } else {
        throw new ValidationError(`Method ${method} not allowed for schedule operations`);
      }
    } else if (routes[routeKey]) {
      response = await routes[routeKey]();
    } else {
      response = formatErrorResponse(
        new ConfigurationNotFoundError('endpoint', path),
        'route-handler'
      );
    }

    return addCorsHeaders(response);

  } catch (error) {
    console.error('Config endpoint error:', error);
    const errorResponse = formatErrorResponse(error, 'config-endpoint-handler');
    return addCorsHeaders(errorResponse);
  }
}

/**
 * Get current system configuration
 */
async function getSystemConfig(env) {
  const config = await handleKVOperation(
    () => KVOperations.getSystemConfig(env.KV_STORE),
    'get-system-config'
  );
  
  // Get configuration health status
  const health = await handleKVOperation(
    () => KVOperations.getConfigurationHealth(env.KV_STORE),
    'get-config-health'
  );
  
  // Add system status information
  const systemStatus = {
    kv_store_connected: true,
    last_updated: config.updated_at || config.created_at,
    configuration_version: config.version || '1.0.0',
    health_status: health.overall_status
  };
  
  const sanitizedConfig = sanitizeConfigForResponse(config);
  
  return formatSuccessResponse({
    ...sanitizedConfig,
    system_status: systemStatus,
    health: health
  }, 'System configuration retrieved successfully');
}

/**
 * Update system configuration
 */
async function updateSystemConfig(request, env, user) {
  // Validate and parse request body
  const configData = await validateRequestBody(request, validateSystemConfig, 'system configuration');
  
  // Get existing config and merge with updates
  const existingConfig = await handleKVOperation(
    () => KVOperations.getSystemConfig(env.KV_STORE),
    'get-existing-system-config'
  );
  
  const updatedConfig = {
    ...existingConfig,
    ...configData,
    version: incrementVersion(existingConfig.version || '1.0.0'),
    updated_at: new Date().toISOString(),
    updated_by: user.email,
    change_log: [
      ...(existingConfig.change_log || []),
      {
        timestamp: new Date().toISOString(),
        user: user.email,
        changes: Object.keys(configData),
        action: 'update'
      }
    ].slice(-10) // Keep last 10 changes
  };

  // Save updated configuration with backup
  await handleKVOperation(
    () => KVOperations.saveSystemConfigWithValidation(env.KV_STORE, updatedConfig, user.email),
    'save-system-config-with-backup'
  );

  // Log configuration change
  logConfigurationChange('update', 'system', 'main', user, configData);

  const sanitizedConfig = sanitizeConfigForResponse(updatedConfig);
  
  return formatSuccessResponse(
    sanitizedConfig,
    'System configuration updated successfully'
  );
}

/**
 * Update retry configuration for all components
 */
async function updateRetryConfig(request, env, user) {
  // Validate and parse request body
  const retryConfig = await validateRequestBody(request, validateRetryConfig, 'retry configuration');
  
  // Get existing config and update retry settings
  const existingConfig = await handleKVOperation(
    () => KVOperations.getSystemConfig(env.KV_STORE),
    'get-existing-config-for-retry-update'
  );
  
  const updatedConfig = {
    ...existingConfig,
    retry: retryConfig,
    version: incrementVersion(existingConfig.version || '1.0.0'),
    updated_at: new Date().toISOString(),
    updated_by: user.email,
    change_log: [
      ...(existingConfig.change_log || []),
      {
        timestamp: new Date().toISOString(),
        user: user.email,
        changes: ['retry'],
        action: 'update_retry'
      }
    ].slice(-10)
  };

  // Save updated configuration
  await handleKVOperation(
    () => KVOperations.saveSystemConfig(env.KV_STORE, updatedConfig),
    'save-retry-config-update'
  );

  // Log configuration change
  logConfigurationChange('update', 'retry', 'system', user, retryConfig);

  return formatSuccessResponse(
    sanitizeConfigForResponse(updatedConfig.retry),
    'Retry configuration updated successfully'
  );
}

/**
 * Update fallback configuration
 */
async function updateFallbackConfig(request, env, user) {
  // Validate and parse request body
  const fallbackConfig = await validateRequestBody(request, validateFallbackConfig, 'fallback configuration');
  
  // Get existing config and update fallback settings
  const existingConfig = await handleKVOperation(
    () => KVOperations.getSystemConfig(env.KV_STORE),
    'get-existing-config-for-fallback-update'
  );
  
  const updatedConfig = {
    ...existingConfig,
    fallback: fallbackConfig,
    version: incrementVersion(existingConfig.version || '1.0.0'),
    updated_at: new Date().toISOString(),
    updated_by: user.email,
    change_log: [
      ...(existingConfig.change_log || []),
      {
        timestamp: new Date().toISOString(),
        user: user.email,
        changes: ['fallback'],
        action: 'update_fallback'
      }
    ].slice(-10)
  };

  // Save updated configuration
  await handleKVOperation(
    () => KVOperations.saveSystemConfig(env.KV_STORE, updatedConfig),
    'save-fallback-config-update'
  );

  // Log configuration change
  logConfigurationChange('update', 'fallback', 'system', user, fallbackConfig);

  return formatSuccessResponse(
    sanitizeConfigForResponse(updatedConfig.fallback),
    'Fallback configuration updated successfully'
  );
}

/**
 * Get schedule configuration
 */
async function getScheduleConfig(env) {
  try {
    const scheduleConfig = await KVOperations.getScheduleConfig(env.KV_STORE);
    
    return new Response(JSON.stringify({
      success: true,
      data: scheduleConfig
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting schedule config:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get schedule configuration',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Update schedule configuration
 */
async function updateScheduleConfig(request, env, user) {
  try {
    const scheduleData = await request.json();
    
    // Basic validation for schedule configuration
    if (!scheduleData.cron_expression) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: ['cron_expression is required']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate cron expression format (basic validation)
    const cronParts = scheduleData.cron_expression.split(' ');
    if (cronParts.length !== 5) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: ['Invalid cron expression format. Expected 5 parts: minute hour day month weekday']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const scheduleConfig = {
      cron_expression: scheduleData.cron_expression,
      timezone: scheduleData.timezone || 'UTC',
      enabled: scheduleData.enabled !== false,
      job_timeout_minutes: scheduleData.job_timeout_minutes || 30,
      orchestration_polling_minutes: scheduleData.orchestration_polling_minutes || 2,
      updated_at: new Date().toISOString(),
      updated_by: user.email
    };

    // Save schedule configuration
    await KVOperations.saveScheduleConfig(env.KV_STORE, scheduleConfig);

    return new Response(JSON.stringify({
      success: true,
      data: scheduleConfig,
      message: 'Schedule configuration updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating schedule config:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update schedule configuration',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
/**

 * Test a cron expression for validity and provide next execution times
 */
async function testScheduleExpression(request, env, user) {
  try {
    const { cron_expression, timezone = 'UTC' } = await request.json();
    
    if (!cron_expression) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: ['cron_expression is required']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate cron expression format
    const validation = validateCronExpressionFormat(cron_expression);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: 'Invalid cron expression',
        details: [validation.message]
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculate next execution times
    const nextRuns = calculateNextRuns(cron_expression, timezone, 5);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        valid: true,
        cron_expression,
        timezone,
        description: describeCronExpression(cron_expression),
        next_runs: nextRuns,
        test_timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error testing schedule expression:', error);
    return new Response(JSON.stringify({
      error: 'Failed to test schedule expression',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get next execution times for a cron expression
 */
async function getNextScheduleRuns(request, env, user) {
  try {
    const { cron_expression, timezone = 'UTC', count = 10 } = await request.json();
    
    if (!cron_expression) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: ['cron_expression is required']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const validation = validateCronExpressionFormat(cron_expression);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: 'Invalid cron expression',
        details: [validation.message]
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const nextRuns = calculateNextRuns(cron_expression, timezone, Math.min(count, 20));
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        cron_expression,
        timezone,
        next_runs: nextRuns,
        calculated_at: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error calculating next schedule runs:', error);
    return new Response(JSON.stringify({
      error: 'Failed to calculate next schedule runs',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Validate cron expression format
 */
function validateCronExpressionFormat(cronExpr) {
  if (!cronExpr) {
    return { valid: false, message: 'Cron expression is required' };
  }

  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { 
      valid: false, 
      message: 'Cron expression must have 5 parts: minute hour day month weekday' 
    };
  }

  const [minute, hour, day, month, weekday] = parts;

  // Validate each field
  const validations = [
    { field: minute, name: 'minute', min: 0, max: 59 },
    { field: hour, name: 'hour', min: 0, max: 23 },
    { field: day, name: 'day', min: 1, max: 31 },
    { field: month, name: 'month', min: 1, max: 12 },
    { field: weekday, name: 'weekday', min: 0, max: 7 }
  ];

  for (const validation of validations) {
    if (!isValidCronField(validation.field, validation.min, validation.max)) {
      return { 
        valid: false, 
        message: `Invalid ${validation.name} field (${validation.min}-${validation.max})` 
      };
    }
  }

  return { valid: true, message: 'Valid cron expression' };
}

/**
 * Check if a cron field is valid
 */
function isValidCronField(field, min, max) {
  if (field === '*') return true;
  
  // Handle ranges (e.g., 1-5)
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number);
    return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
  }
  
  // Handle lists (e.g., 1,3,5)
  if (field.includes(',')) {
    const values = field.split(',').map(Number);
    return values.every(val => !isNaN(val) && val >= min && val <= max);
  }
  
  // Handle step values (e.g., */5)
  if (field.includes('/')) {
    const [base, step] = field.split('/');
    if (base === '*') return !isNaN(Number(step)) && Number(step) > 0;
    return isValidCronField(base, min, max) && !isNaN(Number(step)) && Number(step) > 0;
  }
  
  // Handle single number
  const num = Number(field);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * Calculate next execution times for a cron expression
 */
function calculateNextRuns(cronExpr, timezone, count) {
  const parts = cronExpr.split(' ');
  const [minuteExpr, hourExpr, dayExpr, monthExpr, weekdayExpr] = parts;
  
  const now = new Date();
  const nextRuns = [];
  let currentDate = new Date(now);
  
  // Simple implementation - for production, consider using a proper cron library
  for (let i = 0; i < count && nextRuns.length < count; i++) {
    currentDate = new Date(currentDate.getTime() + (i === 0 ? 60000 : 60000)); // Start from next minute
    
    const nextRun = findNextExecution(cronExpr, currentDate, timezone);
    if (nextRun && !nextRuns.some(run => run.timestamp === nextRun.timestamp)) {
      nextRuns.push(nextRun);
      currentDate = new Date(nextRun.timestamp);
    }
    
    // Prevent infinite loops
    if (i > 1000) break;
  }
  
  return nextRuns;
}

/**
 * Find the next execution time for a cron expression
 */
function findNextExecution(cronExpr, fromDate, timezone) {
  const parts = cronExpr.split(' ');
  const [minuteExpr, hourExpr, dayExpr, monthExpr, weekdayExpr] = parts;
  
  // Simple calculation for common patterns
  const date = new Date(fromDate);
  
  // Handle simple daily pattern (0 9 * * *)
  if (minuteExpr !== '*' && hourExpr !== '*' && dayExpr === '*' && monthExpr === '*' && weekdayExpr === '*') {
    const minute = parseInt(minuteExpr);
    const hour = parseInt(hourExpr);
    
    const nextRun = new Date(date);
    nextRun.setHours(hour, minute, 0, 0);
    
    // If time has passed today, move to tomorrow
    if (nextRun <= date) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return {
      timestamp: nextRun.toISOString(),
      local_time: nextRun.toLocaleString('en-US', { timeZone: timezone }),
      description: `Daily at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    };
  }
  
  // Handle hourly pattern (0 * * * *)
  if (minuteExpr !== '*' && hourExpr === '*' && dayExpr === '*' && monthExpr === '*' && weekdayExpr === '*') {
    const minute = parseInt(minuteExpr);
    
    const nextRun = new Date(date);
    nextRun.setMinutes(minute, 0, 0);
    
    // If time has passed this hour, move to next hour
    if (nextRun <= date) {
      nextRun.setHours(nextRun.getHours() + 1);
    }
    
    return {
      timestamp: nextRun.toISOString(),
      local_time: nextRun.toLocaleString('en-US', { timeZone: timezone }),
      description: `Hourly at minute ${minute}`
    };
  }
  
  // Handle every N minutes pattern (*/N * * * *)
  if (minuteExpr.includes('*/') && hourExpr === '*' && dayExpr === '*' && monthExpr === '*' && weekdayExpr === '*') {
    const interval = parseInt(minuteExpr.split('/')[1]);
    
    const nextRun = new Date(date);
    const currentMinute = nextRun.getMinutes();
    const nextMinute = Math.ceil(currentMinute / interval) * interval;
    
    if (nextMinute >= 60) {
      nextRun.setHours(nextRun.getHours() + 1);
      nextRun.setMinutes(0, 0, 0);
    } else {
      nextRun.setMinutes(nextMinute, 0, 0);
    }
    
    return {
      timestamp: nextRun.toISOString(),
      local_time: nextRun.toLocaleString('en-US', { timeZone: timezone }),
      description: `Every ${interval} minutes`
    };
  }
  
  // Fallback for complex expressions - just add an hour
  const nextRun = new Date(date.getTime() + 60 * 60 * 1000);
  return {
    timestamp: nextRun.toISOString(),
    local_time: nextRun.toLocaleString('en-US', { timeZone: timezone }),
    description: 'Complex schedule (approximate)'
  };
}

/**
 * Describe a cron expression in human-readable format
 */
function describeCronExpression(cronExpr) {
  const parts = cronExpr.split(' ');
  if (parts.length !== 5) return cronExpr;
  
  const [minute, hour, day, month, weekday] = parts;
  
  // Common patterns
  const patterns = {
    '0 9 * * *': 'Daily at 9:00 AM',
    '0 0 * * *': 'Daily at midnight',
    '0 12 * * *': 'Daily at noon',
    '0 9 * * 1': 'Weekly on Monday at 9:00 AM',
    '0 9 1 * *': 'Monthly on the 1st at 9:00 AM',
    '*/15 * * * *': 'Every 15 minutes',
    '0 */6 * * *': 'Every 6 hours',
    '0 * * * *': 'Every hour'
  };
  
  if (patterns[cronExpr]) return patterns[cronExpr];
  
  // Generic description
  let desc = 'At ';
  if (minute === '0') desc += `${hour}:00`;
  else if (minute === '*') desc += `every minute of hour ${hour}`;
  else desc += `${hour}:${minute.padStart(2, '0')}`;
  
  if (day !== '*') desc += ` on day ${day}`;
  if (month !== '*') desc += ` of month ${month}`;
  if (weekday !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    desc += ` on ${days[parseInt(weekday)] || `weekday ${weekday}`}`;
  }
  
  return desc;
}
/**
 * 
Get current schedule status and execution history
 */
async function getScheduleStatus(env) {
  try {
    const scheduleConfig = await KVOperations.getScheduleConfig(env.KV_STORE);
    
    // Get recent execution history (if available)
    const executionHistory = await getRecentExecutions(env.KV_STORE);
    
    // Calculate next execution time
    let nextExecution = null;
    if (scheduleConfig.enabled && scheduleConfig.cron_expression) {
      const nextRuns = calculateNextRuns(scheduleConfig.cron_expression, scheduleConfig.timezone, 1);
      nextExecution = nextRuns.length > 0 ? nextRuns[0] : null;
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        config: scheduleConfig,
        status: scheduleConfig.enabled ? 'enabled' : 'disabled',
        next_execution: nextExecution,
        execution_history: executionHistory,
        last_check: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting schedule status:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get schedule status',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Enable schedule execution
 */
async function enableSchedule(request, env, user) {
  try {
    const scheduleConfig = await KVOperations.getScheduleConfig(env.KV_STORE);
    
    const updatedConfig = {
      ...scheduleConfig,
      enabled: true,
      updated_at: new Date().toISOString(),
      updated_by: user.email
    };

    await KVOperations.saveScheduleConfig(env.KV_STORE, updatedConfig);

    return new Response(JSON.stringify({
      success: true,
      data: updatedConfig,
      message: 'Schedule enabled successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error enabling schedule:', error);
    return new Response(JSON.stringify({
      error: 'Failed to enable schedule',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Disable schedule execution
 */
async function disableSchedule(request, env, user) {
  try {
    const scheduleConfig = await KVOperations.getScheduleConfig(env.KV_STORE);
    
    const updatedConfig = {
      ...scheduleConfig,
      enabled: false,
      updated_at: new Date().toISOString(),
      updated_by: user.email
    };

    await KVOperations.saveScheduleConfig(env.KV_STORE, updatedConfig);

    return new Response(JSON.stringify({
      success: true,
      data: updatedConfig,
      message: 'Schedule disabled successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error disabling schedule:', error);
    return new Response(JSON.stringify({
      error: 'Failed to disable schedule',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get recent execution history from KV store
 */
async function getRecentExecutions(kvStore) {
  try {
    // Look for execution records in KV store
    const listResult = await kvStore.list({ prefix: 'execution:' });
    const executions = [];

    for (const key of listResult.keys.slice(0, 10)) { // Get last 10 executions
      const executionData = await kvStore.get(key.name, 'json');
      if (executionData) {
        executions.push(executionData);
      }
    }

    // Sort by timestamp (newest first)
    return executions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  } catch (error) {
    console.error('Error getting execution history:', error);
    return [];
  }
}/
**
 * Get current Cloudflare Cron Triggers configuration
 */
async function getCronTriggers(env) {
  try {
    // In a real implementation, this would call the Cloudflare API
    // For now, we'll return the current schedule configuration
    const scheduleConfig = await KVOperations.getScheduleConfig(env.KV_STORE);
    
    // Simulate cron trigger status
    const cronTriggers = {
      scheduler_worker: {
        name: 'scheduler-worker',
        cron: scheduleConfig.cron_expression || '0 9 * * *',
        enabled: scheduleConfig.enabled || false,
        last_modified: scheduleConfig.updated_at || new Date().toISOString(),
        next_scheduled_time: scheduleConfig.enabled ? calculateNextRuns(scheduleConfig.cron_expression, scheduleConfig.timezone, 1)[0]?.timestamp : null
      }
    };
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        triggers: cronTriggers,
        total_triggers: 1,
        account_limits: {
          max_triggers: 5,
          current_usage: 1
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting cron triggers:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get cron triggers',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Update Cloudflare Cron Triggers
 */
async function updateCronTriggers(request, env, user) {
  try {
    const { cron_expression, enabled } = await request.json();
    
    if (!cron_expression) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: ['cron_expression is required']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate cron expression
    const validation = validateCronExpressionFormat(cron_expression);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: 'Invalid cron expression',
        details: [validation.message]
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // In a real implementation, this would call the Cloudflare API to update cron triggers
    // For now, we'll simulate the API call and update our local configuration
    
    const result = await simulateCloudflareAPICall(env, {
      action: 'update_cron_trigger',
      worker_name: 'scheduler-worker',
      cron_expression,
      enabled
    });

    if (!result.success) {
      return new Response(JSON.stringify({
        error: 'Failed to update Cloudflare cron trigger',
        details: [result.error]
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update our local schedule configuration to match
    const scheduleConfig = await KVOperations.getScheduleConfig(env.KV_STORE);
    const updatedConfig = {
      ...scheduleConfig,
      cron_expression,
      enabled: enabled !== false,
      updated_at: new Date().toISOString(),
      updated_by: user.email,
      cloudflare_trigger_id: result.trigger_id
    };

    await KVOperations.saveScheduleConfig(env.KV_STORE, updatedConfig);

    return new Response(JSON.stringify({
      success: true,
      data: {
        config: updatedConfig,
        cloudflare_response: result,
        message: 'Cron trigger updated successfully'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating cron triggers:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update cron triggers',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Simulate Cloudflare API call for cron trigger management
 * In production, this would make actual API calls to Cloudflare
 */
async function simulateCloudflareAPICall(env, params) {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate different responses based on action
    switch (params.action) {
      case 'update_cron_trigger':
        // Simulate successful trigger update
        return {
          success: true,
          trigger_id: `trigger_${Date.now()}`,
          worker_name: params.worker_name,
          cron: params.cron_expression,
          enabled: params.enabled,
          created_on: new Date().toISOString(),
          modified_on: new Date().toISOString()
        };
        
      case 'list_cron_triggers':
        // Simulate listing triggers
        return {
          success: true,
          triggers: [
            {
              id: `trigger_${Date.now()}`,
              worker_name: 'scheduler-worker',
              cron: '0 9 * * *',
              enabled: true,
              created_on: new Date().toISOString(),
              modified_on: new Date().toISOString()
            }
          ]
        };
        
      default:
        return {
          success: false,
          error: 'Unknown action'
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Increment version number (semantic versioning)
 * @param {string} currentVersion - Current version string
 * @returns {string} Incremented version
 */
function incrementVersion(currentVersion) {
  try {
    const parts = currentVersion.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0] || '1'}.${parts[1] || '0'}.${patch}`;
  } catch (error) {
    return '1.0.1';
  }
}

/**
 * Get all schedules
 */
async function getSchedules(env) {
  try {
    // Get main schedule configuration
    const mainSchedule = await KVOperations.getScheduleConfig(env.KV_STORE);
    
    // Get any additional schedules from KV (future enhancement)
    const schedules = [
      {
        id: 'main-scheduler',
        name: 'Main KPI Collection Schedule',
        type: 'kpi_collection',
        ...mainSchedule,
        status: mainSchedule.enabled ? 'active' : 'inactive'
      }
    ];
    
    return new Response(JSON.stringify({
      success: true,
      data: schedules,
      total: schedules.length,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting schedules:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get schedules',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Create a new schedule
 */
async function createSchedule(request, env, user) {
  try {
    const scheduleData = await request.json();
    
    // For now, we only support updating the main schedule
    // In the future, this could create additional schedules
    if (scheduleData.type !== 'kpi_collection') {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: ['Only kpi_collection schedule type is currently supported'],
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate cron expression
    const validation = validateCronExpressionFormat(scheduleData.cron_expression);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: 'Invalid cron expression',
        details: [validation.message],
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newSchedule = {
      id: scheduleData.id || 'main-scheduler',
      name: scheduleData.name || 'Main KPI Collection Schedule',
      type: scheduleData.type,
      cron_expression: scheduleData.cron_expression,
      timezone: scheduleData.timezone || 'UTC',
      enabled: scheduleData.enabled !== false,
      job_timeout_minutes: scheduleData.job_timeout_minutes || 30,
      orchestration_polling_minutes: scheduleData.orchestration_polling_minutes || 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.email,
      updated_by: user.email
    };

    // Save as main schedule configuration
    await KVOperations.saveScheduleConfig(env.KV_STORE, newSchedule);

    return new Response(JSON.stringify({
      success: true,
      data: newSchedule,
      message: 'Schedule created successfully',
      timestamp: new Date().toISOString()
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating schedule:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create schedule',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get a specific schedule by ID
 */
async function getSchedule(env, scheduleId) {
  try {
    if (scheduleId === 'main-scheduler') {
      const schedule = await KVOperations.getScheduleConfig(env.KV_STORE);
      
      // Calculate next execution times
      let nextExecutions = [];
      if (schedule.enabled && schedule.cron_expression) {
        nextExecutions = calculateNextRuns(schedule.cron_expression, schedule.timezone, 5);
      }
      
      const scheduleWithStatus = {
        id: 'main-scheduler',
        name: 'Main KPI Collection Schedule',
        type: 'kpi_collection',
        ...schedule,
        status: schedule.enabled ? 'active' : 'inactive',
        next_executions: nextExecutions
      };
      
      return new Response(JSON.stringify({
        success: true,
        data: scheduleWithStatus,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        error: 'Schedule not found',
        message: `Schedule with ID '${scheduleId}' does not exist`,
        timestamp: new Date().toISOString()
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error getting schedule:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get schedule',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Update a specific schedule
 */
async function updateSchedule(request, env, user, scheduleId) {
  try {
    if (scheduleId !== 'main-scheduler') {
      return new Response(JSON.stringify({
        error: 'Schedule not found',
        message: `Schedule with ID '${scheduleId}' does not exist`,
        timestamp: new Date().toISOString()
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updateData = await request.json();
    
    // Validate cron expression if provided
    if (updateData.cron_expression) {
      const validation = validateCronExpressionFormat(updateData.cron_expression);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Invalid cron expression',
          details: [validation.message],
          timestamp: new Date().toISOString()
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Get existing schedule and merge updates
    const existingSchedule = await KVOperations.getScheduleConfig(env.KV_STORE);
    const updatedSchedule = {
      ...existingSchedule,
      ...updateData,
      id: 'main-scheduler', // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
      updated_by: user.email
    };

    // Save updated schedule
    await KVOperations.saveScheduleConfig(env.KV_STORE, updatedSchedule);

    return new Response(JSON.stringify({
      success: true,
      data: updatedSchedule,
      message: 'Schedule updated successfully',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating schedule:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update schedule',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Delete a schedule
 */
async function deleteSchedule(env, user, scheduleId) {
  try {
    if (scheduleId !== 'main-scheduler') {
      return new Response(JSON.stringify({
        error: 'Schedule not found',
        message: `Schedule with ID '${scheduleId}' does not exist`,
        timestamp: new Date().toISOString()
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For the main scheduler, we disable it rather than delete it
    const existingSchedule = await KVOperations.getScheduleConfig(env.KV_STORE);
    const disabledSchedule = {
      ...existingSchedule,
      enabled: false,
      updated_at: new Date().toISOString(),
      updated_by: user.email,
      disabled_reason: 'Deleted via API'
    };

    await KVOperations.saveScheduleConfig(env.KV_STORE, disabledSchedule);

    return new Response(JSON.stringify({
      success: true,
      message: 'Schedule disabled successfully (main scheduler cannot be permanently deleted)',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting schedule:', error);
    return new Response(JSON.stringify({
      error: 'Failed to delete schedule',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Validate a schedule expression
 */
async function validateScheduleExpression(request, env, user) {
  const { cron_expression, timezone = 'UTC' } = await validateRequestBody(
    request, 
    (data) => {
      const errors = [];
      if (!data.cron_expression) errors.push('cron_expression is required');
      return { valid: errors.length === 0, errors };
    },
    'schedule validation'
  );

  // Validate cron expression format
  const validation = validateCronExpressionFormat(cron_expression);
  if (!validation.valid) {
    throw new ValidationError('Invalid cron expression', [validation.message]);
  }

  // Calculate next execution times
  const nextRuns = calculateNextRuns(cron_expression, timezone, 5);
  
  return formatSuccessResponse({
    cron_expression,
    timezone,
    description: describeCronExpression(cron_expression),
    next_runs: nextRuns,
    validation_result: validation,
    valid: true
  }, 'Schedule expression validated successfully');
}

/**
 * Get configuration health status
 */
async function getConfigurationHealth(env) {
  const health = await handleKVOperation(
    () => KVOperations.getConfigurationHealth(env.KV_STORE),
    'get-configuration-health'
  );
  
  return formatSuccessResponse(
    health,
    'Configuration health status retrieved successfully'
  );
}

/**
 * Get configuration backup history
 */
async function getConfigurationBackups(env) {
  const backups = await handleKVOperation(
    () => KVOperations.getConfigurationBackups(env.KV_STORE),
    'get-configuration-backups'
  );
  
  return formatSuccessResponse({
    backups,
    total: backups.length
  }, 'Configuration backups retrieved successfully');
}

/**
 * Restore configuration from backup
 */
async function restoreConfigurationBackup(request, env, user) {
  const { backup_id } = await validateRequestBody(
    request,
    (data) => {
      const errors = [];
      if (!data.backup_id) errors.push('backup_id is required');
      return { valid: errors.length === 0, errors };
    },
    'backup restore'
  );

  const backupKey = `config:system:backup:${backup_id}`;
  
  const result = await handleKVOperation(
    () => KVOperations.restoreConfigurationFromBackup(env.KV_STORE, backupKey, user.email),
    'restore-configuration-backup'
  );

  // Log configuration change
  logConfigurationChange('restore', 'system', backup_id, user, { backup_id });

  return formatSuccessResponse(
    sanitizeConfigForResponse(result.data),
    'Configuration restored from backup successfully'
  );
}

/**
 * Real Cloudflare API integration (commented out for reference)
 * This would be used in production to actually manage cron triggers
 */
/*
async function callCloudflareAPI(env, endpoint, method = 'GET', data = null) {
  const baseUrl = 'https://api.cloudflare.com/client/v4';
  const url = `${baseUrl}${endpoint}`;
  
  const headers = {
    'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
    'X-Auth-Email': env.CLOUDFLARE_EMAIL
  };
  
  const options = {
    method,
    headers
  };
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${result.errors?.[0]?.message || 'Unknown error'}`);
    }
    
    return result;
  } catch (error) {
    console.error('Cloudflare API call failed:', error);
    throw error;
  }
}

async function updateCloudflareWorkerCronTrigger(env, workerName, cronExpression, enabled) {
  const endpoint = `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${workerName}/schedules`;
  
  const scheduleData = {
    cron: cronExpression,
    created_on: new Date().toISOString(),
    modified_on: new Date().toISOString()
  };
  
  if (enabled) {
    // Create or update the cron trigger
    return await callCloudflareAPI(env, endpoint, 'PUT', [scheduleData]);
  } else {
    // Delete the cron trigger
    return await callCloudflareAPI(env, endpoint, 'DELETE');
  }
}
*/