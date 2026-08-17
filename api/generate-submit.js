// api/generate-submit.js
// Submits Grok Imagine Image 2.0 (fal.ai) generation job to the async queue.
// Identity = pixel-match reference images. More suggestive wardrobe allowed (clothed / underboob OK).

import {
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

function stringifyPromptValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(stringifyPromptValue).filter(Boolean).join("; ");
  try { return JSON.stringify(value); } catch { return String(value); }
}

function textPromptValue(value) {
  return stringifyPromptValue(value).trim();
}

function isSelfieFrame(frame) {
  return /selfie|reflective|mirror|glass/i.test(textPromptValue(frame));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractScene({ imagePrompt, caption, hook, photo_idea }) {
  if (imagePrompt && typeof imagePrompt === "object" && !Array.isArray(imagePrompt)) {
    const fromStruct = imagePrompt.subject || imagePrompt.photo_idea || imagePrompt.setting || "";
    const scene = textPromptValue(fromStruct);
    if (scene.length > 25) return scene;
  }
  const photoIdea = textPromptValue(photo_idea);
  if (photoIdea.length > 25) return photoIdea;
  const captionText = textPromptValue(caption);
  if (captionText.length > 25) return captionText;
  const hookText = textPromptValue(hook);
  if (hookText.length > 10) return hookText;
  return "";
}

function detectContext(text) {
  const t = textPromptValue(text).toLowerCase();
  if (/gym|train|workout|deadlift|squat|rep|boxing|punch|weights|session/.test(t)) return "gym";
  if (/run|running|jog|track|park path/.test(t)) return "running";
  if (/mirror|reflective|glass|outfit check|getting ready/.test(t)) return "reflective";
  if (/rooftop|resort|water|ocean|beach|plunge|terrace|pool/.test(t)) return "resort";
  if (/kitchen|sofa|couch|living room|at home|indoors|jumper|knit|candle|morning light|private|lounge|bed/.test(t)) return "lounge";
  if (/office|desk|planner|laptop|notebook|journal/.test(t)) return "office";
  if (/balcony|city|street|evening|going out/.test(t)) return "city";
  return "general";
}

const FALLBACK_WARDROBE = {
  gym: "fitted athletic crop top and low-rise training shorts, trainers",
  running: "cropped running top and athletic shorts, trainers",
  reflective: "short ribbed crop top and low-rise denim, casual indoor outfit",
  resort: "simple two-piece resort set with thin straps, clean lines",
  lounge: "thin-strap cami and soft lounge shorts, or oversized open shirt over a simple set",
  office: "fitted top, low-rise trousers, jewellery matching references",
  city: "cropped summer top, low-rise denim, jewellery matching references",
  general: "short ribbed crop top and low-rise denim, casual indoor look",
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

function sanitizePromptText(text) {
  return textPromptValue(text)
    .replace(/\"/g, "'")
    .replace(/\b(19|19-year-old)\b/gi, "young adult")
    .replace(/\b(nude|naked|genitals|explicit sex|nsfw|porn|xxx)\b/gi, "")
    .replace(/\b(underage|minor|teen)\b/gi, "adult")
    .replace(/\b(underboob|under-bust|under bust|sideboob|cleavage)\b/gi, "midriff")
    .replace(/\b(micro string|string bikini|micro bikini|thong)\b/gi, "two-piece set")
    .replace(/\b(lingerie|bralette|panties|briefs)\b/gi, "lounge set")
    .replace(/\b(hem above the under-bust fold|underside curve of the breasts)\b/gi, "short hem at the ribcage")
    .replace(/\b(bare breasts|exposed breasts|exposed chest)\b/gi, "open neckline");
}

export function buildPrompt({ imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea, personaId = "cara" }) {
  const visual = getPersonaVisual(personaId);
  const rawScene = extractScene({ imagePrompt, caption, hook, photo_idea });
  const scene = sanitizePromptText(rawScene);
  const context = detectContext([scene, caption, hook, wardrobe, photoDirection].map(textPromptValue).filter(Boolean).join(" "));

  let wardrobeText = "";
  const wardrobeTextInput = imagePrompt && typeof imagePrompt === "object" && !Array.isArray(imagePrompt) ? imagePrompt.wardrobe : null;
  if (textPromptValue(wardrobe).split(/\s+/).filter(Boolean).length > 3) {
    wardrobeText = sanitizePromptText(wardrobe);
  } else if (wardrobeTextInput) {
    wardrobeText = sanitizePromptText(wardrobeTextInput);
  } else {
    wardrobeText = FALLBACK_WARDROBE[context] || FALLBACK_WARDROBE.general;
  }

  if (visual.id === "lila") {
    wardrobeText = wardrobeText
      .replace(/\b(red|neon|hot pink|bright orange|loud navy)\b/gi, "soft cream")
      .replace(/\b(patterned|print|floral loud)\b/gi, "clean minimal");
  }
  if (visual.id === "duo") {
    wardrobeText = wardrobeText.replace(/\b(red|neon|hot pink|bright orange)\b/gi, "soft neutral");
  }

  let settingText = "";
  const structuredSetting = imagePrompt && typeof imagePrompt === "object" && !Array.isArray(imagePrompt) ? imagePrompt.setting : null;
  if (structuredSetting) {
    settingText = sanitizePromptText(structuredSetting);
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
    : visual.id === "duo"
      ? "- Jewellery: Cara keeps the jewellery from Cara references; Lila keeps simple gold hoops only. Never swap jewellery between them."
      : "- When neck/chest visible, include jewellery exactly as in reference images (gold hoops, layered chains, cross/coin if present in refs).";

  const antiMismatch = `\nCRITICAL MATCHING & LOCATION RULES:\n- Clothes, setting, and action MUST match the scene/caption.\n- Mirror / reflective glass shots ONLY indoors in private quarters.\n- Outdoor/public shots: arm's-length selfie or candid — not bathroom mirror outdoors.\n${jewelleryRule}\n- Clothing stays on. Short crop tops and open shirts OK. No full nudity, no transparent fabric, no genitals.`;

  const sceneBlock = scene.length > 20
    ? `SCENE TO DEPICT: ${scene.slice(0, 320)}\n`
    : `SCENE: Natural candid UGC / model moment. Phone-real, not studio.\n`;

  const subjectRule = visual.id === "duo"
    ? "Recreate BOTH women identically from their reference images. Cara and Lila must remain separate, recognisable identities in the same frame. Do not merge faces or create duplicates."
    : "Recreate face and body identically from the reference images — exact pixel identity lock. Same person as refs, not a similar-looking model.";

  return `${visual.ugcStillCore}\n\nRAW unretouched photorealistic photograph. ${subjectRule}\n\n${sceneBlock}\nCAMERA & FRAME:\n- ${frame}\n- Vertical 9:16 when possible. Tack-sharp eyes. Natural phone or prime-lens realism.\n- Quality: 4K ultra-clear phone capture. Visible pores on nose/cheeks, natural skin micro-texture, subtle uneven tone. Sharp iris. Photoreal — not soft AI, not beauty campaign.\n\nSKIN HARD RULE: Must match reference skin exactly — real human texture with pores and natural variation. Forbidden: plastic, waxy, porcelain, airbrushed, over-smoothed, glossy CGI, Facetune, beauty-filter glow.\n\nWARDROBE: ${wardrobeText}\nSETTING: ${settingText}\n${shotAngle ? `SHOT ANGLE: ${sanitizePromptText(shotAngle)}` : ""}\n${textPromptValue(photoDirection) ? `DIRECTION: ${sanitizePromptText(photoDirection)}` : ""}\n${selfieGuidance}\n${antiMismatch}\n\n${visual.identityLock}\n\nDO NOT: ${visual.negative}`;
}

export async function submitToFal({ falKey, prompt, imageUrls = null, personaId = "cara" }) {
  const visual = getPersonaVisual(personaId);
  const urls = refsForSubmit(visual.refs);
  if (!urls.length) throw new Error(`No reference images configured for persona ${visual.id}`);

  const res = await fetch(FAL_EDIT_QUEUE_URL, {
    method: "POST",
    headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, image_urls: urls, num_images: 1, resolution: GROK_RESOLUTION, output_format: "jpeg" }),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`fal.ai non-JSON error (${res.status}): ${text.slice(0, 150)}`); }
  if (!res.ok || !data.request_id) throw new Error(`fal.ai submit failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
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
  } catch {
    return res.status(400).json({ error: "Invalid JSON request body" });
  }

  const { imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea, personaId, persona_id } = body;
  const _personaId = personaId || persona_id || "cara";
  const _visual = getPersonaVisual(_personaId);
  if (!_visual.refs || !_visual.refs.length) {
    return res.status(500).json({ error: `${_visual.id.toUpperCase()}_REFS is empty in cara-config.js — upload refs first` });
  }

  let prompt;
  try {
    prompt = buildPrompt({ imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea, personaId: _personaId });
  } catch (e) {
    return res.status(500).json({ error: "buildPrompt failed", detail: e.message });
  }

  try {
    const queueData = await submitToFal({ falKey: apiKey, prompt, imageUrls: _visual.refs, personaId: _personaId });
    const requestId = queueData.request_id;
    return res.status(200).json({ requestId, personaId: _personaId, statusUrl: queueData.status_url || `${FAL_EDIT_REQUESTS_BASE}/${requestId}/status`, resultUrl: queueData.response_url || `${FAL_EDIT_REQUESTS_BASE}/${requestId}`, model: "xai/grok-imagine-image/v2.0/edit", queue: { status: queueData.status, queue_position: queueData.queue_position } });
  } catch (e) {
    return res.status(502).json({ error: "Queue submit failed", detail: e.message });
  }
}
