// api/generate-image.js
// fal-ai/flux-pro/v1.1-ultra — best single-stage quality with LoRA (~$0.06/image)

const FAL_FLUX_URL = "https://fal.run/fal-ai/flux-pro/v1.1-ultra";
const CARA_LORA_URL = process.env.CARA_LORA_URL || "";

// ── Identity — full locked descriptor set from flux.md ────────────────────────
const CARA_TRIGGER = "CARAWHITMORE";

const CARA_FACE =
  "distinctly bright green eyes with dark limbal ring and moist intricate radial iris patterns, " +
  "very dark brown near-black long wavy hair worn down, " +
  "strong thick dark natural brows, " +
  "defined slightly angular jawline, " +
  "medium-light warm olive skin with subtle sun-kissed glow, " +
  "straight refined nose, " +
  "full naturally pigmented soft pink-rose lips slightly parted, " +
  "small dark mole on left side of neck just below jawline, " +
  "small gold hoop earrings, " +
  "layered delicate gold chains 2-3 thin strands";

const CARA_BUILD =
  "slim athletic toned build, flat stomach, long limbs, not model-thin, natural skin folds at waist";

const CARA_EXPRESSION =
  "reserved slightly cool expression, direct or averted gaze, no wide smile, comfortable being looked at not performing";

// ── Skin & biology realism ────────────────────────────────────────────────────
const SKIN_REALISM =
  "photorealistic skin with visible pores and micro-texture, subsurface scattering, " +
  "fine vellus hair on arms and shoulders, natural skin unevenness, " +
  "slight redness at cheeks, fine lines at eye corners and lip edges, " +
  "real film grain, zero retouching, zero beauty filter, zero skin smoothing";

// ── Camera & optics ───────────────────────────────────────────────────────────
const CAMERA_SPEC =
  "shot on Sony A7R V, 85mm prime lens, aperture f/1.8, shutter 1/200s, ISO 100, " +
  "tack-sharp critical focus on eyes and skin, " +
  "shallow depth of field, creamy circular bokeh background, " +
  "high dynamic range — full shadow and highlight detail retained, " +
  "realistic optical vignette, " +
  "extremely subtle chromatic aberration at frame edges only, " +
  "Teal and Orange colour grade, warm skin tones, neutral whites, 5600K colour temperature, " +
  "8K resolution, raw photography aesthetic, no digital processing look";

// ── Quality ───────────────────────────────────────────────────────────────────
const QUALITY = "ultra-photorealistic photograph, Vogue editorial quality, natural candid style";

// ── Negative ─────────────────────────────────────────────────────────────────
const NEGATIVE =
  // Face / identity drift
  "thin eyebrows, light eyebrows, pencil brows, arched brows, different person, wrong face, face swap, " +
  "grey eyes, brown eyes, hazel eyes, blue eyes, " +
  "light hair, blonde hair, red hair, straight hair, curly hair, " +
  "soft jaw, round jaw, chubby face, baby face, " +
  // Skin quality
  "plastic skin, waxy skin, airbrushed skin, poreless skin, beauty filter, skin smoothing, " +
  "oversaturated, blown-out highlights, crushed shadows, overexposed, underexposed, " +
  // Anatomy
  "bad anatomy, deformed, extra limbs, missing limbs, fused fingers, mutated hands, " +
  "bad proportions, distorted body, floating limbs, " +
  // Optics / technical
  "lens distortion, fish-eye, wide-angle distortion, barrel distortion, " +
  "motion blur, out of focus, soft focus, double exposure, chromatic fringe, " +
  "jpeg artefacts, compression artefacts, pixelated, low resolution, " +
  // Style
  "CGI, 3D render, cartoon, anime, illustration, painting, digital art, concept art, " +
  "watermark, logo, text, signature, border, frame, " +
  // Content
  "nudity, explicit, nsfw, underage, topless, genitalia";

// ── Lighting by environment ───────────────────────────────────────────────────
function getLighting(environment) {
  const e = (environment || "").toLowerCase();
  if (e.includes("bathroom") || e.includes("shower") || e.includes("mirror"))
    return "cool overhead vanity lighting, slightly blue-white, soft specular highlights on damp skin";
  if (e.includes("bedroom") || e.includes("bed") || e.includes("indoor") || e.includes("flat"))
    return "warm late-afternoon golden side window light, soft directional shadows, intimate 5600K";
  if (e.includes("pool") || e.includes("beach") || e.includes("outdoor") || e.includes("sun") || e.includes("travel") || e.includes("rooftop"))
    return "bright Mediterranean natural daylight, slightly overhead, warm sun-kissed skin glow, moisture sheen from heat";
  if (e.includes("evening") || e.includes("night") || e.includes("golden hour"))
    return "warm golden-hour side light, long soft shadows, skin glows amber";
  return "three-point studio lighting, large softbox overhead key light, natural side fill, subtle rim light";
}

// ── Hair state by environment ─────────────────────────────────────────────────
function getHairState(environment) {
  const e = (environment || "").toLowerCase();
  if (e.includes("pool") || e.includes("beach") || e.includes("shower") || e.includes("bathroom") || e.includes("wet"))
    return "hair wet and near-black, wet-strand texture, clinging to face and shoulders, signature wet look";
  return "very dark brown wavy hair worn down, slightly air-dried natural wave";
}

// ── Wardrobe floor ────────────────────────────────────────────────────────────
function getWardrobeFloor(environment, wardrobe) {
  if (wardrobe) return wardrobe;
  const e = (environment || "").toLowerCase();
  if (e.includes("pool") || e.includes("beach"))
    return "small triangle bikini with thin tie straps, natural colour (red, black, white or neutral sand), gold chains visible";
  if (e.includes("bathroom") || e.includes("shower"))
    return "white or grey towel or minimal coverage";
  if (e.includes("bedroom") || e.includes("bed"))
    return "casual natural clothing, minimal, relaxed";
  return "casual stylish clothing";
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(imagePrompt, personaDescriptors) {
  // Simple string prompt from older callers
  if (typeof imagePrompt === "string" || !imagePrompt) {
    const scene = imagePrompt || personaDescriptors || "natural candid portrait, warm indoor setting";
    const env = scene;
    return [
      CARA_TRIGGER,
      CARA_FACE,
      CARA_BUILD,
      getHairState(env),
      CARA_EXPRESSION,
      `setting: ${scene}`,
      `lighting: ${getLighting(env)}`,
      `outfit: ${getWardrobeFloor(env, null)}`,
      CAMERA_SPEC,
      SKIN_REALISM,
      QUALITY,
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

  const env = environment;

  return [
    CARA_TRIGGER,
    CARA_FACE,
    CARA_BUILD,
    getHairState(env),
    CARA_EXPRESSION,
    shot_angle    && `shot: ${shot_angle}`,
    env           && `setting: ${env}`,
    `lighting: ${lighting || getLighting(env)}`,
    `outfit: ${getWardrobeFloor(env, wardrobe)}`,
    fabric_detail && `fabric: ${fabric_detail}`,
    pose          && `pose: ${pose}`,
    expression    && `expression override: ${expression}`,
    accessories   && `accessories: ${accessories}`,
    mood          && `mood: ${mood}`,
    composition   && `composition: ${composition}`,
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
  const effectivePrompt = imagePrompt || (photoDirection ? photoDirection : null);
  const prompt = buildPrompt(effectivePrompt, personaDescriptors);

  console.log("generate-image prompt:", prompt.slice(0, 300));

  let fluxRes, fluxData;
  try {
    fluxRes = await fetch(FAL_FLUX_URL, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: NEGATIVE,
        aspect_ratio: "9:16",
        num_images: 1,
        enable_safety_checker: false,   // safety checker blocks bikini/suggestive; we stay within platform rules manually
        seed: seed || undefined,
        output_format: "jpeg",
        loras: CARA_LORA_URL ? [{ path: CARA_LORA_URL, scale: 0.9 }] : [],
      }),
    });
    fluxData = await fluxRes.json();
  } catch (e) {
    return res.status(502).json({ error: "Network error reaching fal.ai", detail: e.message });
  }

  if (!fluxRes.ok) {
    console.error("FLUX Pro Ultra error:", fluxRes.status, JSON.stringify(fluxData));
    return res.status(fluxRes.status).json({ error: "fal.ai FLUX Pro Ultra rejected request", detail: fluxData });
  }

  const baseImageUrl = fluxData?.images?.[0]?.url;
  if (!baseImageUrl) {
    return res.status(502).json({ error: "No image URL from FLUX Pro Ultra", raw: fluxData });
  }

  return res.status(200).json({ success: true, imageUrl: baseImageUrl, seed: fluxData?.seed, prompt });
}
