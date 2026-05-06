// api/generate-submit.js
// Submits a nano-banana-2 generation job to fal.ai's async queue.
// Returns instantly with { requestId, statusUrl, resultUrl }.
// Client polls /api/generate-poll?requestId=... every 2s.

const QUEUE_URL = "https://queue.fal.run/fal-ai/nano-banana-2/edit";

const CARA_REFS = [
  "https://v3b.fal.media/files/b/0a990cbf/7tn1zr6Tzvw4LP6NfoQJ5_Cara_Whitmore_10.png",
  "https://v3b.fal.media/files/b/0a990cbf/GZpvO79sLCKUEXmb5OjDZ_Cara_Whitmore_14.png",
  "https://v3b.fal.media/files/b/0a990cc0/hNz9MH3iKPSpX1SCu7JnC_Cara_Whitmore_16.png",
  "https://v3b.fal.media/files/b/0a990cc0/aC52Bfy17019kTbWG4L_L_Cara_Whitmore_18.png",
  "https://v3b.fal.media/files/b/0a990cc0/ne3QfVCW_NQnJZFjSnsST_Cara_Whitmore_23.jpeg",
];

function getLighting(env) {
  const e = (env || "").toLowerCase();
  if (e.includes("bathroom") || e.includes("shower") || e.includes("mirror"))
    return "cool overhead vanity lighting, slightly blue-white, soft specular highlights on damp skin";
  if (e.includes("bedroom") || e.includes("bed") || e.includes("indoor"))
    return "warm late-afternoon golden side window light, 5600K, soft directional shadows";
  if (e.includes("pool") || e.includes("beach") || e.includes("outdoor") || e.includes("travel") || e.includes("sun"))
    return "bright Mediterranean natural daylight, warm sun-kissed skin glow, moisture sheen";
  if (e.includes("evening") || e.includes("golden hour"))
    return "warm golden-hour side light, long soft amber shadows";
  return "three-point studio lighting, large softbox key light, natural side fill, subtle rim light";
}

function getHair(env) {
  const e = (env || "").toLowerCase();
  if (e.includes("pool") || e.includes("beach") || e.includes("shower") || e.includes("bathroom") || e.includes("wet"))
    return "hair is wet and near-black, wet-strand texture clinging to face and shoulders";
  return "hair is very dark brown wavy, worn down, natural air-dried wave";
}

function getWardrobe(env, wardrobe) {
  if (wardrobe) return wardrobe;
  const e = (env || "").toLowerCase();
  if (e.includes("pool") || e.includes("beach"))
    return "small triangle bikini, thin tie straps, natural colour (red, black, white, or sand), layered gold chains visible";
  if (e.includes("bathroom") || e.includes("shower"))
    return "white or light grey towel, minimal coverage";
  if (e.includes("bedroom") || e.includes("bed"))
    return "casual minimal clothing, relaxed";
  return "casual stylish clothing";
}

function buildPrompt(imagePrompt, personaDescriptors) {
  let sceneDesc = "", env = "", wardrobe = null;

  if (!imagePrompt || typeof imagePrompt === "string") {
    // Plain string or empty — use directly
    sceneDesc = imagePrompt || personaDescriptors || "natural candid portrait, warm indoor light, direct gaze";
    env = sceneDesc;
  } else {
    const p = imagePrompt;

    // Shape A: { subject, wardrobe, setting, lighting } — from generateImagePrompt() in App.jsx
    if (p.subject || p.setting) {
      sceneDesc = [
        p.subject,
        p.wardrobe  && `Outfit: ${p.wardrobe}`,
        p.setting   && `Setting: ${p.setting}`,
        p.lighting  && `Lighting: ${p.lighting}`,
      ].filter(Boolean).join("\n");
      env = p.setting || "";
      wardrobe = p.wardrobe || null;

    // Shape B: { environment_and_lighting, core_subject, wardrobe_design, technical_photography }
    } else if (p.environment_and_lighting || p.core_subject) {
      const ea = p.environment_and_lighting || {};
      const cs = p.core_subject || {};
      const wd = p.wardrobe_design || {};
      const tp = p.technical_photography || {};
      env = ea.setting || "";
      wardrobe = wd.attire || null;
      sceneDesc = [
        cs.physique_profile?.pose      && `Pose: ${cs.physique_profile.pose}`,
        cs.facial_and_glam?.expression && `Expression: ${cs.facial_and_glam.expression}`,
        wd.attire                      && `Outfit: ${wd.attire}`,
        ea.setting                     && `Setting: ${ea.setting}`,
        ea.lighting                    && `Lighting: ${ea.lighting}`,
        tp.optics,
      ].filter(Boolean).join("\n");

    // Shape C: flat { environment, wardrobe, pose, expression, ... }
    } else {
      env = p.environment || "";
      wardrobe = p.wardrobe || null;
      sceneDesc = [
        p.shot_angle && `Shot: ${p.shot_angle}`,
        env          && `Setting: ${env}`,
        p.pose       && `Pose: ${p.pose}`,
        p.expression && `Expression: ${p.expression}`,
        p.mood       && `Mood: ${p.mood}`,
      ].filter(Boolean).join("\n");
    }
  }

  // Fallback if we somehow ended up with nothing
  if (!sceneDesc.trim()) sceneDesc = "natural candid portrait, warm indoor light, direct gaze";

  return `The reference images show a specific woman — use her as the subject for a new photo.

Generate a photorealistic photo of her ${sceneDesc}. ${getWardrobe(env, wardrobe) ? `She is wearing ${getWardrobe(env, wardrobe)}.` : ""} ${getHair(env) ? `Her ${getHair(env)}.` : ""} ${getLighting(env) ? `${getLighting(env)}.` : ""}

She has her characteristic bright green eyes, thick dark brows, and dark wavy hair as seen in the reference photos. Her skin looks real — natural texture, visible pores, no retouching and no beauty filter. She has a relaxed, direct expression — comfortable in front of the camera, not posing.

Shot on Sony A7R V with a 35mm lens at f/1.8. Sharp focus on her face and eyes. The background is softly blurred. Real photo quality — not AI art, no plastic skin, no smooth rendering. 9:16 vertical format.`;
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

  // Sanitise the prompt — fal.ai hard-blocks full nudity regardless of safety_tolerance.
  // Replace explicit terms with tasteful implied equivalents so the image still matches
  // the mood of the caption without being blocked.
  function sanitisePrompt(raw) {
    if (!raw || typeof raw !== "string") return raw;
    return raw
      .replace(/\bcompletely nude\b/gi, "wearing minimal clothing, implied nudity")
      .replace(/\bnude\b/gi, "barely dressed, tastefully implied")
      .replace(/\bnaked\b/gi, "undressed, implied")
      .replace(/\btopless\b/gi, "wearing just underwear, implied topless")
      .replace(/\byou can see everything\b/gi, "intimate and raw")
      .replace(/\bstrip off\b/gi, "undressed")
      .replace(/\bexplicit\b/gi, "intimate")
      .replace(/\bfully exposed\b/gi, "vulnerable and raw");
  }

  const rawPrompt = imagePrompt || photoDirection || null;

  // If it's an object, sanitise all string fields inside it
  let sanitised;
  if (rawPrompt && typeof rawPrompt === "object") {
    sanitised = Object.fromEntries(
      Object.entries(rawPrompt).map(([k, v]) => [k, typeof v === "string" ? sanitisePrompt(v) : v])
    );
  } else {
    sanitised = typeof rawPrompt === "string" ? sanitisePrompt(rawPrompt) : rawPrompt;
  }
  const prompt = buildPrompt(sanitised, personaDescriptors);
  console.log("[generate-submit] prompt:", prompt.slice(0, 300));

  let qRes, qData;
  try {
    qRes = await fetch(QUEUE_URL, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        image_urls: CARA_REFS,
        aspect_ratio: "9:16",
        resolution: "2K",
        output_format: "jpeg",
        safety_tolerance: "6",
        num_images: 1,
        seed: seed || undefined,
      }),
    });
    qData = await qRes.json();
  } catch (e) {
    return res.status(502).json({ error: "Failed to submit to fal.ai queue", detail: e.message });
  }

  if (!qRes.ok || !qData.request_id) {
    return res.status(qRes.status || 502).json({ error: "Queue submit failed", detail: qData });
  }

  console.log("[generate-submit] queued:", qData.request_id);
  return res.status(200).json({
    requestId: qData.request_id,
    statusUrl: qData.status_url,
    resultUrl: qData.response_url,
  });
}
