import { createClient } from '@supabase/supabase-js';

const MAKE_WEBHOOK = process.env.MAKE_SCHEDULED_POST_WEBHOOK;
const MAX_JOBS = 3;
const FETCH_TIMEOUT_MS = 15_000;
const SCENE_RETRY_MINUTES = 5;

function buildSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
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

function trackBPost(post) {
  const persona = String(post.persona_id || '').toLowerCase();
  const label = String(post.content_label || '').toLowerCase();
  return ['cara', 'lila', 'cara_lila', 'duo'].includes(persona) || label.includes('creative engine') || Boolean(post.fanvue_post_id);
}

async function ensureLocalSceneVerification(supabase, post) {
  if (!trackBPost(post)) return { required: false, ready: true };
  const mediaUrl = post.video_url || post.image_url || (Array.isArray(post.image_urls) ? post.image_urls[0] : null);
  if (!mediaUrl) throw new Error('SCENE_QA_BLOCKED: no final media is available for verification.');
  if (!post.scene_contract_id) throw new Error('SCENE_QA_BLOCKED: no scene contract is linked to this Track B post.');
  if (post.scene_verification_status === 'passed') return { required: true, ready: true, cached: true };

  const { data: contract, error: contractError } = await supabase.from('track_b_scene_contracts').select('*').eq('id', post.scene_contract_id).maybeSingle();
  if (contractError) throw contractError;
  if (!contract) throw new Error('SCENE_QA_BLOCKED: scene contract not found.');

  const { data: active } = await supabase.from('local_ai_jobs').select('id,status').eq('job_type', 'scene_verify').in('status', ['queued', 'processing']).contains('options', { scene_contract_id: post.scene_contract_id, media_url: mediaUrl }).limit(1);
  if (!active?.length) {
    const { error } = await supabase.from('local_ai_jobs').insert({
      title: `Scene QA · ${post.persona_name || post.persona_id || post.id}`,
      job_type: 'scene_verify',
      model: process.env.QWEN_VISION_MODEL || 'mlx-community/Qwen2.5-VL-3B-Instruct-4bit',
      persona_id: post.persona_id || null,
      system_prompt: 'Local Qwen vision scene verification. Judge visible evidence only and return strict JSON.',
      user_prompt: `Verify final media against scene contract. Media: ${mediaUrl}`,
      options: {
        content_queue_id: post.id,
        scene_contract_id: post.scene_contract_id,
        media_url: mediaUrl,
        media_type: post.video_url ? 'video' : 'image',
        contract: {
          location: contract.location,
          timeOfDay: contract.time_of_day,
          lighting: contract.lighting,
          action: contract.action,
          props: contract.props,
          wardrobe: contract.wardrobe,
          composition: contract.composition,
          exclusions: contract.negative_constraints?.exclusions || contract.negative_constraints || [],
        },
        source: 'cron-publish',
        queued_at: new Date().toISOString(),
      },
      status: 'queued',
      production_status: 'scene_verification_queued',
    });
    if (error) throw error;
  }
  return { required: true, ready: false, pending: true };
}

async function publishOne(supabase, post) {
  const format = post.video_url ? 'reel' : (post.post_format || 'photo');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const scene = await ensureLocalSceneVerification(supabase, post);
    if (scene.required && !scene.ready) {
      throw Object.assign(new Error('SCENE_QA_PENDING: waiting for local Qwen vision verification.'), { code: 'SCENE_QA_PENDING' });
    }

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
    await updatePublishingState(supabase, post.id, { status: 'posted', publishing_started_at: null, last_publish_attempt_at: new Date().toISOString(), last_publish_error: null });
    return { id: post.id, status: 'posted', format };
  } catch (error) {
    const pendingScene = error?.code === 'SCENE_QA_PENDING' || String(error?.message || '').startsWith('SCENE_QA_PENDING');
    const attempts = Number(post.publish_attempts || 1);
    const transient = pendingScene || error?.name === 'AbortError' || /\b(429|5\d\d)\b/.test(String(error?.message || ''));
    const retry = transient && attempts < 12;
    const nextTime = new Date(Date.now() + (pendingScene ? SCENE_RETRY_MINUTES : Math.min(60, attempts * 10)) * 60_000);
    await updatePublishingState(supabase, post.id, {
      status: retry ? 'scheduled' : 'error',
      publishing_started_at: null,
      last_publish_attempt_at: new Date().toISOString(),
      last_publish_error: String(error?.message || error).slice(0, 1000),
      ...(retry ? { scheduled_date: nextTime.toISOString().slice(0, 10), scheduled_time: nextTime.toISOString().slice(11, 16) } : {}),
    });
    return { id: post.id, status: retry ? 'retry' : 'error', format, error: String(error?.message || error) };
  } finally { clearTimeout(timer); }
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
    const results = await Promise.all(posts.map((post) => publishOne(supabase, post)));
    return res.status(200).json({ published: results.filter((item) => item.status === 'posted').length, processed: results.length, results });
  } catch (error) {
    console.error('[PUBLISH] cron failed:', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
