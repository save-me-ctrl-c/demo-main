import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RequireAuth({ children }) {
  const { isLoggedIn, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Loading...</div>
  }

  if (!isLoggedIn) {
    return <Navigate to="/welcome" replace />
  }

  return children
}

export function RedirectIfAuth({ children }) {
  const { isLoggedIn, loading } = useAuth()

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Loading...</div>
  }

  if (isLoggedIn) {
    return <Navigate to="/" replace />
  }

  return children
}
