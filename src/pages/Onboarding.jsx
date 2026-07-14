import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { mentors as mentorsApi } from '../api'
import { Download, Check, Sparkles } from '../components/Icon'
import './Onboarding.css'

function Onboarding() {
  const navigate = useNavigate()
  const [mentors, setMentors] = useState([])
  const [packs, setPacks] = useState([])
  const [selectedMentor, setSelectedMentor] = useState(null)
  const [selectedPacks, setSelectedPacks] = useState(new Set())
  const [step, setStep] = useState(1) // 1=choose mentor, 2=choose packs
  const [downloading, setDownloading] = useState(null) // pack id being "downloaded"

  useEffect(() => {
    async function load() {
      try {
        const [mRes, pRes] = await Promise.all([mentorsApi.list(), mentorsApi.packs()])
        setMentors(mRes.mentors)
        setPacks(pRes.packs)
      } catch (err) {
        console.warn('Failed to load mentors:', err.message)
      }
    }
    load()
  }, [])

  function handleSelectMentor(mentor) {
    setSelectedMentor(mentor)
    // Auto-select this mentor's packs
    const mentorPacks = packs.filter(p => p.mentorId === mentor.id)
    mentorPacks.forEach(p => setSelectedPacks(prev => new Set([...prev, p.id])))
    setStep(2)
  }

  function togglePack(packId) {
    setSelectedPacks(prev => {
      const next = new Set(prev)
      next.has(packId) ? next.delete(packId) : next.add(packId)
      return next
    })
  }

  async function handleDownload(packId) {
    setDownloading(packId)
    // Simulate download (in real app would fetch & cache)
    await new Promise(r => setTimeout(r, 1500))
    setDownloading(null)
  }

  async function handleFinish() {
    try {
      await mentorsApi.completeOnboarding(
        selectedMentor?.id || null,
        [...selectedPacks]
      )
    } catch { /* non-critical */ }
    navigate('/app', { replace: true })
  }

  // ── Step 1: AI Mentor Selection ──
  if (step === 1) {
    return (
      <div className="onboard-page">
        <div className="onboard-stars" />
        <div className="onboard-content">
          <div className="onboard-header">
            <span className="onboard-step">Step 1/2</span>
            <h1>Choose Your AI Dance Mentor</h1>
            <p>Each mentor specializes in different dance styles. Pick one to personalize your learning journey.</p>
          </div>
          <div className="mentor-grid">
            {mentors.map(m => (
              <button key={m.id} className="mentor-card" onClick={() => handleSelectMentor(m)}
                style={{ '--mc': m.color }}>
                <span className="mentor-avatar">
                  <img className="mentor-avatar-img-ob" src={`/media/avatars/mentors/avatar-mentor-${m.name.toLowerCase()}.png`} alt={m.name}
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                  <span className="mentor-avatar-fallback" style={{ display: 'none' }}>{m.avatar}</span>
                </span>
                <div className="mentor-info">
                  <h3>{m.name}</h3>
                  <span className="mentor-specialty">{m.specialty}</span>
                  <span className="mentor-level">{m.level} · {m.students} students</span>
                  <p className="mentor-desc">{m.description}</p>
                </div>
                <span className="mentor-arrow">→</span>
              </button>
            ))}
          </div>
          <button className="onboard-skip" onClick={() => navigate('/app', { replace: true })}>
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  // ── Step 2: Download Teaching Packs ──
  const mentorPacks = packs.filter(p => p.mentorId === selectedMentor?.id)
  const selectedCount = [...selectedPacks].filter(id => mentorPacks.some(p => p.id === id)).length

  return (
    <div className="onboard-page">
      <div className="onboard-stars" />
      <div className="onboard-content">
        <div className="onboard-header">
          <button className="onboard-back" onClick={() => setStep(1)}>← Back</button>
          <span className="onboard-step">Step 2/2</span>
          <div className="onboard-mentor-badge" style={{ '--mc': selectedMentor?.color }}>
            <img className="ob-badge-img" src={`/media/avatars/mentors/avatar-mentor-${selectedMentor?.name?.toLowerCase()}.png`} alt={selectedMentor?.name}
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline' }} />
            <span className="ob-badge-fallback" style={{ display: 'none' }}>{selectedMentor?.avatar}</span>
            <span>{selectedMentor?.name}</span>
          </div>
          <h1>Download Dance Resources</h1>
          <p>Select the packs you want offline. Downloaded packs work without internet.</p>
        </div>

        <div className="pack-list">
          {mentorPacks.map(p => (
            <div key={p.id} className={`pack-card ${selectedPacks.has(p.id) ? 'selected' : ''}`}
              onClick={() => togglePack(p.id)}>
              <div className="pack-check">
                {selectedPacks.has(p.id) ? <Check size={16} /> : null}
              </div>
              <span className="pack-icon">{p.icon}</span>
              <div className="pack-info">
                <h4>{p.name}</h4>
                <p>{p.description}</p>
                <span className="pack-meta">
                  <span>{p.lessons} lessons · {p.duration}</span>
                  <span className="pack-size">{p.size}</span>
                </span>
              </div>
              <button
                className="pack-dl-btn"
                onClick={e => { e.stopPropagation(); handleDownload(p.id) }}
                disabled={downloading === p.id}
              >
                {downloading === p.id ? '⏳' : <Download size={14} />}
              </button>
            </div>
          ))}
        </div>

        {/* Also show other mentors' packs */}
        <div className="pack-extra">
          <h3><Sparkles size={14} /> Popular from other mentors</h3>
          {packs.filter(p => p.mentorId !== selectedMentor?.id).slice(0, 3).map(p => (
            <div key={p.id} className={`pack-card ${selectedPacks.has(p.id) ? 'selected' : ''}`}
              onClick={() => togglePack(p.id)}>
              <div className="pack-check">
                {selectedPacks.has(p.id) ? <Check size={16} /> : null}
              </div>
              <span className="pack-icon">{p.icon}</span>
              <div className="pack-info">
                <h4>{p.name} <small>by {p.mentorName}</small></h4>
                <p>{p.description}</p>
                <span className="pack-meta"><span>{p.lessons} lessons · {p.duration}</span><span className="pack-size">{p.size}</span></span>
              </div>
              <button className="pack-dl-btn" onClick={e => { e.stopPropagation(); handleDownload(p.id) }}
                disabled={downloading === p.id}>
                {downloading === p.id ? '⏳' : <Download size={14} />}
              </button>
            </div>
          ))}
        </div>

        {/* Bottom action */}
        <div className="onboard-bottom">
          <span className="onboard-summary">
            {selectedCount} pack{selectedCount !== 1 ? 's' : ''} selected · {mentorPacks.filter(p => selectedPacks.has(p.id)).reduce((sum, p) => sum + parseInt(p.size), 0)} MB total
          </span>
          <button className="welcome-btn primary" onClick={handleFinish}>
            Start Dancing 🎉
          </button>
        </div>
      </div>
    </div>
  )
}

export default Onboarding
