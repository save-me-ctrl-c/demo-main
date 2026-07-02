import { useT } from '../i18n/LanguageContext'

function LanguageSwitch() {
  const { lang, toggleLang } = useT()
  return (
    <button onClick={toggleLang}
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', padding: '6px 12px', borderRadius: '16px', fontSize: '0.7rem', cursor: 'pointer', minHeight: 'auto' }}>
      {lang === 'zh' ? 'EN' : '中'}
    </button>
  )
}

export default LanguageSwitch
