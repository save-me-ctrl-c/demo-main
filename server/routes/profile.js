const { Router } = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// GET /api/profile — get current user profile
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const devices = db.prepare('SELECT * FROM devices WHERE user_id = ?').all(req.userId);

  res.json({ profile: formatProfile(user, devices) });
});

// PUT /api/profile — update profile
router.put('/', requireAuth, (req, res) => {
  const db = getDb();
  const { name, avatar, bio } = req.body;

  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (avatar !== undefined) { updates.push('avatar = ?'); params.push(avatar); }
  if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }

  if (updates.length > 0) {
    params.push(req.userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  const devices = db.prepare('SELECT * FROM devices WHERE user_id = ?').all(req.userId);
  res.json({ profile: formatProfile(user, devices) });
});

// GET /api/profile/stats
router.get('/stats', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT posts, drafts_count, favorites, tips_received, followers_count, following_count, likes_count FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    posts: user.posts,
    drafts: user.drafts_count,
    favorites: user.favorites,
    tipsReceived: user.tips_received,
    followersCount: user.followers_count,
    followingCount: user.following_count,
    likesCount: user.likes_count,
  });
});

// GET /api/devices
router.get('/devices', requireAuth, (req, res) => {
  const db = getDb();
  const devices = db.prepare('SELECT * FROM devices WHERE user_id = ?').all(req.userId);
  res.json({ devices: devices.map(d => ({ id: d.id, name: d.name, model: d.model, connected: !!d.connected })) });
});

function formatProfile(u, devices) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    avatar: u.avatar,
    bio: u.bio,
    memberLevel: u.member_level,
    points: u.points,
    followers: formatCount(u.followers_count),
    following: formatShortCount(u.following_count),
    likes: formatCount(u.likes_count),
    posts: u.posts,
    drafts: u.drafts_count,
    favorites: u.favorites,
    tipsReceived: u.tips_received,
    region: u.region,
    devices: devices.map(d => ({ id: d.id, name: d.name, model: d.model, connected: !!d.connected })),
  };
}

function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function formatShortCount(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n);
}

module.exports = router;
