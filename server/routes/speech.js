const { Router, raw } = require('express');

const router = Router();
const BIGMODEL_ASR_URL = 'https://open.bigmodel.cn/api/paas/v4/audio/transcriptions';
const BIGMODEL_API_KEY = 'YOUR_API_KEY';
const BIGMODEL_ASR_MODEL = 'glm-asr-2512';
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function getApiKey() {
  const key = BIGMODEL_API_KEY.trim();
  return key && key !== 'YOUR_API_KEY' ? key : null;
}

function safeFilename(value, mimeType) {
  const fallback = mimeType.includes('mp4') ? 'voice-command.m4a' : 'voice-command.webm';
  if (!value || typeof value !== 'string') return fallback;
  const filename = value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return filename || fallback;
}

router.post(
  '/speech/transcribe',
  raw({ type: ['audio/*', 'application/octet-stream'], limit: MAX_AUDIO_BYTES }),
  async (req, res) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(503).json({
        error: 'BigModel API key is not configured in server/routes/speech.js.',
      });
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const mimeType = req.get('content-type') || 'audio/webm';
    const filename = safeFilename(req.get('x-audio-filename'), mimeType);

    try {
      const form = new FormData();
      form.append('model', BIGMODEL_ASR_MODEL);
      form.append('stream', 'false');
      form.append('file', new Blob([req.body], { type: mimeType }), filename);

      const upstream = await fetch(BIGMODEL_ASR_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      const payload = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        console.warn('[GLM ASR] Upstream error:', upstream.status, payload);
        return res.status(502).json({
          error: payload.error?.message || payload.message || `GLM ASR request failed (${upstream.status})`,
        });
      }

      const text = payload.text
        || payload.result?.text
        || payload.choices?.[0]?.message?.content
        || '';
      return res.json({ text, model: BIGMODEL_ASR_MODEL });
    } catch (error) {
      console.error('[GLM ASR] Request failed:', error);
      return res.status(502).json({ error: 'Unable to reach GLM ASR service' });
    }
  },
);

module.exports = router;
