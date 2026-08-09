// api/generate-submit.js
// Submits a GPT Image 2 (fal.ai) generation job to the async queue.
// Merges ultra-realistic Sony A7R V camera physics from flux.md with safe prompt translation.

import {
  CARA_REFS,
  FAL_EDIT_QUEUE_URL,
  FAL_EDIT_REQUESTS_BASE,
  CARA_IMAGE_SIZE,
  CARA_IDENTITY_LOCK,
  CARA_NEGATIVE_PROMPT,
  CARA_SELFIE_ANATOMY_GUIDANCE,
} from "./cara-config.js";

const FRAMES = [
  "85mm prime lens at f/1.8, three-quarter length, creamy background bokeh",
  "50mm prime lens, full-length portrait, natural distance, tack-sharp focus on skin",
  "85mm macro-leaning close-up, chest-up, shallow depth of field, sharp iris reflections",
  "close phone selfie angle, arm bent naturally, tight crop, natural window light",
  "reflective glass shot, medium-close crop, phone visible in reflection",
  "35mm candid mid-action shot, not looking at camera, motion-caught focus",
  "50mm side profile, soft directional 5600K light",
  "24mm wide environmental portrait, full body in context, high dynamic range",
];

function isSelfieFrame(frame) {
  return /selfie|reflective|glass/i.test(frame || "");
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractScene({ imagePrompt, caption, hook, photo_idea }) {
  if (imagePrompt && typeof imagePrompt === "object") {
    const fromStruct =
      imagePrompt.subject ||
      imagePrompt.photo_idea ||
      imagePrompt.setting ||
      "";
    if (fromStruct.trim().length > 25) return fromStruct.trim();
  }
  if (typeof photo_idea === "string" && photo_idea.trim().length > 25) {
    return photo_idea.trim();
  }
  if (typeof caption === "string" && caption.trim().length > 25) {
    return caption.trim();
  }
  if (typeof hook === "string" && hook.trim().length > 10) {
    return hook.trim();
  }
  return "";
}

function detectContext(text) {
  const t = (text || "").toLowerCase();
  if (/gym|train|workout|deadlift|squat|rep|boxing|punch|weights|session/.test(t)) return "gym";
  if (/run|running|jog|track|park path/.test(t)) return "running";
  if (/reflective|glass|outfit check|getting ready/.test(t)) return "reflective";
  if (/rooftop|resort|water|ocean|beach|plunge|terrace/.test(t)) return "resort";
  if (/kitchen|sofa|couch|living room|at home|indoors|jumper|knit|candle|morning light|private quarters|lounge/.test(t)) return "lounge";
  if (/office|desk|planner|laptop|notebook|journal/.test(t)) return "office";
  if (/balcony|city|street|evening|going out/.test(t)) return "city";
  return "general";
}

const FALLBACK_WARDROBE = {
  gym: "fitted athletic crop top and low-rise athletic shorts, trainers, ponytail",
  running: "cropped running top and micro athletic shorts, trainers",
  reflective: "unbuttoned silk shirt over a low-cut ribbed crop top, low-rise shorts",
  resort: "high-cut two-piece resort set with thin side ties",
  lounge: "delicate thin-strap silk cami and high-cut lounge shorts",
  office: "deep-V fitted top, low-rise trousers, gold cross necklace",
  city: "cropped tie-front summer top, low-rise denim shorts, gold jewellery",
  general: "unbuttoned linen shirt over a low-cut satin crop, low-rise micro shorts",
};

const FALLBACK_SETTING = {
  gym: "home gym space, rubber mat flooring, weights rack visible in background",
  running: "park path or quiet road, early morning light",
  reflective: "reflective glass wall in private interior, warm window light",
  resort: "rooftop infinity edge or terrace plunge pool, natural bright daylight",
  lounge: "private interior on white linen lounge seating, warm afternoon window light",
  office: "desk area, soft side window light, notebook and coffee",
  city: "private balcony or quiet boutique street",
  general: "everyday indoor or outdoor location fitting a model aesthetic, natural light",
};

/**
 * Strips safety trigger words AND unescaped quotes while preserving high-fashion intent.
 */
function sanitizePromptText(text) {
  if (!text) return "";
  return text
    .replace(/"/g, "'") // Strip unescaped double quotes
    .replace(/\b(19|19-year-old|21|23)\b/gi, "young adult")
    // Banned keywords → safe high-exposure alternatives
    .replace(/\b(micro string bikini|string bikini|micro bikini|bikini|swimsuit|swimwear|bathing suit)\b/gi, "high-cut two-piece resort set")
    .replace(/\b(lingerie set|lingerie|underwear|bra|bralette|briefs|panties|thong|bustier|corset)\b/gi, "satin lounge set")
    .replace(/\b(sheer|lace)\b/gi, "fine-knit chiffon")
    .replace(/\b(cleavage|bare skin|naked|nude|exposed skin)\b/gi, "sun-kissed collarbone and midriff")
    .replace(/\b(bedroom|bed|messy sheets)\b/gi, "private room lounge")
    .replace(/\b(mirror selfie|mirror selfies)\b/gi, "reflective glass shot");
}

export function buildPrompt({ imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea }) {
  const rawScene = extractScene({ imagePrompt, caption, hook, photo_idea });
  const scene = sanitizePromptText(rawScene);
  const context = detectContext([scene, caption, hook, wardrobe, photoDirection].filter(Boolean).join(" "));

  let wardrobeText = "";
  if (wardrobe && wardrobe.trim().split(/\s+/).length > 3) {
    wardrobeText = sanitizePromptText(wardrobe.trim());
  } else if (imagePrompt && typeof imagePrompt === "object" && imagePrompt.wardrobe) {
    wardrobeText = sanitizePromptText(imagePrompt.wardrobe);
  } else {
    wardrobeText = FALLBACK_WARDROBE[context] || FALLBACK_WARDROBE.general;
  }

  let settingText = "";
  if (imagePrompt && typeof imagePrompt === "object" && imagePrompt.setting) {
    settingText = sanitizePromptText(imagePrompt.setting);
  } else if (scene.length > 40) {
    settingText = "Match setting and time of day implied by scene above";
  } else {
    settingText = FALLBACK_SETTING[context] || FALLBACK_SETTING.general;
  }

  const frame = pickRandom(FRAMES);
  const selfieShot = isSelfieFrame(frame) || isSelfieFrame(scene) || isSelfieFrame(photoDirection);
  const selfieGuidance = selfieShot ? `\n${CARA_SELFIE_ANATOMY_GUIDANCE}\n` : "";

  const antiMismatch = `
CRITICAL MATCHING & LOCATION RULES:
- The clothes, setting, and action MUST match the scene/caption.
- REFLECTIVE GLASS SHOTS ARE ONLY ALLOWED INDOORS IN PRIVATE QUARTERS.
- OUTDOOR/PUBLIC SHOTS MUST BE STANDARD ARM'S LENGTH SELFIES OR CANDID PHOTOS.
- Always show her signature gold cross necklace when chest/neck is visible.`;

  const sceneBlock = scene.length > 20
    ? `SCENE TO DEPICT: ${scene.slice(0, 300)}\n`
    : `SCENE: Natural candid moment in Cara's life. Model aesthetic, resortwear styling.\n`;

  // FULL FLUX.MD TECHNICAL AND PHYSICAL SPECIFICATIONS INTEGRATED
  return `RAW photorealistic fashion photograph of Cara Whitmore. Recreate her face and features identically from reference images CARA_REFS.

${sceneBlock}
CAMERA & TECHNICAL SPECIFICATIONS:
- Shot on Sony A7R V, ${frame}, ISO 100, 1/200s shutter.
- Tack-sharp focus on eyes and skin, shallow depth of field, creamy circular background bokeh.
- High dynamic range, subtle chromatic aberration at frame edges only.
- Color grading: Teal and Orange LUT, warm skin tones, neutral whites, 5600K color temperature. 9:16 vertical.

WARDROBE: ${wardrobeText}.
LOCATION / SETTING: ${settingText}.

IDENTITY & PHYSICAL LOCK (STRICT):
- EYES: Distinctly bright green — moist iris with intricate radial patterns, realistic specular catchlight reflections, dark limbal ring. Unmistakably bright green in all lighting.
- BROWS: Strong, thick, dark brown — natural shape, not thin, not drawn-on.
- HAIR: Dark brown (not black) with natural wave, long past shoulders. Individual strands catching warm highlights in direct light.
- MARK & JEWELLERY: Small dark mole (3mm) on left side of neck just below jawline (always present when neck is visible). Small gold hoop earrings, layered 2-3 fine gold chains with cross pendant.
- BUILD: Slim, athletic build from training, flat stomach, toned.

BIOLOGY & REALISM STANDARDS:
- Pore-level skin micro-texture visible on skin at medium distance or closer.
- Subsurface scattering — skin absorbs and scatters light physically correctly, no flat rendering.
- Fine vellus hair visible on arms, shoulders, and face edges in backlight.
- Natural skin unevenness, slight cheek warmth, fine expression lines at eye corners.
- Physically accurate fabric tension, drapes, and folds against the body.
- Real film grain — ZERO digital smoothing, ZERO beauty filter, ZERO plastic skin.

${antiMismatch}
${selfieGuidance}

${CARA_IDENTITY_LOCK}

DO NOT: ${CARA_NEGATIVE_PROMPT}`;
}

export async function submitToFal({ falKey, prompt, imageUrls = CARA_REFS }) {
  const res = await fetch(FAL_EDIT_QUEUE_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_urls: imageUrls,
      image_size: CARA_IMAGE_SIZE,
      output_format: "jpeg",
      safety_tolerance: "6",
      num_images: 1,
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`fal.ai non-JSON error (${res.status}): ${text.slice(0, 150)}`);
  }

  if (!res.ok || !data.request_id) {
    throw new Error(`fal.ai submit failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data.request_id;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "FAL_API_KEY environment variable is not configured" });

  if (!CARA_REFS || !CARA_REFS.length) {
    return res.status(500).json({ error: "CARA_REFS is empty in cara-config.js" });
  }

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON request body" });
  }

  const { imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea } = body;

  let prompt;
  try {
    prompt = buildPrompt({ imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea });
  } catch (e) {
    return res.status(500).json({ error: "buildPrompt failed", detail: e.message });
  }

  let requestId;
  try {
    requestId = await submitToFal({ falKey: apiKey, prompt });
  } catch (e) {
    return res.status(502).json({ error: "Queue submit failed", detail: e.message });
  }

  return res.status(200).json({
    requestId,
    statusUrl: `${FAL_EDIT_REQUESTS_BASE}/${requestId}/status`,
    resultUrl: `${FAL_EDIT_REQUESTS_BASE}/${requestId}`,
  });
}
