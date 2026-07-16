/* === AfroGo Voice Recognition Hook ===
 * Records microphone audio and sends it to the server-side GLM ASR proxy.
 */

import { useState, useRef, useCallback, useEffect } from 'react'

const MAX_RECORDING_MS = 6000
const AUDIO_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
]

function getSupportedAudioType() {
  return AUDIO_TYPES.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || ''
}

function useVoiceRecognition({ onResult, onError } = {}) {
  const [status, setStatus] = useState('idle') // idle | listening | processing | error
  const [text, setText] = useState('')
  const [backend] = useState('glm-asr')
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const stopTimerRef = useRef(null)
  const abortRef = useRef(null)
  const disposedRef = useRef(false)

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    stopTimerRef.current = null
  }, [])

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
  }, [])

  const transcribe = useCallback(async (audioBlob) => {
    if (!audioBlob.size || disposedRef.current) return
    setStatus('processing')
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const extension = audioBlob.type.includes('mp4') ? 'm4a' : 'webm'
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': audioBlob.type || 'audio/webm',
          'X-Audio-Filename': `voice-command.${extension}`,
        },
        body: audioBlob,
        signal: controller.signal,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `ASR request failed (${response.status})`)

      const transcript = String(data.text || '').trim()
      if (disposedRef.current) return
      setText(transcript)
      setStatus('idle')
      if (transcript.length >= 2) onResult?.(transcript)
    } catch (error) {
      if (error.name === 'AbortError' || disposedRef.current) return
      console.warn('[VoiceRec] GLM ASR error:', error.message)
      setStatus('error')
      onError?.(error.message)
    }
  }, [onResult, onError])

  const stopListening = useCallback(() => {
    clearStopTimer()
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
      return
    }
    releaseStream()
  }, [clearStopTimer, releaseStream])

  const startListening = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      const message = 'Microphone recording is not supported in this browser'
      setStatus('error')
      onError?.(message)
      return false
    }

    abortRef.current?.abort()
    stopListening()
    setText('')
    setStatus('listening')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
      if (disposedRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return false
      }

      streamRef.current = stream
      const mimeType = getSupportedAudioType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      const chunks = []
      recorderRef.current = recorder

      recorder.ondataavailable = event => {
        if (event.data?.size) chunks.push(event.data)
      }
      recorder.onerror = event => {
        clearStopTimer()
        releaseStream()
        const message = event.error?.message || 'Audio recording failed'
        setStatus('error')
        onError?.(message)
      }
      recorder.onstop = () => {
        clearStopTimer()
        releaseStream()
        recorderRef.current = null
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        transcribe(blob)
      }

      recorder.start(250)
      stopTimerRef.current = setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop()
      }, MAX_RECORDING_MS)
      return true
    } catch (error) {
      releaseStream()
      const message = error.name === 'NotAllowedError'
        ? 'Microphone permission denied'
        : (error.message || 'Unable to access microphone')
      setStatus('error')
      onError?.(message)
      return false
    }
  }, [clearStopTimer, onError, releaseStream, stopListening, transcribe])

  const submitText = useCallback((input) => {
    setText(input)
    onResult?.(input)
  }, [onResult])

  useEffect(() => {
    disposedRef.current = false
    return () => {
      disposedRef.current = true
      abortRef.current?.abort()
      clearStopTimer()
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.stop()
      }
      releaseStream()
    }
  }, [clearStopTimer, releaseStream])

  return {
    status, text, backend,
    startListening, stopListening, submitText,
    isSupported: !!navigator.mediaDevices?.getUserMedia && !!window.MediaRecorder,
  }
}

export default useVoiceRecognition
