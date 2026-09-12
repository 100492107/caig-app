import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.TRACK_B_SOURCE_BUCKET || 'track-b-source-media';
const POLL_MS = Number(process.env.YOUTUBE_SOURCE_POLL_MS || 4000);
const TIMEOUT_MS = Number(process.env.YOUTUBE_SOURCE_TIMEOUT_MS || 20 * 60 * 1000);
const MAX_BYTES = Number(process.env.YOUTUBE_SOURCE_MAX_BYTES || 5 * 1024 * 1024 * 1024);
const PYTHON = process.env.YOUTUBE_PYTHON || path.join(process.cwd(), '.venv-caption', 'bin', 'python');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[YOUTUBE] Missing Supabase configuration.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function run(command, args, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`${command} timed out`)); }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr || `${command} exited with code ${code}`)); });
  });
}

function sourceId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.replace(/^www\./, '') === 'youtu.be') return parsed.pathname.replace(/^\//, '').split('/')[0];
    return parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop() || 'source';
  } catch { return 'source'; }
}

async function claim() {
  const { data, error } = await supabase.from('local_ai_jobs').select('*').eq('job_type', 'youtube_source_ingestion').eq('status', 'queued').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: claimed, error: updateError } = await supabase.from('local_ai_jobs').update({ status: 'processing', started_at: new Date().toISOString(), production_status: 'youtube_downloading', error_message: null }).eq('id', data.id).eq('status', 'queued').select('*').maybeSingle();
  if (updateError) throw updateError;
  return claimed;
}

async function existingMediaJob(ownerId, sourceUrl) {
  const { data, error } = await supabase
    .from('local_ai_jobs')
    .select('id,status,options,error_message')
    .eq('owner_id', ownerId)
    .eq('job_type', 'content_media_ingestion')
    .in('status', ['queued', 'processing', 'completed'])
    .contains('options', { original_url: sourceUrl })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function process(job) {
  const sourceUrl = String(job?.options?.source_url || '').trim();
  if (!sourceUrl) throw new Error('YouTube ingestion job is missing source_url.');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cornerstone-youtube-'));
  const outputTemplate = path.join(tempDir, 'source.%(ext)s');
  try {
    await run(PYTHON, ['-m', 'yt_dlp', '--no-playlist', '--no-part', '--restrict-filenames', '--format', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b', '--merge-output-format', 'mp4', '--max-filesize', String(MAX_BYTES), '--output', outputTemplate, sourceUrl]);
    const files = await fs.readdir(tempDir);
    const mediaName = files.find((name) => /^source\./.test(name) && /\.(mp4|mkv|webm|mov|m4v)$/i.test(name));
    if (!mediaName) throw new Error('YouTube download completed without a playable media file.');
    const localPath = path.join(tempDir, mediaName);
    const stat = await fs.stat(localPath);
    if (stat.size > MAX_BYTES) throw new Error(`Downloaded source exceeds ${Math.round(MAX_BYTES / 1024 / 1024)}MB limit.`);
    const objectPath = `${job.owner_id}/youtube/${sourceId(sourceUrl)}-${crypto.randomUUID()}.mp4`;
    const file = await fs.readFile(localPath);
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, file, { contentType: 'video/mp4', upsert: false });
    if (uploadError) throw uploadError;

    const mediaJob = await existingMediaJob(job.owner_id, sourceUrl);
    let child = mediaJob;
    if (!child) {
      const { data, error } = await supabase.from('local_ai_jobs').insert({
        owner_id: job.owner_id,
        title: `Track B source analysis · ${sourceId(sourceUrl)}`,
        job_type: 'content_media_ingestion',
        model: job.model,
        persona_id: 'cornerstone_content_engine',
        system_prompt: 'Analyse a downloaded public YouTube reference through the Cornerstone source-ingestion pipeline. Do not claim inspection until transcript and visual analysis complete.',
        user_prompt: `Inspect the downloaded YouTube reference from ${sourceUrl}.`,
        options: { bucket: BUCKET, object_path: objectPath, file_name: `youtube-${sourceId(sourceUrl)}.mp4`, content_type: 'video/mp4', original_url: sourceUrl, youtube_parent_job_id: job.id, research_domain: 'TRACK_B_CONTENT_ENGINE', workspace_id: 'track_b' },
        status: 'queued',
        production_status: 'source_queued',
      }).select('id,status').single();
      if (error) throw error;
      child = data;
    }

    const result = { status: 'youtube_downloaded', source_url: sourceUrl, source_object_path: objectPath, media_job_id: child.id, media_job_status: child.status, source_id: sourceId(sourceUrl), bytes: stat.size, pipeline: ['youtube_download', 'private_storage', 'media_ingestion', 'transcript', 'vision', 'source_analysis'] };
    const { error } = await supabase.from('local_ai_jobs').update({ status: 'completed', result: JSON.stringify(result), completed_at: new Date().toISOString(), production_status: 'youtube_downloaded_waiting_analysis', error_message: null }).eq('id', job.id);
    if (error) throw error;
    console.log(`[YOUTUBE] completed ${job.id} -> ${child.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from('local_ai_jobs').update({ status: 'error', error_message: message.includes('No module named') || message.includes('yt_dlp') ? 'yt-dlp is not installed in the local YouTube environment. Run the Cornerstone local setup so yt-dlp is installed, then retry.' : message, production_status: 'youtube_download_error' }).eq('id', job.id);
    console.error(`[YOUTUBE] failed ${job.id}:`, message);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

console.log(`[YOUTUBE] worker online · python=${PYTHON} · bucket=${BUCKET}`);
for (;;) {
  try { const job = await claim(); if (job) await process(job); else await sleep(POLL_MS); }
  catch (error) { console.error('[YOUTUBE] worker loop:', error); await sleep(POLL_MS); }
}
