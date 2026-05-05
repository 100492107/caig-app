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
// Wardrobe floor: tiny bikinis / micro clothing. No nudity. Angles and poses maximise visual impact.
const IMG_SHOTS = [
  {
    setting: "Luxury hotel room, king bed with rumpled white linen, floor-to-ceiling window, city skyline soft in background",
    pose: "HIGH ANGLE (camera held at arm's length above her, shooting down): she is lying on her back on the bed, one knee raised, arching her back slightly, looking directly up into the lens with a knowing half-smile. Full body in frame from this overhead angle — legs, waist, chest, face all visible.",
    wardrobe: "Tiny white string-bikini top — triangle cups, string ties visible at neck and back. Matching white high-cut string bikini bottoms, strings tied at the hips. Bare midriff and legs fully in frame.",
    lighting: "Soft diffused morning window light, warm golden tones, gentle shadows tracing the body's curves",
    camera: "iPhone 16 Pro held overhead self-shot angle, 9:16 portrait, hyper-realistic, natural skin texture, no filters",
  },
  {
    setting: "Minimalist apartment bedroom, white walls, pale wood floor, bed pushed against wall",
    pose: "LOW ANGLE (camera at floor level shooting upward): she is standing facing the camera, weight on one hip, one hand resting on the waistband of her shorts, chin tilted down looking into the lens. The low angle elongates her legs and body — feet and legs prominent in foreground, face and torso rising behind.",
    wardrobe: "Vintage band tee knotted tightly at the waist exposing the full midriff, and tiny high-cut denim micro-shorts, low-rise, button fly open at the top. Bare feet, toenails painted deep red.",
    lighting: "Natural side-window daylight, one side of body lit, other in soft shadow, realistic everyday aesthetic",
    camera: "iPhone 16 Pro, low floor-level angle, 9:16 portrait, ultra-sharp, hyper-realistic, skin pores visible",
  },
  {
    setting: "Full-length bathroom mirror, clean marble tiles, warm vanity lights around mirror frame",
    pose: "MIRROR SELFIE — she is standing side-on to the mirror, twisting her torso toward the lens, holding the phone at chest height. One shoulder forward, hip pushed back, creating an S-curve silhouette. Both the reflection and the subject visible — creates a doubled effect.",
    wardrobe: "Matching satin bralette with underwire and lace trim, and high-cut satin mini shorts in dusty rose. One bralette strap deliberately slipped off the shoulder. Bare feet.",
    lighting: "Warm vanity bulb light directly on face and front of body, creating a glamorous glow, soft shadows behind",
    camera: "iPhone 16 Pro mirror selfie, slight lens flare from the vanity bulbs, 9:16 portrait, realistic, no post-processing look",
  },
  {
    setting: "Private villa infinity pool, blue water, terracotta coping tiles, Mediterranean landscape behind",
    pose: "FEET-FORWARD LOW ANGLE: she is lying on her back at the pool edge, feet closest to camera and in sharp focus in the foreground — bare feet, pointed toes, ankles crossed — body and face receding behind, looking back at the camera over her body with a relaxed confident gaze.",
    wardrobe: "Minimal white string bikini — tiny triangle top with string ties, micro string bottoms tied at the hips. Wet skin glistening with water droplets from the pool. Gold anklet on one ankle.",
    lighting: "Direct Mediterranean midday sun, high contrast, skin shimmering with water droplets, strong specular highlights",
    camera: "Leica SL2, 24mm wide, low ground-level angle, feet in sharp focus in foreground, body in shallow DOF behind",
  },
  {
    setting: "Plush beige sofa in a bright living room, large window behind, neutral tones",
    pose: "HIGH ANGLE SELFIE from above: she is lying lengthways on the sofa on her back, camera held at arm's length directly above. She is looking up at the lens, one arm above her head, the other resting lightly on her stomach. The angle shoots straight down along her body.",
    wardrobe: "White ribbed crop top — very short, sitting just below the chest, exposing the full midriff — and light-wash low-rise denim micro-shorts, waistband sitting at the hip bones. Bare feet.",
    lighting: "Bright diffused natural daylight from the window behind, even and clean, aspirational lifestyle feel",
    camera: "iPhone 16 Pro overhead arm-extended selfie angle, 9:16 portrait, sharp focus on face, body receding below",
  },
  {
    setting: "Luxury hotel bathroom, freestanding oval bathtub, candles on the tub surround, dim warm light",
    pose: "IN THE BATH: she is reclined in the bath, one leg raised and resting on the tub edge, arms draped over the sides. Head tilted back slightly, lips parted, eyes half-closed. Shot from the side at bath level — upper body visible above the waterline, everything below obscured by water.",
    wardrobe: "Tiny triangle bikini top in nude/beige — barely covering, string ties at neck and back, wet and clinging to skin. Matching string bikini bottoms beneath the water. Hair pinned loosely, a few strands falling.",
    lighting: "Warm candlelight only — flickering amber tones on wet skin, deep intimate shadows, cinematic and private",
    camera: "Leica SL2, 50mm, bath-level side angle, natural film grain, 9:16, intimate editorial",
  },
  {
    setting: "Wooden balcony or terrace with railing, tropical greenery behind, golden hour light",
    pose: "SITTING ON RAILING leaning back against it: she is perched on the railing with both hands gripping it behind her, leaning back slightly, legs dangling. Shot from slightly below — empowered, confident framing. Direct eye contact with the lens.",
    wardrobe: "Tiny crochet string bikini top in white — minimal triangle coverage, crochet straps — and matching crochet micro bikini bottoms with hip ties. Tan lines faintly visible. Bare feet.",
    lighting: "Warm golden-hour sunlight from behind, creating a rim halo on hair and shoulders, warm fill on the face",
    camera: "Sony A7R V, 35mm, slight low angle, golden hour, natural skin tone, 9:16 portrait",
  },
  {
    setting: "Bedroom floor, white rug, minimal room visible — close and intimate",
    pose: "FLOOR CLOSE-UP — FEET AND LEGS FOREGROUND: camera at floor level shooting along the surface. Her bare legs are in the foreground, one knee bent, feet and painted toenails in sharp focus closest to lens. Her body reclines behind, face partially visible looking down toward camera with a soft gaze.",
    wardrobe: "Oversized white button-down shirt, open and falling to the sides — worn as a top only, tied loosely at the waist. High-cut cheeky bikini bottoms underneath, fully visible below the shirt hem. Bare feet, toenails painted.",
    lighting: "Single soft morning light from one side, long shadows across the white rug, intimate and quiet",
    camera: "Leica SL2, 35mm, floor-level angle, razor-sharp on feet, natural bokeh on body behind, 9:16",
  },
  {
    setting: "Hotel poolside, sun lounger, pool visible behind, palm trees and umbrellas in background",
    pose: "ON THE LOUNGER — FULL BODY: lying on her stomach on the sun lounger, legs bent at the knee with feet raised and crossed in the air behind her. Propped up on elbows looking directly into camera. Full body length in frame — feet, legs, waist, back, face all visible.",
    wardrobe: "String bikini — top strap untied and draped loosely at the sides so the back is bare, cups resting on the lounger. Bikini bottoms with string ties at the hips pulled high. Tan lines clearly visible. Skin glistening with sun oil.",
    lighting: "Bright Mediterranean midday sun, high-key, deep shadows along the body contours",
    camera: "iPhone 16 Pro, shot from behind down the length of the lounger, 9:16, hyper-realistic, no filter",
  },
  {
    setting: "Modern apartment kitchen, marble countertops, clean white cabinetry, bright overhead light",
    pose: "SITTING ON COUNTER — HIGH ANGLE SELFIE: she is sitting on the kitchen counter, legs dangling and crossed at the ankle, holding the phone above her angled down. Casual, unexpected, morning energy. The high angle captures face, chest, midriff and legs in one frame.",
    wardrobe: "Thin white spaghetti-strap crop top — very short, sitting high above the navel — and tiny light grey cotton sleep shorts, low-rise. Bare feet dangling from the counter.",
    lighting: "Bright overhead kitchen light, clean and slightly harsh, makes the casual intimacy feel raw and real",
    camera: "iPhone 16 Pro arm-extended high-angle selfie, 9:16 portrait, sharp, authentic everyday aesthetic",
  },
  {
    setting: "Outdoor villa shower, stone walls, tropical plants surrounding, open sky above",
    pose: "IN THE SHOWER — FULL BODY: she is standing in the outdoor shower, one arm raised against the stone wall, face tilted up, eyes closed. Water running over her body. Shot from outside the shower at full body length — head to feet in frame.",
    wardrobe: "Tiny string bikini — wet and clinging to the body, triangle top with thin string ties, micro bottoms with hip ties. Water running in streams over the fabric and skin. Bare feet on wet stone.",
    lighting: "Natural overhead midday sun, water catching the light and sparkling on skin and fabric",
    camera: "Leica SL2, 50mm, body-level angle from outside the shower, sharp on water droplets and skin detail, 9:16",
  },
  {
    setting: "White bed, rumpled duvet, morning bedroom — simple and intimate",
    pose: "OVERHEAD SELF-SHOT: she holds the camera directly above her face shooting straight down. Hair spread on the pillow, looking directly up into the lens with a soft, direct gaze. Collarbone, chest and midriff visible below her face in the downward frame.",
    wardrobe: "Matching lingerie set — delicate lace bralette with underwire and thin straps, and high-waisted lace knicker briefs. Neutral/nude colourway. The lace detail is clear and sharp in the overhead light.",
    lighting: "Soft diffused morning window light, warm and natural, no harsh shadows, intimate and calm",
    camera: "iPhone 16 Pro, straight overhead arm-extended shot, 9:16, hyper-realistic, soft and unfiltered",
  },
  {
    setting: "Full-length mirror in a bedroom or walk-in wardrobe, warm ambient lamp light",
    pose: "FULL-LENGTH MIRROR SHOT FROM BEHIND: she stands with her back to the mirror, looking over her shoulder at the camera held in front of her. The mirror shows her full back, waist, and legs from behind. Face visible in profile looking over one shoulder — creates a front-and-back simultaneous view.",
    wardrobe: "Cheeky high-cut bikini bottoms — minimal rear coverage, string sides — and a tiny matching bikini top visible in the mirror reflection only. Hair pinned up to expose the full back and neck.",
    lighting: "Warm amber bedside lamp light, soft and flattering, slight golden tone on skin",
    camera: "iPhone 16 Pro self-shot from the front, full-length mirror showing the back, 9:16, realistic and intimate",
  },
  {
    setting: "Yacht or boat deck, open water behind, clear blue sky, bright Mediterranean light",
    pose: "SITTING ON DECK EDGE — FEET DANGLING: she sits on the boat edge, legs dangling, feet in the foreground. Shot from slightly behind and to the side — capturing her profile, the curve of her waist and hip, and her legs/feet. She looks back toward the camera over her shoulder.",
    wardrobe: "Tiny triangle string bikini — minimal coverage top with string ties at neck and back, matching micro-cut bottoms with thin hip ties. Thin gold body chain at the waist. Wet hair. Sun-kissed skin.",
    lighting: "Bright open-water sun with sea-reflected bounce light — very clean, high contrast, natural",
    camera: "Sony A7R V, 50mm, slightly behind and to the side, 9:16, sharp on body and feet, water hazy behind",
  },
  {
    setting: "Dimly lit luxury bedroom, blackout curtains, two candles on bedside table, dark silk sheets",
    pose: "LYING ON SIDE — S-CURVE: she is lying on her side on the bed facing the camera, body in a natural S-curve — waist nipped in, hip curve prominent. Head propped on one hand, top leg crossed forward. Low eye-level angle from the bed surface. Direct gaze into camera.",
    wardrobe: "Matching strappy lingerie set — thin-strap lace bralette with plunge neckline and matching high-cut lace briefs. Dark jewel tone — deep burgundy or black. Fabric minimal, body dominant.",
    lighting: "Warm flickering candlelight from the bedside — amber tones on skin, deep dramatic shadows, intimate and cinematic",
    camera: "Leica SL2, 50mm, bed-level eye line, shallow DOF, natural film grain, 9:16",
  },
  {
    setting: "Clean bathroom floor, white tiles, sitting against the bath — raw and intimate",
    pose: "FLOOR SHOT — SITTING ON TILES: she is sitting on the bathroom floor, back against the tub, knees pulled up, arms resting loosely on knees. Camera at her eye level, close. Very real and intimate. She looks directly into the lens.",
    wardrobe: "Just-got-back-from-the-pool look — tiny string bikini still on, wet and clinging. White towel loosely draped over one shoulder only. Bare legs and feet on the tiles. Hair damp and loose.",
    lighting: "Clean bright bathroom overhead light, slightly harsh, very real — the casual intimacy is the appeal",
    camera: "iPhone 16 Pro, close-up, eye level, 9:16, hyper-realistic, no filter",
  },
  {
    setting: "Clifftop or hillside, open sky, dramatic landscape behind, wind moving through her hair",
    pose: "STANDING FULL BODY — LOW ANGLE HERO SHOT: camera at knee level shooting upward. She stands with feet apart, one hand on her hip, chin slightly down, looking directly at the lens from above. Low angle makes her appear tall, sky dramatic behind her.",
    wardrobe: "Barely-there string bikini in a neutral sand or white tone — tiny triangle top, micro string bottoms tied high on the hips. Wind moving through her hair. Bare feet on rock or grass.",
    lighting: "Strong direct golden-hour sunlight from the side, hard shadows contouring the body, dramatic and confident",
    camera: "Leica SL2, 24mm, knee-level shooting up, 9:16, dramatic sky behind, sharp on body",
  },
  {
    setting: "Private villa or hotel suite, plush white rug on the floor, clean luxury interior",
    pose: "ON THE FLOOR — FULL BODY OVERHEAD: she lies on her back on the rug, arms above her head, legs straight and together. Camera directly above, shooting straight down the full length of her body — face at the top of frame, feet at the bottom. Everything visible from this aerial angle.",
    wardrobe: "Tiny lace bralette — delicate and minimal, lace cups with thin straps — and matching lace high-cut cheeky shorts, semi-sheer lace fabric. Nude/ivory colourway. Detailed lace pattern sharp in the clean light.",
    lighting: "Soft even daylight from a nearby window, white rug creating a natural reflective fill — clean, editorial, no harsh shadows",
    camera: "Sony A1, 35mm from directly above, 9:16 portrait, full body head-to-toe, hyper-sharp",
  },
  {
    setting: "Edge of a luxury hotel bed, feet and lower legs as the compositional foreground",
    pose: "FEET CLOSE-UP EDITORIAL: camera at bed level, low. Her bare feet are in sharp focus in the foreground — manicured, toenails painted deep red, ankles and lower legs prominent. Her body and face recede into soft focus behind, looking back toward camera over her body.",
    wardrobe: "Silk satin slip dress — thin spaghetti straps, cut high on the thigh, fabric hitched up and bunched at the hip. No shoes. One leg slightly raised, dress falling back to reveal the leg to the hip.",
    lighting: "Warm golden hour window light, long amber shadows across the bed, warm tone on skin",
    camera: "Leica SL2, 85mm, low bed-level angle, feet in sharp focus, body in shallow DOF, 9:16, golden hour",
  },
  {
    setting: "Dark room at night, floor-to-ceiling window, city lights glowing outside",
    pose: "SILHOUETTE AT NIGHT WINDOW: she stands close to the glass, facing the window, city lights illuminating her from behind. Her form is defined against the glow. She turns her head back toward the camera over one shoulder — face partially lit by the city light.",
    wardrobe: "Tiny string bikini — the backlight reveals the silhouette of the body, the bikini strings and minimal fabric visible as thin lines of light. Form and shape dominant. Nothing explicit.",
    lighting: "City and street glow from outside as the only light source — strong backlight, body silhouetted, rim light on hair and shoulder edges, face lit by ambient city glow",
    camera: "Sony A7R V, 50mm, silhouette exposure, 9:16, cinematic, editorial",
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
    negative_prompt: "nudity, bare breasts, exposed genitalia, topless, explicit content, pornographic, distorted anatomy, warped limbs, extra fingers, fused fingers, low resolution, blurry, plastic skin, over-smoothed skin, face drift, wrong eye colour, wrong hair colour, watermark, text overlay, cartoon, illustration, CGI, 3D render",
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
