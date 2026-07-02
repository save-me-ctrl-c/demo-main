import { Link } from 'react-router-dom'
import { useT } from '../i18n/LanguageContext'

function NotFound() {
  const { t } = useT()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 24px', textAlign: 'center' }}>

      <h1 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8, color: '#fff' }}>{t('not_found_title')}</h1>
      <p style={{ color: '#6E6E73', fontSize: '0.85rem', marginBottom: 24 }}>{t('not_found_desc')}</p>
      <Link to="/" style={{ color: '#1EABBE', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 500 }}>{t('not_found_back')}</Link>
    </div>
  )
}

export default NotFound
