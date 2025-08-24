/**
 * Error Handling Utilities
 * Provides consistent error handling and response formatting for Admin Console endpoints
 */

/**
 * Standard error response structure
 */
export class APIError extends Error {
  constructor(message, statusCode = 500, details = null, errorCode = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
    this.errorCode = errorCode;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Validation error for configuration endpoints
 */
export class ValidationError extends APIError {
  constructor(message, details = []) {
    super(message, 400, details, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * Configuration not found error
 */
export class ConfigurationNotFoundError extends APIError {
  constructor(configType, identifier = null) {
    const message = identifier 
      ? `${configType} configuration with ID '${identifier}' not found`
      : `${configType} configuration not found`;
    super(message, 404, null, 'CONFIG_NOT_FOUND');
    this.name = 'ConfigurationNotFoundError';
    this.configType = configType;
    this.identifier = identifier;
  }
}

/**
 * KV Store operation error
 */
export class KVStoreError extends APIError {
  constructor(operation, originalError) {
    super(`KV Store operation failed: ${operation}`, 500, null, 'KV_STORE_ERROR');
    this.name = 'KVStoreError';
    this.operation = operation;
    this.originalError = originalError.message;
  }
}

/**
 * Format successful API response
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @param {Object} metadata - Additional metadata
 * @returns {Response} Formatted response
 */
export function formatSuccessResponse(data, message = null, statusCode = 200, metadata = {}) {
  const response = {
    success: true,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Format error API response
 * @param {Error|APIError} error - Error object
 * @param {string} context - Context where error occurred
 * @returns {Response} Formatted error response
 */
export function formatErrorResponse(error, context = null) {
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let details = null;

  // Handle different error types
  if (error instanceof APIError) {
    statusCode = error.statusCode;
    errorCode = error.errorCode || 'API_ERROR';
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (error.message.includes('not found')) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
  } else if (error.message.includes('KV')) {
    statusCode = 500;
    errorCode = 'STORAGE_ERROR';
  }

  const response = {
    success: false,
    error: error.message,
    error_code: errorCode,
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.details = details;
  }

  if (context) {
    response.context = context;
  }

  // Add stack trace in development (remove in production)
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  // Log error for monitoring
  console.error(`API Error [${errorCode}] in ${context || 'unknown context'}:`, {
    message: error.message,
    statusCode,
    details,
    stack: error.stack
  });

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Async error handler wrapper for endpoint functions
 * @param {Function} handler - Async handler function
 * @param {string} context - Context description
 * @returns {Function} Wrapped handler with error handling
 */
export function withErrorHandling(handler, context) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return formatErrorResponse(error, context);
    }
  };
}

/**
 * Validate request body and throw ValidationError if invalid
 * @param {Request} request - HTTP request
 * @param {Function} validator - Validation function
 * @param {string} dataType - Type of data being validated
 * @returns {Object} Parsed and validated data
 */
export async function validateRequestBody(request, validator, dataType = 'request') {
  try {
    const data = await request.json();
    
    if (!data || typeof data !== 'object') {
      throw new ValidationError(`Invalid ${dataType} body: must be a JSON object`);
    }

    const validation = validator(data);
    if (!validation.valid) {
      throw new ValidationError(
        `${dataType} validation failed`,
        validation.errors
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    
    if (error instanceof SyntaxError) {
      throw new ValidationError('Invalid JSON in request body');
    }
    
    throw new APIError(`Failed to parse ${dataType} body: ${error.message}`, 400);
  }
}

/**
 * Handle KV Store operations with proper error handling
 * @param {Function} operation - KV operation function
 * @param {string} operationName - Name of the operation for error context
 * @returns {any} Operation result
 */
export async function handleKVOperation(operation, operationName) {
  try {
    return await operation();
  } catch (error) {
    console.error(`KV Store operation '${operationName}' failed:`, error);
    throw new KVStoreError(operationName, error);
  }
}

/**
 * Validate required parameters
 * @param {Object} params - Parameters object
 * @param {Array<string>} required - Array of required parameter names
 * @param {string} context - Context for error message
 */
export function validateRequiredParams(params, required, context = 'request') {
  const missing = required.filter(param => 
    params[param] === undefined || params[param] === null || params[param] === ''
  );

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required parameters in ${context}`,
      missing.map(param => `${param} is required`)
    );
  }
}

/**
 * Sanitize configuration data for response
 * @param {Object} config - Configuration object
 * @param {Array<string>} sensitiveFields - Fields to exclude from response
 * @returns {Object} Sanitized configuration
 */
export function sanitizeConfigForResponse(config, sensitiveFields = []) {
  if (!config || typeof config !== 'object') {
    return config;
  }

  const sanitized = { ...config };
  
  // Remove sensitive fields
  sensitiveFields.forEach(field => {
    delete sanitized[field];
  });

  // Remove internal fields that shouldn't be exposed
  const internalFields = ['_internal', '__metadata', 'raw_data'];
  internalFields.forEach(field => {
    delete sanitized[field];
  });

  return sanitized;
}

/**
 * Rate limiting check (placeholder for future implementation)
 * @param {Request} request - HTTP request
 * @param {string} endpoint - Endpoint identifier
 * @returns {boolean} Whether request is within rate limits
 */
export function checkRateLimit(request, endpoint) {
  // Placeholder for rate limiting implementation
  // In production, this would check against a rate limiting store
  return true;
}

/**
 * Log configuration changes for audit trail
 * @param {string} action - Action performed (create, update, delete)
 * @param {string} configType - Type of configuration
 * @param {string} identifier - Configuration identifier
 * @param {Object} user - User information
 * @param {Object} changes - Changes made
 */
export function logConfigurationChange(action, configType, identifier, user, changes = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    config_type: configType,
    identifier,
    user: user.email,
    changes: Object.keys(changes),
    ip_address: user.ip || 'unknown'
  };

  // In production, this would send to a logging service
  console.log('Configuration Change:', JSON.stringify(logEntry));
}