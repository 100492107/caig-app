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

async function fetchTikTokCreativeCenter(topic = 'creator') {
  const safeTopic = String(topic || 'creator').trim().toLowerCase().replace(/\s+/g, '%20');
  const urls = [
    `https://ads.tiktok.com/business/creativecenter/hashtag/${encodeURIComponent(safeTopic)}/pc/en?period=7&countryCode=US`,
    'https://ads.tiktok.com/business/creativecenter/inspiration/popular/pc/en?region=US',
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
      title: `Current TikTok Creative Center signal page · ${topic}`,
      published: new Date().toISOString(),
      url,
      signal: text,
      hashtags,
      evidence: `Current public Creative Center page scoped to ${topic}. Use as trend-discovery evidence, not proof of private account performance.`,
    });
  }
  return results;
}

async function fetchInstagramSignals(topic = 'creator') {
  const queries = [
    `site:instagram.com/reel ${topic} viral creator August 2026`,
    `site:instagram.com/p ${topic} carousel August 2026`,
    `Instagram ${topic} carousel hook trend August 2026`,
    `Instagram ${topic} reels trend August 2026`,
  ];
  const rss = (await Promise.all(queries.map(fetchRss))).flat();
  const direct = [];
  for (const url of ['https://www.instagram.com/explore/', 'https://www.instagram.com/reels/']) {
    const response = await fetchText(url, { accept: 'text/html,*/*', timeoutMs: 10000 });
    direct.push({
      platform: 'Instagram',
      sourceType: 'direct-public-check',
      source: 'Instagram public web',
      title: `Instagram public discovery availability · ${topic}`,
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
        evidence: `Indexed public reference scoped to ${topic}; not a direct Instagram performance feed.`,
      })),
    ...direct,
  ];
}

function extractPromptValue(prompt, label) {
  const match = String(prompt || '').match(new RegExp(`${label}:\\s*([^\\n]+)`, 'i'));
  return match ? match[1].trim() : '';
}

function researchDomainForJob(job) {
  const explicit = String(job?.options?.research_domain || '').trim().toUpperCase();
  if (explicit) return explicit;
  const persona = String(job?.persona_id || '').toLowerCase();
  const prompt = `${job?.system_prompt || ''}\n${job?.user_prompt || ''}`.toLowerCase();
  if (persona.includes('cornerstone_track_a') || prompt.includes('track_a_automotive_b2b') || prompt.includes('us independent automotive')) return 'TRACK_A_AUTOMOTIVE_B2B';
  if (prompt.includes('youtube_longform_business_money') || (prompt.includes('youtube') && prompt.includes('long-form'))) return 'YOUTUBE_LONGFORM_BUSINESS_MONEY';
  if (persona.includes('cara') || persona.includes('lila') || persona.includes('cornerstoneaiassets')) return 'TRACK_B_CREATOR_GROWTH';
  return '';
}

function researchSpecForJob(job) {
  const domain = researchDomainForJob(job);
  const prompt = `${job?.user_prompt || ''}\n${job?.system_prompt || ''}`;

  if (domain === 'TRACK_A_AUTOMOTIVE_B2B') {
    return {
      domain,
      platforms: ['Google News', 'Reddit'],
      topic: 'US independent automotive dealership B2B outreach',
      queries: [
        'US independent automotive dealership sales marketing outreach 2026',
        'dealer principal sales manager dealership listing merchandising photos 2026',
        'automotive retail B2B sales outreach dealership owner 2026',
        'used car dealership inventory merchandising enquiry response workflow 2026',
        'automotive dealer marketing lead response stock turn 2026',
      ],
      reddit: ['askcarsales', 'askCarDealers'],
      firewall: 'Only automotive dealership/B2B sources are evidence. Never use creator, beauty, fitness, Fanvue or YouTube sources as evidence.',
    };
  }

  if (domain === 'YOUTUBE_LONGFORM_BUSINESS_MONEY') {
    return {
      domain,
      platforms: ['Google News', 'Reddit'],
      topic: 'adult long-form business economics money storytelling on YouTube',
      queries: [
        'YouTube business documentary storytelling retention titles thumbnails August 2026',
        'YouTube finance business story documentary channels August 2026',
        'long form YouTube retention narrative documentary business August 2026',
        'business economics mystery storytelling YouTube August 2026',
      ],
      reddit: ['NewTubers', 'PartneredYoutube'],
      firewall: 'Only YouTube long-form/business/economics storytelling sources are evidence. Never use dealership or creator/Fanvue sources as evidence.',
    };
  }

  // Track B is scoped to the creator's current audience/niche. The query is built from the job, never from Track A or YouTube.
  const niche = extractPromptValue(prompt, 'NICHE') || 'creator lifestyle';
  const creator = extractPromptValue(prompt, 'CREATOR') || 'Cara and Lila';
  return {
    domain: 'TRACK_B_CREATOR_GROWTH',
    platforms: ['TikTok', 'Instagram', 'Reddit', 'Google News'],
    topic: `${creator} · ${niche}`,
    queries: [
      `TikTok ${niche} viral format creator August 2026`,
      `Instagram ${niche} viral reel carousel August 2026`,
      `${niche} creator content trend August 2026`,
      `${niche} audience content formats comments saves shares August 2026`,
    ],
    reddit: ['InstagramMarketing', 'TikTokMarketing', 'ContentCreators'],
    firewall: 'Only creator-growth, social-platform and the selected niche sources are evidence. Never use dealership or YouTube business-storytelling sources as evidence.',
  };
}

async function buildLiveResearchPack(job) {
  const eligible = ['social_caption_intelligence', 'trend_scan'].includes(job.job_type) || job?.options?.research === true;
  if (!eligible) return null;

  const spec = researchSpecForJob(job);
  if (!spec.domain) return null;

  const research = [];
  const limitations = [];

  for (const query of spec.queries) {
    const items = await fetchRss(query);
    research.push(...items.map((item) => ({
      platform: 'Google News',
      sourceType: 'editorial-indexed',
      source: item.source || 'Indexed web',
      title: item.title,
      published: item.published,
      url: item.url,
      signal: item.snippet || item.title,
      query,
      domain: spec.domain,
    })));
  }

  if (spec.domain === 'TRACK_B_CREATOR_GROWTH') {
    const tiktok = await fetchTikTokCreativeCenter(spec.topic);
    research.push(...tiktok.map((x) => ({ ...x, domain: spec.domain })));
    if (!tiktok.length) limitations.push('TikTok Creative Center was not reachable during this research pass.');

    const instagram = await fetchInstagramSignals(spec.topic);
    research.push(...instagram.map((x) => ({ ...x, domain: spec.domain })));
    if (!instagram.some((item) => item.sourceType === 'indexed-public')) limitations.push('Instagram direct/public post access was limited; indexed references were used where available.');
    if (!instagram.some((item) => item.visualAccess)) limitations.push('Instagram carousel image text was not directly readable in this pass; the system must not invent slide text evidence.');
  }

  for (const subreddit of spec.reddit) {
    const reddit = await fetchRedditTop(subreddit);
    research.push(...reddit.map((x) => ({ ...x, domain: spec.domain })));
  }

  const evidence = research
    .filter((item) => item.domain === spec.domain)
    .filter((item) => !item.published || Date.parse(item.published) >= RESEARCH_CUTOFF() || ['official', 'official-creative-center', 'direct-public-check'].includes(item.sourceType))
    .slice(0, 100);

  const confidence = evidence.length >= 12 ? 'high' : evidence.length >= 6 ? 'medium' : 'low';

  return {
    generatedAt: new Date().toISOString(),
    windowDays: RESEARCH_DAYS,
    researchDomain: spec.domain,
    targetTopic: spec.topic,
    confidence,
    requestedPlatforms: spec.platforms,
    methodology: 'Fresh public-web research executed independently for this job domain. No research results from another workspace are read, merged, cached or reused.',
    firewall: spec.firewall,
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
    ? `\n\nLIVE RESEARCH — DOMAIN LOCKED\nResearch domain: ${researchPack.researchDomain}\nTarget topic: ${researchPack.targetTopic}\nFresh window: ${researchPack.windowDays} days\nConfidence: ${researchPack.confidence}\nFIREWALL: ${researchPack.firewall}\nEvidence:\n${JSON.stringify(researchPack.evidence)}\n\nRESEARCH DECISION RULES:\n- This evidence is valid ONLY for the researchDomain named above.\n- Do not merge it with evidence from another workspace/domain.\n- Identify repeated mechanisms: opening hook, first-frame treatment, visual pattern, story structure, text-overlay pattern, caption style, CTA, comment trigger and format.\n- For every major mechanism, decide USE, ADAPT or IGNORE for this job's own audience.\n- Transfer only abstract mechanisms. Never transfer another domain's audience facts, claims, examples, metrics, personas or assumptions.\n- For carousel text, only report exact on-image text when it was actually accessible. Otherwise say it was not observed.\n- If evidence is weak, return low confidence and say what could not be verified. Do not manufacture certainty.`
    : '';
  const hardVisual = `\n\nHARD VISUAL CONSISTENCY PROTOCOL:\n- Treat concept, caption, script and scene details as factual constraints.\n- Build an internal scene contract: subject(s), location, time, lighting, action, props, wardrobe, composition, emotion, exclusions.\n- The visual prompt must faithfully render that contract.\n- Never add a dealership, showroom, vehicle, office, gym, restaurant, daylight, extra person, unrelated prop, split-screen, collage or different time of day unless explicitly required.\n- A still image is one coherent physical moment, not a montage.\n- Preserve identity, clothing, props and hand/object interactions.\n- Night or early-morning scenes must not contain daylight unless explicitly required.\n- Before returning the result, run a fact-by-fact consistency gate and rewrite any conflict.`;

  return `${base}${characterContext}${researchContext}${hardVisual}\n\nGLOBAL CREATIVE QUALITY RULES:\n- The character bible is the source of truth.\n- Do not drift into generic influencer behaviour.\n- Every idea must have a believable reason for the creator to be in the location and doing the main action.\n- Avoid random props, random secondary people, contradictory wardrobe, impossible settings and disconnected captions.\n- Prefer lived moments, specific observations and natural emotional variation over slogans.\n- Do not make every post educational, motivational, polished or aspirational.\n- Never fabricate claims, social proof, earnings, conversion rates or audience reactions.\n- Research is workspace-scoped. Never let Track A, Track B or YouTube evidence leak into another workspace.\n- Do not include chain-of-thought or hidden reasoning in the final answer.`;
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
      if (researchPack) {
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
    console.log(`[QWEN] completed ${job.id} domain=${researchPack?.researchDomain || 'none'}${researchPack ? ` evidence=${researchPack.evidence.length}` : ''}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[QWEN] failed ${job.id}:`, error);
    await supabase.from('local_ai_jobs').update({ status: 'error', error_message: message }).eq('id', job.id);
  }
}

console.log(`[QWEN] worker online. endpoint=${QWEN_URL}; model=${QWEN_MODEL}; supabase=${SUPABASE_URL}; research firewall=enabled`);
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
