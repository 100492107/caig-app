// api/queue-update.js
// Shared serverless bridge for content queue, Track A outreach, and the
// persistent generation library. Keeping these actions in one function avoids
// adding another Vercel Hobby function.

const SUPABASE_URL = 'https://zvyioxhwdyocaanzcgqf.supabase.co';
const OUTREACH_MODEL = process.env.QWEN_MODEL || 'orcarouter/Qwen3.8-27B-Uncensored-MLX';

function clean(value) { return String(value ?? '').trim(); }

function normaliseDealer(dealer = {}) {
  return {
    id: clean(dealer.id),
    name: clean(dealer.name),
    ownerName: clean(dealer.ownerName),
    email: clean(dealer.email),
    website: clean(dealer.website),
    location: clean(dealer.location || dealer.city || dealer.zip),
    sampleCar: clean(dealer.sampleCar),
    notes: clean(dealer.notes || dealer.observation),
    stockCount: clean(dealer.stockCount),
    status: clean(dealer.status),
    emailStage: Number(dealer.emailStage || 0),
    previousEmails: dealer.previousEmails || {},
  };
}

function buildOutreachPrompt(dealer) {
  return `You are the senior outbound sales strategist for Cornerstone AI Group. You are preparing Email ${dealer.emailStage + 1} for a real dealership prospect.

DEALER DATA — USE ONLY WHAT IS PROVIDED. NEVER INVENT A DEALER FACT, VEHICLE FACT, PERSON DETAIL, RESULT, TESTIMONIAL OR OBSERVATION.
${JSON.stringify(dealer, null, 2)}

CORE BUSINESS TRUTH:
Cornerstone improves the presentation of the dealer's real stock using the photos the dealer already takes. The goal is stronger listing presentation and less avoidable photography/listing admin, without asking the sales team to become photographers or image operators.

COMMERCIAL PATH:
Cold outreach → positive reply → sample → short diagnostic call → controlled paid pilot → repeat / recurring support.

CREDIBILITY:
Founder has practical Volkswagen and Kia main-dealer floor experience and understands stock turn, hold time, listing quality, margin pressure, and the reality of who ends up doing photography/listing tasks.

EMAIL FUNDAMENTALS — OPEN RATE + REPLY RATE ARE THE KPI:
1. SUBJECT: Create 3 short, human, curiosity-led subject lines. Prefer 3–7 words. No spammy sales language. One should use the real vehicle/listing when available.
2. PATTERN INTERRUPT: The first 1–2 lines must NOT start with 'I hope you're well', 'My name is', 'I work with dealerships', or a generic compliment. Start with a specific supplied tension, observation, or useful contrarian point.
3. CURIOSITY GAP: Make the reader want to know what you noticed or what the example looks like.
4. REPLYABILITY: The email should be easy to answer in one short line. End with a low-friction question.
5. HUMAN: Founder-led, direct, slightly cheeky when natural, dealership-aware. No corporate jargon. No exclamation marks by default.
6. SHORT: Aim for 70–120 words unless a later follow-up genuinely needs less or more.
7. NO HARD SELL: No pricing. No long meeting request. No feature dump. Do not lead with AI or model names.
8. SAMPLE-FIRST: The strongest next step is usually 'want me to show you?' or 'happy to send the example'.
9. IF A VEHICLE IS PROVIDED, USE IT: The sample vehicle should be the bridge between intrigue and proof.
10. NO UNSUPPORTED CLAIMS: If a dealership problem was not actually observed, frame it as a common workflow possibility rather than pretending we audited it.
11. FORMAT ARCHAEOLOGY: Borrow proven outreach psychology from strong B2B, sales, SaaS, automotive and founder-led formats. Identify the mechanism — curiosity gap, status-quo cost, pattern interrupt, micro-audit, contrarian observation or sample-led intrigue — then rebuild it for this dealer. Never copy wording.

FOLLOW-UP LOGIC:
Use any prior email record supplied in the dealer data. Never repeat the same angle. Day 2 should add a new reason to reply. Day 3 should introduce proof/sample. Day 4 should diagnose commercial implications. Day 5 should close the loop politely.

RETURN JSON ONLY IN THIS SHAPE:
{
  "recommended_subject": "",
  "subject_options": ["", "", ""],
  "email": "",
  "why_this_should_get_a_reply": "",
  "pattern_interrupt": "",
  "dealer_observation_used": "",
  "sample_vehicle": "",
  "sample_image_brief": "",
  "cta": "",
  "followup_plan": {"day_2_angle":"","day_3_angle":"","day_4_angle":"","day_5_angle":""},
  "quality_gate": {"pattern_interrupt":"PASS","curiosity":"PASS","replyability":"PASS","specificity":"PASS","human_voice":"PASS","no_unsupported_claims":"PASS","no_spammy_language":"PASS"}
}

Return JSON only.`;
}

async function readJob(serviceKey, id) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/local_ai_jobs?id=eq.${encodeURIComponent(id)}&select=id,title,job_type,model,persona_id,status,result,error_message,system_prompt,user_prompt,options,production_status,created_at,completed_at,video_url,captioned_video_url`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase read failed: ${text}`);
  const rows = JSON.parse(text);
  return rows[0] || null;
}

async function listGenerations(serviceKey) {
  const select = 'id,title,job_type,model,persona_id,status,result,error_message,system_prompt,user_prompt,options,production_status,created_at,completed_at,video_url,captioned_video_url';
  const response = await fetch(`${SUPABASE_URL}/rest/v1/local_ai_jobs?select=${encodeURIComponent(select)}&order=created_at.desc&limit=1000`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase list failed: ${text}`);
  return JSON.parse(text);
}

async function deleteGeneration(serviceKey, id) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/local_ai_jobs?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase delete failed: ${text}`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });

  if (req.method === 'GET') {
    const action = String(req.query?.action || '');
    const id = String(req.query?.id || '').trim();
    try {
      if (action === 'outreach_status') {
        if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Valid job id required' });
        const job = await readJob(SERVICE_KEY, id);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        return res.status(200).json(job);
      }
      if (action === 'generations') {
        const jobs = await listGenerations(SERVICE_KEY);
        return res.status(200).json({ jobs });
      }
      return res.status(400).json({ error: 'Unsupported GET action' });
    } catch (error) {
      console.error('queue-update GET error', error);
      return res.status(500).json({ error: error?.message || String(error) });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (body.action === 'delete_generation') {
    const id = String(body.id || '').trim();
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Valid generation id required' });
    try {
      await deleteGeneration(SERVICE_KEY, id);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('delete_generation error', error);
      return res.status(500).json({ error: error?.message || String(error) });
    }
  }

  if (body.action === 'queue_outreach') {
    const dealer = normaliseDealer(body.dealer);
    if (!dealer.name) return res.status(400).json({ error: 'dealer.name required' });
    try {
      const row = {
        title: `Track A Outreach · ${dealer.name} · Email ${dealer.emailStage + 1}`,
        job_type: 'track_a_social',
        model: OUTREACH_MODEL,
        persona_id: 'cornerstone_track_a_outreach',
        system_prompt: 'You are Cornerstone AI Group\'s elite founder-led B2B automotive outreach strategist. Optimise for open rate and reply rate while protecting factual accuracy. The dealer is a real prospect, not a fictional example.',
        user_prompt: buildOutreachPrompt(dealer),
        options: { max_tokens: 6500, temperature: 0.52, research: true, outreach: true, crm_dealer_id: dealer.id },
        status: 'queued',
        production_status: 'not_started',
      };
      const response = await fetch(`${SUPABASE_URL}/rest/v1/local_ai_jobs`, {
        method: 'POST',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(row),
      });
      const text = await response.text();
      if (!response.ok) return res.status(response.status).json({ error: `Qwen queue failed: ${text}` });
      const created = JSON.parse(text)[0];
      return res.status(200).json({ jobId: created.id, dealer });
    } catch (error) {
      console.error('queue_outreach error', error);
      return res.status(500).json({ error: error?.message || String(error) });
    }
  }

  const { id, update } = body;
  if (!id || !update || typeof update !== 'object') return res.status(400).json({ error: 'id and update object required' });

  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/content_queue?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(update),
  });

  if (!patchRes.ok) {
    const err = await patchRes.text();
    console.error('queue-update error:', patchRes.status, err);
    return res.status(patchRes.status).json({ error: `Supabase update failed: ${err}` });
  }

  return res.status(200).json({ success: true });
}
