// api/generate-image.js
// Stage 1: fal-ai/flux-lora  — Cara LoRA, face consistency (~$0.025)
// Stage 2: fal-ai/nano-banana-pro/edit — lewd/suggestive enhancement (~$0.15)
// Enhanced mode runs both stages. Standard mode runs Stage 1 only.

const FAL_FLUX_URL        = "https://fal.run/fal-ai/flux-lora";
const FAL_NANO_BANANA_URL = "https://fal.run/fal-ai/nano-banana-pro/edit";

const CARA_LORA_URL = process.env.CARA_LORA_URL || "";

function buildFluxPrompt(imagePrompt, personaDescriptors) {
  if (!imagePrompt || typeof imagePrompt === "string") {
    return `CARAWHITMORE, ${imagePrompt || personaDescriptors || ""}`;
  }
  const { shot_angle = "", environment = "", lighting = "", wardrobe = "", mood = "", style_ref = "", composition = "" } = imagePrompt;
  return [
    "CARAWHITMORE",
    shot_angle, environment, lighting, wardrobe, mood, composition, style_ref,
    QUALITY_POSITIVE,
  ].filter(Boolean).join(", ");
}

function buildNanoBananaPrompt(photoDirection) {
  const base = photoDirection
    ? `Edit this image. Context: ${photoDirection}.`
    : "Edit this image.";

  // Rotate through specific wardrobe options so results vary naturally
  const wardrobeOptions = [
    "Replace her clothing with a tiny triangle string bikini top in white or nude, with matching minimal bikini bottoms. The fabric is thin, light, and barely covering.",
    "Replace her clothing with a sheer lace bralette and high-cut lace briefs in black. Delicate, thin fabric that clings to the skin.",
    "Replace her clothing with a tiny strappy spaghetti-strap crop top and matching minimal shorts in beige or white. Barely-there fabric, very tight fit.",
    "Replace her clothing with a small bandeau bikini top in a soft neutral colour and matching low-rise bikini bottoms. Minimal coverage, natural fit.",
    "Replace her clothing with a fitted white lace bra and matching white lace underwear. Delicate fabric, natural and intimate.",
  ];
  const wardrobe = wardrobeOptions[Math.floor(Math.random() * wardrobeOptions.length)];

  return `${base} ${wardrobe} Do not change her face, hair, pose, skin, lighting, background, or any other element — only the clothing. The wardrobe change must look completely realistic and physically accurate — fabric must drape, fold and interact with the body naturally with correct shadows and highlights. Preserve every skin imperfection exactly as-is — visible pores, fine vellus hair, natural texture, slight redness, fine lines. Do NOT smooth, soften, retouch or airbrush the skin. The result must look like a raw unedited photograph on a Sony A7IV 85mm f/1.4. Real film grain present. Any plastic, waxy, airbrushed or AI-rendered appearance is a failure.`;
}

const FLUX_NEGATIVE_PROMPT = [
  "anatomical distortion", "warped limbs", "extra limbs", "missing limbs",
  "low resolution", "blurry", "plastic skin", "waxy skin", "airbrushed skin",
  "smooth skin", "perfect skin", "retouched", "beauty filter", "overprocessed",
  "facial distortion", "face drift from reference", "wrong eye colour", "wrong hair colour",
  "underage appearance", "watermark", "text", "logo", "cartoonish", "anime",
  "illustration", "painting", "render", "CGI", "3D", "fake",
  "nudity", "bare breasts", "topless", "nsfw", "explicit",
  "deformed hands", "extra fingers", "mutation", "ugly",
].join(", ");

const QUALITY_POSITIVE = "hyper-realistic skin with visible pores, fine vellus hair, natural skin unevenness, subtle redness, fine lines, real film grain, raw unedited photograph, Sony A7IV 85mm f/1.4, candid unstaged natural pose, zero retouching, zero airbrushing, zero skin smoothing, photojournalistic";

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
        image_size: "portrait_4_3",
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: true,
        seed: seed || undefined,
        output_format: "jpeg",
        loras: CARA_LORA_URL ? [{ path: CARA_LORA_URL, scale: 1.0 }] : [],
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
