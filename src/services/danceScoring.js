/* === AfroGO — Dance Scoring Engine ===
 * Phase 2: Hybrid bone-vector scoring combining directional cosine similarity
 * with positional accuracy, stricter thresholds, and Afro-dance weighting.
 * Pure JS — zero dependencies, runs entirely client-side.
 */

// ── MediaPipe Pose Landmark Indices ──
export const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_PINKY: 17, RIGHT_PINKY: 18,
  LEFT_INDEX: 19, RIGHT_INDEX: 20,
  LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
}

// ── Bone definitions: [fromIdx, toIdx, name, weight] ──
// Weights: core body (torso, hips) higher; extremities moderate
export const SCORING_BONES = [
  // Core alignment — most important
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, 'shoulder_line', 1.8],
  [LM.LEFT_HIP, LM.RIGHT_HIP, 'hip_line', 1.6],
  // Torso posture
  [LM.LEFT_SHOULDER, LM.LEFT_HIP, 'left_torso', 1.2],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, 'right_torso', 1.2],
  // Arms — important for dance gestures
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, 'left_upper_arm', 1.0],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, 'right_upper_arm', 1.0],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST, 'left_forearm', 1.0],
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST, 'right_forearm', 1.0],
  // Legs — stepping & rhythm
  [LM.LEFT_HIP, LM.LEFT_KNEE, 'left_thigh', 1.0],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE, 'right_thigh', 1.0],
  [LM.LEFT_KNEE, LM.LEFT_ANKLE, 'left_shin', 1.0],
  [LM.RIGHT_KNEE, LM.RIGHT_ANKLE, 'right_shin', 1.0],
  // Feet — optional detail
  [LM.LEFT_ANKLE, LM.LEFT_FOOT_INDEX, 'left_foot', 0.5],
  [LM.RIGHT_ANKLE, LM.RIGHT_FOOT_INDEX, 'right_foot', 0.5],
]

// ── Skeleton connections for Canvas drawing (body only, no face) ──
export const SKELETON_CONNECTIONS = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28],
]

export const SKELETON_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

// ── Vector math ──
function vec(a, b) { return { x: b.x - a.x, y: b.y - a.y } }

function dot(a, b) { return a.x * b.x + a.y * b.y }

function mag(v) { return Math.sqrt(v.x * v.x + v.y * v.y) }

function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) }

function cosineSimilarity(v1, v2) {
  const m1 = mag(v1), m2 = mag(v2)
  if (m1 < 0.0001 || m2 < 0.0001) return 0
  return Math.max(0, dot(v1, v2) / (m1 * m2))
}

// ── Spatial Normalization ──

export function getShoulderWidth(landmarks) {
  const ls = landmarks[LM.LEFT_SHOULDER], rs = landmarks[LM.RIGHT_SHOULDER]
  if (!ls || !rs || (ls.visibility != null && ls.visibility < 0.5) ||
      (rs.visibility != null && rs.visibility < 0.5)) return null
  return Math.sqrt((rs.x - ls.x) ** 2 + (rs.y - ls.y) ** 2)
}

export function normalizeLandmarks(landmarks, referenceShoulderWidth) {
  if (!landmarks || landmarks.length < 33) return landmarks
  const ls = landmarks[LM.LEFT_SHOULDER], rs = landmarks[LM.RIGHT_SHOULDER]
  if (!ls || !rs) return landmarks
  const userSw = getShoulderWidth(landmarks)
  if (!userSw || userSw < 0.001) return landmarks
  const scale = referenceShoulderWidth / userSw
  const cx = (ls.x + rs.x) / 2, cy = (ls.y + rs.y) / 2
  return landmarks.map(lm => ({
    x: (lm.x - cx) * scale + 0.5,
    y: (lm.y - cy) * scale + 0.5,
    z: lm.z != null ? lm.z * scale : 0,
    visibility: lm.visibility != null ? lm.visibility : 1.0,
  }))
}

// ── Hybrid Pose Scoring (direction + position) ──

/**
 * Calculate per-bone score combining direction and position match.
 *
 * Direction: cosineSimilarity(userBoneVec, refBoneVec)  →  [0, 1]
 * Position:  how close is the bone midpoint to the reference midpoint,
 *            normalized by reference bone length with tolerance → [0, 1]
 *
 * Combined:  0.7 * direction + 0.3 * position
 * Then apply mild power curve to reward precision.
 */
function boneScore(userFrom, userTo, refFrom, refTo) {
  const userVec = vec(userFrom, userTo)
  const refVec = vec(refFrom, refTo)

  // Direction match
  const dirScore = cosineSimilarity(userVec, refVec)

  // Position match: compare bone midpoints, with generous tolerance
  const userMid = { x: (userFrom.x + userTo.x) / 2, y: (userFrom.y + userTo.y) / 2 }
  const refMid = { x: (refFrom.x + refTo.x) / 2, y: (refFrom.y + refTo.y) / 2 }
  const refLen = mag(refVec)
  const posDist = dist(userMid, refMid)
  // Tolerance = 2x bone length + 0.02 floor (avoids tiny-bone precision issues)
  const tolerance = refLen * 2.0 + 0.02
  const posScore = Math.max(0, 1.0 - posDist / tolerance)

  // Combine: direction is more reliable across different MediaPipe versions
  const raw = 0.7 * dirScore + 0.3 * posScore

  // Mild power curve: rewards precision without over-penalizing
  return Math.pow(raw, 1.15)
}

/**
 * Calculate hybrid pose similarity score for a single frame.
 * @param {Array} userLm - 33 normalized user landmarks
 * @param {Array} refLm - 33 reference landmarks
 * @returns {number} Score 0-1
 */
export function calculatePoseScore(userLm, refLm) {
  if (!userLm || !refLm || userLm.length < 33 || refLm.length < 33) return 0

  let totalWeight = 0, weightedScore = 0

  for (const [fromIdx, toIdx, , weight] of SCORING_BONES) {
    const uf = userLm[fromIdx], ut = userLm[toIdx]
    const rf = refLm[fromIdx], rt = refLm[toIdx]
    if (!uf || !ut || !rf || !rt) continue
    if ((uf.visibility != null && uf.visibility < 0.5) ||
        (ut.visibility != null && ut.visibility < 0.5) ||
        (rf.visibility != null && rf.visibility < 0.5) ||
        (rt.visibility != null && rt.visibility < 0.5)) continue

    const s = boneScore(uf, ut, rf, rt)
    weightedScore += weight * s
    totalWeight += weight
  }

  return totalWeight > 0 ? weightedScore / totalWeight : 0
}

export function getFrameScore(userLm, refLm, refShoulderW) {
  const normalized = normalizeLandmarks(userLm, refShoulderW || 0.28)
  return calculatePoseScore(normalized, refLm)
}

// ── Temporal Alignment ──

export function findClosestRefFrame(refFrames, userTimestampMs) {
  if (!refFrames || refFrames.length === 0) return null
  const refDuration = refFrames[refFrames.length - 1].timestamp_ms
  const loopedTs = refDuration > 0 ? userTimestampMs % refDuration : userTimestampMs

  let closest = refFrames[0], minDist = Infinity
  for (const frame of refFrames) {
    const d = Math.abs(frame.timestamp_ms - loopedTs)
    if (d < minDist) { minDist = d; closest = frame }
  }
  return closest
}

// ── Rhythm Scoring ──

/**
 * Compute rhythm score based on movement energy correlation.
 * Uses a sliding window to compare energy distribution patterns.
 */
export function computeRhythmScore(userFrames, refFrames) {
  if (!userFrames || userFrames.length < 3 || !refFrames || refFrames.length < 3) {
    return 0.3 // Lower neutral baseline
  }

  const energy = (frames) => {
    if (frames.length < 2) return []
    const energies = []
    for (let i = 1; i < frames.length; i++) {
      const prev = frames[i - 1].landmarks, curr = frames[i].landmarks
      if (!prev || !curr) { energies.push(0); continue }
      let d = 0
      const joints = [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
                      LM.LEFT_HIP, LM.RIGHT_HIP,
                      LM.LEFT_KNEE, LM.RIGHT_KNEE,
                      LM.LEFT_WRIST, LM.RIGHT_WRIST]
      for (const j of joints) {
        if (prev[j] && curr[j] && (prev[j].visibility == null || prev[j].visibility > 0.4)) {
          d += Math.abs(curr[j].x - prev[j].x) + Math.abs(curr[j].y - prev[j].y)
        }
      }
      energies.push(d)
    }
    return energies
  }

  const userEnergy = energy(userFrames)
  const refEnergy = energy(refFrames)
  if (userEnergy.length === 0 || refEnergy.length === 0) return 0.3

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
  const userAvg = avg(userEnergy), refAvg = avg(refEnergy)

  // Both still = full credit for stillness (rest pose accuracy)
  if (refAvg < 0.0001) return userAvg < 0.0001 ? 1.0 : 0.3

  const ratio = Math.min(userAvg / refAvg, 2.0)
  // Score decays faster as ratio deviates from 1.0
  const deviation = Math.abs(1.0 - ratio)
  // Quadratic penalty instead of linear
  return Math.max(0, 1.0 - deviation * deviation * 2.0)
}

// ── Combo System ──

export const COMBO_LEVELS = {
  NONE:  { name: 'none',  min: 0,  multiplier: 1.0, labelKey: '' },
  GREAT: { name: 'great', min: 8,  multiplier: 1.5, labelKey: 'score_combo_great' },
  SUPER: { name: 'super', min: 20, multiplier: 2.0, labelKey: 'score_combo_super' },
  FIRE:  { name: 'fire',  min: 40, multiplier: 3.0, labelKey: 'score_combo_fire' },
}

const GOOD_THRESHOLD = 0.65  // Frame score >= 0.65 = "good"
const BREAK_THRESHOLD = 0.30 // Frame score < 0.30 = "break"

export function evaluateCombo(frameScore, comboState) {
  const cs = { ...comboState }

  if (frameScore >= GOOD_THRESHOLD) {
    cs.consecutiveGood += 1
    cs.comboCounter += 1
    cs.breakFrame = false
  } else if (frameScore < BREAK_THRESHOLD && cs.consecutiveGood > 0) {
    cs.consecutiveGood = 0
    cs.comboCounter = Math.max(0, cs.comboCounter - 8)
    cs.breakFrame = true
  } else {
    cs.breakFrame = false
  }

  if (cs.consecutiveGood >= COMBO_LEVELS.FIRE.min) {
    cs.level = 'fire'; cs.multiplier = COMBO_LEVELS.FIRE.multiplier
  } else if (cs.consecutiveGood >= COMBO_LEVELS.SUPER.min) {
    cs.level = 'super'; cs.multiplier = COMBO_LEVELS.SUPER.multiplier
  } else if (cs.consecutiveGood >= COMBO_LEVELS.GREAT.min) {
    cs.level = 'great'; cs.multiplier = COMBO_LEVELS.GREAT.multiplier
  } else {
    cs.level = 'none'; cs.multiplier = COMBO_LEVELS.NONE.multiplier
  }

  return cs
}

export function createComboState() {
  return { consecutiveGood: 0, comboCounter: 0, maxCombo: 0,
           multiplier: 1.0, level: 'none', breakFrame: false }
}

// ── Fusion Score ──

export function computeFusionScore(poseScore, rhythmScore) {
  const raw = 0.6 * poseScore + 0.4 * rhythmScore
  const overall = Math.round(raw * 100)

  let grade, gradeLabel
  if (overall >= 80)      { grade = 'perfect'; gradeLabel = '🔥 Perfect' }
  else if (overall >= 60) { grade = 'great';   gradeLabel = '💃 Great' }
  else if (overall >= 40) { grade = 'good';    gradeLabel = '🎵 Good' }
  else                    { grade = 'try';     gradeLabel = '👀 Keep Trying' }

  return {
    overall: Math.max(0, Math.min(100, overall)),
    poseScore: Math.round(poseScore * 100),
    rhythmScore: Math.round(rhythmScore * 100),
    grade,
    gradeLabel,
  }
}

// ── Energy Level ──

export function computeEnergyLevel(currentLm, previousLm) {
  if (!currentLm || !previousLm) return 0
  let totalDisp = 0
  const joints = [LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_ELBOW, LM.RIGHT_ELBOW,
                  LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_HIP, LM.RIGHT_HIP]
  for (const j of joints) {
    const c = currentLm[j], p = previousLm[j]
    if (c && p && (c.visibility == null || c.visibility > 0.4)) {
      totalDisp += Math.abs(c.x - p.x) + Math.abs(c.y - p.y)
    }
  }
  return Math.min(1, totalDisp / (joints.length * 0.015))
}

// ── Reference Track Normalization ──

export function getRefShoulderWidth(refTrack) {
  if (!refTrack || !refTrack.frames || refTrack.frames.length === 0) return 0.28
  for (const frame of refTrack.frames) {
    const w = getShoulderWidth(frame.landmarks)
    if (w && w > 0.01) return w
  }
  return 0.28
}
