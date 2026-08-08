// api/generate-submit.js
// Submits a nano-banana-2 generation job to fal.ai's async queue.
// Caption / photo_idea drives setting + wardrobe + action.
// Shot library only supplies camera framing when the caption is vague.

const QUEUE_URL = "https://queue.fal.run/fal-ai/nano-banana-2/edit";

const CARA_REFS = [
  "https://v3b.fal.media/files/b/0a990cbf/7tn1zr6Tzvw4LP6NfoQJ5_Cara_Whitmore_10.png",
  "https://v3b.fal.media/files/b/0a990cbf/GZpvO79sLCKUEXmb5OjDZ_Cara_Whitmore_14.png",
  "https://v3b.fal.media/files/b/0a990cc0/hNz9MH3iKPSpX1SCu7JnC_Cara_Whitmore_16.png",
  "https://v3b.fal.media/files/b/0a990cc0/aC52Bfy17019kTbWG4L_L_Cara_Whitmore_18.png",
  "https://v3b.fal.media/files/b/0a990cc0/ne3QfVCW_NQnJZFjSnsST_Cara_Whitmore_23.jpeg",
];

// ─── LIGHTWEIGHT SHOT FRAMES (only used when caption is vague) ───────────────
const FRAMES = [
  "35mm eye-level, three-quarter length",
  "50mm full-length, natural distance",
  "35mm medium shot, chest-up",
  "phone selfie, arm's length",
  "mirror selfie, full length, phone visible in reflection",
  "35mm candid mid-action, not looking at camera",
  "50mm side profile, soft light",
  "24mm wide environmental, full body in context",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Pull the most concrete scene description available.
 * Priority: structured image_prompt.subject / photo_idea → caption → hook
 */
function extractScene({ imagePrompt, caption, hook, photo_idea }) {
  if (imagePrompt && typeof imagePrompt === "object") {
    const fromStruct =
      imagePrompt.subject ||
      imagePrompt.photo_idea ||
      imagePrompt.setting ||
      "";
    if (fromStruct.trim().length > 25) return fromStruct.trim();
  }
  if (typeof photo_idea === "string" && photo_idea.trim().length > 25) {
    return photo_idea.trim();
  }
  if (typeof caption === "string" && caption.trim().length > 25) {
    return caption.trim();
  }
  if (typeof hook === "string" && hook.trim().length > 10) {
    return hook.trim();
  }
  return "";
}

/**
 * Very light keyword helpers only used when the scene text is too short
 * to give wardrobe/setting itself.
 */
function detectContext(text) {
  const t = (text || "").toLowerCase();
  if (/gym|train|workout|deadlift|squat|rep|boxing|punch|weights|session/.test(t)) return "gym";
  if (/run|running|jog|track|park path/.test(t)) return "running";
  if (/mirror|outfit check|getting ready/.test(t)) return "mirror";
  if (/pool|bikini|swim|hot tub|plunge/.test(t)) return "water";
  if (/kitchen|sofa|couch|living room|at home|indoors|jumper|sweater|knit|candle|morning light|lazy/.test(t)) return "cosy";
  if (/office|desk|planner|laptop|notebook|journal/.test(t)) return "office";
  if (/rooftop|balcony|terrace|city|street|evening|going out/.test(t)) return "city";
  return "general";
}

const FALLBACK_WARDROBE = {
  gym: "fitted sports bra and leggings, trainers, hair in a ponytail or down",
  running: "running kit — sports bra or fitted top, shorts or leggings, trainers",
  mirror: "whatever she is checking in the mirror — keep it simple and real",
  water: "simple string bikini or swimwear appropriate to the setting",
  cosy: "oversized knit jumper or soft lounge clothes, bare legs or soft trousers",
  office: "simple fitted top or knit, tailored trousers or jeans, minimal gold jewellery",
  city: "casual city clothes — linen shirt, crop top, jeans or skirt, layered gold chains",
  general: "simple everyday clothes that fit a 19-year-old living her life — never formal blazer unless the caption clearly says so",
};

const FALLBACK_SETTING = {
  gym: "home gym, rubber flooring, weights visible",
  running: "city park path or quiet road, early morning light",
  mirror: "full-length mirror at home or in a gym, natural light",
  water: "apartment rooftop pool or small private plunge, natural light",
  cosy: "apartment living room or bedroom, soft morning or late afternoon light",
  office: "desk at home, notebook or laptop, natural window light",
  city: "apartment balcony, rooftop, or quiet city street",
  general: "everyday interior or outdoor space that fits the caption, natural light",
};

export function buildPrompt({ imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea }) {
  const scene = extractScene({ imagePrompt, caption, hook, photo_idea });
  const context = detectContext([scene, caption, hook, wardrobe, photoDirection].filter(Boolean).join(" "));

  // Prefer explicit wardrobe from generate-batch if it is specific
  let wardrobeText = "";
  if (wardrobe && wardrobe.trim().split(/\s+/).length > 3) {
    wardrobeText = wardrobe.trim();
  } else if (imagePrompt && typeof imagePrompt === "object" && imagePrompt.wardrobe) {
    wardrobeText = imagePrompt.wardrobe;
  } else {
    wardrobeText = FALLBACK_WARDROBE[context] || FALLBACK_WARDROBE.general;
  }

  // Setting: prefer structured or scene text; only fall back when needed
  let settingText = "";
  if (imagePrompt && typeof imagePrompt === "object" && imagePrompt.setting) {
    settingText = imagePrompt.setting;
  } else if (scene.length > 40) {
    // Let the scene itself carry the setting — do not override with a library
    settingText = "Match the exact setting and time of day implied by the scene description above";
  } else {
    settingText = FALLBACK_SETTING[context] || FALLBACK_SETTING.general;
  }

  const frame = pickRandom(FRAMES);

  // Hard anti-mismatch rules that the model must obey
  const antiMismatch = `
CRITICAL MATCHING RULES (must follow):
- The clothes, setting, and action MUST match the scene/caption. 
- Never put a blazer, tailored office wear, or formal clothes in a gym, training, or running scene.
- Never put gym clothes in a soft indoor / cosy / evening scene unless the caption says she is training.
- If the caption describes a walk, river, morning path, kitchen, sofa, candle, plants, or ordinary home moment — show that exact moment. Do not invent a gym or pool.
- If the caption is about training or a session — show training clothes and a training environment.
- Prefer the concrete details in the scene text over any generic "editorial" look.`;

  const sceneBlock = scene.length > 20
    ? `SCENE TO DEPICT (this is the primary instruction — follow it closely):\n"${scene.slice(0, 400)}"\n`
    : `SCENE: A natural, candid moment in Cara's real life. Mid-action or quiet, not a posed model shot.\n`;

  return `Photorealistic lifestyle photograph of Cara Whitmore, 19, British. Recreate her exactly from the reference images — same face, same features, same identity.

${sceneBlock}
CAMERA / FRAMING: ${frame}. 9:16 vertical. Feels like a real phone photo or candid mirror shot, not a studio production.
WARDROBE: ${wardrobeText}.
LOCATION / SETTING: ${settingText}.
LIGHTING: Natural or available light that fits the moment (morning grey, soft window, gym overhead, golden hour, etc.). Never studio softboxes. Real skin, real pores, mild film grain.

${antiMismatch}

IDENTITY LOCK — every single one of these must be exact:
HAIR: Dark chocolate brown (espresso / dark roast). This is BROWN hair, not black. Warm brown tones in light, never blue-black or jet black. Long, natural wave, past the shoulders.
EYES: Vivid bright green with dark limbal ring. Unmistakably green. Not hazel, not grey, not blue.
BROWS: Strong, thick, dark, naturally shaped.
SKIN: Medium-light warm olive. Natural pores. Light freckles across the nose and cheeks — required and visible. Slightly sun-kissed, dewy, no beauty filter, no plastic skin.
FACE: Angular jawline, straight refined nose, full soft pink-rose lips. She is 19 — not mid-20s, not late-20s.
JEWELLERY: Small gold hoop earrings. Layered fine gold chains including a cross pendant and a small coin pendant. These must appear whenever the neck is visible.
MOLE: Small dark mole on the left side of the neck, just below the jawline (~3mm). Present when neck is visible.
EXPRESSION: Natural 19-year-old energy. Can be looking at camera, slightly off, mid-thought, or mid-action. Never forced model smile. Never polished life-coach energy.

TECHNICAL: Real photograph. Tack-sharp eyes. Photorealistic. 9:16. Lived-in lifestyle quality.

DO NOT: put formal/blazer clothes in training scenes, put gym clothes in soft home scenes unless caption says so, plastic skin, missing freckles, missing gold cross or coin, black or blue-black hair, wrong eye colour, studio lighting, cartoon, CGI, text, watermark, nudity.`;
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

  const { imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea, seed } = body;
  const prompt = buildPrompt({ imagePrompt, hook, caption, wardrobe, shotAngle, photoDirection, photo_idea });
  console.log("[generate-submit] prompt:\n" + prompt);

  let qRes, qData;
  try {
    qRes = await fetch(QUEUE_URL, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        image_urls: CARA_REFS,
        image_size: { width: 1080, height: 1920 },
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
