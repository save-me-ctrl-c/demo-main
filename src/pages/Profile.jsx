import { useState, useEffect } from 'react'
import { profile as profileApi } from '../api'
import { userProfile as fallbackProfile, menuItems as fallbackMenu } from '../data/mockData'
import { useT } from '../i18n/LanguageContext'
import { useTheme } from '../i18n/ThemeContext'
import LanguageSwitch from '../components/LanguageSwitch'
import { ChevronRight, Settings, HelpCircle, ShoppingBag, Wifi, BellRing, UserCog, Crown, Palette, Globe } from '../components/Icon'
import './Profile.css'

const MENU_KEYS = ['member_center', 'points_mall', 'device_manager', 'notifications', 'settings', 'help_center']
const MENU_ICONS = [Crown, ShoppingBag, Wifi, BellRing, Settings, HelpCircle]

function Profile() {
  const { t } = useT()
  const { themeKey, toggleTheme } = useTheme()
  const [profile, setProfile] = useState(fallbackProfile)
  const [menuItems, setMenuItems] = useState(fallbackMenu)
  const [device, setDevice] = useState(fallbackProfile.device)

  useEffect(() => {
    async function fetchData() {
      try {
        const [profRes, devicesRes] = await Promise.all([
          profileApi.get().catch(() => null),
          profileApi.devices().catch(() => ({ devices: [] })),
        ])

        if (profRes?.profile) {
          const p = profRes.profile
          setProfile({
            name: p.name,
            id: `@${(p.name || 'user').toLowerCase().replace(/\s+/g, '_')}`,
            avatar: p.avatar,
            bio: p.bio,
            memberLevel: p.memberLevel,
            points: String(p.points?.toLocaleString?.() ?? p.points),
            followers: p.followers,
            following: p.following,
            likes: p.likes,
            posts: p.posts,
            drafts: p.drafts,
            favorites: p.favorites,
            tipsReceived: p.tipsReceived,
          })

          setMenuItems([
            { icon: '👑', label: 'Member Center', badge: p.memberLevel?.toUpperCase?.() || 'FREE', accent: p.memberLevel === 'gold' },
            { icon: '🎁', label: 'Points Mall', badge: `${(p.points || 0).toLocaleString()} pts` },
            { icon: '🔊', label: 'Device Manager', badge: 'Connected', online: true },
            { icon: '🔔', label: 'Notifications' },
            { icon: '⚙️', label: 'Settings' },
            { icon: '❓', label: 'Help Center' },
          ])
        }

        const devs = devicesRes?.devices
        if (devs && devs.length > 0) {
          setDevice({ name: devs[0].name, model: devs[0].model, connected: devs[0].connected })
        }
      } catch (err) {
        console.warn('Failed to fetch profile data, using mock:', err.message)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="profile-page">
      <header className="page-header"><h1>{t('profile_title')}</h1></header>

      <div className="pf-header">
        <div className="pf-avatar-wrap">
          <span className="pf-avatar">{profile.avatar}</span>
          <span className="pf-level-badge">{profile.memberLevel === 'gold' ? 'GOLD' : 'FREE'}</span>
        </div>
        <div className="pf-names"><h2>{profile.name}</h2><span className="pf-id">{profile.id}</span></div>
        <button className="pf-edit-btn"><UserCog size={14} /> {t('edit_profile')}</button>
      </div>
      <p className="pf-bio">{profile.bio}</p>

      <div className="pf-stats">
        <div className="pf-stat"><span className="pfs-val">{profile.followers}</span><span className="pfs-lbl">{t('followers')}</span></div>
        <div className="pfs-sep" />
        <div className="pf-stat"><span className="pfs-val">{profile.following}</span><span className="pfs-lbl">{t('following')}</span></div>
        <div className="pfs-sep" />
        <div className="pf-stat"><span className="pfs-val">{profile.likes}</span><span className="pfs-lbl">{t('likes')}</span></div>
      </div>

      <div className="pf-grid">
        <div className="pf-card"><span className="pfc-num">{profile.posts}</span><span className="pfc-lbl">{t('posts')}</span></div>
        <div className="pf-card"><span className="pfc-num">{profile.drafts}</span><span className="pfc-lbl">{t('drafts')}</span></div>
        <div className="pf-card"><span className="pfc-num">{profile.favorites}</span><span className="pfc-lbl">{t('favorites')}</span></div>
        <div className="pf-card"><span className="pfc-num">{profile.tipsReceived}</span><span className="pfc-lbl">{t('tips_received')}</span></div>
      </div>

      <div className="device-card">
        <div className="dev-info">
          <Wifi size={16} className={device.connected ? 'icon-accent' : 'icon-muted'} />
          <div><span className="dev-name">{device.name}</span><span className={`dev-status ${device.connected ? 'on' : ''}`}>{device.connected ? t('connected') : t('offline')}</span></div>
        </div>
        <span className="dev-model">{device.model}</span>
      </div>

      <div className="pf-menu">
        <div className="pf-menu-item">
          <Palette size={16} className="icon-accent" />
          <span className="pfm-label">Theme</span>
          <button onClick={toggleTheme} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', padding: '6px 12px', borderRadius: '16px', fontSize: '0.7rem', cursor: 'pointer', minHeight: 'auto' }}>
            {themeKey === 'dark' ? 'Dark' : 'Midnight'}
          </button>
        </div>
      </div>

      <div className="pf-menu">
        <div className="pf-menu-item" style={{ cursor: 'default' }}>
          <Globe size={16} className="icon-accent" />
          <span className="pfm-label">{t('language')}</span>
          <LanguageSwitch />
        </div>
      </div>

      <div className="pf-menu">
        {menuItems.map((m, i) => {
          const MIcon = MENU_ICONS[i]
          return (
            <button key={i} className="pf-menu-item">
              <MIcon size={16} className={m.accent ? 'icon-accent' : 'icon-muted'} />
              <span className={`pfm-label ${m.accent ? 'accent' : ''}`}>{t(MENU_KEYS[i])}</span>
              {m.badge && <span className={`pfm-badge ${m.online ? 'on' : ''} ${m.accent ? 'accent' : ''}`}>{m.badge}</span>}
              <ChevronRight size={16} className="icon-muted" />
            </button>
          )
        })}
      </div>

      <div className="pf-footer">
        <button className="logout-btn">{t('logout')}</button>
        <p className="pf-version">{t('version')}</p>
      </div>
    </div>
  )
}

export default Profile
