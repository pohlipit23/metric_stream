import { useState, useEffect } from 'react'
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Activity,
  ExternalLink,
  Settings,
  Loader
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Modal from '../components/ui/Modal'
import { useAuth } from '../contexts/AuthContext'
import { workflowAPI, APIError } from '../utils/api'

function WorkflowManagement() {
  const { user, isAuthenticated } = useAuth()
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState({})
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)
  const [showExecutionHistory, setShowExecutionHistory] = useState(false)
  const [executionHistory, setExecutionHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Load workflows on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadWorkflows()
    }
  }, [isAuthenticated])

  // Auto-refresh workflows every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(() => {
      loadWorkflows()
    }, 30000)

    return () => clearInterval(interval)
  }, [isAuthenticated])

  // API Functions
  const loadWorkflows = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const workflows = await workflowAPI.list()
      setWorkflows(workflows)
    } catch (err) {
      console.error('Error loading workflows:', err)
      if (err instanceof APIError) {
        setError(err.message)
      } else {
        setError('Failed to load workflows')
      }
    } finally {
      setLoading(false)
    }
  }

  const performWorkflowAction = async (workflowId, action) => {
    try {
      setActionLoading(prev => ({ ...prev, [`${workflowId}-${action}`]: true }))
      
      await workflowAPI.performAction(workflowId, action)
      
      // Refresh workflows to get updated status
      await loadWorkflows()
      
    } catch (err) {
      console.error(`Error performing ${action} on workflow ${workflowId}:`, err)
      setError(err.message || `Failed to ${action} workflow`)
    } finally {
      setActionLoading(prev => ({ ...prev, [`${workflowId}-${action}`]: false }))
    }
  }

  const loadExecutionHistory = async (workflowId) => {
    try {
      setHistoryLoading(true)
      const history = await workflowAPI.getExecutionHistory(workflowId)
      setExecutionHistory(history)
    } catch (err) {
      console.error('Error loading execution history:', err)
      setError(err.message || 'Failed to load execution history')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleShowHistory = async (workflow) => {
    setSelectedWorkflow(workflow)
    setShowExecutionHistory(true)
    await loadExecutionHistory(workflow.id)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'inactive':
        return <Badge variant="error">Inactive</Badge>
      case 'paused':
        return <Badge variant="warning">Paused</Badge>
      case 'error':
        return <Badge variant="error">Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getExecutionStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">Success</Badge>
      case 'error':
        return <Badge variant="error">Error</Badge>
      case 'running':
        return <Badge variant="warning">Running</Badge>
      case 'waiting':
        return <Badge variant="secondary">Waiting</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDuration = (ms) => {
    if (!ms) return 'N/A'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">N8N Workflow Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Monitor and control your N8N workflows
          </p>
        </div>
        <Button 
          onClick={loadWorkflows}
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
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
              onClick={loadWorkflows}
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
            <span className="ml-3 text-gray-600">Loading workflows...</span>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && workflows.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <Settings className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
            <p className="text-gray-600 mb-6">
              No N8N workflows are currently configured or accessible.
            </p>
            <p className="text-sm text-gray-500">
              Make sure your N8N instance is running and accessible, and that workflows are properly configured.
            </p>
          </div>
        </Card>
      )}

      {/* Workflows List */}
      {!loading && !error && workflows.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Execution
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Health
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workflows.map((workflow) => (
                  <tr key={workflow.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{workflow.name}</div>
                        <div className="text-sm text-gray-500">ID: {workflow.id}</div>
                        {workflow.webhook_url && (
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-400 truncate max-w-xs">
                              {workflow.webhook_url}
                            </span>
                            <a 
                              href={workflow.webhook_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-1 text-gray-400 hover:text-gray-600"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(workflow.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {workflow.last_execution ? (
                          <>
                            <div className="text-sm text-gray-900">
                              {new Date(workflow.last_execution.finished_at || workflow.last_execution.started_at).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {getExecutionStatusBadge(workflow.last_execution.status)}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">Never executed</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">
                          {workflow.success_rate !== undefined ? `${workflow.success_rate}%` : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {workflow.total_executions || 0} executions
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {workflow.health_status === 'healthy' ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            <span className="text-sm text-green-700">Healthy</span>
                          </>
                        ) : workflow.health_status === 'warning' ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                            <span className="text-sm text-yellow-700">Warning</span>
                          </>
                        ) : workflow.health_status === 'error' ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                            <span className="text-sm text-red-700">Error</span>
                          </>
                        ) : (
                          <>
                            <div className="h-4 w-4 bg-gray-400 rounded-full mr-2"></div>
                            <span className="text-sm text-gray-500">Unknown</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Start/Resume Button */}
                        {(workflow.status === 'inactive' || workflow.status === 'paused') && (
                          <button
                            onClick={() => performWorkflowAction(workflow.id, 'start')}
                            disabled={actionLoading[`${workflow.id}-start`]}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="Start Workflow"
                          >
                            {actionLoading[`${workflow.id}-start`] ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        
                        {/* Pause Button */}
                        {workflow.status === 'active' && (
                          <button
                            onClick={() => performWorkflowAction(workflow.id, 'pause')}
                            disabled={actionLoading[`${workflow.id}-pause`]}
                            className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                            title="Pause Workflow"
                          >
                            {actionLoading[`${workflow.id}-pause`] ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        
                        {/* Stop Button */}
                        {(workflow.status === 'active' || workflow.status === 'paused') && (
                          <button
                            onClick={() => performWorkflowAction(workflow.id, 'stop')}
                            disabled={actionLoading[`${workflow.id}-stop`]}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Stop Workflow"
                          >
                            {actionLoading[`${workflow.id}-stop`] ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        
                        {/* History Button */}
                        <button
                          onClick={() => handleShowHistory(workflow)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Execution History"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                        
                        {/* Health Check Button */}
                        <button
                          onClick={() => performWorkflowAction(workflow.id, 'health-check')}
                          disabled={actionLoading[`${workflow.id}-health-check`]}
                          className="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                          title="Run Health Check"
                        >
                          {actionLoading[`${workflow.id}-health-check`] ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <Activity className="h-4 w-4" />
                          )}
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

      {/* Execution History Modal */}
      <Modal
        isOpen={showExecutionHistory}
        onClose={() => {
          setShowExecutionHistory(false)
          setSelectedWorkflow(null)
          setExecutionHistory([])
        }}
        title={`Execution History - ${selectedWorkflow?.name}`}
        size="large"
      >
        <div className="space-y-4">
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-3 text-gray-600">Loading execution history...</span>
            </div>
          ) : executionHistory.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No execution history</h3>
              <p className="text-gray-600">This workflow hasn't been executed yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Execution ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {executionHistory.map((execution) => (
                    <tr key={execution.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">
                          {execution.id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getExecutionStatusBadge(execution.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(execution.started_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDuration(execution.duration)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-red-600 max-w-xs truncate">
                          {execution.error || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default WorkflowManagement