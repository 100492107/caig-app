// Server-side bridge for CRM -> local Qwen outreach jobs.
// Keeps the Qwen job queue behind the existing Supabase service-role boundary.
const SUPABASE_URL = 'https://zvyioxhwdyocaanzcgqf.supabase.co';
const MODEL = process.env.QWEN_MODEL || 'orcarouter/Qwen3.8-27B-Uncensored-MLX';

function clean(value) {
  return String(value ?? '').trim();
}

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

function buildPrompt(dealer) {
  return `You are the senior outbound sales strategist for Cornerstone AI Group. You are preparing Email 1 for a real dealership prospect.

DEALER DATA — USE ONLY WHAT IS PROVIDED. NEVER INVENT A DEALER FACT, VEHICLE FACT, PERSON DETAIL, RESULT, TESTIMONIAL OR OBSERVATION.
${JSON.stringify(dealer, null, 2)}

CORE BUSINESS TRUTH:
Cornerstone improves the presentation of the dealer's real stock using the photos the dealer already takes. The goal is stronger listing presentation and less avoidable photography/listing admin, without asking the sales team to become photographers or image operators.

COMMERCIAL PATH:
Cold outreach → positive reply → sample → short diagnostic call → controlled paid pilot → repeat / recurring support.

CREDIBILITY:
Founder has practical Volkswagen and Kia main-dealer floor experience and understands stock turn, hold time, listing quality, margin pressure, and the reality of who ends up doing photography/listing tasks.

FUNDAMENTALS — EMAIL 1:
1. OPEN RATE MATTERS. Create 3 subject lines. They must be short, human and curiosity-led. Avoid generic sales language, fake urgency, spammy words and obvious AI phrasing. Prefer 3–7 words. One should use the real vehicle/listing when available.
2. REPLY RATE MATTERS MORE. The body must create a reason to answer, not merely read. End with a very easy question or invitation that can be answered in one line.
3. PATTERN INTERRUPT. The first 1–2 lines must NOT start with 'I hope you're well', 'My name is', 'I work with dealerships', or a generic compliment. Start with a specific tension, observation supplied in the dealer data, or a useful contrarian point.
4. INTRIGUE. Create an open loop. The dealer should want to know what you noticed or what the example looks like.
5. HUMAN. Founder-led, direct, slightly cheeky when natural, dealership-aware. No corporate jargon. No exclamation marks by default.
6. SHORT. Aim for 70–120 words. One main idea.
7. NO HARD SELL. Do not discuss price. Do not ask for a long meeting. Do not dump features. Do not mention AI/model names unless the prospect explicitly asks.
8. SAMPLE-FIRST. The best next step is usually 'want me to show you?' or 'happy to send you the example'.
9. IF A VEHICLE IS PROVIDED, USE IT. The sample vehicle is the bridge between curiosity and proof.
10. DO NOT CLAIM a problem you did not observe. When evidence is missing, frame the angle as an operational possibility rather than a factual accusation.

FORMAT / FORMAT-ARCHAEOLOGY MINDSET:
Borrow proven outreach psychology from strong B2B, sales, SaaS, automotive and founder-led outreach formats. Do not copy wording. Identify the mechanism: curiosity gap, status-quo cost, pattern interrupt, contrarian observation, micro-audit, or sample-led intrigue. Keep the message dealership-specific.

OUTPUT EXACTLY JSON IN THIS SHAPE:
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
  "followup_plan": {
    "day_2_angle": "",
    "day_3_angle": "",
    "day_4_angle": "",
    "day_5_angle": ""
  },
  "quality_gate": {
    "pattern_interrupt": "PASS",
    "curiosity": "PASS",
    "replyability": "PASS",
    "specificity": "PASS",
    "human_voice": "PASS",
    "no_unsupported_claims": "PASS",
    "no_spammy_language": "PASS"
  }
}

Return JSON only.`;
}

async function supabaseRequest(path, options = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const dealer = normaliseDealer(body.dealer);
  if (!dealer.name) return res.status(400).json({ error: 'dealer.name required' });

  try {
    const row = {
      title: `Track A Outreach · ${dealer.name} · Email ${dealer.emailStage + 1}`,
      job_type: 'track_a_social',
      model: MODEL,
      persona_id: 'cornerstone_track_a_outreach',
      system_prompt: 'You are Cornerstone AI Group\'s elite founder-led B2B automotive outreach strategist. Protect truthfulness. Optimise for open rate and reply rate, not vanity copy quality.',
      user_prompt: buildPrompt(dealer),
      options: {
        max_tokens: 6500,
        temperature: 0.52,
        research: true,
        outreach: true,
        crm_dealer_id: dealer.id,
      },
      status: 'queued',
      production_status: 'not_started',
    };

    const response = await supabaseRequest('local_ai_jobs', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error('queue-outreach Supabase error', response.status, text);
      return res.status(response.status).json({ error: `Qwen queue failed: ${text}` });
    }
    const created = JSON.parse(text)[0];
    return res.status(200).json({ jobId: created.id, dealer });
  } catch (error) {
    console.error('queue-outreach error', error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
