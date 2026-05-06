// api/generate-submit.js
// Submits a nano-banana-2 generation job to fal.ai's async queue.

const QUEUE_URL = "https://queue.fal.run/fal-ai/nano-banana-2/edit";

const CARA_REFS = [
  "https://v3b.fal.media/files/b/0a990cbf/7tn1zr6Tzvw4LP6NfoQJ5_Cara_Whitmore_10.png",
  "https://v3b.fal.media/files/b/0a990cbf/GZpvO79sLCKUEXmb5OjDZ_Cara_Whitmore_14.png",
  "https://v3b.fal.media/files/b/0a990cc0/hNz9MH3iKPSpX1SCu7JnC_Cara_Whitmore_16.png",
  "https://v3b.fal.media/files/b/0a990cc0/aC52Bfy17019kTbWG4L_L_Cara_Whitmore_18.png",
  "https://v3b.fal.media/files/b/0a990cc0/ne3QfVCW_NQnJZFjSnsST_Cara_Whitmore_23.jpeg",
];

// ─── SHOT LIBRARY ─────────────────────────────────────────────────────────────
// Cinematic compositions fal.ai accepts. Lewd through framing, not description.
// Tags drive context-aware selection.

const SHOTS = [
  // Classic editorial
  {
    frame: "35mm eye-level portrait, shoulders-to-knees frame",
    pose: "weight on one hip, chin slightly down, direct gaze into lens",
    mood: "confident and unhurried",
    tags: ["editorial", "confident", "portrait"],
  },
  {
    frame: "85mm three-quarter length, slight low angle looking up at subject",
    pose: "hand resting on hip, head tilted, soft half-smile",
    mood: "effortlessly in control",
    tags: ["editorial", "confident", "three-quarter"],
  },
  {
    frame: "50mm full-length, camera at waist height shooting upward",
    pose: "standing tall, one arm raised touching hair, chin lifted",
    mood: "elongated silhouette, powerful",
    tags: ["full-length", "powerful", "editorial"],
  },
  // Feet-forward / perspective shots
  {
    frame: "24mm wide, camera low on the ground — feet sharp in foreground, body leading back to face",
    pose: "standing, legs together, face looking straight down the barrel of the lens with a knowing expression",
    mood: "cinematic fashion editorial, strong perspective",
    tags: ["low-angle", "full-length", "feet-forward", "cinematic"],
  },
  {
    frame: "35mm low angle from knee height — long legs fill lower half of frame, face and torso in upper half",
    pose: "weight shifted to one leg, looking over shoulder down at camera",
    mood: "elongated, powerful, fashion-forward",
    tags: ["low-angle", "full-length", "powerful"],
  },
  {
    frame: "wide low angle, camera at ankle height — full length body from feet to face, dramatic perspective distortion",
    pose: "walking slowly toward camera, direct gaze, relaxed arms",
    mood: "high-fashion runway energy",
    tags: ["low-angle", "full-length", "feet-forward", "runway"],
  },
  // Over-shoulder / back shots
  {
    frame: "35mm from behind and slightly above — camera over her shoulder looking forward",
    pose: "standing at the edge of the scene, looking out, face turning back 30 degrees toward camera",
    mood: "contemplative, mysterious",
    tags: ["over-shoulder", "mysterious", "back"],
  },
  {
    frame: "50mm side profile, camera at shoulder height",
    pose: "chin up, looking into the distance, hair falling to one side",
    mood: "editorial, clean lines",
    tags: ["profile", "editorial", "side"],
  },
  // Seated / reclined (non-bed)
  {
    frame: "35mm, seated composition — knees angled toward camera, upper body leaning back on hands",
    pose: "seated on the edge of a surface, knees drawn up slightly, looking directly at camera",
    mood: "relaxed confidence",
    tags: ["seated", "relaxed", "intimate"],
  },
  {
    frame: "85mm, reclined on a sun lounger — camera at eye level beside her",
    pose: "lying on side on a sun lounger, head propped on one hand, facing camera",
    mood: "golden hour editorial, warm and inviting",
    tags: ["reclined", "relaxed", "golden-hour", "water", "outdoor"],
  },
  // Overhead / downward
  {
    frame: "overhead flat-lay perspective — camera directly above, subject on towel or pool deck",
    pose: "lying on back on a sun towel, knees bent to one side, looking straight up into camera, hair fanned out",
    mood: "top-down fashion editorial, geometric composition",
    tags: ["overhead", "flat-lay", "water", "outdoor"],
  },
  {
    frame: "45-degree elevated angle — camera above and in front, shooting down across the body",
    pose: "standing below, face turned upward to camera, one hand in hair",
    mood: "dramatic, empowering angle",
    tags: ["overhead", "dramatic", "elevated"],
  },
  // Close detail shots
  {
    frame: "85mm macro-ish — tight crop from collarbone to mid-thigh",
    pose: "hands framing waist, slight arch, face cropped just above frame",
    mood: "abstract editorial, body as landscape",
    tags: ["close-up", "intimate", "abstract"],
  },
  {
    frame: "50mm, tight crop — face and top of chest only, shallow depth of field",
    pose: "chin down, eyes up, direct gaze, lips slightly parted",
    mood: "intimate editorial portrait",
    tags: ["close-up", "portrait", "intimate", "face"],
  },
];

// ─── WARDROBE LIBRARY ─────────────────────────────────────────────────────────
// All tested against fal.ai. Grouped by context for smart selection.

const WARDROBES = {
  water: [
    "small white triangle string bikini, thin side ties",
    "black string bikini, minimal coverage, classic cut",
    "white string bikini, barely-there coverage",
    "coral triangle bikini, thin straps",
    "navy blue bikini, classic silhouette",
  ],
  outdoor: [
    "oversized white linen dress shirt, unbuttoned low, mid-thigh length",
    "gold satin bralette top, high-waist wide-leg trousers",
    "fitted ribbed crop top and low-rise mini skirt",
    "strappy black bralette top and high-waist shorts, layered gold chains",
    "sheer mesh crop top over a black bralette, low-rise denim shorts",
  ],
  cosy: [
    "oversized soft grey knit jumper, one bare shoulder, mid-thigh length",
    "oversized cream cable-knit sweater, slipping off one shoulder, bare legs",
    "oversized dark navy knit, one shoulder exposed, nothing else visible",
    "chunky oversized charcoal knit jumper, bare collarbone, hem at upper thigh",
  ],
  general: [
    "silk slip dress, thin straps, thigh-high slit",
    "black lace bodysuit worn as a top with tailored trousers",
    "tiny ribbed bandeau top and matching micro shorts, midriff bare",
    "white hotel robe loosely tied, black bikini just visible beneath",
    "oversized white dress shirt, unbuttoned to the waist, mid-thigh length",
    "fitted ribbed crop top and matching low-rise mini skirt",
  ],
};

// ─── WARDROBE KEYWORD MAP ─────────────────────────────────────────────────────
// If the post's wardrobe field OR caption/hook contains these keywords, override the group.
const WARDROBE_KEYWORD_MAP = [
  { keywords: ["knit", "jumper", "sweater", "knitwear", "cosy", "cozy", "oversized", "hoodie", "fleece", "woollen", "woolly", "wrapped up", "staying in", "staying home", "morning", "lazy", "slow day", "on the sofa", "at home", "indoors", "couch"], group: "cosy" },
  { keywords: ["bikini", "swimwear", "swimsuit", "swim", "pool", "beach", "ocean", "sea", "water", "snorkelling", "diving", "waves", "sunbathing"], group: "water" },
  { keywords: ["linen", "crop", "bralette", "shorts", "outdoor", "terrace", "rooftop", "balcony", "villa", "garden", "sunset", "travel", "abroad", "exploring"], group: "outdoor" },
];

// ─── SETTING LIBRARY ──────────────────────────────────────────────────────────

const SETTINGS = {
  water: [
    "private villa infinity pool, blue water, terracotta coping, Mediterranean landscape",
    "rooftop pool, city skyline, golden hour light on the water",
    "luxury resort pool deck, white marble, palm shadows",
    "secluded beach, crystal clear water, white sand",
  ],
  outdoor: [
    "sun-drenched apartment rooftop terrace, city panorama below",
    "penthouse balcony, floor-to-ceiling glass, golden hour",
    "Mediterranean villa courtyard, terracotta and bougainvillea",
    "high-end beachside bar terrace, sunset behind",
  ],
  cosy: [
    "sun-drenched apartment living room, large floor-to-ceiling windows, soft morning light on white walls",
    "minimalist studio flat, pale walls, warm side light, wooden floors",
    "bright airy loft, exposed brick wall, large window, morning sunlight streaming in",
    "elegant apartment lounge, neutral tones, soft diffused natural light",
  ],
  general: [
    "minimalist studio, white walls, soft window light",
    "luxury penthouse living room, large windows, city behind",
    "high-end dressing room, vanity lighting, mirrors",
    "private rooftop terrace, string lights, evening ambience",
    "industrial loft, raw concrete, large north-facing windows",
  ],
};

// ─── SHOT ANGLE KEYWORD MAP ───────────────────────────────────────────────────
// Maps shot_angle field keywords to shot tags for biased selection.
const SHOT_ANGLE_TAG_MAP = [
  { keywords: ["overhead", "flat-lay", "top-down", "above"], tags: ["overhead", "flat-lay"] },
  { keywords: ["low angle", "low-angle", "feet", "ankle", "knee"], tags: ["low-angle", "feet-forward"] },
  { keywords: ["over-shoulder", "behind", "back"], tags: ["over-shoulder", "back"] },
  { keywords: ["portrait", "face", "close"], tags: ["close-up", "portrait"] },
  { keywords: ["profile", "side"], tags: ["profile", "side"] },
  { keywords: ["seated", "sitting"], tags: ["seated"] },
  { keywords: ["reclined", "lying", "lounger"], tags: ["reclined"] },
  { keywords: ["full-length", "full length", "full body"], tags: ["full-length"] },
];

// ─── MOOD KEYWORD MAP ─────────────────────────────────────────────────────────
// Maps caption/hook mood words to shot tags.
const MOOD_TAG_MAP = [
  { keywords: ["mysterious", "moody", "dark", "contemplative"], tags: ["mysterious", "over-shoulder"] },
  { keywords: ["confident", "powerful", "bold", "strong"], tags: ["confident", "powerful"] },
  { keywords: ["intimate", "soft", "gentle", "cosy", "cozy", "warm"], tags: ["intimate", "relaxed"] },
  { keywords: ["editorial", "fashion", "runway", "high-fashion"], tags: ["editorial", "runway"] },
  { keywords: ["relaxed", "casual", "lazy", "slow", "morning"], tags: ["relaxed", "seated"] },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function classifySetting(rawSetting) {
  const s = (rawSetting || "").toLowerCase();
  if (/pool|beach|ocean|water|sea|swim|snorkel|waves|sunbath/.test(s)) return "water";
  if (/balcony|rooftop|terrace|garden|courtyard|outdoor|villa|abroad|travel|exploring|sunset/.test(s)) return "outdoor";
  if (/knit|jumper|sweater|cosy|cozy|morning|lounge|apartment|sunlit wall|sunlight|at home|indoors|sofa|staying in/.test(s)) return "cosy";
  return "general";
}

function classifyWardrobeGroup(wardrobeField, settingContext, hook, caption) {
  // Search wardrobe field first, then fall back to caption + hook for context
  const allText = [wardrobeField, hook, caption].filter(Boolean).join(" ").toLowerCase();
  for (const { keywords, group } of WARDROBE_KEYWORD_MAP) {
    if (keywords.some(k => allText.includes(k))) return group;
  }
  return settingContext;
}

// Score shots by how many desired tags they match. Falls back to random if no match.
function pickShot(desiredTags) {
  if (!desiredTags || desiredTags.length === 0) return pickRandom(SHOTS);
  const scored = SHOTS.map(shot => ({
    shot,
    score: desiredTags.filter(t => shot.tags.includes(t)).length,
  }));
  const maxScore = Math.max(...scored.map(s => s.score));
  if (maxScore === 0) return pickRandom(SHOTS);
  // Among top scorers, pick randomly
  const topShots = scored.filter(s => s.score === maxScore).map(s => s.shot);
  return pickRandom(topShots);
}

function extractDesiredShotTags(shotAngle, photoDirection, hook, caption) {
  const combined = [shotAngle, photoDirection, hook, caption]
    .filter(Boolean).join(" ").toLowerCase();

  const tags = new Set();

  for (const { keywords, tags: t } of SHOT_ANGLE_TAG_MAP) {
    if (keywords.some(k => combined.includes(k))) t.forEach(tag => tags.add(tag));
  }
  for (const { keywords, tags: t } of MOOD_TAG_MAP) {
    if (keywords.some(k => combined.includes(k))) t.forEach(tag => tags.add(tag));
  }

  return [...tags];
}

function buildPrompt({ imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection }) {
  // Classify setting context from all available text
  let rawSetting = "";
  if (imagePrompt && typeof imagePrompt === "object") {
    rawSetting = imagePrompt.setting || imagePrompt.environment ||
      (imagePrompt.environment_and_lighting || {}).setting || "";
  } else if (typeof imagePrompt === "string") {
    rawSetting = imagePrompt;
  }

  // Enrich setting classification with wardrobe + photo direction hints
  const settingContext = classifySetting(
    [rawSetting, photoDirection, wardrobe, hook, caption].filter(Boolean).join(" ")
  );

  const wardrobeGroup = classifyWardrobeGroup(wardrobe, settingContext, hook, caption);

  // Use post wardrobe text directly if it's specific enough (>4 words); else pick from library
  const wardrobeText = (wardrobe && wardrobe.trim().split(/\s+/).length > 4)
    ? wardrobe.trim()
    : pickRandom(WARDROBES[wardrobeGroup] || WARDROBES.general);

  const desiredTags = extractDesiredShotTags(shotAngle, photoDirection, hook, caption);
  const shot = pickShot(desiredTags);
  const setting = pickRandom(SETTINGS[settingContext] || SETTINGS.general);

  console.log(`[generate-submit] context=${settingContext} wardrobeGroup=${wardrobeGroup} tags=[${desiredTags.join(",")}] shot="${shot.frame.slice(0, 60)}..."`);

  return `Photorealistic editorial fashion photograph of a real woman. Recreate her exactly from the reference images — same face, same features, same identity.

COMPOSITION: ${shot.frame}.
POSE: ${shot.pose}.
MOOD: ${shot.mood}.
WARDROBE: She is wearing ${wardrobeText}.
LOCATION: ${setting}.
LIGHTING: Natural or available light appropriate to the location — golden hour warmth, soft shadows, skin has a healthy natural glow.

IDENTITY LOCK — every single one of these must be exact. Do not deviate:

HAIR: Dark chocolate brown — the colour of espresso or dark roast coffee. This is BROWN hair, not black. In direct light, individual strands show warm dark brown tones, NOT blue, NOT blue-black, NOT jet black. The hair is very dark but unmistakably BROWN — think dark brown with natural warm highlights, not a blue-black or cool-toned black. Long, wavy, falling past shoulders. Strands catch a subtle warm highlight in light. NOT black. NOT blue-black. DARK BROWN.

EYES: Vivid, unmistakably bright green — the iris is a clear, saturated green with intricate radial patterns and a dark limbal ring. NOT hazel. NOT grey-green. NOT blue. The eyes must read as distinctly GREEN in any lighting condition. Tack-sharp focus on the irises — the colour must be visible and accurate.

BROWS: Strong, thick, dark — naturally shaped, not drawn on. One of her most defining features. They must be clearly dark and full. If brows appear thin or light, this is wrong.

SKIN: Medium-light, warm olive undertone. Natural pore-level texture in close-ups. Slightly sun-kissed, dewy glow. No beauty filter. No smoothing. Real skin.

FACE: Angular, defined jawline. Straight refined nose. Full naturally pigmented lips, soft pink-rose, slightly parted. Early 20s.

ACCESSORIES: Small gold hoop earrings where ears are visible. Layered delicate gold chains at the neckline for outdoor and pool settings.

EXPRESSION: Confident, direct, comfortable in front of the camera. Reserved — not smiling wide, not performing.

TECHNICAL: Sony A7R V, lens and aperture matching the composition above. Tack-sharp focus on eyes. Real photograph — not digital art, not CGI, not a painting. 9:16 vertical. Magazine quality.

DO NOT include: nudity, exposed intimate areas, genitals, cartoon style, anime, illustrated look, plastic or airbrushed skin, text overlays, watermarks, extra or deformed limbs, brown eyes, hazel eyes, grey eyes, light brown hair, auburn hair, blonde hair, black hair, blue-black hair, jet black hair.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "FAL_API_KEY not configured" });

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, seed } = body;
  const prompt = buildPrompt({ imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection });
  console.log("[generate-submit] prompt:\n" + prompt);

  let qRes, qData;
  try {
    qRes = await fetch(QUEUE_URL, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        image_urls: CARA_REFS,
        image_size: { width: 1080, height: 1920 },
        output_format: "jpeg",
        safety_tolerance: "6",
        num_images: 1,
        seed: seed || undefined,
      }),
    });
    qData = await qRes.json();
  } catch (e) {
    return res.status(502).json({ error: "Failed to submit to fal.ai queue", detail: e.message });
  }

  if (!qRes.ok || !qData.request_id) {
    return res.status(qRes.status || 502).json({ error: "Queue submit failed", detail: qData });
  }

  console.log("[generate-submit] queued:", qData.request_id);
  return res.status(200).json({
    requestId: qData.request_id,
    statusUrl: qData.status_url,
    resultUrl: qData.response_url,
  });
}
