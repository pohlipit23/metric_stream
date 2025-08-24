import { Activity, BarChart3, Clock, AlertCircle } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

function Dashboard() {
  const stats = [
    { name: 'Active KPIs', value: '12', icon: BarChart3, change: '+2', changeType: 'positive' },
    { name: 'Jobs Today', value: '24', icon: Activity, change: '+4', changeType: 'positive' },
    { name: 'Avg Response Time', value: '1.2s', icon: Clock, change: '-0.3s', changeType: 'positive' },
    { name: 'Failed Jobs', value: '2', icon: AlertCircle, change: '+1', changeType: 'negative' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-700">
          Overview of your Daily Index Tracker system
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.name} className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {item.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Jobs</h3>
          <div className="space-y-3">
            {[
              { id: 'job-001', status: 'completed', time: '2 minutes ago' },
              { id: 'job-002', status: 'running', time: '5 minutes ago' },
              { id: 'job-003', status: 'failed', time: '12 minutes ago' },
            ].map((job) => (
              <div key={job.id} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-3 ${
                    job.status === 'completed' ? 'bg-green-400' :
                    job.status === 'running' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                  <span className="text-sm font-medium text-gray-900">{job.id}</span>
                </div>
                <span className="text-sm text-gray-500">{job.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
          <div className="space-y-3">
            {[
              { component: 'Ingestion Worker', status: 'healthy' },
              { component: 'Scheduler Worker', status: 'healthy' },
              { component: 'N8N Instance', status: 'warning' },
            ].map((item) => (
              <div key={item.component} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-900">{item.component}</span>
                <Badge variant={
                  item.status === 'healthy' ? 'success' :
                  item.status === 'warning' ? 'warning' : 'error'
                }>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard