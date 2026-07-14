import { useState, useEffect, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { aiTools, templates } from '../data/mockData'
import { useT } from '../i18n/LanguageContext'
import Portal from '../components/Portal'
import DanceScore from '../components/DanceScore'
import { Camera, Upload, Sparkles, Scissors, Palette, X, Play, Music, Clock, Gauge } from '../components/Icon'
import './Create.css'

const TOOL_MAP = {
  tool_ai_beautify: { Icon: Sparkles, desc: 'tool_ai_beautify_desc', color: '#A455FC' },
  tool_cutout: { Icon: Scissors, desc: 'tool_cutout_desc', color: '#14B8A0' },
  tool_quality: { Icon: Sparkles, desc: 'tool_quality_desc', color: '#F59E0B' },
  tool_palette: { Icon: Palette, desc: 'tool_palette_desc', color: '#EF4444' },
}

// Digital human mentors with videos
const DIGI_PARTNERS = [
  { name: 'Zara', emoji: '💃', video: '/media/digiMan/woman.mp4' },
  { name: 'Tunde', emoji: '🔥', video: '/media/digiMan/man.mp4' },
]

function Create() {
  const { t } = useT()
  const { currentSong, isPlaying } = useOutletContext()
  const [activeDetail, setActiveDetail] = useState(null)
  const [recordState, setRecordState] = useState('idle')
  const [countdown, setCountdown] = useState(3)
  const [digiPartner, setDigiPartner] = useState(DIGI_PARTNERS[0])
  const [recordingTime, setRecordingTime] = useState(0)
  const [draftList, setDraftList] = useState([])
  const [previewBlob, setPreviewBlob] = useState(null) // just-recorded blob for preview
  const [previewUrl, setPreviewUrl] = useState(null)
  const [draftName, setDraftName] = useState('')
  const timerRef = useRef(null)
  const digiVideoRef = useRef(null)
  const camVideoRef = useRef(null)
  const camStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const dbRef = useRef(null)

  // Open IndexedDB
  const openDB = useCallback(() => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('afrogo_videos', 1)
      req.onupgradeneeded = () => { req.result.createObjectStore('videos', { keyPath: 'id' }) }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }, [])

  // Load drafts from IndexedDB
  useEffect(() => {
    openDB().then(db => {
      dbRef.current = db
      const tx = db.transaction('videos', 'readonly')
      const req = tx.objectStore('videos').getAll()
      req.onsuccess = () => {
        const items = req.result.sort((a, b) => b.createdAt - a.createdAt)
        setDraftList(items.map(d => ({ ...d, videoUrl: URL.createObjectURL(d.blob) })))
      }
    }).catch(() => {})
  }, [openDB])

  // Save draft to IndexedDB
  const saveDraft = useCallback(async (blob, duration) => {
    try {
      const db = dbRef.current || await openDB()
      const record = {
        id: Date.now().toString(36),
        title: `Recording ${new Date().toLocaleTimeString()}`,
        createdAt: Date.now(),
        duration: `${duration}s`,
        color: '#A455FC',
        blob: blob,
      }
      const tx = db.transaction('videos', 'readwrite')
      tx.objectStore('videos').add(record)
      tx.oncomplete = () => {
        setDraftList(prev => [{ ...record, videoUrl: URL.createObjectURL(blob), blob: undefined }, ...prev])
      }
    } catch (e) { console.warn('Save draft failed:', e.message) }
  }, [openDB])

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
      camStreamRef.current = stream
      if (camVideoRef.current) camVideoRef.current.srcObject = stream
      return true
    } catch (e) {
      console.warn('Camera access denied:', e.message)
      return false
    }
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    camStreamRef.current?.getTracks().forEach(t => t.stop())
    camStreamRef.current = null
    if (camVideoRef.current) camVideoRef.current.srcObject = null
  }, [])

  // Start recording
  const startRecord = useCallback(async () => {
    const hasCam = await startCamera()
    setRecordState('countdown')
    setCountdown(3)
  }, [startCamera])

  // Begin actual recording
  const beginRecording = useCallback(() => {
    const stream = camStreamRef.current
    if (!stream) return
    chunksRef.current = []
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' })
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      setPreviewBlob(blob)
      setPreviewUrl(url)
      setDraftName('')
      setRecordState('idle')
      setRecordingTime(0)
    }
    recorder.start(1000)
    mediaRecorderRef.current = recorder
  }, [saveDraft, recordingTime])

  // Recording timer
  useEffect(() => {
    if (recordState === 'recording') {
      timerRef.current = setInterval(() => setRecordingTime(c => c + 1), 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [recordState])

  // Sync digital human video
  useEffect(() => {
    const video = digiVideoRef.current
    if (!video) return
    if (recordState === 'recording') {
      video.currentTime = 0
      video.play().catch(() => {})
    } else if (recordState === 'idle') {
      video.pause()
      video.currentTime = 0
    }
  }, [recordState])

  // Countdown
  useEffect(() => {
    if (recordState === 'countdown') {
      const t = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(t); setRecordState('recording'); beginRecording(); return 0 }
          return c - 1
        })
      }, 800)
      return () => clearInterval(t)
    }
  }, [recordState, beginRecording])

  const handleRecordClick = () => {
    if (recordState === 'idle') startRecord()
    else if (recordState === 'countdown') {
      clearInterval(timerRef.current)
      setRecordState('idle')
      setCountdown(3)
    } else if (recordState === 'recording') {
      mediaRecorderRef.current?.stop()
      stopCamera()
    }
  }

  // Delete draft
  const deleteDraft = useCallback(async (id) => {
    try {
      const db = dbRef.current || await openDB()
      const tx = db.transaction('videos', 'readwrite')
      tx.objectStore('videos').delete(id)
      tx.oncomplete = () => setDraftList(prev => prev.filter(d => d.id !== id))
    } catch {}
  }, [openDB])

  // Confirm save with optional name
  const confirmSave = useCallback(() => {
    if (!previewBlob) return
    saveDraft(previewBlob, recordingTime)
    setPreviewBlob(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }, [previewBlob, previewUrl, recordingTime, saveDraft])

  // Discard recording
  const discardRecording = useCallback(() => {
    setPreviewBlob(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }, [previewUrl])

  // Cleanup on unmount
  useEffect(() => () => { stopCamera(); mediaRecorderRef.current?.stop() }, [stopCamera])

  return (
    <div className="create-page">
      <header className="page-header">
        <h1>{t('create_title')}</h1>
        <p>{t('create_subtitle')}</p>
      </header>

      {/* === 3 Action Cards === */}
      <div className="create-actions">
        <button className="create-act" onClick={() => setActiveDetail({ type: 'record' })}>
          <span className="create-act-icon"><Camera size={28} /></span>
          <span className="create-act-label">{t('create_record')}</span>
          <span className="create-act-sub">{t('create_record_sub')}</span>
        </button>
        <button className="create-act" onClick={() => setActiveDetail({ type: 'import' })}>
          <span className="create-act-icon"><Upload size={28} /></span>
          <span className="create-act-label">{t('create_import')}</span>
          <span className="create-act-sub">{t('create_import_sub')}</span>
        </button>
        <button className="create-act" onClick={() => setActiveDetail({ type: 'aiTemplate' })}>
          <span className="create-act-icon"><Sparkles size={28} /></span>
          <span className="create-act-label">{t('create_ai_template')}</span>
          <span className="create-act-sub">{t('create_ai_sub')}</span>
        </button>
        <button className="create-act create-act-score" onClick={() => setActiveDetail({ type: 'danceScore' })}>
          <span className="create-act-icon"><Gauge size={28} /></span>
          <span className="create-act-label">{t('score_title')}</span>
          <span className="create-act-sub">{t('score_subtitle')}</span>
        </button>
      </div>

      {/* === Templates === */}
      <div className="section-title"><h2>{t('templates')}</h2><button className="see-all">{t('see_all')}</button></div>
      <div className="template-grid">
        {templates.map((tp, i) => (
          <div key={i} className="template-card" onClick={() => setActiveDetail({ type: 'template', ...tp })}>
            <div className="template-thumb">
              <img className="template-thumb-img" src={tp.image} alt={tp.name}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
              <span className="template-thumb-icon" style={{ display: 'none' }}>{tp.icon}</span>
              <div className="template-play"><Play size={28} /></div>
            </div>
            <div className="template-info">
              <span className="template-name">{tp.name}</span>
              <span className="template-stat">{tp.difficulty}</span>
            </div>
          </div>
        ))}
      </div>

      {/* === AI Tools === */}
      <div className="section-title"><h2>{t('ai_tools')}</h2></div>
      <div className="tool-row">
        {aiTools.map((tool, i) => {
          const meta = TOOL_MAP[tool.key] || { Icon: Sparkles, desc: '', color: '#A455FC' }
          const TIcon = meta.Icon
          return (
            <button key={i} className="tool-chip" onClick={() => setActiveDetail({ type: 'tool', key: tool.key, icon: tool.icon, label: t(tool.key), desc: meta.desc, color: meta.color })}>
              <TIcon size={20} className="icon-accent" />
              <span className="tool-chip-label">{t(tool.key)}</span>
            </button>
          )
        })}
      </div>

      {/* === Drafts === */}
      <div className="section-title"><h2>{t('drafts_title')} ({draftList.length})</h2></div>
      <div className="draft-list">
        {draftList.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)', padding: '12px 0' }}>
            {t('drafts_empty')}
          </p>
        ) : (
          draftList.map((d, i) => (
            <div key={d.id} className="draft-item">
              <div className="draft-thumb" style={{ background: `linear-gradient(135deg, ${d.color}, ${d.color}88)`, overflow: 'hidden' }}>
                {d.videoUrl ? (
                  <video src={d.videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                ) : (
                  <Camera size={14} />
                )}
              </div>
              <div className="draft-info">
                <span className="draft-title">{d.title}</span>
                <span className="draft-date">{d.duration} · {new Date(d.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="draft-actions">
                <a href={d.videoUrl} download={`afrogo_${d.id}.webm`} className="draft-dl">⬇</a>
                <button className="draft-del" onClick={(e) => { e.preventDefault(); deleteDraft(d.id) }}>✕</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ============================================
         Secondary Panels (afrogo.html result-overlay style)
         ============================================ */}

      {/* Record Panel */}
      {activeDetail?.type === 'record' && (
        <Portal><div className="full-panel">
          <div className="panel-record">
            <div className="panel-rec-header">
              <button className="panel-back" onClick={() => { setRecordState('idle'); setActiveDetail(null); }}><X size={22} /></button>
              <span className="panel-rec-title">{t('create_record')}</span>
              <span className="panel-rec-timer">{recordState === 'recording' ? `${String(Math.floor(recordingTime / 60)).padStart(2, '0')}:${String(recordingTime % 60).padStart(2, '0')}` : '00:00'}</span>
            </div>

            {/* Digital Human Video — top of recording view */}
            <div className="panel-dh-video">
              <video
                ref={digiVideoRef}
                src={digiPartner.video}
                poster={`/media/digiMan/${digiPartner.name === 'Zara' ? 'woman' : 'man'}_thumb.jpg`}
                loop muted playsInline
                className={`panel-dh-video-el ${recordState === 'recording' ? 'active' : ''}`}
              />
              {/* Recording badge */}
              {recordState === 'recording' && (
                <div className="panel-dh-rec-badge">
                  <span className="panel-dh-rec-dot" /> {digiPartner.name} {t('record_leading')}
                </div>
              )}
              {/* Mentor switcher */}
              <div className="panel-dh-switch">
                {DIGI_PARTNERS.map(d => {
                  const imgName = d.name === 'Zara' ? 'zuri' : d.name.toLowerCase()
                  return (
                  <button key={d.name}
                    className={`panel-dh-switch-btn ${digiPartner.name === d.name ? 'active' : ''}`}
                    onClick={() => { setDigiPartner(d); if (digiVideoRef.current) digiVideoRef.current.currentTime = 0 }}>
                    <img className="panel-dh-switch-img" src={`/media/avatars/mentors/avatar-mentor-${imgName}.png`} alt={d.name}
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline' }} />
                    <span className="panel-dh-switch-emoji" style={{ display: 'none' }}>{d.emoji}</span>
                  </button>
                  )
                })}
              </div>
            </div>

            {/* Camera preview with real feed */}
            <div className="panel-rec-view">
              <video ref={camVideoRef} autoPlay muted playsInline className="panel-cam-feed" />
              {recordState === 'idle' && !camStreamRef.current && (
                <Camera size={36} className="icon-muted" style={{ opacity: 0.1, position: 'absolute' }} />
              )}
              {recordState === 'countdown' && <div className="panel-countdown" key={countdown}>{countdown}</div>}
              {recordState === 'recording' && (
                <div className="panel-rec-indicator">
                  <span className="panel-rec-dot-red" /> {recordingTime}s
                </div>
              )}
              {/* Last draft thumbnail (like phone camera gallery) */}
              {recordState === 'idle' && draftList.length > 0 && (
                <div className="panel-last-draft" onClick={() => setActiveDetail(null)}>
                  <video src={draftList[0].videoUrl} muted className="panel-last-draft-thumb" />
                </div>
              )}
            </div>
            <div className="panel-rec-music">
              <Music size={16} />
              <div className="panel-rec-music-info">
                <span>{t('rec_song_name')}</span>
                <span className="panel-rec-meta">{t('rec_song_meta')}</span>
              </div>
            </div>
            <div className="panel-rec-controls">
              <button className="panel-rec-side">↻</button>
              <div className="panel-rec-btn-wrap">
                {recordState === 'countdown' && (
                  <svg className="panel-rec-ring" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <circle className="panel-rec-ring-fg" cx="40" cy="40" r="36" fill="none"
                      stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray="226.2" />
                  </svg>
                )}
                <button className={`panel-rec-btn ${recordState === 'recording' ? 'recording' : ''}`}
                  onClick={handleRecordClick}>
                  <span className="panel-rec-btn-inner" />
                </button>
              </div>
              <div className="panel-rec-label-wrap">
                <span className="panel-rec-label" style={{ opacity: recordState === 'countdown' ? 0 : 1 }}>
                  {recordState === 'idle' ? t('tap_to_record') : t('tap_to_stop')}
                </span>
              </div>
            </div>
            <div className="panel-rec-options">
              <span><Clock size={12} /> {t('rec_duration')}</span>
              <span>{t('rec_quality')}</span>
              <span><Sparkles size={12} /> {t('rec_beauty')}</span>
            </div>
          </div>
        </div></Portal>
      )}

      {/* ── Post-Recording Preview Modal ── */}
      {previewUrl && (
        <Portal><div className="modal-overlay" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
          <div className="preview-card" onClick={e => e.stopPropagation()}>
            <h3 className="preview-title">{t('rec_preview_title')}</h3>
            <div className="preview-video-wrap">
              <video src={previewUrl} controls autoPlay muted loop className="preview-video" />
            </div>
            <input
              className="preview-name-input"
              placeholder={t('rec_name_placeholder')}
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              maxLength={50}
            />
            <div className="preview-actions">
              <button className="preview-btn discard" onClick={discardRecording}>{t('rec_discard')}</button>
              <button className="preview-btn save" onClick={confirmSave}>{t('rec_save')}</button>
            </div>
          </div>
        </div></Portal>
      )}

      {/* Import Panel — bottom sheet */}
      {activeDetail?.type === 'import' && (
        <Portal><div className="sheet-overlay" onClick={() => setActiveDetail(null)}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2>{t('create_import')}</h2>
              <button className="panel-back" onClick={() => setActiveDetail(null)}><X size={20} /></button>
            </div>
            <div className="sheet-body">
              <button className="import-option">
                <span className="import-opt-icon">📁</span>
                <div>
                  <span className="import-opt-title">{t('import_from_gallery')}</span>
                  <span className="import-opt-desc">{t('import_gallery_desc')}</span>
                </div>
              </button>
              <button className="import-option">
                <span className="import-opt-icon">📂</span>
                <div>
                  <span className="import-opt-title">{t('import_from_files')}</span>
                  <span className="import-opt-desc">{t('import_files_desc')}</span>
                </div>
              </button>
              <button className="import-option">
                <span className="import-opt-icon">🔗</span>
                <div>
                  <span className="import-opt-title">{t('import_from_url')}</span>
                  <span className="import-opt-desc">{t('import_url_desc')}</span>
                </div>
              </button>
            </div>
          </div>
        </div></Portal>
      )}

      {/* AI Template Panel — bottom sheet */}
      {activeDetail?.type === 'aiTemplate' && (
        <Portal><div className="sheet-overlay" onClick={() => setActiveDetail(null)}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2>{t('create_ai_template')}</h2>
              <button className="panel-action-link" style={{ marginRight: 8 }}>{t('see_all')}</button>
              <button className="panel-back" onClick={() => setActiveDetail(null)}><X size={20} /></button>
            </div>
            <div className="sheet-body">
              <p className="panel-card-desc">{t('ai_template_desc')}</p>
              <div className="ait-grid">
                {templates.map((tp, i) => (
                  <div key={i} className="ait-card" onClick={() => setActiveDetail({ type: 'template', ...tp })}>
                    <div className="ait-visual">
                      <img className="ait-visual-img" src={tp.image} alt={tp.name}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                      <span className="ait-visual-emoji" style={{ display: 'none' }}>{tp.icon}</span>
                    </div>
                    <span className="ait-name">{tp.name}</span>
                    <span className="ait-diff">{tp.difficulty}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div></Portal>
      )}

      {/* === Dance Score Panel === */}
      {activeDetail?.type === 'danceScore' && (
        <DanceScore
          onClose={() => setActiveDetail(null)}
          currentSong={currentSong}
          isPlaying={isPlaying}
        />
      )}

      {/* === Detail Modal (tool / template info) === */}
      {activeDetail && (activeDetail.type === 'tool' || activeDetail.type === 'template') && (
        <Portal><div className="modal-overlay" onClick={() => setActiveDetail(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setActiveDetail(null)}><X size={20} /></button>
            {activeDetail.type === 'tool' ? (
              <>
                <div className="modal-hero" style={{ background: `linear-gradient(135deg, ${activeDetail.color}, ${activeDetail.color}66)` }}>
                  <span className="modal-hero-icon">{activeDetail.icon}</span>
                </div>
                <h2 className="modal-title">{activeDetail.label}</h2>
                <p className="modal-desc">{t(activeDetail.desc)}</p>
                <button className="modal-action-btn">{t('use_now')}</button>
              </>
            ) : (
              <>
                <div className="modal-hero" style={{ background: 'linear-gradient(145deg, #1e1e2a 0%, #181820 100%)' }}>
                  <img className="modal-hero-img" src={activeDetail.image} alt={activeDetail.name}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                  <span className="modal-hero-icon" style={{ display: 'none' }}>{activeDetail.icon}</span>
                </div>
                <h2 className="modal-title">{activeDetail.name}</h2>
                <p className="modal-desc">{t('tpl_detail_desc')} ({activeDetail.difficulty})</p>
                <div className="modal-actions">
                  <button className="modal-action-btn">{t('use_template')}</button>
                  <button className="modal-action-btn secondary">{t('preview')}</button>
                </div>
              </>
            )}
          </div>
        </div></Portal>
      )}
    </div>
  )
}

export default Create
