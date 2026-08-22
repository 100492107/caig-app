// Track B video submit proxy. Keeps FAL credentials server-side.
// Provider selection: Grok Imagine, MiniMax H3, Kling 3.0 Pro, Seedance 2.0 Fast.

const FAL_BASE = "https://queue.fal.run";

const MODELS = {
  grok: {
    id: "xai/grok-imagine-video/image-to-video",
    label: "Grok Imagine Video",
    defaults: { duration: 6, resolution: "720p" },
    buildInput({ imageUrl, prompt, duration, resolution, aspectRatio }) {
      return { prompt, image_url: imageUrl, duration: Math.min(6, Math.max(2, Number(duration || 6))), resolution, aspect_ratio: aspectRatio, generate_audio: true };
    },
  },
  h3: {
    id: "minimax/h3/image-to-video",
    label: "MiniMax H3",
    defaults: { duration: 8, resolution: "2K" },
    buildInput({ imageUrl, prompt, duration, aspectRatio }) {
      return { prompt, image_url: imageUrl, duration: Math.min(15, Math.max(5, Number(duration || 8))), aspect_ratio: aspectRatio, resolution: "2K" };
    },
  },
  kling: {
    id: "fal-ai/kling-video/v3/pro/image-to-video",
    label: "Kling 3.0 Pro",
    defaults: { duration: 5, resolution: "720p" },
    buildInput({ imageUrl, prompt, duration, aspectRatio }) {
      return { prompt, start_image_url: imageUrl, duration: [3,4,5,6,7,8,9,10,11,12,13,14,15].includes(Number(duration)) ? Number(duration) : 5, aspect_ratio: aspectRatio, generate_audio: true };
    },
  },
  seedance: {
    id: "bytedance/seedance-2.0/fast/image-to-video",
    label: "Seedance 2.0 Fast",
    defaults: { duration: 10, resolution: "720p" },
    buildInput({ imageUrl, prompt, duration, resolution, aspectRatio }) {
      return { prompt, image_url: imageUrl, resolution: resolution === "2K" ? "1080p" : "720p", duration: Math.min(15, Math.max(4, Number(duration || 10))), aspect_ratio: aspectRatio, generate_audio: true };
    },
  },
};

const PROVIDER_ALIASES = new Map([
  ["seedance_2_5", "seedance"],
  ["seedance-2-5", "seedance"],
  ["seedance2_5", "seedance"],
  ["seedance-2.5", "seedance"],
  ["seedance_2.5", "seedance"],
  ["seedance25", "seedance"],
  ["seedance_2_0", "seedance"],
  ["seedance-2-0", "seedance"],
  ["seedance2", "seedance"],
]);

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!key) return res.status(500).json({ error: "FAL_API_KEY/FAL_KEY is not configured" });

  let body;
  try { body = await parseBody(req); }
  catch { return res.status(400).json({ error: "Invalid JSON request body" }); }

  const requestedProvider = String(body?.provider || "grok").trim().toLowerCase();
  const provider = PROVIDER_ALIASES.get(requestedProvider) || requestedProvider;
  const model = MODELS[provider];
  if (!model) return res.status(400).json({ error: `Unknown video provider: ${requestedProvider}` });

  const imageUrl = body?.imageUrl;
  const prompt = String(body?.prompt || "").trim();
  const aspectRatio = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].includes(body?.aspectRatio) ? body.aspectRatio : "9:16";
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return res.status(400).json({ error: "A public imageUrl is required" });
  if (!prompt) return res.status(400).json({ error: "A video prompt is required" });

  const input = model.buildInput({
    imageUrl,
    prompt: prompt.slice(0, 12000),
    duration: body?.duration || model.defaults.duration,
    resolution: body?.resolution || model.defaults.resolution,
    aspectRatio,
  });

  const queueUrl = `${FAL_BASE}/${model.id}`;
  const upstream = await fetch(queueUrl, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const text = await upstream.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!upstream.ok || !data?.request_id) {
    return res.status(502).json({ error: `${model.label} submit failed`, status: upstream.status, detail: data });
  }

  return res.status(200).json({
    provider: "fal",
    providerKey: provider,
    model: model.id,
    requestId: data.request_id,
    statusUrl: data.status_url || `${queueUrl}/requests/${data.request_id}/status`,
    resultUrl: data.response_url || `${queueUrl}/requests/${data.request_id}`,
    label: model.label,
    duration: input.duration,
    resolution: input.resolution || model.defaults.resolution,
    aspectRatio,
    generateAudio: input.generate_audio !== false,
  });
}
