// api/generate-image.js
// Stage 1: fal-ai/flux-lora  — Cara LoRA, face consistency (~$0.025)
// Stage 2: fal-ai/nano-banana-pro/edit — lewd/suggestive enhancement (~$0.15)
// Enhanced mode runs both stages. Standard mode runs Stage 1 only.

const FAL_FLUX_URL        = "https://fal.run/fal-ai/flux-lora";
const FAL_NANO_BANANA_URL = "https://fal.run/fal-ai/nano-banana-pro/edit";

const CARA_LORA_URL = process.env.CARA_LORA_URL || "";

// ── Core identity lock — injected into every generation ──────────────────────
const CARA_TRIGGER = "CARAWHITMORE";
const CARA_IDENTITY = "bright green eyes, very dark brown wavy hair, thick dark eyebrows, olive skin, slim athletic build";

// ── Camera & sensor simulation ────────────────────────────────────────────────
const CAMERA_SPEC = "Sony A7R V 85mm f/1.8, shallow depth of field, sharp focus on eyes";

// ── Skin & biology realism ────────────────────────────────────────────────────
const SKIN_REALISM = "photorealistic skin texture, visible pores, natural skin, no airbrushing, real film grain";

// ── Quality and style globals ─────────────────────────────────────────────────
const QUALITY_POSITIVE = "ultra-photorealistic photograph, raw photography, natural candid pose, Vogue editorial";

// ── Negative prompt ───────────────────────────────────────────────────────────
const FLUX_NEGATIVE_PROMPT = "plastic skin, waxy skin, airbrushed, smooth skin, beauty filter, CGI, cartoon, anime, 3D render, bad anatomy, extra limbs, deformed hands, blurry, watermark, text, nudity, explicit, nsfw, underage";

// ── Lighting rigs ─────────────────────────────────────────────────────────────
function getLightingRig(environment) {
  const env = (environment || "").toLowerCase();
  if (env.includes("bathroom") || env.includes("shower") || env.includes("mirror"))
    return "cool vanity lighting, soft specular highlights";
  if (env.includes("bedroom") || env.includes("bed") || env.includes("indoor"))
    return "warm golden side window light, soft shadows, intimate";
  if (env.includes("pool") || env.includes("beach") || env.includes("outdoor") || env.includes("sun"))
    return "bright Mediterranean daylight, warm sun-kissed skin, strong contrast";
  return "soft natural three-point lighting, gentle shadows";
}

// ── Main prompt builder ───────────────────────────────────────────────────────
function buildFluxPrompt(imagePrompt, personaDescriptors) {
  // Simple string fallback (legacy or minimal prompts)
  if (!imagePrompt || typeof imagePrompt === "string") {
    const scene = imagePrompt || personaDescriptors || "natural candid portrait, warm indoor setting";
    return [
      CARA_TRIGGER,
      CARA_IDENTITY,
      scene,
      getLightingRig(scene),
      CAMERA_SPEC,
      SKIN_REALISM,
      QUALITY_POSITIVE,
    ].filter(Boolean).join(", ");
  }

  // Structured object prompt
  const {
    shot_angle = "",
    environment = "",
    lighting = "",
    wardrobe = "",
    mood = "",
    style_ref = "",
    composition = "",
    pose = "",
    expression = "",
    accessories = "",
    fabric_detail = "",
  } = imagePrompt;

  const lightingFinal = lighting || getLightingRig(environment);

  return [
    CARA_TRIGGER,
    CARA_IDENTITY,
    shot_angle && `shot: ${shot_angle}`,
    environment && `setting: ${environment}`,
    lightingFinal && `lighting: ${lightingFinal}`,
    wardrobe && `outfit: ${wardrobe}`,
    fabric_detail && `fabric detail: ${fabric_detail}`,
    pose && `pose: ${pose}`,
    expression && `expression: ${expression}`,
    accessories && `accessories: ${accessories}`,
    mood && `mood: ${mood}`,
    composition && `composition: ${composition}`,
    style_ref,
    CAMERA_SPEC,
    SKIN_REALISM,
    QUALITY_POSITIVE,
  ].filter(Boolean).join(", ");
}

// ── Nano Banana enhancement prompt ───────────────────────────────────────────
function buildNanoBananaPrompt(photoDirection) {
  const base = photoDirection
    ? `Edit this image. Context: ${photoDirection}.`
    : "Edit this image.";

  const wardrobeOptions = [
    "Replace her clothing with a tiny triangle string bikini top in white or nude with matching minimal bikini bottoms. Thin fabric barely covering. Fabric drapes and interacts with the body with physically accurate folds and shadows.",
    "Replace her clothing with a sheer black lace bralette and high-cut lace briefs. Delicate thin fabric clinging to the skin with realistic fabric tension and stitching detail.",
    "Replace her clothing with a tiny strappy spaghetti-strap crop top and matching minimal shorts in beige or white. Barely-there fabric with tight realistic fit and natural fabric creases.",
    "Replace her clothing with a small bandeau bikini top in a soft neutral colour and matching low-rise bikini bottoms. Minimal coverage with realistic fabric drape and natural fit.",
    "Replace her clothing with a fitted white lace bra and matching white lace underwear. Delicate scalloped lace edges, detailed floral embroidery, fabric clinging naturally.",
  ];
  const wardrobe = wardrobeOptions[Math.floor(Math.random() * wardrobeOptions.length)];

  return `${base} ${wardrobe} Do not change her face, hair, pose, skin, lighting, background, or any other element — only the clothing. Result must look like a raw unedited photograph on a Sony A7R V 85mm f/1.8. Pore-level skin texture preserved exactly — visible pores, fine vellus hair, natural redness, fine lines, subsurface scattering intact. Real film grain. Natural skin folds at waist. Fabric must have correct drape, tension, and shadows. Any plastic, waxy, airbrushed, or AI-rendered appearance is a failure.`;
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

  const { imagePrompt, personaDescriptors, seed, enhancedMode, photoDirection } = body;

  // If no imagePrompt, build a minimal fallback from photoDirection so old posts still work
  const effectivePrompt = imagePrompt || (photoDirection ? { subject: photoDirection } : "natural candid portrait, outdoor setting, warm light");

  // ── Stage 1: FLUX LoRA base generation ───────────────────────────────────
  const prompt = buildFluxPrompt(effectivePrompt, personaDescriptors);

  let fluxRes, fluxData;
  try {
    fluxRes = await fetch(FAL_FLUX_URL, {
      method: "POST",
      headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        negative_prompt: FLUX_NEGATIVE_PROMPT,
        image_size: "portrait_16_9",
        num_inference_steps: 35,
        guidance_scale: 4.5,
        num_images: 1,
        enable_safety_checker: true,
        seed: seed || undefined,
        output_format: "jpeg",
        loras: CARA_LORA_URL ? [{ path: CARA_LORA_URL, scale: 0.85 }] : [],
      }),
    });
    fluxData = await fluxRes.json();
  } catch (e) {
    return res.status(502).json({ error: "Network error reaching fal.ai (FLUX)", detail: e.message });
  }

  if (!fluxRes.ok) {
    console.error("FLUX error:", fluxRes.status, JSON.stringify(fluxData));
    return res.status(fluxRes.status).json({ error: "fal.ai FLUX rejected request", detail: fluxData });
  }

  if (fluxData?.has_nsfw_concepts?.[0] === true) {
    return res.status(200).json({ blocked: true, reason: "Safety checker flagged base image." });
  }

  const baseImageUrl = fluxData?.images?.[0]?.url;
  if (!baseImageUrl) {
    return res.status(502).json({ error: "No image URL from FLUX", raw: fluxData });
  }

  // Standard mode — return FLUX result directly
  if (!enhancedMode) {
    return res.status(200).json({ success: true, imageUrl: baseImageUrl, seed: fluxData?.seed, prompt });
  }

  // ── Stage 2: Nano Banana Pro enhancement ─────────────────────────────────
  const nbPrompt = buildNanoBananaPrompt(photoDirection);

  let nbRes, nbData;
  try {
    nbRes = await fetch(FAL_NANO_BANANA_URL, {
      method: "POST",
      headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: nbPrompt,
        image_urls: [baseImageUrl],
        aspect_ratio: "auto",
        resolution: "1K",
      }),
    });
    nbData = await nbRes.json();
  } catch (e) {
    // If Nano Banana fails, fall back to FLUX result
    console.error("Nano Banana error (falling back):", e.message);
    return res.status(200).json({ success: true, imageUrl: baseImageUrl, seed: fluxData?.seed, prompt, fallback: true });
  }

  if (!nbRes.ok) {
    console.error("Nano Banana error:", nbRes.status, JSON.stringify(nbData));
    // Fall back to FLUX result rather than failing entirely
    return res.status(200).json({ success: true, imageUrl: baseImageUrl, seed: fluxData?.seed, prompt, fallback: true });
  }

  const enhancedUrl = nbData?.images?.[0]?.url;
  if (!enhancedUrl) {
    return res.status(200).json({ success: true, imageUrl: baseImageUrl, seed: fluxData?.seed, prompt, fallback: true });
  }

  return res.status(200).json({
    success: true,
    imageUrl: enhancedUrl,
    baseImageUrl,
    seed: fluxData?.seed,
    prompt,
    enhanced: true,
  });
}
