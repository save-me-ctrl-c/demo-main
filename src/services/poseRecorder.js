/* === AfroGO — MediaPipe Pose Loader & Recorder ===
 * Dynamic CDN loading of @mediapipe/pose, camera management,
 * real-time landmark capture, and reference track recording.
 */

const MEDIAPIPE_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404'
const TASKS_VISION_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const POSE_LANDMARKER_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'
const MAX_POSES = 1
const TRACK_RETENTION_MS = 1800
const OCCLUSION_HOLD_MS = 250
const SHAPE_LANDMARKS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

let loadPromise = null
let tasksVisionPromise = null
let visionFilesetPromise = null

function loadTasksVision() {
  if (!tasksVisionPromise) tasksVisionPromise = import('@mediapipe/tasks-vision')
  return tasksVisionPromise
}

function loadVisionFileset() {
  if (!visionFilesetPromise) {
    visionFilesetPromise = loadTasksVision().then(({ FilesetResolver }) => (
      FilesetResolver.forVisionTasks(TASKS_VISION_BASE)
    ))
  }
  return visionFilesetPromise
}

/**
 * Dynamically load the MediaPipe Pose script from CDN.
 * Uses a singleton promise to avoid double-loading.
 * @returns {Promise<void>}
 */
export function loadMediaPipe() {
  loadVisionFileset()
  if (typeof window !== 'undefined' && window.Pose) return visionFilesetPromise.then(() => {})
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${MEDIAPIPE_BASE}/pose.js`
    script.async = true
    script.onload = () => visionFilesetPromise.then(resolve, reject)
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
  let landmarker = null
  let lastVideoTime = -1
  const trackedPeople = new Map()

  const getCenter = (landmarks) => {
    const points = [11, 12, 23, 24].map(index => landmarks[index]).filter(Boolean)
    if (!points.length) return { x: 0.5, y: 0.5 }
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    }
  }

  const getBodyScale = (landmarks) => {
    const leftShoulder = landmarks[11]
    const rightShoulder = landmarks[12]
    const leftHip = landmarks[23]
    const rightHip = landmarks[24]
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 0.15
    const shoulderWidth = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y)
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    }
    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    }
    const torsoLength = Math.hypot(shoulderCenter.x - hipCenter.x, shoulderCenter.y - hipCenter.y)
    return Math.max(shoulderWidth, torsoLength, 0.08)
  }

  function getShapeDistance(current, previous) {
    if (!previous) return 1
    const currentCenter = getCenter(current)
    const previousCenter = getCenter(previous)
    const currentScale = getBodyScale(current)
    const previousScale = getBodyScale(previous)
    let distance = 0
    let count = 0

    for (const index of SHAPE_LANDMARKS) {
      const a = current[index]
      const b = previous[index]
      if (!a || !b || (a.visibility ?? 1) < 0.35 || (b.visibility ?? 1) < 0.35) continue
      const ax = (a.x - currentCenter.x) / currentScale
      const ay = (a.y - currentCenter.y) / currentScale
      const bx = (b.x - previousCenter.x) / previousScale
      const by = (b.y - previousCenter.y) / previousScale
      distance += Math.min(Math.hypot(ax - bx, ay - by), 2)
      count++
    }
    return count >= 4 ? distance / count : 1
  }

  function matchDetections(detections) {
    const tracks = [...trackedPeople.entries()]
    let best = { cost: Infinity, assignments: new Map() }

    function search(index, usedIds, assignments, cost) {
      if (cost >= best.cost) return
      if (index >= detections.length) {
        best = { cost, assignments: new Map(assignments) }
        return
      }

      // An unmatched detection receives a fresh or recycled P1-P4 slot below.
      search(index + 1, usedIds, assignments, cost + 0.52)

      const detection = detections[index]
      for (const [id, track] of tracks) {
        if (usedIds.has(id)) continue
        const predicted = {
          x: track.center.x + (track.velocity?.x || 0),
          y: track.center.y + (track.velocity?.y || 0),
        }
        const centerDistance = Math.hypot(detection.center.x - predicted.x, detection.center.y - predicted.y)
        const shapeDistance = getShapeDistance(detection.landmarks, track.landmarks)
        if (centerDistance > 0.55 && shapeDistance > 0.55) continue
        const matchCost = centerDistance * 0.72 + Math.min(shapeDistance, 1) * 0.28
        if (matchCost >= 0.52) continue

        usedIds.add(id)
        assignments.set(index, { id, reset: false })
        search(index + 1, usedIds, assignments, cost + matchCost)
        assignments.delete(index)
        usedIds.delete(id)
      }
    }

    search(0, new Set(), new Map(), 0)
    return best.assignments
  }

  function assignPersonIds(poses, timestamp) {
    if (MAX_POSES === 1) {
      const landmarks = poses[0]
      const previous = trackedPeople.get(1)
      if (!landmarks) {
        if (previous && timestamp - previous.lastSeen <= OCCLUSION_HOLD_MS) {
          return [{ id: 1, landmarks: previous.landmarks, stale: true, reset: false }]
        }
        if (previous && timestamp - previous.lastSeen > TRACK_RETENTION_MS) trackedPeople.delete(1)
        return []
      }

      const center = getCenter(landmarks)
      const velocity = previous ? {
        x: (center.x - previous.center.x) * 0.6 + (previous.velocity?.x || 0) * 0.4,
        y: (center.y - previous.center.y) * 0.6 + (previous.velocity?.y || 0) * 0.4,
      } : { x: 0, y: 0 }
      trackedPeople.set(1, { center, velocity, landmarks, lastSeen: timestamp })
      return [{ id: 1, landmarks, reset: false }]
    }

    for (const [id, track] of trackedPeople) {
      if (timestamp - track.lastSeen > TRACK_RETENTION_MS) trackedPeople.delete(id)
    }

    const detections = poses.map((landmarks, index) => ({ index, landmarks, center: getCenter(landmarks) }))
    const assignments = matchDetections(detections)
    const usedIds = new Set([...assignments.values()].map(assignment => assignment.id))

    for (const detection of detections) {
      if (assignments.has(detection.index)) continue
      const freeId = Array.from({ length: MAX_POSES }, (_, index) => index + 1)
        .find(id => !usedIds.has(id) && !trackedPeople.has(id))
      const replacementId = freeId ?? [...trackedPeople.entries()]
        .filter(([id]) => !usedIds.has(id))
        .sort((a, b) => a[1].lastSeen - b[1].lastSeen)[0]?.[0]
      const id = replacementId ?? Array.from({ length: MAX_POSES }, (_, index) => index + 1)
        .find(slot => !usedIds.has(slot))
      if (id == null) continue
      assignments.set(detection.index, { id, reset: true })
      usedIds.add(id)
    }

    const matched = detections.map((detection) => {
      const assignment = assignments.get(detection.index)
      if (!assignment) return null
      const previous = trackedPeople.get(assignment.id)
      const velocity = previous ? {
        x: (detection.center.x - previous.center.x) * 0.6 + (previous.velocity?.x || 0) * 0.4,
        y: (detection.center.y - previous.center.y) * 0.6 + (previous.velocity?.y || 0) * 0.4,
      } : { x: 0, y: 0 }
      trackedPeople.set(assignment.id, {
        center: detection.center,
        velocity,
        landmarks: detection.landmarks,
        lastSeen: timestamp,
      })
      return { id: assignment.id, landmarks: detection.landmarks, reset: assignment.reset }
    }).filter(Boolean)

    // Preserve a recently occluded skeleton briefly to avoid one-frame flicker.
    for (const [id, track] of trackedPeople) {
      if (usedIds.has(id) || timestamp - track.lastSeen > OCCLUSION_HOLD_MS) continue
      matched.push({ id, landmarks: track.landmarks, stale: true, reset: false })
    }
    return matched.sort((a, b) => a.id - b.id)
  }

  async function ensureLandmarker() {
    if (landmarker) return
    const [{ PoseLandmarker }, visionFileset] = await Promise.all([loadTasksVision(), loadVisionFileset()])
    const options = {
      baseOptions: { modelAssetPath: POSE_LANDMARKER_MODEL },
      runningMode: 'VIDEO',
      numPoses: MAX_POSES,
      minPoseDetectionConfidence: 0.35,
      minPosePresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
      outputSegmentationMasks: false,
    }
    try {
      landmarker = await PoseLandmarker.createFromOptions(visionFileset, {
        ...options,
        baseOptions: { ...options.baseOptions, delegate: 'GPU' },
      })
    } catch (gpuError) {
      console.warn('GPU pose tracking unavailable, falling back to CPU:', gpuError)
      landmarker = await PoseLandmarker.createFromOptions(visionFileset, options)
    }
  }

  async function detectFrame() {
    if (!running) return
    if (videoEl.readyState >= 2 && videoEl.currentTime !== lastVideoTime) {
      lastVideoTime = videoEl.currentTime
      const result = landmarker.detectForVideo(videoEl, performance.now())
      const timestamp = Date.now()
      onResults(assignPersonIds(result.landmarks || [], timestamp), timestamp)
    }
    rafId = requestAnimationFrame(detectFrame)
  }

  return {
    async start() {
      running = true
      try {
        await ensureLandmarker()
      } catch (error) {
        running = false
        console.error('Failed to initialize multi-person pose tracker:', error)
        return
      }
      if (!running) {
        try { landmarker?.close() } catch {}
        landmarker = null
        return
      }
      detectFrame()
    },
    stop() {
      running = false
      if (rafId) { cancelAnimationFrame(rafId); rafId = null }
      try { landmarker?.close() } catch {}
      landmarker = null
      trackedPeople.clear()
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
