import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

function normaliseSupabaseUrl(value) { return String(value || '').replace(/\/+$/, '').replace(/\/rest\/v1$/i, ''); }
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readOptional(relativePath) {
  try { return await fs.readFile(path.join(REPO_ROOT, relativePath), 'utf8'); } catch { return ''; }
}

async function loadCharacterContext(job) {
  const persona = String(job.persona_id || '').toLowerCase();
  const userPrompt = String(job.user_prompt || '').toLowerCase();
  const isFanvue = /\bfanvue\b/.test(userPrompt);
  const files = [];
  if (persona === 'cara') {
    files.push('personas/cara/CHARACTER_BIBLE.md', isFanvue ? 'personas/cara/persona-fanvue.md' : 'personas/cara/persona.md', isFanvue ? 'personas/cara/voice-fanvue.md' : 'personas/cara/voice.md');
  } else if (persona === 'lila') {
    files.push('personas/lila/persona.md');
    if (isFanvue) files.push('personas/lila/persona-fanvue.md');
  } else if (persona === 'duo' || persona === 'cara_lila') {
    files.push('personas/duo/cara-lila.md', 'personas/cara/CHARACTER_BIBLE.md', 'personas/lila/persona.md');
  }
  const loaded = [];
  for (const file of files) { const content = await readOptional(file); if (content.trim()) loaded.push(`### ${file}\n${content.trim()}`); }
  return loaded.length ? `\n\nCHARACTER SOURCE OF TRUTH\nUse these files as authoritative creative context. Do not invent a different personality or lifestyle world.\n\n${loaded.join('\n\n')}` : '';
}

function extractTag(xml, tag) {
  const match = String(xml || '').match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}

function stripHtml(value) { return String(value || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim(); }

async function fetchRss(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-GB&gl=GB&ceid=GB:en`;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'CornerstoneAIAssets-LiveResearch/1.0' } });
    if (!response.ok) return [];
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 10).map((m) => m[1]).map((item) => ({
      title: stripHtml(extractTag(item, 'title')),
      url: extractTag(item, 'link'),
      published: extractTag(item, 'pubDate'),
      source: stripHtml(extractTag(item, 'source')),
      snippet: stripHtml(extractTag(item, 'description')),
    })).filter((x) => x.title);
    return items;
  } catch (error) {
    console.warn('[QWEN] live research fetch failed:', error?.message || error);
    return [];
  }
}

async function fetchOfficial(url, source, label) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'CornerstoneAIAssets-LiveResearch/1.0' } });
    if (!response.ok) return null;
    const html = await response.text();
    return { source, title: label, url, published: '', snippet: stripHtml(html).slice(0, 1800) };
  } catch { return null; }
}

async function buildLiveResearchPack(job) {
  if (job.job_type !== 'social_caption_intelligence') return null;
  const lower = `${job.user_prompt || ''} ${job.system_prompt || ''}`.toLowerCase();
  const platformQueries = [];
  if (lower.includes('instagram')) platformQueries.push('Instagram creator captions engagement 2026', 'Instagram creators content trends 2026');
  if (lower.includes('facebook')) platformQueries.push('Facebook creator content captions engagement 2026');
  if (lower.includes('fanvue')) platformQueries.push('Fanvue creator promotion conversion 2026', 'Fanvue social media promotion 2026');
  const queries = platformQueries.length ? platformQueries : ['Instagram creator trends 2026', 'TikTok creator trends 2026', 'social media creator captions 2026'];

  const feeds = (await Promise.all(queries.map(fetchRss))).flat();
  const official = [];
  if (lower.includes('instagram')) official.push(await fetchOfficial('https://ai.meta.com/learn/ai-creativity/ai-for-social-media-captions', 'Meta AI', 'Current caption guidance from Meta AI'));
  if (lower.includes('fanvue')) {
    official.push(await fetchOfficial('https://help.fanvue.com/en/articles/11363166-creator-settings-managing-your-tracking-links', 'Fanvue', 'Fanvue tracking links and conversion measurement'));
    official.push(await fetchOfficial('https://legal.fanvue.com/creator-advertising-promotion', 'Fanvue', 'Fanvue creator promotion policy'));
    official.push(await fetchOfficial('https://www.fanvue.com/blog/go-viral-with-our-social-media-checklist', 'Fanvue', 'Current Fanvue social promotion checklist'));
  }

  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 45;
  const recent = feeds.filter((item) => {
    const t = Date.parse(item.published || '');
    return !Number.isNaN(t) ? t >= cutoff : true;
  }).slice(0, 24);

  const items = [...recent, ...official.filter(Boolean)].map((item) => ({
    source: item.source,
    title: item.title,
    published: item.published,
    url: item.url,
    signal: item.snippet || item.title,
  }));

  return {
    generatedAt: new Date().toISOString(),
    freshnessWindowDays: 45,
    note: 'This is runtime public-web evidence, not CAIG historical performance data. No internal platform analytics are available to the worker.',
    items,
  };
}

async function claimJob() {
  const { data, error } = await supabase.from('local_ai_jobs').select('*').eq('status', 'queued').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: claimed, error: updateError } = await supabase.from('local_ai_jobs').update({ status: 'processing', started_at: new Date().toISOString(), error_message: null }).eq('id', data.id).eq('status', 'queued').select('*').maybeSingle();
  if (updateError) throw updateError;
  return claimed || null;
}

async function buildSystemPrompt(job, researchPack) {
  const base = job.system_prompt || 'You are the local creative director for CornerstoneAIAssets.';
  const wantsPackage = ['video_package', 'content_package', 'repurpose'].includes(job.job_type);
  const characterContext = await loadCharacterContext(job);
  const packageRules = wantsPackage ? '\n\nFor production-oriented jobs, return a clean, machine-friendly CONTENT PACKAGE with HOOK, SCRIPT, SHOT LIST, VISUAL PROMPTS, CAPTION PLAN, B-ROLL, EDIT NOTES and CTA. Do not include chain-of-thought.' : '';
  const liveResearch = researchPack ? `\n\nLIVE RESEARCH PACK — GENERATED AT RUNTIME\n${JSON.stringify(researchPack)}\n\nUse this pack as the only current-market evidence. Do not claim a source proves performance unless the source actually does. Separate evidence from inference.` : '';
  return `${base}${characterContext}${packageRules}${liveResearch}\n\nGLOBAL CREATIVE QUALITY RULES:\n- The character bible is the source of truth. Do not drift into generic influencer behaviour.\n- Every idea must have a believable reason for the creator to be in the location and doing the main action.\n- Avoid random props, random secondary people, contradictory wardrobe, impossible settings and disconnected captions.\n- Prefer lived moments, specific observations and natural emotional variation over slogans.\n- Do not make every post educational, motivational, polished or aspirational.\n- Before returning the final result, perform a private human-quality check: would this person plausibly post this, and does the visual idea actually match the written idea?\n- If the answer is no, rewrite it before returning the result.`;
}

async function callQwen(job, researchPack) {
  const options = job.options || {};
  const response = await fetch(`${QWEN_URL}/v1/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ model: job.model || QWEN_MODEL, messages: [{ role: 'system', content: await buildSystemPrompt(job, researchPack) }, { role: 'user', content: job.user_prompt }], temperature: Number(options.temperature ?? 0.62), max_tokens: Number(options.max_tokens ?? 3400), stream: false }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Qwen request failed (${response.status}): ${JSON.stringify(json)}`);
  const result = cleanModelOutput(json?.choices?.[0]?.message?.content);
  if (!result) throw new Error(`Qwen returned no usable message content: ${JSON.stringify(json)}`);
  return result;
}

async function processJob(job) {
  try {
    const researchPack = await buildLiveResearchPack(job);
    const result = await callQwen(job, researchPack);
    let finalResult = result;
    try {
      const parsed = JSON.parse(result);
      if (parsed && researchPack && job.job_type === 'social_caption_intelligence') parsed.currentSignals = (parsed.currentSignals || []).slice(0, 10);
      finalResult = JSON.stringify(parsed);
    } catch {}
    const { error } = await supabase.from('local_ai_jobs').update({ status: 'completed', result: finalResult, completed_at: new Date().toISOString(), error_message: null, production_status: researchPack ? 'researched' : 'completed' }).eq('id', job.id);
    if (error) throw error;
    console.log(`[QWEN] completed ${job.id}${researchPack ? ' with live research' : ''}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[QWEN] failed ${job.id}:`, error);
    await supabase.from('local_ai_jobs').update({ status: 'error', error_message: message }).eq('id', job.id);
  }
}

console.log(`[QWEN] worker online. endpoint=${QWEN_URL}; model=${QWEN_MODEL}; supabase=${SUPABASE_URL}`);
for (;;) {
  try { const job = await claimJob(); if (job) await processJob(job); else await sleep(IDLE_MS); }
  catch (error) { console.error('[QWEN] worker loop error:', error); await sleep(POLL_MS); }
}
