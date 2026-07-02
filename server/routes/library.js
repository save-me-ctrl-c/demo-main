const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// GET /api/playlists — list playlists
router.get('/playlists', (req, res) => {
  const db = getDb();
  const { type } = req.query;

  let playlists;
  if (type && type !== 'all') {
    playlists = db.prepare('SELECT * FROM playlists WHERE type = ? ORDER BY created_at DESC').all(type);
  } else {
    playlists = db.prepare('SELECT * FROM playlists ORDER BY created_at DESC').all();
  }

  res.json({ playlists: playlists.map(formatPlaylist) });
});

// GET /api/playlists/:id — playlist with songs
router.get('/playlists/:id', (req, res) => {
  const db = getDb();
  const pl = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!pl) return res.status(404).json({ error: 'Playlist not found' });

  const songs = db.prepare(`
    SELECT s.*, p.type as playlist_type FROM songs s
    JOIN playlist_songs ps ON s.id = ps.song_id
    JOIN playlists p ON p.id = ps.playlist_id
    WHERE ps.playlist_id = ?
    ORDER BY ps.position ASC
  `).all(req.params.id);

  res.json({
    playlist: formatPlaylist(pl),
    songs: songs.map(s => formatSong(s, pl.type)),
  });
});

// GET /api/songs — list all songs (with offline status via EXISTS)
router.get('/songs', (req, res) => {
  const db = getDb();
  const songs = db.prepare(`
    SELECT s.*, EXISTS(
      SELECT 1 FROM playlist_songs ps JOIN playlists p ON p.id = ps.playlist_id
      WHERE ps.song_id = s.id AND p.type = 'offline'
    ) as is_offline
    FROM songs s ORDER BY s.title ASC
  `).all();
  res.json({ songs: songs.map(s => formatSong(s, s.is_offline ? 'offline' : 'online')) });
});

// GET /api/songs/:id — single song
router.get('/songs/:id', (req, res) => {
  const db = getDb();
  const song = db.prepare(`
    SELECT s.*, EXISTS(
      SELECT 1 FROM playlist_songs ps JOIN playlists p ON p.id = ps.playlist_id
      WHERE ps.song_id = s.id AND p.type = 'offline'
    ) as is_offline
    FROM songs s WHERE s.id = ?
  `).get(req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });
  res.json({ song: formatSong(song, song.is_offline ? 'offline' : 'online') });
});

// GET /api/templates
router.get('/templates', (_req, res) => {
  const db = getDb();
  const templates = db.prepare('SELECT * FROM templates').all();
  res.json({ templates: templates.map(t => ({ id: t.id, name: t.name, difficulty: t.difficulty, icon: t.icon })) });
});

// GET /api/ai-tools
router.get('/ai-tools', (_req, res) => {
  const db = getDb();
  const tools = db.prepare('SELECT * FROM ai_tools').all();
  res.json({ tools: tools.map(t => ({ id: t.id, icon: t.icon, label: t.label })) });
});

function formatPlaylist(p) {
  return {
    id: p.id,
    name: p.name,
    icon: p.icon,
    color: p.color,
    songs: p.song_count,   // Keep as `songs` for frontend compat, but it's a count
    songCount: p.song_count,
    type: p.type,
    description: p.description,
    size: p.size || undefined,
    downloaded: !!p.downloaded,
    locked: !!p.locked,
    lessons: p.type === 'teaching' ? 12 : undefined,
    duration: p.type === 'teaching' ? '2h 30m' : undefined,
    createdAt: p.created_at,
  };
}

function formatSong(s, playlistType) {
  const types = (s.playlist_types || playlistType || '').toString().split(',');
  const songType = types.includes('offline') ? 'offline' : 'online';
  return {
    id: s.id,
    title: s.title,
    artist: s.artist,
    duration: s.duration,
    genre: s.genre,
    dance: s.dance_style,
    color: s.color,
    fileUrl: s.file_url || undefined,
    coverUrl: s.cover_url || undefined,
    lyrics: s.lyrics || undefined,
    album: s.album || undefined,
    releaseYear: s.release_year || undefined,
    type: songType,
  };
}

module.exports = router;
