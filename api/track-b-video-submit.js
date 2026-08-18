// Track B video submit proxy.
// Default production provider is Seedance 2.5 when ARK_API_KEY is configured;
// otherwise it retains the existing fal.ai Wan fallback.

const WAN_MODEL = "fal-ai/wan-i2v";
const WAN_QUEUE_URL = `https://queue.fal.run/${WAN_MODEL}`;
const SEEDANCE_MODEL = process.env.SEEDANCE_MODEL || "dreamina-seedance-2-5-260628";
const SEEDANCE_BASE = "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks";

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

async function submitSeedance({ key, imageUrl, prompt, ratio, duration, resolution }) {
  const payload = {
    model: SEEDANCE_MODEL,
    content: [
      { type: "text", text: String(prompt || "").slice(0, 12000) },
      { type: "image_url", image_url: { url: imageUrl } },
    ],
    ratio,
    duration,
    resolution,
    generate_audio: true,
    watermark: false,
    priority: 5,
  };
  const upstream = await fetch(SEEDANCE_BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await upstream.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!upstream.ok || !data?.id) {
    return { error: "Seedance video submit failed", status: upstream.status, detail: data };
  }
  return {
    provider: "seedance_2_5",
    requestId: data.id,
    statusUrl: `${SEEDANCE_BASE}/${encodeURIComponent(data.id)}`,
    model: SEEDANCE_MODEL,
  };
}

async function submitWan({ key, imageUrl, prompt, negativePrompt, resolution, aspectRatio, numFrames, fps }) {
  const payload = {
    prompt: String(prompt || "").slice(0, 4000),
    negative_prompt: typeof negativePrompt === "string" ? negativePrompt.slice(0, 3000) : undefined,
    image_url: imageUrl,
    num_frames: numFrames,
    frames_per_second: fps,
    resolution,
    aspect_ratio: aspectRatio,
    enable_safety_checker: true,
    enable_prompt_expansion: false,
    acceleration: "regular",
  };
  const upstream = await fetch(WAN_QUEUE_URL, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await upstream.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!upstream.ok || !data?.request_id) return { error: "fal.ai video submit failed", status: upstream.status, detail: data };
  const requestId = data.request_id;
  return {
    provider: "wan",
    requestId,
    statusUrl: data.status_url || `${WAN_QUEUE_URL}/requests/${requestId}/status`,
    resultUrl: data.response_url || `${WAN_QUEUE_URL}/requests/${requestId}`,
    model: WAN_MODEL,
    estimatedSeconds: Number((numFrames / fps).toFixed(2)),
    estimatedUsd: resolution === "720p" ? 0.4 : 0.2,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body;
  try { body = await parseBody(req); }
  catch { return res.status(400).json({ error: "Invalid JSON request body" }); }

  const {
    imageUrl,
    prompt,
    negativePrompt,
    resolution = "720p",
    aspectRatio = "9:16",
    numFrames = 81,
    fps = 16,
    provider = "auto",
    duration = 30,
  } = body || {};

  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return res.status(400).json({ error: "A public imageUrl is required" });
  if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "A video prompt is required" });

  const arkKey = process.env.ARK_API_KEY || process.env.BYTEPLUS_API_KEY;
  const useSeedance = provider === "seedance_2_5" || (provider === "auto" && Boolean(arkKey));

  if (useSeedance) {
    if (!arkKey) return res.status(503).json({ error: "Seedance 2.5 is selected but ARK_API_KEY is not configured in Vercel." });
    const result = await submitSeedance({ key: arkKey, imageUrl, prompt, ratio: aspectRatio, duration: Math.min(30, Math.max(4, Number(duration || 30))), resolution });
    if (result.error) return res.status(502).json(result);
    return res.status(200).json({ ...result, duration: Math.min(30, Math.max(4, Number(duration || 30))), aspectRatio, generateAudio: true });
  }

  const falKey = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!falKey) return res.status(500).json({ error: "FAL_API_KEY/FAL_KEY is not configured" });
  if (!["480p", "720p"].includes(resolution)) return res.status(400).json({ error: "resolution must be 480p or 720p" });
  if (!["auto", "16:9", "9:16", "1:1"].includes(aspectRatio)) return res.status(400).json({ error: "Invalid aspectRatio" });
  if (!Number.isInteger(numFrames) || numFrames < 81 || numFrames > 100) return res.status(400).json({ error: "numFrames must be 81-100" });
  if (!Number.isInteger(fps) || fps < 5 || fps > 24) return res.status(400).json({ error: "fps must be 5-24" });
  const result = await submitWan({ key: falKey, imageUrl, prompt, negativePrompt, resolution, aspectRatio, numFrames, fps });
  if (result.error) return res.status(502).json(result);
  return res.status(200).json(result);
}
