import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Music, Gauge } from './Icon'
import { useT } from '../i18n/LanguageContext'
import Portal from './Portal'
import {
  calculatePoseScore, normalizeLandmarks, getRefShoulderWidth,
  findClosestRefFrame, computeRhythmScore, computeFusionScore,
  evaluateCombo, createComboState, computeEnergyLevel,
  SKELETON_CONNECTIONS, SKELETON_JOINTS,
} from '../services/danceScoring'
import {
  loadMediaPipe, startPoseCamera, stopPoseCamera,
  createPoseTracker,
  startRecording, stopRecording, isRecording, getRecordingElapsed,
  cacheLandmarks,
} from '../services/poseRecorder'
import { openDB, saveTrack, loadTrack, listTracks, deleteTrack } from '../services/poseDB'
import './DanceScore.css'

const COUNTDOWN_SECONDS = 3

function drawHead(ctx, landmarks, project, color) {
  const facePoints = [0, 2, 5, 7, 8]
    .map(index => landmarks[index])
    .filter(point => point && (point.visibility ?? 1) >= 0.35)
    .map(project)
  if (facePoints.length < 2) return

  const leftShoulder = landmarks[11] && project(landmarks[11])
  const rightShoulder = landmarks[12] && project(landmarks[12])
  const minX = Math.min(...facePoints.map(point => point.x))
  const maxX = Math.max(...facePoints.map(point => point.x))
  const shoulderWidth = leftShoulder && rightShoulder
    ? Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y)
    : 0
  const radius = Math.max(11, (maxX - minX) * 0.72, shoulderWidth * 0.17)
  const centerX = facePoints.reduce((sum, point) => sum + point.x, 0) / facePoints.length
  const centerY = facePoints.reduce((sum, point) => sum + point.y, 0) / facePoints.length - radius * 0.12

  ctx.save()
  ctx.lineWidth = 3
  ctx.strokeStyle = color
  ctx.fillStyle = 'rgba(10, 14, 20, 0.5)'
  ctx.shadowColor = color
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

export default function DanceScore({ onClose, currentSong, isPlaying }) {
  const { t } = useT()

  // ── State machine ──
  const [panelState, setPanelState] = useState('loading') // loading | error | idle | selecting | ready | scoring | results
  const [errorMsg, setErrorMsg] = useState('')

  // ── MediaPipe + Camera refs ──
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const referenceCanvasRef = useRef(null)
  const streamRef = useRef(null)
  const trackerRef = useRef(null)
  const animFrameRef = useRef(null)
  const audioRef = useRef(null)

  // ── Scoring state ──
  const [score, setScore] = useState(0)
  const [comboState, setComboState] = useState(createComboState())
  const [energyLevel, setEnergyLevel] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [celebrations, setCelebrations] = useState([])
  const scoreStartRef = useRef(0)
  const peopleScoringRef = useRef(new Map())
  const celebrationTimersRef = useRef(new Set())

  // ── Reference track ──
  const [refTrack, setRefTrack] = useState(null)
  const [refTracks, setRefTracks] = useState([])
  const [refShoulderW, setRefShoulderW] = useState(0.28)
  const [loadingTrackId, setLoadingTrackId] = useState(null) // track being fetched
  const [scoringMode, setScoringMode] = useState(null) // null | 'live' | 'upload'

  // ── Video upload scoring state ──
  const [uploadProgress, setUploadProgress] = useState(0) // 0-100
  const [uploadStatus, setUploadStatus] = useState('') // processing text
  const uploadVideoRef = useRef(null)

  // ── Countdown ──
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)

  // ── Results ──
  const [results, setResults] = useState(null)

  // ── Recording reference ──
  const [recordingRef, setRecordingRef] = useState(false)
  const [recElapsed, setRecElapsed] = useState(0)
  const recIntervalRef = useRef(null)

  // ── Initialize: load tracks + MediaPipe model only (no camera yet) ──
  useEffect(() => {
    async function init() {
      // Step 1: Load reference tracks (no camera needed)
      await loadRefTracks().catch(() => {})

      // Step 2: Load MediaPipe Pose model (no camera, just the model)
      try {
        await loadMediaPipe()
        if (!window.Pose) throw new Error('MediaPipe Pose not available')
      } catch (mpErr) {
        console.error('MediaPipe load error:', mpErr)
        setErrorMsg(t('score_model_failed'))
        setPanelState('error')
        return
      }

      // Step 3: Show track selector — user picks a dance first
      setPanelState('selecting')
    }

    init()

    return () => {
      if (trackerRef.current) trackerRef.current.stop()
      if (streamRef.current) stopPoseCamera(streamRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (recIntervalRef.current) clearInterval(recIntervalRef.current)
      celebrationTimersRef.current.forEach(timer => clearTimeout(timer))
      celebrationTimersRef.current.clear()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load reference tracks ──
  const loadRefTracks = useCallback(async () => {
    // Bundled tracks that ship with the app (fetched on selection)
    const BUNDLED = [
      {
        id: 'amapiano_tutorial',
        title: 'Amapiano',
        danceStyle: 'Amapiano',
        duration_ms: 78000,
        fps: 15,
        frameCount: 1171,
        isBundled: true,
      },
    ]

    try {
      const saved = await listTracks()
      setRefTracks([
        ...BUNDLED,
        ...saved.filter(t => t.id !== 'amapiano_tutorial'),
      ])
    } catch {
      setRefTracks([...BUNDLED])
    }
  }, [])

  // ── Select a reference track ──
  const selectRefTrack = useCallback(async (trackMeta) => {
    setLoadingTrackId(trackMeta.id)
    setErrorMsg('')
    try {
      let fullTrack
      if (trackMeta.isBundled) {
        // Fetch bundled track from public/ directory
        const url = `/pose-extractor/amapiano_tutorial_pose.json`
        const resp = await fetch(url)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        fullTrack = await resp.json()
        // Use the bundled ID so duplicates are filtered on next load
        fullTrack.id = trackMeta.id
        // Cache to IndexedDB so it loads instantly next time
        try { await saveTrack(fullTrack) } catch {}
      } else {
        fullTrack = await loadTrack(trackMeta.id)
      }
      if (fullTrack) {
        setRefTrack(fullTrack)
        setRefShoulderW(getRefShoulderWidth(fullTrack))
        setScoringMode(null)
        setPanelState('modeSelect')
      }
    } catch (err) {
      console.error('Failed to load reference track:', err)
      setErrorMsg('Failed to load "' + trackMeta.title + '": ' + (err.message || 'unknown error'))
    } finally {
      setLoadingTrackId(null)
    }
  }, [])

  // ── Import track from file ──
  const fileInputRef = useRef(null)

  const handleImportTrack = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelected = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const track = JSON.parse(text)

      // Basic validation
      if (!track.id || !track.frames || !Array.isArray(track.frames) || track.frames.length === 0) {
        alert('Invalid track file: missing id or frames array.')
        return
      }
      if (!track.frames[0].landmarks || track.frames[0].landmarks.length < 33) {
        alert('Invalid track file: expected 33 MediaPipe landmarks per frame.')
        return
      }

      // Fill in missing fields with defaults
      if (!track.duration_ms) track.duration_ms = track.frames[track.frames.length - 1]?.timestamp_ms || 0
      if (!track.fps) track.fps = 15
      if (!track.frameCount) track.frameCount = track.frames.length
      if (!track.createdAt) track.createdAt = Date.now()
      if (!track.source) track.source = 'imported_from_file'

      // Save to IndexedDB
      await saveTrack(track)
      await loadRefTracks()
      // Auto-select the imported track
      await selectRefTrack(track)

      setPanelState('idle')
    } catch (err) {
      console.error('Import track error:', err)
      alert('Failed to import track: ' + err.message)
    }

    // Reset input
    e.target.value = ''
  }, [loadRefTracks, selectRefTrack])

  // ── Skeleton drawing on canvas ──
  const drawSkeleton = useCallback((people) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    const sourceW = video.videoWidth || 640
    const sourceH = video.videoHeight || 480
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || sourceW
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || sourceH
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

    if (canvas.width !== Math.round(w * pixelRatio) || canvas.height !== Math.round(h * pixelRatio)) {
      canvas.width = Math.round(w * pixelRatio)
      canvas.height = Math.round(h * pixelRatio)
    }

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // Match the video's object-fit: cover crop, then mirror the front camera.
    const coverScale = Math.max(w / sourceW, h / sourceH)
    const renderedW = sourceW * coverScale
    const renderedH = sourceH * coverScale
    const offsetX = (w - renderedW) / 2
    const offsetY = (h - renderedH) / 2
    const project = point => ({
      x: w - (point.x * renderedW + offsetX),
      y: point.y * renderedH + offsetY,
    })

    const palette = [
      ['#00E676', 'rgba(0, 230, 118, 0.6)'],
      ['#FFB703', 'rgba(255, 183, 3, 0.6)'],
      ['#42A5F5', 'rgba(66, 165, 245, 0.6)'],
      ['#FF5C8A', 'rgba(255, 92, 138, 0.6)'],
    ]

    for (const person of people || []) {
      const landmarks = person.landmarks
      if (!landmarks || landmarks.length < 33) continue
      const [color, glow] = palette[(person.id - 1) % palette.length]
      ctx.globalAlpha = person.stale ? 0.35 : 1
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.shadowColor = glow
      ctx.shadowBlur = 8
      ctx.lineCap = 'round'

      for (const [from, to] of SKELETON_CONNECTIONS) {
        const a = landmarks[from]
        const b = landmarks[to]
        if (!a || !b) continue
        if ((a.visibility != null && a.visibility < 0.4) || (b.visibility != null && b.visibility < 0.4)) continue
        const projectedA = project(a)
        const projectedB = project(b)
        ctx.beginPath()
        ctx.moveTo(projectedA.x, projectedA.y)
        ctx.lineTo(projectedB.x, projectedB.y)
        ctx.stroke()
      }

      ctx.shadowBlur = 6
      for (const idx of SKELETON_JOINTS) {
        const point = landmarks[idx]
        if (!point || (point.visibility != null && point.visibility < 0.4)) continue
        const projected = project(point)
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(projected.x, projected.y, 4, 0, Math.PI * 2)
        ctx.fill()
      }
      drawHead(ctx, landmarks, project, color)
    }

    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
  }, [])

  const drawReferenceSkeleton = useCallback((landmarks) => {
    const canvas = referenceCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 320
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 480
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== Math.round(w * pixelRatio) || canvas.height !== Math.round(h * pixelRatio)) {
      canvas.width = Math.round(w * pixelRatio)
      canvas.height = Math.round(h * pixelRatio)
    }
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    ctx.clearRect(0, 0, w, h)
    if (!landmarks || landmarks.length < 33) return

    const sourceW = 4
    const sourceH = 3
    const containScale = Math.min(w / sourceW, h / sourceH)
    const renderedW = sourceW * containScale
    const renderedH = sourceH * containScale
    const offsetX = (w - renderedW) / 2
    const offsetY = (h - renderedH) / 2
    const project = point => ({
      x: w - (point.x * renderedW + offsetX),
      y: point.y * renderedH + offsetY,
    })

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 4
    ctx.strokeStyle = '#37E6C4'
    ctx.shadowColor = 'rgba(55, 230, 196, 0.55)'
    ctx.shadowBlur = 10
    for (const [from, to] of SKELETON_CONNECTIONS) {
      const a = landmarks[from]
      const b = landmarks[to]
      if (!a || !b || (a.visibility ?? 1) < 0.35 || (b.visibility ?? 1) < 0.35) continue
      const projectedA = project(a)
      const projectedB = project(b)
      ctx.beginPath()
      ctx.moveTo(projectedA.x, projectedA.y)
      ctx.lineTo(projectedB.x, projectedB.y)
      ctx.stroke()
    }

    ctx.shadowBlur = 7
    for (const index of SKELETON_JOINTS) {
      const point = landmarks[index]
      if (!point || (point.visibility ?? 1) < 0.35) continue
      const projected = project(point)
      ctx.fillStyle = '#F7FFFD'
      ctx.beginPath()
      ctx.arc(projected.x, projected.y, 4.5, 0, Math.PI * 2)
      ctx.fill()
    }
    drawHead(ctx, landmarks, project, '#37E6C4')
    ctx.shadowBlur = 0
  }, [])

  useEffect(() => {
    drawReferenceSkeleton(refTrack?.frames?.[0]?.landmarks || null)
  }, [refTrack, drawReferenceSkeleton])

  const triggerCelebration = useCallback((frameScore) => {
    const tier = frameScore >= 0.94 ? 'perfect' : frameScore >= 0.86 ? 'great' : 'good'
    const id = `${tier}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const celebration = {
      id,
      tier,
      label: tier.toUpperCase(),
      score: Math.round(frameScore * 100),
      bursts: Array.from({ length: 6 }, (_, index) => ({
        x: 8 + (index % 3) * 42 + Math.random() * 12,
        y: 16 + Math.floor(index / 3) * 52 + Math.random() * 14,
      })),
    }
    setCelebrations(current => [...current.slice(-1), celebration])
    const timer = setTimeout(() => {
      setCelebrations(current => current.filter(item => item.id !== id))
      celebrationTimersRef.current.delete(timer)
    }, 1700)
    celebrationTimersRef.current.add(timer)
  }, [])

  // ── Scoring loop ──
  const scoringLoop = useCallback((people, timestamp) => {
    if (!refTrack || !refTrack.frames || refTrack.frames.length === 0) return

    const now = timestamp || Date.now()
    if (!scoreStartRef.current) scoreStartRef.current = now
    const elapsed = now - scoreStartRef.current
    setElapsedMs(elapsed)

    // Find reference frame
    const refFrame = findClosestRefFrame(refTrack.frames, elapsed)
    if (!refFrame) return
    drawReferenceSkeleton(refFrame.landmarks)

    const refWindow = refTrack.frames.filter(
      f => f.timestamp_ms >= Math.max(0, elapsed - 1000) && f.timestamp_ms <= elapsed
    )
    const detectedIds = new Set((people || []).filter(person => !person.stale).map(person => person.id))

    for (const person of people || []) {
      if (person.stale) continue
      const landmarks = person.landmarks
      if (person.reset) peopleScoringRef.current.delete(person.id)
      let state = peopleScoringRef.current.get(person.id)
      if (!state) {
        state = {
          frames: [], prevLandmarks: null, combo: createComboState(), result: null,
          matchFrames: 0, lastCelebration: 0,
        }
        peopleScoringRef.current.set(person.id, state)
      }

      const normalizedUser = normalizeLandmarks(landmarks, refShoulderW)
      const frameScore = calculatePoseScore(normalizedUser, refFrame.landmarks)
      state.matchFrames = frameScore >= 0.78 ? (state.matchFrames || 0) + 1 : 0
      if (state.matchFrames >= 3 && now - (state.lastCelebration || 0) >= 1600) {
        state.lastCelebration = now
        state.matchFrames = 0
        triggerCelebration(frameScore)
      }
      state.frames.push({ landmarks, timestamp_ms: elapsed })
      if (state.frames.length > 90) state.frames.shift()
      const rhythmScore = computeRhythmScore(
        state.frames.slice(-30),
        refWindow.length > 0 ? refWindow : refTrack.frames.slice(0, 30),
      )
      const fusion = computeFusionScore(frameScore, rhythmScore)
      const newCombo = evaluateCombo(frameScore, state.combo)
      newCombo.maxCombo = Math.max(newCombo.maxCombo, newCombo.comboCounter)
      const energy = computeEnergyLevel(landmarks, state.prevLandmarks)
      state.prevLandmarks = landmarks
      state.combo = newCombo
      state.result = {
        id: person.id,
        overall: fusion.overall,
        poseScore: fusion.poseScore,
        rhythmScore: fusion.rhythmScore,
        grade: fusion.grade,
        gradeLabel: fusion.gradeLabel,
        maxCombo: newCombo.maxCombo,
        comboLevel: newCombo.level,
        energy,
        durationMs: elapsed,
      }
    }

    const activeResults = [...peopleScoringRef.current.values()]
      .filter(state => detectedIds.has(state.result?.id))
      .map(state => state.result)
      .sort((a, b) => a.id - b.id)
    if (!activeResults.length) return

    const participantResults = [...peopleScoringRef.current.values()]
      .map(state => state.result)
      .filter(Boolean)
      .sort((a, b) => a.id - b.id)
    const average = key => participantResults.reduce((sum, result) => sum + result[key], 0) / participantResults.length
    const overall = Math.round(average('overall'))
    const teamFusion = computeFusionScore(average('poseScore') / 100, average('rhythmScore') / 100)
    const leader = participantResults.reduce((best, result) => result.overall > best.overall ? result : best)
    const leaderCombo = peopleScoringRef.current.get(leader.id).combo
    setScore(overall)
    setComboState(leaderCombo)
    setEnergyLevel(average('energy'))
    if (leaderCombo.breakFrame) setFeedback(t('score_combo_break'))
    else if (leaderCombo.consecutiveGood === 5) setFeedback(t('score_combo_great'))
    else if (leaderCombo.consecutiveGood === 15) setFeedback(t('score_combo_super'))
    else if (leaderCombo.consecutiveGood === 30) setFeedback(t('score_combo_fire'))
    setResults({
      ...teamFusion,
      overall,
      maxCombo: Math.max(...participantResults.map(result => result.maxCombo)),
      durationMs: elapsed,
      participants: participantResults,
    })
  }, [refTrack, refShoulderW, t, drawReferenceSkeleton, triggerCelebration])

  // ── Start scoring ──
  const handleStartScoring = useCallback(() => {
    if (!refTrack) {
      setPanelState('selecting')
      return
    }

    // Reset state
    setScore(0)
    setComboState(createComboState())
    setEnergyLevel(0)
    setFeedback('')
    setElapsedMs(0)
    setCelebrations([])
    scoreStartRef.current = 0
    peopleScoringRef.current = new Map()
    setResults(null)

    // Start countdown
    setPanelState('ready')
    setCountdown(COUNTDOWN_SECONDS)
    let cd = COUNTDOWN_SECONDS
    const cdInterval = setInterval(() => {
      cd--
      setCountdown(cd)
      if (cd <= 0) {
        clearInterval(cdInterval)
        setPanelState('scoring')
        scoreStartRef.current = Date.now()

        // Play audio for bundled tracks that have music
        if (refTrack?.id === 'amapiano_tutorial' && audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
        }

        // Swap tracker callback to scoring loop
        if (trackerRef.current) trackerRef.current.stop()
        if (videoRef.current) {
          const tracker = createPoseTracker(videoRef.current, (people, timestamp) => {
            cacheLandmarks(people[0]?.landmarks || null)
            drawSkeleton(people)
            scoringLoop(people, timestamp)
          })
          trackerRef.current = tracker
          tracker.start()
        }
      }
    }, 800)
  }, [refTrack, drawSkeleton, scoringLoop])

  // ── Stop scoring ──
  const handleStopScoring = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    if (trackerRef.current) trackerRef.current.stop()

    // Swap back to idle tracker
    if (videoRef.current) {
      const tracker = createPoseTracker(videoRef.current, (people) => {
        cacheLandmarks(people[0]?.landmarks || null)
        drawSkeleton(people)
      })
      trackerRef.current = tracker
      tracker.start()
    }

    setPanelState('results')
  }, [drawSkeleton])

  // ── Retry ──
  const handleRetry = useCallback(() => {
    setResults(null)
    setScore(0)
    setComboState(createComboState())
    setScoringMode(null)
    // If live mode was used, stop the tracker (keep camera stream for reuse)
    if (trackerRef.current && scoringMode === 'live') {
      trackerRef.current.stop()
    }
    setPanelState('modeSelect')
  }, [scoringMode])

  // ── Mode selection handlers ──
  const handleSelectLive = useCallback(async () => {
    setScoringMode('live')
    setErrorMsg('')

    // Start camera now (lazy — only when user chooses live mode)
    try {
      if (videoRef.current && !streamRef.current) {
        const stream = await startPoseCamera(videoRef.current)
        streamRef.current = stream
      }
    } catch (camErr) {
      console.error('Camera error:', camErr)
      const msg = (camErr.message || '')
      if (msg.includes('CAM_PERMISSION_DENIED')) {
        setErrorMsg('摄像头权限被拒绝，请在浏览器设置中允许摄像头访问后重试')
      } else if (msg.includes('CAM_NOT_FOUND')) {
        setErrorMsg('未检测到摄像头设备')
      } else if (msg.includes('CAM_IN_USE')) {
        setErrorMsg('摄像头被其他应用占用')
      } else if (msg.includes('CAM_HTTPS_REQUIRED')) {
        setErrorMsg('需要 HTTPS 或 localhost')
      } else {
        setErrorMsg('摄像头错误：' + msg.replace('CAM_ERROR:', ''))
      }
      return
    }

    // Start idle pose tracker
    if (videoRef.current) {
      if (trackerRef.current) trackerRef.current.stop()
      const tracker = createPoseTracker(videoRef.current, (people) => {
        cacheLandmarks(people[0]?.landmarks || null)
        drawSkeleton(people)
      })
      trackerRef.current = tracker
      tracker.start()
    }

    setPanelState('idle')
  }, [drawSkeleton])

  const handleSelectUpload = useCallback(() => {
    setScoringMode('upload')
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'video/*'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (file) processUploadRef.current(file)
    }
    input.click()
  }, [])

  // ── Process uploaded video frame by frame ──
  const processUploadedVideo = useCallback(async (file) => {
    if (!refTrack) {
      setErrorMsg('Please select a dance first')
      setPanelState('modeSelect')
      return
    }

    setPanelState('uploading')
    setUploadProgress(0)
    setUploadStatus('Loading video...')
    setScore(0)
    setResults(null)

    // Create video element (must be in DOM for MediaPipe)
    const videoEl = document.createElement('video')
    videoEl.muted = true
    videoEl.playsInline = true
    videoEl.crossOrigin = 'anonymous'
    videoEl.style.position = 'absolute'
    videoEl.style.opacity = '0'
    videoEl.style.pointerEvents = 'none'
    videoEl.style.width = '640px'
    videoEl.style.height = '480px'
    document.body.appendChild(videoEl)

    try {
      const url = URL.createObjectURL(file)
      videoEl.src = url

      await new Promise((resolve, reject) => {
        videoEl.onloadedmetadata = resolve
        videoEl.onerror = () => reject(new Error('Failed to load video'))
      })

      const videoDuration = videoEl.duration
      const fps = refTrack.fps || 15
      const frameInterval = 1 / fps
      const totalFrames = Math.min(
        Math.floor(videoDuration / frameInterval),
        refTrack.frames.length
      )

      if (totalFrames === 0) throw new Error('Video too short or reference track empty')

      setUploadStatus(`Extracting poses... 0/${totalFrames}`)

      const Pose = window.Pose
      if (!Pose) throw new Error('MediaPipe not loaded')

      const poseInstance = new Pose({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${f}`,
      })
      poseInstance.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })

      // Process each frame
      const allFrames = []
      let totalPoseScore = 0
      let validFrames = 0
      let comboStateLocal = createComboState()

      for (let i = 0; i < totalFrames; i++) {
        const seekTime = i * frameInterval
        const timestampMs = Math.round(seekTime * 1000)

        // Seek to frame
        videoEl.currentTime = seekTime
        await new Promise(r => { videoEl.onseeked = r })

        // Extract landmarks
        const landmarks = await new Promise((resolve) => {
          poseInstance.onResults((results) => {
            if (results.poseLandmarks) {
              resolve(results.poseLandmarks.map(lm => ({
                x: lm.x, y: lm.y, z: lm.z,
                visibility: lm.visibility != null ? lm.visibility : 1.0,
              })))
            } else {
              resolve(null)
            }
          })
          poseInstance.send({ image: videoEl })
        })

        if (landmarks && landmarks.length >= 33) {
          const refFrame = findClosestRefFrame(refTrack.frames, timestampMs)
          if (refFrame) {
            const normalized = normalizeLandmarks(landmarks, refShoulderW)
            const frameScore = calculatePoseScore(normalized, refFrame.landmarks)
            totalPoseScore += frameScore
            validFrames++
            allFrames.push({ landmarks, timestamp_ms: timestampMs })
            comboStateLocal = evaluateCombo(frameScore, comboStateLocal)
            if (comboStateLocal.comboCounter > comboStateLocal.maxCombo) {
              comboStateLocal.maxCombo = comboStateLocal.comboCounter
            }
          }
        }

        if (i % 15 === 0 || i === totalFrames - 1) {
          const pct = Math.round(((i + 1) / totalFrames) * 100)
          setUploadProgress(pct)
          setUploadStatus(`${i + 1}/${totalFrames} frames (${validFrames} poses)`)
        }
      }

      poseInstance.close()
      URL.revokeObjectURL(url)
      document.body.removeChild(videoEl)

      const avgPoseScore = validFrames > 0 ? totalPoseScore / validFrames : 0
      const rhythmScore = allFrames.length >= 3
        ? computeRhythmScore(allFrames, refTrack.frames)
        : 0.3
      const fusion = computeFusionScore(avgPoseScore, rhythmScore)

      setResults({
        overall: fusion.overall,
        poseScore: Math.round(avgPoseScore * 100),
        rhythmScore: Math.round(rhythmScore * 100),
        grade: fusion.grade,
        gradeLabel: fusion.gradeLabel,
        maxCombo: comboStateLocal.maxCombo,
        comboLevel: comboStateLocal.level,
        durationMs: allFrames.length > 0 ? allFrames[allFrames.length - 1].timestamp_ms : 0,
      })
      setUploadProgress(100)
      setPanelState('results')
    } catch (err) {
      console.error('Video processing error:', err)
      if (videoEl.parentNode) document.body.removeChild(videoEl)
      setErrorMsg('视频处理失败：' + (err.message || '未知错误'))
      setPanelState('error')
    }
  }, [refTrack, refShoulderW])

  // Use ref so handleSelectUpload always gets the latest processUploadedVideo
  const processUploadRef = useRef(processUploadedVideo)
  processUploadRef.current = processUploadedVideo

  // ── Record reference track ──
  const handleStartRecordRef = useCallback(() => {
    setRecordingRef(true)
    setRecElapsed(0)
    startRecording(30)
    const startTime = Date.now()
    recIntervalRef.current = setInterval(() => {
      setRecElapsed(Date.now() - startTime)
    }, 200)
  }, [])

  const handleStopRecordRef = useCallback(async () => {
    const trackData = stopRecording()
    setRecordingRef(false)
    if (recIntervalRef.current) { clearInterval(recIntervalRef.current); recIntervalRef.current = null }

    if (trackData.frames.length < 10) {
      alert('Recording too short. Please record at least 10 frames.')
      return
    }

    const track = {
      id: 'rec_' + Date.now().toString(36),
      title: `Reference ${new Date().toLocaleTimeString()}`,
      danceStyle: 'Custom',
      duration_ms: trackData.duration_ms,
      fps: trackData.fps,
      frames: trackData.frames,
      frameCount: trackData.frames.length,
      createdAt: Date.now(),
    }

    try {
      await saveTrack(track)
      await loadRefTracks()
      setRefTrack(track)
      setRefShoulderW(getRefShoulderWidth(track))
    } catch (err) {
      console.warn('Failed to save reference track:', err)
    }
  }, [loadRefTracks])

  // ── Render helpers ──
  const comboLevelLabel = () => {
    const map = { great: t('score_combo_great'), super: t('score_combo_super'), fire: t('score_combo_fire') }
    return comboState.level !== 'none' ? map[comboState.level] || '' : ''
  }

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000)
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  // ── Render ──
  return (
    <Portal>
      <div className="full-panel ds-panel">
        {/* Header */}
        <div className="ds-header">
          <button className="panel-back" onClick={() => {
            if (trackerRef.current) trackerRef.current.stop()
            if (streamRef.current) stopPoseCamera(streamRef.current)
            onClose()
          }}><X size={22} /></button>
          <span className="ds-title">{t('score_title')}</span>
          <span className="ds-timer">
            {panelState === 'scoring' ? formatTime(elapsedMs) : '00:00'}
          </span>
          {currentSong && (
            <span className="ds-song-name" title={`${currentSong.title} — ${currentSong.artist}`}>
              🎵 {currentSong.title}
            </span>
          )}
        </div>

        {/* Camera + Canvas area */}
        <div className="ds-camera-wrap">
          <div className="ds-reference-pane">
            <canvas ref={referenceCanvasRef} className="ds-reference-canvas" />
            <span className="ds-pane-label">{t('score_reference_pose')}</span>
          </div>
          <div className="ds-user-pane">
            <video ref={videoRef} className="ds-cam-feed" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="ds-skeleton-canvas" />
            <span className="ds-pane-label">{t('score_player_pose')}</span>
          </div>
          <audio ref={audioRef} src="/pose-extractor/amapiano.mp3" preload="auto" />

          {/* Loading */}
          {panelState === 'loading' && (
            <div className="ds-loading">
              <div className="ds-loading-spinner" />
              <span className="ds-loading-text">{t('score_loading_mp')}</span>
            </div>
          )}

          {/* Error */}
          {panelState === 'error' && (
            <div className="ds-error">
              <span className="ds-error-text">{errorMsg}</span>
              <button className="ds-error-btn" onClick={() => window.location.reload()}>
                重新加载
              </button>
            </div>
          )}

          {/* Score overlay — shown during scoring */}
          {panelState === 'scoring' && (
            <>
              <div className="ds-score-overlay">
                <span className={`ds-score-number ${score >= 80 ? 'grade-perfect' : score >= 60 ? 'grade-great' : ''}`}>
                  {score}
                </span>
                {comboState.level !== 'none' && (
                  <span className={`ds-combo-badge level-${comboState.level}`}>
                    {comboState.comboCounter}x {comboLevelLabel()}
                  </span>
                )}
              </div>
              <div className="ds-energy-wrap">
                <div className="ds-energy-fill" style={{ height: `${Math.round(energyLevel * 100)}%` }} />
              </div>
              {feedback && (
                <div className="ds-feedback" key={feedback}>{feedback}</div>
              )}
              <div className="ds-celebrations" aria-hidden="true">
                {celebrations.map(celebration => (
                  <div className={`ds-celebration tier-${celebration.tier}`} key={celebration.id}>
                    <span className="ds-celebration-flash" />
                    <div className="ds-celebration-word">
                      <strong>{celebration.label}</strong>
                      <small>{celebration.score}%</small>
                    </div>
                    {celebration.bursts.map((burst, burstIndex) => (
                      <div
                        className="ds-firework"
                        key={burstIndex}
                        style={{ left: `${burst.x}%`, top: `${burst.y}%` }}
                      >
                        <span className="ds-firework-flash" />
                        {Array.from({ length: 24 }, (_, index) => (
                          <i
                            key={index}
                            style={{
                              '--angle': `${index * 15}deg`,
                              '--distance': `${72 + (index % 6) * 13}px`,
                              '--particle-color': ['#37E6C4', '#FFD166', '#FF5C8A', '#FFFFFF'][index % 4],
                              '--delay': `${burstIndex * 70 + (index % 3) * 18}ms`,
                            }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Countdown */}
          {panelState === 'ready' && (
            <div className="ds-countdown" key={countdown}>{countdown}</div>
          )}

          {/* Idle prompt */}
          {panelState === 'idle' && !refTrack && (
            <div className="ds-idle-prompt">
              <span className="ds-idle-text">{t('score_select_track')}</span>
            </div>
          )}

          {/* Track selector (bottom sheet) */}
          {panelState === 'selecting' && (
            <div className="ds-track-overlay" onClick={() => setPanelState('idle')}>
              <div className="ds-track-sheet" onClick={e => e.stopPropagation()}>
                <div className="ds-track-header">
                  <h3>{t('score_select_track')}</h3>
                  <button className="panel-back" onClick={() => setPanelState('idle')}><X size={20} /></button>
                </div>
                <div className="ds-track-list">
                  {refTracks.length === 0 ? (
                    <div className="ds-track-empty">{t('score_no_track')}</div>
                  ) : (
                    refTracks.map((track) => (
                      <div
                        key={track.id}
                        className={`ds-track-item ${refTrack?.id === track.id ? 'selected' : ''} ${loadingTrackId === track.id ? 'loading' : ''}`}
                        onClick={() => { if (!loadingTrackId) selectRefTrack(track) }}
                      >
                        <div
                          className="ds-track-icon"
                          style={{ background: track.isBundled ? '#FF8C3D' : '#B388FF' }}
                        >
                          {loadingTrackId === track.id ? '⏳' : track.isBundled ? '🎵' : '🎬'}
                        </div>
                        <div className="ds-track-info">
                          <span className="ds-track-name">
                            {track.title}
                            {loadingTrackId === track.id && <span className="ds-loading-inline"> loading...</span>}
                          </span>
                          <span className="ds-track-meta">
                            {track.danceStyle} · {(track.duration_ms / 1000).toFixed(1)}s · {track.frameCount || track.frames?.length || '?'} frames
                          </span>
                        </div>
                        {track.isBundled && <span className="ds-track-badge-bundled">TUTORIAL</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mode selection (after picking a track) */}
          {panelState === 'modeSelect' && refTrack && (
            <div className="ds-mode-overlay">
              <div className="ds-mode-card">
                <h3 className="ds-mode-title">{refTrack.title}</h3>
                <p className="ds-mode-sub">选择打分方式</p>
                <div className="ds-mode-buttons">
                  <button className="ds-mode-btn upload" onClick={handleSelectUpload}>
                    <span className="ds-mode-icon">📹</span>
                    <span className="ds-mode-label">上传视频打分</span>
                    <span className="ds-mode-desc">上传已录好的舞蹈视频</span>
                  </button>
                  <button className="ds-mode-btn live" onClick={handleSelectLive}>
                    <span className="ds-mode-icon">📷</span>
                    <span className="ds-mode-label">实时摄像头打分</span>
                    <span className="ds-mode-desc">开启摄像头实时对比</span>
                  </button>
                </div>
                <button className="ds-mode-back" onClick={() => { setRefTrack(null); setPanelState('selecting') }}>
                  重新选择舞蹈
                </button>
              </div>
            </div>
          )}

          {/* Video upload processing */}
          {panelState === 'uploading' && (
            <div className="ds-upload-overlay">
              <div className="ds-upload-card">
                <h3>📹 正在分析视频</h3>
                <div className="ds-upload-progress-wrap">
                  <div className="ds-upload-progress-bar">
                    <div className="ds-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="ds-upload-progress-pct">{uploadProgress}%</span>
                </div>
                <p className="ds-upload-status">{uploadStatus}</p>
              </div>
            </div>
          )}

          {/* Results overlay */}
          {panelState === 'results' && results && (
            <div className="ds-results-overlay" onClick={handleRetry}>
              <div className="ds-results-card" onClick={e => e.stopPropagation()}>
                <div className="ds-results-grade">{results.gradeLabel}</div>
                <div className="ds-results-score">{results.overall}</div>
                <div className="ds-results-label">{t('score_final_label')}</div>
                <div className="ds-results-grid">
                  <div className="ds-results-item">
                    <span className="ds-results-item-val">{results.poseScore}</span>
                    <span className="ds-results-item-lbl">{t('score_pose_label')}</span>
                  </div>
                  <div className="ds-results-item">
                    <span className="ds-results-item-val">{results.rhythmScore}</span>
                    <span className="ds-results-item-lbl">{t('score_rhythm_label')}</span>
                  </div>
                  <div className="ds-results-item">
                    <span className="ds-results-item-val">{results.maxCombo}</span>
                    <span className="ds-results-item-lbl">{t('score_max_combo')}</span>
                  </div>
                  <div className="ds-results-item">
                    <span className="ds-results-item-val">{formatTime(results.durationMs)}</span>
                    <span className="ds-results-item-lbl">{t('score_energy')}</span>
                  </div>
                </div>
                <div className="ds-results-actions">
                  <button className="ds-results-btn secondary" onClick={handleRetry}>{t('score_retry')}</button>
                  <button className="ds-results-btn primary" onClick={handleRetry}>{t('score_start')}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Music info bar */}
        <div className="ds-music-bar">
          <Music size={16} />
          <div className="ds-music-info">
            <span className="ds-music-title">
              {currentSong ? `${currentSong.title} — ${currentSong.artist}` : 'No music playing'}
            </span>
            <span className="ds-music-meta">
              {currentSong ? `${currentSong.dance || 'Freestyle'} · ${currentSong.duration || '3:00'}` : 'Select a song to start'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="ds-controls">
          {panelState === 'scoring' ? (
            <button className="ds-btn ds-btn-stop" onClick={handleStopScoring}>
              ⏹ {t('score_stop')}
            </button>
          ) : panelState === 'ready' ? (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)' }}>
              {t('score_countdown')}: {countdown}
            </span>
          ) : (
            <div className="ds-controls-row">
              <button className="ds-btn-secondary" onClick={() => setPanelState('selecting')}>
                {refTrack ? refTrack.title : t('score_select_track')}
              </button>
              <button className="ds-btn ds-btn-start" onClick={handleStartScoring}>
                <Gauge size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {t('score_start')}
              </button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  )
}
