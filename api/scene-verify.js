import { createClient } from '@supabase/supabase-js';

const MODEL = process.env.SCENE_QA_MODEL || 'claude-sonnet-4-20250514';
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

function clients(req) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const auth = String(req.headers.authorization || '');
  const publicClient = anon ? createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: auth ? { headers: { Authorization: auth } } : undefined }) : null;
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return { publicClient, service, auth };
}

async function isAuthorised(req, publicClient) {
  const auth = String(req.headers.authorization || '');
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return { kind: 'cron', userId: null };
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !publicClient) return null;
  const { data } = await publicClient.auth.getUser(token);
  return data?.user ? { kind: 'user', userId: data.user.id } : null;
}

function jsonFromModel(text) {
  const cleaned = String(text || '').replace(/```json|```/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.search(/[\[{]/);
  if (start < 0) throw new Error('Scene QA model returned no JSON.');
  const open = cleaned[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
    }
  }
  throw new Error('Scene QA model returned incomplete JSON.');
}

async function readMedia(url) {
  if (!url || !/^https?:\/\//i.test(url)) throw new Error('mediaUrl must be an http(s) URL.');
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Could not fetch media (${response.status}).`);
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength && contentLength > MAX_MEDIA_BYTES) throw new Error('Media is larger than the scene QA limit.');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_MEDIA_BYTES) throw new Error('Media is larger than the scene QA limit.');
  return { contentType, bytes: buffer.toString('base64') };
}

async function analyseImage(media, contract) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('SCENE_QA_NOT_CONFIGURED: ANTHROPIC_API_KEY is missing.');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: 'You are a strict visual QA inspector. Compare the supplied image against the written scene contract. Judge only visible evidence. Do not infer hidden details. Treat creator identity drift, time-of-day mismatch, wrong location, missing/extra props, wardrobe mismatch, impossible hands/object interactions and excluded elements as failures. Return JSON only.',
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: media.contentType.startsWith('image/') ? media.contentType : 'image/jpeg', data: media.bytes } },
          { type: 'text', text: `SCENE CONTRACT:\n${JSON.stringify(contract)}\n\nReturn exactly {"pass":true|false,"score":0-100,"violations":[""],"observations":[""],"identity_consistency":"pass|fail|unknown","time_consistency":"pass|fail|unknown","location_consistency":"pass|fail|unknown","prop_consistency":"pass|fail|unknown","wardrobe_consistency":"pass|fail|unknown","exclusion_consistency":"pass|fail|unknown"}. Pass only when the visible media is consistent with all required fields and exclusions.` },
        ],
      }],
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Scene QA provider failed (${response.status}): ${body?.error?.message || 'unknown error'}`);
  return jsonFromModel(body?.content?.map((part) => part?.text || '').join(''));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const runtime = clients(req);
  if (!runtime) return res.status(500).json({ error: 'Supabase server configuration is incomplete' });
  const auth = await isAuthorised(req, runtime.publicClient);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const contract = req.body?.contract;
    const mediaUrl = String(req.body?.mediaUrl || req.body?.posterUrl || '').trim();
    const contentQueueId = req.body?.contentQueueId || null;
    const sceneContractId = req.body?.sceneContractId || null;
    if (!contract || typeof contract !== 'object') return res.status(400).json({ error: 'Scene contract is required.' });
    if (!mediaUrl) return res.status(400).json({ error: 'mediaUrl or posterUrl is required.' });

    const media = await readMedia(mediaUrl);
    const result = await analyseImage(media, contract);
    const passed = Boolean(result?.pass) && Number(result?.score || 0) >= 85;
    const verification = { ...result, pass: passed, model: MODEL, checked_at: new Date().toISOString(), media_url: mediaUrl };

    if (sceneContractId) {
      const { error } = await runtime.service.from('track_b_scene_contracts').update({ status: passed ? 'passed' : 'failed', verification, verified_at: new Date().toISOString() }).eq('id', sceneContractId);
      if (error) throw error;
    }
    if (contentQueueId) {
      const { error } = await runtime.service.from('content_queue').update({ scene_verification_status: passed ? 'passed' : 'failed', scene_verification: verification, scene_verified_at: new Date().toISOString() }).eq('id', contentQueueId);
      if (error) throw error;
    }

    return res.status(200).json({ pass: passed, verification });
  } catch (error) {
    console.error('[SCENE_QA]', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
