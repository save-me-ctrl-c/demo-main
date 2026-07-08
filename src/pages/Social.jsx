import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { videos as videosApi } from '../api'
import { videos as fallbackVideos, topics as fallbackTopics, rankings as fallbackRankings } from '../data/mockData'
import { useT } from '../i18n/LanguageContext'
import { useTheme } from '../i18n/ThemeContext'
import LanguageSwitch from '../components/LanguageSwitch'
import { Bell, Plus, ArrowLeft, Play, Music, MapPin } from '../components/Icon'
import './Social.css'

const DANCE_FILES = ['1.mp4', '2.mp4', '3.mp4', '4.mp4']

function Social() {
  const { t } = useT()
  const { isPlaying, handleTogglePlay } = useOutletContext()
  const { themeKey, toggleTheme } = useTheme()
  const [videos, setVideos] = useState(fallbackVideos)
  const [topics, setTopics] = useState(fallbackTopics)
  const [rankings, setRankings] = useState(fallbackRankings)
  const [feedMode, setFeedMode] = useState(false)
  const [feedIdx, setFeedIdx] = useState(0)
  const [toast, setToast] = useState('')
  const feedRef = useRef(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [vRes, tRes, rRes] = await Promise.all([videosApi.list(), videosApi.topics(), videosApi.rankings()])
        setVideos(vRes.videos.map((v, i) => ({
          id: v.id, user: { name: v.user.name, avatar: v.user.avatar, verified: v.verified, followers: v.user.followers },
          desc: v.desc, song: `${v.songTitle} — ${v.songArtist}`,
          likes: v.likes, comments: v.comments, shares: v.shares, tips: v.tips,
          color: v.color, dance: v.danceStyle, region: v.region,
          liked: v.liked,
          videoUrl: `/api/stream-video/${DANCE_FILES[i] || '1.mp4'}`,
          thumbnail: `/media/dance/${(DANCE_FILES[i] || '1').replace('.mp4', '')}_thumb.jpg`,
        })))
        setTopics(tRes.topics.map(t => ({ name: t.name, posts: t.postsCount })))
        setRankings(rRes.rankings.map(r => ({ rank: r.rank, name: r.name, score: r.score, type: r.type })))
      } catch {}
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!feedMode || !feedRef.current) return
    const el = feedRef.current
    const onScroll = () => setFeedIdx(Math.round(el.scrollTop / el.clientHeight))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [feedMode])

  function enterFeed(idx) { setFeedIdx(idx); setFeedMode(true) }
  function exitFeed() { setFeedMode(false) }

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 2000) }, [])

  const heroVideo = videos[0]

  // ══════════════════════════════════════
  // Fullscreen Feed
  // ══════════════════════════════════════
  if (feedMode) {
    return (
      <div className="feed-fullscreen">
        <div className="feed-fs-top">
          <button className="feed-fs-back" onClick={exitFeed}><ArrowLeft size={20} /></button>
          <span className="feed-fs-title">{t('social_feed_title')}</span>
          <button className="feed-fs-search"><Bell size={18} /></button>
        </div>
        {toast && <div className="toast toast-fs">{toast}</div>}
        <div className="feed-fs-scroll" ref={feedRef}>
          {videos.map((v, i) => (
            <VideoSlide key={v.id} video={v} idx={i} active={i === feedIdx} onToast={showToast} />
          ))}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════
  // Overview
  // ══════════════════════════════════════
  return (
    <div className="social-page">
      <div className="social-header">
        <div className="social-header-left">
          <LanguageSwitch />
          <button onClick={toggleTheme} className="toggle-btn">{themeKey === 'dark' ? '◑' : '◐'}</button>
        </div>
        <span className="social-logo">AfroGO</span>
        <button className="notif-btn"><Bell size={18} /><i className="notif-dot" /></button>
      </div>

      <div className="h-scroll topic-row">
        {topics.map((tp, i) => <button key={i} className="topic-chip">{tp.name}</button>)}
      </div>

      <div className="feed-card" onClick={() => { if (isPlaying) handleTogglePlay(); enterFeed(0) }} style={{ '--accent': heroVideo?.color, cursor: 'pointer' }}>
        <div className="feed-thumb" style={{ backgroundImage: `url(${heroVideo?.thumbnail || '/media/dance/1_thumb.jpg'})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="feed-info">
          <div className="feed-user-row">
            <span className="feed-avatar">{heroVideo?.user?.avatar}</span>
            <span className="feed-username">{heroVideo?.user?.name}</span>
            {heroVideo?.user?.verified && <span className="verified-mark">✓</span>}
            <span className="feed-follow"><Plus size={12} /> {t('social_follow')}</span>
          </div>
          <p className="feed-desc">{heroVideo?.desc}</p>
          <div className="feed-meta"><span><Music size={12} /> {heroVideo?.song}</span><span><MapPin size={12} /> {heroVideo?.region}</span></div>
        </div>
        <div className="feed-card-overlay"><span>{t('social_watch_feed')} →</span></div>
      </div>

      <div className="section-title"><h2>{t('near_you') || 'More Videos'}</h2></div>
      <div className="h-scroll more-videos-row">
        {videos.map((v, i) => (
          <div key={v.id} className="more-video-item" onClick={() => enterFeed(i)}>
            <div className="mvi-thumb" style={{ backgroundImage: `url(${v.thumbnail || '/media/dance/1_thumb.jpg'})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <span className="mvi-name">{v.user.name.split(' ')[0]}</span>
            <span className="mvi-dance">{v.dance}</span>
          </div>
        ))}
      </div>

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

// ═══════════════════════════════════════════
// VideoSlide — self-contained, memoized
// ═══════════════════════════════════════════
const GIFT_ICONS = ['💐','❤️','🔥','👏','🎉','💎','🌟','👑']
const GIFT_AMOUNTS = [1, 5, 10, 20, 50, 100, 500, 1000]

const VideoSlide = memo(function VideoSlide({ video, idx, active, onToast }) {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [prog, setProg] = useState(0)
  const [dur, setDur] = useState('0:00')
  const [cur, setCur] = useState('0:00')
  const [liked, setLiked] = useState(!!video.liked)
  const [showGifts, setShowGifts] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [likes, setLikes] = useState(video.likes)
  const [tips, setTips] = useState(video.tips)
  const [comments, setComments] = useState(video.comments)
  const [localComments, setLocalComments] = useState([
    { user: '👩🏾‍🦱 Amina', text: 'Love this move! 🔥', time: '2h ago' },
    { user: '🕺 Kwame', text: 'Can you do a tutorial?', time: '5h ago' },
    { user: '👨🏾 David', text: 'The beat is fire 🎵', time: '1d ago' },
  ])

  // Auto play/pause based on active state
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (active) el.play().catch(() => {})
    else { el.pause(); el.currentTime = 0; setPlaying(false) }
  }, [active])

  const togglePlay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) { el.play().catch(() => {}); setPlaying(true) }
    else { el.pause(); setPlaying(false) }
  }, [])

  const onTimeUpdate = useCallback((e) => {
    if (e.target.duration) {
      setProg((e.target.currentTime / e.target.duration) * 100)
      setCur(fmtTime(e.target.currentTime))
      setDur(fmtTime(e.target.duration))
    }
  }, [])

  const onSeek = useCallback((e) => {
    e.stopPropagation()
    const el = videoRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    el.currentTime = (e.clientX - rect.left) / rect.width * el.duration
  }, [])

  const handleLike = useCallback(async (e) => {
    e.stopPropagation()
    const nextLiked = !liked
    const delta = nextLiked ? 1 : -1
    setLiked(nextLiked)
    setLikes(l => Math.max(toNumber(l) + delta, 0))
    try {
      const res = await videosApi.like(video.id)
      setLiked(res.liked)
      setLikes(res.likes)
    } catch {
      setLiked(liked)
      setLikes(l => Math.max(toNumber(l) - delta, 0))
      onToast('Like failed')
    }
  }, [liked, onToast, video.id])

  const handleShare = useCallback((e) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(window.location.href).catch(() => {})
    onToast('Link copied!')
  }, [onToast])

  const handleGift = useCallback((e, amount) => {
    e.stopPropagation()
    setTips(t => t + amount)
    setShowGifts(false)
    onToast(`Sent ${amount} 🎁`)
  }, [onToast])

  const sendComment = useCallback(() => {
    const input = document.getElementById(`cmt-input-${idx}`)
    const text = input?.value?.trim()
    if (!text) return
    setLocalComments(prev => [{ user: '👤 You', text, time: 'Just now' }, ...prev])
    setComments(c => c + 1)
    if (input) input.value = ''
  }, [idx])

  return (
    <div className="feed-fs-item">
      {/* Video — pointer-events:none in CSS, all interaction via overlays */}
      <video ref={videoRef} src={video.videoUrl} className="feed-fs-video" loop playsInline
        onTimeUpdate={onTimeUpdate} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />

      {/* Tap zone: center area only, excludes right 62px for actions */}
      <div className="feed-fs-tap-zone" onClick={togglePlay}>
        {!playing && <Play size={48} fill="#fff" opacity={0.8} />}
      </div>

      {/* Gradients */}
      <div className="feed-fs-gradient-bottom" />
      <div className="feed-fs-gradient-top" />

      {/* Progress zone — tappable area above user info, expands on hover */}
      <div className="feed-fs-progress-zone" onClick={onSeek}>
        <div className="feed-fs-progress">
          <div className="feed-fs-prog-fill" style={{ width: `${prog}%` }} />
        </div>
      </div>
      <span className="feed-fs-time">{cur} / {dur}</span>

      {/* Right actions — each button stops propagation */}
      <div className="feed-fs-actions">
        <button className="fs-act" onClick={handleLike}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill={liked ? 'var(--color-accent)' : 'none'}
            stroke={liked ? 'var(--color-accent)' : '#fff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3m7-2V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z"/>
          </svg>
          <small>{fmt(likes)}</small>
        </button>
        <button className="fs-act" onClick={(e) => { e.stopPropagation(); setShowComments(true) }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <small>{comments}</small>
        </button>
        <button className="fs-act" onClick={handleShare}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
          </svg>
          <small>{fmt(video.shares)}</small>
        </button>
        <button className="fs-act" onClick={(e) => { e.stopPropagation(); setShowGifts(g => !g) }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="8" width="18" height="14" rx="2"/><path d="M12 8V22"/><path d="M12 8a4 4 0 0 0-4-4H7a1 1 0 0 0-1 1v3h6ZM12 8a4 4 0 0 1 4-4h1a1 1 0 0 1 1 1v3h-6Z"/>
          </svg>
          <small>{fmt(tips)}</small>
        </button>
      </div>

      {/* Gift panel */}
      {showGifts && (
        <div className="gift-panel" onClick={e => e.stopPropagation()}>
          {GIFT_ICONS.map((icon, gi) => (
            <button key={gi} className="gift-item" onClick={(e) => handleGift(e, GIFT_AMOUNTS[gi])}>
              <span className="gift-icon">{icon}</span>
              <span className="gift-amount">{GIFT_AMOUNTS[gi]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bottom info */}
      <div className="feed-fs-info">
        <div className="fs-user-row">
          <span className="fs-avatar">{video.user.avatar}</span>
          <span className="fs-username">{video.user.name}</span>
          {video.user.verified && <span className="verified-mark">✓</span>}
          <button className="fs-follow"><Plus size={12} /> Follow</button>
        </div>
        <p className="fs-desc">{video.desc}</p>
        <div className="fs-meta"><span><Music size={12} /> {video.song}</span><span><MapPin size={12} /> {video.region}</span></div>
      </div>

      {/* Comment panel */}
      {showComments && (
        <div className="comment-overlay" onClick={() => setShowComments(false)}>
          <div className="comment-panel" onClick={e => e.stopPropagation()}>
            <div className="comment-handle" />
            <h3>Comments ({localComments.length + comments - video.comments})</h3>
            <div className="comment-list">
              {localComments.map((c, i) => (
                <div key={i} className="comment-item">
                  <span className="cmt-user">{c.user}</span>
                  <div><span className="cmt-text">{c.text}</span><span className="cmt-time">{c.time}</span></div>
                </div>
              ))}
            </div>
            <div className="comment-input-row">
              <input id={`cmt-input-${idx}`} placeholder="Add comment..." onKeyDown={e => e.key === 'Enter' && sendComment()} />
              <button onClick={sendComment}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

function fmt(n) { return n >= 1000 ? (n/1000).toFixed(1).replace(/\.0$/,'') + 'K' : String(n) }
function toNumber(n) {
  if (typeof n === 'number') return n;
  const value = parseFloat(String(n).replace(/,/g, ''));
  if (String(n).toUpperCase().includes('K')) return Math.round(value * 1000);
  return Number.isFinite(value) ? value : 0;
}
function fmtTime(s) { const m = Math.floor(s/60); const sec = Math.floor(s%60); return `${m}:${sec.toString().padStart(2,'0')}` }

export default Social
