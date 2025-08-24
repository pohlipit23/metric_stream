import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      // Check if we're running in development mode
      if (import.meta.env.DEV) {
        // In development, simulate a logged-in user
        setUser({
          email: 'dev@example.com',
          name: 'Development User',
          groups: ['admin']
        })
        setLoading(false)
        return
      }

      // In production, check Cloudflare Access headers
      // Cloudflare Access adds headers like CF-Access-Authenticated-User-Email
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else if (response.status === 401) {
        // User is not authenticated, redirect to Cloudflare Access
        window.location.href = '/cdn-cgi/access/login'
        return
      } else {
        throw new Error('Failed to check authentication status')
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      setError(err.message)
      
      // In production, redirect to Cloudflare Access login
      if (!import.meta.env.DEV) {
        window.location.href = '/cdn-cgi/access/login'
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    if (import.meta.env.DEV) {
      setUser(null)
      return
    }
    
    // Redirect to Cloudflare Access logout
    window.location.href = '/cdn-cgi/access/logout'
  }

  const value = {
    user,
    loading,
    error,
    logout,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}