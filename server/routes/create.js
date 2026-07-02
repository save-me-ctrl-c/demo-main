const { Router } = require('express');
const { v4: uuid } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// GET /api/drafts — list user drafts
router.get('/drafts', requireAuth, (req, res) => {
  const db = getDb();
  const drafts = db.prepare('SELECT * FROM drafts WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json({ drafts: drafts.map(d => ({ id: d.id, title: d.title, color: d.color, createdAt: d.created_at })) });
});

// POST /api/drafts — create a draft
router.post('/drafts', requireAuth, (req, res) => {
  const db = getDb();
  const { title, color } = req.body;
  const id = uuid();
  db.prepare('INSERT INTO drafts (id, user_id, title, color) VALUES (?, ?, ?, ?)')
    .run(id, req.userId, title || 'Untitled Draft', color || '#B388FF');
  const draft = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id);
  res.status(201).json({ draft: { id: draft.id, title: draft.title, color: draft.color, createdAt: draft.created_at } });
});

module.exports = router;
