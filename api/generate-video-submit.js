// api/generate-video-submit.js
// Image → video via Seedance 2.5 (fal.ai). Replaces Kling.
// POST { imageUrl, postId? }
// Returns { request_id, type: "video", postId }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).json({ error: "FAL_KEY not configured" });

  let body;
  try {
    body = await new Promise((resolve, reject) => {
      let d = "";
      req.on("data", c => d += c);
      req.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
      req.on("error", reject);
    });
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const { imageUrl, postId } = body;
  if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });

  // Subtle lifestyle motion — keeps identity stable, looks natural on Reels
  const motionPrompt =
    "subtle natural movement, gentle breathing, soft hair movement, natural blink, micro-expressions, slight camera drift, photorealistic, authentic phone-video energy, continuous single shot";

  try {
    const response = await fetch(
      "https://queue.fal.run/bytedance/seedance-2.5/image-to-video",
      {
        method: "POST",
        headers: {
          Authorization: `Key ${FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: imageUrl,
          prompt: motionPrompt,
          duration: "5",
          // Seedance 2.5 i2v max is 720p (480p | 720p only — no 1080p on this endpoint)
          resolution: "720p",
          aspect_ratio: "auto",
          // Native ambient / motion SFX
          generate_audio: true,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok || !data.request_id) {
      return res.status(500).json({
        error: data.detail || data.error || "Seedance submission failed",
        raw: data,
      });
    }

    return res.status(200).json({
      request_id: data.request_id,
      type: "video",
      postId,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
