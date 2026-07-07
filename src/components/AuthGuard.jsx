import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Redirects to /welcome if not authenticated.
 * Shows a loading spinner while checking auth state.
 */
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

/**
 * Redirects to / if already authenticated.
 * Used on /welcome and /onboarding to prevent re-login.
 */
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
