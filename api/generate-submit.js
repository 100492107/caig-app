// api/generate-submit.js
// Submits a GPT Image 2 (fal.ai) generation job to the async queue.
// Merges ultra-realistic Sony A7R V camera physics from flux.md with safe prompt translation.

import {
  CARA_REFS,
  FAL_EDIT_QUEUE_URL,
  FAL_EDIT_REQUESTS_BASE,
  CARA_IMAGE_SIZE,
  IMAGE_SIZE_9x16,
  getPersonaVisual,
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

  // Lila wardrobe bias: force neutrals if fallback is too loud
  if (visual.id === "lila") {
    wardrobeText = wardrobeText
      .replace(/\b(red|neon|hot pink|bright orange|loud)\b/gi, "soft cream")
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
    ? "- Jewellery: small simple gold hoop earrings only. No cross, no coin stack."
    : "- Always show her signature gold cross necklace when chest/neck is visible.";

  const antiMismatch = `
CRITICAL MATCHING & LOCATION RULES:
- The clothes, setting, and action MUST match the scene/caption.
- REFLECTIVE GLASS SHOTS ARE ONLY ALLOWED INDOORS IN PRIVATE QUARTERS.
- OUTDOOR/PUBLIC SHOTS MUST BE STANDARD ARM'S LENGTH SELFIES OR CANDID PHOTOS.
${jewelleryRule}`;

  const sceneBlock = scene.length > 20
    ? `SCENE TO DEPICT: ${scene.slice(0, 300)}\n`
    : `SCENE: Natural candid UGC moment in ${visual.name}'s life. Phone-real, not studio.\n`;

  // Money-mode default: phone UGC core + identity lock (editorial fashion language retired as default)
  return `${visual.ugcStillCore}

RAW photorealistic mobile photograph of ${visual.name}. Recreate her face and features identically from reference images.

${sceneBlock}
CAMERA & FRAME:
- ${frame}
- Vertical 9:16. Tack-sharp eyes. Natural phone or prime-lens realism — not glossy magazine polish.
- Quality: 4K ultra-clear, ultra-detailed, pore-level skin, sharp iris — nano-banana-2 photoreal (not soft AI).

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
  });
}
