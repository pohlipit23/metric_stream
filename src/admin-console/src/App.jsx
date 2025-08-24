import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AuthGuard from './components/AuthGuard'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import KPIRegistry from './pages/KPIRegistry'
import WorkflowManagement from './pages/WorkflowManagement'
import SystemConfig from './pages/SystemConfig'
import Monitoring from './pages/Monitoring'
import ScheduleManagement from './pages/ScheduleManagement'

function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthGuard>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/kpis" element={<KPIRegistry />} />
              <Route path="/kpi-registry" element={<KPIRegistry />} />
              <Route path="/workflows" element={<WorkflowManagement />} />
              <Route path="/config" element={<SystemConfig />} />
              <Route path="/schedules" element={<ScheduleManagement />} />
              <Route path="/monitoring" element={<Monitoring />} />
            </Routes>
          </Layout>
        </AuthGuard>
      </Router>
    </AuthProvider>
  )
}

export default App