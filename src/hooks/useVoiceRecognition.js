/* === AfroGo — Voice Recognition Hook ===
   Multi-backend: Web Speech API (free, instant) → Sherpa-ONNX WASM (offline)
   Auto-falls back to text input if neither is available. */

import { useState, useRef, useCallback, useEffect } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

function useVoiceRecognition({ lang = 'en-US', onResult, onError } = {}) {
  const [status, setStatus] = useState('idle') // idle | listening | processing | error
  const [text, setText] = useState('')
  const [backend, setBackend] = useState('web-speech') // web-speech | sherpa | text
  const recognitionRef = useRef(null)

  /* ── Web Speech API ── */
  const startWebSpeech = useCallback(() => {
    if (!SpeechRecognition) {
      console.log('[VoiceRec] SpeechRecognition not available (requires HTTPS or localhost)')
      return false
    }
    try {
      const r = new SpeechRecognition()
      r.lang = lang
      r.interimResults = false
      r.continuous = false
      r.maxAlternatives = 1
      r.onresult = (e) => {
        const raw = e.results[0][0].transcript
        setText(raw)
        setStatus('idle')
        if (!raw || raw.trim().length < 2) return // skip empty/silence
        onResult?.(raw)
      }
      r.onerror = (e) => {
        console.warn('[VoiceRec] Speech error:', e.error, e.message)
        setStatus('error')
        onError?.(e.error)
      }
      r.onend = () => setStatus(s => (s === 'listening' ? 'idle' : s))
      r.start()
      console.log('[VoiceRec] ✅ Web Speech started')
      recognitionRef.current = r
      return true
    } catch (e) {
      console.warn('[VoiceRec] Web Speech start failed:', e.message)
      return false
    }
  }, [lang, onResult, onError])

  const stopWebSpeech = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  /* ── Shared voice mode — same as useWakeWord ── */
  function getVoiceMode() {
    try { return localStorage.getItem('afrogo_voice_mode') || 'sherpa' } catch { return 'sherpa' }
  }

  /* ── Sherpa ASR (shared via window.__afrogoAsr from useWakeWord) ── */
  const sherpaStart = useCallback(() => {
    return !!window.__afrogoAsr
  }, [])

  /* ── Public API ── */
  const startListening = useCallback(async () => {
    setStatus('listening')
    setText('')

    const mode = getVoiceMode()

    if (mode === 'sherpa') {
      // Sherpa mode: use shared VAD+ASR engine. Promise-like: one-shot callback.
      setBackend('sherpa')
      let fired = false
      window.__afrogoVoiceCallback = (raw) => {
        if (fired) return
        fired = true
        window.__afrogoVoiceCallback = null
        setText(raw)
        setStatus('idle')
        onResult?.(raw)
      }
      // Clear VAD buffer to avoid stale audio being processed first
      window.__afrogoFlushVad?.()
      console.log('[VoiceRec] Sherpa mode — shared ASR engine active')
      return
    }

    // Web Speech mode
    setBackend('web-speech')
    window.__afrogoVoiceCallback = null
    if (SpeechRecognition) {
      const ok = startWebSpeech()
      if (ok) return
    }

    // Fallback
    console.log('[VoiceRec] No voice backend')
    setBackend('text')
    setStatus('idle')
  }, [SpeechRecognition, startWebSpeech, onResult])

  const stopListening = useCallback(() => {
    if (backend === 'web-speech') stopWebSpeech()
    window.__afrogoVoiceCallback = null
    setStatus('idle')
  }, [backend, stopWebSpeech])

  const submitText = useCallback((input) => {
    setText(input)
    onResult?.(input)
  }, [onResult])

  // Cleanup
  useEffect(() => () => stopWebSpeech(), [stopWebSpeech])

  return {
    status, text, backend,
    startListening, stopListening, submitText,
    isSupported: !!SpeechRecognition,
  }
}

export default useVoiceRecognition
