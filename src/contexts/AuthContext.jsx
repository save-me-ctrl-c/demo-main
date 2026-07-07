import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth, setToken, getToken } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true while checking token

  // Check existing token on mount
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    auth.me()
      .then(res => { if (res?.user) setUser(res.user) })
      .catch(() => {
        // Server might be down — keep token, skip validation
        console.warn('[Auth] Server unreachable, using cached session')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (phone, password, name, isRegister) => {
    const res = await auth.login(phone, password, name, isRegister)
    setToken(res.token)
    setUser(res.user || { id: 'user', name: name || 'User' }) // fallback minimal user
  }, [])

  const guestLogin = useCallback(async () => {
    const res = await auth.guest()
    setToken(res.token)
    setUser(res.user || { id: 'guest', name: 'Guest' }) // fallback minimal user
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const isLoggedIn = !!user
  const isGuest = user && !user.phone // guest users have no phone

  return (
    <AuthContext.Provider value={{ user, loading, isLoggedIn, isGuest, login, guestLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
