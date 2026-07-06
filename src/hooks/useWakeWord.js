import { useState, useRef, useCallback, useEffect } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const WAKE_WORDS = [
  'hey afrogo','hey afro go','hey afro','ok afro','ok afrogo','afro go',
  'hey assistant','wake up','start listening',
  // Phonetic variants (ASR misrecognition)
  'hey afro co','hey afro goal','hey afro gold','hey afro coal',
  'hey after go','hey apple go','hey apple co',
  'ok afro co','okay afro','ok after go',
  'a fro go','a fro co','afro co','afro goal',
  'hey arrow go','hey arrow',
  'hi afro','hi afrogo','hi afro go',
]
const WAKE_WORDS_ZH = ['嘿助手','你好助手','唤醒','开始','嘿','助手']
// Short keywords that trigger if they appear anywhere in the text
const SHORT_KW = ['afro', 'afrogo']
const TINY_WAKE = ['hi', 'hey', 'hai', 'hay', 'hoi']

function fuzzyMatch(text, words) {
  const t = text.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '')
  // Check short keywords first (appear anywhere)
  for (const kw of SHORT_KW) {
    if (t.includes(kw)) return true
  }
  // Full word matching
  for (const w of words) {
    const c = w.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '')
    if (t.includes(c)) return true
    // Allow 2-3 char differences for longer texts
    const lenDiff = Math.abs(t.length - c.length)
    if (lenDiff <= 3 && t.length >= 3) {
      let m = 0; const minLen = Math.min(t.length, c.length)
      for (let i = 0; i < minLen; i++) if (t[i] !== c[i]) m++
      if (m <= 2) return true
    }
  }
  return false
}

export default function useWakeWord({ onWake, enabled = true, lang = 'en-US' } = {}) {
  const [status, setStatus] = useState('loading')
  const audioCtxRef = useRef(null)
  const streamRef = useRef(null)
  const cooldownRef = useRef(false)
  const recognitionRef = useRef(null)
  const log = useCallback((...a) => console.log('%c[WakeWord]','color:#A455FC;font-weight:700',...a), [])

  const startWebSpeech = useCallback(() => {
    if (!SpeechRecognition || recognitionRef.current) return
    try {
      const r = new SpeechRecognition()
      r.lang = lang; r.interimResults = false; r.continuous = false
      recognitionRef.current = r
      r.onresult = (e) => {
        const text = e.results[0][0].transcript
        log('📝 Web Speech:', `"${text}"`)
        const words = lang.startsWith('zh') ? [...WAKE_WORDS, ...WAKE_WORDS_ZH] : WAKE_WORDS
        if (fuzzyMatch(text, words)) { log('✅ 唤醒成功！'); setStatus('woke'); onWake?.()
          cooldownRef.current = true; setTimeout(() => { cooldownRef.current = false; setStatus('idle') }, 3000) }
        else log('❌ 未匹配')
        recognitionRef.current = null
      }
      r.onerror = () => { recognitionRef.current = null }
      r.onend = () => setStatus('idle')
      r.start()
    } catch { setStatus('idle') }
  }, [lang, onWake, log])

  const init = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new AudioContext({ sampleRate: 16000 })
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const M = window.Module
      const createVad = window.createVad
      const hasWasm = M && M._SherpaOnnxCreateCircularBuffer

      let recognizer = null
      if (createVad && hasWasm) {
        try {
          if (window.__sherpaReady) { log('⏳ 等待 WASM...'); await window.__sherpaReady }

          // Load Moonshine v2 ASR model into MEMFS
          if (M._SherpaOnnxCreateOfflineRecognizer) {
            try {
              const MODEL_DIR = '/sherpa/models/sherpa-onnx-moonshine-tiny-en-quantized-2026-02-27/'
              // Map: source file → MEMFS name (sherpa expects specific names)
              const fileMap = {
                'tokens.txt': 'tokens.txt',
                'decoder_model_merged.ort': 'moonshine-merged-decoder.ort',
              }
              for (const [src, dst] of Object.entries(fileMap)) {
                const resp = await fetch(MODEL_DIR + src)
                if (resp.ok) {
                  try { M.FS_createDataFile('/', dst, new Uint8Array(await resp.arrayBuffer()), true, false, false) }
                  catch(fsErr) { if (!String(fsErr).includes('Errno')) throw fsErr }
                }
              }
              log('📥 ASR 模型已加载到 MEMFS')
              const asrCfg = {
                modelConfig: { debug: 0, tokens: './tokens.txt', moonshine: { mergedDecoder: './moonshine-merged-decoder.ort' } }
              }
              const ptrCfg = window.initSherpaOnnxOfflineRecognizerConfig(asrCfg, M)
              const handle = M._SherpaOnnxCreateOfflineRecognizer(ptrCfg.ptr)
              window.freeConfig?.(ptrCfg, M)
              if (handle) {
                recognizer = { handle, M, createStream() { const h = this.M._SherpaOnnxCreateOfflineStream(this.handle); if (!h) return null; return { handle: h, M, acceptWaveform(sr, samples) { const p = this.M._malloc(samples.length * 4); this.M.HEAPF32.set(samples, p / 4); this.M._SherpaOnnxAcceptWaveformOffline(this.handle, sr, p, samples.length); this.M._free(p) }, free() { if (this.handle) { this.M._SherpaOnnxDestroyOfflineStream(this.handle); this.handle = null } } } }, decode(stream) { this.M._SherpaOnnxDecodeOfflineStream(this.handle, stream.handle) }, getResult(stream) { const r = this.M._SherpaOnnxGetOfflineStreamResult(this.handle, stream.handle); const text = r ? this.M.UTF8ToString(r) : ''; this.M._SherpaOnnxDestroyOfflineRecognizerResult(r); return { text } } }
                log('✅ Sherpa ASR (Moonshine v2) 已就绪')
              }
            } catch(e) { log('⚠️ ASR 失败:', e?.message || String(e).slice(0,100)) }
          }

          const vad = createVad(M)
          if (vad && vad.handle) {
            const cap = 30 * 16000
            const buffer = { handle: M._SherpaOnnxCreateCircularBuffer(cap), M, push(s) { const p = this.M._malloc(s.length * 4); this.M.HEAPF32.set(s, p / 4); this.M._SherpaOnnxCircularBufferPush(this.handle, p, s.length); this.M._free(p) }, get(start, n) { const p = this.M._SherpaOnnxCircularBufferGet(this.handle, start, n); const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = this.M.HEAPF32[p / 4 + i]; this.M._SherpaOnnxCircularBufferFree(p); return o }, pop(n) { this.M._SherpaOnnxCircularBufferPop(this.handle, n) }, size() { return this.M._SherpaOnnxCircularBufferSize(this.handle) }, head() { return this.M._SherpaOnnxCircularBufferHead(this.handle) }, reset() { this.M._SherpaOnnxCircularBufferReset(this.handle) } }
            const proc = ctx.createScriptProcessor(4096, 1, 1); let active = false
            let speechStarted = false
            const processText = (text) => {
              const clean = text.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '')
              // Short utterances: "hi", "hey" etc — check tiny wake words
              if (clean.length <= 4 && TINY_WAKE.some(w => clean === w || clean.includes(w))) {
                log('✅ 短词唤醒!'); setStatus('woke'); onWake?.()
                cooldownRef.current = true; speechStarted = false
                vad?.flush?.(); vad?.reset?.()
                setTimeout(() => { cooldownRef.current = false; buffer?.reset(); setStatus('idle') }, 3000)
                return
              }
              const words = lang.startsWith('zh') ? [...WAKE_WORDS, ...WAKE_WORDS_ZH] : WAKE_WORDS
              if (fuzzyMatch(text, words)) { log('✅ 唤醒成功！'); setStatus('woke'); onWake?.()
                cooldownRef.current = true; speechStarted = false
                // Flush and reset VAD immediately to clear pending audio
                vad?.flush?.(); vad?.reset?.()
                setTimeout(() => { cooldownRef.current = false; buffer?.reset(); setStatus('idle') }, 3000) }
              else { log('❌ 未匹配唤醒词'); speechStarted = false }
            }

            proc.onaudioprocess = (e) => {
              if (cooldownRef.current) return
              try {
                const s = new Float32Array(e.inputBuffer.getChannelData(0)); buffer.push(s)
                while (buffer.size() > vad.config.sileroVad.windowSize) {
                  const c = buffer.get(buffer.head(), vad.config.sileroVad.windowSize); vad.acceptWaveform(c); buffer.pop(vad.config.sileroVad.windowSize)
                  if (vad.isDetected() && !active) { active = true; log('🔊 VAD 检测到语音'); speechStarted = false }
                  if (!vad.isDetected() && active) { active = false; vad.flush?.() }
                  if (recognizer) {
                    while (!vad.isEmpty()) {
                      const seg = vad.front(); vad.pop()
                      if (seg.samples.length < 8000) continue
                      try {
                        const st = recognizer.createStream()
                        if (!st) continue
                        st.acceptWaveform(16000, seg.samples)
                        recognizer.decode(st)
                        const r = recognizer.getResult(st)
                        st.free?.()
                        const text = (r?.text || '').trim()
                        log('📝 ASR:', text ? `"${text}"` : '(empty result)')
                        if (text) processText(text)
                      } catch(e) { log('⚠️ ASR segment error:', e?.message) }
                    }
                  } else {
                    if (!speechStarted) { speechStarted = true; startWebSpeech() }
                  }
                }
              } catch(e) {}
            }
            source.connect(proc); proc.connect(ctx.destination)
            log('✅ Sherpa VAD 已就绪'); setStatus('idle'); return
          }
        } catch(e) { log('⚠️ Sherpa VAD 失败:', e?.message) }
      }

      // Energy gate fallback
      const a = ctx.createAnalyser(); a.fftSize = 256; a.smoothingTimeConstant = 0.8
      source.connect(a)
      const d = new Uint8Array(a.frequencyBinCount); let sf = 0, sil = 0
      const tick = () => {
        if (!enabled || cooldownRef.current) { requestAnimationFrame(tick); return }
        a.getByteFrequencyData(d)
        const avg = d.reduce((x, y) => x + y, 0) / d.length
        if (avg > 35) { sf++; sil = 0; if (sf > 20) { sf = 0; log('🔊 能量门控'); startWebSpeech() } }
        else { sil++; if (sil > 60) sf = 0 }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      log('✅ 能量门控已就绪'); setStatus('idle')
    } catch(e) { log('⚠️ 麦克风不可用:', e.message); setStatus('error') }
  }, [enabled, startWebSpeech, log])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close()
    recognitionRef.current?.abort()
  }, [])

  useEffect(() => { if (enabled) init(); return stop }, [enabled]) // eslint-disable-line
  return { status, stop }
}
