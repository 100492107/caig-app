// api/generate-video-submit.js
// Image → video via Seedance 2.5 (fal.ai).
// POST { imageUrl, postId?, caption?, photo_idea?, hook? }
// Returns { request_id, type: "video", postId }
//
// Prompt style follows ByteDance Seedance 2.5 guide:
// Subject + Action + Scene + Camera + Audio, with short timed beats (5–8s max).

function buildMotionPrompt({ caption, photo_idea, hook }) {
  const context = [photo_idea, caption, hook].filter(Boolean).join(" ").trim();
  const sceneHint = context
    ? context.replace(/\s+/g, " ").slice(0, 220)
    : "a natural candid moment in her day";

  // Seedance 2.5 responds best to concrete, staged action — not vague "subtle movement".
  // Keep total runtime 5–8s. Image is the first frame; describe what happens next.
  return [
    `Opening (0:00-0:02): Cara is already in the frame exactly as shown in the reference still. ${sceneHint}. She holds the same pose for a beat, then begins natural micro-movement — a soft shift of weight, a breath that moves the shoulders, eyes blink once.`,
    `Main action (0:02-0:06): She continues the moment in a continuous single shot. Hair shifts slightly. Fabric settles with the body. Expression stays natural and present — not a posed model stare. Small, believable human motion only: a glance, a hand adjustment, a slight head turn, or walking energy if the still implies movement.`,
    `Close (0:06-0:08): Motion settles. She finishes the gesture or holds the end of the moment. Camera stays stable with only tiny handheld drift. No jump cuts, no new wardrobe, no face change.`,
    `Camera: locked or very gentle handheld, 9:16 vertical, photorealistic phone-video look, continuous take.`,
    `Audio: soft ambient room tone or light outdoor atmosphere matching the scene; quiet natural sound only, no music, no voiceover, no text on screen.`,
    `Style: real lifestyle phone footage, natural skin texture, real light, no beauty filter, no cinematic grade, no morphing, identity locked to the starting image.`,
  ].join(" ");
}

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

  const { imageUrl, postId, caption, photo_idea, hook } = body;
  if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });

  const motionPrompt = buildMotionPrompt({ caption, photo_idea, hook });

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
          duration: "8",          // 5–10s band; 8s is a strong default for Reels
          resolution: "720p",     // max for Seedance 2.5 i2v
          aspect_ratio: "auto",   // inherits 9:16 from Cara stills
          generate_audio: true,   // ambient SFX on
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
