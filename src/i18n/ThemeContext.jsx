import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'

const STORAGE_KEY = 'afrogo_theme'

/*
  Theme A "dark" — original black + teal
  Theme B "midnight" — SVG design: dark blue-gray + purple accent + teal secondary
*/

export const themes = {
  dark: {
    name: 'Dark',
    bg: '#000000',
    card: '#111111',
    cardHover: '#1A1A1A',
    surface: '#1C1C1E',
    accent: '#1EABBE',
    accentLight: '#40C4D8',
    accentDark: '#158A9C',
    accentGlow: 'rgba(30,171,190,0.2)',
    text: '#FFFFFF',
    textSecondary: '#B3B4B6',
    textMuted: '#6E6E73',
    textDim: '#48484C',
    border: 'rgba(255,255,255,0.06)',
    divider: 'rgba(255,255,255,0.04)',
    nowplayingBg: '#1EABBE',
    nowplayingText: '#000000',
    shadow: '0 0 60px rgba(30,171,190,0.1)',
  },
  midnight: {
    name: 'Midnight',
    bg: '#1A1930',
    card: '#1F1E3A',
    cardHover: '#292850',
    surface: '#14132A',
    accent: '#8D8AD1',
    accentLight: '#B5B3E6',
    accentDark: '#6A67C4',
    accentGlow: 'rgba(141,138,209,0.2)',
    text: '#F0EEFF',
    textSecondary: '#A9A6C8',
    textMuted: '#7875A0',
    textDim: '#4C4980',
    border: 'rgba(141,138,209,0.12)',
    divider: 'rgba(141,138,209,0.08)',
    nowplayingBg: '#8D8AD1',
    nowplayingText: '#14132A',
    shadow: '0 0 60px rgba(141,138,209,0.15)',
  },
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKeyRaw] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s === 'dark' || s === 'midnight') return s } catch {}
    return 'midnight'
  })

  const setThemeKey = useCallback((k) => {
    setThemeKeyRaw(k)
    try { localStorage.setItem(STORAGE_KEY, k) } catch {}
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeKey(k => (k === 'dark' ? 'midnight' : 'dark'))
  }, [setThemeKey])

  const theme = themes[themeKey]

  // Sync CSS custom properties to :root
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-bg', theme.bg)
    root.style.setProperty('--color-card', theme.card)
    root.style.setProperty('--color-card-hover', theme.cardHover)
    root.style.setProperty('--color-surface', theme.surface)
    root.style.setProperty('--color-accent', theme.accent)
    root.style.setProperty('--color-accent-light', theme.accentLight)
    root.style.setProperty('--color-accent-dark', theme.accentDark)
    root.style.setProperty('--color-accent-glow', theme.accentGlow)
    root.style.setProperty('--color-text', theme.text)
    root.style.setProperty('--color-text-secondary', theme.textSecondary)
    root.style.setProperty('--color-text-muted', theme.textMuted)
    root.style.setProperty('--color-text-dim', theme.textDim)
    root.style.setProperty('--color-border', theme.border)
    root.style.setProperty('--color-divider', theme.divider)
    root.style.setProperty('--color-nowplaying-bar', theme.nowplayingBg)
    root.style.setProperty('--color-nowplaying-text', theme.nowplayingText)
  }, [theme])

  const value = useMemo(() => ({ themeKey, theme, setThemeKey, toggleTheme }), [themeKey, theme, setThemeKey, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) return { themeKey: 'midnight', theme: themes.midnight, toggleTheme: () => {} }
  return ctx
}
