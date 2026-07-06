/* === AfroGo — Voice Assistant: Intent + Fuzzy Song Matcher === */

import Fuse from 'fuse.js'
import { songs } from '../data/mockData'

/* ── Fuse.js instance (built once) ── */
const fuse = new Fuse(songs, {
  keys: [
    { name: 'title', weight: 4 },
    { name: 'artist', weight: 3 },
    { name: 'aliases', weight: 2 },
    { name: 'genre', weight: 2 },
    { name: 'dance', weight: 1 },
  ],
  threshold: 0.45,        // 0 = exact, 1 = everything. 0.45 tolerates typos & partial words
  includeScore: true,
  minMatchCharLength: 2,
})

/* ── Intent Parser ── */
const COMMANDS = [
  [/^(播放|play|放|来一首|来首|放一首)\s*(.+)$/i, 'play', (m) => ({ query: m[2].trim() })],
  [/^(暂停|pause|停|停止)$/i, 'pause', () => ({})],
  [/^(继续|resume|继续播放|接着放)$/i, 'resume', () => ({})],
  [/^(下一首|next|换一首|换歌|切歌)$/i, 'next', () => ({})],
  [/^(上一首|prev|上一曲)$/i, 'prev', () => ({})],
  [/^(随机|random|随便|来点|放点|换个口味|来几首)/i, 'random', () => ({})],
  [/^(这是什么歌|当前歌曲|什么歌|what.*(playing|song))/i, 'whatPlaying', () => ({})],
  [/^(大[声点]|volume\s*up|增大音量|响一点)/i, 'volumeUp', () => ({})],
  [/^(小[声点]|volume\s*down|减小音量|轻一点)/i, 'volumeDown', () => ({})],
  [/^(停止|关闭|退出|结束|stop|goodbye|bye|quit|exit|shut\s*up)/i, 'stop', () => ({})],
]

export function parseIntent(raw) {
  const input = raw.toLowerCase().trim()
  for (const [regex, action, extract] of COMMANDS) {
    const match = input.match(regex)
    if (match) return { action, params: extract(match), raw }
  }
  // Default: any unrecognized phrase → play with fuzzy search
  return { action: 'play', params: { query: input }, raw }
}

/* ── Fuzzy Song Search ── */
export function findSongs(query, limit = 6) {
  if (!query) return shuffle(songs).slice(0, limit)

  const q = query.toLowerCase()

  // 1. Exact genre match (e.g. "Afrobeat" → all Afrobeat songs)
  const genreMatch = songs.filter(s =>
    s.genre.toLowerCase() === q || s.dance.toLowerCase() === q
  )
  if (genreMatch.length > 0) return shuffle(genreMatch)

  // 2. Genre/Dance partial match
  const genrePartial = songs.filter(s =>
    s.genre.toLowerCase().includes(q) || s.dance.toLowerCase().includes(q)
  )
  if (genrePartial.length > 0) return shuffle(genrePartial)

  // 3. Fuse.js fuzzy search (handles typos, partial words, aliases)
  const results = fuse.search(q, { limit })
  if (results.length > 0 && results[0].score < 0.6) {
    return results.map(r => r.item)
  }

  // 4. No good match → random
  return shuffle(songs).slice(0, limit)
}

/* ── Similar Songs ── */
export function findSimilar(song, limit = 8) {
  const pool = songs.filter(s =>
    s.id !== song.id && (s.genre === song.genre || s.dance === song.dance)
  )
  return shuffle(pool).slice(0, limit)
}

/* ── Fisher-Yates Shuffle ── */
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ── Voice Feedback ── */
export function getFeedback(action, song, lang = 'en') {
  const msgs = {
    play: {
      zh: song ? `正在播放 ${song.title}` : '正在播放',
      en: song ? `Playing ${song.title}` : 'Playing',
    },
    pause: { zh: '已暂停', en: 'Paused' },
    resume: { zh: '继续播放', en: 'Resuming' },
    next: { zh: '下一首', en: 'Next track' },
    random: { zh: '随机播放', en: 'Shuffle mode' },
    stop: { zh: '好的，再见', en: 'Goodbye' },
    notFound: { zh: '没有找到，随机播放', en: 'Not found, playing random' },
  }
  const msg = msgs[action] || msgs.play
  return msg[lang] || msg.en
}

/* ── TTS (browser built-in) ── */
export function speak(text, lang = 'en-US') {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = 1.0
  window.speechSynthesis.speak(u)
}
