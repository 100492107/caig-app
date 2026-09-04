import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.TRACK_B_SOURCE_BUCKET || 'track-b-source-media';
const WHISPER_URL = String(process.env.WHISPER_URL || 'http://127.0.0.1:8787').replace(/\/+$/, '');
const VISION_URL = String(process.env.QWEN_VISION_URL || 'http://127.0.0.1:8001').replace(/\/+$/, '');
const VISION_MODEL = process.env.QWEN_VISION_MODEL || 'mlx-community/Qwen2.5-VL-3B-Instruct-4bit';
const TEXT_MODEL = process.env.QWEN_MODEL || 'mlx-community/Qwen3-8B-4bit';
const POLL_MS = Number(process.env.CONTENT_SOURCE_POLL_MS || 3500);
const TIMEOUT_MS = Number(process.env.CONTENT_SOURCE_TIMEOUT_MS || 180000);
const MAX_BYTES = Number(process.env.CONTENT_SOURCE_MAX_BYTES || 5368709120);
const MAX_FRAMES = Number(process.env.CONTENT_SOURCE_MAX_FRAMES || 5);

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[SOURCE] Missing Supabase configuration.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function run(command, args, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${command} timed out`));
    }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `${command} exited ${code}`));
    });
  });
}

function jsonFromModel(text) {
  const cleaned = String(text || '').replace(/```json|```/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.search(/[\[{]/);
  if (start < 0) throw new Error('Qwen Vision returned no JSON.');
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
  throw new Error('Qwen Vision returned incomplete JSON.');
}

function safeName(value) {
  return path.basename(String(value || 'source')).replace(/[^a-zA-Z0-9._-]+/g, '_');
}

async function getSignedUrl(objectPath) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, 3600);
  if (error || !data?.signedUrl) throw new Error(`Could not sign source media: ${error?.message || 'no signed URL'}`);
  return data.signedUrl;
}

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Source media download failed (${response.status}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) throw new Error(`Source media exceeds ${Math.round(MAX_BYTES / 1024 / 1024)}MB limit.`);
  await fs.writeFile(destination, buffer);
  return { bytes: buffer.byteLength, contentType: response.headers.get('content-type') || 'application/octet-stream' };
}

async function probe(sourcePath) {
  const raw = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size,format_name', '-of', 'json', sourcePath]);
  const parsed = JSON.parse(raw || '{}');
  return { duration: Number(parsed?.format?.duration || 0), size: Number(parsed?.format?.size || 0), format: String(parsed?.format?.format_name || '') };
}

async function extractFrames(sourcePath, duration, dir) {
  if (!duration || duration <= 0) return [];
  const count = Math.max(3, Math.min(MAX_FRAMES, 5));
  const points = Array.from({ length: count }, (_, index) => duration * (index / (count - 1)));
  const frames = [];
  for (let index = 0; index < points.length; index += 1) {
    const framePath = path.join(dir, `frame-${String(index + 1).padStart(2, '0')}.jpg`);
    const timestamp = Math.max(0, Math.min(duration - 0.1, points[index]));
    await run('ffmpeg', ['-y', '-ss', String(timestamp), '-i', sourcePath, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '3', framePath]);
    frames.push({ timestamp, path: framePath, type: 'image/jpeg', buffer: await fs.readFile(framePath) });
  }
  return frames;
}

async function transcribe(sourcePath) {
  const form = new FormData();
  form.append('file', new Blob([await fs.readFile(sourcePath)]), safeName(sourcePath));
  const response = await fetch(`${WHISPER_URL}/transcribe`, { method: 'POST', body: form, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Whisper failed (${response.status}): ${body?.error || 'unknown error'}`);
  return { text: String(body?.text || ''), words: Array.isArray(body?.words) ? body.words : [], segments: Array.isArray(body?.segments) ? body.segments : [] };
}

async function readTextSource(sourcePath) {
  return { text: await fs.readFile(sourcePath, 'utf8'), words: [], segments: [] };
}

async function analyseVision(frames, context) {
  if (!frames.length) return { available: false, reason: 'No visual frames were available for this source.' };
  const content = [
    { type: 'text', text: `SOURCE CONTEXT\n${JSON.stringify(context)}` },
    ...frames.map((frame) => ({ type: 'image_url', image_url: { url: `data:${frame.type};base64,${frame.buffer.toString('base64')}` } })),
    { type: 'text', text: 'Study these frames as reference-content intelligence. Describe visible evidence only. Return JSON only: {"available":true,"visual_format":"","opening_visual":"","composition":"","camera_language":"","editing_rhythm":"","visual_story_engine":"","recurring_visual_patterns":[],"pacing_observations":[],"strengths":[],"weaknesses":[],"original_visual_opportunities":[],"frame_evidence":[{"timestamp":0,"observation":""}],"confidence":"low|medium|high"}' },
  ];
  const response = await fetch(`${VISION_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: VISION_MODEL, messages: [
      { role: 'system', content: 'You are Cornerstone Track B visual intelligence. Study the reference as research. Never reproduce protected creative expression. Visible evidence only. JSON only.' },
      { role: 'user', content },
    ], temperature: 0, max_tokens: 1800, stream: false }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Qwen Vision failed (${response.status}): ${body?.error?.message || 'unknown error'}`);
  return jsonFromModel(body?.choices?.[0]?.message?.content || '');
}

async function queueTextAnalysis({ transcript, vision, metadata }) {
  const prompt = `Analyse this reference source for Cornerstone AI Enterprise Track B. This is research, not imitation. Identify the underlying audience promise, topic appeal, hook mechanics, title/thumbnail relationship, narrative structure, pacing, curiosity loops, emotional triggers, proof/payoff structure, production complexity and weaknesses. Then define an original reconstruction opportunity. Never paraphrase the source script or reproduce distinctive wording.\n\nSOURCE METADATA\n${JSON.stringify(metadata)}\n\nTRANSCRIPT\n${transcript.text.slice(0, 90000)}\n\nVISUAL INTELLIGENCE\n${JSON.stringify(vision)}\n\nReturn JSON only with: {"source_type":"","audience_promise":"","topic_interest":"","hook_mechanics":[],"opening_beat":"","narrative_structure":[],"pacing":"","curiosity_loops":[],"emotional_triggers":[],"proof_and_payoff":"","title_thumbnail_relationship":"","commentary_or_audience_signals":[],"production_complexity":"","weaknesses":[],"use_adapt_ignore":"USE|ADAPT|IGNORE","original_reconstruction":"","originality_constraints":[],"confidence":"low|medium|high"}`;
  const { data, error } = await supabase.from('local_ai_jobs').insert({
    title: `Track B source analysis · ${metadata.fileName || 'reference'}`,
    job_type: 'content_source_analysis',
    model: TEXT_MODEL,
    persona_id: 'cornerstone_content_engine',
    system_prompt: 'You are Cornerstone Track B source-intelligence analyst. Reference content is a teacher, not a template. Analyse mechanics, never copy expression. Evidence-grounded. JSON only.',
    user_prompt: prompt,
    options: { max_tokens: 6500, temperature: 0.2, research: false, content_source_analysis: true, research_domain: 'TRACK_B_CONTENT_ENGINE', workspace_id: 'track_b' },
    status: 'queued',
    production_status: 'source_analysis_queued',
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

async function claim() {
  const { data, error } = await supabase.from('local_ai_jobs').select('*').eq('job_type', 'content_media_ingestion').eq('status', 'queued').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: claimed, error: updateError } = await supabase.from('local_ai_jobs').update({ status: 'processing', started_at: new Date().toISOString(), production_status: 'ingesting' }).eq('id', data.id).eq('status', 'queued').select('*').maybeSingle();
  if (updateError) throw updateError;
  return claimed;
}

async function process(job) {
  const options = job.options || {};
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cornerstone-source-'));
  const sourcePath = path.join(tempDir, safeName(options.file_name || 'source'));
  try {
    if (!options.object_path) throw new Error('Source ingestion job is missing object_path.');
    const signedUrl = await getSignedUrl(options.object_path);
    const downloadMeta = await download(signedUrl, sourcePath);
    const extension = path.extname(sourcePath).toLowerCase();
    const textLike = ['.txt', '.md', '.srt', '.vtt'].includes(extension) || String(downloadMeta.contentType).startsWith('text/');
    const probeResult = textLike ? { duration: 0, size: downloadMeta.bytes, format: extension.slice(1) } : await probe(sourcePath);
    const frames = textLike ? [] : await extractFrames(sourcePath, probeResult.duration, tempDir);
    const transcript = textLike ? await readTextSource(sourcePath) : await transcribe(sourcePath);
    const metadata = {
      bucket: BUCKET,
      objectPath: options.object_path,
      fileName: options.file_name || safeName(sourcePath),
      contentType: downloadMeta.contentType,
      bytes: downloadMeta.bytes,
      duration: probeResult.duration,
      format: probeResult.format,
      frameCount: frames.length,
      frameTimestamps: frames.map((frame) => frame.timestamp),
      processedAt: new Date().toISOString(),
    };
    const vision = await analyseVision(frames, metadata);
    const analysisJobId = await queueTextAnalysis({ transcript, vision, metadata });
    const result = {
      status: 'media_ingested',
      metadata,
      transcript,
      vision,
      text_analysis_job_id: analysisJobId,
      pipeline: ['download', 'probe', 'frames', 'transcript', 'qwen_vision', 'qwen_text', 'unified_evidence'],
    };
    const { error } = await supabase.from('local_ai_jobs').update({ status: 'completed', result: JSON.stringify(result), completed_at: new Date().toISOString(), production_status: 'source_ingested_waiting_text_analysis', error_message: null }).eq('id', job.id);
    if (error) throw error;
    console.log(`[SOURCE] completed ${job.id}; textAnalysis=${analysisJobId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from('local_ai_jobs').update({ status: 'error', error_message: message, production_status: 'source_ingestion_error' }).eq('id', job.id);
    console.error(`[SOURCE] failed ${job.id}:`, message);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

console.log(`[SOURCE] worker online bucket=${BUCKET}; whisper=${WHISPER_URL}; vision=${VISION_URL}; visionModel=${VISION_MODEL}`);
for (;;) {
  try {
    const job = await claim();
    if (job) await process(job);
    else await sleep(POLL_MS);
  } catch (error) {
    console.error('[SOURCE] worker loop:', error);
    await sleep(POLL_MS);
  }
}
