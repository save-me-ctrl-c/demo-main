import { useState } from 'react'
import { Mic, MicOff } from './Icon'
import { useT } from '../i18n/LanguageContext'
import './VoiceButton.css'

function VoiceButton() {
  const { t } = useT()
  const [active, setActive] = useState(false)

  return (
    <>
      <button className={`voice-fab ${active ? 'listening' : ''}`} onClick={() => setActive(a => !a)} aria-label="Voice assistant">
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
