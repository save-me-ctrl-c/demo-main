const { Router } = require('express');
const { getDb } = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');

const router = Router();

// GET /api/videos — list videos
router.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const videos = db.prepare(`
    SELECT v.*, u.name as user_name, u.avatar as user_avatar, u.followers_count as user_followers
    FROM videos v
    JOIN users u ON v.user_id = u.id
    ORDER BY v.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM videos').get().count;

  const likedIds = getLikedVideoIds(db, req.userId, videos.map(v => v.id));
  const formatted = videos.map(v => formatVideo(v, likedIds.has(v.id)));
  res.json({ videos: formatted, total, page, limit });
});

// GET /api/videos/topics — MUST be before /:id
router.get('/topics', (_req, res) => {
  const db = getDb();
  const topics = db.prepare('SELECT * FROM topics ORDER BY posts_count DESC').all();
  res.json({ topics: topics.map(t => ({ id: t.id, name: t.name, postsCount: t.posts_count })) });
});

// GET /api/videos/rankings — MUST be before /:id
router.get('/rankings', (_req, res) => {
  const db = getDb();
  const rankings = db.prepare('SELECT * FROM rankings ORDER BY rank ASC').all();
  res.json({ rankings: rankings.map(r => ({ id: r.id, rank: r.rank, name: r.name, score: r.score, type: r.type })) });
});

// GET /api/videos/:id — single video
router.get('/:id', optionalAuth, (req, res) => {
  const db = getDb();
  const v = db.prepare(`
    SELECT v.*, u.name as user_name, u.avatar as user_avatar, u.followers_count as user_followers
    FROM videos v
    JOIN users u ON v.user_id = u.id
    WHERE v.id = ?
  `).get(req.params.id);

  if (!v) return res.status(404).json({ error: 'Video not found' });
  const liked = req.userId ? !!db.prepare('SELECT 1 FROM user_likes WHERE user_id = ? AND video_id = ?').get(req.userId, v.id) : false;
  res.json({ video: formatVideo(v, liked) });
});

// POST /api/videos/:id/like — toggle like
router.post('/:id/like', requireAuth, (req, res) => {
  const db = getDb();
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });

  const toggleLike = db.transaction(() => {
    const existing = db.prepare('SELECT 1 FROM user_likes WHERE user_id = ? AND video_id = ?').get(req.userId, req.params.id);
    if (existing) {
      db.prepare('DELETE FROM user_likes WHERE user_id = ? AND video_id = ?').run(req.userId, req.params.id);
      db.prepare('UPDATE videos SET likes = MAX(likes - 1, 0) WHERE id = ?').run(req.params.id);
      return false;
    }
    db.prepare('INSERT INTO user_likes (user_id, video_id) VALUES (?, ?)').run(req.userId, req.params.id);
    db.prepare('UPDATE videos SET likes = likes + 1 WHERE id = ?').run(req.params.id);
    return true;
  });

  const liked = toggleLike();
  const updated = db.prepare('SELECT likes FROM videos WHERE id = ?').get(req.params.id);
  res.json({ likes: updated.likes, liked });
});

function getLikedVideoIds(db, userId, videoIds) {
  if (!userId || videoIds.length === 0) return new Set();
  const placeholders = videoIds.map(() => '?').join(',');
  const rows = db.prepare(`SELECT video_id FROM user_likes WHERE user_id = ? AND video_id IN (${placeholders})`).all(userId, ...videoIds);
  return new Set(rows.map(r => r.video_id));
}

function formatVideo(v, liked = false) {
  return {
    id: v.id,
    userId: v.user_id,
    desc: v.desc,
    songTitle: v.song_title,
    songArtist: v.song_artist,
    likes: v.likes,
    comments: v.comments,
    shares: v.shares,
    tips: v.tips,
    color: v.color,
    danceStyle: v.dance_style,
    region: v.region,
    verified: !!v.verified,
    createdAt: v.created_at,
    liked,
    videoUrl: null, // filled by frontend based on index
    user: {
      name: v.user_name,
      avatar: v.user_avatar,
      verified: !!v.verified,
      followers: formatCount(v.user_followers),
    },
  };
}

// Helper for count display strings
function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

module.exports = router;
