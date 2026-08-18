// Track B video status/result proxy for Seedance 2.5 and fal.ai Wan.

const WAN_MODEL = "fal-ai/wan-i2v";
const WAN_BASE = `https://queue.fal.run/${WAN_MODEL}/requests`;
const SEEDANCE_BASE = "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks";

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body;
  try { body = await parseBody(req); }
  catch { return res.status(400).json({ error: "Invalid JSON request body" }); }

  const requestId = body?.requestId;
  const action = body?.action || "status";
  const provider = body?.provider || "wan";
  if (!requestId) return res.status(400).json({ error: "requestId is required" });

  if (provider === "seedance_2_5") {
    const key = process.env.ARK_API_KEY || process.env.BYTEPLUS_API_KEY;
    if (!key) return res.status(500).json({ error: "ARK_API_KEY/BYTEPLUS_API_KEY is not configured" });
    const upstream = await fetch(`${SEEDANCE_BASE}/${encodeURIComponent(requestId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!upstream.ok) return res.status(502).json({ error: "Seedance video poll failed", status: upstream.status, detail: data });

    const rawStatus = String(data?.status || "").toLowerCase();
    const status = rawStatus === "succeeded" ? "COMPLETED" : rawStatus === "failed" ? "FAILED" : rawStatus === "cancelled" ? "CANCELLED" : rawStatus === "queued" ? "IN_QUEUE" : "IN_PROGRESS";
    const videoUrl = data?.content?.video_url || data?.content?.videoUrl || data?.video_url || null;
    if (action === "result") return res.status(200).json({ status: status === "COMPLETED" ? "COMPLETED" : status, videoUrl, data });
    return res.status(200).json({ status, videoUrl, logs: data?.logs || [], rawStatus });
  }

  const key = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!key) return res.status(500).json({ error: "FAL_API_KEY/FAL_KEY is not configured" });
  const suffix = action === "result" ? "" : "/status";
  const upstream = await fetch(`${WAN_BASE}/${encodeURIComponent(requestId)}${suffix}`, {
    headers: { Authorization: `Key ${key}` },
  });
  const text = await upstream.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!upstream.ok) return res.status(502).json({ error: "fal.ai video poll failed", status: upstream.status, detail: data });
  if (action === "result") {
    return res.status(200).json({ status: "COMPLETED", videoUrl: data?.video?.url || data?.data?.video?.url || data?.output?.video?.url || null, data });
  }
  return res.status(200).json({ status: data?.status || "IN_QUEUE", queuePosition: data?.queue_position ?? data?.queuePosition ?? null, logs: data?.logs || [] });
}
