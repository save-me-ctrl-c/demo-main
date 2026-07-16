import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import TabBar from './components/TabBar'
import MusicPlayer from './components/MusicPlayer'
import VoiceButton from './components/VoiceButton'
import { ArrowLeft, Music, Pause, Play } from './components/Icon'
import { parseIntent, findSongs } from './services/voiceAssistant'
import { useT } from './i18n/LanguageContext'
import { songs as sourceSongs } from './data/mockData'
import { HEAD_ICONS, withSongArtwork } from './data/mediaAssets'
import './AppLayout.css'

const HIDE_OVERLAY_ROUTES = ['/player']
const PLAYER_ROUTES = ['/library', '/player']
const songs = sourceSongs.map(withSongArtwork)

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const [currentSong, setCurrentSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playQueue, setPlayQueue] = useState([])
  const [queueIndex, setQueueIndex] = useState(-1)
  // playMode: 0=normal, 1=shuffle, 2=repeat-one
  const [playMode, setPlayMode] = useState(0)
  const isShuffled = playMode === 1
  const isRepeat = playMode === 2
  const [progress, setProgress] = useState(0)
  const audioRef = useRef(null)
  const songRef = useRef(null)
  songRef.current = currentSong

  const isFullscreen = HIDE_OVERLAY_ROUTES.some(r => location.pathname.startsWith(r))
  const showOverlay = !isFullscreen
  const showPlayer = PLAYER_ROUTES.some(r => location.pathname.startsWith(r))

  const currentTime = useMemo(() => {
    if (!currentSong) return '0:00'
    const durSec = parseDuration(currentSong.duration)
    return formatSeconds(Math.floor((progress / 100) * durSec))
  }, [progress, currentSong])

  const queueRef = useRef({ playQueue, queueIndex, isShuffled, isRepeat })
  queueRef.current = { playQueue, queueIndex, isShuffled, isRepeat }

  const getNextIndex = useCallback(() => {
    const { playQueue, queueIndex, isShuffled, isRepeat } = queueRef.current
    if (playQueue.length === 0) return -1
    if (isShuffled) return Math.floor(Math.random() * playQueue.length)
    if (isRepeat) return queueIndex
    return queueIndex + 1 < playQueue.length ? queueIndex + 1 : -1
  }, [])

  // ── Audio: timeupdate + ended listeners ──
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      const song = songRef.current
      if (!audio.duration || !song) return
      setProgress(Math.min((audio.currentTime / parseDuration(song.duration)) * 100, 100))
    }
    const onEnded = () => {
      const next = getNextIndex()
      const { playQueue } = queueRef.current
      if (next >= 0 && playQueue[next]) {
        setQueueIndex(next)
        setCurrentSong(playQueue[next])
        setProgress(0)
        setIsPlaying(true)
        // Play next song — schedule after React render via setTimeout + ref
        setTimeout(() => {
          const s = playQueue[next]
          const url = getSongUrl(s)
          if (url && audioRef.current) {
            audioRef.current.src = url
            audioRef.current.play().catch(() => {})
          }
        }, 50)
      } else {
        setIsPlaying(false)
        setProgress(0)
      }
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
    }
  }, [getNextIndex])

  // ── Core: play audio — supports both file and fileUrl fields ──
  const getSongUrl = (s) => s?.file || s?.fileUrl || ''
  const loadAndPlay = useCallback((song) => {
    const audio = audioRef.current
    const url = getSongUrl(song)
    if (!audio || !url) return false
    const sameTrack = audio.src && (audio.src.endsWith(url) || audio.src === url)
    if (!sameTrack) { audio.src = url; audio.load() }
    audio.play().catch(e => { console.warn('Play blocked:', e.message); setIsPlaying(false) })
    return true
  }, [])

  const handlePlaySong = useCallback((song, queue = null) => {
    setCurrentSong(song)
    setProgress(0)
    setIsPlaying(true)
    if (queue && queue.length > 0) {
      setPlayQueue(queue)
      setQueueIndex(queue.findIndex(s => s.id === song.id) ?? 0)
    } else {
      setPlayQueue([song])
      setQueueIndex(0)
    }
    loadAndPlay(song)
  }, [loadAndPlay])

  const handleTogglePlay = useCallback(() => {
    const audio = audioRef.current
    setIsPlaying(prev => {
      const next = !prev
      const url = getSongUrl(songRef.current)
      if (next && url) {
        // Compare pathnames — audio.src is absolute, url is relative
        const sameTrack = audio.src && (audio.src.endsWith(url) || audio.src === url)
        if (!sameTrack) {
          audio.src = url
          audio.load()
        }
        audio.play().catch(() => {})
      } else if (!next && audio) {
        audio.pause()
      }
      return next
    })
  }, [])

  const handleNext = useCallback(() => {
    const next = getNextIndex()
    const { playQueue } = queueRef.current
    if (next >= 0 && playQueue[next]) {
      setQueueIndex(next)
      setCurrentSong(playQueue[next])
      setProgress(0)
      setIsPlaying(true)
      setTimeout(() => loadAndPlay(playQueue[next]), 30)
    }
  }, [getNextIndex, loadAndPlay])

  const handlePrev = useCallback(() => {
    const audio = audioRef.current
    // If progress > 5s equivalent, restart current track
    const durSec = songRef.current ? parseDuration(songRef.current.duration) : 180
    const elapsed = (progress / 100) * durSec
    if (elapsed > 5) {
      setProgress(0)
      if (audio) audio.currentTime = 0
      return
    }
    // Go to previous track
    const { playQueue, queueIndex: qi } = queueRef.current
    const prevIdx = qi - 1
    if (prevIdx >= 0 && playQueue[prevIdx]) {
      setQueueIndex(prevIdx)
      setCurrentSong(playQueue[prevIdx])
      setProgress(0)
      setIsPlaying(true)
      setTimeout(() => loadAndPlay(playQueue[prevIdx]), 30)
    } else {
      setProgress(0)
      if (audio) audio.currentTime = 0
    }
  }, [progress, loadAndPlay])

  const handleCycleMode = useCallback(() => setPlayMode(m => (m + 1) % 3), [])

  const handleSeek = useCallback((percent) => {
    const pct = Math.max(0, Math.min(100, percent))
    setProgress(pct)
    if (audioRef.current && songRef.current) {
      audioRef.current.currentTime = (pct / 100) * parseDuration(songRef.current.duration)
    }
  }, [])

  // i18n
  const { t, lang } = useT()

  // Voice command handler
  const handleVoiceCommand = useCallback((raw) => {
    if (!raw || raw.length < 2) return

    // Fast path: direct song/artist match
    const rawLower = raw.toLowerCase().trim()
    const directMatch = songs.find(s =>
      s.title.toLowerCase() === rawLower ||
      s.artist.toLowerCase() === rawLower ||
      (s.aliases && s.aliases.some(a => a.toLowerCase() === rawLower))
    )
    if (directMatch) {
      handlePlaySong(directMatch, [directMatch])
      return
    }

    const intent = parseIntent(raw)

    switch (intent.action) {
      case 'play': {
        const results = findSongs(intent.params.query, {
          genre: intent.params.genre,
          mood: intent.params.mood,
        })
        if (results.length > 0) {
          handlePlaySong(results[0], results)
        } else {
          const randomSongs = findSongs('')
          handlePlaySong(randomSongs[0], randomSongs)
        }
        break
      }
      case 'pause':
        if (isPlaying) handleTogglePlay()
        break
      case 'resume':
        if (!isPlaying) handleTogglePlay()
        break
      case 'next':
        handleNext()
        break
      case 'prev':
        handlePrev()
        break
      case 'random': {
        const shuffled = findSongs('')
        handlePlaySong(shuffled[0], shuffled)
        break
      }
      case 'volumeUp':
        // Adjust volume by ~10%
        if (audioRef.current) {
          audioRef.current.volume = Math.min(1, audioRef.current.volume + 0.1)
        }
        break
      case 'volumeDown':
        if (audioRef.current) {
          audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.1)
        }
        break
      case 'whatPlaying':
        break
      case 'greet':
        // Visual-only response — no TTS to avoid mic feedback
        break
      case 'stop':
        // VoiceButton deactivation is handled internally via onDeactivate callback
        break
    }
  }, [handlePlaySong, handleTogglePlay, handleNext, handlePrev, isPlaying, currentSong, lang])

  const bottomPadding = showOverlay ? (showPlayer && currentSong ? 120 : 64) : 0
  const desktopPageTitle = {
    '/app': t('tab_social'),
    '/create': t('tab_create'),
    '/library': t('tab_library'),
    '/profile': t('tab_me'),
  }[location.pathname] || t('app_name')

  return (
    <div className={`app-root${showOverlay ? '' : ' app-root--focused'}`}>
      <audio ref={audioRef} preload="auto" />
      {showOverlay && (
        <aside className="desktop-sidebar">
          <div className="desktop-brand" aria-label="AfroGO">
            <span className="desktop-brand-mark">♪</span>
            <span>AfroGO</span>
          </div>
          <TabBar isPlaying={isPlaying} />
          <div className="desktop-sidebar-note">
            <span className="desktop-sidebar-note-label">AFROGO</span>
            <strong>{lang === 'zh' ? '让节奏带你起舞' : 'Move with the rhythm'}</strong>
          </div>
        </aside>
      )}

      <section className="app-shell">
        {showOverlay && (
          <header className="desktop-topbar">
            <div className="desktop-history-controls">
              <button type="button" onClick={() => navigate(-1)} title={t('back')} aria-label={t('back')}>
                <ArrowLeft size={17} />
              </button>
              <button type="button" onClick={() => navigate(1)} title="Forward" aria-label="Forward">
                <ArrowLeft size={17} className="desktop-forward-icon" />
              </button>
            </div>
            <div className="desktop-page-name">
              <span>AfroGO</span>
              <strong>{desktopPageTitle}</strong>
            </div>
            <button type="button" className="desktop-avatar-button" onClick={() => navigate('/profile')} aria-label={t('profile_title')}>
              <img src={HEAD_ICONS[0]} alt="" />
            </button>
          </header>
        )}
        <main className="app-main" style={{ paddingBottom: bottomPadding }}>
          <Outlet context={{
            handlePlaySong, currentSong, isPlaying, handleTogglePlay,
            handleNext, handlePrev, progress, currentTime, handleSeek,
            playMode, handleCycleMode,
            playQueue, queueIndex,
          }} />
        </main>
      </section>

      {showOverlay && (
        <DesktopNowPlaying
          song={currentSong}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onOpenPlayer={() => currentSong && navigate(`/player/${currentSong.id}`)}
          lang={lang}
        />
      )}
      {showOverlay && currentSong && showPlayer && (
        <MusicPlayer
          song={currentSong} isPlaying={isPlaying} onTogglePlay={handleTogglePlay}
          onNext={handleNext} onPrev={handlePrev}
          progress={progress} currentTime={currentTime} onSeek={handleSeek}
          playMode={playMode} onCycleMode={handleCycleMode}
        />
      )}
      {showOverlay && <VoiceButton onCommand={handleVoiceCommand} />}
    </div>
  )
}

function DesktopNowPlaying({ song, isPlaying, onTogglePlay, onOpenPlayer, lang }) {
  const labels = lang === 'zh'
    ? { heading: '正在播放', idle: '选择一首音乐开始', artist: '你的舞蹈音乐库' }
    : { heading: 'Now playing', idle: 'Choose a track to begin', artist: 'Your dance music library' }

  return (
    <aside className="desktop-now-playing" aria-label={labels.heading}>
      <div className="desktop-panel-heading">
        <span>{labels.heading}</span>
        {isPlaying && <i className="desktop-playing-indicator" />}
      </div>
      {song ? (
        <button type="button" className="desktop-track-card" onClick={onOpenPlayer}>
          <span className="desktop-track-cover" style={{ background: `linear-gradient(135deg, ${song.color || '#7c3aed'}, ${(song.color || '#7c3aed')}66)` }}>
            <img src={song.coverUrl} alt="" />
          </span>
          <span className="desktop-track-copy">
            <strong>{song.title}</strong>
            <span>{song.artist}</span>
          </span>
        </button>
      ) : (
        <div className="desktop-track-empty">
          <span><Music size={28} /></span>
          <strong>{labels.idle}</strong>
          <small>{labels.artist}</small>
        </div>
      )}
      {song && (
        <button type="button" className="desktop-panel-play" onClick={onTogglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
      )}
    </aside>
  )
}

function parseDuration(d) {
  if (!d) return 180
  const parts = String(d).split(':')
  if (parts.length === 2) return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0)
  return parseInt(parts[0]) || 180
}

function formatSeconds(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default AppLayout
