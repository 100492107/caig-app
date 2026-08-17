import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MPT_URL = (process.env.MPT_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const MPT_VOICE_NAME = process.env.MPT_VOICE_NAME || 'en-AU-NatashaNeural-Female';
const POLL_MS = Number(process.env.MPT_POLL_MS || 2500);
const LOOP_IDLE_MS = Number(process.env.MPT_IDLE_MS || 4000);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function safeStatus(data) {
  return String(data?.data?.status ?? data?.status ?? data?.data?.task_status ?? '').toLowerCase();
}

function findFilePath(data) {
  const d = data?.data ?? data ?? {};
  return d.file_path
    || d.video_url
    || d.path
    || d.file
    || (Array.isArray(d.videos) && d.videos[0])
    || (Array.isArray(d.combined_videos) && d.combined_videos[0])
    || null;
}

function normalizeMptFilePath(filePath) {
  if (typeof filePath !== 'string') return null;
  const cleaned = filePath.replace(/\\/g, '/');
  const storageMarker = '/storage/tasks/';
  const storageIndex = cleaned.indexOf(storageMarker);
  if (storageIndex >= 0) return cleaned.slice(storageIndex + storageMarker.length).replace(/^\/+/, '');
  const tasksMarker = '/tasks/';
  const tasksIndex = cleaned.indexOf(tasksMarker);
  if (tasksIndex >= 0) return cleaned.slice(tasksIndex + tasksMarker.length).replace(/^\/+/, '');
  return cleaned.replace(/^\/+/, '');
}

function buildDownloadCandidates(filePath) {
  const normalized = normalizeMptFilePath(filePath);
  const candidates = [];
  if (normalized) candidates.push(`${MPT_URL}/api/v1/download/${normalized.split('/').map(encodeURIComponent).join('/')}`);
  if (filePath) {
    const stripped = String(filePath).replace(/^\/+/, '');
    candidates.push(`${MPT_URL}/api/v1/download/${stripped.split('/').map(encodeURIComponent).join('/')}`);
  }
  return [...new Set(candidates)];
}

function buildMptPayload(job) {
  const p = job.payload || {};
  const payload = {
    video_subject: p.video_subject || p.hook || 'Short-form social video',
    video_script: p.video_script || p.caption || '',
    video_terms: p.video_terms || p.visual_direction || '',
    video_aspect: p.video_aspect || '9:16',
    video_concat_mode: p.video_concat_mode || 'random',
    video_transition_mode: p.video_transition_mode || 'None',
    video_clip_duration: Number(p.video_clip_duration || 5),
    video_clip_speed: Number(p.video_clip_speed || 1),
    match_materials_to_script: Boolean(p.match_materials_to_script ?? true),
    video_count: Number(p.video_count || 1),
    video_source: p.video_source || 'pexels',
    video_materials: Array.isArray(p.video_materials) ? p.video_materials : [],
    subtitle_enabled: Boolean(p.subtitle_enabled ?? true),
    subtitle_position: p.subtitle_position || 'bottom',
    custom_position: Number(p.custom_position || 70),
    font_name: p.font_name || 'STHeitiMedium.ttc',
    text_fore_color: p.text_fore_color || '#FFFFFF',
    text_background_color: Boolean(p.text_background_color ?? false),
    rounded_subtitle_background: Boolean(p.rounded_subtitle_background ?? false),
    font_size: Number(p.font_size || 60),
    stroke_color: p.stroke_color || '#000000',
    stroke_width: Number(p.stroke_width ?? 1.5),
    n_threads: Number(p.n_threads || 2),
    paragraph_number: Number(p.paragraph_number || 1),
  };

  const optionalStringFields = [
    'custom_audio_file',
    'video_language',
    'bgm_type',
    'bgm_file',
    'video_music_prompt',
    'sonilo_bgm_prompt',
    'video_script_prompt',
    'custom_system_prompt',
  ];
  for (const key of optionalStringFields) {
    const value = p[key];
    if (typeof value === 'string' && value.trim() !== '') payload[key] = value;
  }

  const requestedVoice = typeof p.voice_name === 'string' ? p.voice_name.trim() : '';
  payload.voice_name = requestedVoice || MPT_VOICE_NAME;

  const optionalNumericFields = [
    ['voice_volume', 1],
    ['voice_rate', 1],
    ['bgm_volume', 0.2],
  ];
  for (const [key, fallback] of optionalNumericFields) {
    if (p[key] !== undefined && p[key] !== null && p[key] !== '') payload[key] = Number(p[key]);
    else payload[key] = fallback;
  }

  return payload;
}

async function enqueueToMpt(job) {
  const response = await fetch(`${MPT_URL}/api/v1/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(buildMptPayload(job)),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`MPT create failed (${response.status}): ${JSON.stringify(json)}`);
  const taskId = json?.data?.task_id || json?.task_id;
  if (!taskId) throw new Error(`MPT did not return task_id: ${JSON.stringify(json)}`);
  return taskId;
}

async function waitForMpt(taskId) {
  const deadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < deadline) {
    const response = await fetch(`${MPT_URL}/api/v1/tasks/${encodeURIComponent(taskId)}`, { headers: { Accept: 'application/json' } });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`MPT task query failed (${response.status}): ${JSON.stringify(json)}`);
    const status = safeStatus(json);
    const filePath = findFilePath(json);
    if ((['completed', 'complete', 'success', 'finished', 'done'].includes(status) || json?.data?.state === 1) && filePath) return { json, filePath };
    if (['failed', 'error', 'cancelled', 'canceled'].includes(status) || json?.data?.state === -1) {
      throw new Error(`MPT task ${taskId} ended with failure: ${JSON.stringify(json)}`);
    }
    await sleep(POLL_MS);
  }
  throw new Error(`MPT task ${taskId} timed out after 20 minutes.`);
}

async function downloadAndStore(filePath, jobId) {
  let lastError = null;
  for (const url of buildDownloadCandidates(filePath)) {
    try {
      const response = await fetch(url, { headers: { Accept: 'video/mp4,application/octet-stream,*/*' } });
      if (!response.ok) {
        lastError = new Error(`MPT download failed (${response.status}) for ${filePath} via ${url}`);
        continue;
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const storagePath = `creative/mpt/${jobId}.mp4`;
      const { error } = await supabase.storage.from('post-images').upload(storagePath, buffer, {
        contentType: 'video/mp4',
        upsert: true,
      });
      if (error) throw new Error(`Supabase video upload failed: ${error.message}`);
      const { data } = supabase.storage.from('post-images').getPublicUrl(storagePath);
      return { storagePath, publicUrl: data.publicUrl };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`Unable to download MPT file ${filePath}`);
}

async function claimJob() {
  const { data, error } = await supabase
    .from('mpt_video_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: claimed, error: updateError } = await supabase
    .from('mpt_video_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString(), error_message: null })
    .eq('id', data.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();
  if (updateError) throw updateError;
  return claimed || null;
}

async function recoverProcessingJob() {
  const { data, error } = await supabase
    .from('mpt_video_jobs')
    .select('*')
    .in('status', ['processing', 'error'])
    .not('mpt_task_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function processJob(job) {
  try {
    let taskId = job.mpt_task_id;
    if (!taskId) {
      taskId = await enqueueToMpt(job);
      await supabase.from('mpt_video_jobs').update({ mpt_task_id: taskId }).eq('id', job.id);
    }
    if (job.status === 'error') {
      await supabase.from('mpt_video_jobs').update({ status: 'processing', error_message: null }).eq('id', job.id);
    }
    console.log(`[MPT] processing ${job.id}; task=${taskId}`);
    const result = await waitForMpt(taskId);
    console.log(`[MPT] task complete ${taskId}; file=${result.filePath}`);
    const stored = await downloadAndStore(result.filePath, job.id);
    console.log(`[MPT] stored ${job.id}; path=${stored.storagePath}`);
    const { error } = await supabase.from('mpt_video_jobs').update({
      status: 'completed',
      file_path: result.filePath,
      output_path: stored.storagePath,
      output_url: stored.publicUrl,
      completed_at: new Date().toISOString(),
      error_message: null,
    }).eq('id', job.id);
    if (error) throw error;
    console.log(`[MPT] completed ${job.id} -> ${stored.publicUrl}`);
  } catch (error) {
    console.error(`[MPT] failed ${job.id}:`, error);
    await supabase.from('mpt_video_jobs').update({
      status: 'error',
      error_message: error instanceof Error ? error.message : String(error),
    }).eq('id', job.id);
  }
}

console.log(`[MPT] worker online. MPT=${MPT_URL}; voice=${MPT_VOICE_NAME}`);
for (;;) {
  try {
    let job = await claimJob();
    if (!job) job = await recoverProcessingJob();
    if (job) await processJob(job);
    else await sleep(LOOP_IDLE_MS);
  } catch (error) {
    console.error('[MPT] worker loop error:', error);
    await sleep(LOOP_IDLE_MS);
  }
}
