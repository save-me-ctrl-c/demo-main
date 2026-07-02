import { useNavigate } from 'react-router-dom'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Download } from './Icon'
import './MusicPlayer.css'

function MusicPlayer({
  song, isPlaying, onTogglePlay,
  onNext, onPrev, progress, currentTime, onSeek,
  isShuffled, isRepeat, onToggleShuffle, onToggleRepeat,
}) {
  const navigate = useNavigate()
  if (!song) return null

  const handleTrackClick = (e) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    onSeek?.(Math.max(0, Math.min(100, pct)))
  }

  return (
    <div className="mini-player">
      {/* Cover art + progress track */}
      <div className="mp-progress-track" onClick={handleTrackClick}>
        <div className="mp-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Main row */}
      <div className="mp-row">
        {/* Cover */}
        <button
          className="mp-cover"
          onClick={(e) => { e.stopPropagation(); navigate(`/player/${song.id}`) }}
        >
          {song.coverUrl ? (
            <img src={song.coverUrl} alt={song.title} className="mp-cover-img" />
          ) : (
            <span className="mp-cover-fallback" style={{ background: `linear-gradient(135deg, ${song.color || '#1EABBE'}, ${(song.color || '#1EABBE')}66)` }}>
              🎵
            </span>
          )}
        </button>

        {/* Info */}
        <div className="mp-info" onClick={() => navigate(`/player/${song.id}`)}>
          <span className="mp-title">{song.title}</span>
          <span className="mp-artist-time">
            <span className="mp-artist">{song.artist}</span>
            <span className="mp-time">{currentTime || '0:00'} / {song.duration}</span>
          </span>
        </div>

        {/* Controls */}
        <div className="mp-controls">
          <button
            className={`mp-ctrl-btn ${isShuffled ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleShuffle?.() }}
            title="Shuffle"
          >
            <Shuffle size={14} />
          </button>
          <button className="mp-ctrl-btn" onClick={(e) => { e.stopPropagation(); onPrev?.() }} title="Previous">
            <SkipBack size={16} />
          </button>
          <button className="mp-ctrl-btn mp-play-btn" onClick={(e) => { e.stopPropagation(); onTogglePlay() }}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button className="mp-ctrl-btn" onClick={(e) => { e.stopPropagation(); onNext?.() }} title="Next">
            <SkipForward size={16} />
          </button>
          <button
            className={`mp-ctrl-btn ${isRepeat ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleRepeat?.() }}
            title="Repeat"
          >
            <Repeat size={14} />
          </button>
        </div>

        {/* Local badge */}
        {song.type === 'offline' && (
          <span className="mp-local-badge" title="Local file">
            <Download size={8} />
          </span>
        )}
      </div>
    </div>
  )
}

export default MusicPlayer
