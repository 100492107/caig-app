import { createHash } from "node:crypto";\nimport { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QWEN_URL = process.env.QWEN_URL || "http://127.0.0.1:8000";
const QWEN_MODEL = process.env.QWEN_MODEL || "mlx-community/Qwen3.5-9B-4bit";
const POLL_MS = 2500;
const STALE_MS = 15 * 60 * 1000;

if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Supabase worker credentials are required.");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function cleanOutput(value) {
  return String(value || "").replace(/^\s*\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`\s*$/i, "").trim();
}

async function resolveModel(preferred) {
  try {
    const r = await fetch(QWEN_URL + "/v1/models", { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return preferred;
    const json = await r.json();
    const ids = Array.isArray(json?.data) ? json.data.map((x) => String(x?.id || "")) : [];
    return ids.includes(preferred) ? preferred : (ids.includes(QWEN_MODEL) ? QWEN_MODEL : (ids[0] || preferred));
  } catch {
    return preferred;
  }
}

async function callQwen(job) {
  const response = await fetch(QWEN_URL + "/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: await resolveModel(job.model || QWEN_MODEL),
      messages: [
        { role: "system", content: job.system_prompt || "You are Cornerstone Commerce Intelligence." },
        { role: "user", content: job.user_prompt || "" }
      ],
      temperature: Number(job.options?.temperature ?? 0.45),
      max_tokens: Math.max(1200, Math.min(Number(job.options?.max_tokens || 4200), 6000)),
      stream: false,
      chat_template_kwargs: { enable_thinking: false }
    })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Qwen request failed (" + response.status + "): " + JSON.stringify(json).slice(0, 1000));
  const output = cleanOutput(json?.choices?.[0]?.message?.content);
  if (!output) throw new Error("Qwen returned no commerce intelligence output.");
  return output;
}

async function recoverStaleJobs() {
  const cutoff = new Date(Date.now() - STALE_MS).toISOString();
  const { data, error } = await supabase.from("local_ai_jobs")
    .select("id,started_at")
    .eq("job_type", "commerce_intelligence")
    .eq("status", "processing")
    .lt("started_at", cutoff)
    .limit(20);
  if (error) throw error;
  for (const job of data || []) {
    await supabase.from("local_ai_jobs")
      .update({ status: "queued", production_status: "commerce_intelligence_queued", error_message: "Recovered after specialist worker restart." })
      .eq("id", job.id)
      .eq("status", "processing");
  }
}

async function claimJob() {
  const { data, error } = await supabase.from("local_ai_jobs")
    .select("*")
    .eq("job_type", "commerce_intelligence")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  const job = data?.[0];
  if (!job) return null;
  const { data: claimed, error: claimError } = await supabase.from("local_ai_jobs")
    .update({ status: "processing", started_at: new Date().toISOString(), production_status: "commerce_intelligence_processing", error_message: null })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();
  if (claimError) throw claimError;
  return claimed || null;
}

async function processJob(job) {
  try {
    const raw = await callQwen(job);
    let result = raw;
    try {
      const parsed = JSON.parse(raw);
      result = JSON.stringify(parsed);
    } catch {}
    const { error } = await supabase.from("local_ai_jobs").update({
      status: "completed",
      result,
      completed_at: new Date().toISOString(),
      production_status: "commerce_intelligence_completed",
      error_message: null
    }).eq("id", job.id);
    if (error) throw error;
    console.log("[COMMERCE] completed", job.id);
  } catch (error) {
    const message = error?.message || String(error);
    console.error("[COMMERCE] failed", job.id, message);
    await supabase.from("local_ai_jobs").update({
      status: "error",
      error_message: message,
      production_status: "commerce_intelligence_error"
    }).eq("id", job.id);
  }
}


const DEFAULT_DISCOVERY_QUERIES = [
  'summer capsule wardrobe',
  'creator lifestyle accessories',
  'UGC beauty products'
];
const DISCOVERY_INTERVAL_MS = Number(process.env.COMMERCE_DISCOVERY_INTERVAL_MS || 6 * 60 * 60 * 1000);
const DISCOVERY_TIMEOUT_MS = Number(process.env.COMMERCE_DISCOVERY_TIMEOUT_MS || 12000);
const SOURCE_URLS = {
  pinterest: (q) => 'https://www.pinterest.co.uk/search/pins/?q=' + encodeURIComponent(q),
  vinted: (q) => 'https://www.vinted.co.uk/catalog?search_text=' + encodeURIComponent(q),
  depop: (q) => 'https://www.depop.com/search/?q=' + encodeURIComponent(q),
  tiktok: () => 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/pc/en?region=GB',
  tiktok_shop: (q) => 'https://shop.tiktok.com/search?q=' + encodeURIComponent(q),
  temu: (q) => 'https://www.temu.com/search_result.html?search_key=' + encodeURIComponent(q),
  alibaba: (q) => 'https://www.alibaba.com/trade/search?SearchText=' + encodeURIComponent(q)
};

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function metaTag(html, key) {
  const escaped = key.replace(/[.*+?^$()|[\]\\]/g, '\\console.log("[COMMERCE] worker online", QWEN_URL, QWEN_MODEL);');
  const patterns = [
    new RegExp('<meta[^>]+(?:property|name)=["\\']' + escaped + '["\\'][^>]+content=["\\']([^"\\']+)["\\'][^>]*>', 'i'),
    new RegExp('<meta[^>]+content=["\\']([^"\\']+)["\\'][^>]+(?:property|name)=["\\']' + escaped + '["\\'][^>]*>', 'i')
  ];
  for (const re of patterns) { const m = html.match(re); if (m?.[1]) return decodeHtml(m[1]); }
  return '';
}
function pageTitle(html) {
  const m = String(html || '').match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i);
  return decodeHtml(m?.[1] || '').replace(/\\s+/g, ' ').trim();
}
function canonicalTag(html) {
  const m = String(html || '').match(/<link[^>]+rel=["\\']canonical["\\'][^>]+href=["\\']([^"\\']+)["\\'][^>]*>/i);
  return decodeHtml(m?.[1] || '');
}
function jsonLdProduct(html) {
  const scripts = [...String(html || '').matchAll(/<script[^>]+type=["\\']application\\/ld\\+json["\\'][^>]*>([\\s\\S]*?)<\\/script>/gi)];
  for (const m of scripts) {
    try {
      const value = JSON.parse(m[1].trim());
      const candidates = Array.isArray(value) ? value : (Array.isArray(value?.['@graph']) ? value['@graph'] : [value]);
      const item = candidates.find((x) => String(x?.['@type'] || '').toLowerCase().includes('product'));
      if (item) return item;
    } catch {}
  }
  return null;
}
async function fetchPublicPage(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36', accept: 'text/html,application/xhtml+xml,*/*' },
    signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const html = await response.text();
  return { url: response.url || url, html };
}
function discoveryKind(source) {
  return ['temu','alibaba','vinted','depop','tiktok_shop'].includes(source) ? 'product' : (source === 'pinterest' ? 'visual' : 'trend');
}
function sourceNote(source) {
  if (source === 'tiktok') return 'Public TikTok Creative Center discovery signal; not private account analytics.';
  if (source === 'pinterest') return 'Public Pinterest search discovery signal; visual evidence only.';
  return 'Public commerce discovery signal captured from the source page; product eligibility and commercial claims remain source-bound.';
}
function discoveryKey(ownerId, source, canonical, title, query) {
  return createHash('sha256').update([ownerId, source, canonical || '', title || '', query || ''].join('|')).digest('hex');
}
async function seedWatchlists(ownerId) {
  const { data, error } = await supabase.from('cornerstone_commerce_watchlists')
    .select('id').eq('owner_id', ownerId).limit(1);
  if (error) throw error;
  if (data?.length) return;
  const rows = [];
  for (const query of DEFAULT_DISCOVERY_QUERIES) {
    for (const source_platform of Object.keys(SOURCE_URLS)) {
      rows.push({ owner_id: ownerId, query, source_platform, enabled: true, cadence_hours: 6 });
    }
  }
  const { error: insertError } = await supabase.from('cornerstone_commerce_watchlists').insert(rows);
  if (insertError) throw insertError;
}
async function discoveryForWatch(watch) {
  const source = watch.source_platform;
  const query = watch.query;
  const url = SOURCE_URLS[source]?.(query);
  if (!url) return null;
  const fetched = await fetchPublicPage(url);
  const title = pageTitle(fetched.html) || source.toUpperCase() + ' · ' + query;
  const description = metaTag(fetched.html, 'description') || metaTag(fetched.html, 'og:description');
  const canonical = canonicalTag(fetched.html) || fetched.url;
  const imageUrl = metaTag(fetched.html, 'og:image') || metaTag(fetched.html, 'twitter:image');
  const product = jsonLdProduct(fetched.html);
  const productTitle = product?.name || title;
  const productDescription = product?.description || description;
  const price = product?.offers?.price ?? (Array.isArray(product?.offers) ? product.offers[0]?.price : null);
  const currency = product?.offers?.priceCurrency ?? (Array.isArray(product?.offers) ? product.offers[0]?.priceCurrency : null);
  const key = discoveryKey(watch.owner_id, source, canonical, productTitle, query);
  return {
    owner_id: watch.owner_id,
    source_platform: source,
    signal_type: discoveryKind(source),
    source_url: fetched.url,
    canonical_url: canonical,
    title: productTitle.slice(0, 500),
    description: String(productDescription || '').slice(0, 4000),
    image_url: imageUrl || null,
    product_id: product?.sku || product?.mpn || product?.productID || null,
    brand: typeof product?.brand === 'string' ? product.brand : (product?.brand?.name || null),
    price_amount: price != null && Number.isFinite(Number(price)) ? Number(price) : null,
    price_currency: currency || null,
    availability: typeof product?.offers?.availability === 'string' ? product.offers.availability : null,
    category: query,
    tags: query.split(/[,\\s]+/).filter(Boolean).slice(0, 12),
    evidence_confidence: product ? 'medium' : 'low',
    metadata: {
      discovery_mode: 'scheduled_public_scan',
      query,
      source_note: sourceNote(source),
      captured_url: fetched.url,
      html_title: title,
      watchlist_id: watch.id
    },
    captured_at: new Date().toISOString(),
    discovery_key: key
  };
}
async function persistDiscovery(row) {
  const { data: existing, error } = await supabase.from('cornerstone_commerce_signals')
    .select('id').eq('owner_id', row.owner_id).eq('discovery_key', row.discovery_key).maybeSingle();
  if (error) throw error;
  if (existing?.id) {
    const { error: updateError } = await supabase.from('cornerstone_commerce_signals').update(row).eq('id', existing.id).eq('owner_id', row.owner_id);
    if (updateError) throw updateError;
    return 'updated';
  }
  const { error: insertError } = await supabase.from('cornerstone_commerce_signals').insert(row);
  if (insertError) throw insertError;
  return 'inserted';
}
async function runScheduledDiscovery() {
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;
  let inserted = 0; let updated = 0; let failed = 0;
  for (const user of users?.users || []) {
    try {
      await seedWatchlists(user.id);
      const { data: watches, error } = await supabase.from('cornerstone_commerce_watchlists')
        .select('*').eq('owner_id', user.id).eq('enabled', true);
      if (error) throw error;
      for (const watch of watches || []) {
        const last = watch.last_scanned_at ? new Date(watch.last_scanned_at).getTime() : 0;
        if (last && Date.now() - last < Number(watch.cadence_hours || 6) * 3600000) continue;
        try {
          const row = await discoveryForWatch(watch);
          if (row) {
            const result = await persistDiscovery(row);
            if (result === 'inserted') inserted += 1; else updated += 1;
          }
        } catch (error) {
          failed += 1;
          console.warn('[COMMERCE] discovery failed', watch.source_platform, watch.query, error?.message || error);
        } finally {
          await supabase.from('cornerstone_commerce_watchlists').update({ last_scanned_at: new Date().toISOString() }).eq('id', watch.id).eq('owner_id', user.id);
        }
      }
    } catch (error) {
      failed += 1;
      console.warn('[COMMERCE] owner discovery failed', user.id, error?.message || error);
    }
  }
  console.log('[COMMERCE] scheduled discovery', JSON.stringify({ inserted, updated, failed }));
  return { inserted, updated, failed };
}

console.log("[COMMERCE] worker online", QWEN_URL, QWEN_MODEL);
let lastRecovery = 0;
let lastDiscovery = 0;
for (;;) {
  try {
    if (Date.now() - lastRecovery > STALE_MS) {
      await recoverStaleJobs();
      lastRecovery = Date.now();
    }
    if (Date.now() - lastDiscovery > DISCOVERY_INTERVAL_MS) {
      await runScheduledDiscovery();
      lastDiscovery = Date.now();
    }
    const job = await claimJob();
    if (job) await processJob(job);
    else await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  } catch (error) {
    console.error("[COMMERCE] loop error", error);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
