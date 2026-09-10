import { put } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';
import { randomUUID } from 'node:crypto';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function authorized(req) {
  const expected = process.env.ADMIN_API_KEY;
  return !expected || (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim() === expected;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'BLOB_READ_WRITE_TOKEN is required for media uploads' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (body?.type === 'blob.generate-client-token' || body?.type === 'blob.upload-completed') {
      const result = await handleUpload({
        request: req,
        body,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          // Auth from either Authorization header or clientPayload
          let isAuth = authorized(req);
          if (!isAuth && clientPayload) {
            try {
              const payload = JSON.parse(clientPayload);
              const expected = process.env.ADMIN_API_KEY;
              isAuth = !expected || payload.adminKey === expected;
            } catch {}
          }
          if (!isAuth) throw new Error('Unauthorized');
          if (!/^fakecall\/(image|voice)\/[a-zA-Z0-9._-]+$/.test(pathname)) throw new Error('Invalid media path');
          const image = pathname.startsWith('fakecall/image/');
          return {
            allowedContentTypes: image ? ['image/png', 'image/jpeg', 'image/webp'] : ['audio/*', 'video/mp4'],
            maximumSizeInBytes: image ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES,
            addRandomSuffix: true,
            allowOverwrite: false,
          };
        },
      });
      return res.status(200).json(result);
    }

    if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
    const dataUrl = body?.dataUrl;
    const kind = body?.kind === 'voice' ? 'voice' : 'image';
    const match = typeof dataUrl === 'string' && dataUrl.match(/^data:((?:image|audio)\/[a-z0-9.+-]+)(?:;codecs=[^;,]+)?;base64,([a-z0-9+/=\s]+)$/i);
    if (!match) return res.status(400).json({ error: 'A base64 image or audio data URL is required' });
    const mimeType = match[1].toLowerCase();
    if ((kind === 'voice' && !mimeType.startsWith('audio/')) || (kind === 'image' && !mimeType.startsWith('image/'))) {
      return res.status(400).json({ error: 'Media type does not match upload kind' });
    }
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > (kind === 'voice' ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES)) {
      return res.status(400).json({ error: `Media exceeds the ${kind === 'voice' ? '25' : '10'} MB limit` });
    }
    const extension = mimeType.split('/')[1].replace(/[^a-z0-9]/g, '') || 'bin';
    const result = await put(`fakecall/${kind}/${randomUUID()}.${extension}`, bytes, {
      access: 'public', contentType: mimeType, addRandomSuffix: false
    });
    return res.status(201).json({ url: result.url, mimeType });
  } catch (error) {
    console.error('Media upload failed:', error);
    return res.status(502).json({ error: 'Media upload failed' });
  }
}
