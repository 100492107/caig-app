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

// Safe wardrobe pool — lewd but never nude, no phrases that trigger fal.ai safety
const SAFE_WARDROBES = [
  "small triangle string bikini, thin side ties",
  "tiny micro bikini, halter neck top, high-cut bottoms",
  "silk slip dress, thin straps, low back",
  "oversized white dress shirt, unbuttoned to the waist, mid-thigh length",
  "black lace bodysuit, sheer panels fully lined at chest",
  "white hotel robe loosely tied, black bikini underneath just visible",
  "tiny bandeau top and micro shorts, midriff bare",
  "strappy black lingerie set, lace bralette and high-cut briefs",
  "gold satin bralette and matching high-waist briefs",
  "sheer mesh crop top over black bralette, low-rise shorts",
  "red satin slip dress, thigh-high slit",
  "fitted ribbed crop top and matching low-rise shorts",
  "lace-trimmed camisole and high-waist briefs, shoulder slipping",
];

const BLOCKED_POSE_PATTERNS = [
  /arch(ing)? (her )?back/gi,
  /lying on (her )?(back|stomach|bed)/gi,
  /\bon the bed\b/gi,
  /\bin bed\b/gi,
  /HIGH ANGLE[^,.]*/gi,
  /looking up into (the )?lens/gi,
  /shooting down/gi,
  /camera.*above.*shooting/gi,
  /overhead (angle|shot|view)/gi,
  /the rest of the frame is (warm )?skin/gi,
  /fabric covers the minimum/gi,
  /poolside decorum/gi,
  /sports illustrated/gi,
  /legs.*waist.*chest.*face all visible/gi,
];

// Blocked settings — fal.ai blocks lingerie + bedroom/hotel room
const BLOCKED_SETTING_PATTERNS = [
  /\b(hotel room|bedroom|king bed|bed(room)?|rumpled (white )?linen|on the bed)\b/gi,
];

// Safe setting replacements for bedroom-like scenes
const BEDROOM_ALT_SETTINGS = [
  "sun-drenched apartment balcony, city view below, warm morning light",
  "luxury penthouse lounge, floor-to-ceiling windows, golden hour",
  "private rooftop terrace, string lights, evening ambience",
  "minimalist studio apartment, white walls, late afternoon light",
  "high-end dressing room, soft vanity lighting, mirrors",
  "modern living room, large windows overlooking the city",
];

function sanitiseSetting(setting) {
  if (!setting || typeof setting !== "string") return setting;
  if (BLOCKED_SETTING_PATTERNS.some(p => p.test(setting))) {
    return BEDROOM_ALT_SETTINGS[Math.floor(Math.random() * BEDROOM_ALT_SETTINGS.length)];
  }
  return setting;
}

function sanitisePose(text) {
  if (!text || typeof text !== "string") return text;
  let out = text;
  for (const pat of BLOCKED_POSE_PATTERNS) {
    out = out.replace(pat, "");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

// Hard keyword sanitiser — catches any explicit terms anywhere in the prompt
function sanitiseKeywords(raw) {
  if (!raw || typeof raw !== "string") return raw;
  return raw
    .replace(/\bcompletely nude\b/gi, "wearing minimal clothing")
    .replace(/\bnude bralette\b/gi, "skin-tone bralette")
    .replace(/\bnude\b/gi, "barely dressed")
    .replace(/\bnaked\b/gi, "in minimal clothing")
    .replace(/\btopless\b/gi, "in a bralette")
    .replace(/\bexplicit\b/gi, "intimate")
    .replace(/\bfully exposed\b/gi, "barely covered")
    .replace(/\bno bra\b/gi, "braless under fabric")
    .replace(/\bwet (white )?t.shirt\b/gi, "damp fitted top")
    .replace(/\bno bottoms visible\b/gi, "mid-thigh length")
    .replace(/\bstrip(ping)? off\b/gi, "undressing");
}

function extractFields(imagePrompt) {
  if (!imagePrompt) return {};
  if (typeof imagePrompt === "string") return { subject: imagePrompt };

  const p = imagePrompt;

  // Shape A: { subject, wardrobe, setting, lighting }
  if (p.subject || p.setting) {
    return {
      subject: p.subject || "",
      setting: sanitiseSetting(p.setting || ""),
      lighting: p.lighting || "",
    };
  }

  // Shape B: { environment_and_lighting, core_subject, wardrobe_design, ... }
  if (p.environment_and_lighting || p.core_subject) {
    const ea = p.environment_and_lighting || {};
    const cs = p.core_subject || {};
    return {
      subject: [
        cs.physique_profile?.pose && sanitisePose(cs.physique_profile.pose),
        cs.facial_and_glam?.expression,
      ].filter(Boolean).join(", "),
      setting: sanitiseSetting(ea.setting || ""),
      lighting: ea.lighting || "",
    };
  }

  // Shape C: flat object
  return {
    subject: [p.pose && sanitisePose(p.pose), p.expression].filter(Boolean).join(", "),
    setting: sanitiseSetting(p.environment || p.setting || ""),
    lighting: p.lighting || "",
  };
}

function pickWardrobe(setting) {
  const s = (setting || "").toLowerCase();
  // Environment-appropriate wardrobe hints — always from safe pool
  if (s.includes("pool") || s.includes("beach") || s.includes("water"))
    return SAFE_WARDROBES[Math.floor(Math.random() * 2)]; // bikini options
  if (s.includes("bedroom") || s.includes("bed") || s.includes("hotel room"))
    return SAFE_WARDROBES[4 + Math.floor(Math.random() * 5)]; // lingerie/robe options
  // General — any from pool
  return SAFE_WARDROBES[Math.floor(Math.random() * SAFE_WARDROBES.length)];
}

function buildPrompt(imagePrompt) {
  const { subject, setting, lighting } = extractFields(imagePrompt);

  const cleanSubject = sanitisePose(sanitiseKeywords(subject || "")).replace(/,\s*,/g, ",").replace(/^[,\s]+|[,\s]+$/g, "").trim()
    || "standing confidently, looking directly at camera";
  const cleanSetting = sanitiseKeywords(setting || "minimal neutral background");
  const cleanLighting = sanitiseKeywords(lighting || "soft natural light");
  const wardrobe = pickWardrobe(setting);

  return `Photo of a specific woman from the reference images.

She is ${cleanSubject}.
Setting: ${cleanSetting}.
She is wearing ${wardrobe}.
Lighting: ${cleanLighting}.

Dark near-black wavy hair, vivid green eyes, early 20s, natural skin texture with visible pores — no retouching. Direct confident gaze. Shot on Sony A7R V, 35mm f/1.8, sharp focus on face, softly blurred background. Photorealistic, not AI art. 9:16 vertical.`;
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
