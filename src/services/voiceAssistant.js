/* === AfroGo — Voice Assistant: Intent + Fuzzy Song Matcher === */

import Fuse from 'fuse.js'
import { songs as sourceSongs } from '../data/mockData'
import { withSongArtwork } from '../data/mediaAssets'

const songs = sourceSongs.map(withSongArtwork)

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
  [/^(?:播放|play|put\s+on|放|来一首|来首|放一首)\s+(.+)$/i, 'play', (m) => ({ query: m[1].trim() })],
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

// Garbled wake word patterns — common ASR misrecognitions of "hey/hi afrogo"
const GARBLED_WAKE = [
  /(hey|hi|ok|okay)\s+(after|apple|arrow|afro|affro|afra|aphro)\s*(go|co|goal|gold|coal|goo)?/i,
  /a\s+fro\s*(go|co)?/i,
  /(hey|hi)\s+(assistant|asist|assist)/i,
  /wake\s*up/i,
  /start\s*listening/i,
]

// Greeting patterns — don't turn casual hellos into song searches
const GREET_PATTERNS = [
  /^(hi|hey|hello|yo|hai|hay|hoi|hola|sup|howdy)(\s|[,.!?]|$)/i,
  /^(good\s(morning|afternoon|evening))/i,
  /^(what'?s\sup|how('?s| are) (it|you|things)(\sgoing)?)/i,
  /^(are\syou\s)?(there|awake|listening)/i,
  /^(你好|嗨|嘿|哈[喽罗]|在吗|在不在|喂|醒醒|有人[在吗]?)/,
  /^(hi|hey|hello)\s+(afrogo|afro|assistant|there)/i,
]

// Common ASR fixes — maps garbled speech-to-text to correct terms
const ASR_FIXES = {
  // Genres
  'amapina': 'amapiano', 'amapiana': 'amapiano', 'a mappy anno': 'amapiano',
  'afro beat': 'afrobeat', 'afro beats': 'afrobeat', 'afro beets': 'afrobeat',
  'afro fusion': 'Afro-Fusion',
  // Song titles (common ASR garbles)
  'funky lagos': 'Funky Lagos', 'funky legos': 'Funky Lagos',
  'funky lago': 'Funky Lagos', 'funky lakes': 'Funky Lagos',
  'all fun funky': 'Funky Lagos', 'all funky': 'Funky Lagos',
  'nadea': 'Nadeya', 'nadia': 'Nadeya', 'nadeya': 'Nadeya',
  'take some time': 'Take Some Time',
  'dance in the rain': 'Dance In The Rain',
  'bootlickers': 'Bootlickers House Remix',
  'gas and gravity': 'Gas and Gravity',
  'around the corner': 'Around The Corner',
  'world fusion': 'World Fusion Music',
  'for you ill go': 'For You I\'ll Go There', 'for you i will go': 'For You I\'ll Go There',
  // Artists
  'groucho marks': 'groucho_marxx', 'groucho marx': 'groucho_marxx',
  'vj memes': 'VJ_Memes', 'vj memez': 'VJ_Memes',
  'texas radio fish': 'texasradiofish',
  'zephyr me': 'zep_hurme', 'zep homey': 'zep_hurme',
  'laz tunes': 'lazztunes07', 'last tunes': 'lazztunes07',
  'pretty precious': 'PettyPrecious',
  'bo crew': 'BOCrew',
}

function cleanQuery(q) {
  return q
    .replace(/^some\s+/i, '')
    .replace(/^(i want |i wanna |play |put on |can you play |can we |let's |lets )/i, '')
    .replace(/^a\s+/i, '')
    .replace(/^all\s+/i, '')
    .replace(/\s+please$/i, '')
    .replace(/\s+thanks?(you)?$/i, '')
    .replace(/\s+for me$/i, '')
    .trim()
}

export function parseIntent(raw) {
  const input = raw.toLowerCase().trim()

  // A greeting followed by any recognized phrase acts as wake-and-shuffle.
  // Examples: "Hi, Efra", "Hey there", "Hello, I'm from...".
  const greetingWithContext = input.match(/^(?:hi|hey|hello)\b[\s,.:;!?-]*(\S[\s\S]*)$/i)
  if (greetingWithContext?.[1]) {
    return { action: 'random', params: {}, raw }
  }

  // 1. Check garbled wake words first (ASR misheard "hey afrogo")
  for (const p of GARBLED_WAKE) {
    if (p.test(input)) return { action: 'greet', params: {}, raw }
  }

  // 2. Check music commands
  for (const [regex, action, extract] of COMMANDS) {
    const match = input.match(regex)
    if (match) {
      const params = extract(match)
      if (action === 'play' && params.query) {
        // ASR fixes FIRST (before noise removal — whole phrases may contain noise words)
        let q = params.query
        for (const [wrong, right] of Object.entries(ASR_FIXES)) {
          if (q.toLowerCase().includes(wrong)) q = q.replace(new RegExp(wrong, 'i'), right)
        }
        // THEN remove noise words
        q = cleanQuery(q)
        params.query = q
      }
      return { action, params, raw }
    }
  }

  // 3. Check if it's a casual greeting
  for (const p of GREET_PATTERNS) {
    if (p.test(input)) return { action: 'greet', params: {}, raw }
  }

  // 4. Default: play — apply ASR fixes first, then clean noise
  let q = input
  for (const [wrong, right] of Object.entries(ASR_FIXES)) {
    if (q.toLowerCase().includes(wrong)) q = q.replace(new RegExp(wrong, 'i'), right)
  }
  q = cleanQuery(q)
  return { action: 'play', params: { query: q }, raw }
}

/* ── Fuzzy Song Search ── */
/**
 * @param {string} query - Search query text
 * @param {object} [options]
 * @param {number} [options.limit=6] - Max results
 * @param {string} [options.genre] - Filter by genre (exact or partial match)
 * @param {string} [options.mood] - Mood/style hint (used if genre not matched)
 * @param {number} [options.era] - Filter by release year
 */
export function findSongs(query, options = {}) {
  const { limit = 6, genre, mood, era } = typeof options === 'number'
    ? { limit: options }  // backward compat: findSongs(q, 6)
    : options

  // Build a candidate pool with optional genre/mood/era pre-filtering
  let pool = songs

  if (genre) {
    const g = genre.toLowerCase()
    const genreFiltered = songs.filter(s =>
      (s.genre && s.genre.toLowerCase().includes(g)) ||
      (s.dance && s.dance.toLowerCase().includes(g))
    )
    if (genreFiltered.length > 0) pool = genreFiltered
  }

  if (mood && pool === songs) {
    // Mood as secondary filter — try matching against genre/dance
    const m = mood.toLowerCase()
    const moodFiltered = songs.filter(s =>
      (s.genre && s.genre.toLowerCase().includes(m)) ||
      (s.dance && s.dance.toLowerCase().includes(m))
    )
    if (moodFiltered.length > 0) pool = moodFiltered
  }

  if (era && pool.length > 0) {
    const eraFiltered = pool.filter(s => s.release_year === era || (s.album && s.album.includes(String(era))))
    if (eraFiltered.length > 0) pool = eraFiltered
  }

  if (!query) return shuffle(pool).slice(0, limit)

  const q = query.toLowerCase()

  // 1. Exact genre match (e.g. "Afrobeat" → all Afrobeat songs)
  const genreMatch = pool.filter(s =>
    s.genre.toLowerCase() === q || s.dance.toLowerCase() === q
  )
  if (genreMatch.length > 0) return shuffle(genreMatch)

  // 2. Genre/Dance partial match
  const genrePartial = pool.filter(s =>
    s.genre.toLowerCase().includes(q) || s.dance.toLowerCase().includes(q)
  )
  if (genrePartial.length > 0) return shuffle(genrePartial)

  // 3. Fuse.js fuzzy search (handles typos, partial words, aliases)
  const results = fuse.search(q, { limit })
  if (results.length > 0 && results[0].score < 0.6) {
    return results.map(r => r.item)
  }

  // 4. No good match → random from pool
  return shuffle(pool).slice(0, limit)
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
