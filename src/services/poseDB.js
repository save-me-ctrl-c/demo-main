/* === AfroGO — Pose Track IndexedDB Storage ===
 * Mirrors the IndexedDB pattern from Create.jsx (afrogo_videos).
 * Separate database: afrogo_poses, store: tracks.
 */

const DB_NAME = 'afrogo_poses'
const DB_VERSION = 1
const STORE_NAME = 'tracks'

/**
 * Open (or create) the pose tracks IndexedDB.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Save a pose track to IndexedDB.
 * @param {Object} track — { id, title, danceStyle, duration, fps, frames, createdAt }
 * @returns {Promise<void>}
 */
export async function saveTrack(track) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(track)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Load a single pose track by ID.
 * @param {string} id
 * @returns {Promise<Object|undefined>}
 */
export async function loadTrack(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(id)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * List all saved pose tracks (metadata only, sorted by most recent first).
 * @returns {Promise<Array>}
 */
export async function listTracks() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => {
      const items = (req.result || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      // Strip heavy frame data for listing; caller uses loadTrack() for full data
      resolve(items.map(function(item) {
        return {
          id: item.id,
          title: item.title,
          danceStyle: item.danceStyle,
          duration: item.duration,
          fps: item.fps,
          frameCount: item.frameCount,
          createdAt: item.createdAt,
        }
      }))
    }
    req.onerror = () => reject(req.error)
  })
}

/**
 * Delete a pose track by ID.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteTrack(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
