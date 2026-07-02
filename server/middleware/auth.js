const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'afrogo-dev-secret-key-2026';

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Middleware: require valid JWT
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware: optional auth (attaches userId if valid token, otherwise continues)
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(header.slice(7));
      req.userId = payload.userId;
    } catch { /* ignore */ }
  }
  next();
}

module.exports = { signToken, verifyToken, requireAuth, optionalAuth, JWT_SECRET };
