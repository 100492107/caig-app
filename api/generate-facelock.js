// api/generate-facelock.js
// Stage 2: nano-banana-2/edit — transplants Cara's exact face onto the Stage 1 base image
// Receives: { baseImageUrl }
// Returns: { imageUrl } (final face-locked output)

const NB2_URL = "https://fal.run/fal-ai/nano-banana-2/edit";

// Permanent fal.ai storage URLs for Cara's 5 best reference images
const CARA_REFS = [
  "https://v3b.fal.media/files/b/0a990cbf/7tn1zr6Tzvw4LP6NfoQJ5_Cara_Whitmore_10.png",
  "https://v3b.fal.media/files/b/0a990cbf/GZpvO79sLCKUEXmb5OjDZ_Cara_Whitmore_14.png",
  "https://v3b.fal.media/files/b/0a990cc0/hNz9MH3iKPSpX1SCu7JnC_Cara_Whitmore_16.png",
  "https://v3b.fal.media/files/b/0a990cc0/aC52Bfy17019kTbWG4L_L_Cara_Whitmore_18.png",
  "https://v3b.fal.media/files/b/0a990cc0/ne3QfVCW_NQnJZFjSnsST_Cara_Whitmore_23.jpeg",
];

const FACE_LOCK_INSTRUCTION =
  "Images 1 through 5 are reference photos of a specific real woman — study her face carefully: " +
  "bright green eyes with dark limbal ring, very dark brown near-black wavy hair, " +
  "strong thick dark natural brows, defined angular jawline, medium-light warm olive skin, " +
  "small dark mole on left side of neck just below jawline, small gold hoop earrings. " +
  "Image 6 is a generated scene with a woman in a pose. " +
  "TASK: Replace the face in image 6 with the EXACT face from the reference images (images 1–5). " +
  "The transplanted face must be pixel-perfect: " +
  "eyes must stay bright green (not grey, not hazel, not brown), " +
  "brows must stay thick and dark, jaw must stay defined and angular, " +
  "neck mole must be visible if the neck is exposed. " +
  "Preserve EVERYTHING ELSE in image 6 exactly as-is: body, pose, outfit, background, lighting, composition, aspect ratio. " +
  "Output a single final photorealistic image. No AI artefacts. PIXEL PRIORITY MODE active.";

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

  const { baseImageUrl } = body;
  if (!baseImageUrl) return res.status(400).json({ error: "baseImageUrl is required" });

  console.log("[generate-facelock] locking face onto:", baseImageUrl);

  let nb2Res, nb2Data;
  try {
    nb2Res = await fetch(NB2_URL, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: FACE_LOCK_INSTRUCTION,
        image_urls: [...CARA_REFS, baseImageUrl],
        aspect_ratio: "9:16",
        resolution: "2K",
        output_format: "jpeg",
        safety_tolerance: "5",
        num_images: 1,
      }),
    });
    nb2Data = await nb2Res.json();
  } catch (e) {
    return res.status(502).json({ error: "Network error reaching nano-banana-2", detail: e.message });
  }

  if (!nb2Res.ok) {
    console.error("[generate-facelock] error:", nb2Res.status, JSON.stringify(nb2Data));
    return res.status(nb2Res.status).json({ error: "nano-banana-2 rejected request", detail: nb2Data });
  }

  const imageUrl = nb2Data?.images?.[0]?.url;
  if (!imageUrl) {
    return res.status(502).json({ error: "No image URL from nano-banana-2", raw: nb2Data });
  }

  console.log("[generate-facelock] complete:", imageUrl);
  return res.status(200).json({ success: true, imageUrl });
}
