import { useState } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

function Monitoring() {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const metrics = [
    { name: 'Queue Depth (LLM Analysis)', value: '3', status: 'normal' },
    { name: 'Queue Depth (Packaging)', value: '1', status: 'normal' },
    { name: 'Queue Depth (Delivery)', value: '0', status: 'normal' },
    { name: 'Avg Job Completion Time', value: '2.4 min', status: 'normal' },
    { name: 'KPI Success Rate (24h)', value: '94.2%', status: 'warning' },
    { name: 'LLM API Latency', value: '1.8s', status: 'normal' },
  ]

  const workers = [
    { name: 'Ingestion Worker', status: 'healthy', lastSeen: '30s ago', executions: '1,247' },
    { name: 'Scheduler Worker', status: 'healthy', lastSeen: '2m ago', executions: '24' },
    { name: 'Orchestration Worker', status: 'healthy', lastSeen: '1m ago', executions: '156' },
    { name: 'Admin Console Worker', status: 'healthy', lastSeen: '10s ago', executions: '89' },
  ]

  const recentJobs = [
    { id: 'job-2025-001', status: 'completed', duration: '2.1 min', kpis: '12/12', timestamp: '2 min ago' },
    { id: 'job-2025-002', status: 'running', duration: '1.3 min', kpis: '8/12', timestamp: '5 min ago' },
    { id: 'job-2025-003', status: 'failed', duration: '0.8 min', kpis: '3/12', timestamp: '12 min ago' },
    { id: 'job-2025-004', status: 'completed', duration: '2.4 min', kpis: '12/12', timestamp: '15 min ago' },
  ]

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">System Monitoring</h1>
          <p className="mt-2 text-sm text-gray-700">
            Real-time system health and performance metrics
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-primary flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {metrics.map((metric) => (
          <div key={metric.name} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
              </div>
              <div className={`p-2 rounded-full ${
                metric.status === 'normal' ? 'bg-green-100' :
                metric.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                {metric.status === 'normal' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : metric.status === 'warning' ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Worker Status */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Worker Status</h3>
          <div className="space-y-3">
            {workers.map((worker) => (
              <div key={worker.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    worker.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{worker.name}</p>
                    <p className="text-xs text-gray-500">Last seen: {worker.lastSeen}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{worker.executions}</p>
                  <p className="text-xs text-gray-500">executions</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Jobs</h3>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex items-center mr-3">
                    {job.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : job.status === 'running' ? (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{job.id}</p>
                    <p className="text-xs text-gray-500">
                      {job.duration} • {job.kpis} KPIs • {job.timestamp}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                  job.status === 'running' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Monitoring