import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { songs as fallbackSongs } from '../data/mockData'
import { library as libraryApi } from '../api'
import { useT } from '../i18n/LanguageContext'
import { ArrowDown, MoreHorizontal, Heart, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Download } from '../components/Icon'
import './Player.css'

function Player() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useT()
  const {
    handlePlaySong, currentSong, isPlaying, handleTogglePlay,
    handleNext, handlePrev, progress, currentTime, handleSeek,
    playMode, handleCycleMode,
    playQueue,
  } = useOutletContext()
  const ctxRef = useRef({ handlePlaySong, playQueue })
  ctxRef.current = { handlePlaySong, playQueue }

  const [liked, setLiked] = useState(false)
  const [song, setSong] = useState(null)

  // Load song data w/cover art from API
  useEffect(() => {
    if (currentSong?.id === id) {
      setSong(currentSong)
      return
    }
    let cancelled = false
    async function load() {
      try {
        const res = await libraryApi.song(id)
        if (!cancelled && res?.song) {
          setSong({
            ...res.song,
            duration: res.song.duration || '3:00',
            color: res.song.color || '#1EABBE',
            genre: res.song.genre,
            dance: res.song.dance,
            coverUrl: res.song.coverUrl,
            type: res.song.type,
            fileUrl: res.song.fileUrl,
          })
        }
      } catch {
        if (!cancelled) {
          const fallback = fallbackSongs.find(s => s.id === id) || fallbackSongs[0]
          setSong(fallback)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, currentSong])

  // Auto-play — Fix #5: use ref to avoid stale closure on handlePlaySong/playQueue
  useEffect(() => {
    if (song && (!currentSong || currentSong.id !== song.id)) {
      const { handlePlaySong, playQueue } = ctxRef.current
      handlePlaySong(song, playQueue.length > 0 ? playQueue : [song])
    }
  }, [song, currentSong])

  const handleTrackSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    handleSeek?.(Math.max(0, Math.min(100, pct)))
  }, [handleSeek])

  if (!song) return <div className="player-page"><div className="plr-bg" style={{ background: 'var(--color-bg)' }} /></div>

  const durMs = song.duration || '3:00'

  return (
    <div className="player-page">
      <div className="plr-bg" style={{ background: `linear-gradient(180deg, ${song.color || '#1EABBE'}55 0%, ${song.color || '#1EABBE'}22 40%, var(--color-bg) 75%)` }} />

      <div className="plr-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowDown size={18} /> {t('player_minimize')}</button>
        <span className="plr-from">{t('player_from_library')}</span>
        <MoreHorizontal size={20} className="icon-secondary" />
      </div>

      <div className="plr-visual">
        {song.coverUrl ? (
          <img src={song.coverUrl} alt={song.title} className="plr-cover-art"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
        ) : null}
        <div className="plr-cover-fallback" style={{
          background: `linear-gradient(135deg, ${song.color || '#1EABBE'}, ${(song.color || '#1EABBE')}66)`,
          display: song.coverUrl ? 'none' : 'flex',
        }}>
          <span className="plr-note">♪</span>
        </div>
        {song.type === 'offline' && (
          <span className="plr-local-badge"><Download size={12} /> LOCAL</span>
        )}
      </div>

      <div className="plr-info">
        <div className="plr-title-row">
          <div>
            <h1>{song.title}</h1>
            <p className="plr-artist">{song.artist}</p>
          </div>
          <button className={`plr-like ${liked ? 'liked' : ''}`} onClick={() => setLiked(!liked)}>
            <Heart size={22} fill={liked ? 'var(--color-accent)' : 'none'} className={liked ? 'icon-accent' : 'icon-muted'} />
          </button>
        </div>
        <div className="plr-tags">
          {song.genre && <span>{song.genre}</span>}
          {song.dance && <span>{song.dance}</span>}
          {song.album && <span>💿 {song.album}</span>}
        </div>
      </div>

      <div className="plr-progress">
        <div className="plr-track" onClick={handleTrackSeek}>
          <div className="plr-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="plr-times">
          <span>{currentTime || '0:00'}</span>
          <span>{durMs}</span>
        </div>
      </div>

      <div className="plr-controls">
        <button className={`ctrl-btn ${playMode !== 0 ? 'ctrl-active' : ''}`} onClick={handleCycleMode}
          style={playMode === 0 ? { opacity: 0.4 } : {}}>
          {playMode === 2
            ? <Repeat size={18} className="icon-accent" />
            : <Shuffle size={18} className={playMode === 1 ? 'icon-accent' : 'icon-secondary'} />}
        </button>
        <button className="ctrl-btn" onClick={handlePrev}>
          <SkipBack size={20} />
        </button>
        <button className="ctrl-btn ctrl-play" onClick={handleTogglePlay}>
          {isPlaying ? <Pause size={24} fill="#fff" /> : <Play size={24} fill="#fff" />}
        </button>
        <button className="ctrl-btn" onClick={handleNext}>
          <SkipForward size={20} />
        </button>
      </div>
    </div>
  )
}

export default Player
