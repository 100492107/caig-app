import { createClient } from '@supabase/supabase-js';

function normaliseSupabaseUrl(value) {
  return String(value || '').replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
}

const SUPABASE_URL = normaliseSupabaseUrl(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QWEN_URL = (process.env.QWEN_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const QWEN_MODEL = process.env.QWEN_MODEL || 'mlx-community/Qwen3-8B-4bit';
const POLL_MS = Number(process.env.QWEN_POLL_MS || 4000);
const IDLE_MS = Number(process.env.QWEN_IDLE_MS || 3000);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function claimJob() {
  const { data, error } = await supabase
    .from('local_ai_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: claimed, error: updateError } = await supabase
    .from('local_ai_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString(), error_message: null })
    .eq('id', data.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();
  if (updateError) throw updateError;
  return claimed || null;
}

async function callQwen(job) {
  const options = job.options || {};
  const response = await fetch(`${QWEN_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      model: job.model || QWEN_MODEL,
      messages: [
        { role: 'system', content: job.system_prompt || 'You are the local creative director for CornerstoneAIAssets.' },
        { role: 'user', content: job.user_prompt },
      ],
      temperature: Number(options.temperature ?? 0.8),
      max_tokens: Number(options.max_tokens ?? 768),
      stream: false,
    }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Qwen request failed (${response.status}): ${JSON.stringify(json)}`);
  const result = json?.choices?.[0]?.message?.content;
  if (!result) throw new Error(`Qwen returned no message content: ${JSON.stringify(json)}`);
  return result;
}

async function processJob(job) {
  try {
    const result = await callQwen(job);
    const { error } = await supabase.from('local_ai_jobs').update({
      status: 'completed',
      result,
      completed_at: new Date().toISOString(),
      error_message: null,
    }).eq('id', job.id);
    if (error) throw error;
    console.log(`[QWEN] completed ${job.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[QWEN] failed ${job.id}:`, error);
    await supabase.from('local_ai_jobs').update({ status: 'error', error_message: message }).eq('id', job.id);
  }
}

console.log(`[QWEN] worker online. endpoint=${QWEN_URL}; model=${QWEN_MODEL}; supabase=${SUPABASE_URL}`);
for (;;) {
  try {
    const job = await claimJob();
    if (job) await processJob(job);
    else await sleep(IDLE_MS);
  } catch (error) {
    console.error('[QWEN] worker loop error:', error);
    await sleep(POLL_MS);
  }
}
