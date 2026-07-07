// API wrapper for AfroGo backend
const API_BASE = '/api';

let authToken = localStorage.getItem('afrogo_token');
let guestPromise = null; // dedup concurrent guest login attempts

function setToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('afrogo_token', token);
  } else {
    localStorage.removeItem('afrogo_token');
  }
}

function getToken() {
  return authToken;
}

// Auto-guest if no token yet (called on first authenticated request)
async function ensureToken() {
  if (authToken) return;
  if (!guestPromise) {
    guestPromise = (async () => {
      const res = await fetch(`${API_BASE}/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Guest auth failed');
      const data = await res.json();
      setToken(data.token);
      return data.token;
    })();
  }
  await guestPromise;
}

async function request(path, options = {}) {
  // Auto-auth for endpoints that need it
  const needsAuth = path.startsWith('/drafts') || path.startsWith('/profile') || path.startsWith('/devices') || path.startsWith('/onboarding') || (path.startsWith('/videos/') && path.endsWith('/like'));
  if (needsAuth) await ensureToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Check ok first, then safely parse JSON
  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const errData = await res.json();
      if (errData.error) errorMsg = errData.error;
    } catch { /* non-JSON body */ }
    throw new Error(errorMsg);
  }

  return res.json();
}

// --- Auth ---
export const auth = {
  login: (phone, password, name, register = false) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password, name, register }) }),
  guest: () =>
    request('/auth/guest', { method: 'POST' }),
  me: () =>
    request('/auth/me'),
};

// --- Videos ---
export const videos = {
  list: (page = 1, limit = 20) =>
    request(`/videos?page=${page}&limit=${limit}`),
  get: (id) =>
    request(`/videos/${id}`),
  like: (id) =>
    request(`/videos/${id}/like`, { method: 'POST' }),
  topics: () =>
    request('/videos/topics'),
  rankings: () =>
    request('/videos/rankings'),
};

// --- Library ---
export const library = {
  playlists: (type) =>
    request(`/playlists${type ? `?type=${type}` : ''}`),
  playlist: (id) =>
    request(`/playlists/${id}`),
  songs: () =>
    request('/songs'),
  song: (id) =>
    request(`/songs/${id}`),
  templates: () =>
    request('/templates'),
  aiTools: () =>
    request('/ai-tools'),
};

// --- Create ---
export const createApi = {
  drafts: () =>
    request('/drafts'),
  createDraft: (title, color) =>
    request('/drafts', { method: 'POST', body: JSON.stringify({ title, color }) }),
};

// --- Profile ---
export const profile = {
  get: () =>
    request('/profile'),
  update: (data) =>
    request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  stats: () =>
    request('/profile/stats'),
  devices: () =>
    request('/profile/devices'),
};

// --- Mentors & Onboarding ---
export const mentors = {
  list: () =>
    request('/mentors'),
  get: (id) =>
    request(`/mentors/${id}`),
  packs: () =>
    request('/packs'),
  onboardingStatus: () =>
    request('/onboarding'),
  completeOnboarding: (mentorId, packIds) =>
    request('/onboarding', { method: 'POST', body: JSON.stringify({ mentorId, packIds }) }),
};

export { setToken, getToken };
