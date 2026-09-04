import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QWEN_URL = (process.env.QWEN_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const QWEN_MODEL = process.env.QWEN_MODEL || 'mlx-community/Qwen3-8B-4bit';
const POLL_MS = Number(process.env.QWEN_POLL_MS || 4000);
const IDLE_MS = Number(process.env.QWEN_IDLE_MS || 3000);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESEARCH_DAYS = 7;
const CUTOFF = () => Date.now() - RESEARCH_DAYS * 24 * 60 * 60 * 1000;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cleanOutput = (value) => String(value ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<analysis>[\s\S]*?<\/analysis>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').trim();
async function readOptional(file) { try { return await fs.readFile(path.join(REPO_ROOT, file), 'utf8'); } catch { return ''; } }
async function fetchText(url, options = {}) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), options.timeoutMs || 12000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'CornerstoneAI-Research/1.0', Accept: options.accept || 'text/html,application/json,text/plain,*/*' }, signal: controller.signal });
    return { ok: r.ok, status: r.status, text: await r.text(), url: r.url || url };
  } catch (error) { return { ok: false, status: 0, text: '', url, error: error?.message || String(error) }; }
  finally { clearTimeout(timer); }
}
async function fetchJson(url) { const r = await fetchText(url, { accept: 'application/json', timeoutMs: 12000 }); if (!r.ok) return null; try { return JSON.parse(r.text); } catch { return null; } }
function stripHtml(v) { return String(v || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim(); }
function rssTag(xml, tag) { const m = String(xml || '').match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i')); return m ? stripHtml(m[1]) : ''; }
async function fetchRss(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-GB&gl=GB&ceid=GB:en`;
  const r = await fetchText(url, { accept: 'application/rss+xml,text/xml,*/*', timeoutMs: 12000 }); if (!r.ok) return [];
  return [...r.text.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 20).map((m) => ({ title: rssTag(m[1], 'title'), url: rssTag(m[1], 'link'), published: rssTag(m[1], 'pubDate'), source: rssTag(m[1], 'source'), signal: rssTag(m[1], 'description') })).filter((x) => x.title);
}
async function fetchReddit(subreddit) {
  const data = await fetchJson(`https://www.reddit.com/r/${subreddit}/top.json?t=week&limit=15&raw_json=1`); const posts = data?.data?.children || [];
  return posts.map((child) => { const p = child?.data || {}; return { platform: 'Reddit', sourceType: 'community', source: `r/${subreddit}`, title: p.title || '', published: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : '', url: p.permalink ? `https://www.reddit.com${p.permalink}` : '', score: Number(p.score || 0), comments: Number(p.num_comments || 0), signal: `${p.title || ''}\n${String(p.selftext || '').slice(0, 4000)}` }; }).filter((x) => !x.published || Date.parse(x.published) >= CUTOFF());
}
async function fetchTikTok(topic) {
  const encoded = encodeURIComponent(String(topic || 'creator').trim().toLowerCase());
  const urls = [`https://ads.tiktok.com/business/creativecenter/hashtag/${encoded}/pc/en?period=7&countryCode=US`, 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/pc/en?region=US'];
  const out = [];
  for (const url of urls) { const r = await fetchText(url, { timeoutMs: 15000 }); if (!r.ok) continue; out.push({ platform: 'TikTok', sourceType: 'official-creative-center', source: 'TikTok Creative Center', title: `Current public Creative Center signal · ${topic}`, published: new Date().toISOString(), url, signal: stripHtml(r.text).slice(0, 20000), evidence: 'Public current trend-discovery signal. Not private account analytics.' }); }
  return out;
}
async function fetchInstagram(topic) {
  const queries = [`site:instagram.com/reel ${topic} viral format 2026`, `site:instagram.com/p ${topic} carousel trend 2026`, `Instagram ${topic} reels hook format 2026`];
  const rss = (await Promise.all(queries.map(fetchRss))).flat();
  return rss.map((x) => ({ platform: 'Instagram', sourceType: 'indexed-public', source: x.source || 'Indexed public web', title: x.title, published: x.published, url: x.url, signal: x.signal || x.title, evidence: 'Indexed public reference; not direct private account performance.' }));
}
function extract(prompt, label, fallback = '') { const m = String(prompt || '').match(new RegExp(`${label}:\\s*([^\\n]+)`, 'i')); return m ? m[1].trim() : fallback; }
function domainFor(job) {
  const explicit = String(job?.options?.research_domain || '').trim().toUpperCase(); if (explicit) return explicit;
  const p = `${job?.system_prompt || ''}\n${job?.user_prompt || ''}`.toLowerCase();
  if (p.includes('track_a_revenue_recovery')) return 'TRACK_A_REVENUE_RECOVERY';
  if (p.includes('track_a_automotive_b2b')) return 'TRACK_A_REVENUE_RECOVERY';
  if (p.includes('track_b_content_engine')) return 'TRACK_B_CONTENT_ENGINE';
  if (p.includes('youtube_longform_business_money')) return 'TRACK_B_CONTENT_ENGINE';
  if (p.includes('track_b_creator_growth') || /\bcara\b|\blila\b/.test(p)) return 'TRACK_B_CREATOR_GROWTH';
  return '';
}
function researchSpec(job) {
  const domain = domainFor(job); const prompt = `${job?.user_prompt || ''}\n${job?.system_prompt || ''}`;
  if (domain === 'TRACK_A_REVENUE_RECOVERY') return {
    domain, topic: `${extract(prompt, 'VERTICAL', 'lead-driven business')} revenue leakage`, platforms: ['Google News', 'Reddit'], reddit: ['smallbusiness', 'sales', 'AiForSmallBusiness'],
    queries: ['lead follow up revenue leakage sales opportunities 2026', 'missed enquiries stale leads no shows quote follow up 2026', 'CRM lead response pipeline leakage conversion 2026', 'sales opportunity reactivation follow up automation 2026', 'missed sales opportunities customer follow up 2026'],
    firewall: 'Only revenue leakage, lead handling, sales follow-up, pipeline recovery and the selected business context are valid evidence. Customer vertical is not the niche.'
  };
  if (domain === 'TRACK_B_CONTENT_ENGINE') return {
    domain, topic: `${extract(prompt, 'NICHE', 'content')} audience and format intelligence`, platforms: ['Google News', 'Reddit', 'TikTok', 'Instagram'], reddit: ['NewTubers', 'PartneredYoutube', 'ContentCreators'],
    queries: [`${extract(prompt, 'NICHE', 'content')} YouTube high performing formats 2026`, `${extract(prompt, 'NICHE', 'content')} long form storytelling retention 2026`, `${extract(prompt, 'NICHE', 'content')} YouTube titles thumbnails hook trends 2026`, `${extract(prompt, 'NICHE', 'content')} TikTok Shorts hooks formats 2026`],
    firewall: 'Evidence must stay inside the selected niche/channel and public content-performance context. Reference content is studied for mechanism, not copied.'
  };
  const niche = extract(prompt, 'NICHE', 'creator lifestyle'); const creator = extract(prompt, 'CREATOR', 'Cara and Lila');
  return { domain: 'TRACK_B_CREATOR_GROWTH', topic: `${creator} · ${niche}`, platforms: ['TikTok', 'Instagram', 'Reddit', 'Google News'], reddit: ['InstagramMarketing', 'TikTokMarketing', 'ContentCreators'], queries: [`TikTok ${niche} creator format 2026`, `Instagram ${niche} reel carousel trend 2026`, `${niche} creator content trend 2026`], firewall: 'Only creator-growth and the selected niche context are evidence.' };
}
async function loadCharacterContext(job) {
  const persona = String(job.persona_id || '').toLowerCase(); const prompt = String(job.user_prompt || '').toLowerCase(); const fanvue = /\bfanvue\b/.test(prompt); const files = [];
  if (persona === 'cara') files.push('personas/cara/CHARACTER_BIBLE.md', fanvue ? 'personas/cara/persona-fanvue.md' : 'personas/cara/persona.md', fanvue ? 'personas/cara/voice-fanvue.md' : 'personas/cara/voice.md');
  else if (persona === 'lila') files.push('personas/lila/persona.md', ...(fanvue ? ['personas/lila/persona-fanvue.md'] : []));
  else if (persona === 'duo' || persona === 'cara_lila') files.push('personas/duo/cara-lila.md', 'personas/cara/CHARACTER_BIBLE.md', 'personas/lila/persona.md');
  const loaded = []; for (const file of files) { const content = await readOptional(file); if (content.trim()) loaded.push(`### ${file}\n${content.trim()}`); }
  return loaded.length ? `\n\nCHARACTER SOURCE OF TRUTH\n${loaded.join('\n\n')}` : '';
}
async function buildResearch(job) {
  if (!(job?.options?.research === true || ['trend_scan', 'social_caption_intelligence', 'content_engine'].includes(job.job_type))) return null;
  const spec = researchSpec(job); if (!spec.domain) return null;
  const evidence = [];
  for (const query of spec.queries) { const items = await fetchRss(query); evidence.push(...items.map((x) => ({ ...x, platform: 'Google News', sourceType: 'editorial-indexed', query, domain: spec.domain }))); }
  if (spec.domain === 'TRACK_B_CONTENT_ENGINE' || spec.domain === 'TRACK_B_CREATOR_GROWTH') {
    evidence.push(...(await fetchTikTok(spec.topic)).map((x) => ({ ...x, domain: spec.domain })));
    evidence.push(...(await fetchInstagram(spec.topic)).map((x) => ({ ...x, domain: spec.domain })));
  }
  for (const sub of spec.reddit) evidence.push(...(await fetchReddit(sub)).map((x) => ({ ...x, domain: spec.domain })));
  const filtered = evidence.filter((x) => x.domain === spec.domain).filter((x) => !x.published || Date.parse(x.published) >= CUTOFF() || ['official-creative-center'].includes(x.sourceType)).slice(0, 100);
  return { generatedAt: new Date().toISOString(), windowDays: RESEARCH_DAYS, researchDomain: spec.domain, targetTopic: spec.topic, confidence: filtered.length >= 12 ? 'high' : filtered.length >= 6 ? 'medium' : 'low', requestedPlatforms: spec.platforms, firewall: spec.firewall, methodology: 'Fresh public-web research run independently for this job domain. Results from other workspaces are not merged.', limitations: filtered.length ? [] : ['No qualifying current public evidence was retrieved.'], evidence: filtered };
}
async function callQwen(job, researchPack) {
  const researchContext = researchPack ? `\n\nLIVE RESEARCH\nDomain: ${researchPack.researchDomain}\nTopic: ${researchPack.targetTopic}\nConfidence: ${researchPack.confidence}\nFirewall: ${researchPack.firewall}\nEvidence:\n${JSON.stringify(researchPack.evidence)}\n\nUse repeated mechanisms, not isolated outliers. Separate evidence from inference. Never copy distinctive wording, creator identity, branding, footage or execution.` : '';
  const character = await loadCharacterContext(job);
  const system = `${job.system_prompt || 'You are Cornerstone AI Enterprise local intelligence.'}${character}${researchContext}\n\nUNIVERSAL QUALITY RULES:\n- Evidence is workspace-scoped.\n- Never invent private analytics, metrics, testimonials or source facts.\n- For Track A, problem domain is revenue leakage, not automotive.\n- For Track B, the selected niche is the operating boundary but may change based on an explicit operator decision.\n- Treat reference media as research input. Build materially original outputs.\n- Do not reveal hidden reasoning or chain-of-thought.`;
  const r = await fetch(`${QWEN_URL}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: job.model || QWEN_MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: job.user_prompt }], temperature: Number(job.options?.temperature ?? 0.55), max_tokens: Number(job.options?.max_tokens ?? 5000), stream: false }) });
  const json = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`Qwen request failed (${r.status}): ${JSON.stringify(json)}`); const result = cleanOutput(json?.choices?.[0]?.message?.content); if (!result) throw new Error('Qwen returned no usable message content.'); return result;
}
async function claimJob() {
  const { data, error } = await supabase.from('local_ai_jobs').select('*').eq('status', 'queued').order('created_at', { ascending: true }).limit(1).maybeSingle(); if (error) throw error; if (!data) return null;
  const { data: claimed, error: updateError } = await supabase.from('local_ai_jobs').update({ status: 'processing', started_at: new Date().toISOString(), error_message: null }).eq('id', data.id).eq('status', 'queued').select('*').maybeSingle(); if (updateError) throw updateError; return claimed || null;
}
async function processJob(job) {
  try {
    const research = await buildResearch(job); const raw = await callQwen(job, research); let result = raw;
    try { const parsed = JSON.parse(raw); result = JSON.stringify(research ? { ...parsed, research } : parsed); } catch { result = JSON.stringify(research ? { text: raw, research } : { text: raw }); }
    const { error } = await supabase.from('local_ai_jobs').update({ status: 'completed', result, completed_at: new Date().toISOString(), error_message: null, production_status: research ? 'researched' : 'completed' }).eq('id', job.id); if (error) throw error;
    console.log(`[QWEN] completed ${job.id} domain=${research?.researchDomain || 'none'} evidence=${research?.evidence?.length || 0}`);
  } catch (error) { const message = error instanceof Error ? error.message : String(error); console.error(`[QWEN] failed ${job.id}:`, error); await supabase.from('local_ai_jobs').update({ status: 'error', error_message: message }).eq('id', job.id); }
}
console.log(`[QWEN] worker online. endpoint=${QWEN_URL}; model=${QWEN_MODEL}; research firewall=enabled`);
for (;;) { try { const job = await claimJob(); if (job) await processJob(job); else await sleep(IDLE_MS); } catch (error) { console.error('[QWEN] worker loop error:', error); await sleep(POLL_MS); } }
