// api/generate-submit.js
// Submits Grok Imagine Image 2.0 (fal.ai) generation job to the async queue.
// Identity = pixel-match reference images. More suggestive wardrobe allowed (clothed / underboob OK).

import {
  CARA_REFS,
  FAL_EDIT_QUEUE_URL,
  FAL_EDIT_REQUESTS_BASE,
  GROK_RESOLUTION,
  getPersonaVisual,
  refsForSubmit,
} from "./cara-config.js";

const FRAMES = [
  "85mm prime feel, three-quarter length, soft natural bokeh",
  "50mm full-length portrait, natural distance, sharp skin",
  "close chest-up, shallow depth, sharp eyes",
  "close phone selfie angle, arm bent naturally, tight crop, natural window light",
  "mirror reflection shot, medium-close crop, phone visible in reflection, private interior only",
  "35mm candid mid-action, not looking at camera",
  "50mm side profile, soft directional daylight",
  "low angle near floor looking up, short crop top, ~24mm phone wide feel",
  "bed edge or lounge three-quarter, soft morning window light",
];

function isSelfieFrame(frame) {
  return /selfie|reflective|mirror|glass/i.test(frame || "");
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
  if (/mirror|reflective|glass|outfit check|getting ready/.test(t)) return "reflective";
  if (/rooftop|resort|water|ocean|beach|plunge|terrace|pool/.test(t)) return "resort";
  if (/kitchen|sofa|couch|living room|at home|indoors|jumper|knit|candle|morning light|private|lounge|bed/.test(t)) return "lounge";
  if (/office|desk|planner|laptop|notebook|journal/.test(t)) return "office";
  if (/balcony|city|street|evening|going out/.test(t)) return "city";
  return "general";
}

// More suggestive defaults — Grok 2.0 tolerates these; still clothed
const FALLBACK_WARDROBE = {
  gym: "fitted athletic crop top ending high on the ribcage and low-rise athletic shorts, trainers",
  running: "cropped running top and micro athletic shorts, trainers",
  reflective: "very short ribbed crop top with under-bust hem lift from posture, low-rise shorts",
  resort: "minimal triangle string two-piece or high-cut resort set with thin side ties",
  lounge: "thin-strap satin or silk cami and high-cut lounge shorts, or oversized open shirt over minimal set",
  office: "fitted deep-neck top, low-rise trousers, jewellery from refs",
  city: "cropped summer top, low-rise denim, gold jewellery from refs",
  general: "extremely short ribbed crop top (hem above under-bust fold so underside curve can show), low-rise denim or shorts",
};

const FALLBACK_SETTING = {
  gym: "home gym space, rubber mat, weights rack soft in background",
  running: "park path or quiet road, early morning light",
  reflective: "private interior mirror or glass, warm window light",
  resort: "hotel room, terrace, or private pool edge, bright daylight",
  lounge: "private bedroom or lounge, white linen, soft window light",
  office: "desk area, soft side window light",
  city: "private balcony or quiet street threshold",
  general: "bright modern private interior or glass corridor, natural light",
};

/**
 * Light sanitize — keep suggestive clothing language; only strip hard blocks.
 */
function sanitizePromptText(text) {
  if (!text) return "";
  return text
    .replace(/"/g, "'")
    .replace(/\b(19|19-year-old)\b/gi, "young adult")
    .replace(/\b(nude|naked|genitals|explicit sex)\b/gi, "")
    .replace(/\b(underage|minor|teen)\b/gi, "adult");
}

export function buildPrompt({
  imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea,
  personaId = "cara",
}) {
  const visual = getPersonaVisual(personaId);
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

  if (visual.id === "lila") {
    wardrobeText = wardrobeText
      .replace(/\b(red|neon|hot pink|bright orange|loud navy)\b/gi, "soft cream")
      .replace(/\b(patterned|print|floral loud)\b/gi, "clean minimal");
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
  const selfieGuidance = selfieShot ? `\n${visual.selfieGuidance}\n` : "";

  const jewelleryRule = visual.id === "lila"
    ? "- Jewellery: small simple gold hoop earrings only (from refs). No cross, no coin stack."
    : "- When neck/chest visible, include jewellery exactly as in reference images (gold hoops, layered chains, cross/coin if present in refs).";

  const antiMismatch = `
CRITICAL MATCHING & LOCATION RULES:
- Clothes, setting, and action MUST match the scene/caption.
- Mirror / reflective glass shots ONLY indoors in private quarters.
- Outdoor/public shots: arm's-length selfie or candid — not bathroom mirror outdoors.
${jewelleryRule}
- Clothing stays on. Underboob / short hem / open shirt OK. No full nudity, no transparent fabric, no genitals.`;

  const sceneBlock = scene.length > 20
    ? `SCENE TO DEPICT: ${scene.slice(0, 320)}\n`
    : `SCENE: Natural candid UGC / model moment. Phone-real, not studio.\n`;

  return `${visual.ugcStillCore}

RAW photorealistic photograph. Recreate face and body identically from the reference images — exact pixel identity lock.

${sceneBlock}
CAMERA & FRAME:
- ${frame}
- Vertical 9:16 when possible. Tack-sharp eyes. Natural phone or prime-lens realism.
- Quality: 4K ultra-clear, pore-level skin, sharp iris — photoreal not soft AI.

WARDROBE: ${wardrobeText}
SETTING: ${settingText}
${shotAngle ? `SHOT ANGLE: ${sanitizePromptText(shotAngle)}` : ""}
${photoDirection ? `DIRECTION: ${sanitizePromptText(photoDirection)}` : ""}
${selfieGuidance}
${antiMismatch}

${visual.identityLock}

DO NOT: ${visual.negative}`;
}

export async function submitToFal({ falKey, prompt, imageUrls = null, personaId = "cara" }) {
  const visual = getPersonaVisual(personaId);
  if (!imageUrls || !imageUrls.length) imageUrls = visual.refs;
  const urls = refsForSubmit(imageUrls);

  const res = await fetch(FAL_EDIT_QUEUE_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_urls: urls,
      num_images: 1,
      resolution: GROK_RESOLUTION,
      output_format: "jpeg",
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

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON request body" });
  }

  const {
    imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea,
    personaId, persona_id,
  } = body;

  const _personaId = personaId || persona_id || "cara";
  const _visual = getPersonaVisual(_personaId);
  if (!_visual.refs || !_visual.refs.length) {
    return res.status(500).json({
      error: `${_visual.id.toUpperCase()}_REFS is empty in cara-config.js — upload refs first`,
    });
  }

  let prompt;
  try {
    prompt = buildPrompt({
      imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea,
      personaId: _personaId,
    });
  } catch (e) {
    return res.status(500).json({ error: "buildPrompt failed", detail: e.message });
  }

  let requestId;
  try {
    requestId = await submitToFal({
      falKey: apiKey,
      prompt,
      imageUrls: _visual.refs,
      personaId: _personaId,
    });
  } catch (e) {
    return res.status(502).json({ error: "Queue submit failed", detail: e.message });
  }

  return res.status(200).json({
    requestId,
    personaId: _personaId,
    statusUrl: `${FAL_EDIT_REQUESTS_BASE}/${requestId}/status`,
    resultUrl: `${FAL_EDIT_REQUESTS_BASE}/${requestId}`,
    model: "xai/grok-imagine-image/v2.0/edit",
  });
}
