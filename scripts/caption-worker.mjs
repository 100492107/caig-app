import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const execFileAsync = promisify(execFile);

function normaliseSupabaseUrl(value) {
  return String(value || '').replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
}

const SUPABASE_URL = normaliseSupabaseUrl(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FFMPEG_BIN = process.env.FFMPEG_BIN || 'ffmpeg';
const WHISPER_URL = (process.env.WHISPER_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const CAPTION_POLL_MS = Number(process.env.CAPTION_POLL_MS || 4000);
const WORKER_IDLE_MS = Number(process.env.CAPTION_IDLE_MS || 4000);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safe = (value, fallback = '') => String(value ?? fallback);

async function claimJob() {
  const { data, error } = await supabase
    .from('caption_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: claimed, error: updateError } = await supabase
    .from('caption_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString(), error_message: null })
    .eq('id', data.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();
  if (updateError) throw updateError;
  return claimed || null;
}

function escapeAssText(text) {
  return safe(text).replace(/[{}\\]/g, '').replace(/\r?\n/g, ' ');
}

function hexToAss(hex) {
  const clean = safe(hex, '#FFFFFF').replace('#', '').padEnd(6, 'F').slice(0, 6);
  const r = clean.slice(0, 2); const g = clean.slice(2, 4); const b = clean.slice(4, 6);
  return `${b}${g}${r}`.toUpperCase();
}

function styleConfig(style) {
  const map = {
    cara_editorial: { font: 'Arial', size: 62, primary: '#FFFFFF', secondary: '#F7D77B', outline: 2, bold: true, marginV: 170 },
    lila_minimal: { font: 'Arial', size: 48, primary: '#FFFFFF', secondary: '#D6D8DF', outline: 1, bold: false, marginV: 150 },
    creator_bold: { font: 'Arial', size: 58, primary: '#FFFFFF', secondary: '#FF5C7A', outline: 3, bold: true, marginV: 155 },
    clean_subtitles: { font: 'Arial', size: 42, primary: '#FFFFFF', secondary: '#FFFFFF', outline: 2, bold: false, marginV: 125 },
  };
  return map[style] || map.cara_editorial;
}

function formatAssTime(seconds) {
  const totalCs = Math.max(0, Math.round(Number(seconds || 0) * 100));
  const cs = totalCs % 100;
  const totalSeconds = Math.floor(totalCs / 100);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function normalizeWords(job) {
  if (Array.isArray(job.word_timestamps) && job.word_timestamps.length) {
    return job.word_timestamps
      .map((w) => ({ start: Number(w.start), end: Number(w.end), word: safe(w.word || w.text).trim() }))
      .filter((w) => w.word && Number.isFinite(w.start) && Number.isFinite(w.end) && w.end > w.start);
  }
  const transcript = safe(job.transcript).trim();
  if (!transcript) return [];
  return transcript.split(/\s+/).map((word, index) => ({
    start: +(index * 0.42).toFixed(2),
    end: +((index + 1) * 0.42).toFixed(2),
    word,
  }));
}

async function transcribeLocal(filePath) {
  if (!WHISPER_URL) return null;
  const bytes = await readFile(filePath);
  const form = new FormData();
  form.append('file', new Blob([bytes]), path.basename(filePath));
  form.append('word_timestamps', 'true');
  const response = await fetch(`${WHISPER_URL}/transcribe`, { method: 'POST', body: form });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Local Whisper transcription failed (${response.status}): ${JSON.stringify(json)}`);
  const words = json?.words || json?.segments?.flatMap((segment) => segment.words || []) || [];
  return words.map((w) => ({ start: Number(w.start ?? w.start_time), end: Number(w.end ?? w.end_time), word: w.word ?? w.text })).filter((w) => w.word);
}

function chunkWords(words, maxWords = 5) {
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) chunks.push(words.slice(i, i + maxWords));
  return chunks;
}

function createAss(job, words) {
  const cfg = styleConfig(job.style);
  const opts = job.options || {};
  const primary = hexToAss(cfg.primary);
  const secondary = hexToAss(cfg.secondary);
  const outline = hexToAss('#000000');
  const alignment = job.position === 'upper_center' ? 8 : job.position === 'center' ? 5 : 2;
  const marginV = job.position === 'upper_center' ? 180 : job.position === 'center' ? 60 : cfg.marginV;
  const hook = escapeAssText(job.hook);
  const lines = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1080',
    'PlayResY: 1920',
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: CAIG,${cfg.font},${cfg.size},&H00${primary},&H00${secondary},&H00${outline},&H99000000,${cfg.bold ? -1 : 0},0,0,0,100,100,0,0,1,${cfg.outline},2,${alignment},70,70,${marginV},1`,
    `Style: HOOK,${cfg.font},58,&H00${primary},&H00${secondary},&H00000000,&H99000000,${cfg.bold ? -1 : 0},0,0,0,100,100,0,0,1,2,2,8,70,70,80,1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  if (hook) lines.push(`Dialogue: 0,${formatAssTime(0)},${formatAssTime(Math.min(2.8, words.at(-1)?.end || 2.8))},HOOK,,0,0,80,,${hook}`);

  const chunks = chunkWords(words, job.style === 'clean_subtitles' ? 7 : 5);
  for (const chunk of chunks) {
    const start = chunk[0].start;
    const end = chunk.at(-1).end + 0.06;
    let text = '';
    for (const word of chunk) {
      const durationCs = Math.max(1, Math.round((word.end - word.start) * 100));
      text += `{\\kf${durationCs}}${escapeAssText(word.word)} `;
    }
    lines.push(`Dialogue: 1,${formatAssTime(start)},${formatAssTime(end)},CAIG,,0,0,0,,${text.trim()}`);
  }

  if (opts.punch_in !== false) {
    // A subtle global scale/zoom can be added to the filtergraph without touching caption timing.
  }
  return lines.join('\n') + '\n';
}

async function runFfmpeg(inputPath, assPath, outputPath, aspect) {
  const vf = aspect === '1:1'
    ? `scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,subtitles=${assPath}`
    : aspect === '16:9'
      ? `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,subtitles=${assPath}`
      : `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,subtitles=${assPath}`;
  const args = ['-y', '-i', inputPath, '-vf', vf, '-c:v', 'libx264', '-preset', process.env.FFMPEG_PRESET || 'medium', '-crf', process.env.FFMPEG_CRF || '18', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outputPath];
  await execFileAsync(FFMPEG_BIN, args, { maxBuffer: 10 * 1024 * 1024 });
}

async function downloadFile(url, target) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Source download failed (${response.status})`);
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(target, Buffer.from(arrayBuffer));
}

async function processJob(job) {
  const workdir = path.join(os.tmpdir(), `caig-caption-${job.id}`);
  await mkdir(workdir, { recursive: true });
  const inputPath = path.join(workdir, 'source.mp4');
  const assPath = path.join(workdir, 'captions.ass');
  const outputPath = path.join(workdir, 'captioned.mp4');
  try {
    await downloadFile(job.source_url, inputPath);
    let words = normalizeWords(job);
    if (job.options?.auto_transcribe && WHISPER_URL) {
      const localWords = await transcribeLocal(inputPath);
      if (localWords?.length) words = localWords;
    }
    if (!words.length) throw new Error('No word timestamps or transcript available. Supply a transcript or configure WHISPER_URL.');
    const ass = createAss({ ...job, options: job.options || {} }, words);
    await writeFile(assPath, ass, 'utf8');
    await runFfmpeg(inputPath, assPath, outputPath, job.aspect_ratio || '9:16');
    const buffer = await readFile(outputPath);
    const storagePath = `creative/captions/${job.id}.mp4`;
    const { error: uploadError } = await supabase.storage.from('post-images').upload(storagePath, buffer, { contentType: 'video/mp4', upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('post-images').getPublicUrl(storagePath);
    const { error: updateError } = await supabase.from('caption_jobs').update({ status: 'completed', word_timestamps: words, output_path: storagePath, output_url: data.publicUrl, completed_at: new Date().toISOString(), error_message: null }).eq('id', job.id);
    if (updateError) throw updateError;
    console.log(`[CAPTION] completed ${job.id} -> ${data.publicUrl}`);
  } finally {
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
  }
}

console.log(`[CAPTION] worker online. ffmpeg=${FFMPEG_BIN}; whisper=${WHISPER_URL}; supabase=${SUPABASE_URL}`);
for (;;) {
  try {
    const job = await claimJob();
    if (job) {
      try {
        await processJob(job);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[CAPTION] failed ${job.id}:`, error);
        await supabase.from('caption_jobs').update({ status: 'error', error_message: message }).eq('id', job.id);
      }
    } else await sleep(WORKER_IDLE_MS);
  } catch (error) {
    console.error('[CAPTION] worker loop error:', error);
    await sleep(CAPTION_POLL_MS);
  }
}
