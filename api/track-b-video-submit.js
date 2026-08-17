// Track B premium video adapter: fal.ai Wan 2.1 image-to-video.
// Keeps the FAL key server-side and accepts a public approved reference image URL.

const MODEL = "fal-ai/wan-i2v";
const QUEUE_URL = `https://queue.fal.run/${MODEL}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!key) return res.status(500).json({ error: "FAL_API_KEY/FAL_KEY is not configured" });

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON request body" });
  }

  const {
    imageUrl,
    prompt,
    negativePrompt,
    resolution = "720p",
    aspectRatio = "9:16",
    numFrames = 81,
    fps = 16,
    seed,
  } = body || {};

  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return res.status(400).json({ error: "A public imageUrl is required" });
  }
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "A motion prompt is required" });
  }
  if (!["480p", "720p"].includes(resolution)) return res.status(400).json({ error: "resolution must be 480p or 720p" });
  if (!["auto", "16:9", "9:16", "1:1"].includes(aspectRatio)) return res.status(400).json({ error: "Invalid aspectRatio" });
  if (!Number.isInteger(numFrames) || numFrames < 81 || numFrames > 100) return res.status(400).json({ error: "numFrames must be 81-100" });
  if (!Number.isInteger(fps) || fps < 5 || fps > 24) return res.status(400).json({ error: "fps must be 5-24" });

  const payload = {
    prompt: prompt.slice(0, 4000),
    negative_prompt: typeof negativePrompt === "string" ? negativePrompt.slice(0, 3000) : undefined,
    image_url: imageUrl,
    num_frames: numFrames,
    frames_per_second: fps,
    resolution,
    aspect_ratio: aspectRatio,
    enable_safety_checker: true,
    enable_prompt_expansion: false,
    acceleration: "regular",
    ...(Number.isInteger(seed) ? { seed } : {}),
  };

  const upstream = await fetch(QUEUE_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await upstream.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!upstream.ok || !data.request_id) {
    return res.status(502).json({ error: "fal.ai video submit failed", status: upstream.status, detail: data });
  }

  const requestId = data.request_id;
  const statusUrl = data.status_url || `${QUEUE_URL}/requests/${requestId}/status`;
  const resultUrl = data.response_url || `${QUEUE_URL}/requests/${requestId}`;

  return res.status(200).json({
    requestId,
    model: MODEL,
    statusUrl,
    resultUrl,
    resolution,
    aspectRatio,
    frames: numFrames,
    fps,
    estimatedSeconds: Number((numFrames / fps).toFixed(2)),
    estimatedUsd: resolution === "720p" ? 0.4 : 0.2,
  });
}
