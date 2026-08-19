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
const RESEARCH_DAYS = 7;
const RESEARCH_CUTOFF = () => Date.now() - RESEARCH_DAYS * 24 * 60 * 60 * 1000;

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
    files.push('personas/duo/cara-lila.md', 'personas/cara/CHARACTER_BIBLE.md', 'personas/lila/persona.md');
  }

  const loaded = [];
  for (const file of files) {
    const content = await readOptional(file);
    if (content.trim()) loaded.push(`### ${file}\n${content.trim()}`);
  }

  return loaded.length
    ? `\n\nCHARACTER SOURCE OF TRUTH\nUse these files as authoritative creative context. Do not invent a different personality, lifestyle world or relationship dynamic.\n\n${loaded.join('\n\n')}`
    : '';
}

function extractTag(xml, tag) {
  const match = String(xml || '').match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 12000);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CornerstoneAIAssets-LiveResearch/1.0',
        Accept: options.accept || 'text/html,application/json,text/plain,*/*',
      },
      signal: controller.signal,
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text, url: response.url || url };
  } catch (error) {
    return { ok: false, status: 0, text: '', url, error: error?.message || String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url) {
  const result = await fetchText(url, { accept: 'application/json', timeoutMs: 12000 });
  if (!result.ok) return null;
  try { return JSON.parse(result.text); } catch { return null; }
}

async function fetchRss(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-GB&gl=GB&ceid=GB:en`;
  const response = await fetchText(url, { accept: 'application/rss+xml,text/xml,*/*', timeoutMs: 12000 });
  if (!response.ok) return [];

  return [...response.text.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .slice(0, 20)
    .map((match) => match[1])
    .map((item) => ({
      title: stripHtml(extractTag(item, 'title')),
      url: extractTag(item, 'link'),
      published: extractTag(item, 'pubDate'),
      source: stripHtml(extractTag(item, 'source')),
      snippet: stripHtml(extractTag(item, 'description')),
    }))
    .filter((item) => item.title);
}

async function fetchRedditTop(subreddit) {
  const data = await fetchJson(`https://www.reddit.com/r/${subreddit}/top.json?t=week&limit=15&raw_json=1`);
  const posts = data?.data?.children || [];
  return posts.map((child) => {
    const post = child?.data || {};
    return {
      platform: 'Reddit',
      sourceType: 'community',
      source: `r/${subreddit}`,
      title: post.title || '',
      published: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : '',
      url: post.permalink ? `https://www.reddit.com${post.permalink}` : '',
      score: Number(post.score || 0),
      comments: Number(post.num_comments || 0),
      text: String(post.selftext || '').slice(0, 5000),
      signal: post.title || post.selftext || '',
    };
  }).filter((item) => Date.parse(item.published || '') >= RESEARCH_CUTOFF());
}

async function fetchTikTokCreativeCenter() {
  const urls = [
    'https://ads.tiktok.com/business/creativecenter/hashtag/all/pc/en?period=7&countryCode=US',
    'https://ads.tiktok.com/business/creativecenter/inspiration/popular/pc/en?region=US',
    'https://ads.tiktok.com/business/creativecenter/hashtag/clothing/pc/en?period=7&countryCode=US',
  ];
  const results = [];
  for (const url of urls) {
    const response = await fetchText(url, { accept: 'text/html,*/*', timeoutMs: 15000 });
    if (!response.ok) continue;
    const text = stripHtml(response.text).slice(0, 24000);
    const hashtags = [...new Set((text.match(/#[A-Za-z0-9_]{2,40}/g) || []).map((x) => x.toLowerCase()))].slice(0, 40);
    results.push({
      platform: 'TikTok',
      sourceType: 'official-creative-center',
      source: 'TikTok Creative Center',
      title: 'Current TikTok Creative Center trend/video page',
      published: new Date().toISOString(),
      url,
      signal: text,
      hashtags,
      evidence: 'Current public Creative Center page. Use as trend-discovery evidence, not as proof that any single hashtag converts.'
    });
  }
  return results;
}

async function fetchInstagramSignals() {
  const queries = [
    'site:instagram.com/reel viral creator August 2026',
    'site:instagram.com/p carousel Instagram creator August 2026',
    'Instagram carousel hook trend August 2026',
    'Instagram reels hook trend August 2026',
  ];
  const rss = (await Promise.all(queries.map(fetchRss))).flat();
  const direct = [];
  for (const url of ['https://www.instagram.com/explore/', 'https://www.instagram.com/reels/']) {
    const response = await fetchText(url, { accept: 'text/html,*/*', timeoutMs: 10000 });
    direct.push({
      platform: 'Instagram',
      sourceType: 'direct-public-check',
      source: 'Instagram public web',
      title: 'Instagram public discovery availability',
      published: new Date().toISOString(),
      url,
      signal: response.ok ? stripHtml(response.text).slice(0, 2500) : `Direct public fetch unavailable (${response.status || 'network error'}).`,
      visualAccess: response.ok && !/log in|login/i.test(response.text),
    });
  }

  return [
    ...rss
      .filter((item) => {
        const t = Date.parse(item.published || '');
        return !Number.isNaN(t) && t >= RESEARCH_CUTOFF();
      })
      .map((item) => ({
        platform: 'Instagram',
        sourceType: 'indexed-public',
        source: item.source || 'Indexed public web',
        title: item.title,
        published: item.published,
        url: item.url,
        signal: item.snippet || item.title,
        evidence: 'Indexed public reference; not a direct Instagram performance feed.',
      })),
    ...direct,
  ];
}

async function buildLiveResearchPack(job) {
  if (!['social_caption_intelligence', 'trend_scan'].includes(job.job_type)) return null;

  const prompt = `${job.user_prompt || ''} ${job.system_prompt || ''}`.toLowerCase();
  const requestedPlatforms = [];
  if (prompt.includes('instagram')) requestedPlatforms.push('Instagram');
  if (prompt.includes('tiktok') || prompt.includes('tick tock')) requestedPlatforms.push('TikTok');
  if (prompt.includes('facebook')) requestedPlatforms.push('Facebook');
  if (prompt.includes('reddit')) requestedPlatforms.push('Reddit');
  if (prompt.includes('fanvue')) requestedPlatforms.push('Fanvue');
  if (!requestedPlatforms.length) requestedPlatforms.push('Instagram', 'TikTok', 'Reddit');

  const research = [];
  const limitations = [];

  if (requestedPlatforms.includes('TikTok')) {
    const tiktok = await fetchTikTokCreativeCenter();
    research.push(...tiktok);
    if (!tiktok.length) limitations.push('TikTok Creative Center was not reachable during this research pass.');
  }

  if (requestedPlatforms.includes('Instagram')) {
    const instagram = await fetchInstagramSignals();
    research.push(...instagram);
    if (!instagram.some((item) => item.sourceType === 'indexed-public')) limitations.push('Instagram direct/public post access was limited; current indexed references were used where available.');
    if (!instagram.some((item) => item.visualAccess)) limitations.push('Instagram carousel image text was not directly readable in this pass; the system must not invent slide text evidence.');
  }

  if (requestedPlatforms.includes('Reddit')) {
    const subs = ['InstagramMarketing', 'TikTokhelp', 'TikTokMarketing', 'ContentCreators'];
    const reddit = (await Promise.all(subs.map(fetchRedditTop))).flat();
    research.push(...reddit);
    if (!reddit.length) limitations.push('Reddit weekly community data was not reachable during this research pass.');
  }

  const queries = [
    'TikTok viral creator format August 2026',
    'Instagram viral reel format August 2026',
    'Instagram carousel text hook August 2026',
    'creator content trends August 2026',
  ];
  if (requestedPlatforms.includes('Fanvue')) queries.push('Fanvue creator promotion conversion August 2026');
  const articles = (await Promise.all(queries.map(fetchRss))).flat()
    .filter((item) => {
      const t = Date.parse(item.published || '');
      return !Number.isNaN(t) && t >= RESEARCH_CUTOFF();
    })
    .map((item) => ({
      platform: /tiktok/i.test(item.title + item.snippet) ? 'TikTok' : /instagram/i.test(item.title + item.snippet) ? 'Instagram' : 'Cross-platform',
      sourceType: 'editorial-indexed',
      source: item.source || 'Indexed web',
      title: item.title,
      published: item.published,
      url: item.url,
      signal: item.snippet || item.title,
    }));
  research.push(...articles);

  if (requestedPlatforms.includes('Fanvue')) {
    for (const [url, label] of [
      ['https://help.fanvue.com/en/articles/11363166-creator-settings-managing-your-tracking-links', 'Fanvue tracking links'],
      ['https://legal.fanvue.com/creator-advertising-promotion', 'Fanvue promotion policy'],
      ['https://www.fanvue.com/blog/go-viral-with-our-social-media-checklist', 'Fanvue social promotion guidance'],
    ]) {
      const source = await fetchOfficial(url, 'Fanvue', label);
      if (source) research.push({ platform: 'Fanvue', sourceType: 'official', ...source, signal: source.snippet });
    }
  }

  const evidence = research
    .filter((item) => !item.published || Date.parse(item.published) >= RESEARCH_CUTOFF() || item.sourceType === 'official' || item.sourceType === 'direct-public-check')
    .slice(0, 80);

  const distinctPlatforms = new Set(evidence.map((item) => item.platform).filter(Boolean)).size;
  const directCurrent = evidence.filter((item) => ['official', 'official-creative-center', 'community'].includes(item.sourceType)).length;
  const confidence = distinctPlatforms >= 3 && directCurrent >= 5 ? 'high' : distinctPlatforms >= 2 && evidence.length >= 5 ? 'medium' : 'low';

  return {
    generatedAt: new Date().toISOString(),
    windowDays: RESEARCH_DAYS,
    confidence,
    requestedPlatforms,
    methodology: 'Fresh public-web research executed at job runtime. Sources are weighted by recency and evidence type. This is not internal account analytics and does not claim private platform performance data.',
    limitations,
    evidence,
  };
}

async function claimJob() {
  const { data, error } = await supabase.from('local_ai_jobs').select('*').eq('status', 'queued').order('created_at', { ascending: true }).limit(1).maybeSingle();
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

async function buildSystemPrompt(job, researchPack) {
  const base = job.system_prompt || 'You are the local creative director for CornerstoneAIAssets.';
  const characterContext = await loadCharacterContext(job);
  const researchContext = researchPack
    ? `\n\nLIVE RESEARCH — FRESH ${researchPack.windowDays}-DAY WINDOW\n${JSON.stringify(researchPack)}\n\nRESEARCH DECISION RULES:\n- Treat this evidence as current-market signal, not as proof of private account performance.\n- Identify repeated mechanisms: opening hook, first-frame treatment, visual pattern, story structure, text-overlay pattern, caption style, CTA, comment trigger, and format.\n- For every major mechanism, decide USE, ADAPT or IGNORE for this creator/photo.\n- Choose ADAPT when the underlying mechanism fits but the exact trend is wrong for the creator, platform, image or brand.\n- Choose IGNORE when forcing it would create generic, dishonest or mismatched content.\n- Never copy wording, creator identity, brand language, or a distinctive piece of content. Abstract the mechanism.\n- For carousel text, only report exact on-image text when it was actually accessible. Otherwise say it was not observed. Never invent slide text evidence.\n- If evidence is weak, return low confidence and say what could not be verified. Do not manufacture certainty.`
    : '';
  const hardVisual = `\n\nHARD VISUAL CONSISTENCY PROTOCOL:\n- Treat concept, caption, script and scene details as factual constraints.\n- Build an internal scene contract: subject(s), location, time, lighting, action, props, wardrobe, composition, emotion, exclusions.\n- The visual prompt must faithfully render that contract.\n- Never add a dealership, showroom, vehicle, office, gym, restaurant, daylight, extra person, unrelated prop, split-screen, collage or different time of day unless explicitly required.\n- A still image is one coherent physical moment, not a montage.\n- Preserve identity, clothing, props and hand/object interactions.\n- Night or early-morning scenes must not contain daylight unless explicitly required.\n- Before returning the result, run a fact-by-fact consistency gate and rewrite any conflict.`;

  return `${base}${characterContext}${researchContext}${hardVisual}\n\nGLOBAL CREATIVE QUALITY RULES:\n- The character bible is the source of truth.\n- Do not drift into generic influencer behaviour.\n- Every idea must have a believable reason for the creator to be in the location and doing the main action.\n- Avoid random props, random secondary people, contradictory wardrobe, impossible settings and disconnected captions.\n- Prefer lived moments, specific observations and natural emotional variation over slogans.\n- Do not make every post educational, motivational, polished or aspirational.\n- Never fabricate claims, social proof, earnings, conversion rates or audience reactions.\n- Do not include chain-of-thought or hidden reasoning in the final answer.`;
}

async function callQwen(job, researchPack) {
  const options = job.options || {};
  const response = await fetch(`${QWEN_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      model: job.model || QWEN_MODEL,
      messages: [
        { role: 'system', content: await buildSystemPrompt(job, researchPack) },
        { role: 'user', content: job.user_prompt },
      ],
      temperature: Number(options.temperature ?? 0.58),
      max_tokens: Number(options.max_tokens ?? 4200),
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
    const researchPack = await buildLiveResearchPack(job);
    const result = await callQwen(job, researchPack);
    let finalResult = result;

    try {
      const parsed = JSON.parse(result);
      if (researchPack && ['social_caption_intelligence', 'trend_scan'].includes(job.job_type)) {
        finalResult = JSON.stringify({ ...parsed, research: researchPack });
      } else {
        finalResult = JSON.stringify(parsed);
      }
    } catch {
      if (researchPack) finalResult = JSON.stringify({ text: result, research: researchPack });
    }

    const { error } = await supabase.from('local_ai_jobs').update({
      status: 'completed',
      result: finalResult,
      completed_at: new Date().toISOString(),
      error_message: null,
      production_status: researchPack ? 'researched' : 'completed',
    }).eq('id', job.id);
    if (error) throw error;
    console.log(`[QWEN] completed ${job.id}${researchPack ? ` with ${researchPack.evidence.length} research records` : ''}`);
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
