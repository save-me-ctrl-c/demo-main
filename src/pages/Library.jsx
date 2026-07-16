import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { mentors as mentorsApi } from '../api'
import { playlists as fallbackPlaylists, songs as fallbackSongs, mentors as fallbackMentors } from '../data/mockData'
import { MUSIC_COVERS, songCoverFor, withSongArtwork } from '../data/mediaAssets'
import { useT } from '../i18n/LanguageContext'
import Portal from '../components/Portal'
import { Play, Plus, Download, ArrowLeft, Clock, Sparkles, Music, Crown, Users, X, Check, Trash2 } from '../components/Icon'
import './Library.css'

const PLAYLIST_STORAGE_KEY = 'afrogo_custom_playlists_v1'
const ALL_SONGS = fallbackSongs.map(withSongArtwork)
const DEFAULT_SONG_GROUPS = [
  ['s1', 's4', 's6', 's9'], ['s2', 's6', 's7'], ['s1', 's2', 's8'],
  ['s1', 's4', 's9'], ['s3', 's5', 's8', 's9'], ['s2', 's4', 's7'],
  ['s2', 's3', 's5', 's8'], ['s4', 's6', 's7', 's9'],
]

const DEFAULT_PLAYLISTS = fallbackPlaylists.map((playlist, index) => ({
  ...playlist,
  songs: DEFAULT_SONG_GROUPS[index].length,
  songIds: DEFAULT_SONG_GROUPS[index],
  coverUrl: MUSIC_COVERS[index % MUSIC_COVERS.length],
}))

function readCustomPlaylists() {
  try {
    const value = JSON.parse(localStorage.getItem(PLAYLIST_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

// Fix #6: SongRow defined at module scope (not inside Library)
// SongRow — compact mode for offline songs (icon only)
function SongRow({ s, i, onClick, showIdx = true, compact = false, onRemove }) {
  if (compact) {
    return (
      <div key={s.id} className="song-row compact" onClick={() => onClick?.(s)} style={{ animationDelay: `${i * 0.03}s` }}>
        <img className="song-compact-icon" src={s.coverUrl} alt="" />
        <div className="song-info">
          <span className="song-title">{s.title}</span>
          <span className="song-artist">{s.artist}</span>
        </div>
        <span className="song-dur">{s.duration}</span>
        {onRemove && <button className="song-remove" onClick={(event) => { event.stopPropagation(); onRemove(s.id) }} aria-label="Remove"><Trash2 size={14} /></button>}
      </div>
    )
  }

  return (
    <div key={s.id} className="song-row" onClick={() => onClick?.(s)} style={{ animationDelay: `${i * 0.03}s` }}>
      {showIdx && <span className="song-idx">{i + 1}</span>}
      <div className="song-cover">
        <img src={s.coverUrl} alt={s.title} className="song-cover-img" />
        {s.type === 'offline' && <span className="song-local-dot" title="Local file" />}
      </div>
      <div className="song-info">
        <span className="song-title">{s.title}</span>
        <span className="song-artist">{s.artist}</span>
      </div>
      <span className="song-dur">{s.duration}</span>
      {onRemove && <button className="song-remove" onClick={(event) => { event.stopPropagation(); onRemove(s.id) }} aria-label="Remove"><Trash2 size={14} /></button>}
    </div>
  )
}

function Library() {
  const { t, lang } = useT()
  const [activeTab, setActiveTab] = useState('All')
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [customPlaylists, setCustomPlaylists] = useState(readCustomPlaylists)
  const [playlistDialog, setPlaylistDialog] = useState(null)
  const [playlistName, setPlaylistName] = useState('')
  const [playlistDescription, setPlaylistDescription] = useState('')
  const [playlistCover, setPlaylistCover] = useState(MUSIC_COVERS[0])
  const [songPickerOpen, setSongPickerOpen] = useState(false)
  const [draftSongIds, setDraftSongIds] = useState([])
  const { handlePlaySong } = useOutletContext()
  const [mentors, setMentors] = useState(fallbackMentors)
  const [selectedMentor, setSelectedMentor] = useState(null)
  const playlists = useMemo(() => [...customPlaylists, ...DEFAULT_PLAYLISTS], [customPlaylists])
  const recentlyPlayed = ALL_SONGS.slice(0, 4)
  const labels = lang === 'zh' ? {
    create: '新建歌单', createTitle: '创建歌单', name: '歌单名称', description: '歌单描述',
    chooseCover: '选择封面', addSongs: '添加歌曲', save: '保存', remove: '移除歌曲',
    delete: '删除歌单', empty: '歌单中还没有歌曲', custom: '我的歌单', cancel: '取消',
  } : {
    create: 'New playlist', createTitle: 'Create playlist', name: 'Playlist name', description: 'Description',
    chooseCover: 'Choose cover', addSongs: 'Add songs', save: 'Save', remove: 'Remove song',
    delete: 'Delete playlist', empty: 'No songs in this playlist', custom: 'My playlist', cancel: 'Cancel',
  }

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
        void pRes
      } catch (err) {
        console.warn('Failed to fetch mentors, using mock:', err.message)
      }
    }
    fetchMentors()
  }, [])

  useEffect(() => {
    localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(customPlaylists))
  }, [customPlaylists])

  function openCreatePlaylist() {
    setPlaylistName('')
    setPlaylistDescription('')
    setPlaylistCover(MUSIC_COVERS[customPlaylists.length % MUSIC_COVERS.length])
    setPlaylistDialog('create')
  }

  function createPlaylist() {
    const name = playlistName.trim()
    if (!name) return
    const playlist = {
      id: `custom-${Date.now()}`,
      name,
      desc: playlistDescription.trim() || labels.custom,
      type: 'personal',
      custom: true,
      color: '#7c3aed',
      coverUrl: playlistCover,
      songIds: [],
      songs: 0,
    }
    setCustomPlaylists(current => [playlist, ...current])
    setSelectedPlaylist(playlist)
    setPlaylistDialog(null)
  }

  function updateSelectedPlaylist(songIds) {
    if (!selectedPlaylist?.custom) return
    const updated = { ...selectedPlaylist, songIds, songs: songIds.length }
    setSelectedPlaylist(updated)
    setCustomPlaylists(current => current.map(playlist => playlist.id === updated.id ? updated : playlist))
  }

  function openSongPicker() {
    setDraftSongIds(selectedPlaylist?.songIds || [])
    setSongPickerOpen(true)
  }

  function deletePlaylist() {
    if (!selectedPlaylist?.custom) return
    setCustomPlaylists(current => current.filter(playlist => playlist.id !== selectedPlaylist.id))
    setSelectedPlaylist(null)
  }

  // ── Playlist Detail View ──
  if (selectedPlaylist) {
    const pl = playlists.find(p => p.id === selectedPlaylist.id) || selectedPlaylist
    const queue = (pl.songIds || []).map(id => ALL_SONGS.find(song => song.id === id)).filter(Boolean)

    return (
      <div className="library-page">
        <div className="pl-detail-header" style={{ background: `linear-gradient(180deg, ${pl.color}33 0%, var(--color-bg) 100%)` }}>
          <button className="back-btn" onClick={() => setSelectedPlaylist(null)}><ArrowLeft size={16} /> {t('back')}</button>
          <div className="pl-hero">
            <img className="pl-hero-cover pl-hero-cover-img" src={pl.coverUrl} alt={pl.name} />
            <div className="pl-hero-info">
              <h1>{pl.name}</h1>
              <p>{pl.desc || `${queue.length} ${t('songs_unit')}`}</p>
              {pl.size && <span className="pl-meta"><Download size={12} /> {pl.size}</span>}
              <div className="pl-hero-actions">
                <button className="action-btn primary" disabled={!queue.length} onClick={() => { if (queue[0]) handlePlaySong(queue[0], queue) }}>
                  <Play size={14} /> {t('play_all')}
                </button>
                {pl.custom && <button className="action-btn ghost" onClick={openSongPicker}><Plus size={14} /> {labels.addSongs}</button>}
                {pl.custom && <button className="action-btn danger" onClick={deletePlaylist}><Trash2 size={14} /> {labels.delete}</button>}
              </div>
            </div>
          </div>
        </div>
        <div className="song-list">
          {!queue.length && <div className="playlist-empty"><Music size={28} /><span>{labels.empty}</span><button onClick={openSongPicker}><Plus size={14} /> {labels.addSongs}</button></div>}
          {queue.map((s, i) => (
            <SongRow key={s.id} s={s} i={i} onClick={(song) => handlePlaySong(song, queue)} showIdx compact={pl.type === 'offline'}
              onRemove={pl.custom ? (songId) => updateSelectedPlaylist(pl.songIds.filter(id => id !== songId)) : null} />
          ))}
        </div>
        {songPickerOpen && (
          <Portal>
            <div className="modal-overlay" onClick={() => setSongPickerOpen(false)}>
              <div className="playlist-modal song-picker-modal" onClick={event => event.stopPropagation()}>
                <div className="playlist-modal-header"><h2>{labels.addSongs}</h2><button onClick={() => setSongPickerOpen(false)}><X size={18} /></button></div>
                <div className="song-picker-list">
                  {ALL_SONGS.map((song, index) => {
                    const selected = draftSongIds.includes(song.id)
                    return (
                      <button key={song.id} className={`song-picker-row ${selected ? 'selected' : ''}`}
                        onClick={() => setDraftSongIds(current => selected ? current.filter(id => id !== song.id) : [...current, song.id])}>
                        <img src={song.coverUrl} alt="" />
                        <span><strong>{song.title}</strong><small>{song.artist}</small></span>
                        <i>{selected && <Check size={14} />}</i>
                      </button>
                    )
                  })}
                </div>
                <div className="playlist-modal-actions">
                  <button className="action-btn ghost" onClick={() => setSongPickerOpen(false)}>{labels.cancel}</button>
                  <button className="action-btn primary" onClick={() => { updateSelectedPlaylist(draftSongIds); setSongPickerOpen(false) }}>{labels.save}</button>
                </div>
              </div>
            </div>
          </Portal>
        )}
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
            <img src={s.coverUrl} alt={s.title} className="recent-card-img" />
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
        <button className="see-all section-action" onClick={openCreatePlaylist}><Plus size={13} /> {labels.create}</button>
      </div>
      <div className="pl-grid">
        {filtered.map(pl => (
          <div key={pl.id} className="pl-card" onClick={() => setSelectedPlaylist(pl)}>
            <div className="pl-cover">
              <img className="pl-cover-img" src={pl.coverUrl} alt={pl.name} />
              {pl.custom && <span className="pl-personal-badge">{labels.custom}</span>}
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
                              <div className="pl-cover"><img className="pl-cover-img" src={pl.coverUrl} alt={pl.name} /></div>
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
                <div className="teaching-visual"><img src={pl.coverUrl} alt={pl.name} /></div>
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

      {playlistDialog === 'create' && (
        <Portal>
          <div className="modal-overlay" onClick={() => setPlaylistDialog(null)}>
            <div className="playlist-modal" onClick={event => event.stopPropagation()}>
              <div className="playlist-modal-header"><h2>{labels.createTitle}</h2><button onClick={() => setPlaylistDialog(null)}><X size={18} /></button></div>
              <label className="playlist-field"><span>{labels.name}</span><input autoFocus value={playlistName} onChange={event => setPlaylistName(event.target.value)} maxLength={40} /></label>
              <label className="playlist-field"><span>{labels.description}</span><textarea value={playlistDescription} onChange={event => setPlaylistDescription(event.target.value)} maxLength={120} /></label>
              <div className="playlist-cover-field"><span>{labels.chooseCover}</span><div className="playlist-cover-grid">
                {MUSIC_COVERS.map(cover => <button key={cover} className={playlistCover === cover ? 'active' : ''} onClick={() => setPlaylistCover(cover)}><img src={cover} alt="" />{playlistCover === cover && <i><Check size={13} /></i>}</button>)}
              </div></div>
              <div className="playlist-modal-actions">
                <button className="action-btn ghost" onClick={() => setPlaylistDialog(null)}>{labels.cancel}</button>
                <button className="action-btn primary" disabled={!playlistName.trim()} onClick={createPlaylist}>{labels.create}</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}

export default Library
