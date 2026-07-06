import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic } from './Icon'
import { useT } from '../i18n/LanguageContext'
import useVoiceRecognition from '../hooks/useVoiceRecognition'
import './VoiceButton.css'

const BTN_SIZE = 54; const MARGIN = 12; const TAB_H = 64

const LOCAL_SONGS = ['Funky Lagos','Nadeya','Take Some Time','Dance In The Rain','Bootlickers House Remix','Gas and Gravity','Around the Corner','World Fusion Music','For You I\'ll Go There']

function VoiceButton({ wakeTrigger = 0, onCommand, wakeRecommend }) {
  const { t } = useT()
  const [active, setActive] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)
  const [lastCommand, setLastCommand] = useState('')
  const recommend = wakeRecommend || LOCAL_SONGS[Math.floor(Math.random() * LOCAL_SONGS.length)]

  // Wake word: show recommendation + close after 3s
  useEffect(() => {
    if (wakeTrigger > 0) {
      setPanelStyle(calcPanelStyle())
      setActive(true)
      setShowRecommend(true)
      setTimeout(() => { setActive(false); setShowRecommend(false) }, 3000)
    }
  }, [wakeTrigger])

  // Voice recognition — listen for commands when active (after recommendation fades)
  const idleTimerRef = useRef(null)
  const startRef = useRef(null)
  const { startListening } = useVoiceRecognition({
    onResult: useCallback((raw) => {
      setLastCommand(raw)
      onCommand?.(raw)
      if (/^(停止|关闭|退出|结束|stop|goodbye|bye|quit|exit)/i.test(raw.toLowerCase())) {
        setActive(false); setLastCommand(''); clearTimeout(idleTimerRef.current); return
      }
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => { setActive(false); setLastCommand('') }, 12000)
      setTimeout(() => startRef.current?.(), 800)
    }, [onCommand]),
  })

  useEffect(() => { startRef.current = startListening }, [startListening])

  // Start listening when activated (after recommendation or on manual click)
  useEffect(() => {
    if (active && !showRecommend) {
      setLastCommand('')
      setTimeout(() => startListening(), 300)
      idleTimerRef.current = setTimeout(() => { setActive(false); setLastCommand('') }, 12000)
    }
    return () => clearTimeout(idleTimerRef.current)
  }, [active, showRecommend, startListening])

  // Drag-to-move
  const [pos, setPos] = useState(null)
  const [panelStyle, setPanelStyle] = useState({})
  const btnRef = useRef(null)
  const dragRef = useRef({ on: false, moved: false, ox: 0, oy: 0 })

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)) }
  function snapX(x) { const vw = window.innerWidth; return x < vw / 2 ? MARGIN : vw - BTN_SIZE - MARGIN }

  function calcPanelStyle() {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return {}
    const vw = window.innerWidth; const btnCenterY = r.top + r.height / 2; const onLeft = r.left < vw / 2
    return { top: btnCenterY, [onLeft ? 'left' : 'right']: 'auto', [onLeft ? 'right' : 'left']: 'auto', [onLeft ? 'left' : 'right']: `${onLeft ? r.right + 10 : vw - r.left + 10}px`, transform: 'translateY(-50%)' }
  }

  const startDrag = useCallback((cx, cy) => {
    const r = btnRef.current?.getBoundingClientRect(); if (!r) return
    dragRef.current = { on: true, moved: false, ox: cx - r.left, oy: cy - r.top }
    const onMove = (ex, ey) => {
      const d = dragRef.current; if (!d.on) return
      const dx = Math.abs(ex - d.ox - (btnRef.current?.getBoundingClientRect().left || 0))
      const dy = Math.abs(ey - d.oy - (btnRef.current?.getBoundingClientRect().top || 0))
      if (dx > 8 || dy > 8) d.moved = true
      if (!d.moved) return
      const vw = window.innerWidth; const vh = window.innerHeight
      setPos({ x: clamp(ex - d.ox, MARGIN, vw - BTN_SIZE - MARGIN), y: clamp(ey - d.oy, MARGIN, vh - TAB_H - BTN_SIZE - MARGIN) })
    }
    const endDrag = () => { const d = dragRef.current; if (!d.on) return; d.on = false; window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', endDrag); window.removeEventListener('touchmove', onTouchMove); window.removeEventListener('touchend', endDrag); if (d.moved) { d.moved = false; setPos(p => p ? { ...p, x: snapX(p.x) } : p) } }
    const onMouseMove = (e) => onMove(e.clientX, e.clientY)
    const onTouchMove = (e) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY) }
    window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', endDrag)
    window.addEventListener('touchmove', onTouchMove, { passive: false }); window.addEventListener('touchend', endDrag)
  }, [])

  const onMouseDown = useCallback((e) => { startDrag(e.clientX, e.clientY) }, [startDrag])
  const onTouchStart = useCallback((e) => { startDrag(e.touches[0].clientX, e.touches[0].clientY) }, [startDrag])

  const toggleActive = useCallback(() => { setActive(a => { if (!a) setPanelStyle(calcPanelStyle()); return !a }) }, [])
  const style = pos ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto', bottom: 'auto', zIndex: 110, transition: 'left 0.6s cubic-bezier(0.25, 0.8, 0.25, 1.2), top 0.4s ease' } : {}

  return (
    <>
      <button ref={btnRef} className={`voice-fab ${active ? 'listening' : ''}`} style={style}
        onMouseDown={onMouseDown} onTouchStart={onTouchStart}
        onClick={() => { if (!dragRef.current.moved) toggleActive() }} aria-label="Voice assistant">
        <Mic size={22} />
        {active && <><span className="vf-ripple" /><span className="vf-ripple delay" /></>}
      </button>
      {active && (
        <div className="voice-panel" style={panelStyle}>
          {showRecommend ? (
            <>
              <p className="vp-text">{t('voice_recommend') || '为您推荐'}</p>
              <p className="vp-result">🎵 {recommend}</p>
            </>
          ) : (
            <>
              <p className="vp-text">{t('voice_listening')}</p>
              {lastCommand && <p className="vp-result">"{lastCommand}"</p>}
              <p className="vp-hint">{t('voice_hint')}</p>
            </>
          )}
        </div>
      )}
    </>
  )
}

export default VoiceButton
