/**
 * API Utilities for Admin Console
 * Handles common API operations with proper error handling and authentication
 */

/**
 * Base API configuration
 */
const API_BASE_URL = '/api'

/**
 * Default fetch options
 */
const defaultOptions = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
}

/**
 * API Error class for structured error handling
 */
export class APIError extends Error {
  constructor(message, status, details = null) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.details = details
  }
}

/**
 * Generic API request handler
 * @param {string} endpoint - API endpoint (without /api prefix)
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response data
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new APIError(
        data.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data.details || null
      )
    }

    return data
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }
    
    // Network or other errors
    throw new APIError(
      `Network error: ${error.message}`,
      0,
      null
    )
  }
}

/**
 * KPI API operations
 */
export const kpiAPI = {
  /**
   * List all KPIs
   */
  async list() {
    const result = await apiRequest('/kpis')
    return result.data || []
  },

  /**
   * Get a specific KPI by ID
   */
  async get(kpiId) {
    const result = await apiRequest(`/kpis/${kpiId}`)
    return result.data
  },

  /**
   * Create a new KPI
   */
  async create(kpiData) {
    const result = await apiRequest('/kpis', {
      method: 'POST',
      body: JSON.stringify(kpiData)
    })
    return result.data
  },

  /**
   * Update an existing KPI
   */
  async update(kpiId, kpiData) {
    const result = await apiRequest(`/kpis/${kpiId}`, {
      method: 'PUT',
      body: JSON.stringify(kpiData)
    })
    return result.data
  },

  /**
   * Delete a KPI
   */
  async delete(kpiId) {
    await apiRequest(`/kpis/${kpiId}`, {
      method: 'DELETE'
    })
  },

  /**
   * Import historical data for a KPI
   */
  async importData(kpiId, csvData) {
    const result = await apiRequest(`/kpis/${kpiId}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv'
      },
      body: csvData
    })
    return result.data || result
  },

  /**
   * Get sample CSV data for a KPI
   */
  async getSampleCSV(kpiId) {
    const response = await fetch(`${API_BASE_URL}/kpis/${kpiId}/sample-csv`, {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new APIError(
        `Failed to get sample CSV: ${response.statusText}`,
        response.status
      )
    }
    
    return await response.text()
  }
}

/**
 * System configuration API operations
 */
export const configAPI = {
  /**
   * Get system configuration
   */
  async get() {
    const result = await apiRequest('/config')
    return result.data
  },

  /**
   * Update system configuration
   */
  async update(configData) {
    const result = await apiRequest('/config', {
      method: 'PUT',
      body: JSON.stringify(configData)
    })
    return result.data
  },

  /**
   * Update retry configuration
   */
  async updateRetry(retryConfig) {
    const result = await apiRequest('/config/retry', {
      method: 'PUT',
      body: JSON.stringify(retryConfig)
    })
    return result.data
  },

  /**
   * Update fallback configuration
   */
  async updateFallback(fallbackConfig) {
    const result = await apiRequest('/config/fallback', {
      method: 'PUT',
      body: JSON.stringify(fallbackConfig)
    })
    return result.data
  }
}

/**
 * Workflow management API operations
 */
export const workflowAPI = {
  /**
   * List all workflows
   */
  async list() {
    const result = await apiRequest('/workflows')
    return result.data || []
  },

  /**
   * Get a specific workflow by ID
   */
  async get(workflowId) {
    const result = await apiRequest(`/workflows/${workflowId}`)
    return result.data
  },

  /**
   * Perform an action on a workflow (start, stop, pause, health-check)
   */
  async performAction(workflowId, action) {
    const result = await apiRequest(`/workflows/${workflowId}/${action}`, {
      method: 'POST'
    })
    return result.data
  },

  /**
   * Start a workflow
   */
  async start(workflowId) {
    return await this.performAction(workflowId, 'start')
  },

  /**
   * Stop a workflow
   */
  async stop(workflowId) {
    return await this.performAction(workflowId, 'stop')
  },

  /**
   * Pause a workflow
   */
  async pause(workflowId) {
    return await this.performAction(workflowId, 'pause')
  },

  /**
   * Run health check on a workflow
   */
  async healthCheck(workflowId) {
    return await this.performAction(workflowId, 'health-check')
  },

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(workflowId, limit = 50) {
    const result = await apiRequest(`/workflows/${workflowId}/executions?limit=${limit}`)
    return result.data || []
  },

  /**
   * Get workflow status
   */
  async getStatus(workflowId) {
    const result = await apiRequest(`/workflows/${workflowId}/status`)
    return result.data
  }
}

/**
 * Schedule management API operations
 */
export const scheduleAPI = {
  /**
   * Get schedule configuration
   */
  async get() {
    const result = await apiRequest('/config/schedules')
    return result.data
  },

  /**
   * Update schedule configuration
   */
  async update(scheduleData) {
    const result = await apiRequest('/config/schedules', {
      method: 'PUT',
      body: JSON.stringify(scheduleData)
    })
    return result.data
  },

  /**
   * Create a new schedule
   */
  async create(scheduleData) {
    const result = await apiRequest('/schedules', {
      method: 'POST',
      body: JSON.stringify(scheduleData)
    })
    return result.data
  },

  /**
   * Delete a schedule
   */
  async delete(scheduleId) {
    await apiRequest(`/schedules/${scheduleId}`, {
      method: 'DELETE'
    })
  }
}

/**
 * Health check API
 */
export const healthAPI = {
  /**
   * Check system health
   */
  async check() {
    const result = await apiRequest('/health')
    return result.data
  }
}