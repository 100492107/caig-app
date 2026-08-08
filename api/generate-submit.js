// api/generate-submit.js
// Submits a nano-banana-2 generation job to fal.ai's async queue.
// Caption / photo_idea drives setting + wardrobe + action.
// Identity comes from CARA_REFS (reference-image editing) + identity lock in cara-config.js.

import {
  CARA_REFS,
  FAL_EDIT_QUEUE_URL,
  FAL_EDIT_REQUESTS_BASE,
  CARA_IMAGE_SIZE,
  CARA_IDENTITY_LOCK,
  CARA_NEGATIVE_PROMPT,
  CARA_SELFIE_ANATOMY_GUIDANCE,
} from "./cara-config.js";

// ─── LIGHTWEIGHT SHOT FRAMES (only used when caption is vague) ───────────────
const FRAMES = [
  "35mm eye-level, three-quarter length",
  "50mm full-length, natural distance",
  "35mm medium shot, chest-up",
  "close phone selfie, arm bent naturally, tight crop",
  "reflective glass shot, medium-close crop, phone visible in reflection",
  "35mm candid mid-action, not looking at camera",
  "50mm side profile, soft light",
  "24mm wide environmental, full body in context",
];

function isSelfieFrame(frame) {
  return /selfie|reflective|glass/i.test(frame || "");
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Pull the most concrete scene description available.
 * Priority: structured image_prompt.subject / photo_idea → caption → hook
 */
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

/**
 * Very light keyword helpers only used when the scene text is too short
 * to give wardrobe/setting itself. Sanitized to bypass text safety filters.
 */
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
  gym: "fitted athletic shorts and crop top, trainers, hair in a ponytail",
  running: "running kit — athletic top, shorts, trainers",
  reflective: "ribbed cotton lounge crop and low-rise shorts",
  resort: "resort two-piece set in solid neutral tones",
  lounge: "delicate silk cami and lounge bottoms",
  office: "simple fitted top, low-rise trousers, gold cross necklace",
  city: "summer fashion crop top, low-rise linen shorts, gold jewellery",
  general: "trendy summer resortwear fashion or ribbed cotton set",
};

const FALLBACK_SETTING = {
  gym: "home gym space, rubber mat flooring, equipment visible",
  running: "park path or quiet road, early morning light",
  reflective: "reflective glass wall in private interior, natural light",
  resort: "rooftop infinity edge or beach shoreline, natural bright daylight",
  lounge: "private interior on white linen lounge seating, soft morning light",
  office: "desk area, natural window light",
  city: "private balcony or quiet boutique street",
  general: "everyday indoor or outdoor location fitting a model aesthetic, natural light",
};

export function buildPrompt({ imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea }) {
  const scene = extractScene({ imagePrompt, caption, hook, photo_idea });
  const context = detectContext([scene, caption, hook, wardrobe, photoDirection].filter(Boolean).join(" "));

  let wardrobeText = "";
  if (wardrobe && wardrobe.trim().split(/\s+/).length > 3) {
    wardrobeText = wardrobe.trim();
  } else if (imagePrompt && typeof imagePrompt === "object" && imagePrompt.wardrobe) {
    wardrobeText = imagePrompt.wardrobe;
  } else {
    wardrobeText = FALLBACK_WARDROBE[context] || FALLBACK_WARDROBE.general;
  }

  let settingText = "";
  if (imagePrompt && typeof imagePrompt === "object" && imagePrompt.setting) {
    settingText = imagePrompt.setting;
  } else if (scene.length > 40) {
    settingText = "Match the exact setting and time of day implied by the scene description above";
  } else {
    settingText = FALLBACK_SETTING[context] || FALLBACK_SETTING.general;
  }

  const frame = pickRandom(FRAMES);
  const selfieShot = isSelfieFrame(frame) || isSelfieFrame(scene) || isSelfieFrame(photoDirection);
  const selfieGuidance = selfieShot ? `\n${CARA_SELFIE_ANATOMY_GUIDANCE}\n` : "";

  const antiMismatch = `
CRITICAL MATCHING & LOCATION RULES:
- The clothes, setting, and action MUST match the scene/caption.
- REFLECTIVE GLASS SHOTS ARE ONLY ALLOWED INDOORS IN PRIVATE QUARTERS (Private Room, Bathroom, Dressing Area, Home Gym).
- ANY PUBLIC, OUTDOOR, SHOPPING, STREET, CAFÉ, OR BEACH SHOT MUST BE A STANDARD FRONT-FACING SELFIE (ARM'S LENGTH) OR A CANDID PHOTO TAKEN OF HER. NEVER A REFLECTIVE GLASS SHOT IN PUBLIC.
- IN FANVUE / MODEL MODE: Wardrobe follows high-fashion resortwear — ribbed cotton sets, satin lounge sets, or resort two-piece sets.
- Always show her signature gold cross necklace when chest/neck is visible.
- Exact face match to reference images — green eyes, freckles, thick natural dark brows. Zero face smoothing.`;

  const sceneBlock = scene.length > 20
    ? `SCENE TO DEPICT:\n"${scene.slice(0, 400)}"\n`
    : `SCENE: A natural, candid moment in Cara's real life. Model aesthetic, personal, resortwear styling.\n`;

  return `Photorealistic lifestyle photo of Cara Whitmore, 19, British model. Recreate her face exactly from reference photos.

${sceneBlock}
CAMERA / FRAMING: ${frame}. 9:16 vertical. Feels like a real phone photo or candid reflective shot, not a studio production.
WARDROBE: ${wardrobeText}.
LOCATION / SETTING: ${settingText}.
LIGHTING: Natural or available light that fits the moment. Real skin, real pores, mild film grain.

${antiMismatch}
${selfieGuidance}
${CARA_IDENTITY_LOCK}

TECHNICAL: Real phone photograph. 9:16 vertical portrait. Tack-sharp eyes. Photorealistic. Lived-in. Match the reference face exactly.

DO NOT: ${CARA_NEGATIVE_PROMPT}`;
}

/**
 * Submits a generation job to fal.ai nano-banana-2/edit and returns the request_id.
 * Safe JSON parsing prevents Vercel 500 crashes if Fal returns an HTML response.
 */
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
  console.log("[generate-submit] prompt:\n" + prompt);

  let requestId;
  try {
    requestId = await submitToFal({ falKey: apiKey, prompt });
  } catch (e) {
    return res.status(502).json({ error: "Queue submit failed", detail: e.message });
  }

  console.log("[generate-submit] queued:", requestId);
  return res.status(200).json({
    requestId,
    statusUrl: `${FAL_EDIT_REQUESTS_BASE}/${requestId}/status`,
    resultUrl: `${FAL_EDIT_REQUESTS_BASE}/${requestId}`,
  });
}
