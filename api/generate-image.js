// api/generate-image.js
// fal-ai/flux-pro/v1.1-ultra — best single-stage quality with LoRA (~$0.06/image)

const FAL_FLUX_URL = "https://fal.run/fal-ai/flux-pro/v1.1-ultra";

const CARA_LORA_URL = process.env.CARA_LORA_URL || "";

// ── Identity ──────────────────────────────────────────────────────────────────
const CARA_TRIGGER  = "CARAWHITMORE";
const CARA_IDENTITY = "bright green eyes, very dark brown wavy hair, thick dark eyebrows, olive skin, slim athletic build";

// ── Camera ────────────────────────────────────────────────────────────────────
const CAMERA_SPEC = "Sony A7R V 85mm f/1.8, shallow depth of field, sharp eyes";

// ── Realism ───────────────────────────────────────────────────────────────────
const SKIN_REALISM = "photorealistic skin, visible pores, no airbrushing, real film grain";

// ── Quality ───────────────────────────────────────────────────────────────────
const QUALITY = "ultra-photorealistic photograph, Vogue editorial, natural candid";

// ── Negative ─────────────────────────────────────────────────────────────────
const NEGATIVE = "plastic skin, waxy, airbrushed, CGI, cartoon, anime, bad anatomy, blurry, watermark, nudity, explicit, nsfw, underage";

// ── Lighting ─────────────────────────────────────────────────────────────────
function getLighting(environment) {
  const e = (environment || "").toLowerCase();
  if (e.includes("bathroom") || e.includes("shower") || e.includes("mirror"))
    return "cool vanity lighting, soft specular highlights";
  if (e.includes("bedroom") || e.includes("bed") || e.includes("indoor"))
    return "warm golden side window light, intimate";
  if (e.includes("pool") || e.includes("beach") || e.includes("outdoor") || e.includes("sun"))
    return "bright Mediterranean daylight, warm sun-kissed skin";
  return "soft natural three-point lighting";
}

// ── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(imagePrompt, personaDescriptors) {
  if (!imagePrompt || typeof imagePrompt === "string") {
    const scene = imagePrompt || personaDescriptors || "natural candid portrait, warm indoor setting";
    return [CARA_TRIGGER, CARA_IDENTITY, scene, getLighting(scene), CAMERA_SPEC, SKIN_REALISM, QUALITY].filter(Boolean).join(", ");
  }

  const { shot_angle = "", environment = "", lighting = "", wardrobe = "", mood = "", style_ref = "", composition = "", pose = "", expression = "", accessories = "", fabric_detail = "" } = imagePrompt;

  return [
    CARA_TRIGGER,
    CARA_IDENTITY,
    shot_angle   && `shot: ${shot_angle}`,
    environment  && `setting: ${environment}`,
    (lighting || getLighting(environment)) && `lighting: ${lighting || getLighting(environment)}`,
    wardrobe     && `outfit: ${wardrobe}`,
    fabric_detail && `fabric: ${fabric_detail}`,
    pose         && `pose: ${pose}`,
    expression   && `expression: ${expression}`,
    accessories  && `accessories: ${accessories}`,
    mood         && `mood: ${mood}`,
    composition  && `composition: ${composition}`,
    style_ref,
    CAMERA_SPEC,
    SKIN_REALISM,
    QUALITY,
  ].filter(Boolean).join(", ");
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

  const { imagePrompt, personaDescriptors, seed, photoDirection } = body;
  const effectivePrompt = imagePrompt || (photoDirection ? { subject: photoDirection } : "natural candid portrait, outdoor setting, warm light");
  const prompt = buildPrompt(effectivePrompt, personaDescriptors);

  // ── Stage 1: FLUX Pro Ultra ───────────────────────────────────────────────
  let fluxRes, fluxData;
  try {
    fluxRes = await fetch(FAL_FLUX_URL, {
      method: "POST",
      headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        negative_prompt: NEGATIVE,
        aspect_ratio: "9:16",         // portrait — flux-pro-ultra uses aspect_ratio not image_size
        num_images: 1,
        enable_safety_checker: true,
        seed: seed || undefined,
        output_format: "jpeg",
        loras: CARA_LORA_URL ? [{ path: CARA_LORA_URL, scale: 0.85 }] : [],
      }),
    });
    fluxData = await fluxRes.json();
  } catch (e) {
    return res.status(502).json({ error: "Network error reaching fal.ai (FLUX Pro Ultra)", detail: e.message });
  }

  if (!fluxRes.ok) {
    console.error("FLUX Pro Ultra error:", fluxRes.status, JSON.stringify(fluxData));
    return res.status(fluxRes.status).json({ error: "fal.ai FLUX Pro Ultra rejected request", detail: fluxData });
  }

  if (fluxData?.has_nsfw_concepts?.[0] === true) {
    return res.status(200).json({ blocked: true, reason: "Safety checker flagged image." });
  }

  const baseImageUrl = fluxData?.images?.[0]?.url;
  if (!baseImageUrl) {
    return res.status(502).json({ error: "No image URL from FLUX Pro Ultra", raw: fluxData });
  }

  return res.status(200).json({ success: true, imageUrl: baseImageUrl, seed: fluxData?.seed, prompt });
}
