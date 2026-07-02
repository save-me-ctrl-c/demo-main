const { Router } = require('express');
const { v4: uuid } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// GET /api/mentors — list all AI mentors
router.get('/mentors', (_req, res) => {
  const db = getDb();
  const mentors = db.prepare(`SELECT * FROM mentors ORDER BY students DESC`).all();
  res.json({ mentors: mentors.map(formatMentor) });
});

// GET /api/mentors/:id — single mentor with packs
router.get('/mentors/:id', (req, res) => {
  const db = getDb();
  const mentor = db.prepare(`SELECT * FROM mentors WHERE id = ?`).get(req.params.id);
  if (!mentor) return res.status(404).json({ error: 'Mentor not found' });

  const packs = db.prepare(`SELECT * FROM mentor_packs WHERE mentor_id = ?`).all(req.params.id);
  res.json({ mentor: formatMentor(mentor), packs: packs.map(formatPack) });
});

// GET /api/packs — all teaching packs
router.get('/packs', (_req, res) => {
  const db = getDb();
  const packs = db.prepare(`
    SELECT mp.*, m.name as mentor_name, m.avatar as mentor_avatar
    FROM mentor_packs mp JOIN mentors m ON m.id = mp.mentor_id
    ORDER BY mp.lessons DESC
  `).all();
  res.json({ packs: packs.map(p => ({ ...formatPack(p), mentorName: p.mentor_name, mentorAvatar: p.mentor_avatar })) });
});

// POST /api/onboarding — complete onboarding (save mentor selection)
router.post('/onboarding', requireAuth, (req, res) => {
  const db = getDb();
  const { mentorId, packIds } = req.body;

  db.prepare(`INSERT OR REPLACE INTO user_onboarding (user_id, completed, selected_mentor_id, downloaded_packs) VALUES (?, 1, ?, ?)`)
    .run(req.userId, mentorId || null, (packIds || []).join(','));

  res.json({ ok: true });
});

// GET /api/onboarding — check onboarding status
router.get('/onboarding', requireAuth, (req, res) => {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM user_onboarding WHERE user_id = ?`).get(req.userId);
  res.json({
    completed: !!row?.completed,
    mentorId: row?.selected_mentor_id || null,
    downloadedPacks: row?.downloaded_packs ? row.downloaded_packs.split(',').filter(Boolean) : [],
  });
});

function formatMentor(m) {
  return {
    id: m.id, name: m.name, avatar: m.avatar, specialty: m.specialty,
    description: m.description, color: m.color, level: m.level, students: m.students,
  };
}

function formatPack(p) {
  return {
    id: p.id, mentorId: p.mentor_id, name: p.name, description: p.description,
    icon: p.icon, size: p.size, danceStyle: p.dance_style, lessons: p.lessons, duration: p.duration,
  };
}

module.exports = router;
