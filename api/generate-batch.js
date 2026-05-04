// Vercel serverless function — runs the full content generation batch server-side.
// Streams each completed post back as NDJSON (one JSON line per post) so the
// browser can save to queue in real-time regardless of screen state.

const MAX_RETRIES = 1;
const DELAY_MS = 300;

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
const IMG_SETTINGS = [
  { setting: "Luxury hotel room, unmade white linen bed, floor-to-ceiling window overlooking city skyline", lighting: "Soft morning diffused light through sheer curtains, warm golden tones on skin", camera: "Leica SL2, 50mm Summilux, eye-level medium shot, shallow depth of field" },
  { setting: "Private white-sand beach at golden hour, shallow ocean waves at shore, Mediterranean cliffs in background", lighting: "Late afternoon golden-hour sunlight, strong natural rim light, warm shimmering highlights", camera: "Leica SL2, 85mm, low angle near water level, RAW" },
  { setting: "Ultra-modern minimalist bathroom, matte white walls, dark architectural lines, large illuminated mirror", lighting: "High-key circular LED mirror light, brilliant specular highlights on surfaces", camera: "Sony A7R V, 35mm, full-body mirror reflection, wide editorial framing" },
  { setting: "Outdoor rooftop terrace at dusk, infinity pool edge, city lights beginning to glow below", lighting: "Blue-hour ambient with warm pool uplighting, twilight gradient sky", camera: "Leica SL2, 50mm, three-quarter body, editorial framing" },
  { setting: "Sleek penthouse living room, white sectional sofa, abstract art on wall, floor-to-ceiling city view", lighting: "Natural diffused daylight from panoramic windows, clean neutral tones", camera: "Sony A1, 85mm f/1.4, shallow DOF, full-body editorial" },
  { setting: "Forest hot spring, steaming natural pool surrounded by mossy rocks and pine trees", lighting: "Dappled late-afternoon forest light, steam creating soft diffusion", camera: "Leica SL2, 50mm, medium shot, film grain" },
  { setting: "Boutique hotel bathroom, freestanding copper bathtub, marble floor, single window with sheer curtain", lighting: "Soft single-window natural light, intimate warm glow", camera: "iPhone 16 Pro natural mode, eye-level, hyper-realistic" },
  { setting: "Private villa poolside, terracotta tiles, bougainvillea in background, sunlounger in direct sun", lighting: "Midday Mediterranean direct sun, high contrast, deep shadows", camera: "Leica SL2, 35mm, full-body wide shot" },
  { setting: "Minimalist studio space, seamless white backdrop, large softbox to left", lighting: "Studio two-light setup, soft fill from right, deliberate shadow on one side", camera: "Sony A1, 85mm f/1.4, full-body editorial" },
  { setting: "Dimly lit luxury bedroom, candles on bedside table, silk sheets, blackout curtains", lighting: "Warm candlelight and low bedside lamp, deep shadows, intimate glow on skin", camera: "Leica SL2, 50mm, medium close-up, natural film grain" },
  { setting: "Outdoor shower on private villa terrace, stone tiles, lush tropical plants, open sky above", lighting: "Bright overhead midday light, water catching light and creating sparkle", camera: "Sony A7R V, 35mm, full-body, water droplets sharp" },
  { setting: "Modern penthouse bedroom, king bed with white duvet, abstract art on wall, morning light flooding in", lighting: "Soft morning window light, cool-white balance, clean editorial", camera: "Leica SL2, 50mm, medium shot from foot of bed" },
];

const IMG_POSES = [
  "lying face-down on bed, head turned toward camera, direct gaze, arched back, arms folded under chin",
  "seated on edge of bath, knees together, weight on one hip, torso angled toward camera, looking over shoulder",
  "standing at floor-to-ceiling window, back to camera, arms raised touching frame, gaze directed outside",
  "reclined in shallow water, head tilted toward sky, eyes closed, arms relaxed at sides, legs extended",
  "seated cross-legged on bed, elbows on knees, leaning forward toward lens, direct eye contact, hair falling naturally",
  "standing in doorway, one arm raised against frame, hip cocked, weight on one leg, direct confident gaze",
  "kneeling on bed facing camera, hands resting on thighs, direct gaze, slight low angle",
  "side-lying on sofa, head propped on hand, legs stacked, body in natural S-curve, looking at camera",
  "seated in bath, knees drawn up to chest, arms wrapped lightly around knees, head tilted, soft gaze",
  "standing in outdoor shower, face tilted up toward water, eyes closed, hands loosely in hair",
  "half-standing at mirror, one knee on bed, torso angled, looking back at camera over shoulder",
  "lying on back on white linen, one knee bent, head turned toward camera, arms above head",
];

const IMG_COVERAGE = [
  "topless, low-rise denim unbuttoned at the hip, bare torso fully in frame — Vogue Intimates editorial, tasteful and unapologetic",
  "lying face-down, completely bare back and legs, lower back visible to the camera — high-end boudoir, Spencer Tunick fine art aesthetic",
  "open silk robe pushed entirely off both shoulders and pooling at the elbows, bare chest and torso exposed — Treats! Magazine editorial",
  "seated, knees drawn to chest, arms loosely at sides, upper body bare, natural coverage from posture only — fine art nude portrait",
  "topless, minimal high-cut bikini bottoms, wet skin glistening — Sports Illustrated Swimsuit Issue editorial",
  "full bare back and bare legs to camera, standing — Spencer Tunick large-scale fine art nude, artistic and compositional",
  "in freestanding copper bathtub, upper body fully visible above water line, bare — intimate fine art editorial, Helmut Newton style",
  "under outdoor shower, bare skin, water catching light — editorial fashion photography, completely natural",
  "white linen sheet draped low across the hips only, torso and chest fully bare, fabric just covering — Playboy editorial aesthetic",
  "lying face-down, white sheet across the lower back only, entire back, shoulders, and legs bare and in frame — luxury boudoir",
  "oversized open dress shirt completely off one shoulder, nothing beneath, one side of chest visible — Treats! Magazine editorial",
  "backlit silhouette at window, completely nude, form visible through strong backlighting — fine art nude photography, tasteful",
];

async function callGemini(apiKey, system, user, maxTokens = 3000) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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
  const clean = raw.replace(/```json\n?|```/g, "").trim();
  try { return JSON.parse(clean); } catch (_) {}
  const m = clean.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  throw new Error("Could not parse JSON from LLM response");
}

async function researchTrends(apiKey, platformName, niche, fanvueMode) {
  const system = `You are a social media trend analyst. Today is ${TODAY}. Be hyper-specific — name real events, real people, real viral moments. 4-5 sentences max. No padding.`;
  const user = fanvueMode
    ? `What is trending RIGHT NOW for subscription creators (Fanvue/OnlyFans) on ${platformName} this week? Specific viral formats, aesthetics, what fans are engaging with most, any seasonal hooks.`
    : `What are 3-4 specific things the ${niche} community is talking about on ${platformName} RIGHT NOW? Viral moments, controversies, trending formats. Be concrete.`;
  try { return await callGemini(apiKey, system, user, 500); } catch (_) { return ""; }
}

async function generatePost(apiKey, persona, platform, pillar, postIndex, usedHooks, ideaSeed, fanvueMode, cachedTrends) {
  const mix = platform.contentMix;
  const totalWeight = mix.reduce((s, m) => s + m.weight, 0);
  // Use postIndex only — not Date.now() — so each post gets a genuinely different content type
  const seed = (postIndex * 3) % totalWeight;
  let acc = 0, contentType = mix[0];
  for (const m of mix) { acc += m.weight; if (seed < acc) { contentType = m; break; } }

  const angleIndex = (postIndex * 7) % CREATIVE_ANGLES.length;
  const creativeAngle = CREATIVE_ANGLES[angleIndex];
  const trends = cachedTrends || "";

  const system = `You are ${persona.name}, a ${fanvueMode ? "subscription content creator with a Fanvue page" : persona.niche + " content creator"}.
CHARACTER: ${persona.char}
VOICE: ${persona.voice}
PLATFORM CONTEXT: You are posting on ${platform.name}. ${platform.purpose}
${fanvueMode ? `FANVUE MODE:
You are a real subscription creator. Your free posts are your funnel — every one must make someone think "I need to see what's on her page". Your Fanvue page is where the premium content lives — exclusive sets, PPV, DMs.

TONE: Sexually confident, seductive, unapologetic. Your captions have sexual tension — the reader should feel like something is happening between you and them. Casual, like a text from someone desirable.

WRITING STYLE EXAMPLES:
- "woke up naked and spent 20 minutes debating whether to post this. decided yes. it's on my page 🔒"
- "the set I posted last night has had more unlocks than anything I've ever put up. I'll let you decide why 🫦"
- "I don't usually post stuff this explicit on here but I'm feeling bold today. link in bio if you want the rest"
- "every time I do a nude shoot in that bathroom I forget how good the light is in there. new set up now"
- "asked my photographer to delete some of these. she refused. they're on my page instead"

CONTENT RULES:
- Say exactly what's on the page — "a fully nude set", "nothing on at all", "you can see everything".
- Sexual tension in the writing — charged, not graphic. The reader should feel desire.
- First person, present tense, casual. Short sentences. Contractions.
- No euphemisms. Direct. No graphic sex acts or anatomical descriptions.` : `NICHE LOCK: Every word must be rooted in ${persona.niche}. References, terminology, humour, pain points — all from inside the ${persona.niche} world.`}
FORMAT: Return ONLY a raw JSON object. No markdown. No explanation. No code fences.`;

  const user = `Today is ${TODAY}. Create a ${platform.name} post as ${persona.name}.

CONTENT TYPE: "${contentType.label}"
FORMAT: ${contentType.format}
DIRECTION: ${contentType.direction}
PILLAR: "${pillar}"
CREATIVE ANGLE: "${creativeAngle.label}" — ${creativeAngle.instruction}
${ideaSeed ? `IDEA SEED: "${ideaSeed}"` : ""}
${trends ? `TRENDING NOW on ${platform.name}: ${trends}` : ""}
POST INDEX: ${postIndex} — use this to make this post completely different from others in the batch.
${usedHooks.length > 0 ? `FORBIDDEN HOOKS — do NOT use anything similar to these:\n${usedHooks.map((h, i) => `${i + 1}. "${h}"`).join("\n")}` : ""}

${fanvueMode ? `POST TYPE RULES:
${contentType.type === "fv_tease" ? "TEASE: Sexual tension. Open with desire. State what's on the page ('fully nude set', 'nothing on at all'). Caption feels like foreplay. Hard CTA." : ""}
${contentType.type === "fv_ppv" || contentType.type === "fv_ppv_caption" ? "PPV: Name the content explicitly. Charged, seductive language. Make not buying feel like missing something real." : ""}
${contentType.type === "fv_personality" ? "PERSONALITY: Real and funny but seductive underneath. Drop page content references naturally." : ""}
${contentType.type === "fv_dm" || contentType.type === "fv_welcome" ? "DM/WELCOME: Like texting someone you're attracted to. Warm, intimate, charged. Make them feel chosen." : ""}
${contentType.type === "fv_interact" ? "INTERACTION: Question with sexual tension. 'Do you prefer completely bare or barely covered?' Personal, direct." : ""}
${contentType.type === "fv_announce" ? "ANNOUNCE: Energy of someone who knows they just posted something incredible. Name the nudity. Bold, daring." : ""}
${contentType.type === "fv_preview" ? "PREVIEW: Explicitly intimate. Describe the content directly. Make them feel like insiders." : ""}` : ""}

Return ONLY this JSON:
{
  "hook": "first line only — under 12 words — seductive and direct",
  "caption": "the full post caption ready to paste",
  "hashtags": "${fanvueMode ? "8-12 relevant hashtags as a string" : "12-15 hashtags as a string"}",
  "photo_direction": "${fanvueMode ? "portrait/square" : "9:16 vertical"} — ${contentType.direction}",
  "photo_idea": "specific shoot brief: setting, wardrobe/styling (fashion editorial language), pose, lighting, mood. 3-4 sentences.",
  "cta": "the call to action line",
  "post_type": "${contentType.type}",
  "content_label": "${contentType.label}",
  "trend_hook": "${trends ? "one word for the trend angle used" : "null"}"
}`;

  return parseJSON(await callGemini(apiKey, system, user, 3000));
}

async function generateImagePrompt(apiKey, persona, post, platform, postIndex) {
  const si = postIndex % IMG_SETTINGS.length;
  const pi = (postIndex + 3) % IMG_POSES.length;
  const ci = (postIndex + 7) % IMG_COVERAGE.length;
  const seed = IMG_SETTINGS[si];
  const pose = IMG_POSES[pi];
  const coverage = IMG_COVERAGE[ci];

  const hook = (post.hook || "").trim();
  const brief = (post.photo_idea || "").trim();

  // Build the subject, wardrobe, setting, lighting as real strings here in JS
  // so Gemini only needs to output a valid JSON object — no generation of prose needed
  const subject = `${persona.name} is ${pose} in ${seed.setting.split(",")[0].toLowerCase()}. Her expression carries the energy of the post: "${hook}".`;
  const wardrobeDesc = `She is wearing ${coverage}. The fabric and styling match a luxury fashion editorial aesthetic.`;
  const settingDesc = seed.setting;
  const lightingDesc = seed.lighting;

  const system = `You are an image generation prompt writer. Output ONLY a valid JSON object. No markdown, no code fences, no explanation.`;

  const user = `Create an image generation prompt JSON for this photo shoot.

SHOOT BRIEF FROM POST: "${brief}"
POST HOOK: "${hook}"

Use these exact values in the JSON fields below:

{
  "identity_lock": "PIXEL PRIORITY: Graft exact face from reference_image_1.png onto body from reference_image_2.png. Zero face drift. Zero eye colour change. Zero hair change. Seamless neck blend.",
  "subject": "${subject}",
  "wardrobe": "${wardrobeDesc}",
  "setting": "${settingDesc}",
  "lighting": "${lightingDesc}",
  "technical": "${seed.camera}, 9:16 vertical, RAW format, 8K resolution, cinematic luxury editorial, hyper-sharp eyes, realistic skin texture, natural film grain, zero AI artifacts",
  "negative_prompt": "explicit sexual acts, genitalia, pornographic content, distorted anatomy, warped limbs, extra fingers, low resolution, blurry, plastic skin, face drift, wrong eye colour, wrong hair, watermark, text overlay, cartoon, illustration"
}

Return that JSON exactly as written. Do not change any field values.`;

  try { return parseJSON(await callGemini(apiKey, system, user, 800)); } catch (_) {
    // If Gemini can't even return static JSON, build it directly
    return {
      identity_lock: "PIXEL PRIORITY: Graft exact face from reference_image_1.png onto body from reference_image_2.png. Zero face drift. Zero eye colour change. Zero hair change. Seamless neck blend.",
      subject,
      wardrobe: wardrobeDesc,
      setting: settingDesc,
      lighting: lightingDesc,
      technical: `${seed.camera}, 9:16 vertical, RAW format, 8K resolution, cinematic luxury editorial, hyper-sharp eyes, realistic skin texture, natural film grain, zero AI artifacts`,
      negative_prompt: "explicit sexual acts, genitalia, pornographic content, distorted anatomy, warped limbs, extra fingers, low resolution, blurry, plastic skin, face drift, wrong eye colour, wrong hair, watermark, text overlay, cartoon, illustration",
    };
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

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Pre-fetch trends once per platform
  const trendsCache = {};
  for (const platform of platforms) {
    trendsCache[platform.id] = await researchTrends(apiKey, platform.name, personas[0]?.niche || "", fanvueMode || false);
  }

  const usedHooks = [];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const persona = personas.find(p => p.id === slot.personaId);
    const platform = platforms.find(p => p.id === slot.platformId);

    if (!persona || !platform) {
      res.write(JSON.stringify({ error: true, index: i, reason: "persona or platform not found" }) + "\n");
      continue;
    }

    try {
      res.write(JSON.stringify({ progress: true, index: i, status: "running" }) + "\n");

      const post = await generatePost(
        apiKey, persona, platform, slot.pillar, i,  // use i not slot.postIndex for true uniqueness
        [...usedHooks], ideaSeed || "", fanvueMode || false, trendsCache[platform.id] || ""
      );

      if (post.hook) usedHooks.push(post.hook);

      if (fanvueMode) {
        const FALLBACK_BRIEFS = {
          fv_tease:       "Creator at window, open silk shirt falling off shoulders, low-rise jeans. Strong directional daylight. Direct eye contact.",
          fv_ppv:         "Creator on edge of bed leaning forward, wrapped loosely in white sheet, one shoulder bare. Warm candlelight.",
          fv_ppv_caption: "Creator lying face-down on white bed, looking back over shoulder. Linen sheet across lower back. Morning light.",
          fv_dm:          "Creator on bed, direct eye contact, golden-hour light. Thin-strap bodycon. Hair down, soft expression.",
          fv_welcome:     "Creator on bed, direct eye contact, golden-hour light. Thin-strap bodycon. Hair down, soft expression.",
          fv_personality: "Creator in bedroom, relaxed, oversized open shirt, low-rise jeans. Natural daylight. Genuine expression.",
          fv_interact:    "Creator seated cross-legged on bed, looking straight into camera, thin-strap crop top. Warm soft light.",
          fv_wall_post:   "Creator lying on bed back to camera, draped in white linen, looking over shoulder. Soft morning light.",
          fv_announce:    "Creator standing against plain wall, open button-down shirt, low-rise jeans. Strong directional light.",
          fv_preview:     "Creator at edge of bed leaning forward, loosely wrapped in satin sheet. Warm candlelight.",
        };
        const shootBrief = post.photo_idea || FALLBACK_BRIEFS[post.post_type] || FALLBACK_BRIEFS["fv_tease"];
        const postForImg = { ...post, photo_idea: shootBrief };
        const imgPrompt = await generateImagePrompt(apiKey, persona, postForImg, platform, i);
        if (imgPrompt) post.image_prompt = imgPrompt;
      }

      const item = { id: `${Date.now()}_${i}`, ts: Date.now(), ...slot, ...post, status: "ready" };
      res.write(JSON.stringify({ post: item, index: i }) + "\n");
    } catch (e) {
      res.write(JSON.stringify({ error: true, index: i, reason: e.message }) + "\n");
    }

    if (i < slots.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  res.write(JSON.stringify({ done: true, total: slots.length }) + "\n");
  res.end();
}
