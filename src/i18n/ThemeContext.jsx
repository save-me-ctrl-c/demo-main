import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'

const STORAGE_KEY = 'afrogo_theme'

/* Both modes share the AfroGO violet palette. */

export const themes = {
  dark: {
    name: 'Violet night',
    bg: '#160724',
    card: '#28113d',
    cardHover: '#351650',
    surface: '#100419',
    accent: '#c084fc',
    accentLight: '#e9d5ff',
    accentDark: '#9333ea',
    accentGlow: 'rgba(192,132,252,0.24)',
    text: '#faf5ff',
    textSecondary: '#ddd6fe',
    textMuted: '#c4b5fd',
    textDim: '#8b5cf6',
    border: 'rgba(216,180,254,0.2)',
    divider: 'rgba(216,180,254,0.13)',
    nowplayingBg: '#9333ea',
    nowplayingText: '#ffffff',
    shadow: '0 0 60px rgba(147,51,234,0.22)',
  },
  midnight: {
    name: 'Orchid',
    bg: '#f3e8ff',
    card: 'rgba(255,255,255,0.72)',
    cardHover: '#faf5ff',
    surface: '#e9d5ff',
    accent: '#7c3aed',
    accentLight: '#a855f7',
    accentDark: '#5b21b6',
    accentGlow: 'rgba(124,58,237,0.18)',
    text: '#2e1065',
    textSecondary: '#6b21a8',
    textMuted: '#7c3aed',
    textDim: '#a78bfa',
    border: 'rgba(168,85,247,0.24)',
    divider: 'rgba(168,85,247,0.15)',
    nowplayingBg: '#7c3aed',
    nowplayingText: '#ffffff',
    shadow: '0 0 60px rgba(124,58,237,0.18)',
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
