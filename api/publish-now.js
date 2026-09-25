import { createClient } from '@supabase/supabase-js'
import { requireUser, sameOrigin } from '../lib/auth.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MAKE_WEBHOOK = process.env.MAKE_SCHEDULED_POST_WEBHOOK

function db() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin' })
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Supabase service configuration is incomplete' })
  if (!MAKE_WEBHOOK) return res.status(500).json({ error: 'Publishing integration is not configured yet.' })

  const user = await requireUser(req)
  if (!user?.id) return res.status(401).json({ error: 'Authentication required' })

  let body = {}
  try {
    body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(String(req.body || '{}'))
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const publicationId = String(body.publication_id || body.publicationId || '').trim()
  if (!publicationId) return res.status(400).json({ error: 'publication_id is required' })

  const supabase = db()

  try {
    const { data: publication, error: pubError } = await supabase
      .from('track_b_publications')
      .select('id,project_id,production_job_id,platform,title,status,asset_id,metadata')
      .eq('id', publicationId)
      .maybeSingle()
    if (pubError) throw pubError
    if (!publication) return res.status(404).json({ error: 'Publication not found.' })

    const { data: project, error: projectError } = await supabase
      .from('track_b_content_projects')
      .select('id,owner_id,brief')
      .eq('id', publication.project_id)
      .maybeSingle()
    if (projectError) throw projectError
    if (!project || project.owner_id !== user.id) return res.status(403).json({ error: 'Publication is not owned by this account.' })

    const { data: production, error: productionError } = await supabase
      .from('track_b_production_jobs')
      .select('id,status,quality_status,quality_gate_id')
      .eq('id', publication.production_job_id)
      .maybeSingle()
    if (productionError) throw productionError
    if (!production || production.status !== 'completed' || production.quality_status !== 'approved') {
      return res.status(409).json({ error: 'PUBLICATION_BLOCKED: production must be completed and final QA approved first.' })
    }

    const queueId = publication.metadata?.content_queue_projection_id || publication.metadata?.content_queue_id || null
    let queueQuery = supabase.from('content_queue').select('id,persona_id,persona_name,platform,hook,caption,hashtags,cta,image_url,video_url,image_urls,post_format,status,notes,scene_contract_id,scene_verification_status')
    if (queueId) queueQuery = queueQuery.eq('id', queueId)
    else queueQuery = queueQuery.eq('project_id', publication.project_id).order('created_at', { ascending: false }).limit(1)
    const { data: queue, error: queueError } = await (queueId ? queueQuery.maybeSingle() : queueQuery.maybeSingle())
    if (queueError) throw queueError
    if (!queue) return res.status(404).json({ error: 'No publishing asset is linked to this production job.' })

    if (String(queue.status || '') === 'posted' || ['published','live'].includes(String(publication.status))) {
      return res.status(200).json({ ok: true, alreadyPublished: true, publication_id: publication.id })
    }

    const webhookResponse = await fetch(MAKE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: [queue.hook, queue.caption, queue.cta, queue.hashtags].filter(Boolean).join('\n\n'),
        imageUrl: queue.image_url || null,
        videoUrl: queue.video_url || null,
        imageUrls: queue.image_urls || null,
        postId: queue.id,
        publicationId: publication.id,
        platform: queue.platform || publication.platform || 'TikTok',
        format: queue.video_url ? 'reel' : (queue.post_format || 'photo'),
        trackingUrl: project.brief?.commerce_context?.tracking_destination || null,
        commerceTestId: project.brief?.commerce_test_id || null,
      }),
    })
    const webhookBody = await webhookResponse.text()
    if (!webhookResponse.ok) throw new Error(`Make webhook failed (${webhookResponse.status}): ${webhookBody.slice(0, 300)}`)

    const timestamp = new Date().toISOString()
    const { error: queueUpdateError } = await supabase.from('content_queue').update({
      status: 'posted',
      last_publish_attempt_at: timestamp,
      last_publish_error: null,
    }).eq('id', queue.id).eq('client_id', user.id)
    if (queueUpdateError) throw queueUpdateError

    const { error: publicationUpdateError } = await supabase.from('track_b_publications').update({
      status: 'published',
      published_at: timestamp,
      last_attempt_at: timestamp,
      last_error: null,
    }).eq('id', publication.id)
    if (publicationUpdateError) throw publicationUpdateError

    return res.status(200).json({ ok: true, publication_id: publication.id, published_at: timestamp, integration_response: webhookBody.slice(0, 1000) })
  } catch (error) {
    return res.status(502).json({ error: error?.message || String(error) })
  }
}
