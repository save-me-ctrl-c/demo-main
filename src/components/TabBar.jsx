import { NavLink } from 'react-router-dom'
import { Home, Radio, Disc3, User } from './Icon'
import { useT } from '../i18n/LanguageContext'
import './TabBar.css'

function TabBar() {
  const { t } = useT()
  const tabs = [
    { path: '/', label: t('tab_social'), Icon: Home, end: true },
    { path: '/create', label: t('tab_create'), Icon: Radio },
    { path: '/library', label: t('tab_library'), Icon: Disc3 },
    { path: '/profile', label: t('tab_me'), Icon: User },
  ]

  return (
    <nav className="tab-bar">
      {tabs.map(({ path, label, Icon, end }) => (
        <NavLink key={path} to={path} end={end} className="tab-item">
          <Icon size={20} strokeWidth={1.5} />
          <span className="tab-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default TabBar
