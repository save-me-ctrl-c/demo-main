import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider, useT } from './i18n/LanguageContext'
import { ThemeProvider } from './i18n/ThemeContext'
import AppLayout from './AppLayout'

// Pages
const Welcome = lazy(() => import('./pages/Welcome'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Social = lazy(() => import('./pages/Social'))
const Create = lazy(() => import('./pages/Create'))
const Library = lazy(() => import('./pages/Library'))
const Profile = lazy(() => import('./pages/Profile'))
const Player = lazy(() => import('./pages/Player'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  const { t } = useT()
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{t('loading')}</div>
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth & Onboarding (no tab bar) */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Main app (with tab bar) */}
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
  )
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppRoutes />
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
