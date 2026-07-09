import { useState, useRef, useCallback, useEffect } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

// Known song titles for direct-match detection (lowercase)
const KNOWN_SONGS = [
  'funky lagos','nadeya','take some time','dance in the rain',
  'bootlickers house remix','gas and gravity','around the corner',
  'world fusion music','for you i\'ll go there',
  // Common ASR misheard versions of song titles
  'i will go for you','for you i will go','i will go',
]

// ======================= Wake Word Dictionary =======================
const WAKE_WORDS = [
  // Primary wake words
  'hey afrogo','hey afro go','hey afro','ok afro','ok afrogo','afro go',
  'hey assistant','wake up','start listening',
  // "hi xxx" activation patterns — casual greetings that wake the assistant
  'hi afrogo','hi afro go','hi afro','hi assistant','hi there',
  'hello afrogo','hello afro','hello assistant','hello there',
  'hey there','hey you','yo afrogo','yo afro',
  // Phonetic variants (ASR misrecognition)
  'hey afro co','hey afro goal','hey afro gold','hey afro coal',
  'hey after go','hey apple go','hey apple co',
  'ok afro co','okay afro','ok after go',
  'a fro go','a fro co','afro co','afro goal',
  'hey arrow go','hey arrow',
  'hi afro co','hi apple go','high afro','high afrogo',
]
const WAKE_WORDS_ZH = [
  '嘿助手','你好助手','唤醒','开始','嘿','助手',
  '嗨助手','嗨','你好','在吗','哈喽','哈啰',
  '嘿afrogo','嗨afrogo',
]

// High-priority short keywords — trigger if they appear anywhere in text
const SHORT_KW = ['afro', 'afrogo']

// Tiny wake words for micro-utterances (single syllables / short greetings)
const TINY_WAKE = ['hi', 'hey', 'hai', 'hay', 'hoi', 'yo', 'hola', 'sup']

// ======================= Fuzzy Matching Engine =======================

/**
 * Levenshtein edit distance — two-row memory-efficient implementation.
 * Handles insertions, deletions, and substitutions.
 */
function editDistance(a, b) {
  const m = a.length, n = b.length
  let prev = new Uint16Array(n + 1)
  let curr = new Uint16Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(curr[j - 1], prev[j], prev[j - 1])
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

/**
 * Similarity ratio in [0, 1].
 * 1.0 = strings are identical, 0.0 = completely different.
 */
function similarity(a, b) {
  if (!a || !b) return 0
  const d = editDistance(a, b)
  return 1 - d / Math.max(a.length, b.length, 1)
}

/**
 * Adaptive similarity threshold based on word length.
 * Shorter words require closer match; longer words allow more variation.
 */
function getThreshold(len) {
  if (len <= 2) return 1.0    // "hi", "ok" — must be exact
  if (len <= 3) return 0.75   // "hey", "afro" — allow ~1 char diff
  if (len <= 5) return 0.65   // "afrogo"
  if (len <= 8) return 0.55   // "heyafrogo"
  return 0.5                   // longer phrases
}

/** Strip non-alphanumeric chars, keep CJK */
function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '')
}

/**
 * Fuzzy match — checks if `text` approximately contains any wake word.
 *
 * Strategy (in order):
 *  1. Fast path — exact substring match for short keywords & wake words
 *  2. Sliding window + Levenshtein similarity over the cleaned text
 *  3. Token-level fallback — split original text by spaces,
 *     match each token independently (handles multi-word utterances)
 */
function fuzzyMatch(text, words) {
  const t = normalize(text)
  if (t.length < 2) return false

  // ── Fast path: short keywords ──
  for (const kw of SHORT_KW) {
    if (t.includes(kw)) return true
  }

  for (const w of words) {
    const c = normalize(w)
    if (c.length < 2) continue

    // ── Exact substring match ──
    if (t.includes(c)) return true

    // ── Sliding window fuzzy match ──
    // Slide a window over `t` with lengths around |c|,
    // comparing each window against the wake word via edit distance.
    const th = getThreshold(c.length)
    const minW = Math.max(c.length - 2, 2)
    const maxW = Math.min(c.length + 3, t.length)

    for (let win = minW; win <= maxW; win++) {
      for (let i = 0; i <= t.length - win; i++) {
        if (similarity(t.slice(i, i + win), c) >= th) return true
      }
    }
  }

  // ── Token-level fallback ──
  // Split the original text on whitespace so "hey afro co please"
  // yields tokens ["hey","afro","co","please"] and we match "afro" etc.
  const tokens = text.toLowerCase()
    .replace(/[^a-z0-9一-鿿\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)

  for (const token of tokens) {
    if (token.length < 2) continue
    for (const w of words) {
      const c = normalize(w)
      if (c.length < 2) continue
      const th = getThreshold(Math.max(token.length, c.length))
      if (similarity(token, c) >= th) return true
    }
  }

  return false
}

function fmtErr(e) {
  if (!e) return 'unknown error'
  if (typeof e === 'string') return e
  return e.message || e.error || e.reason || JSON.stringify(e).slice(0, 200)
}

export default function useWakeWord({ onWake, onSongDetected, enabled = true, isPlaying = false, lang = 'en-US' } = {}) {
  const [status, setStatus] = useState('loading')
  const audioCtxRef = useRef(null)
  const streamRef = useRef(null)
  const cooldownRef = useRef(false)
  const isPlayingRef = useRef(isPlaying)
  const recognitionRef = useRef(null)
  isPlayingRef.current = isPlaying
  const log = useCallback((...a) => console.log('%c[WakeWord]','color:#A455FC;font-weight:700',...a), [])

  // ── Voice mode: 'sherpa' (offline VAD+ASR) or 'webspeech' (energy gate + Web Speech) ──
  const [voiceMode, setVoiceMode] = useState(() => {
    try { return localStorage.getItem('afrogo_voice_mode') || 'sherpa' } catch { return 'sherpa' }
  })
  const voiceModeRef = useRef(voiceMode)
  voiceModeRef.current = voiceMode
  const restartRef = useRef(null) // set later when stop/init are defined

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
        if (fuzzyMatch(text, words)) {
          log('✅ 唤醒成功！'); setStatus('woke'); onWake?.()
          cooldownRef.current = true; setTimeout(() => { cooldownRef.current = false; setStatus('idle') }, 3000)
        } else {
          // Check if it's a song name (substring first, then fuzzy)
          const t = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
          const tn = normalize(t)
          let songMatched = false
          if (tn.length >= 2) {
            const match = KNOWN_SONGS.find(title => {
              const tnt = normalize(title)
              return tn.includes(tnt) || tnt.includes(tn) || similarity(tn, tnt) >= 0.7
            })
            if (match) {
              log('🎵 曲名识别 (Web Speech):', `"${match}"`)
              onSongDetected?.(match)
              cooldownRef.current = true
              setTimeout(() => { cooldownRef.current = false; setStatus('idle') }, 3000)
              songMatched = true
            }
          }
          if (!songMatched) log('❌ 未匹配')
        }
        recognitionRef.current = null
      }
      r.onerror = () => { recognitionRef.current = null }
      r.onend = () => setStatus('idle')
      r.start()
    } catch { setStatus('idle') }
  }, [lang, onWake, log])

  const init = useCallback(async () => {
    try {
      if (!navigator.mediaDevices) throw new Error('MediaDevices not available (requires HTTPS or localhost)')
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
          // ── Load ASR model (Moonshine v2) into MEMFS ──
          const hasAsrApi = !!M._SherpaOnnxCreateOfflineRecognizer
          const hasOfflineRec = typeof OfflineRecognizer !== 'undefined'
          log('🔍 ASR 检测:', `mode=${voiceModeRef.current} WASM=${hasWasm} VAD=${!!createVad} ASR_API=${hasAsrApi} OfflineRec=${hasOfflineRec}`)
          if (voiceModeRef.current === 'sherpa' && hasAsrApi && hasOfflineRec) {
            try {
              const MODEL_DIR = '/sherpa/models/sherpa-onnx-moonshine-tiny-en-quantized-2026-02-27/'
              const files = [
                ['tokens.txt', 'tokens.txt'],
                ['encoder_model.ort', 'moonshine-encoder.ort'],
                ['decoder_model_merged.ort', 'moonshine-merged-decoder.ort'],
              ]
              for (const [src, dst] of files) {
                const resp = await fetch(MODEL_DIR + src)
                if (resp.ok) {
                  try {
                    // Remove existing file first (errno 20 = file exists)
                    try { M.FS_unlink('/' + dst) } catch {}
                    M.FS_createDataFile('/', dst, new Uint8Array(await resp.arrayBuffer()), true, false, false)
                  } catch (fsErr) { if (!String(fsErr).includes('Errno')) throw fsErr }
                }
              }
              const asrConfig = {
                modelConfig: {
                  debug: 0,
                  tokens: './tokens.txt',
                  moonshine: { encoder: './moonshine-encoder.ort', mergedDecoder: './moonshine-merged-decoder.ort' },
                },
              }
              recognizer = new OfflineRecognizer(asrConfig, M)
              window.__afrogoAsr = recognizer // shared ref for useVoiceRecognition
              log('✅ Sherpa ASR (Moonshine v2) 已就绪')
            } catch (e) { log('⚠️ ASR 模型加载失败，使用 Web Speech 降级:', fmtErr(e)) }
          }

          // ── Create VAD ──
          const vad = createVad(M)
          if (vad && vad.handle) {
            const cap = 30 * 16000
            const buffer = { handle: M._SherpaOnnxCreateCircularBuffer(cap), M, push(s) { const p = this.M._malloc(s.length * 4); this.M.HEAPF32.set(s, p / 4); this.M._SherpaOnnxCircularBufferPush(this.handle, p, s.length); this.M._free(p) }, get(start, n) { const p = this.M._SherpaOnnxCircularBufferGet(this.handle, start, n); const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = this.M.HEAPF32[p / 4 + i]; this.M._SherpaOnnxCircularBufferFree(p); return o }, pop(n) { this.M._SherpaOnnxCircularBufferPop(this.handle, n) }, size() { return this.M._SherpaOnnxCircularBufferSize(this.handle) }, head() { return this.M._SherpaOnnxCircularBufferHead(this.handle) }, reset() { this.M._SherpaOnnxCircularBufferReset(this.handle) } }
            // Expose global flush for VoiceButton (safe: drain + reset VAD, skip buffer reset)
            window.__afrogoFlushVad = () => {
              vad?.flush?.()
              vad?.reset?.()
              while (buffer.size() > 0) buffer.pop(buffer.size())
            }
            const proc = ctx.createScriptProcessor(4096, 1, 1); let active = false
            let speechStarted = false

            // ── ASR rate limiting ──
            let lastAsrTime = 0
            let emptyStreak = 0           // consecutive empty ASR results
            const ASR_MIN_GAP_MS = 1500   // minimum gap between ASR calls
            const ASR_BACKOFF_MAX = 8000  // max backoff when getting empty results

            const processText = (text) => {
              // If VoiceButton is active in Sherpa mode, route text to it
              if (window.__afrogoVoiceCallback) {
                // Set cooldown FIRST (synchronous) before callback fires
                cooldownRef.current = true
                const cb = window.__afrogoVoiceCallback
                window.__afrogoVoiceCallback = null
                speechStarted = false
                vad?.flush?.(); vad?.reset?.()
                cb(text)
                setTimeout(() => { cooldownRef.current = false; buffer?.reset() }, 5000)
                return
              }
              // Short utterances: "hi", "hey" etc — fuzzy-match tiny wake words
              const clean = text.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '')
              if (clean.length <= 4) {
                const tinyMatch = TINY_WAKE.some(w => {
                  const nw = normalize(w)
                  if (clean === nw || clean.includes(nw)) return true
                  return similarity(clean, nw) >= getThreshold(Math.max(clean.length, nw.length))
                })
                if (tinyMatch) {
                  log('✅ 短词唤醒!'); setStatus('woke'); onWake?.()
                  cooldownRef.current = true; speechStarted = false
                  vad?.flush?.(); vad?.reset?.()
                  setTimeout(() => { cooldownRef.current = false; buffer?.reset(); setStatus('idle') }, 3000)
                  return
                }
              }
              const words = lang.startsWith('zh') ? [...WAKE_WORDS, ...WAKE_WORDS_ZH] : WAKE_WORDS
              if (fuzzyMatch(text, words)) {
                log('✅ 唤醒成功！'); setStatus('woke'); onWake?.()
                cooldownRef.current = true; speechStarted = false
                vad?.flush?.(); vad?.reset?.()
                setTimeout(() => { cooldownRef.current = false; buffer?.reset(); setStatus('idle') }, 3000)
                return
              }
              // ── Song title direct match ──
              // If it's not a wake word, check if user is saying a song name
              const t = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
              const tn = normalize(t)
              if (tn.length < 2) return  // skip empty/noise
              for (const title of KNOWN_SONGS) {
                const tnTitle = normalize(title)
                // 1. Substring check (handles "I will go for you. I will go." → contains "i will go for you")
                if (tn.includes(tnTitle) || tnTitle.includes(tn)) {
                  log('🎵 曲名识别:', `"${title}"`)
                  onSongDetected?.(title)
                  cooldownRef.current = true; speechStarted = false
                  vad?.flush?.(); vad?.reset?.()
                  setTimeout(() => { cooldownRef.current = false; buffer?.reset(); setStatus('idle') }, 3000)
                  return
                }
                // 2. Fuzzy similarity fallback
                const sim = similarity(tn, tnTitle)
                if (sim >= 0.7) {
                  log('🎵 曲名识别:', `"${title}"`, `(sim:${sim.toFixed(2)})`)
                  onSongDetected?.(title)
                  cooldownRef.current = true; speechStarted = false
                  vad?.flush?.(); vad?.reset?.()
                  setTimeout(() => { cooldownRef.current = false; buffer?.reset(); setStatus('idle') }, 3000)
                  return
                }
              }
            }

            // RMS helper for energy gating
            const rms = (arr) => { let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i] * arr[i]; return Math.sqrt(s / arr.length) }
            const ENERGY_FLOOR = 0.008 // below this = silence/noise, skip VAD

            proc.onaudioprocess = (e) => {
              if (cooldownRef.current) return
              try {
                const s = new Float32Array(e.inputBuffer.getChannelData(0)); buffer.push(s)
                while (buffer.size() > vad.config.sileroVad.windowSize) {
                  const c = buffer.get(buffer.head(), vad.config.sileroVad.windowSize)
                  const energy = rms(c)
                  buffer.pop(vad.config.sileroVad.windowSize)

                  // Energy gate: skip VAD processing for low-energy frames
                  if (energy < ENERGY_FLOOR) {
                    if (active) { active = false; vad.flush?.() }
                    continue
                  }

                  vad.acceptWaveform(c)
                  if (vad.isDetected() && !active) { active = true; speechStarted = false }
                  if (!vad.isDetected() && active) { active = false; vad.flush?.() }
                  if (recognizer) {
                    // Rate-limit ASR: skip if too soon after last attempt
                    const now = Date.now()
                    const minGap = ASR_MIN_GAP_MS + Math.min(emptyStreak * 1000, ASR_BACKOFF_MAX - ASR_MIN_GAP_MS)
                    if (now - lastAsrTime < minGap) continue

                    while (!vad.isEmpty()) {
                      const seg = vad.front(); vad.pop()
                      if (seg.samples.length < 3000) continue // min 0.18s — was 8000 (0.5s), too strict
                      try {
                        lastAsrTime = now
                        const st = recognizer.createStream()
                        if (!st) continue
                        st.acceptWaveform(16000, seg.samples)
                        recognizer.decode(st)
                        const r = recognizer.getResult(st)
                        st.free?.()
                        const text = (r?.text || '').trim()
                        if (text) {
                          emptyStreak = 0 // reset backoff on meaningful result
                          log('📝 ASR:', `"${text}"`)
                          processText(text)
                        } else {
                          emptyStreak++ // increase backoff for empty noise
                        }
                        // Only log first VAD of a session, then be quiet
                        if (active && emptyStreak === 0) log('🔊 语音检测中...')
                      } catch(e) { /* silent */ }
                    }
                  } else {
                    if (!speechStarted) { speechStarted = true; startWebSpeech() }
                  }
                }
              } catch(e) {}
            }
            const silenceGain = ctx.createGain()
            silenceGain.gain.value = 0
            source.connect(proc)
            proc.connect(silenceGain)
            silenceGain.connect(ctx.destination)
            log('✅ Sherpa VAD 已就绪'); setStatus('idle'); return
          }
        } catch(e) { log('⚠️ Sherpa VAD 初始化失败，回退能量门控:', fmtErr(e)) }
      }

      // Energy gate fallback (with rate limiting)
      const a = ctx.createAnalyser(); a.fftSize = 256; a.smoothingTimeConstant = 0.8
      source.connect(a)
      const d = new Uint8Array(a.frequencyBinCount); let sf = 0, sil = 0
      let lastGateTrigger = 0
      const GATE_COOLDOWN = 4000 // minimum ms between energy gate triggers
      const tick = () => {
        if (!enabled || cooldownRef.current) { requestAnimationFrame(tick); return }
        a.getByteFrequencyData(d)
        const avg = d.reduce((x, y) => x + y, 0) / d.length
        if (avg > 35) { sf++; sil = 0; if (sf > 20 && Date.now() - lastGateTrigger > GATE_COOLDOWN) { sf = 0; lastGateTrigger = Date.now(); log('🔊 能量门控'); startWebSpeech() } }
        else { sil++; if (sil > 60) sf = 0 }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      log('✅ 能量门控已就绪'); setStatus('idle')
    } catch(e) { log('⚠️ 麦克风不可用:', fmtErr(e)); setStatus('error') }
  }, [enabled, startWebSpeech, log])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close()
    recognitionRef.current?.abort()
    window.__afrogoAsr = null
  }, [])

  // ── Voice mode switch (after stop/init defined) ──
  const switchVoiceMode = useCallback((mode) => {
    setVoiceMode(mode)
    try { localStorage.setItem('afrogo_voice_mode', mode) } catch {}
    log(`🎤 语音方案已切换: ${mode === 'sherpa' ? 'Sherpa VAD+ASR (离线)' : 'Web Speech (在线)'}`)
    stop()
    setTimeout(() => { if (enabled) init() }, 200)
  }, [log, stop, enabled, init])

  // Expose console command
  useEffect(() => {
    window.afrogoVoice = (mode) => {
      if (mode === 'sherpa' || mode === 'webspeech') {
        switchVoiceMode(mode)
      } else {
        console.log('%c[AfroGo] %c用法: afrogoVoice("sherpa") 或 afrogoVoice("webspeech")',
          'color:#A455FC;font-weight:700', 'color:inherit')
        console.log('%c[AfroGo] %c当前:', 'color:#A455FC;font-weight:700', 'color:inherit',
          voiceModeRef.current === 'sherpa' ? 'Sherpa VAD+ASR (离线)' : 'Web Speech (在线)')
      }
    }
    return () => { delete window.afrogoVoice }
  }, [switchVoiceMode])

  // Pause wake word detection while music is playing (no init/stop, just cooldown)
  useEffect(() => {
    if (isPlaying) {
      cooldownRef.current = true
    } else {
      cooldownRef.current = false
    }
  }, [isPlaying])

  useEffect(() => {
    if (enabled) {
      cooldownRef.current = true
      const t = setTimeout(() => {
        if (!isPlayingRef.current) cooldownRef.current = false
      }, 500) // just enough for AudioContext init
      init()
      return () => clearTimeout(t)
    }
    return () => { stop(); cooldownRef.current = false }
  }, [enabled]) // eslint-disable-line
  return { status, stop }
}
