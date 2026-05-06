// api/generate-base.js
// Stage 1: FLUX Pro Ultra — generates the scene/pose/lighting/outfit base image
// Called first; returns imageUrl for Stage 2 face-lock

const FLUX_URL = "https://fal.run/fal-ai/flux-pro/v1.1-ultra";

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
  "thin eyebrows, light eyebrows, pencil brows, wrong face, face swap, grey eyes, brown eyes, " +
  "hazel eyes, blue eyes, light hair, blonde hair, red hair, straight hair, curly hair, " +
  "soft jaw, round jaw, chubby face, different person, " +
  "plastic skin, waxy, airbrushed, poreless, beauty filter, skin smoothing, oversaturated, " +
  "blown-out highlights, crushed shadows, overexposed, underexposed, " +
  "bad anatomy, deformed, extra limbs, missing limbs, fused fingers, mutated hands, bad proportions, " +
  "lens distortion, fisheye, barrel distortion, motion blur, out of focus, double exposure, " +
  "jpeg artefacts, pixelated, low resolution, " +
  "CGI, 3D render, cartoon, anime, illustration, painting, digital art, watermark, logo, text, " +
  "nudity, explicit, nsfw, underage, genitalia";

function getLighting(env) {
  const e = (env || "").toLowerCase();
  if (e.includes("bathroom") || e.includes("shower") || e.includes("mirror"))
    return "cool overhead vanity lighting, slightly blue-white, soft specular highlights on damp skin";
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

function buildPrompt(imagePrompt, personaDescriptors) {
  let scene = "", env = "", wardrobe = null, extraFields = "";

  if (!imagePrompt || typeof imagePrompt === "string") {
    scene = imagePrompt || personaDescriptors || "natural candid portrait, warm indoor light";
    env = scene;
  } else {
    const {
      shot_angle = "", environment = "", lighting = "", wardrobe: wd = "",
      mood = "", style_ref = "", composition = "", pose = "", expression = "",
      accessories = "", fabric_detail = "",
      core_subject, wardrobe_design, technical_photography, environment_and_lighting,
    } = imagePrompt;

    if (core_subject || wardrobe_design || environment_and_lighting) {
      const physique = core_subject?.physique_profile || {};
      const facial   = core_subject?.facial_and_glam || {};
      const wd2      = wardrobe_design || {};
      const env2     = environment_and_lighting || {};
      const tech     = technical_photography || {};
      scene = [
        physique.pose         && `pose: ${physique.pose}`,
        facial.expression     && `expression: ${facial.expression}`,
        wd2.attire            && `outfit: ${wd2.attire}`,
        wd2.design_details,
        env2.setting          && `setting: ${env2.setting}`,
        env2.lighting         && `lighting: ${env2.lighting}`,
        env2.atmosphere       && `atmosphere: ${env2.atmosphere}`,
        tech.camera_angle     && `camera: ${tech.camera_angle}`,
        tech.style,
        style_ref,
      ].filter(Boolean).join(", ");
      env      = env2.setting || "";
      wardrobe = wd2.attire || null;
    } else {
      env      = environment;
      wardrobe = wd || null;
      scene = [
        shot_angle  && `shot: ${shot_angle}`,
        env         && `setting: ${env}`,
        pose        && `pose: ${pose}`,
        expression  && `expression: ${expression}`,
        mood        && `mood: ${mood}`,
        composition && `composition: ${composition}`,
        style_ref,
      ].filter(Boolean).join(", ");
      extraFields = [
        lighting      && `lighting: ${lighting}`,
        fabric_detail && `fabric: ${fabric_detail}`,
        accessories   && `accessories: ${accessories}`,
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
  const prompt = buildPrompt(imagePrompt || photoDirection || null, personaDescriptors);

  console.log("[generate-base] prompt:", prompt.slice(0, 200));

  let fluxRes, fluxData;
  try {
    fluxRes = await fetch(FLUX_URL, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        negative_prompt: NEGATIVE,
        aspect_ratio: "9:16",
        num_images: 1,
        enable_safety_checker: false,
        seed: seed || undefined,
        output_format: "jpeg",
        loras: [],
      }),
    });
    fluxData = await fluxRes.json();
  } catch (e) {
    return res.status(502).json({ error: "Network error reaching fal.ai", detail: e.message });
  }

  if (!fluxRes.ok) {
    console.error("[generate-base] error:", fluxRes.status, JSON.stringify(fluxData));
    return res.status(fluxRes.status).json({ error: "FLUX Ultra rejected request", detail: fluxData });
  }

  const imageUrl = fluxData?.images?.[0]?.url;
  if (!imageUrl) {
    return res.status(502).json({ error: "No image URL from FLUX Ultra", raw: fluxData });
  }

  return res.status(200).json({ success: true, imageUrl, seed: fluxData?.seed, prompt });
}
