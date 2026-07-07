import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userProfile as fallbackProfile, menuItems as fallbackMenu } from '../data/mockData'
import { profile as profileApi } from '../api'
import { useT } from '../i18n/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../i18n/ThemeContext'
import LanguageSwitch from '../components/LanguageSwitch'
import Portal from '../components/Portal'
import { ChevronRight, Settings, HelpCircle, ShoppingBag, Wifi, BellRing, UserCog, Crown, Palette, Globe, X, Check, Smartphone, Shield, Info, LogOut, Gift } from '../components/Icon'
import './Profile.css'

const MENU_KEYS = ['member_center', 'points_mall', 'device_manager', 'notifications', 'settings', 'help_center']
const MENU_ICONS = [Crown, ShoppingBag, Wifi, BellRing, Settings, HelpCircle]

// Sub-page content renderers
function MemberSubPage({ t }) {
  return (
    <div className="sub-body">
      <div className="sub-hero" style={{ background: 'linear-gradient(135deg, #A455FC, #7C3AED)' }}>
        <Crown size={32} /><span className="sub-hero-title">GOLD</span>
        <p>{t('member_desc')}</p>
      </div>
      <div className="sub-list">
        <div className="sub-item"><Check size={16} className="icon-accent" /><span>{t('member_feat1')}</span></div>
        <div className="sub-item"><Check size={16} className="icon-accent" /><span>{t('member_feat2')}</span></div>
        <div className="sub-item"><Check size={16} className="icon-accent" /><span>{t('member_feat3')}</span></div>
        <div className="sub-item"><Check size={16} className="icon-accent" /><span>{t('member_feat4')}</span></div>
      </div>
      <button className="sub-btn">{t('upgrade_now')}</button>
    </div>
  )
}

function PointsSubPage({ t }) {
  return (
    <div className="sub-body">
      <div className="sub-hero" style={{ background: 'linear-gradient(135deg, #F59E0B, #FFB703)' }}>
        <Gift size={32} /><span className="sub-hero-val">12,450</span>
        <p>{t('points_desc')}</p>
      </div>
      <div className="sub-grid">
        <div className="sub-gcard"><span>🎬</span><span className="sgc-val">+50</span><span className="sgc-lbl">{t('pts_record')}</span></div>
        <div className="sub-gcard"><span>💬</span><span className="sgc-val">+10</span><span className="sgc-lbl">{t('pts_comment')}</span></div>
        <div className="sub-gcard"><span>👥</span><span className="sgc-val">+100</span><span className="sgc-lbl">{t('pts_invite')}</span></div>
        <div className="sub-gcard"><span>🔥</span><span className="sgc-val">+200</span><span className="sgc-lbl">{t('pts_trending')}</span></div>
      </div>
      <button className="sub-btn" style={{ background: 'linear-gradient(135deg, #F59E0B, #FFB703)' }}>{t('redeem_now')}</button>
    </div>
  )
}

function DeviceSubPage({ t }) {
  return (
    <div className="sub-body">
      <div className="sub-device-card">
        <Smartphone size={24} /><div><span className="sd-name">Transsion Smart Speaker</span><span className="sd-status">🟢 {t('connected')}</span></div>
      </div>
      <div className="sub-list">
        <div className="sub-item"><Check size={16} className="icon-accent" /><span>{t('dev_sync')}</span></div>
        <div className="sub-item"><Check size={16} className="icon-accent" /><span>{t('dev_voice')}</span></div>
        <div className="sub-item"><Check size={16} className="icon-accent" /><span>{t('dev_battery')}</span></div>
      </div>
      <button className="sub-btn secondary">{t('unbind')}</button>
    </div>
  )
}

function NotifSubPage({ t }) {
  return (
    <div className="sub-body">
      <div className="sub-list">
        <div className="sub-item"><span className="sub-badge hot">NEW</span><div><span className="sub-item-title">{t('notif_like')}</span><span className="sub-item-time">{t('time_2m')}</span></div></div>
        <div className="sub-item"><div><span className="sub-item-title">{t('notif_views')}</span><span className="sub-item-time">{t('time_1h')}</span></div></div>
        <div className="sub-item"><div><span className="sub-item-title">{t('notif_template')}</span><span className="sub-item-time">{t('time_3h')}</span></div></div>
        <div className="sub-item"><div><span className="sub-item-title">{t('notif_follow')}</span><span className="sub-item-time">{t('time_yday')}</span></div></div>
      </div>
    </div>
  )
}

function SettingsSubPage({ t, themeKey, toggleTheme, onLogout }) {
  return (
    <div className="sub-body">
      <div className="sub-list">
        <div className="sub-item"><Globe size={16} /><span>{t('language')}</span><LanguageSwitch /></div>
        <div className="sub-item"><Palette size={16} /><span>{t('theme_label')}</span><button onClick={toggleTheme} className="sub-chip">{themeKey === 'dark' ? t('theme_dark') : t('theme_midnight')}</button></div>
        <div className="sub-item"><Shield size={16} /><span>{t('privacy')}</span><ChevronRight size={14} className="icon-muted" /></div>
        <div className="sub-item"><Info size={16} /><span>{t('about')}</span><span className="sub-val">v1.0.0</span></div>
      </div>
      <button className="sub-btn secondary" onClick={onLogout} style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.2)' }}><LogOut size={14} /> {t('logout')}</button>
    </div>
  )
}

function HelpSubPage({ t }) {
  return (
    <div className="sub-body">
      <div className="sub-list">
        <div className="sub-item"><span>📖</span><span>{t('help_faq')}</span><ChevronRight size={14} /></div>
        <div className="sub-item"><span>💬</span><span>{t('help_contact')}</span><ChevronRight size={14} /></div>
        <div className="sub-item"><span>📋</span><span>{t('help_terms')}</span><ChevronRight size={14} /></div>
        <div className="sub-item"><span>🔒</span><span>{t('help_privacy')}</span><ChevronRight size={14} /></div>
      </div>
    </div>
  )
}

function ThemeSubPage({ t, themeKey, toggleTheme }) {
  return (
    <div className="sub-body">
      <div className="sub-list">
        <div className="sub-item" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
          <span>🌙</span><span>{t('theme_dark')}</span>
          {themeKey === 'dark' && <Check size={16} className="icon-accent" style={{ marginLeft: 'auto' }} />}
        </div>
        <div className="sub-item" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
          <span>💜</span><span>{t('theme_midnight')}</span>
          {themeKey === 'midnight' && <Check size={16} className="icon-accent" style={{ marginLeft: 'auto' }} />}
        </div>
      </div>
    </div>
  )
}

function LanguageSubPage({ t }) {
  return (
    <div className="sub-body">
      <div className="sub-list">
        <div className="sub-item"><Globe size={16} /><span>{t('language')}</span><LanguageSwitch /></div>
      </div>
    </div>
  )
}

function PostsSubPage({ t }) {
  return (
    <div className="sub-body">
      <div className="sub-list">
        <div className="sub-item"><span>🎬</span><span>{t('my_posts_empty')}</span></div>
      </div>
    </div>
  )
}

function DraftsSubPage({ t }) {
  return (
    <div className="sub-body">
      <div className="sub-list">
        <div className="sub-item"><div className="draft-thumb" style={{ background: 'linear-gradient(135deg, #B388FF, #B388FF88)', width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span>🎬</span></div><div><span className="sub-item-title">{t('draft_untitled')}</span><span className="sub-item-time">{t('draft_saved')} 3h</span></div></div>
        <div className="sub-item"><div className="draft-thumb" style={{ background: 'linear-gradient(135deg, #1EABBE, #1EABBE88)', width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span>💃</span></div><div><span className="sub-item-title">Azonto Practice</span><span className="sub-item-time">{t('draft_saved')} 1d</span></div></div>
      </div>
    </div>
  )
}

function FavoritesSubPage({ t }) {
  return (
    <div className="sub-body">
      <div className="sub-list">
        <div className="sub-item"><span>❤️</span><span>{t('fav_empty')}</span></div>
      </div>
    </div>
  )
}

function TipsSubPage({ t }) {
  return (
    <div className="sub-body">
      <div className="sub-hero" style={{ background: 'linear-gradient(135deg, #FFB703, #F59E0B)' }}>
        <Gift size={32} /><span className="sub-hero-val">8,920</span>
        <p>{t('tips_desc')}</p>
      </div>
      <div className="sub-list">
        <div className="sub-item"><span>🎁</span><span>Zuri Uzoma · 500 pts</span><span className="sub-item-time">{t('time_yday')}</span></div>
        <div className="sub-item"><span>🎁</span><span>Oluwaseun Bello · 200 pts</span><span className="sub-item-time">{t('time_3h')}</span></div>
      </div>
    </div>
  )
}

const SUB_PAGES = {
  member_center: MemberSubPage,
  points_mall: PointsSubPage,
  device_manager: DeviceSubPage,
  notifications: NotifSubPage,
  settings: SettingsSubPage,
  help_center: HelpSubPage,
  theme: ThemeSubPage,
  language: LanguageSubPage,
  posts: PostsSubPage,
  drafts: DraftsSubPage,
  favorites: FavoritesSubPage,
  tips: TipsSubPage,
}

function Profile() {
  const { t } = useT()
  const { themeKey, toggleTheme } = useTheme()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(fallbackProfile)
  const [menuItems] = useState(fallbackMenu)
  const [device, setDevice] = useState(fallbackProfile.device)
  const [subPage, setSubPage] = useState(null)

  const handleLogout = () => {
    logout()
    navigate('/welcome', { replace: true })
  }

  const SubComponent = subPage ? SUB_PAGES[subPage] : null

  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      try {
        const res = await profileApi.get()
        const next = res.profile
        if (cancelled) return
        setProfile({
          ...fallbackProfile,
          ...next,
          id: next.phone || next.id,
          followers: next.followers,
          following: next.following,
          likes: next.likes,
        })
        setDevice(next.devices?.[0] || { name: 'Offline', model: '', connected: false })
      } catch (err) {
        console.warn('Failed to load profile:', err.message)
      }
    }
    loadProfile()
    return () => { cancelled = true }
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
        <div className="pf-card" onClick={() => setSubPage('posts')}><span className="pfc-num">{profile.posts}</span><span className="pfc-lbl">{t('posts')}</span></div>
        <div className="pf-card" onClick={() => setSubPage('drafts')}><span className="pfc-num">{profile.drafts}</span><span className="pfc-lbl">{t('drafts')}</span></div>
        <div className="pf-card" onClick={() => setSubPage('favorites')}><span className="pfc-num">{profile.favorites}</span><span className="pfc-lbl">{t('favorites')}</span></div>
        <div className="pf-card" onClick={() => setSubPage('tips')}><span className="pfc-num">{profile.tipsReceived}</span><span className="pfc-lbl">{t('tips_received')}</span></div>
      </div>

      <div className="device-card">
        <div className="dev-info">
          <Wifi size={16} className={device.connected ? 'icon-accent' : 'icon-muted'} />
          <div><span className="dev-name">{device.name}</span><span className={`dev-status ${device.connected ? 'on' : ''}`}>{device.connected ? t('connected') : t('offline')}</span></div>
        </div>
        <span className="dev-model">{device.model}</span>
      </div>

      <div className="pf-menu">
        <div className="pf-menu-item" onClick={() => setSubPage('theme')}>
          <Palette size={16} className="icon-accent" />
          <span className="pfm-label">{t('theme_label')}</span>
          <button onClick={(e) => { e.stopPropagation(); toggleTheme() }} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', padding: '6px 12px', borderRadius: '16px', fontSize: '0.7rem', cursor: 'pointer', minHeight: 'auto' }}>{themeKey === 'dark' ? t('theme_dark') : t('theme_midnight')}</button>
        </div>
      </div>

      <div className="pf-menu">
        <div className="pf-menu-item" onClick={() => setSubPage('language')}>
          <Globe size={16} className="icon-accent" />
          <span className="pfm-label">{t('language')}</span>
          <LanguageSwitch />
        </div>
      </div>

      <div className="pf-menu">
        {menuItems.map((m, i) => (
          <button key={i} className="pf-menu-item" onClick={() => setSubPage(MENU_KEYS[i])}>
            {React.createElement(MENU_ICONS[i], { size: 16, className: m.accent ? 'icon-accent' : 'icon-muted' })}
            <span className={`pfm-label ${m.accent ? 'accent' : ''}`}>{t(MENU_KEYS[i])}</span>
            {m.badge && <span className={`pfm-badge ${m.online ? 'on' : ''} ${m.accent ? 'accent' : ''}`}>{m.badge}</span>}
            <ChevronRight size={16} className="icon-muted" />
          </button>
        ))}
      </div>

      <div className="pf-footer">
        <button className="logout-btn" onClick={handleLogout}>{t('logout')}</button>
        <p className="pf-version">{t('version')}</p>
      </div>

      {/* === Sub-page Bottom Sheet === */}
      {subPage && (
        <Portal>
          <div className="sheet-overlay" onClick={() => setSubPage(null)}>
            <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="sheet-header">
                <h2>{subPage === 'theme' ? t('theme_label') : subPage === 'language' ? t('language') : subPage === 'posts' ? t('posts') : subPage === 'drafts' ? t('drafts') : subPage === 'favorites' ? t('favorites') : subPage === 'tips' ? t('tips_received') : t(subPage)}</h2>
                <button className="panel-back" onClick={() => setSubPage(null)}><X size={20} /></button>
              </div>
              {SubComponent ? <SubComponent t={t} themeKey={themeKey} toggleTheme={toggleTheme} onLogout={handleLogout} /> : (
                <div className="sub-body"><p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 40 }}>{t('coming_soon')}</p></div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

export default Profile
