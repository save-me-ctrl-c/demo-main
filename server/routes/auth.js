const { Router } = require('express');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const { getDb, hashPassword } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = Router();

// POST /api/auth/login — local mock account login/register
router.post('/login', (req, res) => {
  const { phone, password, name, register } = req.body;
  const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
  const normalizedPassword = typeof password === 'string' ? password : '';

  if (!normalizedPhone || !normalizedPassword) {
    return res.status(400).json({ error: 'Phone number and password are required' });
  }

  const db = getDb();
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(normalizedPhone);

  if (!user) {
    if (!register) {
      return res.status(404).json({ error: 'Account not found' });
    }
    const id = uuid();
    const displayName = name || `User_${normalizedPhone.slice(-4)}`;
    const { hash, salt } = hashPassword(normalizedPassword);
    db.prepare(`
      INSERT INTO users (id, phone, name, avatar, password_hash, password_salt, bio, member_level, region)
      VALUES (?, ?, ?, '👤', ?, ?, '', 'free', '')
    `).run(id, normalizedPhone, displayName, hash, salt);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  } else if (!user.password_hash || !user.password_salt || !verifyPassword(normalizedPassword, user.password_salt, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid phone number or password' });
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

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  const hashBuffer = Buffer.from(hash, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  return hashBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(hashBuffer, expectedBuffer);
}

module.exports = router;
