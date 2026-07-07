import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Welcome.css'

function Welcome() {
  const navigate = useNavigate()
  const { login, guestLogin } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    if (!phone.trim()) { setError('Please enter your phone number'); return }
    if (!password) { setError('Please enter your password'); return }
    setLoading(true)
    setError('')
    try {
      await login(phone.trim(), password, name.trim() || undefined, mode === 'register')
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleGuest() {
    setLoading(true)
    try {
      await guestLogin()
      navigate('/', { replace: true })
    } catch {
      setError('Guest login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="welcome-page">
      <div className="welcome-stars" />
      <div className="welcome-content">
        {/* Logo & tagline */}
        <div className="welcome-hero">
          <div className="welcome-logo">♪</div>
          <h1>AfroGO</h1>
          <p className="welcome-tagline">Dance with Africa. Move with AI.</p>
        </div>

        {/* Error */}
        {error && <div className="welcome-error">{error}</div>}

        {/* Login/Register form */}
        <form className="welcome-form" onSubmit={handleLogin}>
          <div className="welcome-tabs">
            <button
              type="button"
              className={`welcome-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >Sign In</button>
            <button
              type="button"
              className={`welcome-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => setMode('register')}
            >Register</button>
          </div>

          <div className="welcome-inputs">
            <div className="welcome-field">
              <span className="welcome-field-icon">📱</span>
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoFocus
              />
            </div>
            <div className="welcome-field">
              <span className="welcome-field-icon">🔒</span>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {mode === 'register' && (
              <div className="welcome-field">
                <span className="welcome-field-icon">👤</span>
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}
            <button type="submit" className="welcome-btn primary" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="welcome-divider"><span>or</span></div>

        {/* Guest */}
        <button className="welcome-btn ghost" onClick={handleGuest} disabled={loading}>
          👋 Try as Guest
        </button>

        <p className="welcome-hint">
          Mock accounts: +233200000001 / amina123, +234800000002 / chioma123, +277200000007 / seun123.
        </p>
      </div>
    </div>
  )
}

export default Welcome
