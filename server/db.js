const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'afrogo.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
    seedIfEmpty();
    seedMockCredentials();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, phone TEXT UNIQUE, name TEXT NOT NULL, avatar TEXT DEFAULT '👤',
      password_hash TEXT DEFAULT '', password_salt TEXT DEFAULT '',
      bio TEXT DEFAULT '', member_level TEXT DEFAULT 'free', points INTEGER DEFAULT 0,
      followers_count INTEGER DEFAULT 0, following_count INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0, posts INTEGER DEFAULT 0, drafts_count INTEGER DEFAULT 0,
      favorites INTEGER DEFAULT 0, tips_received TEXT DEFAULT '0', region TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, artist TEXT NOT NULL, duration TEXT DEFAULT '3:00',
      genre TEXT DEFAULT '', dance_style TEXT DEFAULT '', color TEXT DEFAULT '#8D8AD1',
      file_url TEXT DEFAULT '', cover_url TEXT DEFAULT '', lyrics TEXT DEFAULT '',
      release_year INTEGER DEFAULT 2024, album TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT DEFAULT '🎵', color TEXT DEFAULT '#8D8AD1',
      song_count INTEGER DEFAULT 0, type TEXT DEFAULT 'online', description TEXT DEFAULT '',
      size TEXT DEFAULT '', downloaded INTEGER DEFAULT 0, locked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id TEXT REFERENCES playlists(id), song_id TEXT REFERENCES songs(id),
      position INTEGER DEFAULT 0, PRIMARY KEY (playlist_id, song_id)
    );
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), "desc" TEXT DEFAULT '',
      song_title TEXT DEFAULT '', song_artist TEXT DEFAULT '', likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0, shares INTEGER DEFAULT 0, tips INTEGER DEFAULT 0,
      color TEXT DEFAULT '#8D8AD1', dance_style TEXT DEFAULT '', region TEXT DEFAULT '',
      verified INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS topics (id TEXT PRIMARY KEY, name TEXT NOT NULL, posts_count TEXT DEFAULT '0');
    CREATE TABLE IF NOT EXISTS rankings (id TEXT PRIMARY KEY, rank INTEGER NOT NULL, name TEXT NOT NULL, score TEXT DEFAULT '0', type TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), title TEXT DEFAULT 'Untitled Draft', color TEXT DEFAULT '#8D8AD1', created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, name TEXT NOT NULL, difficulty TEXT DEFAULT 'Any Level', icon TEXT DEFAULT '💃');
    CREATE TABLE IF NOT EXISTS ai_tools (id TEXT PRIMARY KEY, icon TEXT DEFAULT '✨', label TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), name TEXT NOT NULL, model TEXT DEFAULT '', connected INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS user_likes (user_id TEXT REFERENCES users(id), video_id TEXT REFERENCES videos(id), created_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (user_id, video_id));
    CREATE TABLE IF NOT EXISTS mentors (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar TEXT DEFAULT '🤖', specialty TEXT DEFAULT '',
      description TEXT DEFAULT '', color TEXT DEFAULT '#8D8AD1', level TEXT DEFAULT 'Beginner',
      students TEXT DEFAULT '0'
    );
    CREATE TABLE IF NOT EXISTS mentor_packs (
      id TEXT PRIMARY KEY, mentor_id TEXT REFERENCES mentors(id), name TEXT NOT NULL,
      description TEXT DEFAULT '', icon TEXT DEFAULT '📦', size TEXT DEFAULT '0 MB',
      dance_style TEXT DEFAULT '', lessons INTEGER DEFAULT 0, duration TEXT DEFAULT '0 min'
    );
    CREATE TABLE IF NOT EXISTS user_onboarding (
      user_id TEXT PRIMARY KEY REFERENCES users(id), completed INTEGER DEFAULT 0,
      selected_mentor_id TEXT, downloaded_packs TEXT DEFAULT ''
    );
  `);

  ensureColumn('users', 'password_hash', "TEXT DEFAULT ''");
  ensureColumn('users', 'password_salt', "TEXT DEFAULT ''");
}

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { hash, salt };
}

function setPasswordForPhone(phone, password) {
  const user = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (!user) return;
  const { hash, salt } = hashPassword(password);
  db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE phone = ?')
    .run(hash, salt, phone);
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count > 0) return;

  const { v4: uuid } = require('uuid');

  // ── Users ──
  const users = [];
  const insertUser = db.prepare(`INSERT INTO users (id, phone, name, avatar, bio, member_level, points, followers_count, following_count, likes_count, posts, drafts_count, favorites, tips_received, region) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  [
    ['+233200000001', 'Amina Diallo', '👩🏾‍🦱', 'Dancer · Choreographer · Afrobeat lover\nBased in Accra, Ghana 🇬🇭', 'gold', 12450, 24500, 1280, 142000, 86, 3, 152, '8,920', 'Accra, Ghana'],
    ['+234800000002', 'Chioma Okafor', '👩🏾', 'Amapiano dancer from Lagos', 'free', 5000, 56200, 890, 0, 120, 1, 80, '3,600', 'Lagos, Nigeria'],
    ['+277200000007', 'Oluwaseun Bello', '👨🏾‍🦱', 'Multi-style dancer from SA', 'gold', 45000, 78300, 1500, 0, 180, 0, 250, '14,000', 'Johannesburg, SA'],
  ].forEach(u => { const id = uuid(); users.push({ id }); insertUser.run(id, ...u); });

  // ── SONGS: 9 real ccMixter tracks ──
  const tracks = [
    { title: 'Funky Lagos', artist: 'groucho_marxx', duration: '3:45', genre: 'Afrobeat', dance: 'Afrobeat', color: '#FF6B35', year: 2023, file: 'Funky_Lagos.mp3' },
    { title: 'Nadeya', artist: 'VJ_Memes', duration: '4:12', genre: 'Afrobeat', dance: 'Azonto', color: '#E84855', year: 2022, file: 'Nadeya.mp3' },
    { title: 'For You I Will Go', artist: 'VJ_Memes', duration: '3:28', genre: 'Afro-Fusion', dance: 'Contemporary', color: '#40C4D8', year: 2022, file: 'For_You_I_ll_Go_There.mp3' },
    { title: 'World Fusion Music', artist: 'texasradiofish', duration: '3:55', genre: 'World Fusion', dance: 'Afro-Fusion', color: '#FF8C3D', year: 2023, file: 'World_Fusion_Music.mp3' },
    { title: 'Dance In The Rain', artist: 'zep_hurme', duration: '4:05', genre: 'Dance', dance: 'Amapiano', color: '#FF5C8A', year: 2022, file: 'Dance_In_The_Rain.mp3' },
    { title: 'Gas and Gravity', artist: 'Hieron', duration: '4:30', genre: 'Electronic', dance: 'Contemporary', color: '#448AFF', year: 2023, file: 'Gas_and_Gravity.mp3' },
    { title: 'Take Some Time', artist: 'lazztunes07', duration: '5:15', genre: 'House', dance: 'Amapiano', color: '#B388FF', year: 2021, file: 'Take_Some_Time.mp3' },
    { title: 'Bootlickers (House Remix)', artist: 'PettyPrecious', duration: '3:50', genre: 'House', dance: 'Afrobeat', color: '#FFB703', year: 2023, file: 'Bootlickers_House_Remix.mp3' },
    { title: 'Around The Corner', artist: 'BOCrew', duration: '3:35', genre: 'Groove', dance: 'Afro-Fusion', color: '#1EABBE', year: 2021, file: 'Around_The_Corner.mp3' },
  ];

  const songIds = [];
  const insertSong = db.prepare(`INSERT INTO songs (id, title, artist, duration, genre, dance_style, color, release_year, album, cover_url, lyrics, file_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const t of tracks) {
    const sid = uuid();
    songIds.push(sid);
    const coverId = uuid().slice(0, 8);
    insertSong.run(sid, t.title, t.artist, t.duration, t.genre, t.dance, t.color, t.year, 'ccMixter Collection', `/media/covers/cover_${coverId}.png`, `CC-licensed — ${t.genre} vibes for dancing`, `/api/stream/${t.file}`);
  }

  // ── PLAYLIST: Local Afro Grooves ──
  const plId = uuid();
  db.prepare(`INSERT INTO playlists (id, name, icon, color, song_count, type, description, downloaded) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(plId, 'Local Afro Grooves', '💿', '#FF6B35', tracks.length, 'offline', 'Free CC-licensed Afrobeat, House & Fusion — from ccMixter', 1);
  const insertPS = db.prepare(`INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)`);
  songIds.forEach((sid, i) => insertPS.run(plId, sid, i + 1));

  // ── VIDEOS (real dance clips + metadata) ──
  const videos = [
    { id: uuid(), uid: users[0].id, desc: 'Funky Lagos groove — can\'t stop moving! 🔥 #Afrobeat', song_title: 'Funky Lagos', song_artist: 'groucho_marxx', likes: 12800, comments: 842, shares: 3200, tips: 1200, color: '#FF6B35', dance: 'Afrobeat', region: 'Accra, Ghana', file: '1.mp4' },
    { id: uuid(), uid: users[1].id, desc: 'Nadeya vibes — this beat is everything 🕺 #Afrobeat #Dance', song_title: 'Nadeya', song_artist: 'VJ_Memes', likes: 28400, comments: 1500, shares: 8100, tips: 3600, color: '#E84855', dance: 'Azonto', region: 'Lagos, Nigeria', file: '2.mp4' },
    { id: uuid(), uid: users[2].id, desc: 'Take Some Time — House groove session 💃 #Amapiano #House', song_title: 'Take Some Time', song_artist: 'lazztunes07', likes: 89200, comments: 4800, shares: 22000, tips: 9100, color: '#B388FF', dance: 'Amapiano', region: 'Johannesburg, SA', file: '3.mp4' },
    { id: uuid(), uid: users[0].id, desc: 'World Fusion — bringing cultures together 🌍 #Fusion #Dance', song_title: 'World Fusion Music', song_artist: 'texasradiofish', likes: 15300, comments: 920, shares: 5400, tips: 2100, color: '#FF8C3D', dance: 'Afro-Fusion', region: 'Accra, Ghana', file: '4.mp4' },
  ];
  const insertVideo = db.prepare(`INSERT INTO videos (id, user_id, "desc", song_title, song_artist, likes, comments, shares, tips, color, dance_style, region, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`);
  videos.forEach(v => insertVideo.run(v.id, v.uid, v.desc, v.song_title, v.song_artist, v.likes, v.comments, v.shares, v.tips, v.color, v.dance, v.region));

  // ── TOPICS ──
  const insertTopic = db.prepare(`INSERT INTO topics (id, name, posts_count) VALUES (?, ?, ?)`);
  ['#AfroDance2026|42.1K', '#AmapianoMoves|28.7K', '#DanceTutorial|18.9K', '#HouseGrooves|15.2K', '#AfroFusion|12.5K']
    .forEach(t => { const [n, p] = t.split('|'); insertTopic.run(uuid(), n, p); });

  // ── RANKINGS ──
  const insertRank = db.prepare(`INSERT INTO rankings (id, rank, name, score, type) VALUES (?, ?, ?, ?, ?)`);
  [[1, 'Amina Diallo', '24.5K', 'Top Dancer'], [2, 'Chioma Okafor', '18.2K', 'Rising Star'], [3, 'Oluwaseun Bello', '15.5K', 'Best Choreography']]
    .forEach(r => insertRank.run(uuid(), ...r));

  // ── TEMPLATES ──
  const insertTpl = db.prepare(`INSERT INTO templates (id, name, difficulty, icon) VALUES (?, ?, ?, ?)`);
  [['Azonto Basic', 'Beginner', '💃'], ['Amapiano Groove', 'Intermediate', '🕺'], ['Viral Challenge', 'Any Level', '🔥'], ['House Steps', 'Intermediate', '🎹'], ['Duet Creator', 'Any Level', '👥'], ['Slow Motion Pro', 'Any Level', '🎬']]
    .forEach(t => insertTpl.run(uuid(), ...t));

  // ── AI TOOLS ──
  const insertTool = db.prepare(`INSERT INTO ai_tools (id, icon, label) VALUES (?, ?, ?)`);
  [['✨', 'AI Beautify'], ['🖼️', 'Background'], ['🎨', 'Filters'], ['✂️', 'Trim'], ['📝', 'Subtitles'], ['⏱️', 'Speed']]
    .forEach(t => insertTool.run(uuid(), ...t));

  // ── DEVICES ──
  db.prepare(`INSERT INTO devices (id, user_id, name, model, connected) VALUES (?, ?, ?, ?, ?)`)
    .run(uuid(), users[0].id, 'Transsion Smart Speaker', 'TS-200', 1);

  // ── DRAFTS ──
  const insertDraft = db.prepare(`INSERT INTO drafts (id, user_id, title, color) VALUES (?, ?, ?, ?)`);
  [[users[0].id, 'Funky Lagos Practice', '#FF6B35'], [users[0].id, 'Amapiano Groove', '#B388FF']]
    .forEach(d => insertDraft.run(uuid(), ...d));

  // ── MENTORS (AI Digital Dance Tutors) ──
  const mentors = [
    { id: uuid(), name: 'Zuri', avatar: '🤖💃', specialty: 'Afrobeat & Azonto', desc: 'Afrobeat dance master from Ghana. 10+ years teaching Azonto, Afrobeat, and traditional Ghanaian moves.', color: '#FF6B35', level: 'All Levels', students: '12.4K' },
    { id: uuid(), name: 'Amara', avatar: '🤖🕺', specialty: 'Amapiano & House', desc: 'South African Amapiano specialist. Log drum grooves, viral challenges, and party moves.', color: '#40C4D8', level: 'Beginner+', students: '18.9K' },
    { id: uuid(), name: 'Kofi', avatar: '🤖🎯', specialty: 'Highlife & Fusion', desc: 'Traditional meets modern. Highlife foundations blended with contemporary Afro-fusion choreography.', color: '#FFB703', level: 'Intermediate', students: '8.2K' },
    { id: uuid(), name: 'Nia', avatar: '🤖✨', specialty: 'Kizomba & Semba', desc: 'Angolan Kizomba expert. Sensual, technical, and partner-work mastery.', color: '#FF5C8A', level: 'All Levels', students: '15.1K' },
    { id: uuid(), name: 'Tunde', avatar: '🤖🔥', specialty: 'Street & Viral', desc: 'TikTok viral sensation. Quick-hit routines, challenge choreography, and street dance fusion.', color: '#00E676', level: 'Any Level', students: '28.3K' },
    { id: uuid(), name: 'Sade', avatar: '🤖👑', specialty: 'Afro-Latin Fusion', desc: 'Crossover queen. Blends Afrobeat with Latin rhythms — salsa, bachata, and Afro-Caribbean styles.', color: '#B388FF', level: 'Intermediate+', students: '6.7K' },
  ];
  const insertMentor = db.prepare(`INSERT INTO mentors (id, name, avatar, specialty, description, color, level, students) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  mentors.forEach(m => insertMentor.run(m.id, m.name, m.avatar, m.specialty, m.desc, m.color, m.level, m.students));

  // Mentor teaching packs (downloadable)
  const packs = [
    { mid: mentors[0].id, name: 'Azonto Basics Pack', desc: '10 fundamental Azonto moves with step-by-step breakdown', icon: '💃', size: '48 MB', dance: 'Azonto', lessons: 10, dur: '1h 20m' },
    { mid: mentors[0].id, name: 'Afrobeat Mastery', desc: 'Advanced Afrobeat choreography & freestyle techniques', icon: '🔥', size: '85 MB', dance: 'Afrobeat', lessons: 15, dur: '2h 45m' },
    { mid: mentors[1].id, name: 'Amapiano Grooves', desc: 'Log drum fundamentals & viral Amapiano routines', icon: '🎹', size: '62 MB', dance: 'Amapiano', lessons: 12, dur: '2h 10m' },
    { mid: mentors[1].id, name: 'House Dance Essentials', desc: 'Footwork, jacking, and South African house style', icon: '🏠', size: '55 MB', dance: 'House', lessons: 8, dur: '1h 30m' },
    { mid: mentors[2].id, name: 'Highlife Foundations', desc: 'Traditional Highlife steps & modern fusion', icon: '🎷', size: '40 MB', dance: 'Highlife', lessons: 8, dur: '1h 10m' },
    { mid: mentors[3].id, name: 'Kizomba Connection', desc: 'Partner work, leading/following, sensual Kizomba', icon: '💑', size: '70 MB', dance: 'Kizomba', lessons: 14, dur: '3h 0m' },
    { mid: mentors[4].id, name: 'Viral Challenge Pack', desc: '15 trending dance challenges with tutorials', icon: '📱', size: '95 MB', dance: 'Multi-Style', lessons: 15, dur: '2h 30m' },
    { mid: mentors[5].id, name: 'Afro-Latin Blend', desc: 'Salsa-meets-Afrobeat crossover choreography', icon: '💃🔥', size: '58 MB', dance: 'Afro-Latin', lessons: 10, dur: '1h 50m' },
  ];
  const insertPack = db.prepare(`INSERT INTO mentor_packs (id, mentor_id, name, description, icon, size, dance_style, lessons, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  packs.forEach(p => insertPack.run(uuid(), p.mid, p.name, p.desc, p.icon, p.size, p.dance, p.lessons, p.dur));

  console.log('✅ Database seeded with 9 real audio tracks and related data');
}

function seedMockCredentials() {
  [
    ['+233200000001', 'amina123'],
    ['+234800000002', 'chioma123'],
    ['+277200000007', 'seun123'],
  ].forEach(([phone, password]) => {
    const row = db.prepare('SELECT password_hash FROM users WHERE phone = ?').get(phone);
    if (row && !row.password_hash) setPasswordForPhone(phone, password);
  });
}

module.exports = { getDb, hashPassword };
