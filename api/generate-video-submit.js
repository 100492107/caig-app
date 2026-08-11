// api/generate-video-submit.js
// Image → video via Seedance 2.5 (fal.ai)
// Prompt structure mirrors high-performing Seedance briefs: labeled sections + 4K quality language in the prompt text.
// API resolution enum on fal 2.5 I2V remains 480p|720p; "4K ultra-clear" is requested inside the prompt for detail intent.

const SEEDANCE_ENDPOINT = "https://queue.fal.run/bytedance/seedance-2.5/image-to-video";
const DEFAULT_RESOLUTION = "720p";
const DEFAULT_DURATION = "8";

function buildMotionPrompt({ caption, photo_idea, hook, personaId = "cara" }) {
  const isLila = (personaId || "").toLowerCase().includes("lila");
  const name = isLila ? "Lila Sterling" : "Cara Whitmore";
  const energy = isLila
    ? "Composed, serene, soft micro-expressions. Never performative."
    : "Alive, human, slight micro-hesitation OK. Not a polished commercial take.";
  const sceneHint = [photo_idea, caption, hook].filter(Boolean).join(" ").slice(0, 220) || "Candid lived-in moment, phone-documented";

  // Structured brief (same family as high-detail Seedance 2.5 prompts users paste in UI)
  return [
    `【Core Focus】: ${name} — identity locked to first frame. Continuous real human micro-motion only. Zero face drift.`,
    `【Style】: Live-action phone UGC, 4K ultra-clear detail intent, natural skin texture, handheld micro-shake, normal speed, high-contrast natural light, no beauty filter, no CGI gloss, no anime, no gore.`,
    `【Duration】: ~${DEFAULT_DURATION} seconds`,
    `【Scene】: ${sceneHint}`,
    `【Subject Energy】: ${energy}`,
    `【Camera】: Handheld phone / chest-up or half-body, 9:16, slight natural shake, no cinematic drone, no whip-pan action cuts.`,
    `【Motion Beats】: Start already in motion. One natural blink cycle. One gaze break off-lens. One micro-pause. One small posture or hand adjust. End unresolved — no smile-to-camera CTA seal.`,
    `【Imperfections Required】: pore-level skin holds, slight expression asymmetry, real fabric movement, imperfect presence.`,
    `【Constraints】: No text, no logos, no music bed, no frozen limbs, no morphing jewellery/hair/eye colour, no plastic skin.`,
  ].join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).json({ error: "FAL_KEY not configured" });

  let body;
  try {
    body = await new Promise((resolve, reject) => {
      let d = "";
      req.on("data", c => (d += c));
      req.on("end", () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
      req.on("error", reject);
    });
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const {
    imageUrl, postId, caption, photo_idea, hook,
    personaId, persona_id, resolution, duration,
  } = body;

  if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });

  const pid = personaId || persona_id || "cara";
  const motionPrompt = buildMotionPrompt({
    caption, photo_idea, hook, personaId: pid,
  });

  const resOut = resolution === "480p" ? "480p" : DEFAULT_RESOLUTION;
  const durOut = duration || DEFAULT_DURATION;

  try {
    const response = await fetch(SEEDANCE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: motionPrompt,
        duration: String(durOut),
        resolution: resOut,
        aspect_ratio: "auto",
        generate_audio: false,
      }),
    });

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
      personaId: pid,
      resolution: resOut,
      duration: durOut,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
