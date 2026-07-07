import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider, useT } from './i18n/LanguageContext'
import { ThemeProvider } from './i18n/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { RequireAuth, RedirectIfAuth } from './components/AuthGuard'
import AppLayout from './AppLayout'

// First screen everyone sees — handles skip logic internally
import GuestHome from './pages/GuestHome'

// Auth pages — lazy loaded
const Welcome = lazy(() => import('./pages/Welcome'))
const Onboarding = lazy(() => import('./pages/Onboarding'))

// Tab pages — eager loaded
import Social from './pages/Social'
import Create from './pages/Create'
import Library from './pages/Library'
import Profile from './pages/Profile'

// Secondary pages — lazy loaded
const Player = lazy(() => import('./pages/Player'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  const { t } = useT()
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{t('loading')}</div>
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Landing — everyone sees this first (handles 7-day skip internally) */}
                <Route path="/" element={<GuestHome />} />

                {/* Auth pages */}
                <Route path="/welcome" element={<RedirectIfAuth><Welcome /></RedirectIfAuth>} />
                <Route path="/onboarding" element={<Onboarding />} />

                {/* Main app — requires non-guest login */}
                <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                  <Route path="/app" element={<Social />} />
                  <Route path="/create" element={<Create />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/player/:id" element={<Player />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
