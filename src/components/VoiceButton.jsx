import { useState, useRef, useCallback } from 'react'
import { Mic, MicOff } from './Icon'
import { useT } from '../i18n/LanguageContext'
import './VoiceButton.css'

const BTN_SIZE = 54
const MARGIN = 12
const TAB_H = 64

function VoiceButton() {
  const { t } = useT()
  const [active, setActive] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const dragRef = useRef({ on: false, moved: false, ox: 0, oy: 0 })

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)) }

  function snapX(x) {
    const vw = window.innerWidth
    return x < vw / 2 ? MARGIN : vw - BTN_SIZE - MARGIN
  }

  const startDrag = useCallback((cx, cy) => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    dragRef.current = { on: true, moved: false, ox: cx - r.left, oy: cy - r.top }

    const onMove = (ex, ey) => {
      const d = dragRef.current
      if (!d.on) return
      const dx = Math.abs(ex - d.ox - (btnRef.current?.getBoundingClientRect().left || 0))
      const dy = Math.abs(ey - d.oy - (btnRef.current?.getBoundingClientRect().top || 0))
      if (dx > 3 || dy > 3) d.moved = true
      if (!d.moved) return
      const vw = window.innerWidth; const vh = window.innerHeight
      setPos({
        x: clamp(ex - d.ox, MARGIN, vw - BTN_SIZE - MARGIN),
        y: clamp(ey - d.oy, MARGIN, vh - TAB_H - BTN_SIZE - MARGIN),
      })
    }

    const endDrag = () => {
      const d = dragRef.current
      if (!d.on) return
      d.on = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', endDrag)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', endDrag)
      if (d.moved) {
        d.moved = false // reset so transition applies for snap
        setPos(p => p ? { ...p, x: snapX(p.x) } : p)
      } else {
        setActive(a => !a)
      }
    }

    const onMouseMove = (e) => onMove(e.clientX, e.clientY)
    const onTouchMove = (e) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY) }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', endDrag)
  }, [])

  const onMouseDown = useCallback((e) => { e.preventDefault(); startDrag(e.clientX, e.clientY) }, [startDrag])
  const onTouchStart = useCallback((e) => { startDrag(e.touches[0].clientX, e.touches[0].clientY) }, [startDrag])

  const style = pos ? {
    position: 'fixed', left: pos.x, top: pos.y, right: 'auto', bottom: 'auto', zIndex: 110,
    transition: dragRef.current.moved ? 'none' : 'left 0.6s cubic-bezier(0.25, 0.8, 0.25, 1.2), top 0.4s ease',
  } : {}

  return (
    <>
      <button
        ref={btnRef}
        className={`voice-fab ${active ? 'listening' : ''}`}
        style={style}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        aria-label="Voice assistant"
      >
        {active ? <MicOff size={22} /> : <Mic size={22} />}
        {active && <><span className="vf-ripple" /><span className="vf-ripple delay" /></>}
      </button>
      {active && (
        <div className="voice-panel">
          <p className="vp-text">{t('voice_listening')}</p>
          <p className="vp-hint">{t('voice_hint')}</p>
        </div>
      )}
    </>
  )
}

export default VoiceButton
