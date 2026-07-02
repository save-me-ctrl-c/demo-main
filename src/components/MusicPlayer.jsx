import { useNavigate } from 'react-router-dom'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Download } from './Icon'
import './MusicPlayer.css'

// mode: 0=sequential, 1=shuffle, 2=repeat-one
const MODE_META = [
  { Icon: Shuffle, title: 'Sequential' },
  { Icon: Shuffle, title: 'Shuffle' },
  { Icon: Repeat, title: 'Repeat One' },
]

function MusicPlayer({
  song, isPlaying, onTogglePlay,
  onNext, onPrev, progress, currentTime, onSeek,
  playMode = 0, onCycleMode,
}) {
  const navigate = useNavigate()
  if (!song) return null

  const handleTrackClick = (e) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    onSeek?.(Math.max(0, Math.min(100, pct)))
  }

  const { Icon: ModeIcon, title: modeTitle } = MODE_META[playMode] || MODE_META[0]

  return (
    <div className="mini-player">
      <div className="mp-progress-track" onClick={handleTrackClick}>
        <div className="mp-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="mp-row">
        {/* Cover — fix: show image or fallback */}
        <button className="mp-cover" onClick={(e) => { e.stopPropagation(); navigate(`/player/${song.id}`) }}>
          {(song.coverUrl) ? (
            <img src={song.coverUrl} alt={song.title} className="mp-cover-img"
              onError={(e) => { e.target.style.display = 'none' }} />
          ) : null}
          <span className="mp-cover-fallback" style={{
            background: `linear-gradient(135deg, ${song.color || '#8D8AD1'}, ${(song.color || '#8D8AD1')}66)`,
            display: !song.coverUrl ? 'flex' : 'none',
          }}>🎵</span>
        </button>

        <div className="mp-info" onClick={() => navigate(`/player/${song.id}`)}>
          <span className="mp-title">{song.title}</span>
          <span className="mp-artist-time">
            <span className="mp-artist">{song.artist}</span>
            <span className="mp-time">{currentTime || '0:00'} / {song.duration}</span>
          </span>
        </div>

        <div className="mp-controls">
          <button
            className={`mp-ctrl-btn ${playMode !== 0 ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onCycleMode?.() }}
            title={modeTitle}
            style={playMode === 0 ? { opacity: 0.45 } : {}}
          >
            <ModeIcon size={14} />
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
        </div>

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
