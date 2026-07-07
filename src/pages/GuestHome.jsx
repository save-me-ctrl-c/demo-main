import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { songs } from '../data/mockData'
import { useT } from '../i18n/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { parseIntent, findSongs, speak } from '../services/voiceAssistant'
import { Play, Pause, SkipForward, SkipBack, Download, Check, X, Sparkles } from '../components/Icon'
import './GuestHome.css'

const SKIP_KEY = 'afrogo_guest_skip_until'
function getSkipUntil() { try { return parseInt(localStorage.getItem(SKIP_KEY), 10) || 0 } catch { return 0 } }
function setSkipUntil(ts) { try { localStorage.setItem(SKIP_KEY, String(ts)) } catch {} }

// AI Digital Human Mentors — each with authentic Afro dance background
const DIGITAL_HUMANS = [
  {
    name: 'Zara', style: 'Afrobeat Queen', emoji: '💃', color: '#FF6B35',
    tags: ['Shaku Shaku', 'Gwara Gwara', 'Zanku'],
    level: 'All Levels',
    experience: '12+ years',
    students: '18.5K',
    region: 'Accra, Ghana',
    bio: 'Zara 来自加纳阿克拉，是非洲节奏女王。她 15 岁开始在街头学习传统加纳舞蹈，后融合尼日利亚 Afrobeat 创造出独树一帜的风格。她相信舞蹈是连接灵魂与土地的桥梁。',
    bioEn: 'Zara hails from Accra, Ghana — the Afrobeat Queen. She started dancing at 15 on the streets of Jamestown, later fusing traditional Ghanaian moves with Nigerian Afrobeat. Her mission: connect soul to soil through rhythm.',
    specialties: ['Afrobeat 编舞', '传统加纳舞步', 'Shaku Shaku 进阶', '舞台表演编排'],
    quote: '"Every beat carries a story. Let your body tell it."',
  },
  {
    name: 'Amara', style: 'Amapiano Pro', emoji: '🕺', color: '#40C4D8',
    tags: ['Log Drum', 'Piano Groove', 'Dance Challenge'],
    level: 'Beginner+',
    experience: '8+ years',
    students: '23.1K',
    region: 'Johannesburg, SA',
    bio: 'Amara 来自南非约翰内斯堡，是 Amapiano 风格的先驱导师。她擅长将标志性的 Log Drum 低音律动转化为流畅的身体动作，从 TikTok 挑战到专业演出都能驾驭。',
    bioEn: 'Amara from Johannesburg is the Amapiano pioneer. She transforms the iconic Log Drum bass into fluid body movement — equally at home in TikTok challenges and professional stage productions.',
    specialties: ['Amapiano 基础步法', 'Log Drum 节奏训练', 'TikTok 热门挑战', '派对即兴 Freestyle'],
    quote: '"Feel the log drum in your chest. Everything else follows."',
  },
  {
    name: 'Kofi', style: 'Highlife Master', emoji: '🎯', color: '#FFB703',
    tags: ['Traditional', 'Fusion', 'Live Band'],
    level: 'Intermediate',
    experience: '20+ years',
    students: '9.8K',
    region: 'Kumasi, Ghana',
    bio: 'Kofi 是加纳库马西的 Highlife 大师，20 年舞台经验。他精通传统 Highlife 舞步与现代融合风格，曾在非洲各国巡演教学。他的课程注重基本功和文化溯源。',
    bioEn: 'Kofi is a Highlife master from Kumasi with 20 years on stage. He bridges traditional Highlife steps with modern fusion, having toured across Africa teaching workshops. His classes emphasize fundamentals and cultural roots.',
    specialties: ['Highlife 传统舞步', '现场乐队配合', '文化融合编舞', '中高级技巧提升'],
    quote: '"Dance is the memory of our ancestors, living through us."',
  },
  {
    name: 'Nia', style: 'Kizomba Queen', emoji: '✨', color: '#FF5C8A',
    tags: ['Sensual', 'Partner Work', 'Connection'],
    level: 'All Levels',
    experience: '10+ years',
    students: '15.2K',
    region: 'Luanda, Angola',
    bio: 'Nia 来自安哥拉罗安达，是 Kizomba 和 Semba 的代言人。她的教学注重双人连接的微妙感觉，从基础步伐到高级引带技巧，帮助舞伴之间建立无声的对话。',
    bioEn: 'Nia from Luanda, Angola, embodies Kizomba & Semba. Her teaching focuses on the subtle art of partner connection — from basic steps to advanced leading techniques, building a silent dialogue between dancers.',
    specialties: ['Kizomba 基础入门', 'Semba 进阶技巧', '双人配合训练', '身体律动与连接'],
    quote: '"In Kizomba, two bodies speak one language."',
  },
  {
    name: 'Tunde', style: 'Street & Viral', emoji: '🔥', color: '#00E676',
    tags: ['Challenges', 'Freestyle', 'Afro-Fusion'],
    level: 'Any Level',
    experience: '6+ years',
    students: '35.6K',
    region: 'Lagos, Nigeria',
    bio: 'Tunde 来自尼日利亚拉各斯，是街头舞蹈和病毒传播专家。他在 TikTok 和 Instagram 上拥有百万粉丝，擅长将复杂的非洲舞步拆解成易学的短视频片段。',
    bioEn: 'Tunde from Lagos, Nigeria, is the street dance & viral sensation. With millions of followers across TikTok & Instagram, he breaks down complex Afro moves into bite-sized challenges anyone can learn.',
    specialties: ['热门挑战教学', 'Freestyle 即兴', '短视频编舞', '街头风格融合'],
    quote: '"One move. One video. One million dancers."',
  },
  {
    name: 'Sade', style: 'Afro-Latin Fusion', emoji: '👑', color: '#B388FF',
    tags: ['Salsa', 'Bachata', 'Afro-Cuban'],
    level: 'Intermediate+',
    experience: '15+ years',
    students: '8.4K',
    region: 'Dakar, Senegal',
    bio: 'Sade 来自塞内加尔达喀尔，是非拉融合风格的开拓者。她将西非舞蹈的力量与拉丁舞的优雅完美结合，创造出独特的跨文化舞蹈语言。',
    bioEn: 'Sade from Dakar, Senegal, is the Afro-Latin fusion pioneer. She weaves West African power with Latin elegance, creating a unique cross-cultural dance language that speaks to both worlds.',
    specialties: ['Salsa 非洲风格', 'Bachata 融合', 'Afro-Cuban 节奏', '跨文化编舞'],
    quote: '"When Africa meets Latin America, magic happens on the floor."',
  },
]

// Resource packs (same structure as afrogo.html)
const RESOURCE_PACKS = [
  { name: 'Azonto Basics', lessons: 10, duration: '1h 20m', size: '48 MB', icon: '💃', color: '#FF6B35' },
  { name: 'Afrobeat Mastery', lessons: 15, duration: '2h 45m', size: '85 MB', icon: '🔥', color: '#FF6B35' },
  { name: 'Amapiano Grooves', lessons: 12, duration: '2h 10m', size: '62 MB', icon: '🎹', color: '#40C4D8' },
  { name: 'House Essentials', lessons: 8, duration: '1h 30m', size: '55 MB', icon: '🏠', color: '#40C4D8' },
  { name: 'Kizomba Connection', lessons: 14, duration: '3h 0m', size: '70 MB', icon: '💑', color: '#FF5C8A' },
  { name: 'Viral Challenge Pack', lessons: 15, duration: '2h 30m', size: '95 MB', icon: '📱', color: '#00E676' },
]

function GuestHome() {
  const { t, lang } = useT()
  const navigate = useNavigate()
  const { isLoggedIn, isGuest, logout } = useAuth()
  const [dontShow, setDontShow] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [mentorModal, setMentorModal] = useState(null)
  const [selectedDh, setSelectedDh] = useState(0)
  const [downloadedPacks, setDownloadedPacks] = useState(new Set())
  const [downloading, setDownloading] = useState(null)

  // Auto-redirect if skip is active
  useEffect(() => {
    if (getSkipUntil() > Date.now() && isLoggedIn && !isGuest) {
      navigate('/app', { replace: true })
    }
  }, [isLoggedIn, isGuest, navigate])

  const handleEnter = () => {
    if (dontShow && !isGuest) setSkipUntil(Date.now() + 7 * 24 * 60 * 60 * 1000)
    navigate('/app', { replace: true })
  }

  const handleDownload = async (packName) => {
    setDownloading(packName)
    await new Promise(r => setTimeout(r, 1200))
    setDownloadedPacks(prev => new Set([...prev, packName]))
    setDownloading(null)
  }

  // ── Audio ──
  const audioRef = useRef(null)
  const [currentSong, setCurrentSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [queue, setQueue] = useState([])

  const [previewEnded, setPreviewEnded] = useState(false)
  const limitTimerRef = useRef(null)
  const playSong = useCallback((song, songQueue) => {
    clearTimeout(limitTimerRef.current)
    setPreviewEnded(false)
    setCurrentSong(song); setQueue(songQueue || [song]); setIsPlaying(true)
    if (audioRef.current) {
      audioRef.current.src = song.file
      audioRef.current.play().catch(() => {})
      if (isGuest) {
        limitTimerRef.current = setTimeout(() => {
          if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); setPreviewEnded(true) }
        }, 3000)
      }
    }
  }, [isGuest])
  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentSong) return
    isPlaying ? audioRef.current.pause() : audioRef.current.play().catch(() => {})
    setIsPlaying(!isPlaying)
  }, [isPlaying, currentSong])
  const playNext = useCallback(() => {
    if (queue.length === 0) return
    const idx = queue.findIndex(s => s.id === currentSong?.id)
    playSong(queue[(idx + 1) % queue.length], queue)
  }, [currentSong, queue, playSong])
  const playPrev = useCallback(() => {
    if (queue.length === 0) return
    const idx = queue.findIndex(s => s.id === currentSong?.id)
    playSong(queue[(idx - 1 + queue.length) % queue.length], queue)
  }, [currentSong, queue, playSong])

  const handleVoiceCommand = useCallback((raw) => {
    if (!raw || raw.length < 2) return
    const intent = parseIntent(raw)
    if (intent.action === 'play') {
      const results = findSongs(intent.params.query)
      if (results.length > 0) { playSong(results[0], results); speak(results[0].title, lang === 'zh' ? 'zh-CN' : 'en-US') }
    } else if (intent.action === 'pause' && isPlaying) togglePlay()
    else if (intent.action === 'next') playNext()
    else if (intent.action === 'prev') playPrev()
  }, [isPlaying, togglePlay, playNext, playPrev, playSong, lang])

  return (
    <div className="guest-page">
      <audio ref={audioRef} preload="auto" onEnded={playNext} />

      {/* Header */}
      <div className="guest-header">
        <div className="guest-logo">♪ AfroGO</div>
        <button className="guest-enter-btn" onClick={handleEnter}>
          {isGuest ? (lang === 'zh' ? '登录' : 'Login') : (lang === 'zh' ? '进入应用' : 'Enter App')} →
        </button>
      </div>

      {/* Skip */}
      {!isGuest && (
        <label className="guest-skip">
          <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)} />
          <span>{lang === 'zh' ? '7天内不再提示' : "Don't show for 7 days"}</span>
        </label>
      )}

      {/* Banner */}
      <div className="guest-banner">
        <span className="guest-banner-icon">🎧</span>
        <div>
          <div className="guest-banner-title">
            {isGuest ? (lang === 'zh' ? '游客模式' : 'Guest Mode') : (lang === 'zh' ? '欢迎回来' : 'Welcome Back')}
          </div>
          <div className="guest-banner-sub">
            {isGuest
              ? (lang === 'zh' ? '登录解锁全部功能 · 离线也可听歌' : 'Login for full features · Listen offline')
              : (lang === 'zh' ? '下载离线资源包，无网络也能畅享舞蹈教学' : 'Download offline packs to dance anywhere')}
          </div>
        </div>
      </div>

      {/* Download / Enter buttons */}
      <div className="guest-dl-row">
        <button className="guest-dl-btn primary" onClick={() => setShowModal(true)}>
          <Download size={14} /> {lang === 'zh' ? '离线资源' : 'Offline Packs'}
        </button>
        <button className="guest-dl-btn" onClick={handleEnter}>
          {lang === 'zh' ? '跳过' : 'Skip'} →
        </button>
      </div>

      {/* Song Grid */}
      <div className="guest-section">
        <div className="guest-section-title"><span>🎵</span> {lang === 'zh' ? '热门曲目' : 'Popular Tracks'}</div>
        <div className="guest-song-grid">
          {songs.slice(0, 4).map((song, i) => (
            <div key={song.id}
              className={`guest-song-card ${currentSong?.id === song.id ? 'playing' : ''}`}
              onClick={() => playSong(song, songs)}
              style={{ '--delay': `${i * 0.05}s` }}>
              <div className="guest-song-cover" style={{ background: song.color || '#8D8AD1' }}>
                {currentSong?.id === song.id && isPlaying ? '🎵' : '▶'}
              </div>
              <div className="guest-song-info">
                <div className="guest-song-title">{song.title}</div>
                <div className="guest-song-artist">{song.artist}</div>
              </div>
              <div className="guest-song-genre">{song.genre || song.dance}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mentors */}
      <div className="guest-section">
        <div className="guest-section-title"><span>💃</span> {lang === 'zh' ? 'AI 舞蹈导师' : 'AI Dance Mentors'}</div>
        <div className="guest-mentor-scroll">
          {DIGITAL_HUMANS.slice(0, 4).map((m, i) => (
            <div key={m.name} className="guest-mentor-card" style={{ '--delay': `${i * 0.08}s` }}
              onClick={() => setMentorModal(m)}>
              <div className="guest-mentor-avatar" style={{ background: m.color }}>{m.emoji}</div>
              <div className="guest-mentor-name">{m.name}</div>
              <div className="guest-mentor-style">{m.style}</div>
              {isGuest && <div className="guest-mentor-lock">🔒</div>}
            </div>
          ))}
        </div>
      </div>

      {/* CTA for guests */}
      {isGuest && (
        <div className="guest-cta">
          <p>{lang === 'zh' ? '登录解锁 AI 舞蹈教学、离线资源包和更多功能' : 'Login for AI dance tutorials, offline packs & more'}</p>
          <button className="guest-cta-btn" onClick={() => { logout(); navigate('/welcome') }}>
            {lang === 'zh' ? '注册 / 登录' : 'Sign Up / Login'}
          </button>
        </div>
      )}

      {/* Mini Player */}
      {currentSong && (
        <div className="guest-player">
          <div className="guest-player-cover" style={{ background: currentSong.color || '#8D8AD1' }}>🎵</div>
          <div className="guest-player-info" onClick={() => playSong(currentSong, queue)}>
            <div className="guest-player-title">{currentSong.title}</div>
            <div className="guest-player-artist">
              {previewEnded ? (lang === 'zh' ? '⏳ 试听结束，登录后畅听全曲' : '⏳ Preview ended — login for full track') : currentSong.artist}
            </div>
          </div>
          <div className="guest-player-controls">
            <button onClick={playPrev}><SkipBack size={16} /></button>
            <button className="play-btn" onClick={togglePlay}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button onClick={playNext}><SkipForward size={16} /></button>
          </div>
        </div>
      )}

      {/* ── Resource Download Modal ── */}
      {showModal && (
        <div className="guest-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="guest-modal-card" onClick={e => e.stopPropagation()}>
            <div className="guest-modal-title">
              <Sparkles size={18} /> {lang === 'zh' ? '选择你的数字人舞伴' : 'Choose Your Digital Dance Partner'}
            </div>
            <div className="guest-modal-desc">
              {lang === 'zh' ? '选择一位数字人舞伴，下载离线资源包，无网络也能畅享舞蹈教学' : 'Pick a mentor and download offline packs. Dance anywhere, no internet needed.'}
            </div>

            {/* Digital Human Cards */}
            <div className="guest-dh-grid">
              {DIGITAL_HUMANS.map((dh, i) => (
                <div key={dh.name}
                  className={`guest-dh-card ${selectedDh === i ? 'selected' : ''}`}
                  onClick={() => setSelectedDh(i)}>
                  <div className="guest-dh-avatar" style={{ background: dh.color }}>{dh.emoji}</div>
                  <div className="guest-dh-name">{dh.name}</div>
                  <div className="guest-dh-style">{dh.style}</div>
                  <div className="guest-dh-tags">{dh.tags.map(t => <span key={t} className="guest-dh-tag">{t}</span>)}</div>
                </div>
              ))}
            </div>

            {/* Selected mentor packs */}
            {DIGITAL_HUMANS[selectedDh] && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--color-text)' }}>
                  {DIGITAL_HUMANS[selectedDh].name} {lang === 'zh' ? '的资源包' : "'s Packs"}
                </div>
                {RESOURCE_PACKS.filter((_, i) => i % 3 === selectedDh % 3 || i === selectedDh).slice(0, 3).map(pack => (
                  <div key={pack.name} className="guest-pack-item">
                    <div className="guest-pack-icon" style={{ background: pack.color + '22' }}>{pack.icon}</div>
                    <div className="guest-pack-info">
                      <div className="guest-pack-name">{pack.name}</div>
                      <div className="guest-pack-meta">{pack.lessons} {lang === 'zh' ? '课' : 'lessons'} · {pack.duration}</div>
                    </div>
                    <div className="guest-pack-size">{pack.size}</div>
                    <button
                      className={`guest-pack-btn ${downloadedPacks.has(pack.name) ? 'done' : ''}`}
                      onClick={() => handleDownload(pack.name)}
                      disabled={downloading === pack.name || downloadedPacks.has(pack.name)}>
                      {downloadedPacks.has(pack.name) ? <Check size={12} /> :
                       downloading === pack.name ? '...' : <Download size={12} />}
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* Footer */}
            <div className="guest-modal-footer">
              <button className="skip-btn" onClick={() => setShowModal(false)}>
                {lang === 'zh' ? '稍后再说' : 'Skip for now'}
              </button>
              <button className="go-btn" onClick={() => { setShowModal(false); handleEnter() }}>
                {lang === 'zh' ? '进入应用' : 'Enter App'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mentor Detail Modal ── */}
      {mentorModal && (
        <div className="guest-modal-overlay" style={{ alignItems: 'center' }} onClick={() => setMentorModal(null)}>
          <div className="guest-mentor-detail" onClick={e => e.stopPropagation()}>
            <button className="guest-modal-close" onClick={() => setMentorModal(null)} style={{ position: 'absolute', top: 16, right: 16 }}>
              <X size={18} />
            </button>

            {/* Avatar */}
            <div className="gmd-avatar" style={{ background: mentorModal.color }}>
              <span>{mentorModal.emoji}</span>
            </div>

            {/* Name & Title */}
            <h2 className="gmd-name">{mentorModal.name}</h2>
            <p className="gmd-style">{mentorModal.style} · {mentorModal.region}</p>

            {/* Stats */}
            <div className="gmd-stats">
              <div className="gmd-stat"><span className="gmd-stat-val">{mentorModal.level}</span><span className="gmd-stat-lbl">{lang === 'zh' ? '难度' : 'Level'}</span></div>
              <div className="gmd-stat"><span className="gmd-stat-val">{mentorModal.experience}</span><span className="gmd-stat-lbl">{lang === 'zh' ? '经验' : 'Exp'}</span></div>
              <div className="gmd-stat"><span className="gmd-stat-val">{mentorModal.students}</span><span className="gmd-stat-lbl">{lang === 'zh' ? '学员' : 'Students'}</span></div>
            </div>

            {/* Bio */}
            <p className="gmd-bio">{lang === 'zh' ? mentorModal.bio : mentorModal.bioEn}</p>

            {/* Quote */}
            <blockquote className="gmd-quote">💬 {mentorModal.quote}</blockquote>

            {/* Specialties */}
            <div className="gmd-section-title">{lang === 'zh' ? '擅长领域' : 'Specialties'}</div>
            <div className="gmd-specialties">
              {mentorModal.specialties.map(s => (
                <span key={s} className="gmd-specialty-tag">{s}</span>
              ))}
            </div>

            {/* Tags */}
            <div className="gmd-section-title">{lang === 'zh' ? '舞蹈风格' : 'Styles'}</div>
            <div className="gmd-tags">
              {mentorModal.tags.map(t => (
                <span key={t} className="gmd-tag">{t}</span>
              ))}
            </div>

            {/* CTA */}
            <button className="gmd-cta" onClick={() => { setMentorModal(null); setShowModal(true) }}>
              <Download size={14} /> {lang === 'zh' ? '下载 ' + mentorModal.name + ' 的资源包' : 'Download ' + mentorModal.name + '\'s Packs'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default GuestHome
