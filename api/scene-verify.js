import { createClient } from '@supabase/supabase-js';

function buildRuntime(req) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) return null;
  const auth = String(req.headers.authorization || '');
  const publicClient = anonKey ? createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: auth ? { headers: { Authorization: auth } } : undefined }) : null;
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return { publicClient, service };
}

async function authorised(req, publicClient) {
  const auth = String(req.headers.authorization || '');
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !publicClient) return false;
  const { data } = await publicClient.auth.getUser(token);
  return Boolean(data?.user);
}

function cleanContract(input) {
  const s = input || {};
  return {
    location: String(s.location || '').trim(),
    timeOfDay: String(s.timeOfDay || '').trim(),
    lighting: String(s.lighting || '').trim(),
    action: String(s.action || '').trim(),
    props: Array.isArray(s.props) ? s.props.filter(Boolean) : String(s.props || '').split(',').map((x) => x.trim()).filter(Boolean),
    wardrobe: String(s.wardrobe || '').trim(),
    composition: String(s.composition || 'single continuous camera frame').trim(),
    exclusions: String(s.exclusions || s.avoid || '').trim(),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const runtime = buildRuntime(req);
  if (!runtime) return res.status(500).json({ error: 'Supabase server configuration is incomplete' });
  if (!(await authorised(req, runtime.publicClient))) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const mediaUrl = String(req.body?.mediaUrl || req.body?.videoUrl || req.body?.posterUrl || '').trim();
    const contentQueueId = req.body?.contentQueueId || null;
    let sceneContractId = req.body?.sceneContractId || null;
    const contract = cleanContract(req.body?.contract);
    if (!mediaUrl) return res.status(400).json({ error: 'mediaUrl is required.' });
    if (!contract.location || !contract.timeOfDay || !contract.action) return res.status(400).json({ error: 'Scene contract needs location, timeOfDay and action.' });

    if (!sceneContractId) {
      const { data: created, error } = await runtime.service.from('track_b_scene_contracts').insert({
        owner_id: req.body?.ownerId || null,
        production_job_id: null,
        creator_id: req.body?.creatorId || req.body?.personaId || null,
        location: contract.location,
        time_of_day: contract.timeOfDay,
        lighting: contract.lighting,
        action: contract.action,
        props: contract.props,
        wardrobe: contract.wardrobe,
        composition: contract.composition,
        negative_constraints: { exclusions: contract.exclusions },
        status: 'pending',
      }).select('id').single();
      if (error) throw error;
      sceneContractId = created.id;
    }

    const options = {
      content_queue_id: contentQueueId,
      scene_contract_id: sceneContractId,
      media_url: mediaUrl,
      media_type: req.body?.mediaType || (req.body?.videoUrl ? 'video' : 'image'),
      contract,
      source: 'scene-verify-api',
      queued_at: new Date().toISOString(),
    };

    const { data: existing } = await runtime.service.from('local_ai_jobs').select('id,status').eq('job_type', 'scene_verify').in('status', ['queued', 'processing']).contains('options', { scene_contract_id: sceneContractId, media_url: mediaUrl }).limit(1);
    let job = existing?.[0] || null;
    if (!job) {
      const { data: createdJob, error } = await runtime.service.from('local_ai_jobs').insert({
        title: `Scene QA · ${req.body?.creatorId || req.body?.personaId || 'media'}`,
        job_type: 'scene_verify',
        model: process.env.QWEN_VISION_MODEL || 'mlx-community/Qwen2.5-VL-3B-Instruct-4bit',
        persona_id: req.body?.personaId || null,
        system_prompt: 'Local Qwen vision scene verification. Judge visible evidence only and return strict JSON.',
        user_prompt: `Verify this media against the supplied scene contract. Media: ${mediaUrl}`,
        options,
        status: 'queued',
        production_status: 'scene_verification_queued',
      }).select('id,status').single();
      if (error) throw error;
      job = createdJob;
    }

    if (contentQueueId) {
      const { error } = await runtime.service.from('content_queue').update({ scene_contract_id: sceneContractId, scene_verification_status: 'pending', scene_verification: null, scene_verified_at: null }).eq('id', contentQueueId);
      if (error) throw error;
    }

    return res.status(202).json({ queued: true, jobId: job.id, sceneContractId, status: job.status, provider: 'local_qwen_vision' });
  } catch (error) {
    console.error('[SCENE_QA_QUEUE]', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
