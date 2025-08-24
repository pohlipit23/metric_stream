import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, ExternalLink, AlertCircle, CheckCircle, Loader, Upload } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import HistoricalDataImport from '../components/HistoricalDataImport'
import { useAuth } from '../contexts/AuthContext'
import { kpiAPI, APIError } from '../utils/api'

function KPIRegistry() {
  const { user, isAuthenticated } = useAuth()
  const [kpis, setKpis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingKpi, setEditingKpi] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    webhook_url: '',
    analysis_config: {},
    active: true
  })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importingKpi, setImportingKpi] = useState(null)

  // Load KPIs on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadKPIs()
    }
  }, [isAuthenticated])

  // API Functions
  const loadKPIs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const kpis = await kpiAPI.list()
      setKpis(kpis)
    } catch (err) {
      console.error('Error loading KPIs:', err)
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('Failed to load KPIs')
      }
    } finally {
      setLoading(false)
    }
  }

  const saveKPI = async (kpiData) => {
    try {
      setSubmitting(true)
      setFormErrors({})

      let savedKPI
      if (editingKpi) {
        savedKPI = await kpiAPI.update(editingKpi.id, kpiData)
        setKpis(kpis.map(kpi => kpi.id === editingKpi.id ? savedKPI : kpi))
      } else {
        savedKPI = await kpiAPI.create(kpiData)
        setKpis([savedKPI, ...kpis])
      }

      // Close form
      setShowForm(false)
      setEditingKpi(null)
      resetForm()
      
      return true
    } catch (err) {
      console.error('Error saving KPI:', err)
      
      if (err instanceof APIError && err.details) {
        // Handle validation errors
        const errors = {}
        err.details.forEach(error => {
          const field = error.toLowerCase().includes('name') ? 'name' :
                       error.toLowerCase().includes('webhook') ? 'webhook_url' :
                       error.toLowerCase().includes('description') ? 'description' : 'general'
          errors[field] = error
        })
        setFormErrors(errors)
      } else {
        setFormErrors({ general: err.message || 'Failed to save KPI' })
      }
      
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const deleteKPI = async (kpiId) => {
    try {
      await kpiAPI.delete(kpiId)
      
      // Update local state
      setKpis(kpis.filter(kpi => kpi.id !== kpiId))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Error deleting KPI:', err)
      setError(err.message || 'Failed to delete KPI')
    }
  }

  // Form Handlers
  const handleEdit = (kpi) => {
    setEditingKpi(kpi)
    setFormData({
      name: kpi.name || '',
      description: kpi.description || '',
      webhook_url: kpi.webhook_url || '',
      analysis_config: {
        chart_method: kpi.analysis_config?.chart_method || 'external',
        chart_type: kpi.analysis_config?.chart_type || 'line',
        llm_priority: kpi.analysis_config?.llm_priority || 'standard',
        custom_prompt: kpi.analysis_config?.custom_prompt || '',
        retention_days: kpi.analysis_config?.retention_days || 365,
        alert_high: kpi.analysis_config?.alert_high || null,
        alert_low: kpi.analysis_config?.alert_low || null,
        ...kpi.analysis_config
      },
      active: kpi.active !== false
    })
    setFormErrors({})
    setShowForm(true)
  }

  const handleDelete = (kpi) => {
    setDeleteConfirm(kpi)
  }

  const handleImport = (kpi) => {
    setImportingKpi(kpi)
    setShowImportModal(true)
  }

  const handleImportComplete = (result) => {
    // Optionally refresh KPI list or show success message
    console.log('Import completed:', result)
    // Could add a success toast notification here
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      webhook_url: '',
      analysis_config: {
        chart_method: 'external',
        chart_type: 'line',
        llm_priority: 'standard',
        custom_prompt: '',
        retention_days: 365,
        alert_high: null,
        alert_low: null
      },
      active: true
    })
    setFormErrors({})
    setWebhookTestResult(null)
  }

  // Test webhook connectivity
  const testWebhook = async (webhookUrl) => {
    try {
      setTestingWebhook(true)
      setWebhookTestResult(null)

      // Create a test payload
      const testPayload = {
        trace_id: `test-${Date.now()}`,
        kpi_id: 'test-kpi',
        timestamp: new Date().toISOString(),
        test: true
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      })

      if (response.ok) {
        setWebhookTestResult({
          success: true,
          message: 'Webhook is reachable and responding'
        })
      } else {
        setWebhookTestResult({
          success: false,
          message: `Webhook returned ${response.status}: ${response.statusText}`
        })
      }
    } catch (error) {
      setWebhookTestResult({
        success: false,
        message: `Connection failed: ${error.message}`
      })
    } finally {
      setTestingWebhook(false)
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    
    // Client-side validation
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      return
    }

    await saveKPI(formData)
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  // Client-side validation
  const validateForm = () => {
    const errors = {}

    // Required fields
    if (!formData.name?.trim()) {
      errors.name = 'Name is required'
    } else if (formData.name.length > 100) {
      errors.name = 'Name must be 100 characters or less'
    }

    if (!formData.webhook_url?.trim()) {
      errors.webhook_url = 'Webhook URL is required'
    } else {
      try {
        new URL(formData.webhook_url)
      } catch {
        errors.webhook_url = 'Please enter a valid URL'
      }
    }

    // Optional field validation
    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be 500 characters or less'
    }

    // Analysis config validation
    if (formData.analysis_config) {
      const config = formData.analysis_config

      if (config.custom_prompt && config.custom_prompt.length > 2000) {
        errors.analysis_config = 'Custom prompt must be 2000 characters or less'
      }

      if (config.retention_days && (config.retention_days < 30 || config.retention_days > 3650)) {
        errors.analysis_config = 'Retention days must be between 30 and 3650'
      }

      if (config.alert_high !== null && config.alert_low !== null && 
          config.alert_high !== undefined && config.alert_low !== undefined &&
          config.alert_high <= config.alert_low) {
        errors.analysis_config = 'High alert threshold must be greater than low alert threshold'
      }
    }

    return errors
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">KPI Registry</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your KPI configurations and N8N workflow connections
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add KPI
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadKPIs}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
            <span className="ml-3 text-gray-600">Loading KPIs...</span>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && kpis.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No KPIs configured</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first KPI configuration.</p>
            <Button onClick={() => {
              resetForm()
              setShowForm(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First KPI
            </Button>
          </div>
        </Card>
      )}

      {/* KPI List */}
      {!loading && !error && kpis.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KPI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Webhook URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {kpis.map((kpi) => (
                  <tr key={kpi.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{kpi.name}</div>
                        <div className="text-sm text-gray-500">{kpi.description || 'No description'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900 truncate max-w-xs">
                          {kpi.webhook_url}
                        </span>
                        <a 
                          href={kpi.webhook_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={kpi.active ? 'success' : 'error'}>
                        {kpi.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-2 w-2 bg-gray-400 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-500">Not Connected</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(kpi.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => testWebhook(kpi.webhook_url)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Test Webhook"
                          disabled={testingWebhook}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleImport(kpi)}
                          className="text-green-600 hover:text-green-900"
                          title="Import Historical Data"
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(kpi)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit KPI"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(kpi)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete KPI"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add/Edit Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingKpi(null)
          resetForm()
        }}
        title={editingKpi ? 'Edit KPI' : 'Add New KPI'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* General Error */}
          {formErrors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-sm text-red-700">{formErrors.general}</span>
              </div>
            </div>
          )}

          <Input
            label="Name *"
            type="text"
            placeholder="e.g., BTC Price"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={formErrors.name}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className={`input-field ${formErrors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              rows={3}
              placeholder="Brief description of this KPI"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
            {formErrors.description && (
              <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
            )}
          </div>
          
          <div>
            <Input
              label="N8N Webhook URL *"
              type="url"
              placeholder="https://n8n.example.com/webhook/..."
              value={formData.webhook_url}
              onChange={(e) => handleInputChange('webhook_url', e.target.value)}
              error={formErrors.webhook_url}
              required
            />
            {formData.webhook_url && (
              <div className="mt-2 flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => testWebhook(formData.webhook_url)}
                  disabled={!formData.webhook_url || testingWebhook}
                >
                  {testingWebhook ? (
                    <>
                      <Loader className="h-3 w-3 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Test Webhook
                    </>
                  )}
                </Button>
                {webhookTestResult && (
                  <div className={`flex items-center text-sm ${
                    webhookTestResult.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {webhookTestResult.success ? (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-1" />
                    )}
                    {webhookTestResult.message}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* N8N Workflow Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              N8N Workflow Integration
            </label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Workflow Configuration Required
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p className="mb-2">
                      After creating this KPI, you need to configure the corresponding N8N workflow:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Create a new workflow in your N8N instance</li>
                      <li>Add a Webhook trigger node with the URL above</li>
                      <li>Configure data collection nodes for your KPI</li>
                      <li>Add chart generation (optional)</li>
                      <li>Send results to the Ingestion Worker endpoint</li>
                    </ul>
                    <p className="mt-2 text-xs">
                      <strong>Note:</strong> The webhook URL should be unique for each KPI and match your N8N instance domain.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analysis Configuration
            </label>
            {formErrors.analysis_config && (
              <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {formErrors.analysis_config}
              </div>
            )}
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              
              {/* Chart Generation Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Chart Generation Method
                </label>
                <select
                  value={formData.analysis_config.chart_method || 'external'}
                  onChange={(e) => handleInputChange('analysis_config', {
                    ...formData.analysis_config,
                    chart_method: e.target.value
                  })}
                  className="input-field"
                >
                  <option value="external">External Service (chart-img.com)</option>
                  <option value="n8n">N8N Python Node</option>
                  <option value="cloudflare">Cloudflare Worker</option>
                  <option value="none">No Chart Generation</option>
                </select>
              </div>

              {/* Chart Type */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Chart Type
                </label>
                <select
                  value={formData.analysis_config.chart_type || 'line'}
                  onChange={(e) => handleInputChange('analysis_config', {
                    ...formData.analysis_config,
                    chart_type: e.target.value
                  })}
                  className="input-field"
                >
                  <option value="line">Line Chart</option>
                  <option value="candlestick">Candlestick Chart</option>
                  <option value="bar">Bar Chart</option>
                  <option value="area">Area Chart</option>
                </select>
              </div>

              {/* LLM Analysis Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  LLM Analysis Priority
                </label>
                <select
                  value={formData.analysis_config.llm_priority || 'standard'}
                  onChange={(e) => handleInputChange('analysis_config', {
                    ...formData.analysis_config,
                    llm_priority: e.target.value
                  })}
                  className="input-field"
                >
                  <option value="high">High Priority (Detailed Analysis)</option>
                  <option value="standard">Standard Priority</option>
                  <option value="low">Low Priority (Basic Analysis)</option>
                  <option value="none">Skip LLM Analysis</option>
                </select>
              </div>

              {/* Analysis Prompts */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Custom Analysis Prompt
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Optional: Custom prompt for LLM analysis of this KPI"
                  value={formData.analysis_config.custom_prompt || ''}
                  onChange={(e) => handleInputChange('analysis_config', {
                    ...formData.analysis_config,
                    custom_prompt: e.target.value
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use default analysis prompts
                </p>
              </div>

              {/* Data Retention */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Data Retention (days)
                </label>
                <input
                  type="number"
                  min="30"
                  max="3650"
                  value={formData.analysis_config.retention_days || 365}
                  onChange={(e) => handleInputChange('analysis_config', {
                    ...formData.analysis_config,
                    retention_days: parseInt(e.target.value) || 365
                  })}
                  className="input-field"
                  placeholder="365"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of days to keep data in active storage (30-3650 days)
                </p>
              </div>

              {/* Alert Thresholds */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Alert Thresholds
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      step="any"
                      placeholder="High threshold"
                      value={formData.analysis_config.alert_high || ''}
                      onChange={(e) => handleInputChange('analysis_config', {
                        ...formData.analysis_config,
                        alert_high: e.target.value ? parseFloat(e.target.value) : null
                      })}
                      className="input-field"
                    />
                    <p className="text-xs text-gray-500 mt-1">High alert threshold</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Low threshold"
                      value={formData.analysis_config.alert_low || ''}
                      onChange={(e) => handleInputChange('analysis_config', {
                        ...formData.analysis_config,
                        alert_low: e.target.value ? parseFloat(e.target.value) : null
                      })}
                      className="input-field"
                    />
                    <p className="text-xs text-gray-500 mt-1">Low alert threshold</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => handleInputChange('active', e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
              Active (KPI will be included in scheduled runs)
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false)
                setEditingKpi(null)
                resetForm()
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  {editingKpi ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingKpi ? 'Update KPI' : 'Create KPI'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete KPI"
      >
        <div className="space-y-4">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-red-500 mr-3 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Are you sure you want to delete this KPI?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This will permanently delete the KPI configuration and all associated time series data. This action cannot be undone.
              </p>
              {deleteConfirm && (
                <div className="bg-gray-50 rounded-md p-3 mb-4">
                  <div className="text-sm font-medium text-gray-900">{deleteConfirm.name}</div>
                  <div className="text-sm text-gray-500">{deleteConfirm.description}</div>
                  <div className="text-xs text-gray-400 mt-1">ID: {deleteConfirm.id}</div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteKPI(deleteConfirm.id)}
            >
              Delete KPI
            </Button>
          </div>
        </div>
      </Modal>

      {/* Historical Data Import Modal */}
      <HistoricalDataImport
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false)
          setImportingKpi(null)
        }}
        kpi={importingKpi}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}

export default KPIRegistry