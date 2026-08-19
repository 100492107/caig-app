import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

function normaliseSupabaseUrl(value) {
  return String(value || '').replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
}

function cleanModelOutput(value) {
  let text = String(value ?? '');
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  text = text.replace(/<analysis>[\s\S]*?<\/analysis>/gi, '');
  text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
  text = text.replace(/^\s*(<\|im_end\|>|<\|endoftext\|>)\s*$/gim, '');
  return text.trim();
}

const SUPABASE_URL = normaliseSupabaseUrl(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QWEN_URL = (process.env.QWEN_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const QWEN_MODEL = process.env.QWEN_MODEL || 'mlx-community/Qwen3-8B-4bit';
const POLL_MS = Number(process.env.QWEN_POLL_MS || 4000);
const IDLE_MS = Number(process.env.QWEN_IDLE_MS || 3000);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readOptional(relativePath) {
  try {
    return await fs.readFile(path.join(REPO_ROOT, relativePath), 'utf8');
  } catch {
    return '';
  }
}

async function loadCharacterContext(job) {
  const persona = String(job.persona_id || '').toLowerCase();
  const userPrompt = String(job.user_prompt || '').toLowerCase();
  const isFanvue = /\bfanvue\b/.test(userPrompt);
  const files = [];

  if (persona === 'cara') {
    files.push('personas/cara/CHARACTER_BIBLE.md');
    files.push(isFanvue ? 'personas/cara/persona-fanvue.md' : 'personas/cara/persona.md');
    files.push(isFanvue ? 'personas/cara/voice-fanvue.md' : 'personas/cara/voice.md');
  } else if (persona === 'lila') {
    files.push('personas/lila/persona.md');
    if (isFanvue) files.push('personas/lila/persona-fanvue.md');
  } else if (persona === 'duo' || persona === 'cara_lila') {
    files.push('personas/duo/cara-lila.md');
    files.push('personas/cara/CHARACTER_BIBLE.md');
    files.push('personas/lila/persona.md');
  }

  const loaded = [];
  for (const file of files) {
    const content = await readOptional(file);
    if (content.trim()) loaded.push(`### ${file}\n${content.trim()}`);
  }

  return loaded.length
    ? `\n\nCHARACTER SOURCE OF TRUTH\nUse these files as the authoritative creative context. Do not invent a different personality, lifestyle world or relationship dynamic.\n\n${loaded.join('\n\n')}`
    : '';
}

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

async function buildSystemPrompt(job) {
  const base = job.system_prompt || 'You are the local creative director for CornerstoneAIAssets.';
  const wantsPackage = ['video_package', 'content_package', 'repurpose'].includes(job.job_type);
  const characterContext = await loadCharacterContext(job);
  const packageRules = wantsPackage
    ? '\n\nFor production-oriented jobs, return a clean, machine-friendly CONTENT PACKAGE with these headings in order:\nHOOK\nSCRIPT\nSHOT LIST\nVISUAL PROMPTS\nCAPTION PLAN\nB-ROLL\nEDIT NOTES\nCTA\nDo not include chain-of-thought or meta commentary. Write only the usable production output.'
    : '';

  return `${base}${characterContext}${packageRules}\n\nGLOBAL CREATIVE QUALITY RULES:\n- The character bible is the source of truth. Do not drift into generic influencer behaviour.\n- Every idea must have a believable reason for the creator to be in the location and doing the main action.\n- Avoid random props, random secondary people, contradictory wardrobe, impossible settings and disconnected captions.\n- Prefer lived moments, specific observations and natural emotional variation over slogans.\n- Do not make every post educational, motivational, polished or aspirational. Real people have ordinary moments, small failures, humour, moods and contradictions.\n- Before returning the final result, perform a private human-quality check: would this person plausibly post this, and does the visual idea actually match the written idea?\n- If the answer is no, rewrite it before returning the result.\n\nHARD VISUAL CONSISTENCY PROTOCOL:\n- Treat the written concept, caption, script and scene lock as factual constraints, not suggestions.\n- Build an internal SCENE CONTRACT before finalising: subjects, exact location, time of day, lighting, action, required props, wardrobe, composition, emotional tone and explicit exclusions.\n- The VISUAL PROMPT must be a faithful rendering of that SCENE CONTRACT. Do not substitute a more common, more visually convenient or more generic location or action.\n- Never introduce a vehicle, dealership, showroom, office, gym, restaurant, daylight, extra person, unrelated prop or different time of day unless the written concept explicitly requires it.\n- Never describe a still image as a montage, sequence, split-screen, collage, diptych or multiple simultaneous locations. One still means one coherent physical moment.\n- Preserve continuity of identity, clothing, props, hand/object interaction, camera position and physical space.\n- When the scene specifies night or early morning, prohibit daylight, sunbeams, blue daytime skies and bright exterior light unless the concept explicitly requires them.\n- Required details must survive into the final visual prompt. Do not omit them because they are inconvenient for image generation.\n- Before returning the result, run a final fact-by-fact consistency gate: every scene fact must appear consistently in the visual direction, and every negative constraint must remain enforced. If anything conflicts, rewrite the package.\n- Do not return a production package that leaves sceneLock fields blank when the concept provides enough information to specify them.`;
}

async function callQwen(job) {
  const options = job.options || {};
  const response = await fetch(`${QWEN_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      model: job.model || QWEN_MODEL,
      messages: [
        { role: 'system', content: await buildSystemPrompt(job) },
        { role: 'user', content: job.user_prompt },
      ],
      temperature: Number(options.temperature ?? 0.62),
      max_tokens: Number(options.max_tokens ?? 3400),
      stream: false,
    }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Qwen request failed (${response.status}): ${JSON.stringify(json)}`);
  const result = cleanModelOutput(json?.choices?.[0]?.message?.content);
  if (!result) throw new Error(`Qwen returned no usable message content: ${JSON.stringify(json)}`);
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
