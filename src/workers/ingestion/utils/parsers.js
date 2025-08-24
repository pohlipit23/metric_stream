/**
 * Flexible JSON payload parsing utilities for the Ingestion Worker
 */

/**
 * Parse incoming KPI payload with maximum flexibility
 * Handles both individual KPI responses and multi-KPI responses
 */
export function parseKPIPayload(requestData) {
  try {
    // Validate basic structure
    if (!requestData || typeof requestData !== 'object') {
      throw new Error('Invalid request data: must be an object');
    }

    // Check for required fields
    if (!requestData.traceId) {
      throw new Error('Missing required field: traceId');
    }

    if (!requestData.timestamp) {
      throw new Error('Missing required field: timestamp');
    }

    // Determine if this is a multi-KPI response or individual KPI response
    if (requestData.kpiIds && Array.isArray(requestData.kpiIds)) {
      // Multi-KPI response - convert to individual KPI updates
      return parseMultiKPIResponse(requestData);
    } else if (requestData.kpiId) {
      // Individual KPI response
      return parseIndividualKPIResponse(requestData);
    } else {
      throw new Error('Invalid payload: must contain either kpiId or kpiIds');
    }

  } catch (error) {
    console.error('Error parsing KPI payload:', error);
    throw new Error(`Payload parsing failed: ${error.message}`);
  }
}

/**
 * Parse individual KPI response
 */
function parseIndividualKPIResponse(requestData) {
  // Validate required fields for individual KPI
  if (!requestData.kpiType) {
    throw new Error('Missing required field: kpiType');
  }

  if (!requestData.data) {
    throw new Error('Missing required field: data');
  }

  // Parse chart information if present
  let chart = null;
  if (requestData.chart && typeof requestData.chart === 'object') {
    chart = {
      url: requestData.chart.url || '',
      chart_type: requestData.chart.type || requestData.chart.chartType || 'unknown',
      time_range: requestData.chart.timeRange || requestData.chart.time_range || 'unknown'
    };
  }

  // Create KPI update object
  const kpiUpdate = {
    trace_id: requestData.traceId,
    kpi_id: requestData.kpiId,
    timestamp: requestData.timestamp,
    kpi_type: requestData.kpiType,
    data: requestData.data,
    chart: chart,
    metadata: requestData.metadata || null
  };

  return kpiUpdate;
}

/**
 * Parse multi-KPI response and convert to individual KPI updates
 */
function parseMultiKPIResponse(requestData) {
  if (!requestData.kpiType) {
    throw new Error('Missing required field: kpiType for multi-KPI response');
  }

  if (!requestData.data || typeof requestData.data !== 'object') {
    throw new Error('Missing or invalid data field for multi-KPI response');
  }

  const kpiUpdates = [];
  const kpiIds = requestData.kpiIds;

  // Handle different multi-KPI response types
  if (requestData.kpiType === 'cbbi-multi') {
    return parseCBBIMultiResponse(requestData);
  } else if (requestData.kpiType === 'cmc-multi') {
    return parseCMCMultiResponse(requestData);
  } else {
    // Generic multi-KPI response handling
    return parseGenericMultiResponse(requestData);
  }
}

/**
 * Parse CBBI multi-KPI response
 */
function parseCBBIMultiResponse(requestData) {
  const kpiUpdates = [];
  const data = requestData.data;
  const kpiIds = requestData.kpiIds || [];

  // Map CBBI data fields to individual KPIs
  const cbbiMapping = {
    'cbbi-btc-price-usd': data['cbbi-btc-price-usd'],
    'cbbi-rhodl': data['cbbi-rhodl'],
    'cbbi-mvrv': data['cbbi-mvrv'],
    'cbbi-confidence': data['cbbi-confidence']
  };

  for (const kpiId of kpiIds) {
    const value = cbbiMapping[kpiId];
    if (value !== undefined && value !== null) {
      kpiUpdates.push({
        trace_id: requestData.traceId,
        kpi_id: kpiId,
        timestamp: requestData.timestamp,
        kpi_type: 'cbbi',
        data: { value: value },
        chart: null,
        metadata: {
          source: 'cbbi-multi',
          originalKpiIds: requestData.kpiIds,
          ...(requestData.metadata || {})
        }
      });
    }
  }

  return kpiUpdates;
}

/**
 * Parse CMC multi-KPI response
 */
function parseCMCMultiResponse(requestData) {
  const kpiUpdates = [];
  const data = requestData.data;
  const kpiIds = requestData.kpiIds || [];

  // Map CMC data fields to individual KPIs
  const cmcMapping = {
    'cmc-btc-dominance': data['cmc-btc-dominance'],
    'cmc-eth-dominance': data['cmc-eth-dominance'],
    'cmc-totalmarketcap-usd': data['cmc-totalmarketcap-usd'],
    'cmc-stablecoinmarketcap-usd': data['cmc-stablecoinmarketcap-usd']
  };

  for (const kpiId of kpiIds) {
    const value = cmcMapping[kpiId];
    if (value !== undefined && value !== null) {
      kpiUpdates.push({
        trace_id: requestData.traceId,
        kpi_id: kpiId,
        timestamp: requestData.timestamp,
        kpi_type: 'cmc',
        data: { value: value },
        chart: null,
        metadata: {
          source: 'cmc-multi',
          originalKpiIds: requestData.kpiIds,
          ...(requestData.metadata || {})
        }
      });
    }
  }

  return kpiUpdates;
}

/**
 * Parse generic multi-KPI response
 */
function parseGenericMultiResponse(requestData) {
  const kpiUpdates = [];
  const data = requestData.data;
  const kpiIds = requestData.kpiIds || [];

  for (const kpiId of kpiIds) {
    // Try to extract value for this KPI from the data object
    let kpiValue = data[kpiId];
    
    if (kpiValue === undefined || kpiValue === null) {
      // Try alternative key formats
      const alternativeKeys = [
        kpiId.replace(/-/g, '_'),  // kebab-case to snake_case
        kpiId.replace(/_/g, '-'),  // snake_case to kebab-case
        kpiId.toLowerCase(),
        kpiId.toUpperCase()
      ];
      
      for (const altKey of alternativeKeys) {
        if (data[altKey] !== undefined && data[altKey] !== null) {
          kpiValue = data[altKey];
          break;
        }
      }
    }

    if (kpiValue !== undefined && kpiValue !== null) {
      kpiUpdates.push({
        trace_id: requestData.traceId,
        kpi_id: kpiId,
        timestamp: requestData.timestamp,
        kpi_type: requestData.kpiType,
        data: typeof kpiValue === 'object' ? kpiValue : { value: kpiValue },
        chart: null,
        metadata: {
          source: 'generic-multi',
          originalKpiIds: requestData.kpiIds,
          ...(requestData.metadata || {})
        }
      });
    } else {
      console.warn(`No data found for KPI ${kpiId} in multi-KPI response`);
    }
  }

  return kpiUpdates;
}

/**
 * Validate timestamp format (ISO 8601)
 */
export function validateTimestamp(timestamp) {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return false;
    }
    
    // Check if it's a valid ISO 8601 format
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return isoRegex.test(timestamp);
  } catch (error) {
    return false;
  }
}

/**
 * Normalize timestamp to ISO 8601 format
 */
export function normalizeTimestamp(timestamp) {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid timestamp');
    }
    return date.toISOString();
  } catch (error) {
    throw new Error(`Failed to normalize timestamp: ${error.message}`);
  }
}

/**
 * Validate KPI ID format
 */
export function validateKPIId(kpiId) {
  if (!kpiId || typeof kpiId !== 'string') {
    return false;
  }
  
  // KPI ID should be alphanumeric with hyphens and underscores
  const kpiIdRegex = /^[a-zA-Z0-9_-]+$/;
  return kpiIdRegex.test(kpiId) && kpiId.length > 0 && kpiId.length <= 100;
}

/**
 * Validate trace ID format
 */
export function validateTraceId(traceId) {
  if (!traceId || typeof traceId !== 'string') {
    return false;
  }
  
  // Trace ID should be alphanumeric with hyphens and underscores
  const traceIdRegex = /^[a-zA-Z0-9_-]+$/;
  return traceIdRegex.test(traceId) && traceId.length > 0 && traceId.length <= 200;
}