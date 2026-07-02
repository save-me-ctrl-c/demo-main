import { useState, useEffect } from 'react'
import { library as libraryApi, createApi } from '../api'
import { aiTools as fallbackTools, templates as fallbackTemplates, drafts as fallbackDrafts } from '../data/mockData'
import { useT } from '../i18n/LanguageContext'
import { Camera, Upload, Sparkles } from '../components/Icon'
import './Create.css'

function Create() {
  const { t } = useT()
  const [aiTools, setAiTools] = useState(fallbackTools)
  const [templates, setTemplates] = useState(fallbackTemplates)
  const [drafts, setDrafts] = useState(fallbackDrafts)

  useEffect(() => {
    async function fetchData() {
      try {
        const [toolsRes, tplRes, draftsRes] = await Promise.all([
          libraryApi.aiTools(),
          libraryApi.templates(),
          createApi.drafts().catch(() => ({ drafts: [] })),
        ])
        setAiTools(toolsRes.tools.map(t => ({ icon: t.icon, label: t.label })))
        setTemplates(tplRes.templates.map(t => ({ name: t.name, difficulty: t.difficulty, icon: t.icon })))
        setDrafts(draftsRes.drafts.map(d => ({ title: d.title, date: relativeDate(d.createdAt), color: d.color })))
      } catch (err) {
        console.warn('Failed to fetch create data, using mock:', err.message)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="create-page">
      <span className="create-blur-top" />

      <header className="page-header">
        <h1>{t('create_title')}</h1>
        <p>{t('create_subtitle')}</p>
      </header>

      <div className="preview-stage">
        <div className="preview-frame">
          <Camera size={48} className="preview-cam-icon" />
          <p className="preview-label">{t('create_preview_hint')}</p>
          <span className="preview-grid" />
        </div>
      </div>

      <div className="create-actions-bar">
        <button className="actn-btn secondary" aria-label={t('create_import')}>
          <Upload size={20} />
          <span>{t('create_import')}</span>
        </button>
        <button className="actn-btn record" aria-label={t('create_record')}>
          <div className="record-ring"><Camera size={28} /></div>
          <span>{t('create_record')}</span>
        </button>
        <button className="actn-btn secondary" aria-label={t('create_ai_template')}>
          <Sparkles size={20} />
          <span>{t('create_ai_template')}</span>
        </button>
      </div>

      <div className="section-title"><h2>{t('ai_tools')}</h2></div>
      <div className="h-scroll tools-strip">
        {aiTools.map((tool, i) => (
          <button key={i} className="tool-chip">
            <span className="tool-chip-icon">{tool.icon}</span>
            <span className="tool-chip-label">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="section-title"><h2>{t('templates')}</h2><button className="see-all">{t('see_all')}</button></div>
      <div className="h-scroll template-strip">
        {templates.map((tp, i) => (
          <div key={i} className="tpl-card">
            <div className="tpl-visual">
              <span className="tpl-emoji">{tp.icon}</span>
              <div className="tpl-overlay">
                <Camera size={16} />
              </div>
            </div>
            <span className="tpl-name">{tp.name}</span>
            <span className="tpl-diff">{tp.difficulty}</span>
          </div>
        ))}
      </div>

      <div className="section-title"><h2>{t('drafts_title')}</h2></div>
      <div className="draft-list">
        {drafts.map((d, i) => (
          <div key={i} className="draft-item">
            <div className="draft-thumb" style={{ background: `linear-gradient(135deg, ${d.color}, ${d.color}88)` }}>
              <Camera size={14} />
            </div>
            <div className="draft-info">
              <span className="draft-title">{d.title === 'Untitled Draft' ? t('draft_untitled') : d.title}</span>
              <span className="draft-date">{d.date}</span>
            </div>
            <button className="draft-edit">{t('edit')}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function relativeDate(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default Create
