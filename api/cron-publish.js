import { createClient } from '@supabase/supabase-js';

const MAKE_WEBHOOK = process.env.MAKE_SCHEDULED_POST_WEBHOOK;
const MAX_JOBS = 3;
const FETCH_TIMEOUT_MS = 15_000;

function buildSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function claimDuePosts(supabase) {
  const { data, error } = await supabase.rpc('claim_due_content_queue', { p_limit: MAX_JOBS, p_stale_minutes: 20 });
  if (error) throw error;
  return data || [];
}

async function updatePublishingState(supabase, id, patch) {
  const { error } = await supabase.from('content_queue').update(patch).eq('id', id).eq('status', 'publishing');
  if (error) throw error;
}

async function verifyRequiredScene(supabase, post, host) {
  if (!post.scene_contract_id) return { required: false, pass: true };
  if (post.scene_verification_status === 'passed') return { required: true, pass: true, cached: true };

  const { data: contract, error } = await supabase.from('track_b_scene_contracts').select('*').eq('id', post.scene_contract_id).maybeSingle();
  if (error) throw error;
  if (!contract) throw new Error('SCENE_QA_BLOCKED: scene contract not found.');

  const mediaUrl = post.image_url || (Array.isArray(post.image_urls) ? post.image_urls[0] : null);
  if (!mediaUrl) throw new Error('SCENE_QA_BLOCKED: no image/poster available for verification.');

  const response = await fetch(`https://${host}/api/scene-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CRON_SECRET}` },
    body: JSON.stringify({ contract, mediaUrl, contentQueueId: post.id, sceneContractId: post.scene_contract_id }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `SCENE_QA_BLOCKED: verification failed (${response.status})`);
  if (!body.pass) throw new Error(`SCENE_QA_BLOCKED: media failed scene verification (${body?.verification?.score ?? 0}/100).`);
  return { required: true, pass: true, verification: body.verification };
}

async function publishOne(supabase, post, host) {
  const format = post.video_url ? 'reel' : (post.post_format || 'photo');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    await verifyRequiredScene(supabase, post, host);
    const response = await fetch(MAKE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: [post.hook, post.caption, post.cta, post.hashtags].filter(Boolean).join('\n\n'),
        imageUrl: post.image_url || null,
        videoUrl: post.video_url || null,
        imageUrls: post.image_urls || null,
        postId: post.id,
        platform: 'all',
        format,
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Make webhook failed (${response.status}): ${text.slice(0, 300)}`);
    await updatePublishingState(supabase, post.id, {
      status: 'posted',
      publishing_started_at: null,
      last_publish_attempt_at: new Date().toISOString(),
      last_publish_error: null,
    });
    return { id: post.id, status: 'posted', format };
  } catch (error) {
    const attempts = Number(post.publish_attempts || 1);
    const transient = error?.name === 'AbortError' || /\b(429|5\d\d)\b/.test(String(error?.message || ''));
    const retry = transient && attempts < 5;
    const nextTime = new Date(Date.now() + Math.min(60, attempts * 10) * 60_000);
    await updatePublishingState(supabase, post.id, {
      status: retry ? 'scheduled' : 'error',
      publishing_started_at: null,
      last_publish_attempt_at: new Date().toISOString(),
      last_publish_error: String(error?.message || error).slice(0, 1000),
      ...(retry ? { scheduled_date: nextTime.toISOString().slice(0, 10), scheduled_time: nextTime.toISOString().slice(11, 16) } : {}),
    });
    return { id: post.id, status: retry ? 'retry' : 'error', format, error: String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  if (!MAKE_WEBHOOK) return res.status(500).json({ error: 'MAKE_SCHEDULED_POST_WEBHOOK is not configured' });

  const supabase = buildSupabase();
  if (!supabase) return res.status(500).json({ error: 'Supabase service configuration is incomplete' });

  try {
    const posts = await claimDuePosts(supabase);
    if (!posts.length) return res.status(200).json({ published: 0, processed: 0, message: 'No posts due' });
    const host = req.headers.host;
    const results = await Promise.all(posts.map((post) => publishOne(supabase, post, host)));
    return res.status(200).json({
      published: results.filter((item) => item.status === 'posted').length,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('[PUBLISH] cron failed:', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}