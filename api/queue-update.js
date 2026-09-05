// Shared serverless bridge for Revenue Recovery, Content Engine, Track B source ingestion and production handoff.
const SUPABASE_URL = 'https://zvyioxhwdyocaanzcgqf.supabase.co';
const OUTREACH_MODEL = process.env.QWEN_MODEL || 'mlx-community/Qwen3-8B-4bit';
const SOURCE_BUCKET = process.env.TRACK_B_SOURCE_BUCKET || 'track-b-source-media';
function clean(value) { return String(value ?? '').trim(); }
function stripModelThinking(value) { return String(value ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<analysis>[\s\S]*?<\/analysis>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').trim(); }
function sanitiseJob(job) { if (!job) return job; const next = { ...job }; if (typeof next.result === 'string') next.result = stripModelThinking(next.result); if (typeof next.error_message === 'string') next.error_message = stripModelThinking(next.error_message); return next; }
function normaliseBusiness(business = {}) { return { id: clean(business.id), name: clean(business.name || business.businessName || business.dealerName), decisionMaker: clean(business.decisionMaker || business.ownerName || business.contact), email: clean(business.email), website: clean(business.website), location: clean(business.location || business.city || business.postcode), vertical: clean(business.vertical || business.industry), offer: clean(business.offer || business.product || business.service), leadSource: clean(business.leadSource), knownSignal: clean(business.knownSignal || business.observation || business.notes), status: clean(business.status), emailStage: Number(business.emailStage || 0), previousEmails: business.previousEmails || {} }; }
function buildOutreachPrompt(business) { return `You write cold email for Cornerstone Track A Revenue Recovery. You write like a real person, not a model.

DOMAIN LOCK: TRACK_A_REVENUE_RECOVERY only. Problem = revenue leakage when paid-for enquiries, leads, conversations, appointments or quotes go quiet, stale or unworked. Vertical (e.g. automotive) is context only.

HARD BANS:
- No em dashes (the character). Use full stops, commas or new sentences.
- No AI cadence: no "I'm reaching out because", no polished marketing rhythm, no long balanced clauses.
- No photos, listings, visual assets, AI photography, CRM replacement, feature lists, pricing, invented volumes or fake results.
- First email under ~80 words.
- Do not ask for a 15-minute call in email 1.

FIRST EMAIL STRUCTURE (always):
1. Pain: name the quiet paid-for enquiry problem in plain words
2. Value: one line that a second pass can recover conversations without new spend or CRM change
3. Cliffhanger: one soft question that invites a reply (curious if that shows up / is that a gap / worth a look)

FOLLOW-UPS: short, one new angle each, still human, still no em dashes.

BUSINESS DATA (use only this, invent nothing):
${JSON.stringify(business, null, 2)}

EMAIL KPI: reply from the decision-maker. Soft interest question, not a meeting demand.

RETURN JSON ONLY:
{"recommended_subject":"","subject_options":["","",""],"email":"","why_this_should_get_a_reply":"","pattern_interrupt":"","recovery_opportunity":"","discovery_questions":["","",""],"cta":"","followup_plan":{"day_2_angle":"","day_3_angle":"","day_4_angle":"","day_5_angle":""},"quality_gate":{"prospect_first":"PASS","problem_fit":"PASS","replyability":"PASS","specificity":"PASS","human_voice":"PASS","no_em_dashes":"PASS","no_unsupported_claims":"PASS","no_photo_listing_framing":"PASS","research_domain":"TRACK_A_REVENUE_RECOVERY"}}`; }
function buildContentEnginePrompt(payload) { const niche = clean(payload.niche || 'Choose the strongest opportunity from current evidence'); const sourceAnalysis = payload.sourceAnalysis ? `\n\nUNIFIED SOURCE EVIDENCE — THIS WAS GENERATED FROM THE UPLOADED REFERENCE\n${String(payload.sourceAnalysis).slice(0, 120000)}\n\nTreat this as evidence about the source. Distinguish observed facts from inference. Do not copy its wording, narration, scenes, creator identity, branding or distinctive creative execution.` : ''; return `You are the senior strategist of Cornerstone AI Enterprise's Track B Content Intelligence & Production Engine. WORKSPACE: TRACK_B_CONTENT_ENGINE.\nMISSION: find proven demand, understand why it works, build an original stronger version, multiply it into short-form, publish, measure and monetise.\n\nTARGET NICHE: ${niche}\nCHANNEL: ${clean(payload.channel) || 'Not fixed yet'}\nREFERENCE URL: ${clean(payload.referenceUrl) || 'None'}\nREFERENCE NOTES / TRANSCRIPT: ${clean(payload.referenceNotes) || 'None'}\nTARGET DURATION: ${clean(payload.duration || '20')} minutes\nOUTPUT: ${clean(payload.output || 'Long-form + Shorts')}\nEXTRA DIRECTION: ${clean(payload.direction) || 'None'}\n${sourceAnalysis}\n\nREFERENCE CONTENT IS A TEACHER, NOT A TEMPLATE. Use it to understand audience demand, topic appeal, hook structure, pacing, packaging, narrative mechanisms and weaknesses. Never reproduce exact wording, script, narration, footage, music, creator identity, branding, distinctive thumbnail or near-identical execution. The final work must be materially original.\n\nRESEARCH-FIRST: Prefer repeated public evidence over isolated viral outliers. Separate public signals from owned analytics. If a source is inaccessible, say so.\n\nBUILD: create an original stronger angle and long-form package with opportunity board, 10 titles, 3 thumbnails, hook, full spoken script, chapters, visual timeline, SEO/upload package, 5 follow-up ideas and a clear originality plan.\n\nMULTIPLY: create multiple standalone short-form derivatives with source windows, hooks, titles/captions and platform notes.\n\nPUBLISH + MEASURE: produce a publication sequence, measurement plan, baseline metrics and an explicit winner rule.\n\nMONETISE: propose measurable tests only. Potential routes include YouTube advertising where eligible, affiliate offers, TikTok Shop where available, Fanvue for appropriate owned creator assets, sponsorships, subscriptions, products and licensing. Never promise revenue.\n\nRETURN JSON ONLY in the shape requested by the Content Engine interface.`; }
async function readJob(serviceKey, id) { const r = await fetch(`${SUPABASE_URL}/rest/v1/local_ai_jobs?id=eq.${encodeURIComponent(id)}&select=id,title,job_type,model,persona_id,status,result,error_message,system_prompt,user_prompt,options,production_status,created_at,completed_at,video_url,captioned_video_url`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }); const text = await r.text(); if (!r.ok) throw new Error(`Supabase read failed: ${text}`); return sanitiseJob(JSON.parse(text)[0] || null); }
async function listGenerations(serviceKey, { limit = 1000, offset = 0 } = {}) { const safeLimit = Math.max(1, Math.min(Number(limit) || 1000, 1000)); const safeOffset = Math.max(0, Number(offset) || 0); const select = 'id,title,job_type,model,persona_id,status,result,error_message,system_prompt,user_prompt,options,production_status,created_at,completed_at,video_url,captioned_video_url'; const r = await fetch(`${SUPABASE_URL}/rest/v1/local_ai_jobs?select=${encodeURIComponent(select)}&order=created_at.desc&limit=${safeLimit}&offset=${safeOffset}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'count=exact' } }); const text = await r.text(); if (!r.ok) throw new Error(`Supabase list failed: ${text}`); const rows = JSON.parse(text).map(sanitiseJob); const range = r.headers.get('content-range') || ''; const m = range.match(/\/([0-9]+)$/); const total = m ? Number(m[1]) : null; const nextOffset = rows.length === safeLimit ? safeOffset + rows.length : null; return { rows, total, offset: safeOffset, limit: safeLimit, nextOffset, hasMore: nextOffset !== null && (total === null || nextOffset < total) }; }
async function deleteGeneration(serviceKey, id) { const r = await fetch(`${SUPABASE_URL}/rest/v1/local_ai_jobs?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }); const text = await r.text(); if (!r.ok) throw new Error(`Supabase delete failed: ${text}`); }
async function createJob(serviceKey, row) { const r = await fetch(`${SUPABASE_URL}/rest/v1/local_ai_jobs`, { method: 'POST', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(row) }); const text = await r.text(); if (!r.ok) throw new Error(`Supabase queue failed: ${text}`); return JSON.parse(text)[0]; }
async function parseBody(req) { const chunks = []; for await (const chunk of req) chunks.push(chunk); return JSON.parse(Buffer.concat(chunks).toString() || '{}'); }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!SERVICE_KEY) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  if (req.method === 'GET') {
    const action = String(req.query?.action || ''), id = String(req.query?.id || '').trim();
    try {
      if (['outreach_status', 'job_status'].includes(action)) { if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Valid job id required' }); const job = await readJob(SERVICE_KEY, id); if (!job) return res.status(404).json({ error: 'Job not found' }); return res.status(200).json(job); }
      if (action === 'generations') { const page = await listGenerations(SERVICE_KEY, { limit: req.query?.limit ?? 1000, offset: req.query?.offset ?? 0 }); return res.status(200).json({ jobs: page.rows, total: page.total, offset: page.offset, limit: page.limit, nextOffset: page.nextOffset, hasMore: page.hasMore }); }
      return res.status(400).json({ error: 'Unsupported GET action' });
    } catch (error) { console.error('queue-update GET error', error); return res.status(500).json({ error: error?.message || String(error) }); }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let body; try { body = await parseBody(req); } catch { return res.status(400).json({ error: 'Invalid JSON body' }); }

  if (body.action === 'delete_generation') { const id = String(body.id || '').trim(); if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Valid generation id required' }); try { await deleteGeneration(SERVICE_KEY, id); return res.status(200).json({ success: true }); } catch (error) { return res.status(500).json({ error: error?.message || String(error) }); } }

  if (body.action === 'queue_media_ingestion') {
    const objectPath = clean(body.objectPath), userId = clean(body.userId), fileName = clean(body.fileName) || 'source', contentType = clean(body.contentType) || 'application/octet-stream';
    if (!objectPath || !userId) return res.status(400).json({ error: 'objectPath and userId are required' });
    if (!objectPath.startsWith(`${userId}/`)) return res.status(400).json({ error: 'objectPath must be scoped to the authenticated user' });
    try {
      const created = await createJob(SERVICE_KEY, { title: `Track B source ingestion · ${fileName}`, job_type: 'content_media_ingestion', model: OUTREACH_MODEL, persona_id: 'cornerstone_content_engine', system_prompt: 'You are the Track B media ingestion controller. Download the private source, extract evidence, then hand off to Qwen text and vision analysis.', user_prompt: `Ingest source media from ${SOURCE_BUCKET}/${objectPath}.`, options: { bucket: SOURCE_BUCKET, object_path: objectPath, file_name: fileName, content_type: contentType, research_domain: 'TRACK_B_CONTENT_ENGINE', workspace_id: 'track_b' }, status: 'queued', production_status: 'source_queued' });
      return res.status(200).json({ jobId: created.id });
    } catch (error) { console.error('queue_media_ingestion error', error); return res.status(500).json({ error: error?.message || String(error) }); }
  }

  if (body.action === 'save_content_package') {
    const id = clean(body.id) || `ce-${crypto.randomUUID()}`;
    if (!clean(body.contentLabel)) return res.status(400).json({ error: 'contentLabel required' });
    try {
      const row = { id, created_at: new Date().toISOString(), persona_id: clean(body.personaId) || 'cornerstone', persona_name: clean(body.personaName) || 'Cornerstone', platform: clean(body.platform) || 'YouTube', pillar: 'Track B Content Engine', hook: clean(body.hook), caption: clean(body.caption), hashtags: clean(body.hashtags), status: 'ready', image_prompt: body.imagePrompt || null, photo_idea: clean(body.photoIdea), cta: clean(body.cta), photo_direction: clean(body.photoDirection), post_type: clean(body.postType) || 'Long-form + Shorts', content_label: clean(body.contentLabel), trend_hook: clean(body.hook), shot_angle: '', wardrobe: '', style_ref: 'original', notes: clean(body.notes), post_format: 'video' };
      const insert = await fetch(`${SUPABASE_URL}/rest/v1/content_queue`, { method: 'POST', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(row) });
      const text = await insert.text(); if (!insert.ok) throw new Error(`Production handoff failed: ${text}`);
      return res.status(200).json({ id: JSON.parse(text)[0]?.id || id });
    } catch (error) { console.error('save_content_package error', error); return res.status(500).json({ error: error?.message || String(error) }); }
  }

  if (body.action === 'queue_outreach') {
    const business = normaliseBusiness(body.business || body.dealer); if (!business.name) return res.status(400).json({ error: 'business.name required' });
    try { const created = await createJob(SERVICE_KEY, { title: `Track A Revenue Recovery · ${business.name} · Email ${business.emailStage + 1}`, job_type: 'trend_scan', model: OUTREACH_MODEL, persona_id: 'cornerstone_track_a_revenue_recovery', system_prompt: 'Write like a real person. No em dashes. Pain then value then soft cliffhanger. Never photos, listings or AI cadence.', user_prompt: buildOutreachPrompt(business), options: { max_tokens: 6500, temperature: .52, research: true, outreach: true, recovery_business_id: business.id, research_domain: 'TRACK_A_REVENUE_RECOVERY', workspace_id: 'track_a', research_firewall: true }, status: 'queued', production_status: 'not_started' }); return res.status(200).json({ jobId: created.id, business }); }
    catch (error) { console.error('queue_outreach error', error); return res.status(500).json({ error: error?.message || String(error) }); }
  }

  if (body.action === 'queue_content_engine') {
    try { const payload = { niche: body.niche, channel: body.channel, referenceUrl: body.referenceUrl, referenceNotes: body.referenceNotes, duration: body.duration, output: body.output, direction: body.direction, sourceAnalysis: body.sourceAnalysis }; const created = await createJob(SERVICE_KEY, { title: `Track B Content Engine · ${clean(payload.niche) || 'Opportunity Discovery'}`, job_type: 'content_engine', model: OUTREACH_MODEL, persona_id: 'cornerstone_content_engine', system_prompt: 'You are Cornerstone AI Enterprise Track B Content Intelligence & Production Engine. Research current demand, learn from reference material without copying it, then build original content.', user_prompt: buildContentEnginePrompt(payload), options: { max_tokens: 16000, temperature: .55, research: true, content_engine: true, research_domain: 'TRACK_B_CONTENT_ENGINE', workspace_id: 'track_b', reference_url: clean(payload.referenceUrl), niche: clean(payload.niche), has_source_analysis: Boolean(payload.sourceAnalysis) }, status: 'queued', production_status: 'not_started' }); return res.status(200).json({ jobId: created.id }); }
    catch (error) { console.error('queue_content_engine error', error); return res.status(500).json({ error: error?.message || String(error) }); }
  }

  const { id, update } = body; if (!id || !update || typeof update !== 'object') return res.status(400).json({ error: 'id and update object required' });
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/content_queue?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(update) });
  if (!patchRes.ok) { const err = await patchRes.text(); return res.status(patchRes.status).json({ error: `Supabase update failed: ${err}` }); }
  return res.status(200).json({ success: true });
}
