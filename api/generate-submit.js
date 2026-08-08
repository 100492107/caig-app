// api/generate-submit.js
// Submits a nano-banana-2 generation job to fal.ai's async queue.
// Caption / photo_idea drives setting + wardrobe + action.
// Shot library only supplies camera framing when the caption is vague.
// Identity comes from CARA_REFS (reference-image editing) + the ultra-specific
// identity lock / negative prompt in cara-config.js — built off approved photos.

import {
  CARA_REFS,
  FAL_EDIT_QUEUE_URL,
  CARA_IMAGE_SIZE,
  CARA_IDENTITY_LOCK,
  CARA_NEGATIVE_PROMPT,
} from "./cara-config.js";

// ─── LIGHTWEIGHT SHOT FRAMES (only used when caption is vague) ───────────────
const FRAMES = [
  "35mm eye-level, three-quarter length",
  "50mm full-length, natural distance",
  "35mm medium shot, chest-up",
  "phone selfie, arm's length",
  "mirror selfie, full length, phone visible in reflection",
  "35mm candid mid-action, not looking at camera",
  "50mm side profile, soft light",
  "24mm wide environmental, full body in context",
];

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
 * to give wardrobe/setting itself.
 */
function detectContext(text) {
  const t = (text || "").toLowerCase();
  if (/gym|train|workout|deadlift|squat|rep|boxing|punch|weights|session/.test(t)) return "gym";
  if (/run|running|jog|track|park path/.test(t)) return "running";
  if (/mirror|outfit check|getting ready/.test(t)) return "mirror";
  if (/pool|bikini|swim|hot tub|plunge/.test(t)) return "water";
  if (/kitchen|sofa|couch|living room|at home|indoors|jumper|sweater|knit|candle|morning light|lazy/.test(t)) return "cosy";
  if (/office|desk|planner|laptop|notebook|journal/.test(t)) return "office";
  if (/rooftop|balcony|terrace|city|street|evening|going out/.test(t)) return "city";
  return "general";
}

const FALLBACK_WARDROBE = {
  gym: "fitted sports bra and leggings, trainers, hair in a ponytail or down",
  running: "running kit — sports bra or fitted top, shorts or leggings, trainers",
  mirror: "whatever she is checking in the mirror — keep it simple and real",
  water: "simple string bikini or swimwear appropriate to the setting",
  cosy: "oversized knit jumper or soft lounge clothes, bare legs or soft trousers",
  office: "simple fitted top or knit, tailored trousers or jeans, minimal gold jewellery",
  city: "casual city clothes — linen shirt, crop top, jeans or skirt, layered gold chains",
  general: "simple everyday clothes that fit a 19-year-old living her life — never formal blazer unless the caption clearly says so",
};

const FALLBACK_SETTING = {
  gym: "home gym, rubber flooring, weights visible",
  running: "city park path or quiet road, early morning light",
  mirror: "full-length mirror at home or in a gym, natural light",
  water: "apartment rooftop pool or small private plunge, natural light",
  cosy: "apartment living room or bedroom, soft morning or late afternoon light",
  office: "desk at home, notebook or laptop, natural window light",
  city: "apartment balcony, rooftop, or quiet city street",
  general: "everyday interior or outdoor space that fits the caption, natural light",
};

export function buildPrompt({ imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea }) {
  const scene = extractScene({ imagePrompt, caption, hook, photo_idea });
  const context = detectContext([scene, caption, hook, wardrobe, photoDirection].filter(Boolean).join(" "));

  // Prefer explicit wardrobe from generate-batch if it is specific
  let wardrobeText = "";
  if (wardrobe && wardrobe.trim().split(/\s+/).length > 3) {
    wardrobeText = wardrobe.trim();
  } else if (imagePrompt && typeof imagePrompt === "object" && imagePrompt.wardrobe) {
    wardrobeText = imagePrompt.wardrobe;
  } else {
    wardrobeText = FALLBACK_WARDROBE[context] || FALLBACK_WARDROBE.general;
  }

  // Setting: prefer structured or scene text; only fall back when needed
  let settingText = "";
  if (imagePrompt && typeof imagePrompt === "object" && imagePrompt.setting) {
    settingText = imagePrompt.setting;
  } else if (scene.length > 40) {
    // Let the scene itself carry the setting — do not override with a library
    settingText = "Match the exact setting and time of day implied by the scene description above";
  } else {
    settingText = FALLBACK_SETTING[context] || FALLBACK_SETTING.general;
  }

  const frame = pickRandom(FRAMES);

  // Hard anti-mismatch rules that the model must obey
  const antiMismatch = `
CRITICAL MATCHING RULES (must follow):
- The clothes, setting, and action MUST match the scene/caption. 
- Never put a blazer, tailored office wear, or formal clothes in a gym, training, or running scene.
- Never put gym clothes in a soft indoor / cosy / evening scene unless the caption says she is training.
- If the caption describes a walk, river, morning path, kitchen, sofa, candle, plants, or ordinary home moment — show that exact moment. Do not invent a gym or pool.
- If the caption is about training or a session — show training clothes and a training environment.
- Prefer the concrete details in the scene text over any generic "editorial" look.`;

  const sceneBlock = scene.length > 20
    ? `SCENE TO DEPICT (this is the primary instruction — follow it closely):\n"${scene.slice(0, 400)}"\n`
    : `SCENE: A natural, candid moment in Cara's real life. Mid-action or quiet, not a posed model shot.\n`;

  return `Photorealistic lifestyle photograph of Cara, 19, British. Recreate her exactly from the reference images — same face, same features, same identity.

${sceneBlock}
CAMERA / FRAMING: ${frame}. 9:16 vertical. Feels like a real phone photo or candid mirror shot, not a studio production.
WARDROBE: ${wardrobeText}.
LOCATION / SETTING: ${settingText}.
LIGHTING: Natural or available light that fits the moment (morning grey, soft window, gym overhead, golden hour, etc.). Never studio softboxes. Real skin, real pores, mild film grain.

${antiMismatch}

${CARA_IDENTITY_LOCK}

TECHNICAL: Real phone photograph. Prefer selfie or mirror selfie framing when the scene allows. Tack-sharp eyes. Photorealistic. 9:16. Lived-in. Mild film grain. Match the reference face exactly.

DO NOT: ${CARA_NEGATIVE_PROMPT}`;
}

/**
 * Submits a generation job to fal.ai nano-banana-2/edit and returns the request_id.
 * Restored as a named export — other endpoints (queue actions, "post as reel", etc.)
 * depend on this exact name. If you rename it again, grep the whole api/ folder
 * first ("submitToFal") or those callers will crash at import time, not at call
 * time — which shows up as a generic FUNCTION_INVOCATION_FAILED with no useful
 * detail, not a JSON error from your own code.
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

  const data = await res.json();
  if (!res.ok || !data.request_id) {
    throw new Error(`fal.ai submit failed: ${JSON.stringify(data)}`);
  }
  return data.request_id;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "FAL_API_KEY not configured" });

  if (!CARA_REFS.length) {
    return res.status(500).json({ error: "CARA_REFS is empty — add reference image URLs to cara-config.js" });
  }

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea, seed } = body;

  let prompt;
  try {
    prompt = buildPrompt({ imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea });
  } catch (e) {
    // buildPrompt should never throw, but guard anyway — an uncaught throw here
    // previously would have crashed the whole function with no JSON response.
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
  return res.status(200).json({ requestId });
}
