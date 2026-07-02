import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider, useT } from './i18n/LanguageContext'
import { ThemeProvider } from './i18n/ThemeContext'
import AppLayout from './AppLayout'

// Auth pages — lazy loaded (only seen once)
const Welcome = lazy(() => import('./pages/Welcome'))
const Onboarding = lazy(() => import('./pages/Onboarding'))

// Tab pages — eager loaded (no flicker on tab switch)
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
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Social />} />
                <Route path="/create" element={<Create />} />
                <Route path="/library" element={<Library />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/player/:id" element={<Player />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
