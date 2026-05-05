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

// ─── IMAGE SHOT LIBRARY — 20 fully art-directed shots ─────────────────────────
// Each entry is one coherent brief: setting + angle + wardrobe + lighting + camera.
// Rotated by postIndex so every post in a batch gets a different shot concept.
const IMG_SHOTS = [
  {
    setting: "Luxury hotel room, king bed with rumpled white linen, floor-to-ceiling window, city skyline soft in background",
    pose: "HIGH ANGLE (camera held at arm's length above her, shooting down): she is lying on her back on the bed, one knee raised, arching her back slightly, looking directly up into the lens with a knowing half-smile. Full body in frame from this overhead angle — legs, waist, chest, face all visible.",
    wardrobe: "Tiny white cotton string-bikini top and matching high-cut bikini bottoms. Fabric barely covering. Skin dominant in frame.",
    lighting: "Soft diffused morning window light, warm golden tones, gentle shadows along the body's curves",
    camera: "iPhone 16 Pro held overhead self-shot angle, 9:16 portrait, hyper-realistic, natural skin texture, no filters",
  },
  {
    setting: "Minimalist apartment bedroom, white walls, pale wood floor, bed pushed against wall",
    pose: "LOW ANGLE (camera at floor level shooting upward): she is standing facing the camera, weight on one hip, one hand resting on the waistband of her shorts, chin tilted down looking into the lens. The low angle elongates her legs and body — feet and legs prominent in foreground, face and torso rising behind.",
    wardrobe: "Oversized vintage band tee knotted high at the waist exposing the midriff, and tiny high-cut denim micro-shorts unbuttoned. Bare feet, toenails painted.",
    lighting: "Natural side-window daylight, one side of body lit, other in soft shadow, realistic everyday aesthetic",
    camera: "iPhone 16 Pro, low floor-level angle, 9:16 portrait, ultra-sharp, hyper-realistic, skin pores visible",
  },
  {
    setting: "Full-length bathroom mirror, clean marble tiles, warm vanity lights around mirror frame",
    pose: "MIRROR SELFIE — she is standing side-on to the mirror, twisting her torso toward the lens, holding the phone at chest height. One shoulder forward, hip pushed back, creating an S-curve silhouette. Both the reflection and the subject partially visible — creates a doubled sensual effect.",
    wardrobe: "Matching satin bralette and high-cut satin sleep shorts in dusty rose. One bralette strap falling off the shoulder. Bare feet.",
    lighting: "Warm vanity bulb light directly on face and front of body, creating a glamorous glow, soft shadows behind",
    camera: "iPhone 16 Pro mirror selfie, slight lens catch in mirror, 9:16 portrait, realistic, no post-processing look",
  },
  {
    setting: "Private villa infinity pool, blue water, terracotta coping tiles, Mediterranean landscape behind",
    pose: "FEET-FORWARD LOW ANGLE: she is lying on her back at the pool edge, feet closest to camera and in sharp focus in the foreground — bare feet, pointed toes, ankles crossed — body and face receding behind, looking back at the camera over her body with a relaxed gaze.",
    wardrobe: "Minimal string bikini in white — tiny triangle top, string bottoms tied at the hips. Wet skin from the pool, glistening in sun.",
    lighting: "Direct Mediterranean midday sun, high contrast, skin shimmering with water droplets, strong specular highlights",
    camera: "Leica SL2, 24mm wide, low ground-level angle, feet in sharp focus in foreground, body in shallow DOF behind",
  },
  {
    setting: "Plush beige sofa in a bright living room, large window behind, neutral interior",
    pose: "HIGH ANGLE SELFIE from above: she is lying lengthways on the sofa on her back, camera held at arm's length directly above her face and chest. She is looking up at the lens, one arm above her head, the other resting on her stomach. The angle looks straight down along her body.",
    wardrobe: "White ribbed crop top pulled up slightly, and light-wash low-rise jeans unbuttoned at the top. Midriff and hip bones exposed.",
    lighting: "Bright diffused natural daylight from the window, even and soft, very clean and aspirational",
    camera: "iPhone 16 Pro overhead arm-extended selfie angle, 9:16 portrait, sharp focus on face, body soft behind",
  },
  {
    setting: "Luxury hotel bathroom, freestanding oval bathtub, candles on the tub edge, dim ambient light",
    pose: "IN THE BATH: she is reclined in the bath, upper body and one raised leg visible above the water line. One arm draped over the edge of the tub. Head tilted back, eyes half-closed, lips slightly parted. Shot from the side at bath level.",
    wardrobe: "Wearing nothing — water and the tub edge provide the only coverage. Bare shoulders, collarbone, upper chest fully visible. Artistic and confident.",
    lighting: "Warm candlelight only — flickering amber tones on wet skin, deep shadows, intimate and cinematic",
    camera: "Leica SL2, 50mm, bath-level side angle, film grain, 9:16, Helmut Newton boudoir editorial aesthetic",
  },
  {
    setting: "Wooden deck or balcony with railing, tropical greenery behind, warm afternoon light",
    pose: "SITTING ON RAILING or leaning back against it: she is perched on the railing with both hands gripping it behind her, leaning back slightly, legs dangling or crossed at the ankle. Shot from slightly below to create an empowered, confident framing. Direct eye contact.",
    wardrobe: "Tiny crochet bikini top with minimal coverage, and low-rise mini skirt in linen barely covering hips. Bare feet, tan lines faintly visible.",
    lighting: "Warm golden-hour sunlight from behind, creating a halo rim light on hair and shoulders, face in warm reflected fill",
    camera: "Sony A7R V, 35mm, slight low angle, golden hour, hyper-real skin tone, 9:16 portrait",
  },
  {
    setting: "Bedroom floor, white rug, minimal room visible — very close, intimate, private",
    pose: "FLOOR CLOSE-UP — FEET AND LEGS: camera at floor level shooting along the floor. Her bare legs are in the foreground, one knee bent, feet and painted toenails sharp in focus. Her body reclines behind, face partially visible looking down toward camera. Very intimate, like a private moment.",
    wardrobe: "Oversized white button-down shirt (only garment), completely open, draped loosely over her body. Nothing underneath. Fabric falls to the sides on the floor.",
    lighting: "Single soft morning light source from one side, long shadows across the floor, intimate and quiet mood",
    camera: "Leica SL2, 35mm macro, floor-level angle, razor-sharp on feet, natural bokeh on body, 9:16",
  },
  {
    setting: "Poolside on a hotel sun lounger, pool behind, sun umbrellas and palm trees in background",
    pose: "ON THE LOUNGER — FULL BODY: lying on her stomach on the sun lounger, legs bent at the knee with feet raised and crossed in the air behind her. Propped up on her elbows looking directly into camera. Full body length in frame — feet, legs, waist, chest, face.",
    wardrobe: "String bikini with the top strap completely untied and pushed aside — back is bare. Bikini bottoms string tied at hips. Tan lines visible.",
    lighting: "Bright Mediterranean midday sun, high-key, deep skin shadows, wet-look skin from sun lotion",
    camera: "iPhone 16 Pro, person behind shooting down the length of the lounger, 9:16, hyper-realistic, no filter",
  },
  {
    setting: "Kitchen counter in a modern apartment, marble countertops, bright white light",
    pose: "SITTING ON COUNTER — HIGH ANGLE SELFIE: she is sitting on the kitchen counter, legs dangling, holding the phone above her at an angle looking down. The high angle captures cleavage, midriff, and legs simultaneously. Casual, unexpected, 'just woke up' energy.",
    wardrobe: "Thin white cotton spaghetti-strap vest top (no bra, fabric thin enough to see through slightly in the light), and tiny cotton sleep shorts. Bare feet dangling.",
    lighting: "Bright overhead kitchen LED light, very clean, almost clinical — makes the casualness feel more raw and real",
    camera: "iPhone 16 Pro arm-extended high-angle selfie, 9:16 portrait, sharp, authentic everyday aesthetic",
  },
  {
    setting: "Outdoor shower at a private villa, stone walls, tropical plants, open sky above",
    pose: "IN THE SHOWER — FULL BODY: she is standing in the outdoor shower, one arm raised against the stone wall above her, face tilted slightly up, eyes half-closed. Water running over her body. Shot from outside the shower at body level, full length in frame.",
    wardrobe: "Completely bare under the water — shower water is the only coverage. Skin glistening, water running in streams. Tasteful and artistic, no explicit exposure.",
    lighting: "Natural overhead midday light, water catching light and creating sparkle and glisten on skin",
    camera: "Leica SL2, 50mm, body level angle, sharp on skin detail and water drops, 9:16, editorial",
  },
  {
    setting: "Bedroom — lying on her back on white duvet, pillows scattered, very natural and intimate",
    pose: "OVERHEAD SELF-SHOT: she holds the camera directly above her face shooting straight down. Her hair is spread on the pillow, she's looking directly up into the lens with a soft direct gaze. Cleavage, collarbone, and upper chest dominant in frame below her face.",
    wardrobe: "Wearing only a pair of small cotton briefs — torso completely bare. The overhead angle and sheet partially cover while still revealing the form.",
    lighting: "Soft diffused morning light, no harsh shadows, warm and natural, like the first light of the day",
    camera: "iPhone 16 Pro, straight overhead arm-extended, 9:16, hyper-realistic, intimate and unfiltered",
  },
  {
    setting: "Standing in front of a full-length mirror in a walk-in wardrobe or bedroom, warm light",
    pose: "FULL-LENGTH MIRROR SHOT FROM BEHIND: she is standing with her back to the mirror, looking over her shoulder at the camera (which she holds in front of her). The mirror behind shows her full back, lower back, and legs. Face in front, body reflected — creates a 360 visual effect.",
    wardrobe: "Bare back fully visible — wearing only tiny cheeky bikini bottoms or a thong. Hair pinned up to expose the full back. Side profile of face visible over one shoulder.",
    lighting: "Warm amber bedroom lamp light, soft and flattering, slight golden tone on skin",
    camera: "iPhone 16 Pro self-shot from the front, mirror behind showing the back, 9:16, realistic and intimate",
  },
  {
    setting: "On a yacht or boat deck, open water behind, clear blue sky, salty air mood",
    pose: "SITTING ON DECK EDGE — FEET OVER WATER: she is sitting on the edge of the boat deck, legs dangling, feet in the foreground pointing down toward the water. Shot from slightly behind and to the side, capturing her profile, the curve of her waist and hips, and the feet/legs in the same frame. She looks back toward camera over her shoulder.",
    wardrobe: "Minimal triangle bikini top and matching micro-bottoms, possibly with a thin gold body chain at the waist. Wet hair, no makeup, sun-kissed skin.",
    lighting: "Bright open-water sun with sea-reflected light bounce — very bright, clean, natural, high contrast",
    camera: "Sony A7R V, 50mm, from behind and to the side, 9:16, sharp on the body and feet, hazy water in background",
  },
  {
    setting: "Dimly lit luxury bedroom — blackout curtains, candles, dark silk sheets",
    pose: "LYING ON SIDE — S-CURVE: she is lying on her side on the bed facing the camera, body in a natural S-curve — waist nipped in, hip curve prominent. Head propped on one hand, top leg crossed forward slightly. Shot from a low eye-level angle level with the bed. Direct gaze into camera.",
    wardrobe: "Wearing nothing — dark silk sheet draped loosely over the hip and lower body only. Upper body, shoulder, collarbone, chest completely bare. Artistic and intentional.",
    lighting: "Three candles on bedside table — warm, flickering amber light, deep dramatic shadows, intimate and cinematic",
    camera: "Leica SL2, 50mm, bed-level eye line, shallow depth of field, film grain, 9:16, Playboy editorial aesthetic",
  },
  {
    setting: "Tiled bathroom floor, clean grout, very minimal and stark — intimate private moment",
    pose: "FLOOR SHOT — SITTING ON TILES: she is sitting on the bathroom floor, back against the bath or wall, knees pulled up, arms resting loosely on knees. Camera at her eye level or slightly above, close. Very intimate, raw, real. She looks directly into the lens.",
    wardrobe: "Just-out-of-shower look — white fluffy towel wrapped around the body and tucked at the chest, slightly low. Hair wet and loose. Bare legs and feet on the tiles.",
    lighting: "Bright bathroom overhead light — clean, slightly harsh, very real and intimate, no styling",
    camera: "iPhone 16 Pro, close-up, eye level, 9:16, hyper-realistic, no filter — the rawness is the appeal",
  },
  {
    setting: "Clifftop or hillside outdoor setting, open sky, dramatic view behind, wind in the hair",
    pose: "STANDING FULL BODY — LOW ANGLE HERO SHOT: camera at knee level shooting up. She stands with feet apart, one hand on her hip, chin slightly down, looking directly at the lens from above. The low angle makes her appear tall and powerful, sky dramatic behind her.",
    wardrobe: "Barely-there string bikini in a neutral tone, or topless with high-waisted bikini bottoms. Wind moving through her hair. Skin fully on display.",
    lighting: "Strong direct sunlight from the side, hard shadows on the body, dramatic and confident — golden hour or midday",
    camera: "Leica SL2, 24mm, knee-level low angle shooting up, 9:16, dramatic sky in background, sharp on body",
  },
  {
    setting: "Private villa or hotel room floor, lying on a plush white rug, very luxurious",
    pose: "ON THE FLOOR — FULL BODY OVERHEAD: she lies on her back on the rug, arms above her head, legs straight. Camera directly above, shooting straight down the full length of her body from face to feet. Feet at the bottom of frame, face at the top — full body overhead layout.",
    wardrobe: "Tiny lace bralette and matching lace cheeky shorts — barely covering, semi-sheer lace with skin visible through the fabric. Very editorial.",
    lighting: "Soft natural daylight from a nearby window, even and clean, no harsh shadows — the white rug creates a soft reflective fill",
    camera: "Sony A1, 35mm from directly above on a ladder or elevated position, 9:16 portrait, full body, sharp",
  },
  {
    setting: "At the edge of a luxury hotel bed, feet and legs as the main focus",
    pose: "FEET CLOSE-UP EDITORIAL: camera at bed level. Her feet are in sharp focus in the foreground — bare, manicured, toenails painted a deep red. Legs extend behind, and her body and face are soft and blurred in the background. She looks back at the camera over her body.",
    wardrobe: "Silk slip dress, thin straps, fabric hitched up — legs fully exposed from toe to hip. No shoes. The dress is the only garment.",
    lighting: "Warm golden hour window light, long shadows, warm amber tone across the bed and her skin",
    camera: "Leica SL2, 85mm, low macro angle, feet in sharp focus, body in shallow DOF, 9:16, golden hour editorial",
  },
  {
    setting: "Standing in front of a window at night — dark room, city lights glowing outside",
    pose: "BACKLIT SILHOUETTE AT NIGHT WINDOW: she stands close to the glass, facing the window, the city lights illuminating her from behind. Her silhouette is sharp and defined against the glow. She turns her head back toward the camera over one shoulder.",
    wardrobe: "Completely bare — the backlight creates a silhouette that reveals the full body shape and form through light alone. No explicit detail visible, but everything implied by the outline.",
    lighting: "City light and street glow from outside providing the only illumination — strong backlight, full silhouette, rim light on the hair and shoulder edges",
    camera: "Sony A7R V, 50mm, silhouette exposure, 9:16, cinematic, fine art nude photography aesthetic, tasteful",
  },
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

async function generateImagePrompt(apiKey, persona, post, postIndex) {
  // Pick a coherent shot concept — unified setting+pose+wardrobe+lighting in one entry
  const shot = IMG_SHOTS[postIndex % IMG_SHOTS.length];
  const hook = (post.hook || "").trim();

  // Build all field values in JS — Gemini just echoes back valid JSON
  const identityLock = `IDENTITY LOCK — HIGHEST PRIORITY: This is ${persona.name}. Use reference_image_1.png as the face source. Composite that exact face — same eye colour, same nose shape, same lip shape, same hair colour and texture — onto the body in this scene. Zero facial drift permitted. The face must be photorealistic and match the reference exactly. Seamless neck and jawline blend.`;
  const subjectDesc = `${persona.name} — ${shot.pose}. Her expression matches the energy of: "${hook}". Confidence, direct eye contact where specified, body language intentional and powerful.`;
  const angleNote = shot.pose.match(/HIGH ANGLE|LOW ANGLE|OVERHEAD|FLOOR|MIRROR|FEET|SILHOUETTE/i)?.[0] || "eye-level";

  // Build the prompt object directly — no LLM needed, avoids parse failures
  return {
    identity_lock: identityLock,
    shot_angle: angleNote,
    subject: subjectDesc,
    wardrobe: shot.wardrobe,
    setting: shot.setting,
    lighting: shot.lighting,
    technical: `${shot.camera}, 9:16 vertical portrait, RAW format, 8K resolution, photorealistic, hyper-sharp eyes, natural skin texture and pores, realistic hair, natural film grain, zero AI artifacts, zero plastic skin`,
    style_ref: "Editorial aesthetic: Sports Illustrated Swimsuit, Treats! Magazine, Playboy fine art, high-end boudoir photography. Confident, unapologetic, aspirational.",
    negative_prompt: "explicit sexual acts, genitalia, pornographic content, distorted anatomy, warped limbs, extra fingers, fused fingers, low resolution, blurry, plastic skin, over-smoothed skin, face drift, wrong eye colour, wrong hair colour, watermark, text overlay, cartoon, illustration, CGI, 3D render",
  };
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
        const imgPrompt = await generateImagePrompt(apiKey, persona, postForImg, i);
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
