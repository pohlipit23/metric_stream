/**
 * Request validation utilities
 */

/**
 * Validate chart generation request
 * @param {Object} requestData - Request data to validate
 * @returns {Object} - Validation result
 */
export function validateChartRequest(requestData) {
  const errors = [];

  // Required fields
  if (!requestData.kpiId) {
    errors.push('kpiId is required');
  }

  if (!requestData.chartType) {
    errors.push('chartType is required');
  }

  if (!requestData.outputFormat) {
    errors.push('outputFormat is required');
  }

  // Valid chart types
  const validChartTypes = ['line', 'candlestick', 'bar'];
  if (requestData.chartType && !validChartTypes.includes(requestData.chartType)) {
    errors.push(`chartType must be one of: ${validChartTypes.join(', ')}`);
  }

  // Valid output formats
  const validOutputFormats = ['png', 'svg', 'html'];
  if (requestData.outputFormat && !validOutputFormats.includes(requestData.outputFormat)) {
    errors.push(`outputFormat must be one of: ${validOutputFormats.join(', ')}`);
  }

  // Valid time ranges (optional)
  if (requestData.timeRange) {
    const validTimeRanges = ['1d', '7d', '30d', '90d', '1y'];
    if (!validTimeRanges.includes(requestData.timeRange)) {
      errors.push(`timeRange must be one of: ${validTimeRanges.join(', ')}`);
    }
  }

  // Validate custom data structure if provided
  if (requestData.customData) {
    const dataValidation = validateTimeSeriesData(requestData.customData);
    if (!dataValidation.valid) {
      errors.push(...dataValidation.errors.map(err => `customData: ${err}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate batch chart generation request
 * @param {Object} requestData - Request data to validate
 * @returns {Object} - Validation result
 */
export function validateBatchChartRequest(requestData) {
  const errors = [];

  // Required fields
  if (!requestData.traceId && !requestData.charts) {
    errors.push('Either traceId or charts array is required');
  }

  if (requestData.charts) {
    if (!Array.isArray(requestData.charts)) {
      errors.push('charts must be an array');
    } else {
      requestData.charts.forEach((chart, index) => {
        const chartValidation = validateChartRequest(chart);
        if (!chartValidation.valid) {
          errors.push(...chartValidation.errors.map(err => `charts[${index}]: ${err}`));
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate time series data structure
 * @param {Object} data - Time series data
 * @returns {Object} - Validation result
 */
export function validateTimeSeriesData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { valid: false, errors };
  }

  // Check for required arrays
  if (!Array.isArray(data.timestamps)) {
    errors.push('timestamps must be an array');
  }

  if (!Array.isArray(data.values)) {
    errors.push('values must be an array');
  }

  // Check array lengths match
  if (data.timestamps && data.values && data.timestamps.length !== data.values.length) {
    errors.push('timestamps and values arrays must have the same length');
  }

  // Validate timestamp format
  if (data.timestamps) {
    data.timestamps.forEach((timestamp, index) => {
      if (!isValidTimestamp(timestamp)) {
        errors.push(`Invalid timestamp at index ${index}: ${timestamp}`);
      }
    });
  }

  // Validate values are numeric
  if (data.values) {
    data.values.forEach((value, index) => {
      if (typeof value !== 'number' && !isNumeric(value)) {
        errors.push(`Invalid value at index ${index}: ${value}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if a string represents a valid timestamp
 * @param {string} timestamp - Timestamp to validate
 * @returns {boolean} - True if valid
 */
function isValidTimestamp(timestamp) {
  if (typeof timestamp !== 'string') return false;
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Check if a value is numeric
 * @param {any} value - Value to check
 * @returns {boolean} - True if numeric
 */
function isNumeric(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}