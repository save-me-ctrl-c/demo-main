import { useState, useEffect, useRef } from 'react'
import { videos as videosApi } from '../api'
import { videos as fallbackVideos, topics as fallbackTopics, rankings as fallbackRankings } from '../data/mockData'
import { useT } from '../i18n/LanguageContext'
import { useTheme } from '../i18n/ThemeContext'
import LanguageSwitch from '../components/LanguageSwitch'
import { Bell, ThumbsUp, MessageCircle, Share2, Gift, Plus, ArrowLeft, Play, Music, MapPin } from '../components/Icon'
import './Social.css'

function Social() {
  const { t } = useT()
  const { themeKey, toggleTheme } = useTheme()
  const [videos, setVideos] = useState(fallbackVideos)
  const [topics, setTopics] = useState(fallbackTopics)
  const [rankings, setRankings] = useState(fallbackRankings)
  const [feedMode, setFeedMode] = useState(false)
  const feedRef = useRef(null)

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const [vRes, tRes, rRes] = await Promise.all([videosApi.list(), videosApi.topics(), videosApi.rankings()])
        setVideos(vRes.videos.map(v => ({
          id: v.id, user: { name: v.user.name, avatar: v.user.avatar, verified: v.verified, followers: v.user.followers },
          desc: v.desc, song: `${v.songTitle} — ${v.songArtist}`,
          likes: fmt(v.likes), comments: String(v.comments), shares: fmt(v.shares), tips: fmt(v.tips),
          color: v.color, dance: v.danceStyle, region: v.region,
        })))
        setTopics(tRes.topics.map(t => ({ name: t.name, posts: t.postsCount })))
        setRankings(rRes.rankings.map(r => ({ rank: r.rank, name: r.name, score: r.score, type: r.type })))
      } catch { /* fallback */ }
    }
    fetchData()
  }, [])

  const [feedIdx, setFeedIdx] = useState(0)

  // Track scroll position in fullscreen feed
  useEffect(() => {
    if (!feedMode || !feedRef.current) return
    const el = feedRef.current
    const onScroll = () => { setFeedIdx(Math.round(el.scrollTop / el.clientHeight)) }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [feedMode])

  function enterFeed(idx) {
    setFeedIdx(idx)
    setFeedMode(true)
    setTimeout(() => { if (feedRef.current) feedRef.current.scrollTop = idx * feedRef.current.clientHeight }, 50)
  }

  const heroVideo = videos[0]

  // ── Fullscreen Feed ──
  if (feedMode) {
    return (
      <div className="feed-fullscreen">
        <div className="feed-fs-top">
          <button className="feed-fs-back" onClick={() => setFeedMode(false)}><ArrowLeft size={20} /></button>
          <span className="feed-fs-title">For You</span>
          <button className="feed-fs-search"><Bell size={18} /></button>
        </div>
        <div className="feed-fs-scroll" ref={feedRef}>
          {videos.map((v, i) => (
            <div key={v.id} className="feed-fs-item">
              <div className="feed-fs-media" style={{ background: `linear-gradient(180deg, ${v.color}44 0%, ${v.color}22 40%, #0a0a0a 80%)` }}>
                <span className="feed-fs-play-icon">▶</span>
              </div>
              <div className="feed-fs-actions">
                <button className="fs-act"><ThumbsUp size={26} /><small>{v.likes}</small></button>
                <button className="fs-act"><MessageCircle size={26} /><small>{v.comments}</small></button>
                <button className="fs-act"><Share2 size={26} /><small>{v.shares}</small></button>
                <button className="fs-act"><Gift size={26} /><small>{v.tips}</small></button>
              </div>
              <div className="feed-fs-info">
                <div className="fs-user-row">
                  <span className="fs-avatar">{v.user.avatar}</span>
                  <span className="fs-username">{v.user.name}</span>
                  {v.user.verified && <span className="verified-mark">✓</span>}
                  <button className="fs-follow"><Plus size={12} /> Follow</button>
                </div>
                <p className="fs-desc">{v.desc}</p>
                <div className="fs-meta"><span><Music size={12} /> {v.song}</span><span><MapPin size={12} /> {v.region}</span></div>
              </div>
              <div className="feed-fs-dots">
                {videos.map((_, di) => <span key={di} className={`fs-dot ${di === i ? 'active' : ''}`}
                  onClick={() => { if (feedRef.current) feedRef.current.scrollTop = di * feedRef.current.clientHeight }} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Overview ──
  return (
    <div className="social-page">
      {/* Header: language + theme + logo + notification */}
      <div className="social-header">
        <div className="social-header-left">
          <LanguageSwitch />
          <button onClick={toggleTheme} className="toggle-btn">
            {themeKey === 'dark' ? '◑' : '◐'}
          </button>
        </div>
        <span className="social-logo">AfroGO</span>
        <button className="notif-btn" aria-label={t('social_notif')}><Bell size={18} /><i className="notif-dot" /></button>
      </div>

      {/* Topics */}
      <div className="h-scroll topic-row">
        {topics.map((tp, i) => <button key={i} className="topic-chip">{tp.name}</button>)}
      </div>

      {/* Main video card — tap to enter fullscreen feed */}
      <div className="feed-card" onClick={() => enterFeed(0)} style={{ '--accent': heroVideo.color, cursor: 'pointer' }}>
        <div className="feed-media">
          <div className="feed-thumb"><span className="feed-play-icon">▶</span></div>
        </div>
        <div className="feed-actions">
          <button className="act-btn" onClick={e => e.stopPropagation()}><ThumbsUp size={22} /><small>{heroVideo.likes}</small></button>
          <button className="act-btn" onClick={e => e.stopPropagation()}><MessageCircle size={22} /><small>{heroVideo.comments}</small></button>
          <button className="act-btn" onClick={e => e.stopPropagation()}><Share2 size={22} /><small>{heroVideo.shares}</small></button>
          <button className="act-btn" onClick={e => e.stopPropagation()}><Gift size={22} /><small>{heroVideo.tips}</small></button>
        </div>
        <div className="feed-info">
          <div className="feed-user-row">
            <span className="feed-avatar">{heroVideo.user.avatar}</span>
            <span className="feed-username">{heroVideo.user.name}</span>
            {heroVideo.user.verified && <span className="verified-mark">✓</span>}
            <span className="feed-follow"><Plus size={12} /> {t('social_follow')}</span>
          </div>
          <p className="feed-desc">{heroVideo.desc}</p>
          <div className="feed-meta">
            <span><Music size={12} className="icon-muted" /> {heroVideo.song}</span>
            <span><MapPin size={12} className="icon-muted" /> {heroVideo.region}</span>
          </div>
        </div>
        <div className="feed-card-overlay">
          <span>Watch more videos →</span>
        </div>
      </div>

      {/* Horizontal scroll row — more videos */}
      <div className="section-title">
        <h2>{t('near_you') || 'More Videos'}</h2>
      </div>
      <div className="h-scroll more-videos-row">
        {videos.map((v, i) => (
          <div key={v.id} className="more-video-item" onClick={() => enterFeed(i)}>
            <div className="mvi-thumb" style={{ background: `linear-gradient(135deg, ${v.color}, ${v.color}66)` }}>
              <Play size={14} fill="#fff" opacity={0.7} />
            </div>
            <span className="mvi-name">{v.user.name.split(' ')[0]}</span>
            <span className="mvi-dance">{v.dance}</span>
          </div>
        ))}
      </div>

      {/* Rankings */}
      <div className="section-title"><h2>{t('leaderboard')}</h2></div>
      <div className="rank-card">
        {rankings.map((r, i) => (
          <div key={i} className="rank-item">
            <span className="rank-pos">{r.rank}</span>
            <div className="rank-info"><span className="rank-name">{r.name}</span><span className="rank-type">{r.type}</span></div>
            <span className="rank-score">{r.score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

export default Social
