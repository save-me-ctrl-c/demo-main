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

export default function useWakeWord({ onWake, onSongDetected, enabled = true, lang = 'en-US' } = {}) {
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
        if (fuzzyMatch(text, words)) {
          log('✅ 唤醒成功！'); setStatus('woke'); onWake?.()
          cooldownRef.current = true; setTimeout(() => { cooldownRef.current = false; setStatus('idle') }, 3000)
        } else {
          // Check if it's a song name (substring first, then fuzzy)
          const t = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
          const tn = normalize(t)
          const match = KNOWN_SONGS.find(title => {
            const tnt = normalize(title)
            return tn.includes(tnt) || tnt.includes(tn) || similarity(tn, tnt) >= 0.7
          })
          if (match) {
            log('🎵 曲名识别 (Web Speech):', `"${match}"`)
            onSongDetected?.(match)
            cooldownRef.current = true; setTimeout(() => { cooldownRef.current = false; setStatus('idle') }, 3000)
          } else {
            log('❌ 未匹配')
          }
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

            // ── ASR rate limiting ──
            let lastAsrTime = 0
            let emptyStreak = 0           // consecutive empty ASR results
            const ASR_MIN_GAP_MS = 1500   // minimum gap between ASR calls
            const ASR_BACKOFF_MAX = 8000  // max backoff when getting empty results

            const processText = (text) => {
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

            proc.onaudioprocess = (e) => {
              if (cooldownRef.current) return
              try {
                const s = new Float32Array(e.inputBuffer.getChannelData(0)); buffer.push(s)
                while (buffer.size() > vad.config.sileroVad.windowSize) {
                  const c = buffer.get(buffer.head(), vad.config.sileroVad.windowSize); vad.acceptWaveform(c); buffer.pop(vad.config.sileroVad.windowSize)
                  if (vad.isDetected() && !active) { active = true; speechStarted = false }
                  if (!vad.isDetected() && active) { active = false; vad.flush?.() }
                  if (recognizer) {
                    // Rate-limit ASR: skip if too soon after last attempt
                    const now = Date.now()
                    const minGap = ASR_MIN_GAP_MS + Math.min(emptyStreak * 1000, ASR_BACKOFF_MAX - ASR_MIN_GAP_MS)
                    if (now - lastAsrTime < minGap) continue

                    while (!vad.isEmpty()) {
                      const seg = vad.front(); vad.pop()
                      if (seg.samples.length < 8000) continue
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
            source.connect(proc); proc.connect(ctx.destination)
            log('✅ Sherpa VAD 已就绪'); setStatus('idle'); return
          }
        } catch(e) { log('⚠️ Sherpa VAD 失败:', e?.message) }
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
