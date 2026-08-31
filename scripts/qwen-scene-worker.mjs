import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

function normaliseUrl(value) { return String(value || '').replace(/\/+$/, ''); }
const SUPABASE_URL = normaliseUrl(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QWEN_VISION_URL = normaliseUrl(process.env.QWEN_VISION_URL || 'http://127.0.0.1:8001');
const QWEN_VISION_MODEL = process.env.QWEN_VISION_MODEL || 'mlx-community/Qwen2.5-VL-3B-Instruct-4bit';
const POLL_MS = Number(process.env.QWEN_SCENE_POLL_MS || 3500);
const TIMEOUT_MS = Number(process.env.QWEN_SCENE_TIMEOUT_MS || 120000);
const MAX_MEDIA_BYTES = 32 * 1024 * 1024;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[SCENE] Missing Supabase configuration.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function jsonFromModel(text) {
  const cleaned = String(text || '').replace(/```json|```/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.search(/[\[{]/); if (start < 0) throw new Error('Vision model returned no JSON.');
  const open = cleaned[start]; const close = open === '{' ? '}' : ']';
  let depth = 0; let quoted = false; let escaped = false;
  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (quoted) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === '"') quoted = false; continue; }
    if (ch === '"') quoted = true;
    else if (ch === open) depth += 1;
    else if (ch === close) { depth -= 1; if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1)); }
  }
  throw new Error('Vision model returned incomplete JSON.');
}

async function fetchMedia(url) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`Media fetch failed (${r.status}).`);
  const type = r.headers.get('content-type') || 'application/octet-stream';
  const buffer = Buffer.from(await r.arrayBuffer());
  if (buffer.byteLength > MAX_MEDIA_BYTES) throw new Error('Media exceeds local scene QA limit.');
  return { type, buffer };
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(out) : reject(new Error(err || `${command} exited ${code}`)));
  });
}

async function imageFrames(media) {
  if (!media.type.startsWith('video/')) return [media];
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cornerstone-scene-'));
  const video = path.join(dir, 'source.mp4');
  await fs.writeFile(video, media.buffer);
  const files = [path.join(dir, 'frame1.jpg'), path.join(dir, 'frame2.jpg'), path.join(dir, 'frame3.jpg')];
  await run('ffmpeg', ['-y', '-i', video, '-vf', 'select=eq(n\\,0)+eq(n\\,mid)+eq(n\\,last)', '-vsync', 'vfr', '-frames:v', '3', files[0]]).catch(async () => {
    await run('ffmpeg', ['-y', '-ss', '0', '-i', video, '-frames:v', '1', files[0]]);
  });
  const existing = [];
  for (const file of files) { try { existing.push({ type: 'image/jpeg', buffer: await fs.readFile(file) }); } catch {} }
  await fs.rm(dir, { recursive: true, force: true });
  if (!existing.length) throw new Error('Could not extract video frames for scene QA.');
  return existing;
}

async function callVision(frames, contract) {
  const content = [];
  for (const frame of frames) content.push({ type: 'image_url', image_url: { url: `data:${frame.type};base64,${frame.buffer.toString('base64')}` } });
  content.push({ type: 'text', text: `You are the local Cornerstone visual QA inspector. Compare the supplied image/video frames ONLY against the written scene contract. Judge visible evidence only. Fail for wrong location, time-of-day mismatch, wrong/missing/extra props, wardrobe mismatch, creator identity drift, excluded objects, impossible anatomy/object interaction, or format/scene composition violations. Do not invent hidden facts. Return JSON only with exactly: {"pass":true|false,"score":0-100,"violations":[],"observations":[],"identity_consistency":"pass|fail|unknown","time_consistency":"pass|fail|unknown","location_consistency":"pass|fail|unknown","prop_consistency":"pass|fail|unknown","wardrobe_consistency":"pass|fail|unknown","exclusion_consistency":"pass|fail|unknown","confidence":"low|medium|high"}. Pass only if the visible result is consistent with every required field and exclusion.` ,} );
  const response = await fetch(`${QWEN_VISION_URL}/v1/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: QWEN_VISION_MODEL, messages: [{ role: 'system', content: 'Strict visual QA. No prose outside JSON.' }, { role: 'user', content: [{ type: 'text', text: `SCENE CONTRACT:\n${JSON.stringify(contract)}` }, ...content] }], temperature: 0, max_tokens: 1200, stream: false }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Local Qwen vision failed (${response.status}): ${body?.error?.message || 'unknown error'}`);
  const text = body?.choices?.[0]?.message?.content || '';
  return jsonFromModel(text);
}

async function claim() {
  const { data, error } = await supabase.from('local_ai_jobs').select('*').eq('job_type', 'scene_verify').eq('status', 'queued').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: claimed, error: updateError } = await supabase.from('local_ai_jobs').update({ status: 'processing', started_at: new Date().toISOString(), error_message: null }).eq('id', data.id).eq('status', 'queued').select('*').maybeSingle();
  if (updateError) throw updateError;
  return claimed;
}

async function process(job) {
  const o = job.options || {};
  const contentQueueId = o.content_queue_id || null;
  const sceneContractId = o.scene_contract_id || null;
  try {
    if (!o.media_url || !o.contract) throw new Error('Scene verification job is missing media_url or contract.');
    const media = await fetchMedia(o.media_url);
    const frames = await imageFrames(media);
    const raw = await callVision(frames, o.contract);
    const passed = Boolean(raw.pass) && Number(raw.score || 0) >= 85 && !['fail'].includes(raw.identity_consistency) && !['fail'].includes(raw.time_consistency) && !['fail'].includes(raw.location_consistency) && !['fail'].includes(raw.prop_consistency) && !['fail'].includes(raw.wardrobe_consistency) && !['fail'].includes(raw.exclusion_consistency);
    const verification = { ...raw, pass: passed, provider: 'local_qwen_vision', model: QWEN_VISION_MODEL, checked_at: new Date().toISOString(), media_url: o.media_url, scene_contract_id: sceneContractId };
    if (sceneContractId) {
      const { error } = await supabase.from('track_b_scene_contracts').update({ status: passed ? 'passed' : 'failed', verification, verified_at: new Date().toISOString() }).eq('id', sceneContractId);
      if (error) throw error;
    }
    if (contentQueueId) {
      const { error } = await supabase.from('content_queue').update({ scene_verification_status: passed ? 'passed' : 'failed', scene_verification: verification, scene_verified_at: new Date().toISOString() }).eq('id', contentQueueId);
      if (error) throw error;
    }
    await supabase.from('local_ai_jobs').update({ status: 'completed', result: JSON.stringify(verification), completed_at: new Date().toISOString(), production_status: passed ? 'scene_verified_pass' : 'scene_verified_fail', error_message: null }).eq('id', job.id);
    console.log(`[SCENE] ${job.id} ${passed ? 'PASS' : 'FAIL'} score=${verification.score} media=${o.media_url}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from('local_ai_jobs').update({ status: 'error', error_message: message, production_status: 'scene_verify_error' }).eq('id', job.id);
    if (contentQueueId) await supabase.from('content_queue').update({ scene_verification_status: 'error', scene_verification: { pass: false, error: message, provider: 'local_qwen_vision' } }).eq('id', contentQueueId);
    console.error(`[SCENE] failed ${job.id}:`, message);
  }
}

console.log(`[SCENE] local vision worker online endpoint=${QWEN_VISION_URL}; model=${QWEN_VISION_MODEL}`);
for (;;) {
  try { const job = await claim(); if (job) await process(job); else await sleep(POLL_MS); }
  catch (error) { console.error('[SCENE] worker loop:', error); await sleep(POLL_MS); }
}
