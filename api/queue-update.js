// Shared serverless bridge for Revenue Recovery, Content Engine and persistent generation data.
const SUPABASE_URL = 'https://zvyioxhwdyocaanzcgqf.supabase.co';
const OUTREACH_MODEL = process.env.QWEN_MODEL || 'mlx-community/Qwen3-8B-4bit';
function clean(value) { return String(value ?? '').trim(); }
function normaliseBusiness(business = {}) {
  return {
    id: clean(business.id), name: clean(business.name || business.businessName || business.dealerName),
    decisionMaker: clean(business.decisionMaker || business.ownerName || business.contact),
    email: clean(business.email), website: clean(business.website), location: clean(business.location || business.city || business.postcode),
    vertical: clean(business.vertical || business.industry), offer: clean(business.offer || business.product || business.service),
    leadSource: clean(business.leadSource), knownSignal: clean(business.knownSignal || business.observation || business.notes),
    status: clean(business.status), emailStage: Number(business.emailStage || 0), previousEmails: business.previousEmails || {},
  };
}
function stripModelThinking(value) {
  return String(value ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<analysis>[\s\S]*?<\/analysis>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').replace(/^\s*(<\|im_end\|>|<\|endoftext\|>)\s*$/gim, '').trim();
}
function sanitiseJob(job) { if (!job) return job; const next = { ...job }; if (typeof next.result === 'string') next.result = stripModelThinking(next.result); if (typeof next.error_message === 'string') next.error_message = stripModelThinking(next.error_message); return next; }
function buildOutreachPrompt(business) {
  return `You are the senior outbound strategist for Cornerstone AI Enterprise's Track A Revenue Recovery operation.

WORKSPACE / RESEARCH DOMAIN — HARD LOCK:
TRACK_A_REVENUE_RECOVERY only.
The niche is a PROBLEM DOMAIN, not a customer vertical: revenue leakage created when enquiries, leads, conversations, appointments, quotes or opportunities go cold, stale, unworked or fail to move toward a decision.
Target businesses can be any legitimate lead-driven business: automotive, property, finance, insurance, recruitment, professional services, agencies, SaaS, education, healthcare, fitness, hospitality, trades and other businesses where a sales opportunity can enter a pipeline and disappear.
Never assume the business belongs to a particular vertical unless supplied.

BUSINESS DATA — USE ONLY WHAT IS PROVIDED. NEVER INVENT FACTS.
${JSON.stringify(business, null, 2)}

CORE COMMERCIAL TRUTH:
Cornerstone helps businesses identify and recover revenue opportunities already entering the business. It is not primarily a lead-generation service and not another CRM. AI is the recovery mechanism: finding leakage patterns, prioritising recoverable opportunities, generating context-specific follow-up and keeping humans in control of the actual commercial conversation.

COMMERCIAL PATH:
Target account → recovery conversation → leakage diagnosis → controlled recovery test → measured recovered opportunities → repeat / recurring support.

EMAIL KPI:
Get a reply from the right decision-maker. Do not try to explain the entire company in cold email.

EMAIL RULES:
1. Start with the prospect's world, not our biography.
2. Surface a plausible leakage point: missed enquiries, slow replies, stale pipeline, no-shows, old quotes, silent conversations, unworked opportunities or inconsistent follow-up.
3. Treat those opportunities as potentially expensive because acquisition effort has already happened, but do not invent the prospect's spend or lead volume.
4. Ask one simple diagnostic question.
5. Keep the email 70–120 words where possible.
6. No pricing, feature dump, AI jargon or fake certainty.
7. Do not say 'I hope you're well', 'my name is', or generic praise.
8. Use supplied facts. If a problem is not verified, frame it as a common possibility.
9. Make the next step a short review of where opportunities are being lost, not a generic sales demo.
10. Follow-ups must add a new angle. Never send 'just checking in' as the substance.
11. Borrow abstract outreach mechanisms only: curiosity gap, pattern interrupt, micro-audit, status-quo cost, specific question, evidence-led observation. Never copy wording or a competitor's distinctive execution.
12. No unsupported performance claims, testimonials, case studies or recovery amounts.

FOLLOW-UP LOGIC:
Day 2: new reason to care.
Day 3: identify a concrete leakage pattern or small test.
Day 4: make the commercial cost of inaction visible without inventing numbers.
Day 5: close the loop politely and leave a clean future route.

RETURN JSON ONLY:
{
  "recommended_subject":"",
  "subject_options":["","",""],
  "email":"",
  "why_this_should_get_a_reply":"",
  "pattern_interrupt":"",
  "recovery_opportunity":"",
  "discovery_questions":["","",""],
  "cta":"",
  "followup_plan":{"day_2_angle":"","day_3_angle":"","day_4_angle":"","day_5_angle":""},
  "quality_gate":{"prospect_first":"PASS","problem_fit":"PASS","replyability":"PASS","specificity":"PASS","human_voice":"PASS","no_unsupported_claims":"PASS","research_domain":"TRACK_A_REVENUE_RECOVERY"}
}
RETURN JSON ONLY.`;
}
function buildContentEnginePrompt(payload) {
  const niche = clean(payload.niche || 'Choose the strongest opportunity from current evidence');
  return `You are the senior content strategist and production architect for Cornerstone AI Enterprise's Track B Content Intelligence & Production Engine.

WORKSPACE: TRACK_B_CONTENT_ENGINE
MISSION: find proven demand, understand why it works, build an original stronger version, multiply it into short-form, publish, measure and monetise.

TARGET NICHE: ${niche}
CHANNEL: ${clean(payload.channel) || 'Not fixed yet'}
REFERENCE URL: ${clean(payload.referenceUrl) || 'None'}
REFERENCE NOTES / TRANSCRIPT: ${clean(payload.referenceNotes) || 'None'}
TARGET DURATION: ${clean(payload.duration || '20')} minutes
OUTPUT: ${clean(payload.output || 'Long-form + Shorts')}
EXTRA DIRECTION: ${clean(payload.direction) || 'None'}

SOURCE CONTENT IS REFERENCE MATERIAL, NOT A TEMPLATE.
Use it to learn audience demand, topic appeal, hook structure, pacing, narrative mechanism, packaging, weaknesses and production logic. Do NOT reproduce its wording, full story sequence, narration, footage, music, branding, distinctive thumbnail or creator identity. The final work must be materially original and independently useful.

RESEARCH-FIRST:
Find repeated evidence rather than isolated viral outliers. Separate public signals from owned-channel analytics. Where visual access to a reference is unavailable, explicitly state the limitation and do not invent observations.

ANALYSE:
Topic promise, first five seconds, title/thumbnail relationship, narrative engine, curiosity loops, emotional triggers, pacing, information density, proof/reveal beats, payoff, comments and obvious weaknesses.

BUILD:
Create an original stronger angle. Improve the hook, causal story, pacing, escalation, evidence, visual logic and payoff. Long-form is spoken storytelling, not an essay.

MULTIPLY:
Extract standalone high-value short-form moments from the new long-form package: reveals, hooks, reversals, questions, emotional beats and useful insights. Each derivative needs a reason to watch on its own.

MONETISE:
Propose tests only. Potential routes can include YouTube advertising where eligible, affiliate offers, TikTok Shop where available, creator monetisation such as Fanvue for the appropriate owned creator asset, sponsorships, products, subscriptions and licensing. Never promise revenue.

RETURN JSON ONLY in the shape requested by the Content Engine interface. Include opportunity_board, reference_analysis, selected_video, shorts, publish_plan, monetisation_tests and follow_up_ideas. Use USE / ADAPT / IGNORE decisions where relevant.`;
}
async function readJob(serviceKey, id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/local_ai_jobs?id=eq.${encodeURIComponent(id)}&select=id,title,job_type,model,persona_id,status,result,error_message,system_prompt,user_prompt,options,production_status,created_at,completed_at,video_url,captioned_video_url`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
  const text = await r.text(); if (!r.ok) throw new Error(`Supabase read failed: ${text}`); const rows = JSON.parse(text); return sanitiseJob(rows[0] || null);
}
async function listGenerations(serviceKey, { limit = 1000, offset = 0 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 1000, 1000));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const select = 'id,title,job_type,model,persona_id,status,result,error_message,system_prompt,user_prompt,options,production_status,created_at,completed_at,video_url,captioned_video_url';
  const r = await fetch(`${SUPABASE_URL}/rest/v1/local_ai_jobs?select=${encodeURIComponent(select)}&order=created_at.desc&limit=${safeLimit}&offset=${safeOffset}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: 'count=exact' } });
  const text = await r.text(); if (!r.ok) throw new Error(`Supabase list failed: ${text}`); const rows = JSON.parse(text).map(sanitiseJob); const range = r.headers.get('content-range') || ''; const m = range.match(/\/([0-9]+)$/); const total = m ? Number(m[1]) : null; const nextOffset = rows.length === safeLimit ? safeOffset + rows.length : null; return { rows, total, offset: safeOffset, limit: safeLimit, nextOffset, hasMore: nextOffset !== null && (total === null || nextOffset < total) };
}
async function deleteGeneration(serviceKey, id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/local_ai_jobs?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }); const text = await r.text(); if (!r.ok) throw new Error(`Supabase delete failed: ${text}`);
}
async function createJob(serviceKey, row) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/local_ai_jobs`, { method: 'POST', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(row) });
  const text = await r.text(); if (!r.ok) throw new Error(`Qwen queue failed: ${text}`); return JSON.parse(text)[0];
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!SERVICE_KEY) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  if (req.method === 'GET') {
    const action = String(req.query?.action || ''), id = String(req.query?.id || '').trim();
    try {
      if (action === 'outreach_status') { if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Valid job id required' }); const job = await readJob(SERVICE_KEY, id); if (!job) return res.status(404).json({ error: 'Job not found' }); return res.status(200).json(job); }
      if (action === 'generations') { const page = await listGenerations(SERVICE_KEY, { limit: req.query?.limit ?? 1000, offset: req.query?.offset ?? 0 }); return res.status(200).json({ jobs: page.rows, total: page.total, offset: page.offset, limit: page.limit, nextOffset: page.nextOffset, hasMore: page.hasMore }); }
      return res.status(400).json({ error: 'Unsupported GET action' });
    } catch (error) { console.error('queue-update GET error', error); return res.status(500).json({ error: error?.message || String(error) }); }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let body; try { const chunks = []; for await (const chunk of req) chunks.push(chunk); body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { return res.status(400).json({ error: 'Invalid JSON body' }); }

  if (body.action === 'delete_generation') {
    const id = String(body.id || '').trim(); if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Valid generation id required' });
    try { await deleteGeneration(SERVICE_KEY, id); return res.status(200).json({ success: true }); } catch (error) { return res.status(500).json({ error: error?.message || String(error) }); }
  }

  if (body.action === 'queue_outreach') {
    const business = normaliseBusiness(body.business || body.dealer); if (!business.name) return res.status(400).json({ error: 'business.name required' });
    try {
      const created = await createJob(SERVICE_KEY, {
        title: `Track A Revenue Recovery · ${business.name} · Email ${business.emailStage + 1}`,
        job_type: 'trend_scan', model: OUTREACH_MODEL, persona_id: 'cornerstone_track_a_revenue_recovery',
        system_prompt: 'You are Cornerstone AI Enterprise\'s Revenue Recovery strategist. Prospect-first. Problem-led. Evidence-grounded. This is not a dealership-only workflow.',
        user_prompt: buildOutreachPrompt(business), options: { max_tokens: 6500, temperature: 0.52, research: true, outreach: true, recovery_business_id: business.id, research_domain: 'TRACK_A_REVENUE_RECOVERY', workspace_id: 'track_a', research_firewall: true },
        status: 'queued', production_status: 'not_started',
      });
      return res.status(200).json({ jobId: created.id, business });
    } catch (error) { console.error('queue_outreach error', error); return res.status(500).json({ error: error?.message || String(error) }); }
  }

  if (body.action === 'queue_content_engine') {
    try {
      const payload = { niche: body.niche, channel: body.channel, referenceUrl: body.referenceUrl, referenceNotes: body.referenceNotes, duration: body.duration, output: body.output, direction: body.direction };
      const created = await createJob(SERVICE_KEY, {
        title: `Track B Content Engine · ${clean(payload.niche) || 'Opportunity Discovery'}`,
        job_type: 'content_engine', model: OUTREACH_MODEL, persona_id: 'cornerstone_content_engine',
        system_prompt: 'You are Cornerstone AI Enterprise\'s Track B Content Intelligence & Production Engine. Research current demand, learn from reference material without copying it, then build original content.',
        user_prompt: buildContentEnginePrompt(payload), options: { max_tokens: 16000, temperature: 0.55, research: true, content_engine: true, research_domain: 'TRACK_B_CONTENT_ENGINE', workspace_id: 'track_b', reference_url: clean(payload.referenceUrl), niche: clean(payload.niche) },
        status: 'queued', production_status: 'not_started',
      });
      return res.status(200).json({ jobId: created.id });
    } catch (error) { console.error('queue_content_engine error', error); return res.status(500).json({ error: error?.message || String(error) }); }
  }

  const { id, update } = body; if (!id || !update || typeof update !== 'object') return res.status(400).json({ error: 'id and update object required' });
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/content_queue?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(update) });
  if (!patchRes.ok) { const err = await patchRes.text(); return res.status(patchRes.status).json({ error: `Supabase update failed: ${err}` }); }
  return res.status(200).json({ success: true });
}
