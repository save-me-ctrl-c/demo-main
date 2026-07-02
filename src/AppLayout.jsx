import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getToken } from './api'
import TabBar from './components/TabBar'
import MusicPlayer from './components/MusicPlayer'
import VoiceButton from './components/VoiceButton'
import './AppLayout.css'

const FULLSCREEN_ROUTES = ['/player']
const PLAYER_ROUTES = ['/library', '/player']

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  // First-time check: redirect to welcome if no token
  useEffect(() => {
    const token = getToken()
    if (!token) {
      navigate('/welcome', { replace: true })
    }
  }, [navigate])
  const [currentSong, setCurrentSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playQueue, setPlayQueue] = useState([])
  const [queueIndex, setQueueIndex] = useState(-1)
  const [isShuffled, setIsShuffled] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef(null)
  const songRef = useRef(null)
  songRef.current = currentSong

  const isFullscreen = FULLSCREEN_ROUTES.some(r => location.pathname.startsWith(r))
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
          if (s?.fileUrl && audioRef.current) {
            audioRef.current.src = s.fileUrl
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

  // Auto-pause when leaving player pages
  useEffect(() => {
    if (!showPlayer && isPlaying) {
      setIsPlaying(false)
      audioRef.current?.pause()
    }
  }, [showPlayer, isPlaying])

  // ── Core: play audio directly in click handler (for browser autoplay policy) ──
  const loadAndPlay = useCallback((song) => {
    const audio = audioRef.current
    if (!audio || !song?.fileUrl) return false
    if (audio.src !== song.fileUrl) {
      audio.src = song.fileUrl
      audio.load()
    }
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
      if (next && songRef.current?.fileUrl) {
        if (audio.src !== songRef.current.fileUrl) {
          audio.src = songRef.current.fileUrl
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

  const handleToggleShuffle = useCallback(() => setIsShuffled(s => !s), [])
  const handleToggleRepeat = useCallback(() => setIsRepeat(r => !r), [])

  const handleSeek = useCallback((percent) => {
    const pct = Math.max(0, Math.min(100, percent))
    setProgress(pct)
    if (audioRef.current && songRef.current) {
      audioRef.current.currentTime = (pct / 100) * parseDuration(songRef.current.duration)
    }
  }, [])

  const bottomPadding = showOverlay ? (showPlayer && currentSong ? 120 : 64) : 0

  return (
    <div className="app-root">
      <audio ref={audioRef} preload="auto" />
      <main className="app-main" style={{ paddingBottom: bottomPadding }}>
        <Outlet context={{
          handlePlaySong, currentSong, isPlaying, handleTogglePlay,
          handleNext, handlePrev, progress, currentTime, handleSeek,
          isShuffled, isRepeat, handleToggleShuffle, handleToggleRepeat,
          playQueue, queueIndex,
        }} />
      </main>
      {showOverlay && currentSong && showPlayer && (
        <MusicPlayer
          song={currentSong} isPlaying={isPlaying} onTogglePlay={handleTogglePlay}
          onNext={handleNext} onPrev={handlePrev}
          progress={progress} currentTime={currentTime} onSeek={handleSeek}
          isShuffled={isShuffled} isRepeat={isRepeat}
          onToggleShuffle={handleToggleShuffle} onToggleRepeat={handleToggleRepeat}
        />
      )}
      {showOverlay && <TabBar />}
      {showOverlay && <VoiceButton />}
    </div>
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
