const { Router } = require('express');
const { v4: uuid } = require('uuid');
const { getDb } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = Router();

// POST /api/auth/login — login or register via phone (mock SMS)
router.post('/login', (req, res) => {
  const { phone, name } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const db = getDb();
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

  if (!user) {
    // Auto-register
    const id = uuid();
    const displayName = name || `User_${phone.slice(-4)}`;
    db.prepare(`
      INSERT INTO users (id, phone, name, avatar, bio, member_level, region)
      VALUES (?, ?, ?, '👤', '', 'free', '')
    `).run(id, phone, displayName);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  const token = signToken(user.id);
  res.json({ token, user: sanitizeUser(user) });
});

// POST /api/auth/guest — guest mode
router.post('/guest', (_req, res) => {
  const db = getDb();
  const id = uuid();
  const guestName = `Guest_${id.slice(0, 6)}`;
  db.prepare(`
    INSERT INTO users (id, phone, name, avatar, bio, member_level, region)
    VALUES (?, NULL, ?, '👤', '', 'free', '')
  `).run(id, guestName);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(user.id);
  res.json({ token, user: sanitizeUser(user) });
});

// GET /api/auth/me — get current user
router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: sanitizeUser(user) });
});

function sanitizeUser(u) {
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    avatar: u.avatar,
    bio: u.bio,
    memberLevel: u.member_level,
    points: u.points,
    followersCount: u.followers_count,
    followingCount: u.following_count,
    likesCount: u.likes_count,
    posts: u.posts,
    draftsCount: u.drafts_count,
    favorites: u.favorites,
    tipsReceived: u.tips_received,
    region: u.region,
    createdAt: u.created_at,
  };
}

module.exports = router;
