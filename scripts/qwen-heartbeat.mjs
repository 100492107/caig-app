import os from 'node:os';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const qwenUrl = String(process.env.QWEN_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const model = process.env.QWEN_MODEL || 'mlx-community/Qwen3-8B-4bit';
const intervalMs = Number(process.env.QWEN_HEARTBEAT_MS || 5000);

if (!supabaseUrl || !serviceKey) {
  console.error('[QWEN HEARTBEAT] Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function qwenReachable() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${qwenUrl}/v1/models`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function writeHeartbeat() {
  const reachable = await qwenReachable();
  let currentJob = null;

  if (reachable) {
    const { data } = await supabase
      .from('local_ai_jobs')
      .select('id,job_type,title,status,started_at')
      .eq('status', 'processing')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    currentJob = data || null;
  }

  const status = !reachable ? 'offline' : currentJob ? 'busy' : 'online';
  const { error } = await supabase.from('local_ai_worker_heartbeat').upsert({
    id: 'qwen',
    worker_name: 'qwen',
    status,
    model,
    hostname: os.hostname(),
    pid: process.pid,
    last_seen: new Date().toISOString(),
    current_job_id: currentJob?.id || null,
    current_job_type: currentJob?.job_type || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (error) throw error;
  console.log(`[QWEN HEARTBEAT] ${status} · endpoint=${qwenUrl}${currentJob ? ` · ${currentJob.job_type}` : ''}`);
}

process.on('SIGINT', async () => {
  await supabase.from('local_ai_worker_heartbeat').update({ status: 'offline', current_job_id: null, current_job_type: null, updated_at: new Date().toISOString() }).eq('id', 'qwen');
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await supabase.from('local_ai_worker_heartbeat').update({ status: 'offline', current_job_id: null, current_job_type: null, updated_at: new Date().toISOString() }).eq('id', 'qwen');
  process.exit(0);
});

console.log(`[QWEN HEARTBEAT] online-check started. endpoint=${qwenUrl}`);
for (;;) {
  try {
    await writeHeartbeat();
  } catch (error) {
    console.error('[QWEN HEARTBEAT] error:', error);
  }
  await sleep(intervalMs);
}
