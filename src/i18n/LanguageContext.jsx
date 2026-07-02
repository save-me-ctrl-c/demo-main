import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { zh, en } from './translations'

const dicts = { zh, en }
const STORAGE_KEY = 'afrogo_lang'

const LanguageContext = createContext(null)

function getInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {}
  // Detect browser language
  if (typeof navigator !== 'undefined') {
    const nav = navigator.language || ''
    if (nav.startsWith('zh')) return 'zh'
  }
  return 'en'
}

export function LanguageProvider({ children }) {
  const [lang, setLangRaw] = useState(getInitialLang)

  const setLang = useCallback((l) => {
    setLangRaw(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {}
  }, [])

  const toggleLang = useCallback(() => {
    setLang(l => (l === 'zh' ? 'en' : 'zh'))
  }, [setLang])

  const t = useMemo(() => {
    const dict = dicts[lang]
    return (key) => dict[key] || key
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useT() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    // Fallback for outside provider
    return {
      lang: 'en',
      setLang: () => {},
      toggleLang: () => {},
      t: (k) => en[k] || k,
    }
  }
  return ctx
}
