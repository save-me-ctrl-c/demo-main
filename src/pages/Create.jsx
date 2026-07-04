import { useState, useEffect, useRef, useCallback } from 'react'
import { aiTools, templates, drafts } from '../data/mockData'
import { useT } from '../i18n/LanguageContext'
import Portal from '../components/Portal'
import { Camera, Upload, Sparkles, Scissors, Palette, X, Play, Music, Clock } from '../components/Icon'
import './Create.css'

const TOOL_MAP = {
  tool_ai_beautify: { Icon: Sparkles, desc: 'tool_ai_beautify_desc', color: '#A455FC' },
  tool_cutout: { Icon: Scissors, desc: 'tool_cutout_desc', color: '#14B8A0' },
  tool_quality: { Icon: Sparkles, desc: 'tool_quality_desc', color: '#F59E0B' },
  tool_palette: { Icon: Palette, desc: 'tool_palette_desc', color: '#EF4444' },
}

function Create() {
  const { t } = useT()
  const [activeDetail, setActiveDetail] = useState(null)
  const [recordState, setRecordState] = useState('idle') // idle | countdown | recording
  const [countdown, setCountdown] = useState(3)
  const timerRef = useRef(null)

  const startRecord = useCallback(() => {
    setRecordState('countdown')
    setCountdown(3)
  }, [])

  useEffect(() => {
    if (recordState === 'countdown') {
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(timerRef.current)
            setRecordState('recording')
            return 0
          }
          return c - 1
        })
      }, 800)
      return () => clearInterval(timerRef.current)
    }
  }, [recordState])

  const handleRecordClick = () => {
    if (recordState === 'idle') startRecord()
    else if (recordState === 'countdown') {
      clearInterval(timerRef.current)
      setRecordState('idle')
      setCountdown(3)
    } else if (recordState === 'recording') {
      clearInterval(timerRef.current)
      setRecordState('idle')
    }
  }

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
      </div>

      {/* === Templates === */}
      <div className="section-title"><h2>{t('templates')}</h2><button className="see-all">{t('see_all')}</button></div>
      <div className="template-grid">
        {templates.map((tp, i) => (
          <div key={i} className="template-card" onClick={() => setActiveDetail({ type: 'template', ...tp })}>
            <div className="template-thumb">
              <div className="template-thumb-bg" />
              <span className="template-thumb-icon">{tp.icon}</span>
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
      <div className="section-title"><h2>{t('drafts_title')}</h2></div>
      <div className="draft-list">
        {drafts.map((d, i) => (
          <div key={i} className="draft-item">
            <div className="draft-thumb" style={{ background: `linear-gradient(135deg, ${d.color}, ${d.color}88)` }}><Camera size={14} /></div>
            <div className="draft-info">
              <span className="draft-title">{d.title === 'Untitled Draft' ? t('draft_untitled') : d.title}</span>
              <span className="draft-date">{d.date === '3 hours ago' ? `${t('draft_saved')} 3h` : `${t('draft_saved')} 1d`}</span>
            </div>
            <button className="draft-edit">{t('edit')}</button>
          </div>
        ))}
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
              <span className="panel-rec-timer">{recordState === 'recording' ? '00:05' : '00:00'}</span>
            </div>
            <div className="panel-rec-view">
              <Camera size={48} className="icon-muted" style={{ opacity: recordState === 'countdown' ? 0.05 : 0.15 }} />
              {recordState === 'countdown' && <div className="panel-countdown" key={countdown}>{countdown}</div>}
              <div className="panel-rec-dh"><span>🤖</span> Zara {t('record_leading')}</div>
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
                {/* Countdown ring — SVG circle */}
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
                    <div className="ait-visual"><span>{tp.icon}</span></div>
                    <span className="ait-name">{tp.name}</span>
                    <span className="ait-diff">{tp.difficulty}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div></Portal>
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
                  <span className="modal-hero-icon">{activeDetail.icon}</span>
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
