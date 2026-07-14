import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { library as libraryApi, mentors as mentorsApi } from '../api'
import { playlists as fallbackPlaylists, songs as fallbackSongs, mentors as fallbackMentors } from '../data/mockData'
import { useT } from '../i18n/LanguageContext'
import { Play, Plus, Download, ArrowLeft, Clock, Sparkles, Music, Crown, Users, Star } from '../components/Icon'
import './Library.css'

// Filter out UUID-based cover URLs that don't exist
function fixCover(url) {
  if (!url) return null
  if (/\/cover_[a-f0-9]{8}\.png$/i.test(url)) return null
  return url
}

// Fix #6: SongRow defined at module scope (not inside Library)
// SongRow — compact mode for offline songs (icon only)
function SongRow({ s, i, onClick, showIdx = true, compact = false }) {
  if (compact) {
    return (
      <div key={s.id} className="song-row compact" onClick={() => onClick?.(s)} style={{ animationDelay: `${i * 0.03}s` }}>
        <span className="song-compact-icon" style={{ background: `linear-gradient(135deg, ${s.color || '#1EABBE'}22, ${s.color || '#1EABBE'}11)` }}>
          🎵
        </span>
        <div className="song-info">
          <span className="song-title">{s.title}</span>
          <span className="song-artist">{s.artist}</span>
        </div>
        <span className="song-dur">{s.duration}</span>
      </div>
    )
  }

  return (
    <div key={s.id} className="song-row" onClick={() => onClick?.(s)} style={{ animationDelay: `${i * 0.03}s` }}>
      {showIdx && <span className="song-idx">{i + 1}</span>}
      <div className="song-cover">
        {s.coverUrl ? (
          <img src={s.coverUrl} alt={s.title} className="song-cover-img"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
        ) : null}
        <span className="song-cover-fallback" style={{
          background: `linear-gradient(135deg, ${s.color || '#1EABBE'}, ${(s.color || '#1EABBE')}66)`,
          display: s.coverUrl ? 'none' : 'flex',
        }}>🎵</span>
        {s.type === 'offline' && <span className="song-local-dot" title="Local file" />}
      </div>
      <div className="song-info">
        <span className="song-title">{s.title}</span>
        <span className="song-artist">{s.artist}</span>
      </div>
      <span className="song-dur">{s.duration}</span>
    </div>
  )
}

function Library() {
  const { t } = useT()
  const [activeTab, setActiveTab] = useState('All')
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [playlists, setPlaylists] = useState(fallbackPlaylists)
  const [recentlyPlayed, setRecentlyPlayed] = useState(fallbackSongs.slice(0, 4))
  const [playlistSongs, setPlaylistSongs] = useState([])
  const { handlePlaySong } = useOutletContext()
  const [mentors, setMentors] = useState(fallbackMentors)
  const [mentorPacks, setMentorPacks] = useState([])
  const [selectedMentor, setSelectedMentor] = useState(null)

  // Fetch mentors from API
  useEffect(() => {
    async function fetchMentors() {
      try {
        const [mRes, pRes] = await Promise.all([mentorsApi.list(), mentorsApi.packs()])
        setMentors(mRes.mentors.map(m => ({
          ...m,
          // Generate rich Chinese descriptions if API returns English-only
          descriptionZh: m.description || fallbackMentors.find(fm => fm.name === m.name)?.description || '',
          descriptionEn: m.description,
          styles: fallbackMentors.find(fm => fm.name === m.name)?.styles || [],
          highlight: fallbackMentors.find(fm => fm.name === m.name)?.highlight || m.specialty,
          packs: fallbackMentors.find(fm => fm.name === m.name)?.packs || [],
        })))
        setMentorPacks(pRes.packs)
      } catch (err) {
        console.warn('Failed to fetch mentors, using mock:', err.message)
      }
    }
    fetchMentors()
  }, [])

  // Fetch songs for Recently Played
  useEffect(() => {
    async function fetchSongs() {
      try {
        const songsRes = await libraryApi.songs()
        setRecentlyPlayed(songsRes.songs.slice(0, 4).map(s => ({
          id: s.id, title: s.title, artist: s.artist, duration: s.duration,
          genre: s.genre, dance: s.dance, color: s.color, coverUrl: fixCover(s.coverUrl), type: s.type, fileUrl: s.fileUrl,
        })))
      } catch (err) {
        console.warn('Failed to fetch songs, using mock:', err.message)
      }
    }
    fetchSongs()
  }, [])

  // Fetch playlists (re-fetched on tab change)
  useEffect(() => {
    async function fetchData() {
      try {
        const typeMap = { 'All': '', 'Offline': 'offline', 'Online': 'online', 'AI Teaching': 'teaching', 'VIP': 'vip' }
        const plRes = await libraryApi.playlists(typeMap[activeTab] || '')
        setPlaylists(plRes.playlists.map(pl => ({
          id: pl.id, name: pl.name, icon: pl.icon, color: pl.color,
          songs: pl.songCount, type: pl.type, desc: pl.description,
          size: pl.size, downloaded: pl.downloaded, locked: pl.locked,
          lessons: pl.lessons, duration: pl.duration,
        })))
      } catch (err) {
        console.warn('Failed to fetch library data, using mock:', err.message)
      }
    }
    fetchData()
  }, [activeTab])

  // Load playlist songs when selecting a playlist
  useEffect(() => {
    if (!selectedPlaylist) return
    let cancelled = false
    async function loadSongs() {
      try {
        const res = await libraryApi.playlist(selectedPlaylist.id)
        if (!cancelled) {
          setPlaylistSongs(res.songs.map(s => ({
            id: s.id, title: s.title, artist: s.artist, duration: s.duration,
            genre: s.genre, dance: s.dance, color: s.color, coverUrl: fixCover(s.coverUrl), type: s.type, fileUrl: s.fileUrl,
          })))
        }
      } catch {
        if (!cancelled) setPlaylistSongs(fallbackSongs)
      }
    }
    loadSongs()
    return () => { cancelled = true }
  }, [selectedPlaylist])

  // ── Playlist Detail View ──
  if (selectedPlaylist) {
    const pl = playlists.find(p => p.id === selectedPlaylist.id) || selectedPlaylist
    const queue = playlistSongs.length > 0 ? playlistSongs : fallbackSongs

    return (
      <div className="library-page">
        <div className="pl-detail-header" style={{ background: `linear-gradient(180deg, ${pl.color}33 0%, var(--color-bg) 100%)` }}>
          <button className="back-btn" onClick={() => setSelectedPlaylist(null)}><ArrowLeft size={16} /> {t('back')}</button>
          <div className="pl-hero">
            <div className="pl-hero-cover" style={{ background: `linear-gradient(135deg, ${pl.color}, ${pl.color}66)` }}>
              <span>{pl.icon}</span>
            </div>
            <div className="pl-hero-info">
              <h1>{pl.name}</h1>
              <p>{pl.desc || (pl.songs ? `${pl.songs} ${t('songs_unit')}` : `${pl.lessons} ${t('lessons_unit')}`)}</p>
              {pl.size && <span className="pl-meta"><Download size={12} /> {pl.size}</span>}
              <div className="pl-hero-actions">
                <button className="action-btn primary" onClick={() => { if (queue[0]) handlePlaySong(queue[0], queue) }}>
                  <Play size={14} /> {t('play_all')}
                </button>
                <button className="action-btn ghost"><Plus size={14} /> {t('save')}</button>
              </div>
            </div>
          </div>
        </div>
        <div className="song-list">
          {queue.map((s, i) => (
            <SongRow key={s.id} s={s} i={i} onClick={(song) => handlePlaySong(song, queue)} showIdx compact={pl.type === 'offline'} />
          ))}
        </div>
      </div>
    )
  }

  // ── Main Library View ──
  const LIB_TAB_KEYS = ['lib_all', 'lib_offline', 'lib_online', 'lib_teaching', 'lib_vip']
  const tabTypeMap = { 'All': 'all', 'Offline': 'offline', 'Online': 'online', 'AI Teaching': 'teaching', 'VIP': 'vip' }
  const filtered = activeTab === 'All' ? playlists : playlists.filter(p => p.type === tabTypeMap[activeTab])

  return (
    <div className="library-page">
      <header className="page-header">
        <h1>{t('library_title')}</h1>
        <p>{t('library_subtitle')}</p>
      </header>

      <div className="h-scroll lib-tabs">
        {['All', 'Offline', 'Online', 'AI Teaching', 'VIP'].map((tab, i) => (
          <button key={tab} className={`chip ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {t(LIB_TAB_KEYS[i])}
          </button>
        ))}
      </div>

      <div className="section-title">
        <h2><Clock size={14} className="icon-muted" /> {t('recently_played') || 'Recently Played'}</h2>
      </div>
      <div className="h-scroll recent-strip">
        {recentlyPlayed.map((s, i) => (
          <div key={s.id} className="recent-card" onClick={() => handlePlaySong(s)} style={{ '--c': s.color }}>
            {s.coverUrl ? (
              <img src={s.coverUrl} alt={s.title} className="recent-card-img"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }} />
            ) : null}
            <div className="recent-card-bg" style={{ display: s.coverUrl ? 'none' : 'block' }} />
            {!s.coverUrl && <span className="recent-card-icon">🎵</span>}
            {s.type === 'offline' && <span className="recent-local-dot" title="Local file" />}
            <div className="recent-card-info">
              <span className="rc-title">{s.title}</span>
              <span className="rc-artist">{s.artist}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="section-title">
        <h2><Music size={14} className="icon-muted" /> {t('your_playlists') || 'Your Playlists'}</h2>
      </div>
      <div className="pl-grid">
        {filtered.map(pl => (
          <div key={pl.id} className="pl-card" onClick={() => setSelectedPlaylist(pl)}>
            <div className="pl-cover" style={{ background: `linear-gradient(135deg, ${pl.color}, ${pl.color}66)` }}>
              <span className="pl-icon">{pl.icon}</span>
              {pl.locked && <span className="pl-lock"><Crown size={10} /></span>}
              {pl.downloaded && <span className="pl-dl"><Download size={8} /></span>}
            </div>
            <div className="pl-info">
              <h3>{pl.name}</h3>
              <p>{pl.songs ? `${pl.songs} ${t('songs_unit')}` : `${pl.lessons} ${t('lessons_unit')}`}</p>
            </div>
          </div>
        ))}
      </div>

      {activeTab === 'AI Teaching' && (
        <>
          <div className="section-title">
            <h2><Sparkles size={14} className="icon-muted" /> {t('lib_teaching') || 'AI Teaching'}</h2>
            <span className="mentor-count">{mentors.length} {t('instructors') || 'instructors'}</span>
          </div>
          <div className="mentor-grid">
            {mentors.map(mentor => (
              <div key={mentor.id} className={`mentor-card ${selectedMentor?.id === mentor.id ? 'expanded' : ''}`}>
                {/* Header — always visible */}
                <div className="mentor-header" onClick={() => setSelectedMentor(selectedMentor?.id === mentor.id ? null : mentor)}>
                  <div className="mentor-avatar-wrap">
                    <div className="mentor-avatar" style={{ background: `linear-gradient(135deg, ${mentor.color}, ${mentor.color}88)` }}>
                      <img
                        className="mentor-avatar-img"
                        src={`/media/avatars/mentors/avatar-mentor-${mentor.name.toLowerCase()}.png`}
                        alt={mentor.name}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                      />
                      <span className="mentor-avatar-emoji" style={{ display: 'none' }}>{mentor.avatar || '🤖'}</span>
                    </div>
                    {mentor.students && (
                      <span className="mentor-students-badge">
                        <Users size={8} /> {mentor.students}
                      </span>
                    )}
                  </div>
                  <div className="mentor-header-info">
                    <h3 className="mentor-name">{mentor.name}</h3>
                    <span className="mentor-specialty">{mentor.specialty}</span>
                    <div className="mentor-meta-row">
                      <span className="mentor-level">{mentor.level}</span>
                      <span className="mentor-highlight">{mentor.highlight}</span>
                    </div>
                  </div>
                  <span className={`mentor-expand-icon ${selectedMentor?.id === mentor.id ? 'open' : ''}`}>▾</span>
                </div>

                {/* Expanded detail — afrogo.html modal-card style */}
                {selectedMentor?.id === mentor.id && (
                  <div className="mentor-detail">
                    <p className="mentor-bio">{(mentor.descriptionZh || mentor.description || mentor.descriptionEn)}</p>

                    {/* Dance style tags */}
                    {mentor.styles && mentor.styles.length > 0 && (
                      <div className="mentor-styles">
                        {mentor.styles.map(st => (
                          <span key={st} className="mentor-style-tag">{st}</span>
                        ))}
                      </div>
                    )}

                    {/* Teaching packs */}
                    {mentor.packs && mentor.packs.length > 0 && (
                      <div className="mentor-packs">
                        <h4 className="packs-title">📦 {t('teaching_packs') || 'Teaching Packs'}</h4>
                        {mentor.packs.map((pack, i) => (
                          <div key={i} className="pack-item">
                            <div className="pack-icon" style={{ background: `${mentor.color}22` }}>
                              <span>{pack.icon || '📦'}</span>
                            </div>
                            <div className="pack-info">
                              <span className="pack-name">{pack.name}</span>
                              <span className="pack-desc">{pack.desc}</span>
                              <div className="pack-meta">
                                <span><Download size={9} /> {pack.size}</span>
                                <span>📖 {pack.lessons} {t('lessons_unit') || 'lessons'}</span>
                                <span>⏱ {pack.duration}</span>
                              </div>
                            </div>
                            <button
                              className="pack-dl-btn"
                              onClick={(e) => { e.stopPropagation(); /* download logic */ }}
                              title={t('download') || 'Download'}
                            >
                              <Download size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Also show playlist cards if available */}
                    {filtered.filter(p => p.type === 'teaching').length > 0 && (
                      <div className="mentor-playlists">
                        <h4 className="packs-title">🎵 {t('related_playlists') || 'Related Playlists'}</h4>
                        <div className="pl-grid" style={{ padding: 0 }}>
                          {filtered.filter(p => p.type === 'teaching').map(pl => (
                            <div key={pl.id} className="pl-card" onClick={(e) => { e.stopPropagation(); setSelectedPlaylist(pl) }}>
                              <div className="pl-cover" style={{ background: `linear-gradient(135deg, ${pl.color}, ${pl.color}66)` }}>
                                <span className="pl-icon">{pl.icon}</span>
                              </div>
                              <div className="pl-info">
                                <h3>{pl.name}</h3>
                                <p>{pl.lessons} {t('lessons_unit') || 'lessons'} · {pl.duration}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Keep teaching-strip for tabs that aren't exclusively AI Teaching */}
      {activeTab !== 'AI Teaching' && filtered.some(p => p.type === 'teaching') && (
        <>
          <div className="section-title">
            <h2><Sparkles size={14} className="icon-muted" /> {t('lib_teaching') || 'AI Teaching'}</h2>
            <button className="see-all">{t('see_all')}</button>
          </div>
          <div className="h-scroll teaching-strip">
            {filtered.filter(p => p.type === 'teaching').map(pl => (
              <div key={pl.id} className="teaching-card" onClick={() => setSelectedPlaylist(pl)} style={{ '--c': pl.color }}>
                <div className="teaching-visual"><span>{pl.icon}</span></div>
                <div className="teaching-info">
                  <span className="tc-name">{pl.name}</span>
                  <span className="tc-meta">{pl.lessons} {t('lessons_unit')} · {pl.duration}</span>
                  <div className="tc-bar"><div className="tc-fill" style={{ width: '35%' }} /></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">
        <h2><Download size={14} className="icon-muted" /> {t('downloads_title')}</h2>
      </div>
      <div className="dl-card">
        <div className="dl-row">
          <div className="dl-stat">
            <span className="dl-num">2</span>
            <span className="dl-lbl">{t('offline_packs')}</span>
          </div>
          <div className="dl-stat">
            <span className="dl-num">224 MB</span>
            <span className="dl-lbl">{t('storage_used')}</span>
          </div>
        </div>
        <button className="chip">{t('manage')}</button>
      </div>
    </div>
  )
}

export default Library
