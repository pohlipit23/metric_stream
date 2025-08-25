import { useState, useEffect } from 'react'
import { Clock, Play, Pause, Settings, AlertCircle, CheckCircle, Calendar } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CronExpressionBuilder from '../components/ui/CronExpressionBuilder'
import { scheduleAPI, apiRequest } from '../utils/api'

function ScheduleManagement() {
  const [scheduleConfig, setScheduleConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    cron_expression: '',
    timezone: 'UTC',
    enabled: true,
    job_timeout_minutes: 30,
    orchestration_polling_minutes: 2
  })
  const [cronValidation, setCronValidation] = useState({ valid: true, message: '' })
  const [testResults, setTestResults] = useState(null)
  const [testing, setTesting] = useState(false)
  const [scheduleStatus, setScheduleStatus] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [cronTriggers, setCronTriggers] = useState(null)
  const [triggersLoading, setTriggersLoading] = useState(false)
  const [updatingTriggers, setUpdatingTriggers] = useState(false)

  useEffect(() => {
    loadScheduleConfig()
    loadScheduleStatus()
    loadCronTriggers()
  }, [])

  useEffect(() => {
    // Auto-refresh status every 30 seconds
    const interval = setInterval(() => {
      if (!isEditing) {
        loadScheduleStatus()
        loadCronTriggers()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isEditing])

  const loadScheduleConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await scheduleAPI.get()
      
      if (response.success) {
        setScheduleConfig(response.data)
        setFormData({
          cron_expression: response.data.cron_expression || '',
          timezone: response.data.timezone || 'UTC',
          enabled: response.data.enabled !== false,
          job_timeout_minutes: response.data.job_timeout_minutes || 30,
          orchestration_polling_minutes: response.data.orchestration_polling_minutes || 2
        })
      } else {
        setError('Failed to load schedule configuration')
      }
    } catch (err) {
      console.error('Error loading schedule config:', err)
      setError('Failed to load schedule configuration')
    } finally {
      setLoading(false)
    }
  }

  const validateCronExpression = (cronExpr) => {
    // Basic validation - detailed validation is now handled by CronExpressionBuilder
    if (!cronExpr) {
      return { valid: false, message: 'Cron expression is required' }
    }

    const parts = cronExpr.trim().split(/\s+/)
    if (parts.length !== 5) {
      return { 
        valid: false, 
        message: 'Cron expression must have 5 parts: minute hour day month weekday' 
      }
    }

    return { valid: true, message: 'Valid cron expression' }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Validate cron expression in real-time
    if (field === 'cron_expression') {
      const validation = validateCronExpression(value)
      setCronValidation(validation)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Final validation
      const validation = validateCronExpression(formData.cron_expression)
      if (!validation.valid) {
        setError(validation.message)
        return
      }

      const response = await scheduleAPI.update(formData)
      
      if (response.success) {
        setScheduleConfig(response.data)
        setSuccess('Schedule configuration updated successfully')
        setIsEditing(false)
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.error || 'Failed to update schedule configuration')
      }
    } catch (err) {
      console.error('Error saving schedule config:', err)
      setError('Failed to update schedule configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (scheduleConfig) {
      setFormData({
        cron_expression: scheduleConfig.cron_expression || '',
        timezone: scheduleConfig.timezone || 'UTC',
        enabled: scheduleConfig.enabled !== false,
        job_timeout_minutes: scheduleConfig.job_timeout_minutes || 30,
        orchestration_polling_minutes: scheduleConfig.orchestration_polling_minutes || 2
      })
    }
    setIsEditing(false)
    setError(null)
    setCronValidation({ valid: true, message: '' })
    setTestResults(null)
  }

  const loadScheduleStatus = async () => {
    try {
      setStatusLoading(true)
      const response = await apiRequest('/config/schedules/status')
      
      if (response.success) {
        setScheduleStatus(response.data)
      }
    } catch (err) {
      console.error('Error loading schedule status:', err)
    } finally {
      setStatusLoading(false)
    }
  }

  const handleTestSchedule = async () => {
    try {
      setTesting(true)
      setError(null)
      
      const response = await apiRequest('/config/schedules/test', {
        method: 'POST',
        body: JSON.stringify({
          cron_expression: formData.cron_expression,
          timezone: formData.timezone
        })
      })
      
      if (response.success) {
        setTestResults(response.data)
      } else {
        setError(response.error || 'Failed to test schedule')
      }
    } catch (err) {
      console.error('Error testing schedule:', err)
      setError('Failed to test schedule')
    } finally {
      setTesting(false)
    }
  }

  const loadCronTriggers = async () => {
    try {
      setTriggersLoading(true)
      const response = await apiRequest('/config/schedules/cron-triggers')
      
      if (response.success) {
        setCronTriggers(response.data)
      }
    } catch (err) {
      console.error('Error loading cron triggers:', err)
    } finally {
      setTriggersLoading(false)
    }
  }

  const handleToggleSchedule = async (enable) => {
    try {
      setSaving(true)
      setError(null)
      
      const endpoint = enable ? '/api/config/schedules/enable' : '/api/config/schedules/disable'
      const response = await apiRequest(endpoint.replace('/api', ''), { method: 'POST' })
      
      if (response.success) {
        setScheduleConfig(response.data)
        setSuccess(`Schedule ${enable ? 'enabled' : 'disabled'} successfully`)
        loadScheduleStatus()
        loadCronTriggers()
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.error || `Failed to ${enable ? 'enable' : 'disable'} schedule`)
      }
    } catch (err) {
      console.error('Error toggling schedule:', err)
      setError(`Failed to ${enable ? 'enable' : 'disable'} schedule`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCronTriggers = async () => {
    try {
      setUpdatingTriggers(true)
      setError(null)
      
      const response = await apiRequest('/config/schedules/cron-triggers', {
        method: 'POST',
        body: JSON.stringify({
          cron_expression: scheduleConfig.cron_expression,
          enabled: scheduleConfig.enabled
        })
      })
      
      if (response.success) {
        setSuccess('Cloudflare cron triggers updated successfully')
        loadCronTriggers()
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(response.error || 'Failed to update cron triggers')
      }
    } catch (err) {
      console.error('Error updating cron triggers:', err)
      setError('Failed to update cron triggers')
    } finally {
      setUpdatingTriggers(false)
    }
  }

  const getCronDescription = (cronExpr) => {
    if (!cronExpr) return 'No schedule configured'
    
    try {
      const parts = cronExpr.split(' ')
      if (parts.length !== 5) return cronExpr
      
      const [minute, hour, day, month, weekday] = parts
      
      // Common patterns
      if (cronExpr === '0 9 * * *') return 'Daily at 9:00 AM'
      if (cronExpr === '0 0 * * *') return 'Daily at midnight'
      if (cronExpr === '0 12 * * *') return 'Daily at noon'
      if (cronExpr === '0 9 * * 1') return 'Weekly on Monday at 9:00 AM'
      if (cronExpr === '0 9 1 * *') return 'Monthly on the 1st at 9:00 AM'
      if (cronExpr === '*/15 * * * *') return 'Every 15 minutes'
      if (cronExpr === '0 */6 * * *') return 'Every 6 hours'
      
      // Generic description
      let desc = 'At '
      if (minute === '0') desc += `${hour}:00`
      else if (minute === '*') desc += `every minute of hour ${hour}`
      else desc += `${hour}:${minute.padStart(2, '0')}`
      
      if (day !== '*') desc += ` on day ${day}`
      if (month !== '*') desc += ` of month ${month}`
      if (weekday !== '*') desc += ` on weekday ${weekday}`
      
      return desc
    } catch {
      return cronExpr
    }
  }



  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
    'Asia/Kolkata', 'Australia/Sydney'
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
          <p className="text-gray-600 mt-1">
            Configure cron schedules for automated KPI collection
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {scheduleConfig && (
            <Badge variant={scheduleConfig.enabled ? 'success' : 'secondary'}>
              {scheduleConfig.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Schedule Status */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Current Schedule
            </h2>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Schedule
              </Button>
            )}
          </div>

          {scheduleConfig && !isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Cron Expression</label>
                  <p className="text-lg font-mono bg-gray-50 p-2 rounded border">
                    {scheduleConfig.cron_expression}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {getCronDescription(scheduleConfig.cron_expression)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Timezone</label>
                  <p className="text-lg bg-gray-50 p-2 rounded border">
                    {scheduleConfig.timezone}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Job Timeout</label>
                  <p className="text-lg bg-gray-50 p-2 rounded border">
                    {scheduleConfig.job_timeout_minutes} minutes
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Orchestration Polling</label>
                  <p className="text-lg bg-gray-50 p-2 rounded border">
                    {scheduleConfig.orchestration_polling_minutes} minutes
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-4 border-t">
                <div className="flex items-center">
                  {scheduleConfig.enabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
                  )}
                  <span className="text-sm text-gray-700">
                    Schedule is {scheduleConfig.enabled ? 'enabled' : 'disabled'}
                  </span>
                </div>
                {scheduleConfig.updated_at && (
                  <div className="text-sm text-gray-500">
                    Last updated: {new Date(scheduleConfig.updated_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cron Expression */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cron Expression *
                </label>
                <CronExpressionBuilder
                  value={formData.cron_expression}
                  onChange={(expr) => handleInputChange('cron_expression', expr)}
                />
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Timeout (minutes)
                  </label>
                  <Input
                    type="number"
                    min="5"
                    max="120"
                    value={formData.job_timeout_minutes}
                    onChange={(e) => handleInputChange('job_timeout_minutes', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum time to wait for all KPIs to complete
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Orchestration Polling (minutes)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.orchestration_polling_minutes}
                    onChange={(e) => handleInputChange('orchestration_polling_minutes', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    How often to check job completion status
                  </p>
                </div>
              </div>

              {/* Enable/Disable */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => handleInputChange('enabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Enable scheduled execution
                  </span>
                </label>
              </div>

              {/* Test Schedule */}
              {formData.cron_expression && cronValidation.valid && (
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-blue-900">Test Schedule</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestSchedule}
                      disabled={testing || !formData.cron_expression}
                    >
                      {testing ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Testing...
                        </>
                      ) : (
                        'Test Expression'
                      )}
                    </Button>
                  </div>
                  
                  {testResults && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-blue-900">Description:</p>
                        <p className="text-sm text-blue-700">{testResults.description}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-blue-900">Next 5 executions:</p>
                        <div className="space-y-1 mt-1">
                          {testResults.next_runs.map((run, index) => (
                            <div key={index} className="text-sm text-blue-700 font-mono">
                              {run.local_time} ({run.description})
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !cronValidation.valid}
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Schedule'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Schedule Status Monitoring */}
      {scheduleStatus && !isEditing && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Schedule Status & Monitoring
              </h2>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadScheduleStatus}
                  disabled={statusLoading}
                >
                  {statusLoading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    'Refresh'
                  )}
                </Button>
                {scheduleConfig && (
                  <Button
                    variant={scheduleConfig.enabled ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleSchedule(!scheduleConfig.enabled)}
                    disabled={saving}
                  >
                    {scheduleConfig.enabled ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Enable
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Current Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge variant={scheduleStatus.status === 'enabled' ? 'success' : 'secondary'}>
                      {scheduleStatus.status}
                    </Badge>
                  </div>
                  
                  {scheduleStatus.next_execution && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Next Execution</span>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(scheduleStatus.next_execution.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {scheduleStatus.next_execution.description}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Check</span>
                    <span className="text-sm text-gray-900">
                      {new Date(scheduleStatus.last_check).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Execution History */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Executions</h3>
                {scheduleStatus.execution_history && scheduleStatus.execution_history.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {scheduleStatus.execution_history.map((execution, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(execution.timestamp).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Duration: {execution.duration || 'N/A'}
                          </div>
                        </div>
                        <Badge variant={execution.status === 'success' ? 'success' : 'destructive'}>
                          {execution.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    No execution history available
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Schedule
                </Button>
                {scheduleConfig?.cron_expression && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        cron_expression: scheduleConfig.cron_expression,
                        timezone: scheduleConfig.timezone
                      })
                      handleTestSchedule()
                    }}
                    disabled={testing}
                  >
                    {testing ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Clock className="h-4 w-4 mr-2" />
                    )}
                    Test Current Schedule
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Cloudflare Cron Triggers */}
      {cronTriggers && !isEditing && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Cloudflare Cron Triggers
              </h2>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadCronTriggers}
                  disabled={triggersLoading}
                >
                  {triggersLoading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    'Refresh'
                  )}
                </Button>
                {scheduleConfig && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleUpdateCronTriggers}
                    disabled={updatingTriggers || !scheduleConfig.cron_expression}
                  >
                    {updatingTriggers ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Updating...
                      </>
                    ) : (
                      'Sync to Cloudflare'
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Account Limits */}
              <div className="bg-blue-50 p-4 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">Account Usage</h3>
                    <p className="text-sm text-blue-700">
                      {cronTriggers.account_limits.current_usage} of {cronTriggers.account_limits.max_triggers} cron triggers used
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-900">
                      {cronTriggers.account_limits.current_usage}/{cronTriggers.account_limits.max_triggers}
                    </div>
                  </div>
                </div>
              </div>

              {/* Triggers List */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Active Triggers</h3>
                <div className="space-y-3">
                  {Object.entries(cronTriggers.triggers).map(([key, trigger]) => (
                    <div key={key} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900">{trigger.name}</h4>
                          <Badge variant={trigger.enabled ? 'success' : 'secondary'}>
                            {trigger.enabled ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          Last modified: {new Date(trigger.last_modified).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Cron Expression:</span>
                          <div className="font-mono bg-gray-100 p-1 rounded mt-1">{trigger.cron}</div>
                        </div>
                        {trigger.next_scheduled_time && (
                          <div>
                            <span className="font-medium text-gray-700">Next Execution:</span>
                            <div className="mt-1">
                              {new Date(trigger.next_scheduled_time).toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sync Status */}
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Sync Status</p>
                    <p className="text-sm text-gray-600">
                      Local configuration is synchronized with Cloudflare cron triggers
                    </p>
                  </div>
                </div>
              </div>

              {/* Help Text */}
              <div className="bg-yellow-50 p-4 rounded-md">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Important Notes</p>
                    <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                      <li>• Changes to the schedule configuration need to be synced to Cloudflare</li>
                      <li>• Cron triggers are managed at the account level and affect all workers</li>
                      <li>• Free accounts have limited cron trigger quotas</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Cron Expression Help */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Cron Expression Format
          </h3>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="font-mono text-sm mb-2">minute hour day month weekday</p>
              <p className="text-sm text-gray-600">
                Each field can contain: numbers, ranges (1-5), lists (1,3,5), steps (*/2), or wildcards (*)
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
              <div>
                <h4 className="font-semibold">Minute</h4>
                <p className="text-gray-600">0-59</p>
              </div>
              <div>
                <h4 className="font-semibold">Hour</h4>
                <p className="text-gray-600">0-23</p>
              </div>
              <div>
                <h4 className="font-semibold">Day</h4>
                <p className="text-gray-600">1-31</p>
              </div>
              <div>
                <h4 className="font-semibold">Month</h4>
                <p className="text-gray-600">1-12</p>
              </div>
              <div>
                <h4 className="font-semibold">Weekday</h4>
                <p className="text-gray-600">0-7 (0,7=Sun)</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ScheduleManagement