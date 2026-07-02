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
  // Gym / training / action
  {
    frame: "24mm low angle in a home gym — feet firmly planted, full body leading up to face, weights rack behind",
    pose: "standing between sets, chalk on hands, direct gaze into lens, composed and strong",
    mood: "grounded, powerful, unglamorous strength",
    tags: ["low-angle", "full-length", "gym", "action"],
  },
  {
    frame: "35mm mid-rep shot — full body, home gym setting",
    pose: "mid deadlift or squat, full focus on the movement, not looking at camera, sharp controlled form",
    mood: "disciplined, sharp, frozen-motion intensity",
    tags: ["gym", "action", "training"],
  },
  {
    frame: "35mm medium shot, boxing gym with a hanging bag",
    pose: "mid-punch at the bag, motion blur on the arm, full focus and intensity, not aware of camera",
    mood: "high energy, moody single-source lighting",
    tags: ["gym", "action", "training"],
  },
  {
    frame: "35mm wide-medium, city park path or running track",
    pose: "mid-stride running shot, full body, determined expression, looking ahead not at camera",
    mood: "cool morning light, genuine motion",
    tags: ["action", "running", "full-length"],
  },
  // Selfie / mirror selfie
  {
    frame: "phone-held mirror selfie, full length, home gym or wardrobe mirror",
    pose: "outfit or physique check, phone visible in the reflection at chest height, direct gaze into the mirror, confident stance",
    mood: "unfiltered, confident, self-assured",
    tags: ["mirror", "selfie", "full-length"],
  },
  {
    frame: "close phone selfie, arm's length",
    pose: "direct eye contact with the lens, composed, alert, getting-ready or post-training energy",
    mood: "genuine, close, unglamorous confidence",
    tags: ["selfie", "close-up", "portrait"],
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
    frame: "85mm, reclined on a pool lounger — camera at eye level beside her",
    pose: "lying on side on a lounger, head propped on one hand, facing camera",
    mood: "warm afternoon light, relaxed and unhurried",
    tags: ["reclined", "relaxed", "water"],
  },
  // Overhead / downward
  {
    frame: "overhead flat-lay perspective — camera directly above, subject on a towel or pool deck",
    pose: "lying on back, knees bent to one side, looking straight up into camera, hair fanned out",
    mood: "top-down editorial, geometric composition",
    tags: ["overhead", "flat-lay", "water"],
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
  {
    frame: "85mm macro-leaning, close on hands at a desk",
    pose: "writing in a planner or gesturing mid-sentence, face out of frame or softly blurred behind, focused",
    mood: "quiet focus, discipline in the detail",
    tags: ["office", "hands", "close-up"],
  },
];

// ─── WARDROBE LIBRARY ─────────────────────────────────────────────────────────
// All tested against fal.ai. Grouped by context for smart selection.

const WARDROBES = {
  gym: [
    "fitted matching gym set — sports bra and leggings, trainers",
    "fitted training top and bike shorts, trainers",
    "cropped tank top and joggers, trainers",
    "sports bra and fitted leggings, hair in a high ponytail",
  ],
  mirror: [
    "sharp tailored blazer and trousers, heels",
    "matching gym set, trainers, hair in a ponytail",
    "oversized blazer over biker shorts, trainers",
    "tailored trousers and a fitted top, minimal gold jewellery",
  ],
  office: [
    "sharp tailored blazer, fitted top underneath, minimal gold jewellery",
    "fitted knit jumper, tailored trousers",
    "simple fitted top, gold rings visible on the hand",
  ],
  water: [
    "small white triangle string bikini, thin side ties",
    "black string bikini, minimal coverage, classic cut",
    "white string bikini, barely-there coverage",
    "coral triangle bikini, thin straps",
    "navy blue bikini, classic silhouette",
  ],
  city: [
    "oversized white linen shirt, unbuttoned low, mid-thigh length",
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
    "white robe loosely tied, black bikini just visible beneath",
    "oversized white dress shirt, unbuttoned to the waist, mid-thigh length",
    "fitted ribbed crop top and matching low-rise mini skirt",
  ],
};

// ─── WARDROBE KEYWORD MAP ─────────────────────────────────────────────────────
// If the post's wardrobe field OR caption/hook contains these keywords, override the group.
const WARDROBE_KEYWORD_MAP = [
  { keywords: ["gym", "training", "workout", "deadlift", "squat", "session", "rep", "reps", "boxing", "punch bag"], group: "gym" },
  { keywords: ["mirror", "mirror selfie", "outfit check"], group: "mirror" },
  { keywords: ["office", "desk", "planner", "notebook", "laptop", "presenting", "whiteboard", "journal"], group: "office" },
  { keywords: ["knit", "jumper", "sweater", "knitwear", "cosy", "cozy", "oversized", "hoodie", "fleece", "morning", "lazy", "slow day", "on the sofa", "at home", "indoors", "couch", "kitchen"], group: "cosy" },
  { keywords: ["bikini", "swimwear", "swimsuit", "swim", "pool", "rooftop pool", "plunge pool", "hot tub"], group: "water" },
  { keywords: ["linen", "crop", "bralette", "shorts", "rooftop", "terrace", "balcony", "going out", "evening"], group: "city" },
];

// ─── SETTING LIBRARY ──────────────────────────────────────────────────────────
// No travel/resort destinations — home, gym, and city settings only.

const SETTINGS = {
  gym: [
    "home gym, rubber flooring, weights rack and bench in frame",
    "boxing gym with a hanging bag, moody single-source lighting",
    "city park path or running track, early morning, cool light",
  ],
  mirror: [
    "home gym mirror wall, rubber flooring, weights rack visible in reflection",
    "walk-in wardrobe or full-length bedroom mirror, neutral tones, soft daylight",
    "gym hallway mirror, practical lighting, post-training",
  ],
  office: [
    "home office desk, notebook, laptop, coffee, morning light",
    "home office or co-working space, whiteboard or laptop with charts visible",
  ],
  water: [
    "rooftop pool on an apartment building, bright midday light, city skyline in background",
    "private pool on a building's amenity floor, warm afternoon light",
    "home terrace with a small plunge pool or hot tub, early morning light",
  ],
  cosy: [
    "sun-drenched apartment living room, large floor-to-ceiling windows, soft morning light on white walls",
    "minimalist studio flat, pale walls, warm side light, wooden floors",
    "bright airy loft, exposed brick wall, large window, morning sunlight streaming in",
    "kitchen, clean counter, bright morning window light",
  ],
  city: [
    "sun-drenched apartment rooftop terrace, city panorama below",
    "penthouse balcony, floor-to-ceiling glass, golden hour",
    "city rooftop bar terrace, skyline view, evening ambience",
    "apartment building rooftop, string lights, dusk",
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
  { keywords: ["mirror", "mirror selfie"], tags: ["mirror", "selfie"] },
  { keywords: ["selfie"], tags: ["selfie"] },
  { keywords: ["training", "gym", "deadlift", "squat", "workout", "boxing", "punch"], tags: ["gym", "action", "training"] },
  { keywords: ["running", "run", "jog"], tags: ["action", "running", "full-length"] },
  { keywords: ["desk", "office", "planner", "journal", "writing", "presenting"], tags: ["office", "hands"] },
];

// ─── MOOD KEYWORD MAP ─────────────────────────────────────────────────────────
// Maps caption/hook mood words to shot tags.
const MOOD_TAG_MAP = [
  { keywords: ["mysterious", "moody", "dark", "contemplative"], tags: ["mysterious", "over-shoulder"] },
  { keywords: ["confident", "powerful", "bold", "strong"], tags: ["confident", "powerful"] },
  { keywords: ["intimate", "soft", "gentle", "cosy", "cozy", "warm"], tags: ["intimate", "relaxed"] },
  { keywords: ["editorial", "fashion", "runway", "high-fashion"], tags: ["editorial", "runway"] },
  { keywords: ["relaxed", "casual", "lazy", "slow", "morning"], tags: ["relaxed", "seated"] },
  { keywords: ["discipline", "standard", "non-negotiable", "focused", "training"], tags: ["gym", "action"] },
  { keywords: ["proof", "results", "winning", "success", "momentum"], tags: ["confident", "powerful"] },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function classifySetting(rawSetting) {
  const s = (rawSetting || "").toLowerCase();
  if (/gym|training|workout|deadlift|squat|boxing|running|track/.test(s)) return "gym";
  if (/mirror|outfit check/.test(s)) return "mirror";
  if (/office|desk|planner|notebook|laptop|whiteboard|journal/.test(s)) return "office";
  if (/pool|plunge|hot tub|swim/.test(s)) return "water";
  if (/kitchen|sofa|living room|at home|indoors|morning|lounge|apartment|sunlit wall|sunlight|staying in|couch/.test(s)) return "cosy";
  if (/balcony|rooftop|terrace|city street|going out|evening/.test(s)) return "city";
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

export function buildPrompt({ imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection }) {
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

ACCESSORIES: Small gold hoop earrings where ears are visible. Layered delicate gold chains at the neckline for city and pool settings.

MARK: Small dark mole on the left side of the neck, just below the jawline, approximately 3mm — present whenever the neck is visible and unobstructed.

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
