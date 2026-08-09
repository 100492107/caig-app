// api/generate-video-submit.js
// Image → video via Seedance 2.5 (fal.ai).
// POST { imageUrl, postId?, caption?, photo_idea?, hook? }
//
// Motion style: real phone selfie energy — normal speed, clear human movement,
// not slow-mo, not frozen limbs, no cinematic grade.

function buildMotionPrompt({ caption, photo_idea, hook }) {
  const context = [photo_idea, caption, hook].filter(Boolean).join(" ").trim();
  const sceneHint = context
    ? context.replace(/\s+/g, " ").slice(0, 180)
    : "a casual mirror selfie moment";

  // Seedance freezes limbs when you only ask for "subtle micro-movement".
  // Give clear, normal-speed actions so raised arms, hands, and pose actually move.
  return [
    `Real phone video, normal real-time speed, not slow motion, not cinematic.`,
    `Starting from the exact still image of Cara. Scene context: ${sceneHint}.`,
    `She is alive and moving naturally like a real girl filming a quick mirror selfie.`,
    `In the first second she blinks and slightly adjusts her posture.`,
    `If an arm is raised, she lowers it smoothly or shifts it — do not leave any limb frozen in place.`,
    `She shifts her weight, the open shirt or fabric moves with her body, hair moves slightly.`,
    `She may glance at the phone screen then back to the mirror, small natural head movement.`,
    `Continuous single take, handheld phone feel, tiny natural camera shake only.`,
    `Normal playback speed — everyday real life, not dramatic, not slow-mo, not dreamy.`,
    `Photorealistic, natural skin, real light. No morphing, no face change, identity locked to the starting frame.`,
    `No text on screen, no music, no voiceover.`,
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
          duration: "5",          // shorter = tighter, less drift
          resolution: "720p",
          aspect_ratio: "auto",
          generate_audio: false,  // no SFX
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
