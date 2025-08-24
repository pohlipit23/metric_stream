import { useState, useEffect } from 'react'
import { Save, RefreshCw, AlertCircle, CheckCircle, Clock, Settings, Repeat, Shield } from 'lucide-react'
import { configAPI, scheduleAPI } from '../utils/api'
import { APIError } from '../utils/api'

function SystemConfig() {
  const [config, setConfig] = useState(null)
  const [scheduleConfig, setScheduleConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})

  // Load configuration on component mount
  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [systemConfig, scheduleData] = await Promise.all([
        configAPI.get(),
        scheduleAPI.get()
      ])
      
      setConfig(systemConfig)
      setScheduleConfig(scheduleData)
    } catch (err) {
      console.error('Error loading configuration:', err)
      setError(err instanceof APIError ? err.message : 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const validateConfiguration = () => {
    const errors = {}

    // Validate job lifecycle settings
    if (config?.job_lifecycle) {
      const lifecycle = config.job_lifecycle
      
      if (lifecycle.timeout_minutes < 1 || lifecycle.timeout_minutes > 120) {
        errors.timeout_minutes = 'Job timeout must be between 1 and 120 minutes'
      }
      
      if (lifecycle.orchestration_polling_minutes < 1 || lifecycle.orchestration_polling_minutes > 10) {
        errors.orchestration_polling_minutes = 'Orchestration polling interval must be between 1 and 10 minutes'
      }
    }

    // Validate retry configuration
    if (config?.retry) {
      Object.entries(config.retry).forEach(([component, retryConfig]) => {
        if (retryConfig.max_retries < 0 || retryConfig.max_retries > 10) {
          errors[`${component}_max_retries`] = `Max retries for ${component} must be between 0 and 10`
        }
        
        if (retryConfig.backoff_intervals) {
          const invalidIntervals = retryConfig.backoff_intervals.some(interval => 
            interval < 100 || interval > 60000
          )
          if (invalidIntervals) {
            errors[`${component}_backoff_intervals`] = `Backoff intervals for ${component} must be between 100 and 60000 milliseconds`
          }
        }
      })
    }

    // Validate schedule configuration
    if (scheduleConfig?.cron_expression) {
      const cronParts = scheduleConfig.cron_expression.split(' ')
      if (cronParts.length !== 5) {
        errors.cron_expression = 'Cron expression must have exactly 5 parts: minute hour day month weekday'
      }
    }

    // Validate fallback URLs
    if (config?.fallback?.chart_generation?.fallback_image_url) {
      try {
        new URL(config.fallback.chart_generation.fallback_image_url)
      } catch {
        errors.fallback_image_url = 'Fallback image URL must be a valid URL'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateConfiguration()) {
      setError('Please fix validation errors before saving')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Save system configuration and schedule configuration
      await Promise.all([
        configAPI.update(config),
        scheduleAPI.update(scheduleConfig)
      ])

      setSuccess('Configuration saved successfully')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error saving configuration:', err)
      setError(err instanceof APIError ? err.message : 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev }
      const keys = path.split('.')
      let current = newConfig
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newConfig
    })
  }

  const updateScheduleConfig = (key, value) => {
    setScheduleConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateRetryConfig = (component, field, value) => {
    updateConfig(`retry.${component}.${field}`, value)
  }

  const updateFallbackConfig = (component, field, value) => {
    updateConfig(`fallback.${component}.${field}`, value)
  }

  const updateBackoffInterval = (component, index, value) => {
    const intervals = [...(config.retry[component]?.backoff_intervals || [])]
    intervals[index] = parseInt(value)
    updateConfig(`retry.${component}.backoff_intervals`, intervals)
  }

  const addBackoffInterval = (component) => {
    const intervals = [...(config.retry[component]?.backoff_intervals || [])]
    intervals.push(1000)
    updateConfig(`retry.${component}.backoff_intervals`, intervals)
  }

  const removeBackoffInterval = (component, index) => {
    const intervals = [...(config.retry[component]?.backoff_intervals || [])]
    intervals.splice(index, 1)
    updateConfig(`retry.${component}.backoff_intervals`, intervals)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading configuration...</span>
      </div>
    )
  }

  if (!config || !scheduleConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-2 text-gray-600">Failed to load configuration</span>
        <button 
          onClick={loadConfiguration}
          className="ml-4 btn-secondary"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">System Configuration</h1>
          <p className="mt-2 text-sm text-gray-700">
            Configure system-wide settings and behavior
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || Object.keys(validationErrors).length > 0}
          className="btn-primary flex items-center"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Schedule Configuration */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Clock className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Schedule Configuration</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cron Expression
              </label>
              <input
                type="text"
                className={`input-field ${validationErrors.cron_expression ? 'border-red-300' : ''}`}
                value={scheduleConfig.cron_expression || ''}
                onChange={(e) => updateScheduleConfig('cron_expression', e.target.value)}
                placeholder="0 9 * * *"
              />
              {validationErrors.cron_expression && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.cron_expression}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Schedule format: minute hour day month weekday (e.g., "0 9 * * *" for daily at 9 AM)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                className="input-field"
                value={scheduleConfig.timezone || 'UTC'}
                onChange={(e) => updateScheduleConfig('timezone', e.target.value)}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Asia/Shanghai">Shanghai</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Timezone for cron schedule execution
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="scheduleEnabled"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={scheduleConfig.enabled !== false}
                onChange={(e) => updateScheduleConfig('enabled', e.target.checked)}
              />
              <label htmlFor="scheduleEnabled" className="ml-2 block text-sm text-gray-900">
                Enable scheduled execution
              </label>
            </div>
          </div>
        </div>

        {/* Job Lifecycle Management */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Settings className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Job Lifecycle Management</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Timeout (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                className={`input-field ${validationErrors.timeout_minutes ? 'border-red-300' : ''}`}
                value={config.job_lifecycle?.timeout_minutes || 30}
                onChange={(e) => updateConfig('job_lifecycle.timeout_minutes', parseInt(e.target.value))}
              />
              {validationErrors.timeout_minutes && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.timeout_minutes}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Maximum time to wait for all KPIs to complete (1-120 minutes)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Orchestration Polling (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                className={`input-field ${validationErrors.orchestration_polling_minutes ? 'border-red-300' : ''}`}
                value={config.job_lifecycle?.orchestration_polling_minutes || 2}
                onChange={(e) => updateConfig('job_lifecycle.orchestration_polling_minutes', parseInt(e.target.value))}
              />
              {validationErrors.orchestration_polling_minutes && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.orchestration_polling_minutes}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                How often to check job completion status (1-10 minutes)
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enablePartialData"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={config.job_lifecycle?.partial_data_delivery !== false}
                onChange={(e) => updateConfig('job_lifecycle.partial_data_delivery', e.target.checked)}
              />
              <label htmlFor="enablePartialData" className="ml-2 block text-sm text-gray-900">
                Enable partial data processing
              </label>
            </div>
            <p className="text-sm text-gray-500 lg:col-span-3">
              Process available KPIs even if some fail to collect data
            </p>
          </div>
        </div>

        {/* Retry Configuration */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Repeat className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Retry Configuration</h3>
          </div>
          <div className="space-y-6">
            {config.retry && Object.entries(config.retry).map(([component, retryConfig]) => (
              <div key={component} className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-3 capitalize">
                  {component.replace('_', ' ')} Retry Settings
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Retries
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      className={`input-field ${validationErrors[`${component}_max_retries`] ? 'border-red-300' : ''}`}
                      value={retryConfig.max_retries || 0}
                      onChange={(e) => updateRetryConfig(component, 'max_retries', parseInt(e.target.value))}
                    />
                    {validationErrors[`${component}_max_retries`] && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors[`${component}_max_retries`]}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Backoff Intervals (ms)
                    </label>
                    <div className="space-y-2">
                      {retryConfig.backoff_intervals?.map((interval, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="100"
                            max="60000"
                            className="input-field flex-1"
                            value={interval}
                            onChange={(e) => updateBackoffInterval(component, index, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeBackoffInterval(component, index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addBackoffInterval(component)}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        + Add Interval
                      </button>
                    </div>
                    {validationErrors[`${component}_backoff_intervals`] && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors[`${component}_backoff_intervals`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fallback Configuration */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Fallback Configuration</h3>
          </div>
          <div className="space-y-6">
            {/* Chart Generation Fallback */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Chart Generation Fallback</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fallback Image URL
                  </label>
                  <input
                    type="url"
                    className={`input-field ${validationErrors.fallback_image_url ? 'border-red-300' : ''}`}
                    value={config.fallback?.chart_generation?.fallback_image_url || ''}
                    onChange={(e) => updateFallbackConfig('chart_generation', 'fallback_image_url', e.target.value)}
                    placeholder="https://example.com/fallback-chart.png"
                  />
                  {validationErrors.fallback_image_url && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.fallback_image_url}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    Default image to use when chart generation fails
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fallback Text
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={config.fallback?.chart_generation?.fallback_text || ''}
                    onChange={(e) => updateFallbackConfig('chart_generation', 'fallback_text', e.target.value)}
                    placeholder="Chart generation temporarily unavailable"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Default text to display when chart generation fails
                  </p>
                </div>
              </div>
            </div>

            {/* LLM Analysis Fallback */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">LLM Analysis Fallback</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disclaimer Message
                </label>
                <textarea
                  className="input-field"
                  rows="3"
                  value={config.fallback?.llm_analysis?.disclaimer || ''}
                  onChange={(e) => updateFallbackConfig('llm_analysis', 'disclaimer', e.target.value)}
                  placeholder="AI analysis temporarily unavailable. Data provided without insights."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Message to display when LLM analysis fails
                </p>
              </div>
            </div>

            {/* Data Collection Fallback */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Data Collection Fallback</h4>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="skipOnFailure"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={config.fallback?.data_collection?.skip_on_failure !== false}
                    onChange={(e) => updateFallbackConfig('data_collection', 'skip_on_failure', e.target.checked)}
                  />
                  <label htmlFor="skipOnFailure" className="ml-2 block text-sm text-gray-900">
                    Skip KPI on failure
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="logErrors"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={config.fallback?.data_collection?.log_errors !== false}
                    onChange={(e) => updateFallbackConfig('data_collection', 'log_errors', e.target.checked)}
                  />
                  <label htmlFor="logErrors" className="ml-2 block text-sm text-gray-900">
                    Log collection errors
                  </label>
                </div>
              </div>
            </div>

            {/* Delivery Fallback */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Delivery Fallback</h4>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="retryOnNextCycle"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={config.fallback?.delivery?.retry_on_next_cycle !== false}
                    onChange={(e) => updateFallbackConfig('delivery', 'retry_on_next_cycle', e.target.checked)}
                  />
                  <label htmlFor="retryOnNextCycle" className="ml-2 block text-sm text-gray-900">
                    Retry delivery on next scheduled run
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="alertAdmin"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={config.fallback?.delivery?.alert_admin !== false}
                    onChange={(e) => updateFallbackConfig('delivery', 'alert_admin', e.target.checked)}
                  />
                  <label htmlFor="alertAdmin" className="ml-2 block text-sm text-gray-900">
                    Alert administrator on delivery failure
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemConfig