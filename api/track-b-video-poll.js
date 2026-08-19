// Track B video status/result proxy for current fal image-to-video models.

const FAL_BASE = "https://queue.fal.run";
const ALLOWED_MODELS = new Set([
  "xai/grok-imagine-video/image-to-video",
  "minimax/h3/image-to-video",
  "fal-ai/kling-video/v3/pro/image-to-video",
  "bytedance/seedance-2.0/fast/image-to-video",
]);
const PROVIDER_MODELS = {
  grok: "xai/grok-imagine-video/image-to-video",
  h3: "minimax/h3/image-to-video",
  kling: "fal-ai/kling-video/v3/pro/image-to-video",
  seedance: "bytedance/seedance-2.0/fast/image-to-video",
  seedance_2_5: "bytedance/seedance-2.0/fast/image-to-video",
};

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

  const requestId = body?.requestId;
  const action = body?.action || "status";
  const providerKey = body?.providerKey || body?.provider || "";
  const model = body?.model || PROVIDER_MODELS[providerKey];
  const suppliedStatusUrl = body?.statusUrl;
  if (!requestId) return res.status(400).json({ error: "requestId is required" });
  if (!model || !ALLOWED_MODELS.has(model)) return res.status(400).json({ error: "A supported fal video model/provider is required" });

  const queueUrl = `${FAL_BASE}/${model}`;
  const statusUrl = suppliedStatusUrl || `${queueUrl}/requests/${encodeURIComponent(requestId)}/status`;
  const resultUrl = `${queueUrl}/requests/${encodeURIComponent(requestId)}`;
  const url = action === "result" ? resultUrl : statusUrl;
  const upstream = await fetch(url, { headers: { Authorization: `Key ${key}` } });
  const text = await upstream.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!upstream.ok) return res.status(502).json({ error: "fal.ai video poll failed", status: upstream.status, detail: data });

  if (action === "result") {
    return res.status(200).json({
      status: "COMPLETED",
      videoUrl: data?.video?.url || data?.data?.video?.url || data?.output?.video?.url || data?.result?.video?.url || null,
      data,
    });
  }

  return res.status(200).json({ status: data?.status || "IN_QUEUE", queuePosition: data?.queue_position ?? data?.queuePosition ?? null, logs: data?.logs || [], model, providerKey });
}
