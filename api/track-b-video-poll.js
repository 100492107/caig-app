// Track B fal.ai Wan queue status/result proxy. Keeps FAL credentials server-side.

const MODEL = "fal-ai/wan-i2v";
const BASE = `https://queue.fal.run/${MODEL}/requests`;

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

  const requestId = body?.requestId;
  const action = body?.action || "status";
  if (!requestId) return res.status(400).json({ error: "requestId is required" });

  const suffix = action === "result" ? "" : "/status";
  const upstream = await fetch(`${BASE}/${encodeURIComponent(requestId)}${suffix}`, {
    headers: { Authorization: `Key ${key}` },
  });
  const text = await upstream.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!upstream.ok) return res.status(502).json({ error: "fal.ai video poll failed", status: upstream.status, detail: data });

  if (action === "result") {
    return res.status(200).json({
      status: "COMPLETED",
      videoUrl: data?.video?.url || data?.data?.video?.url || data?.output?.video?.url || null,
      data,
    });
  }

  const status = data?.status || "IN_QUEUE";
  return res.status(200).json({
    status,
    queuePosition: data?.queue_position ?? data?.queuePosition ?? null,
    logs: data?.logs || [],
  });
}
