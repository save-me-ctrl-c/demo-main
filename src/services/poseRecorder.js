/* === AfroGO — MediaPipe Pose Loader & Recorder ===
 * Dynamic CDN loading of @mediapipe/pose, camera management,
 * real-time landmark capture, and reference track recording.
 */

const MEDIAPIPE_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404'

let loadPromise = null

/**
 * Dynamically load the MediaPipe Pose script from CDN.
 * Uses a singleton promise to avoid double-loading.
 * @returns {Promise<void>}
 */
export function loadMediaPipe() {
  if (typeof window !== 'undefined' && window.Pose) {
    return Promise.resolve()
  }
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${MEDIAPIPE_BASE}/pose.js`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Failed to load MediaPipe Pose from CDN'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}

/**
 * Start the user-facing camera.
 * @param {HTMLVideoElement} videoEl
 * @returns {Promise<MediaStream>}
 */
export async function startPoseCamera(videoEl) {
  // Check browser support
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('CAM_HTTPS_REQUIRED')
  }

  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    })
  } catch (err) {
    const name = (err.name || '').toLowerCase()
    if (name === 'notallowederror') {
      throw new Error('CAM_PERMISSION_DENIED')
    } else if (name === 'notfounderror') {
      throw new Error('CAM_NOT_FOUND')
    } else if (name === 'notreadableerror') {
      throw new Error('CAM_IN_USE')
    } else {
      throw new Error('CAM_ERROR:' + (err.message || 'unknown'))
    }
  }

  videoEl.srcObject = stream
  await videoEl.play()
  return stream
}

/**
 * Stop a camera stream.
 * @param {MediaStream} stream
 */
export function stopPoseCamera(stream) {
  if (!stream) return
  stream.getTracks().forEach(t => t.stop())
}

/**
 * Create a MediaPipe Pose tracker that feeds video frames and
 * invokes a callback with detected landmarks.
 *
 * @param {HTMLVideoElement} videoEl
 * @param {Function} onResults — (landmarks, timestamp) => void
 * @returns {{ start: Function, stop: Function }}
 */
export function createPoseTracker(videoEl, onResults) {
  let rafId = null
  let running = false

  const Pose = window.Pose
  if (!Pose) {
    console.warn('MediaPipe Pose not loaded yet')
    return { start: () => {}, stop: () => {} }
  }

  const pose = new Pose({
    locateFile: (file) => `${MEDIAPIPE_BASE}/${file}`,
  })

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })

  pose.onResults((results) => {
    if (results.poseLandmarks && running) {
      onResults(results.poseLandmarks, Date.now())
    }
  })

  async function detectFrame() {
    if (!running) return
    if (videoEl.readyState >= 2) {
      await pose.send({ image: videoEl })
    }
    rafId = requestAnimationFrame(detectFrame)
  }

  return {
    start() {
      running = true
      detectFrame()
    },
    stop() {
      running = false
      if (rafId) { cancelAnimationFrame(rafId); rafId = null }
      try { pose.close() } catch {}
    },
  }
}

// ── Reference Track Recording ──

let recordingInterval = null
let recordedFrames = []
let recordingStartTime = 0
let currentLandmarksCache = null

/**
 * Set the latest landmarks (called from the tracker callback during recording).
 */
export function cacheLandmarks(landmarks) {
  currentLandmarksCache = landmarks
}

/**
 * Start recording landmarks to build a reference pose track.
 * @param {number} fps — capture frame rate (default 30)
 */
export function startRecording(fps = 30) {
  recordedFrames = []
  currentLandmarksCache = null
  recordingStartTime = Date.now()

  recordingInterval = setInterval(() => {
    if (currentLandmarksCache) {
      const elapsed = Date.now() - recordingStartTime
      recordedFrames.push({
        timestamp_ms: elapsed,
        landmarks: currentLandmarksCache.map(lm => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility,
        })),
      })
    }
  }, 1000 / fps)
}

/**
 * Stop recording and return the completed pose track.
 * @returns {{ frames: Array, duration: number, fps: number }}
 */
export function stopRecording() {
  if (recordingInterval) {
    clearInterval(recordingInterval)
    recordingInterval = null
  }

  const duration = recordedFrames.length > 0
    ? recordedFrames[recordedFrames.length - 1].timestamp_ms
    : 0

  const result = {
    frames: recordedFrames,
    duration_ms: duration,
    fps: recordedFrames.length > 0
      ? Math.round(recordedFrames.length / (duration / 1000))
      : 30,
  }

  recordedFrames = []
  currentLandmarksCache = null
  recordingStartTime = 0

  return result
}

/**
 * Check if currently recording.
 */
export function isRecording() {
  return recordingInterval !== null
}

/**
 * Get recording elapsed time in ms.
 */
export function getRecordingElapsed() {
  if (!recordingStartTime) return 0
  return Date.now() - recordingStartTime
}

/**
 * Generate a simple standing-pose landmark set (all 33 landmarks).
 * Used as a fallback / default when no landmarks are detected.
 */
export function generateStandingPose() {
  // Approximate standing pose with arms slightly out
  const pose = [
    { x: 0.50, y: 0.08, z: 0, visibility: 1 }, // 0 nose
    { x: 0.47, y: 0.06, z: 0, visibility: 1 }, // 1 left eye inner
    { x: 0.46, y: 0.06, z: 0, visibility: 1 }, // 2 left eye
    { x: 0.45, y: 0.07, z: 0, visibility: 1 }, // 3 left eye outer
    { x: 0.53, y: 0.06, z: 0, visibility: 1 }, // 4 right eye inner
    { x: 0.54, y: 0.06, z: 0, visibility: 1 }, // 5 right eye
    { x: 0.55, y: 0.07, z: 0, visibility: 1 }, // 6 right eye outer
    { x: 0.43, y: 0.10, z: 0, visibility: 1 }, // 7 left ear
    { x: 0.57, y: 0.10, z: 0, visibility: 1 }, // 8 right ear
    { x: 0.48, y: 0.12, z: 0, visibility: 1 }, // 9 mouth left
    { x: 0.52, y: 0.12, z: 0, visibility: 1 }, // 10 mouth right
    { x: 0.38, y: 0.22, z: 0, visibility: 1 }, // 11 left shoulder
    { x: 0.62, y: 0.22, z: 0, visibility: 1 }, // 12 right shoulder
    { x: 0.30, y: 0.38, z: 0, visibility: 1 }, // 13 left elbow
    { x: 0.70, y: 0.38, z: 0, visibility: 1 }, // 14 right elbow
    { x: 0.24, y: 0.52, z: 0, visibility: 1 }, // 15 left wrist
    { x: 0.76, y: 0.52, z: 0, visibility: 1 }, // 16 right wrist
    { x: 0.22, y: 0.56, z: 0, visibility: 1 }, // 17 left pinky
    { x: 0.78, y: 0.56, z: 0, visibility: 1 }, // 18 right pinky
    { x: 0.22, y: 0.54, z: 0, visibility: 1 }, // 19 left index
    { x: 0.78, y: 0.54, z: 0, visibility: 1 }, // 20 right index
    { x: 0.26, y: 0.53, z: 0, visibility: 1 }, // 21 left thumb
    { x: 0.74, y: 0.53, z: 0, visibility: 1 }, // 22 right thumb
    { x: 0.42, y: 0.56, z: 0, visibility: 1 }, // 23 left hip
    { x: 0.58, y: 0.56, z: 0, visibility: 1 }, // 24 right hip
    { x: 0.40, y: 0.72, z: 0, visibility: 1 }, // 25 left knee
    { x: 0.60, y: 0.72, z: 0, visibility: 1 }, // 26 right knee
    { x: 0.38, y: 0.88, z: 0, visibility: 1 }, // 27 left ankle
    { x: 0.62, y: 0.88, z: 0, visibility: 1 }, // 28 right ankle
    { x: 0.38, y: 0.92, z: 0, visibility: 1 }, // 29 left heel
    { x: 0.62, y: 0.92, z: 0, visibility: 1 }, // 30 right heel
    { x: 0.40, y: 0.90, z: 0, visibility: 1 }, // 31 left foot index
    { x: 0.60, y: 0.90, z: 0, visibility: 1 }, // 32 right foot index
  ]
  return pose
}

// ── Sample Pose Track Generator ──
// Generates a simple arm-wave pattern for immediate out-of-box testing

/**
 * Generate a sample Azonto arm-wave reference track.
 * Right arm waves up and down in a sine pattern while body stays still.
 * @param {number} durationMs — track duration in ms (default 4000)
 * @param {number} fps — frames per second (default 30)
 * @returns {Object} Pose track compatible with scoring engine
 */
export function generateSampleTrack(durationMs = 4000, fps = 30) {
  const frameInterval = 1000 / fps
  const totalFrames = Math.floor(durationMs / frameInterval)
  const frames = []

  const basePose = generateStandingPose()

  for (let i = 0; i < totalFrames; i++) {
    const t = i * frameInterval
    const timestamp_ms = Math.round(t)

    // Sine wave for right arm: period = 2 seconds
    const phase = (t / 2000) * Math.PI * 2
    const armAngle = Math.sin(phase) * 0.5 // -0.5 to 0.5

    const landmarks = basePose.map((lm, idx) => {
      const l = { ...lm }
      // Animate right arm (shoulder 12, elbow 14, wrist 16)
      if (idx === 14) { // right elbow
        l.y = 0.38 + armAngle * 0.25
        l.x = 0.70 - Math.abs(armAngle) * 0.05
      }
      if (idx === 16) { // right wrist
        l.y = 0.52 + armAngle * 0.35
        l.x = 0.76 - Math.abs(armAngle) * 0.08
      }
      if (idx === 18) { l.y = 0.56 + armAngle * 0.35; l.x = 0.78 - Math.abs(armAngle) * 0.08 }
      if (idx === 20) { l.y = 0.54 + armAngle * 0.35; l.x = 0.78 - Math.abs(armAngle) * 0.08 }
      if (idx === 22) { l.y = 0.53 + armAngle * 0.35; l.x = 0.74 - Math.abs(armAngle) * 0.08 }

      // Slight shoulder movement
      if (idx === 12) { // right shoulder
        l.y = 0.22 + armAngle * 0.08
      }

      // Subtle opposite hip sway
      if (idx === 23) { // left hip
        l.x = 0.42 - armAngle * 0.03
      }
      if (idx === 24) { // right hip
        l.x = 0.58 - armAngle * 0.03
      }

      return l
    })

    frames.push({ timestamp_ms, landmarks })
  }

  return {
    id: 'sample_azonto_arm_wave',
    title: 'Azonto Arm Wave (Sample)',
    danceStyle: 'Azonto',
    duration_ms: durationMs,
    fps,
    frames,
    frameCount: frames.length,
    createdAt: Date.now(),
    isSample: true,
  }
}
