// api/generate-submit.js
// Submits a nano-banana-2 generation job to fal.ai's async queue.

const QUEUE_URL = "https://queue.fal.run/fal-ai/nano-banana-2/edit";

const CARA_REFS = [
  "https://v3b.fal.media/files/b/0a990cbf/7tn1zr6Tzvw4LP6NfoQJ5_Cara_Whitmore_10.png",
  "https://v3b.fal.media/files/b/0a990cbf/GZpvO79sLCKUEXmb5OjDZ_Cara_Whitmore_14.png",
  "https://v3b.fal.media/files/b/0a990cc0/hNz9MH3iKPSpX1SCu7JnC_Cara_Whitmore_16.png",
  "https://v3b.fal.media/files/b/0a990cc0/aC52Bfy17019kTbWG4L_L_Cara_Whitmore_18.png",
  "https://v3b.fal.media/files/b/0a990cc0/ne3QfVCW_NQnJZFjSnsST_Cara_Whitmore_23.jpeg",
];

// ─── SHOT LIBRARY ─────────────────────────────────────────────────────────────
// Cinematic compositions fal.ai accepts. Lewd through framing, not description.
// Each entry: [frameDesc, poseDesc, compatible settings]

const SHOTS = [
  // Classic editorial
  {
    frame: "35mm eye-level portrait, shoulders-to-knees frame",
    pose: "weight on one hip, chin slightly down, direct gaze into lens",
    mood: "confident and unhurried",
  },
  {
    frame: "85mm three-quarter length, slight low angle looking up at subject",
    pose: "hand resting on hip, head tilted, soft half-smile",
    mood: "effortlessly in control",
  },
  {
    frame: "50mm full-length, camera at waist height shooting upward",
    pose: "standing tall, one arm raised touching hair, chin lifted",
    mood: "elongated silhouette, powerful",
  },
  // Feet-forward / perspective shots
  {
    frame: "24mm wide, camera low on the ground — feet sharp in foreground, body leading back to face",
    pose: "standing, legs together, face looking straight down the barrel of the lens with a knowing expression",
    mood: "cinematic fashion editorial, strong perspective",
  },
  {
    frame: "35mm low angle from knee height — long legs fill lower half of frame, face and torso in upper half",
    pose: "weight shifted to one leg, looking over shoulder down at camera",
    mood: "elongated, powerful, fashion-forward",
  },
  {
    frame: "wide low angle, camera at ankle height — full length body from feet to face, dramatic perspective distortion",
    pose: "walking slowly toward camera, direct gaze, relaxed arms",
    mood: "high-fashion runway energy",
  },
  // Over-shoulder / back shots
  {
    frame: "35mm from behind and slightly above — camera over her shoulder looking forward",
    pose: "standing at the edge of the scene, looking out, face turning back 30 degrees toward camera",
    mood: "contemplative, mysterious",
  },
  {
    frame: "50mm side profile, camera at shoulder height",
    pose: "chin up, looking into the distance, hair falling to one side",
    mood: "editorial, clean lines",
  },
  // Seated / reclined (non-bed)
  {
    frame: "35mm, seated composition — knees angled toward camera, upper body leaning back on hands",
    pose: "seated on the edge of a surface, knees drawn up slightly, looking directly at camera",
    mood: "relaxed confidence",
  },
  {
    frame: "85mm, reclined on a sun lounger — camera at eye level beside her",
    pose: "lying on side on a sun lounger, head propped on one hand, facing camera",
    mood: "golden hour editorial, warm and inviting",
  },
  // Overhead / downward
  {
    frame: "overhead flat-lay perspective — camera directly above, subject on towel or pool deck",
    pose: "lying on back on a sun towel, knees bent to one side, looking straight up into camera, hair fanned out",
    mood: "top-down fashion editorial, geometric composition",
  },
  {
    frame: "45-degree elevated angle — camera above and in front, shooting down across the body",
    pose: "standing below, face turned upward to camera, one hand in hair",
    mood: "dramatic, empowering angle",
  },
  // Close detail shots
  {
    frame: "85mm macro-ish — tight crop from collarbone to mid-thigh",
    pose: "hands framing waist, slight arch, face cropped just above frame",
    mood: "abstract editorial, body as landscape",
  },
  {
    frame: "50mm, tight crop — face and top of chest only, shallow depth of field",
    pose: "chin down, eyes up, direct gaze, lips slightly parted",
    mood: "intimate editorial portrait",
  },
];

// ─── WARDROBE LIBRARY ─────────────────────────────────────────────────────────
// All tested against fal.ai. Grouped by context for smart selection.

const WARDROBES = {
  water: [
    "small white triangle string bikini, thin side ties",
    "black string bikini, minimal coverage, classic cut",
    "white string bikini, barely-there coverage",
    "coral triangle bikini, thin straps",
    "navy blue bikini, classic silhouette",
  ],
  outdoor: [
    "oversized white linen dress shirt, unbuttoned low, mid-thigh length",
    "gold satin bralette top, high-waist wide-leg trousers",
    "fitted ribbed crop top and low-rise mini skirt",
    "strappy black bralette top and high-waist shorts, layered gold chains",
    "sheer mesh crop top over a black bralette, low-rise denim shorts",
  ],
  general: [
    "silk slip dress, thin straps, thigh-high slit",
    "black lace bodysuit worn as a top with tailored trousers",
    "tiny ribbed bandeau top and matching micro shorts, midriff bare",
    "white hotel robe loosely tied, black bikini just visible beneath",
    "oversized white dress shirt, unbuttoned to the waist, mid-thigh length",
    "fitted ribbed crop top and matching low-rise mini skirt",
  ],
};

// ─── SETTING LIBRARY ──────────────────────────────────────────────────────────

const SETTINGS = {
  water: [
    "private villa infinity pool, blue water, terracotta coping, Mediterranean landscape",
    "rooftop pool, city skyline, golden hour light on the water",
    "luxury resort pool deck, white marble, palm shadows",
    "secluded beach, crystal clear water, white sand",
  ],
  outdoor: [
    "sun-drenched apartment rooftop terrace, city panorama below",
    "penthouse balcony, floor-to-ceiling glass, golden hour",
    "Mediterranean villa courtyard, terracotta and bougainvillea",
    "high-end beachside bar terrace, sunset behind",
  ],
  general: [
    "minimalist studio, white walls, soft window light",
    "luxury penthouse living room, large windows, city behind",
    "high-end dressing room, vanity lighting, mirrors",
    "private rooftop terrace, string lights, evening ambience",
    "industrial loft, raw concrete, large north-facing windows",
  ],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function classifySetting(rawSetting) {
  const s = (rawSetting || "").toLowerCase();
  if (/pool|beach|ocean|water|sea|swim/.test(s)) return "water";
  if (/balcony|rooftop|terrace|garden|courtyard|outdoor|villa/.test(s)) return "outdoor";
  return "general";
}

function buildPrompt(imagePrompt) {
  // Extract the setting hint from the LLM prompt to guide wardrobe/setting selection
  // — but we never use the LLM's subject/pose/wardrobe text directly.
  let rawSetting = "";
  if (imagePrompt && typeof imagePrompt === "object") {
    rawSetting = imagePrompt.setting || imagePrompt.environment ||
      (imagePrompt.environment_and_lighting || {}).setting || "";
  } else if (typeof imagePrompt === "string") {
    rawSetting = imagePrompt;
  }

  const context = classifySetting(rawSetting);
  const shot = pickRandom(SHOTS);
  const wardrobe = pickRandom(WARDROBES[context] || WARDROBES.general);
  const setting = pickRandom(SETTINGS[context] || SETTINGS.general);

  return `Photorealistic editorial fashion photograph of a real woman. Recreate her exactly from the reference images — same face, same dark near-black wavy hair, same vivid green eyes, same skin tone.

COMPOSITION: ${shot.frame}.
POSE: ${shot.pose}.
MOOD: ${shot.mood}.
WARDROBE: She is wearing ${wardrobe}.
LOCATION: ${setting}.
LIGHTING: Natural or available light appropriate to the location — golden hour warmth, soft shadows, skin has a healthy natural glow.

IDENTITY LOCK — these must be exact:
- Hair: very dark, near-black, wavy, worn down
- Eyes: vivid bright green, sharp in focus, no sunglasses
- Skin: early 20s, natural texture, visible pores, no beauty filter, no smoothing
- Expression: confident, direct, comfortable in front of the camera

TECHNICAL: Sony A7R V, lens and aperture matching the composition above. Tack-sharp focus on eyes. Real photograph — not digital art, not CGI, not a painting. 9:16 vertical. Magazine quality.

DO NOT include: nudity, exposed intimate areas, genitals, cartoon style, anime, illustrated look, plastic or airbrushed skin, text overlays, watermarks, extra or deformed limbs.`;
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

  const { imagePrompt, seed } = body;
  const prompt = buildPrompt(imagePrompt);
  console.log("[generate-submit] prompt:\n" + prompt);

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
