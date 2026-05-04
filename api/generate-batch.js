// Vercel serverless function — runs the full content generation batch server-side.
// Streams each completed post back as NDJSON (one JSON line per post) so the
// browser can save to queue in real-time regardless of screen state.

const MAX_RETRIES = 1;
const DELAY_MS = 400; // ms between posts

const TODAY = new Date().toLocaleDateString("en-GB", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

const CREATIVE_ANGLES = [
  { label: "contrarian take", instruction: "Take a position that goes against the conventional wisdom in this niche. Be specific about what the mainstream gets wrong and why." },
  { label: "personal story", instruction: "Tell a real personal story with a beginning, middle, and end. Specific moment, specific emotion, specific outcome. Not a tip — a story." },
  { label: "number drop", instruction: "Lead with a specific, surprising number that stops the scroll. Real prices, real stats, real percentages — make the numbers do the work." },
  { label: "myth bust", instruction: "Identify one widely-believed myth in this niche and dismantle it with specifics. Name the myth clearly, then destroy it." },
  { label: "hot take", instruction: "State an opinion that will divide the comments. Be bold enough that some people will disagree. The controversy is the engagement." },
  { label: "behind the scenes", instruction: "Show what happens behind the polished version. The messy reality, the thing they don't show on Instagram, the unglamorous truth." },
  { label: "comparison", instruction: "Compare two specific things — two destinations, two products, two approaches — with real numbers or real experience. Make the comparison genuinely useful." },
  { label: "regret confession", instruction: "Share something you did wrong, wish you'd done differently, or spent money on that wasn't worth it. Vulnerability and honesty are the hook." },
  { label: "insider tip", instruction: "Share something that feels like insider knowledge — the thing most people don't know, the hack that isn't obvious, the secret that sounds almost too specific to be true." },
  { label: "timeline reveal", instruction: "Show a real timeline of progress or change. Specific dates, specific moments, specific results. Make the audience feel the passage of time." },
];

// ─── IMAGE PROMPT VARIETY SEEDS ───────────────────────────────────────────────
// Each array has 12+ entries. postIndex % length gives deterministic variety.

const IMG_SETTINGS = [
  { setting: "Luxury hotel room, unmade white linen bed, floor-to-ceiling window overlooking city skyline", lighting: "Soft morning diffused light through sheer curtains, warm golden tones on skin", camera: "Leica SL2, 50mm Summilux, eye-level medium shot, shallow depth of field" },
  { setting: "Private white-sand beach at golden hour, shallow ocean waves lapping at shore, Mediterranean cliffs in distant background", lighting: "Late afternoon golden-hour sunlight, strong natural rim light, warm shimmering highlights on wet skin", camera: "Leica SL2, 85mm, low angle near water level, RAW" },
  { setting: "Ultra-modern minimalist bathroom, matte white walls, dark architectural lines, grey geometric floor tiles, large illuminated mirror", lighting: "High-key circular LED mirror light, brilliant specular highlights on surfaces", camera: "Sony A7R V, 35mm, full-body mirror reflection, wide editorial framing" },
  { setting: "Outdoor rooftop terrace at dusk, infinity pool, city lights beginning to glow below, warm evening air", lighting: "Blue-hour ambient with warm pool uplighting, twilight gradient sky", camera: "Leica SL2, 50mm, three-quarter body, editorial framing" },
  { setting: "Sleek penthouse living room, white sectional sofa, abstract art on wall, floor-to-ceiling city view", lighting: "Natural diffused daylight from panoramic windows, clean neutral tones", camera: "Sony A1, 85mm f/1.4, shallow DOF, full-body editorial" },
  { setting: "Forest hot spring, steaming natural pool surrounded by mossy rocks and pine trees, total privacy", lighting: "Dappled late-afternoon forest light, steam creating soft diffusion", camera: "Leica SL2, 50mm, medium shot, film grain" },
  { setting: "Boutique hotel bathroom, freestanding copper bathtub, marble floor, single window with sheer curtain", lighting: "Soft single-window natural light, intimate warm glow", camera: "iPhone 16 Pro natural mode, eye-level, 4:5 crop, hyper-realistic" },
  { setting: "Private villa poolside, terracotta tiles, bougainvillea in background, sunlounger in direct sun", lighting: "Midday Mediterranean direct sun, high contrast, deep shadows", camera: "Leica SL2, 35mm, full-body wide shot" },
  { setting: "Minimalist studio space, seamless white backdrop, large softbox to left", lighting: "Studio two-light setup, soft fill from right, deliberate shadow on one side", camera: "Sony A1, 85mm f/1.4, full-body editorial" },
  { setting: "Dimly lit luxury bedroom, candles on bedside table, silk sheets, blackout curtains, intimate atmosphere", lighting: "Warm candlelight and low bedside lamp, deep shadows, intimate glow on skin", camera: "Leica SL2, 50mm, medium close-up, natural film grain" },
  { setting: "Outdoor shower on private villa terrace, stone tiles, lush tropical plants surrounding, open sky above", lighting: "Bright overhead midday light, water catching light and creating sparkle", camera: "Sony A7R V, 35mm, full-body, water droplets sharp" },
  { setting: "Modern penthouse bedroom, king bed with white duvet, abstract art on wall, morning light flooding in", lighting: "Soft morning window light, cool-white balance, clean editorial", camera: "Leica SL2, 50mm, medium shot from foot of bed, wide editorial" },
];

const IMG_POSES = [
  "Lying face-down on bed, head turned toward camera, direct gaze, arched back, legs extended, arms folded under chin",
  "Seated on edge of bath, knees together, weight on one hip, torso angled toward camera, looking over shoulder with soft confident expression",
  "Standing at floor-to-ceiling window, back to camera, arms raised touching frame, gaze directed outside, full profile visible",
  "Reclined in shallow water on back, head tilted toward sky, eyes closed, arms relaxed at sides, legs extended, serene athletic pose",
  "Seated cross-legged on bed, elbows resting on knees, leaning forward toward lens, direct eye contact, hair falling naturally",
  "Standing in doorway, one arm raised against frame, hip cocked, weight on one leg, direct confident gaze at camera",
  "Kneeling on bed facing camera, body upright, hands resting on thighs, direct gaze, editorial framing from slight low angle",
  "Side-lying on sofa or lounger, head propped on hand, legs stacked, body in natural S-curve, looking directly at camera",
  "Seated in bath, knees drawn up to chest, arms wrapped lightly around knees, head tilted, soft gaze at camera",
  "Standing in outdoor shower, face tilted up toward water, eyes closed, hands loosely in hair, full body visible, profile angle",
  "Half-standing at mirror, one knee on bed, torso angled, looking back at camera over shoulder, low-angle editorial frame",
  "Lying on back on white linen, one knee bent, head turned toward camera, arms above head, relaxed confident energy",
];

const IMG_COVERAGE = [
  "Wearing only low-rise denim, unbuttoned at waist, crop framed from collarbone up — implied minimal coverage",
  "Draped face-down across bed, bare back and legs visible, silhouette editorial and artistic",
  "Open silk robe falling off both shoulders, loosely tied — Vogue Intimates editorial style, minimal layering",
  "Seated with knees drawn up, arms loosely resting — natural elegant coverage, high-fashion boudoir",
  "Minimal thin-strap bodycon, low-slung, high-cut — Sports Illustrated Swimsuit editorial framing",
  "Standing back-to-camera, full back and legs in frame — artistic silhouette, Spencer Tunick style",
  "In freestanding bathtub, water surface artfully framing subject — fine art editorial photography",
  "Under outdoor shower water — wet skin, editorial fashion, water highlighting form",
  "White linen sheet draped artfully — one shoulder exposed, fabric falling low — luxury editorial",
  "Lying face-down, white sheet across lower back only — back and shoulders bare — high-end boudoir editorial",
  "Oversized open dress shirt hanging off shoulders — nothing beneath — Treats! Magazine editorial style",
  "Standing at window, natural backlight silhouette — artistic fine art photography, Spencer Tunick aesthetic",
];

async function callGemini(apiKey, system, user, maxTokens = 2000) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: user }] }],
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: { maxOutputTokens: maxTokens, temperature: 1.0 },
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt + 1) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(data?.error?.message || `Gemini error ${res.status}`);
    const text = (data.candidates || [])
      .map(c => (c.content?.parts || []).map(p => p.text || "").join(""))
      .join("").trim();
    if (!text) throw new Error("Empty response from Gemini");
    return text;
  }
}

function parseJSON(raw) {
  const clean = raw.replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch (_) {}
  const m = clean.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  throw new Error("Could not parse JSON from LLM response");
}

async function researchTrends(apiKey, platformName, niche, fanvueMode) {
  const system = `You are an expert social media trend analyst. Today is ${TODAY}. Your job is to find what is ACTUALLY being talked about right now — not generic evergreen topics. Be hyper-specific: name real events, real people, real controversies, real viral moments.`;
  const user = fanvueMode
    ? `Research what is trending RIGHT NOW for subscription creators (Fanvue, OnlyFans) on ${platformName} in ${TODAY.split(" ").pop()}.

Include:
- Specific viral moments, memes, or formats subscription creators are using on ${platformName} right now
- Any trending audio, aesthetics, or visual styles popular in this creator space
- What fans are engaging with or asking for most this week
- Any seasonal hooks (time of year, upcoming holidays, events)
- Any creator drama, controversies, or trends being discussed in the subscription creator community
- What content formats are getting the most reach on ${platformName} for this niche right now

Be concrete and specific. 4-5 sentences max.`
    : `Research the ${niche} niche on ${platformName} specifically. What are 3-4 SPECIFIC things people are talking about, debating, or engaging with RIGHT NOW in ${TODAY.split(" ").pop()}?

Include:
- Any viral moments, controversies, or news from the past 7 days
- Specific names, places, brands, events — especially ones trending on ${platformName}
- What audiences are arguing about or reacting to on ${platformName}
- Any seasonal or timely hooks (time of year, upcoming events)
- What formats or sounds are trending on ${platformName} right now

Be concrete. 4-5 sentences max.`;

  try { return await callGemini(apiKey, system, user, 1000); } catch (_) { return ""; }
}

async function generatePost(apiKey, persona, platform, pillar, postIndex, usedHooks, ideaSeed, fanvueMode, cachedTrends) {
  const mix = platform.contentMix;
  const totalWeight = mix.reduce((s, m) => s + m.weight, 0);
  const seed = ((postIndex * 7 + Date.now()) % totalWeight);
  let acc = 0, contentType = mix[0];
  for (const m of mix) { acc += m.weight; if (seed < acc) { contentType = m; break; } }

  const angleIndex = (postIndex * 3 + Math.floor(Math.random() * CREATIVE_ANGLES.length)) % CREATIVE_ANGLES.length;
  const creativeAngle = CREATIVE_ANGLES[angleIndex];

  const trends = cachedTrends || "";

  const isSage = persona.id === "sage";

  const system = `You are ${persona.name}, a ${fanvueMode ? "subscription content creator with a Fanvue page" : persona.niche + " content creator"}.
CHARACTER: ${persona.char}
VOICE: ${persona.voice}
PLATFORM CONTEXT: You are posting on ${platform.name}. ${platform.purpose}
${fanvueMode ? `FANVUE MODE — READ CAREFULLY:
You are a real subscription creator. Your free content (Reddit, X, Telegram, Instagram, TikTok) is your funnel — every post must make someone think "I need to see what's on her page". Your Fanvue page is where the premium content lives — exclusive sets, PPV, DMs.

TONE: Sexually confident, seductive, unapologetic. You know exactly what effect you have on people and you use it. Your captions have sexual tension — the reader should feel like something is happening between you and them. Warm enough to feel real, bold enough to make them uncomfortable in a good way. Casual, like sexting someone you're very comfortable with.

WRITING STYLE EXAMPLES — match this energy:
- "woke up naked and spent 20 minutes debating whether to post this. decided yes. it's on my page 🔒"
- "the set I posted last night has had more unlocks than anything I've ever put up. I'll let you decide why 🫦"
- "I don't usually post stuff this explicit on here but I'm feeling bold today. link in bio if you want the rest"
- "every time I do a nude shoot in that bathroom I forget how good the light is in there. new set up now"
- "asked my photographer to delete some of these. she refused. they're on my page instead"

CONTENT RULES:
- Say exactly what's on the page — "a fully nude set", "nothing on at all", "you can see everything", "this is the explicit version".
- Use sexual tension in the writing — not graphic, but charged. The reader should feel desire, not just curiosity.
- First person, present tense, casual. Contractions. Short sentences that punch.
- Every post: one thing that creates desire, one reason to click.
- No euphemisms for nudity. No coy language. Direct.
- CANNOT produce: graphic sex acts, anatomical descriptions, anything involving third parties.` : `NICHE LOCK: Every single word of this post must be rooted in ${persona.niche}. The examples, references, terminology, humour, pain points, and culture must all come from inside the ${persona.niche} world.`}
RULES: Write entirely in character as a real person. Never mention AI. Content pillars: ${(persona.pillars || []).join(", ")}.
FORMAT: Return ONLY a raw JSON object. No markdown. No explanation. No code fences.`;

  const user = `Today is ${TODAY}. Create a ${platform.name} post as ${persona.name}.

CONTENT TYPE: "${contentType.label}"
FORMAT: ${contentType.format}
VISUAL/CONTENT DIRECTION: ${contentType.direction}
PILLAR: "${pillar}"
CREATIVE ANGLE FOR THIS POST: "${creativeAngle.label}" — ${creativeAngle.instruction}
${ideaSeed ? `IDEA SEED (incorporate this topic/idea as inspiration): "${ideaSeed}"` : ""}
${trends ? `TRENDING RIGHT NOW on ${platform.name} (use this to make the post timely — do NOT ignore this): ${trends}` : ""}
UNIQUENESS SEED: ${Date.now()}-${postIndex}-${Math.random().toString(36).slice(2, 8)}
POST NUMBER: #${postIndex + 1} of this batch — every single post MUST be completely different.
${usedHooks.length > 0 ? `\nABSOLUTELY FORBIDDEN hooks (do NOT start with anything similar):\n${usedHooks.map((h, i) => `${i + 1}. "${h}"`).join("\n")}` : ""}

CRITICAL RULES:
- Never mention AI, never hint the content is AI-generated. You ARE this person.
- This is a ${contentType.label} post. Match the tone and energy exactly.
- APPLY THE CREATIVE ANGLE: "${creativeAngle.label}" — this must shape the structure of your post.
${fanvueMode ? `- FANVUE POST TYPE RULES:
${contentType.type === "fv_tease" ? "TEASE POST: Write with sexual tension. Open with something that makes them feel desire. State exactly what's on the page ('fully nude set', 'nothing on at all', 'you can see everything'). The caption should feel like foreplay — leading somewhere. Hard CTA at the end." : ""}${contentType.type === "fv_ppv" || contentType.type === "fv_ppv_caption" ? "PPV POST: Name the content explicitly — 'fully nude bedroom shoot', 'nothing on in this one', 'nude shower set'. Describe what makes it worth unlocking in charged, seductive language. Make them feel like not buying is missing something real. Urgency without desperation." : ""}${contentType.type === "fv_personality" ? "PERSONALITY POST: Real and funny but laced with seductive energy. Even mundane moments should have an undercurrent of 'I'm someone you want to know better'. Drop nude content references naturally. The charm IS the seduction." : ""}${contentType.type === "fv_dm" || contentType.type === "fv_welcome" ? "DM/WELCOME: Write like you're texting someone you're attracted to who's attracted to you. Warm, intimate, charged. Tell them exactly what's on your page. Make them feel chosen. End with something that makes them want to explore or reply." : ""}${contentType.type === "fv_preview" ? "EXCLUSIVE PREVIEW: Telegram fans are warm — be explicitly intimate here. Describe the content directly, reference the nudity, make them feel like insiders getting something nobody else sees. Charged, personal, urgent." : ""}${contentType.type === "fv_announce" ? "CONTENT ANNOUNCEMENT: Write with the energy of someone who knows they've just posted something incredible. Name the nudity directly. Proud, bold, daring. Make them feel like not clicking is a mistake." : ""}${contentType.type === "fv_interact" ? "FAN INTERACTION: Ask something with sexual tension baked in. 'Be honest — did you expect that set?', 'do you prefer completely bare or barely covered?', 'what do you actually want to see next?'. Charged enough to demand an answer." : ""}${contentType.type === "fv_wall_post" ? "FREE WALL POST: Write for subscribers who already like you. Reference specific nude content. Intimate, body-confident, charged. Make staying subscribed feel like the obvious choice." : ""}` : `${contentType.type === "lifestyle" || contentType.type === "personal_moment" ? "- PERSONAL/LIFESTYLE post: casual, short, conversational — like texting a friend." : ""}${contentType.type === "tag_friend" ? "- Write something that makes people tag a friend." : ""}${contentType.type === "discussion" ? "- Ask a bold question or opinion that splits the comments." : ""}${contentType.type === "deep_story" || contentType.type === "day_in_life" ? "- Tell a STORY with setup, tension, resolution." : ""}`}
- DO NOT repeat hooks, topics, or structures from any other post in this batch.

Return this exact JSON format:
{
  "hook": "${fanvueMode ? "First line — seductive, charged, direct. Under 12 words. Should create immediate desire or make them feel something. Can reference nudity or page content outright. Reads like the opener of a text from someone you want." : `First line — must stop the scroll. Under 12 words. ${contentType.type === "lifestyle" || contentType.type === "personal_moment" ? "Can be casual/playful." : "Specific number or bold statement."}`}",
  "caption": "${fanvueMode
    ? (contentType.type === "fv_dm" || contentType.type === "fv_welcome"
      ? "Personal, intimate, charged. 80-160 chars. Like a text from someone who knows what you want. Reference what's on the page. Make them feel chosen. End with a pull — a question, an invitation, a reason to reply."
      : contentType.type === "fv_ppv" || contentType.type === "fv_ppv_caption"
      ? "PPV sell caption. 120-200 chars. Name the content explicitly. Write in charged, seductive language — what it is, why it's worth it, what they'll see. The reader should feel like not unlocking it would be a mistake. CTA."
      : contentType.type === "fv_interact"
      ? "Question with sexual tension. 60-120 chars. Not crude — charged. Personal, direct, makes them want to answer."
      : "Caption ready to post. 150-240 chars. Seductive and warm — sexual tension with personality underneath. Direct references to nudity or page content. Should feel like a text from someone desirable.")
    : (contentType.type === "lifestyle" || contentType.type === "personal_moment"
      ? "Short casual caption. 80-150 chars. Like texting a friend."
      : contentType.type === "deep_story" || contentType.type === "day_in_life" || contentType.type === "deep_dive"
      ? "Full narrative caption. 300-500 chars. Story arc: setup, tension, resolution."
      : "Full caption ready to paste. 180-260 chars. In character voice. Feels personal and authentic.")}",
  "hashtags": "${fanvueMode ? "8-12 hashtags relevant to subscription creators and this platform." : "12-15 hashtags as one string, mix of niche and broad"}",
  "photo_direction": "${fanvueMode ? "Portrait/square format." : "9:16 aspect ratio."} ${contentType.direction}",
  "photo_idea": "${fanvueMode
     ? "Shoot brief for a real photo shoot — boudoir/editorial style. Be specific. Include: (1) Setting — bedroom, hotel room, bathroom, poolside, outdoor. (2) Wardrobe/styling — e.g. 'topless, low-rise jeans', 'wrapped in white sheet, one shoulder bare', 'open silk robe loosely tied', 'back to camera, draped in linen', 'minimal bikini, wet'. Use fashion editorial language. (3) Pose — e.g. 'lying face-down on bed, looking back over shoulder', 'standing at window arms raised, back to camera', 'seated on edge of bath, knees together'. (4) Lighting — golden-hour window, bathroom vanity, soft studio, candlelight. (5) Mood — intimate, confident, editorial, natural. 3-4 sentences."
     : "Concrete photo shoot brief. Include: specific location or backdrop, outfit/clothing details, lighting, pose or action, camera angle. 2-3 sentences."}",
  "cta": "${fanvueMode
    ? (contentType.type === "fv_interact" ? "Prompt for replies or DMs — tie it to the content" : contentType.type === "fv_personality" ? "Casual CTA to page — reference what's there" : "Direct CTA to Fanvue page — reference specific content type (nude set, PPV, etc.)")
    : (contentType.type === "lifestyle" || contentType.type === "personal_moment" ? "Casual low-key question or emoji reaction prompt" : contentType.type === "tag_friend" ? "Tag someone who needs to see this" : "One specific low-friction ask")}",
  "post_type": "${contentType.type}",
  "content_label": "${contentType.label}",
  "trend_hook": "${trends ? "one word describing the trend angle used, or null" : "null"}"
}`;

  return parseJSON(await callGemini(apiKey, system, user, 2000));
}

async function generateImagePrompt(apiKey, persona, post, platform, contentTypeLabel, postIndex = 0) {
  const si = postIndex % IMG_SETTINGS.length;
  const pi = (postIndex + 3) % IMG_POSES.length;
  const ci = (postIndex + 7) % IMG_COVERAGE.length;
  const seed = IMG_SETTINGS[si];
  const pose = IMG_POSES[pi];
  const coverage = IMG_COVERAGE[ci];

  // Pre-interpolate everything so Gemini has zero placeholders to genericise
  const system = `You are a photorealistic image generation prompt writer. You output ONLY valid JSON — no markdown, no code fences, no explanation. You write vivid, specific, finished prose — never instructions, never placeholder text in brackets.`;

  const shootBrief = (post.photo_idea || "").trim();
  const postHook = (post.hook || "").trim();
  const postCaption = (post.caption || "").trim();

  const user = `Write an image generation prompt for this specific post. The scene must visually match the post content — same mood, same energy, same story.

POST DETAILS:
- Hook: "${postHook}"
- Caption: "${postCaption}"
- Shoot brief: "${shootBrief}"
- Content type: ${contentTypeLabel}

SCENE PARAMETERS — incorporate all of these literally:
- Setting: ${seed.setting}
- Lighting: ${seed.lighting}
- Camera: ${seed.camera}
- Pose: ${pose}
- Wardrobe: ${coverage}

Write this JSON with fully realised prose in every field — no brackets, no instructions, no placeholders:

{
  "identity_lock": "PIXEL PRIORITY: Graft exact face from reference_image_1.png onto body from reference_image_2.png. Zero face drift. Zero eye colour change. Zero hair change. Seamless neck blend.",
  "subject": "WRITE 2 SPECIFIC SENTENCES HERE: Describe ${persona.name} in this exact scene — her pose (${pose}), her expression matching the post mood ('${postHook}'), and how she holds herself in the setting.",
  "wardrobe": "WRITE 1-2 SENTENCES HERE: Describe the wardrobe (${coverage}) in luxury fashion editorial language — specific fabric, how it fits and sits on the body, any details catching the light.",
  "setting": "WRITE 1-2 SENTENCES HERE: Describe this specific setting (${seed.setting}) — exact furniture, materials, textures, depth of the background.",
  "lighting": "WRITE 1 SENTENCE HERE: Describe this lighting (${seed.lighting}) — direction, quality, colour temperature, how it falls on skin.",
  "technical": "${seed.camera}, 9:16 vertical, RAW format, 8K resolution, cinematic luxury editorial, hyper-sharp eyes and skin, natural film grain, zero AI artifacts",
  "negative_prompt": "nudity, explicit content, NSFW, suggestive, distorted anatomy, warped limbs, extra fingers, low resolution, blurry, plastic skin, face drift, wrong eye colour, wrong hair, watermark, text, cartoon"
}

CRITICAL: Replace every field that says "WRITE ... HERE" with actual vivid prose. The subject field must reflect the specific post hook and mood. Return ONLY the raw JSON object.`;

  try { return parseJSON(await callGemini(apiKey, system, user, 1000)); } catch (_) {
    try { return parseJSON(await callGemini(apiKey, system, user, 1000)); } catch (_2) { return null; }
  }
}

Write every bracket field as vivid finished prose. Return ONLY the raw JSON.`;

  try { return parseJSON(await callGemini(apiKey, system, user, 1500)); } catch (_) {
    try { return parseJSON(await callGemini(apiKey, system, user, 1500)); } catch (_2) { return null; }
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { reject(new Error("Invalid JSON")); } });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  let body;
  try { body = await readBody(req); } catch (e) { return res.status(400).json({ error: e.message }); }

  const { slots, personas, platforms, fanvueMode, ideaSeed } = body;
  if (!slots?.length || !personas?.length || !platforms?.length) {
    return res.status(400).json({ error: "Missing required fields: slots, personas, platforms" });
  }

  // Stream NDJSON — one JSON line per completed post, one {"done":true} at the end
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering if present
  res.flushHeaders();

  const usedHooks = [];

  // Pre-fetch trends once per platform — avoids one Gemini call per post
  const trendsCache = {};
  for (const platform of platforms) {
    trendsCache[platform.id] = await researchTrends(apiKey, platform.name, personas[0]?.niche || "", fanvueMode || false);
  }

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const persona = personas.find(p => p.id === slot.personaId);
    const platform = platforms.find(p => p.id === slot.platformId);

    if (!persona || !platform) {
      res.write(JSON.stringify({ error: true, index: i, reason: "persona or platform not found" }) + "\n");
      continue;
    }

    try {
      // Send progress ping so browser knows this slot started
      res.write(JSON.stringify({ progress: true, index: i, status: "running" }) + "\n");

      const post = await generatePost(
        apiKey, persona, platform, slot.pillar, slot.postIndex || i,
        [...usedHooks], ideaSeed || "", fanvueMode || false, trendsCache[platform.id] || ""
      );

      if (post.hook) usedHooks.push(post.hook);

      // For Fanvue posts generate structured image prompt for ALL content types
      if (fanvueMode) {
        const FALLBACK_BRIEFS = {
          fv_tease:       "Alluring boudoir editorial. Creator at window, open silk shirt falling off shoulders, low-rise jeans. Strong directional daylight. Direct eye contact, confident expression. Vogue Intimates style.",
          fv_ppv:         "PPV preview portrait. Creator on edge of bed leaning forward, wrapped loosely in white sheet, one shoulder bare. Warm soft candlelight. Confident, intimate expression.",
          fv_ppv_caption: "Locked content preview. Creator lying face-down on white bed, looking back over shoulder. Linen sheet across lower back. Soft morning window light. Intimate, high-end boudoir editorial.",
          fv_dm:          "Close-up intimate portrait. Creator on bed, direct eye contact, warm golden-hour light. Thin-strap bodycon, one strap falling. Hair down, soft warm expression.",
          fv_welcome:     "Close-up intimate portrait. Creator on bed, direct eye contact, warm golden-hour light. Thin-strap bodycon, one strap falling. Hair down, soft warm expression.",
          fv_personality: "Candid natural portrait. Creator in bedroom, relaxed, open oversized shirt as a top, low-rise jeans. Natural daylight. Genuine, unposed expression.",
          fv_interact:    "Playful direct portrait. Creator seated cross-legged on bed, looking straight into camera, wearing only a thin-strap crop top. Warm soft light. Flirtatious expression.",
          fv_wall_post:   "Artistic boudoir. Creator lying on bed back to camera, draped in white linen, looking over shoulder. Soft morning light. Spencer Tunick fine art aesthetic.",
          fv_announce:    "Bold editorial portrait. Creator standing against plain light wall, open button-down shirt worn as a top, low-rise jeans. Strong directional light. Direct eye contact, slight smirk.",
          fv_preview:     "Exclusive preview. Creator at edge of bed leaning forward, loosely wrapped in satin sheet. Warm candlelight. Intimate, exclusive atmosphere.",
        };
        const shootBrief = post.photo_idea || FALLBACK_BRIEFS[post.post_type] || FALLBACK_BRIEFS["fv_tease"];
        const postForImg = { ...post, photo_idea: shootBrief };
        const imgPrompt = await generateImagePrompt(apiKey, persona, postForImg, platform, post.content_label || "", i);
        if (imgPrompt) post.image_prompt = imgPrompt;
      }

      const item = {
        id: `${Date.now()}_${i}`,
        ts: Date.now(),
        ...slot,
        ...post,
        status: "ready",
      };

      res.write(JSON.stringify({ post: item, index: i }) + "\n");
    } catch (e) {
      res.write(JSON.stringify({ error: true, index: i, reason: e.message }) + "\n");
    }

    if (i < slots.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  res.write(JSON.stringify({ done: true, total: slots.length }) + "\n");
  res.end();
}
