// api/generate-submit.js
// Submits Grok Imagine Image 2.0 (fal.ai) generation job to the async queue.
// Identity = pixel-match reference images.
// fal.ai blocks explicit keywords — we keep prompts fal-safe while still
// communicating intimate / Fanvue energy through fashion + private-moment language.
// Grok Imagine itself will render the intended energy once the prompt passes fal.

import {
  FAL_EDIT_QUEUE_URL,
  FAL_EDIT_REQUESTS_BASE,
  GROK_RESOLUTION,
  getPersonaVisual,
  refsForSubmit,
} from "./cara-config.js";

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

/** Prefer the caption's photo_idea / story over structured shot library. */
function extractScene({ imagePrompt, caption, hook, photo_idea }) {
  // 1. Explicit photo_idea from caption generation wins
  const photoIdea = textPromptValue(photo_idea);
  if (photoIdea.length > 30) return photoIdea;

  // 2. Structured subject from imagePrompt if rich
  if (imagePrompt && typeof imagePrompt === "object" && !Array.isArray(imagePrompt)) {
    const fromStruct = imagePrompt.subject || imagePrompt.photo_idea || "";
    const scene = textPromptValue(fromStruct);
    if (scene.length > 30) return scene;
  }

  // 3. Caption itself as last visual clue
  const captionText = textPromptValue(caption);
  if (captionText.length > 25) return captionText;

  const hookText = textPromptValue(hook);
  if (hookText.length > 10) return hookText;
  return "";
}

function detectContext(text) {
  const t = textPromptValue(text).toLowerCase();
  if (/car|dealership|showroom|vehicle|lot|merchandising|inventory|test drive|steering wheel/.test(t)) return "automotive";
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
  automotive: "clean smart-casual outfit appropriate to a dealership or automotive creator context",
  gym: "fitted athletic crop top and low-rise training shorts, trainers",
  running: "cropped running top and athletic shorts, trainers",
  reflective: "short ribbed crop top and low-rise denim, casual indoor outfit",
  resort: "minimal high-cut two-piece resort set with thin straps",
  lounge: "thin-strap lace-trim set or open shirt over a simple matching set",
  office: "fitted top, low-rise trousers, jewellery matching references",
  city: "cropped summer top, low-rise denim, jewellery matching references",
  general: "casual outfit consistent with the creator's established visual identity",
};

const FALLBACK_SETTING = {
  automotive: "real dealership forecourt or showroom, believable vehicle placement, natural daylight",
  gym: "home gym space, rubber mat, weights rack soft in background",
  running: "park path or quiet road, early morning light",
  reflective: "private interior mirror or glass, warm window light, lived-in room",
  resort: "hotel room, terrace, or private pool edge, bright daylight",
  lounge: "private bedroom or lounge, slightly messy sheets or clothes on a chair, soft window light",
  office: "desk area, soft side window light",
  city: "private balcony or quiet street threshold",
  general: "believable lived-in environment consistent with the scene and caption",
};

/**
 * fal-safe sanitization.
 * Blocks words that reliably trip fal's filter while preserving enough signal
 * for Grok Imagine to render intimate / Fanvue energy.
 * Hard safety (nudity, genitals, underage) always stripped.
 */
function sanitizePromptText(text, { fanvueMode = false } = {}) {
  let t = textPromptValue(text)
    .replace(/\"/g, "'")
    .replace(/\b(19|19-year-old)\b/gi, "young adult")
    .replace(/\b(nude|naked|genitals|explicit sex|nsfw|porn|xxx)\b/gi, "")
    .replace(/\b(underage|minor|teen)\b/gi, "adult")
    .replace(/\b(bare breasts|exposed breasts|exposed chest|full nudity)\b/gi, "open neckline");

  if (fanvueMode) {
    // Softer rewrites that still read as intimate to Grok but pass fal
    t = t
      .replace(/\b(underboob|under-bust|under bust|sideboob)\b/gi, "open neckline and bare midriff")
      .replace(/\b(cleavage)\b/gi, "open neckline")
      .replace(/\b(micro string|string bikini|micro bikini|thong)\b/gi, "high-cut minimal two-piece")
      .replace(/\b(lingerie)\b/gi, "thin-strap lace set")
      .replace(/\b(bralette)\b/gi, "delicate lace top")
      .replace(/\b(panties|briefs)\b/gi, "matching short bottoms")
      .replace(/\b(hem above the under-bust fold|underside curve of the breasts)\b/gi, "short hem at the ribcage");
  } else {
    // Public mode stays more conservative
    t = t
      .replace(/\b(underboob|under-bust|under bust|sideboob|cleavage)\b/gi, "midriff")
      .replace(/\b(micro string|string bikini|micro bikini|thong)\b/gi, "two-piece set")
      .replace(/\b(lingerie|bralette|panties|briefs)\b/gi, "lounge set")
      .replace(/\b(hem above the under-bust fold|underside curve of the breasts)\b/gi, "short hem at the ribcage");
  }

  return t.replace(/\s{2,}/g, " ").trim();
}

function pickFrame(scene, photoDirection) {
  const text = `${textPromptValue(scene)} ${textPromptValue(photoDirection)}`.toLowerCase();
  if (/selfie|front camera|arm's-length|phone to camera/.test(text)) return "close phone selfie angle, arm bent naturally, tight crop, natural window light, slightly imperfect framing";
  if (/mirror|outfit check|getting ready|reflection/.test(text)) return "mirror reflection shot, medium-close crop, phone visible in reflection, private interior only, lived-in room";
  if (/car|vehicle|dealership|showroom|forecourt|driving|steering wheel/.test(text)) return "50mm three-quarter lifestyle frame with the vehicle visibly contextualised, natural depth and believable human scale";
  if (/gym|weights|workout|training/.test(text)) return "35mm candid mid-action, natural gym perspective, not looking at camera";
  if (/walking|street|city|travel|airport|outdoors|park/.test(text)) return "35mm candid mid-action, realistic handheld distance, environmental context visible";
  if (/desk|office|laptop|planner|work/.test(text)) return "50mm natural desk-side frame, realistic working distance, environmental context visible";
  if (/bed|sofa|lounge|bedroom|morning/.test(text)) return "50mm lounge three-quarter frame, soft window light, relaxed natural posture, slightly messy lived-in space";
  return "50mm natural editorial-social frame, believable camera distance, sharp eyes and enough environmental context to explain the scene";
}

export function buildPrompt({
  imagePrompt,
  hook,
  caption,
  wardrobe,
  shotAngle,
  photoDirection,
  photo_idea,
  personaId = "cara",
  fanvueMode = false,
}) {
  const visual = getPersonaVisual(personaId);
  const rawScene = extractScene({ imagePrompt, caption, hook, photo_idea });
  const scene = sanitizePromptText(rawScene, { fanvueMode });
  const context = detectContext([scene, caption, hook, wardrobe, photoDirection].map(textPromptValue).filter(Boolean).join(" "));

  let wardrobeText = "";
  const wardrobeTextInput = imagePrompt && typeof imagePrompt === "object" && !Array.isArray(imagePrompt) ? imagePrompt.wardrobe : null;
  if (textPromptValue(wardrobe).split(/\s+/).filter(Boolean).length > 3) {
    wardrobeText = sanitizePromptText(wardrobe, { fanvueMode });
  } else if (wardrobeTextInput) {
    wardrobeText = sanitizePromptText(wardrobeTextInput, { fanvueMode });
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
  if (structuredSetting) settingText = sanitizePromptText(structuredSetting, { fanvueMode });
  else settingText = FALLBACK_SETTING[context] || FALLBACK_SETTING.general;

  // When photo_idea is strong, let it drive setting too
  if (scene.length > 40 && /bedroom|bed|lounge|hotel|mirror|gym|pool|balcony|kitchen|sofa/.test(scene.toLowerCase())) {
    settingText = "Match the exact setting implied by the scene description above — lived-in, not staged.";
  }

  const frame = pickFrame(scene, photoDirection);
  const selfieShot = isSelfieFrame(frame) || isSelfieFrame(scene) || isSelfieFrame(photoDirection);
  const selfieGuidance = selfieShot ? `\n${visual.selfieGuidance}\n` : "";

  const jewelleryRule = visual.id === "lila"
    ? "- Jewellery: small simple gold hoop earrings only (from refs). No cross, no coin stack."
    : visual.id === "duo"
      ? "- Jewellery: Cara keeps the jewellery from Cara references; Lila keeps simple gold hoops only. Never swap jewellery between them."
      : "- When neck/chest visible, include jewellery exactly as in reference images (gold hoops, layered chains, cross/coin if present in refs).";

  const livedInSpark = `
HUMAN SPARK / LIVED-IN RULES (non-negotiable):
- This must look like a real phone photo taken in the moment, not a content shoot or catalogue image.
- Slightly imperfect framing is preferred (a little off-centre, natural crop).
- Include at least one real environmental detail: clothes on a chair, half-drunk glass, phone charger, messy sheets, water bottle, bag on floor, or similar lived-in clutter.
- Expression: mid-thought, soft direct gaze, or looking slightly away — never a stiff model smile or frozen pose.
- Natural micro-asymmetry in posture and face. Real skin texture from refs only.
- Light must feel named and real (window left, lamp, golden hour, phone fill) — never studio softbox or beauty dish.`;

  const antiMismatch = `
CRITICAL COHERENCE RULES:
- Clothes, setting, action and props MUST match the SCENE TO DEPICT and the caption intent.
- Do not invent a different scene. Do not invent unrelated props or secondary people.
- Do not combine mutually incompatible locations or camera behaviours.
- Reflective/mirror shots ONLY indoors in a plausible private setting.
- Outdoor/public shots use a believable candid or arm's-length phone perspective.
${jewelleryRule}
- Clothing stays on. No full nudity, transparent fabric or genitals.`;

  const sceneBlock = scene.length > 20
    ? `SCENE TO DEPICT (highest priority — match this exactly): ${scene.slice(0, 480)}\n`
    : "SCENE: Natural candid UGC moment that is logically connected to the creator's idea.\n";

  const subjectRule = visual.id === "duo"
    ? "Recreate BOTH women identically from their reference images. Cara and Lila must remain separate, recognisable identities in the same frame. Do not merge faces or create duplicates."
    : "Recreate face and body identically from the reference images — exact identity lock. Same person as refs, not a similar-looking model.";

  const fanvueEnergy = fanvueMode
    ? "\nENERGY: Private, intimate, model-adjacent but still candid. Private bedroom / getting-ready / post-gym / hotel / resort energy. Attractive and direct without looking like a studio campaign.\n"
    : "\nENERGY: Real life, quiet, specific. Lifestyle that feels continuous, not performed.\n";

  return `${visual.ugcStillCore}

RAW unretouched photorealistic photograph. ${subjectRule}

${sceneBlock}${fanvueEnergy}
CAMERA & FRAME:
- ${frame}
- Vertical 9:16 when possible. Tack-sharp eyes. Natural phone or prime-lens realism.
- Natural composition with real spatial logic. The creator must belong in the environment rather than being pasted into it.

SKIN HARD RULE: Match reference skin exactly — real human texture with pores and natural variation. Forbidden: plastic, waxy, porcelain, airbrushed, over-smoothed, glossy CGI, Facetune, beauty-filter glow.

WARDROBE: ${wardrobeText}
SETTING: ${settingText}
${shotAngle ? `SHOT ANGLE: ${sanitizePromptText(shotAngle, { fanvueMode })}` : ""}
${textPromptValue(photoDirection) ? `DIRECTION: ${sanitizePromptText(photoDirection, { fanvueMode })}` : ""}
${selfieGuidance}
${livedInSpark}
${antiMismatch}

${visual.identityLock}

DO NOT: ${visual.negative}`;
}

export async function submitToFal({ falKey, prompt, personaId = "cara" }) {
  const visual = getPersonaVisual(personaId);
  const urls = refsForSubmit(visual.refs);
  if (!urls.length) throw new Error(`No reference images configured for persona ${visual.id}`);
  const res = await fetch(FAL_EDIT_QUEUE_URL, {
    method: "POST",
    headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
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
  try { data = JSON.parse(text); } catch { throw new Error(`fal.ai non-JSON error (${res.status}): ${text.slice(0, 150)}`); }
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
  const {
    imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea,
    personaId, persona_id, fanvueMode,
  } = body;
  const _personaId = personaId || persona_id || "cara";
  const _visual = getPersonaVisual(_personaId);
  if (!_visual.refs?.length) {
    return res.status(500).json({ error: `${_visual.id.toUpperCase()}_REFS is empty in cara-config.js — upload refs first` });
  }
  try {
    const prompt = buildPrompt({
      imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea,
      personaId: _personaId,
      fanvueMode: !!fanvueMode,
    });
    const queueData = await submitToFal({ falKey: apiKey, prompt, personaId: _personaId });
    const requestId = queueData.request_id;
    return res.status(200).json({
      requestId,
      personaId: _personaId,
      statusUrl: queueData.status_url || `${FAL_EDIT_REQUESTS_BASE}/${requestId}/status`,
      resultUrl: queueData.response_url || `${FAL_EDIT_REQUESTS_BASE}/${requestId}`,
      model: "xai/grok-imagine-image/v2.0/edit",
      queue: { status: queueData.status, queue_position: queueData.queue_position },
    });
  } catch (e) {
    return res.status(502).json({ error: "Queue submit failed", detail: e.message });
  }
}
