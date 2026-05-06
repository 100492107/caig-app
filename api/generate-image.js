// api/generate-image.js
// nano-banana-2 only — reference images ARE the face lock.
// Pass 5 Cara reference photos + a rich scene prompt.
// No FLUX. No LoRA. Single call, ~25-35s, within 60s free tier limit.

const NB2_URL = "https://fal.run/fal-ai/nano-banana-2/edit";

// Permanent fal.ai storage — Cara's 5 best reference images
const CARA_REFS = [
  "https://v3b.fal.media/files/b/0a990cbf/7tn1zr6Tzvw4LP6NfoQJ5_Cara_Whitmore_10.png",
  "https://v3b.fal.media/files/b/0a990cbf/GZpvO79sLCKUEXmb5OjDZ_Cara_Whitmore_14.png",
  "https://v3b.fal.media/files/b/0a990cc0/hNz9MH3iKPSpX1SCu7JnC_Cara_Whitmore_16.png",
  "https://v3b.fal.media/files/b/0a990cc0/aC52Bfy17019kTbWG4L_L_Cara_Whitmore_18.png",
  "https://v3b.fal.media/files/b/0a990cc0/ne3QfVCW_NQnJZFjSnsST_Cara_Whitmore_23.jpeg",
];

// ── Prompt builder ────────────────────────────────────────────────────────────
// nano-banana-2 understands natural language instructions referencing the images.
// We describe which images are references and what to generate.

function getLighting(env) {
  const e = (env || "").toLowerCase();
  if (e.includes("bathroom") || e.includes("shower") || e.includes("mirror"))
    return "cool overhead vanity lighting, slightly blue-white, soft specular highlights on damp skin";
  if (e.includes("bedroom") || e.includes("bed") || e.includes("flat") || e.includes("indoor"))
    return "warm late-afternoon golden side window light, 5600K, soft directional shadows, intimate";
  if (e.includes("evening") || e.includes("golden hour") || e.includes("sunset"))
    return "warm golden-hour side light, long soft amber shadows, skin glows amber";
  if (e.includes("pool") || e.includes("beach") || e.includes("outdoor") || e.includes("travel") || e.includes("rooftop") || e.includes("sun"))
    return "bright Mediterranean natural daylight, slightly overhead, warm sun-kissed skin glow, moisture sheen";
  return "three-point studio lighting, large softbox key light, natural side fill, subtle rim light";
}

function getHair(env) {
  const e = (env || "").toLowerCase();
  if (e.includes("pool") || e.includes("beach") || e.includes("shower") || e.includes("bathroom") || e.includes("wet"))
    return "her hair is wet and near-black, wet-strand texture clinging to face and shoulders";
  return "her hair is very dark brown wavy, worn down, natural air-dried wave";
}

function getWardrobe(env, wardrobe) {
  if (wardrobe) return wardrobe;
  const e = (env || "").toLowerCase();
  if (e.includes("pool") || e.includes("beach"))
    return "small triangle bikini with thin tie straps, natural colour (red, black, white, or sand), layered gold chains visible at neckline";
  if (e.includes("bathroom") || e.includes("shower"))
    return "white or light grey towel, minimal coverage";
  if (e.includes("bedroom") || e.includes("bed"))
    return "casual minimal clothing, relaxed, natural";
  return "casual stylish clothing";
}

function buildPrompt(imagePrompt, personaDescriptors) {
  // Parse structured or string scene input
  let sceneDesc = "";
  let env = "";
  let wardrobe = null;

  if (!imagePrompt || typeof imagePrompt === "string") {
    sceneDesc = imagePrompt || personaDescriptors || "natural candid portrait, warm indoor light, direct gaze";
    env = sceneDesc;
  } else {
    // Support both flat keys and nested scene_specification format
    const p = imagePrompt;
    const cs  = p.core_subject        || {};
    const wd  = p.wardrobe_design      || {};
    const ea  = p.environment_and_lighting || {};
    const tp  = p.technical_photography || {};

    if (cs.physique_profile || ea.setting) {
      // Nested format (from the user's JSON example)
      const parts = [
        cs.physique_profile?.pose        && `Pose: ${cs.physique_profile.pose}`,
        cs.facial_and_glam?.expression   && `Expression: ${cs.facial_and_glam.expression}`,
        cs.facial_and_glam?.hair         && `Hair: ${cs.facial_and_glam.hair}`,
        wd.attire                        && `Outfit: ${wd.attire}`,
        wd.design_details                && `Details: ${wd.design_details}`,
        wd.accessories                   && `Accessories: ${wd.accessories}`,
        ea.setting                       && `Setting: ${ea.setting}`,
        ea.lighting                      && `Lighting: ${ea.lighting}`,
        ea.atmosphere                    && `Atmosphere: ${ea.atmosphere}`,
        tp.camera_angle                  && `Camera: ${tp.camera_angle}`,
        tp.optics                        && `Optics: ${tp.optics}`,
        tp.style                         && `Style: ${tp.style}`,
      ].filter(Boolean).join("\n");
      sceneDesc = parts;
      env = ea.setting || "";
      wardrobe = wd.attire || null;
    } else {
      // Flat format
      env = p.environment || "";
      wardrobe = p.wardrobe || null;
      sceneDesc = [
        p.shot_angle   && `Shot: ${p.shot_angle}`,
        env            && `Setting: ${env}`,
        p.pose         && `Pose: ${p.pose}`,
        p.expression   && `Expression: ${p.expression}`,
        p.mood         && `Mood: ${p.mood}`,
        p.composition  && `Composition: ${p.composition}`,
        p.style_ref    && `Style: ${p.style_ref}`,
        p.fabric_detail && `Fabric: ${p.fabric_detail}`,
        p.accessories  && `Accessories: ${p.accessories}`,
      ].filter(Boolean).join("\n");
    }
  }

  // nano-banana-2 reads the images in order — images 1-5 are references, 6 would be a base if provided.
  // Since we're generating from scratch, images 1-5 ARE the sole reference.
  return `You are given 5 reference photos (images 1 through 5) of a specific woman. Study her face very carefully across all 5 images:
- Bright, distinctly green eyes with a dark limbal ring
- Very dark brown, near-black long wavy hair
- Strong, thick, dark natural brows — one of her most defining features
- Defined, slightly angular jawline
- Medium-light warm olive skin, subtly sun-kissed
- Full naturally pigmented soft pink-rose lips, slightly parted
- Small dark mole on the left side of her neck, just below the jawline
- Small gold hoop earrings
- Layered delicate gold chains, 2-3 strands

Generate a NEW photorealistic photograph of THIS EXACT WOMAN in the following scene. Her face must be pixel-perfect consistent with the references — same green eyes, same thick dark brows, same jaw, same mole. Do not drift.

SCENE:
${sceneDesc}

HAIR: ${getHair(env)}
OUTFIT: ${getWardrobe(env, wardrobe)}
LIGHTING: ${getLighting(env)}

TECHNICAL: Shot on Sony A7R V, 85mm prime f/1.8, 1/200s ISO100. Tack-sharp focus on eyes. Shallow depth of field, creamy bokeh. Realistic optical vignette. Subtle chromatic aberration at frame edges only. Teal and Orange colour grade, 5600K. 8K resolution, raw photography aesthetic. Visible pores, subsurface scattering, fine vellus hair, real film grain, zero beauty filter, zero retouching.

NEGATIVE: Do not generate: wrong face, wrong eye colour (must be green), thin or light brows, soft jaw, plastic skin, airbrushed skin, bad anatomy, deformed hands, cartoon, anime, CGI, watermark, text, nudity, genitalia, underage.

Output a single 9:16 vertical photorealistic image.`;
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

  console.log("[generate-image] nb2 prompt length:", prompt.length);

  let nb2Res, nb2Data;
  try {
    nb2Res = await fetch(NB2_URL, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        image_urls: CARA_REFS,
        aspect_ratio: "9:16",
        resolution: "2K",
        output_format: "jpeg",
        safety_tolerance: "5",
        num_images: 1,
        seed: seed || undefined,
      }),
    });
    nb2Data = await nb2Res.json();
  } catch (e) {
    return res.status(502).json({ error: "Network error reaching nano-banana-2", detail: e.message });
  }

  if (!nb2Res.ok) {
    console.error("[generate-image] nb2 error:", nb2Res.status, JSON.stringify(nb2Data));
    return res.status(nb2Res.status).json({ error: "nano-banana-2 rejected request", detail: nb2Data });
  }

  const imageUrl = nb2Data?.images?.[0]?.url;
  if (!imageUrl) {
    return res.status(502).json({ error: "No image URL from nano-banana-2", raw: nb2Data });
  }

  return res.status(200).json({ success: true, imageUrl, seed: nb2Data?.seed, prompt });
}
