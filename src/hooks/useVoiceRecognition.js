/* === AfroGo Voice Recognition Hook ===
 * Records microphone audio and sends it to the server-side GLM ASR proxy.
 */

import { useState, useRef, useCallback, useEffect } from 'react'

const MAX_RECORDING_MS = 6000
const WAV_SAMPLE_RATE = 16000
const AUDIO_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
]

function getSupportedAudioType() {
  return AUDIO_TYPES.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || ''
}

function resampleToMono(audioBuffer, targetSampleRate) {
  const sourceLength = audioBuffer.length
  const channelCount = audioBuffer.numberOfChannels
  const mono = new Float32Array(sourceLength)

  for (let channel = 0; channel < channelCount; channel += 1) {
    const channelData = audioBuffer.getChannelData(channel)
    for (let i = 0; i < sourceLength; i += 1) {
      mono[i] += channelData[i] / channelCount
    }
  }

  if (audioBuffer.sampleRate === targetSampleRate) return mono

  const targetLength = Math.max(1, Math.round(sourceLength * targetSampleRate / audioBuffer.sampleRate))
  const result = new Float32Array(targetLength)
  const ratio = audioBuffer.sampleRate / targetSampleRate
  for (let i = 0; i < targetLength; i += 1) {
    const position = i * ratio
    const left = Math.floor(position)
    const right = Math.min(left + 1, sourceLength - 1)
    const weight = position - left
    result[i] = mono[left] * (1 - weight) + mono[right] * weight
  }
  return result
}

function encodePcm16Wav(samples, sampleRate) {
  const bytesPerSample = 2
  const dataLength = samples.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  const writeText = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i))
  }

  writeText(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, dataLength, true)

  let offset = 44
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += bytesPerSample
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

async function convertToWav(audioBlob) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) throw new Error('WAV conversion is not supported in this browser')

  const audioContext = new AudioContextClass()
  try {
    const encodedAudio = await audioBlob.arrayBuffer()
    const decodedAudio = await audioContext.decodeAudioData(encodedAudio)
    const samples = resampleToMono(decodedAudio, WAV_SAMPLE_RATE)
    return encodePcm16Wav(samples, WAV_SAMPLE_RATE)
  } finally {
    await audioContext.close()
  }
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
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/wav',
          'X-Audio-Filename': 'voice-command.wav',
        },
        body: audioBlob,
        signal: controller.signal,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `ASR request failed (${response.status})`)

      const transcript = String(data.text || '').trim()
      console.log('[VoiceRec] GLM ASR result:', {
        model: data.model || 'glm-asr-2512',
        text: transcript,
      })
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
      recorder.onstop = async () => {
        clearStopTimer()
        releaseStream()
        recorderRef.current = null
        setStatus('processing')
        try {
          const recordedBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
          const wavBlob = await convertToWav(recordedBlob)
          await transcribe(wavBlob)
        } catch (error) {
          if (disposedRef.current) return
          const message = error.message || 'Unable to convert recording to WAV'
          console.warn('[VoiceRec] WAV conversion error:', message)
          setStatus('error')
          onError?.(message)
        }
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
