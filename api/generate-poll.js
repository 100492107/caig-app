// api/generate-poll.js
// Handles status polling for both image (nano-banana-2) and video (Kling) fal.ai jobs.
// GET ?requestId=xxx              → image poll (existing behaviour, unchanged)
// POST { request_id, type }       → image or video poll (new)

const FAL_BASES = {
  image: "https://queue.fal.run/fal-ai/nano-banana-2/requests",
  video: "https://queue.fal.run/fal-ai/kling-video/v2.5/turbo/image-to-video/requests",
};

export default async function handler(req, res) {
  const falKey = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!falKey) return res.status(500).json({ error: "FAL key not configured" });

  // ── Resolve request ID and type ──────────────────────────────────────────
  let requestId, type;

  if (req.method === "GET") {
    // Legacy image polling — preserve exactly
    requestId = req.query.requestId;
    type = "image";
    if (!requestId) return res.status(400).json({ error: "requestId is required" });

  } else if (req.method === "POST") {
    let body;
    try {
      body = await new Promise((resolve, reject) => {
        let d = "";
        req.on("data", c => d += c);
        req.on("end", () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
        req.on("error", reject);
      });
    } catch(e) { return res.status(400).json({ error: "Invalid JSON" }); }

    requestId = body.request_id;
    type = body.type === "video" ? "video" : "image";
    if (!requestId) return res.status(400).json({ error: "request_id is required" });

  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const FAL_BASE = FAL_BASES[type];

  // ── Check status ──────────────────────────────────────────────────────────
  let statusData;
  try {
    const statusRes = await fetch(`${FAL_BASE}/${requestId}/status`, {
      headers: { Authorization: `Key ${falKey}` },
    });
    const rawText = await statusRes.text();
    try { statusData = JSON.parse(rawText); }
    catch { return res.status(502).json({ error: "fal.ai returned non-JSON", raw: rawText.slice(0, 200) }); }
  } catch(e) {
    return res.status(502).json({ error: "Failed to reach fal.ai", detail: e.message });
  }

  const status = statusData?.status || "UNKNOWN";

  if (status === "COMPLETED") {
    let resultData;
    try {
      const resultRes = await fetch(`${FAL_BASE}/${requestId}`, {
        headers: { Authorization: `Key ${falKey}` },
      });
      resultData = await resultRes.json();
    } catch(e) {
      return res.status(502).json({ status: "FAILED", error: `Result fetch failed: ${e.message}` });
    }

    if (type === "video") {
      // Kling returns video.url
      const videoUrl = resultData?.video?.url;
      if (!videoUrl) {
        console.error("[poll] no video URL:", JSON.stringify(resultData).slice(0, 300));
        return res.status(502).json({ status: "FAILED", error: "Result had no video URL" });
      }
      console.log("[poll] video COMPLETED:", requestId, videoUrl);
      return res.status(200).json({ status: "COMPLETED", url: videoUrl });
    }

    // Image — existing behaviour
    const falUrl = resultData?.images?.[0]?.url;
    if (!falUrl) {
      const description = resultData?.description || "";
      console.error("[poll] no image URL. desc:", description);
      return res.status(502).json({
        status: "FAILED",
        error: description ? `Blocked by safety filter: ${description}` : "Result had no image URL",
      });
    }
    console.log("[poll] image COMPLETED:", requestId, falUrl);
    // imageUrl for backward compat with existing frontend, url for new generic polling
    return res.status(200).json({ status: "COMPLETED", imageUrl: falUrl, url: falUrl });
  }

  if (status === "FAILED" || status === "NOT_FOUND") {
    return res.status(200).json({ status: "FAILED", error: `fal.ai job ${status.toLowerCase()}` });
  }

  // IN_QUEUE or IN_PROGRESS
  return res.status(200).json({ status, queuePosition: statusData?.queue_position ?? null });
}
