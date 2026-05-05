// api/generate-image.js
// Two-stage pipeline:
//   Stage 1 — fal-ai/flux-pro/v1.1-ultra  → high-quality base image from structured prompt
//   Stage 2 — fal-ai/nano-banana-2/edit   → face-lock using Cara reference images
//
// Cara reference images (permanent fal.ai storage):
const CARA_REFS = [
  "https://v3b.fal.media/files/b/0a990cbf/7tn1zr6Tzvw4LP6NfoQJ5_Cara_Whitmore_10.png",  // face close-up
  "https://v3b.fal.media/files/b/0a990cbf/GZpvO79sLCKUEXmb5OjDZ_Cara_Whitmore_14.png",  // poolside
  "https://v3b.fal.media/files/b/0a990cc0/hNz9MH3iKPSpX1SCu7JnC_Cara_Whitmore_16.png",  // outdoor
  "https://v3b.fal.media/files/b/0a990cc0/aC52Bfy17019kTbWG4L_L_Cara_Whitmore_18.png",  // natural light
  "https://v3b.fal.media/files/b/0a990cc0/ne3QfVCW_NQnJZFjSnsST_Cara_Whitmore_23.jpeg", // wet hair
];

const FAL_KEY = () => process.env.FAL_API_KEY;
const FLUX_URL = "https://fal.run/fal-ai/flux-pro/v1.1-ultra";
const NB2_URL  = "https://fal.run/fal-ai/nano-banana-2/edit";

// ── Stage 1 prompt constants ──────────────────────────────────────────────────
const FACE_LOCK =
  "young woman, bright green eyes with dark limbal ring, very dark brown near-black long wavy hair, " +
  "strong thick dark natural brows, defined angular jawline, medium-light warm olive skin, " +
  "full naturally pigmented soft pink-rose lips slightly parted, " +
  "small dark mole on left side of neck below jawline, " +
  "small gold hoop earrings, layered delicate gold chains";

const SKIN =
  "photorealistic skin texture, visible pores, subsurface scattering, fine vellus hair, " +
  "natural skin unevenness, real film grain, zero retouching, zero beauty filter";

const OPTICS =
  "Sony A7R V 85mm prime f/1.8 1/200s ISO100, tack-sharp eyes, " +
  "shallow depth of field, creamy bokeh background, " +
  "realistic optical vignette, subtle chromatic aberration at frame edges, " +
  "Teal and Orange colour grade 5600K, 8K resolution, raw photography aesthetic";

const BUILD =
  "slim athletic toned build, flat stomach, long limbs, natural skin folds at waist";

const EXPRESSION =
  "reserved slightly cool expression, direct or averted gaze, no wide smile, comfortable being looked at";

const NEGATIVE =
  // Identity drift
  "thin eyebrows, light eyebrows, pencil brows, wrong face, face swap, grey eyes, brown eyes, " +
  "hazel eyes, blue eyes, light hair, blonde hair, red hair, straight hair, curly hair, " +
  "soft jaw, round jaw, chubby face, different person, " +
  // Skin
  "plastic skin, waxy, airbrushed, poreless, beauty filter, skin smoothing, oversaturated, " +
  "blown-out highlights, crushed shadows, overexposed, underexposed, " +
  // Anatomy
  "bad anatomy, deformed, extra limbs, missing limbs, fused fingers, mutated hands, " +
  "bad proportions, distorted body, " +
  // Optics
  "lens distortion, fisheye, barrel distortion, motion blur, out of focus, double exposure, " +
  "jpeg artefacts, pixelated, low resolution, " +
  // Style
  "CGI, 3D render, cartoon, anime, illustration, painting, digital art, " +
  "watermark, logo, text, signature, " +
  // Content
  "nudity, explicit, nsfw, underage, genitalia";

// ── Lighting by environment ───────────────────────────────────────────────────
function getLighting(env) {
  const e = (env || "").toLowerCase();
  if (e.includes("bathroom") || e.includes("shower") || e.includes("mirror"))
    return "cool overhead vanity lighting, slightly blue-white, soft specular highlights on damp skin, steam";
  if (e.includes("bedroom") || e.includes("bed") || e.includes("flat") || e.includes("indoor"))
    return "warm late-afternoon golden side window light, 5600K, soft directional shadows, intimate";
  if (e.includes("evening") || e.includes("golden hour") || e.includes("sunset"))
    return "warm golden-hour side light, long soft amber shadows, skin glows";
  if (e.includes("pool") || e.includes("beach") || e.includes("outdoor") || e.includes("travel") || e.includes("rooftop") || e.includes("sun"))
    return "bright Mediterranean natural daylight, slightly overhead, warm sun-kissed skin glow, moisture sheen";
  return "three-point studio lighting, large softbox overhead, natural side fill, subtle rim light";
}

function getHair(env) {
  const e = (env || "").toLowerCase();
  if (e.includes("pool") || e.includes("beach") || e.includes("shower") || e.includes("bathroom") || e.includes("wet"))
    return "hair wet and near-black, wet-strand texture clinging to face and shoulders";
  return "very dark brown wavy hair worn down, natural air-dried wave";
}

function getWardrobe(env, wardrobe) {
  if (wardrobe) return wardrobe;
  const e = (env || "").toLowerCase();
  if (e.includes("pool") || e.includes("beach"))
    return "small triangle bikini with thin tie straps, natural colour (red or black or white or sand), layered gold chains visible";
  if (e.includes("bathroom") || e.includes("shower"))
    return "white or grey towel, minimal coverage";
  if (e.includes("bedroom") || e.includes("bed"))
    return "casual minimal clothing, relaxed, natural";
  return "casual stylish clothing";
}

// ── Stage 1 prompt ────────────────────────────────────────────────────────────
function buildStage1Prompt(imagePrompt, personaDescriptors) {
  let scene, env, wardrobe, extraFields = "";

  if (!imagePrompt || typeof imagePrompt === "string") {
    scene = imagePrompt || personaDescriptors || "natural candid portrait, warm indoor light";
    env = scene;
    wardrobe = null;
  } else {
    const {
      shot_angle = "", environment = "", lighting = "", wardrobe: wd = "",
      mood = "", style_ref = "", composition = "", pose = "", expression = "",
      accessories = "", fabric_detail = "", core_subject, wardrobe_design,
      technical_photography, environment_and_lighting,
    } = imagePrompt;

    // Support the structured JSON format the user showed (scene_specification)
    if (core_subject || wardrobe_design || environment_and_lighting) {
      const physique = core_subject?.physique_profile || {};
      const facial = core_subject?.facial_and_glam || {};
      const wd2 = wardrobe_design || {};
      const env2 = environment_and_lighting || {};
      const tech = technical_photography || {};

      scene = [
        physique.pose && `pose: ${physique.pose}`,
        facial.expression && `expression: ${facial.expression}`,
        wd2.attire && `outfit: ${wd2.attire}`,
        wd2.design_details,
        env2.setting && `setting: ${env2.setting}`,
        env2.lighting && `lighting: ${env2.lighting}`,
        env2.atmosphere && `atmosphere: ${env2.atmosphere}`,
        tech.camera_angle && `camera: ${tech.camera_angle}`,
        tech.style,
        style_ref,
      ].filter(Boolean).join(", ");
      env = env2.setting || "";
      wardrobe = wd2.attire || null;
    } else {
      env = environment;
      wardrobe = wd || null;
      scene = [
        shot_angle   && `shot: ${shot_angle}`,
        env          && `setting: ${env}`,
        pose         && `pose: ${pose}`,
        expression   && `expression: ${expression}`,
        mood         && `mood: ${mood}`,
        composition  && `composition: ${composition}`,
        style_ref,
      ].filter(Boolean).join(", ");
      extraFields = [
        lighting     && `lighting: ${lighting}`,
        fabric_detail && `fabric: ${fabric_detail}`,
        accessories  && `accessories: ${accessories}`,
      ].filter(Boolean).join(", ");
    }
  }

  return [
    FACE_LOCK,
    BUILD,
    getHair(env),
    EXPRESSION,
    scene,
    extraFields,
    `outfit: ${getWardrobe(env, wardrobe)}`,
    `lighting: ${getLighting(env)}`,
    OPTICS,
    SKIN,
    "ultra-photorealistic photograph, Vogue editorial quality, natural candid style",
  ].filter(Boolean).join(", ");
}

// ── Stage 2 nano-banana-2 instruction ────────────────────────────────────────
function buildStage2Prompt(stage1Prompt) {
  return (
    "You are given reference images (images 1–5) showing the EXACT face of a specific real woman: " +
    "bright green eyes, very dark brown near-black wavy hair, strong thick dark brows, defined angular jaw, " +
    "small dark mole on left side of neck, small gold hoop earrings. " +
    "The last image (image 6) is a generated scene. " +
    "Your task: transplant the EXACT face from the reference images onto the person in image 6. " +
    "The face must be pixel-perfect — zero eye colour drift (must stay bright green), " +
    "zero hair texture drift, zero jawline softening, mole must be present. " +
    "Preserve EVERYTHING else in image 6 exactly: the body, pose, outfit, background, lighting, composition. " +
    "Only the face changes. Output a single final image at the same aspect ratio and resolution. " +
    "Zero AI artefacts. Photorealistic. PIXEL PRIORITY MODE."
  );
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = FAL_KEY();
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
  const effectivePrompt = imagePrompt || photoDirection || null;

  // ── Stage 1: FLUX Pro Ultra ───────────────────────────────────────────────
  const stage1Prompt = buildStage1Prompt(effectivePrompt, personaDescriptors);
  console.log("Stage 1 prompt:", stage1Prompt.slice(0, 200));

  let fluxRes, fluxData;
  try {
    fluxRes = await fetch(FLUX_URL, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: stage1Prompt,
        negative_prompt: NEGATIVE,
        aspect_ratio: "9:16",
        num_images: 1,
        enable_safety_checker: false,
        seed: seed || undefined,
        output_format: "jpeg",
        loras: [],                  // LoRA not reliable on hosted endpoint — face lock done via nano-banana-2
      }),
    });
    fluxData = await fluxRes.json();
  } catch (e) {
    return res.status(502).json({ error: "Network error reaching fal.ai (Stage 1)", detail: e.message });
  }

  if (!fluxRes.ok) {
    console.error("Stage 1 error:", fluxRes.status, JSON.stringify(fluxData));
    return res.status(fluxRes.status).json({ error: "Stage 1 (FLUX Ultra) failed", detail: fluxData });
  }

  const baseImageUrl = fluxData?.images?.[0]?.url;
  if (!baseImageUrl) {
    return res.status(502).json({ error: "No image from Stage 1", raw: fluxData });
  }

  console.log("Stage 1 complete:", baseImageUrl);

  // ── Stage 2: nano-banana-2 face lock ─────────────────────────────────────
  // Pass all 5 Cara reference images + the Stage 1 output
  const stage2ImageUrls = [...CARA_REFS, baseImageUrl];
  const stage2Prompt = buildStage2Prompt(stage1Prompt);

  let nb2Res, nb2Data;
  try {
    nb2Res = await fetch(NB2_URL, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: stage2Prompt,
        image_urls: stage2ImageUrls,
        aspect_ratio: "9:16",
        resolution: "2K",
        output_format: "jpeg",
        safety_tolerance: "5",
        num_images: 1,
      }),
    });
    nb2Data = await nb2Res.json();
  } catch (e) {
    // Stage 2 failure — return Stage 1 result with a warning rather than failing entirely
    console.error("Stage 2 network error:", e.message);
    return res.status(200).json({
      success: true,
      imageUrl: baseImageUrl,
      seed: fluxData?.seed,
      stage1Only: true,
      warning: "Stage 2 face-lock failed — returning Stage 1 base image",
    });
  }

  if (!nb2Res.ok) {
    console.error("Stage 2 error:", nb2Res.status, JSON.stringify(nb2Data));
    // Graceful fallback to Stage 1
    return res.status(200).json({
      success: true,
      imageUrl: baseImageUrl,
      seed: fluxData?.seed,
      stage1Only: true,
      warning: `Stage 2 face-lock rejected (${nb2Res.status}) — returning Stage 1 base`,
      detail: nb2Data,
    });
  }

  const finalImageUrl = nb2Data?.images?.[0]?.url;
  if (!finalImageUrl) {
    return res.status(200).json({
      success: true,
      imageUrl: baseImageUrl,
      seed: fluxData?.seed,
      stage1Only: true,
      warning: "Stage 2 returned no image — returning Stage 1 base",
      raw: nb2Data,
    });
  }

  console.log("Stage 2 complete:", finalImageUrl);

  return res.status(200).json({
    success: true,
    imageUrl: finalImageUrl,
    stage1Url: baseImageUrl,
    seed: fluxData?.seed,
    prompt: stage1Prompt,
  });
}
