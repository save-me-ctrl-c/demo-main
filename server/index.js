const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// ── Static: serve local media files ──
const mediaDir = path.join(__dirname, 'media');
const audioDir = path.join(mediaDir, 'audio');
app.use('/media', express.static(mediaDir, {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp3') || filePath.endsWith('.wav')) {
      res.set('Accept-Ranges', 'bytes');
      res.set('Content-Type', filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav');
    }
  },
}));

const danceDir = path.join(mediaDir, 'dance');
app.use('/media/dance', express.static(danceDir, { maxAge: '7d' }));

// ── Helper: validate filename (prevent path traversal) ──
function isValidFilename(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.includes('..') || name.includes('/') || name.includes('\\')) return false;
  return /\.(mp3|wav|m4a|ogg|flac)$/i.test(name);
}

function isValidVideoFile(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.includes('..') || name.includes('/') || name.includes('\\')) return false;
  return /\.(mp4|webm|mov)$/i.test(name);
}

function parseRangeHeader(range, fileSize) {
  if (!range) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return false;

  let start;
  let end;
  if (match[1] === '' && match[2] === '') return false;
  if (match[1] === '') {
    const suffixLength = parseInt(match[2], 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return false;
    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    start = parseInt(match[1], 10);
    end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= fileSize || end < start) {
    return false;
  }
  return { start, end: Math.min(end, fileSize - 1) };
}

// ── Audio streaming with Range support (for seeking) ──
app.get('/api/stream/:filename', (req, res) => {
  const filename = req.params.filename;

  // Fix #1: Prevent path traversal
  if (!isValidFilename(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.join(audioDir, filename);

  // Fix: async stat instead of sync
  fs.promises.stat(filePath).then(stat => {
    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.mp3' ? 'audio/mpeg' : ext === '.m4a' ? 'audio/mp4' : 'audio/wav';

    const range = req.headers.range;
    if (range) {
      const parsedRange = parseRangeHeader(range, fileSize);

      if (!parsedRange) {
        return res.status(416).json({ error: 'Range Not Satisfiable' });
      }

      const { start, end } = parsedRange;
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }).catch(() => {
    res.status(404).json({ error: 'Audio file not found' });
  });
});

// ── Video streaming ──
app.get('/api/stream-video/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!isValidVideoFile(filename)) return res.status(400).json({ error: 'Invalid filename' });
  const filePath = path.join(danceDir, filename);
  fs.promises.stat(filePath).then(stat => {
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
      const parsedRange = parseRangeHeader(range, fileSize);
      if (!parsedRange) return res.status(416).json({ error: 'Range Not Satisfiable' });
      const { start, end } = parsedRange;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Type': 'video/mp4',
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' });
      fs.createReadStream(filePath).pipe(res);
    }
  }).catch(() => res.status(404).json({ error: 'Video file not found' }));
});

// ── List local audio files ──
app.get('/api/local-songs', (_req, res) => {
  fs.promises.readdir(audioDir).then(files => {
    const audioFiles = files.filter(f => /\.(mp3|wav|m4a|ogg|flac)$/i.test(f));
    Promise.all(audioFiles.map(async f => {
      const stat = await fs.promises.stat(path.join(audioDir, f));
      return {
        name: f.replace(/\.[^.]+$/, ''),
        filename: f,
        size: stat.size,
        url: `/api/stream/${f}`,
      };
    })).then(results => res.json({ files: results }));
  }).catch(() => {
    res.json({ files: [] });
  });
});

// ── Mount API routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api', require('./routes/library'));
app.use('/api', require('./routes/create'));
app.use('/api', require('./routes/mentors'));
app.use('/api/profile', require('./routes/profile'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 for unknown API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && !res.headersSent) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  next();
});

// Init DB async, then start server
const dbReady = getDb(); // DB is lightweight SQLite, fine to init sync
app.listen(PORT, () => {
  console.log(`🎵 AfroGo API server running on http://localhost:${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/api/health`);
  console.log(`   Media:   http://localhost:${PORT}/media/`);
  console.log(`   Stream:  http://localhost:${PORT}/api/stream/{filename}`);
});
