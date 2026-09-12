import { requireUser, sameOrigin } from '../lib/auth.js';

const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MODEL = process.env.QWEN_MODEL || 'mlx-community/Qwen3-8B-4bit';

function clean(value) {
  return String(value ?? '').trim();
}

function youtubeUrl(raw) {
  const value = clean(raw);
  if (!value) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const allowed = new Set(['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com']);
  if (!allowed.has(host)) return null;
  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\//, '').split('/')[0];
    if (!id) return null;
  } else if (url.pathname === '/watch') {
    if (!url.searchParams.get('v')) return null;
  } else if (!/^\/(shorts|embed|live)\//.test(url.pathname)) {
    return null;
  }
  url.searchParams.delete('list');
  url.searchParams.delete('start_radio');
  return url.toString();
}

async function supabase(path, options = {}) {
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    ...(options.headers || {}),
  };
  return fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Authorization, Cookie');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Supabase server configuration is incomplete' });

  let user;
  try {
    user = await requireUser(req);
  } catch (error) {
    return res.status(500).json({ error: error?.message || String(error) });
  }
  if (!user?.id) return res.status(401).json({ error: 'Authentication required' });

  const sourceUrl = youtubeUrl(req.body?.url);
  if (!sourceUrl) {
    return res.status(400).json({ error: 'Enter a valid public YouTube video URL. Playlists are not accepted.' });
  }

  const row = {
    owner_id: user.id,
    title: `YouTube source · ${sourceUrl}`,
    job_type: 'youtube_source_ingestion',
    model: MODEL,
    persona_id: 'cornerstone_content_engine',
    system_prompt: 'You are the Cornerstone YouTube source acquisition controller. Download the requested public YouTube video for local evidence inspection. Never claim analysis has happened until the downloaded media is passed through the source-analysis pipeline.',
    user_prompt: `Acquire this single public YouTube source for analysis: ${sourceUrl}`,
    options: {
      source_url: sourceUrl,
      research_domain: 'TRACK_B_CONTENT_ENGINE',
      workspace_id: 'track_b',
      original_url: sourceUrl,
      requested_at: new Date().toISOString(),
    },
    status: 'queued',
    production_status: 'youtube_source_queued',
  };

  try {
    const response = await supabase('/rest/v1/local_ai_jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text || `Supabase queue failed (${response.status})`);
    const job = JSON.parse(text)?.[0];
    if (!job?.id) throw new Error('YouTube ingestion job was not created.');
    return res.status(202).json({ queued: true, jobId: job.id, status: job.status, sourceUrl });
  } catch (error) {
    console.error('[YOUTUBE_INGEST_QUEUE]', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
