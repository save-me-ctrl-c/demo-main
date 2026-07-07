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
        console.log('%c[VoiceCmd] %c📝 %s', 'color:#A455FC;font-weight:700', 'color:inherit', `"${raw}"`)
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

  /* ── Sherpa-ONNX WASM (placeholder — ready for model files) ── */
  const sherpaRef = useRef(null)

  const initSherpa = useCallback(async () => {
    /* To enable Sherpa-ONNX:
       1. Download WASM files from:
          https://github.com/k2-fsa/sherpa-onnx/releases
          → sherpa-onnx-wasm-main-asr.{js,wasm,data}
       2. Place in /public/sherpa/
       3. Uncomment below:
    */
    /*
    if (sherpaRef.current) return true
    try {
      const { createOnlineRecognizer } = await import('sherpa-onnx/wasm')
      sherpaRef.current = createOnlineRecognizer({ ... })
      return true
    } catch { return false }
    */
    return false
  }, [])

  /* ── Public API ── */
  const startListening = useCallback(async () => {
    setStatus('listening')
    setText('')

    // 1. Try Web Speech API first (instant, no download)
    if (SpeechRecognition) {
      setBackend('web-speech')
      const ok = startWebSpeech()
      if (ok) return
    } else {
      console.log('[VoiceRec] No SpeechRecognition — falling back')
    }

    // 2. Try Sherpa-ONNX WASM (offline, needs model download)
    const sherpaOk = await initSherpa()
    if (sherpaOk) {
      setBackend('sherpa')
      console.log('[VoiceRec] ✅ Sherpa ONNX started')
      return
    }

    // 3. Fallback: text input mode
    console.log('[VoiceRec] ⚠️ No voice backend available — using text input mode')
    setBackend('text')
    setStatus('idle')
  }, [SpeechRecognition, startWebSpeech, initSherpa])

  const stopListening = useCallback(() => {
    if (backend === 'web-speech') stopWebSpeech()
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
