// api/generate-poll.js
// Status polling for image (Grok Imagine Image 2.0) and video (Seedance 2.5) fal.ai jobs.
// GET  ?requestId=xxx              → image poll (legacy)
// POST { request_id, type }        → image or video poll

const FAL_BASES = {
  // Grok Imagine Image 2.0 edit pipeline
  image: "https://queue.fal.run/xai/grok-imagine-image/v2.0/edit/requests",
  // Seedance 2.5 image-to-video
  video: "https://queue.fal.run/bytedance/seedance-2.5/image-to-video/requests",
};

export default async function handler(req, res) {
  const falKey = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!falKey) return res.status(500).json({ error: "FAL key not configured" });

  let requestId, type;

  if (req.method === "GET") {
    requestId = req.query.requestId;
    type = "image";
    if (!requestId) return res.status(400).json({ error: "requestId is required" });
  } else if (req.method === "POST") {
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
    requestId = body.request_id;
    type = body.type === "video" ? "video" : "image";
    if (!requestId) return res.status(400).json({ error: "request_id is required" });
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const FAL_BASE = FAL_BASES[type];

  let statusData;
  try {
    const statusRes = await fetch(`${FAL_BASE}/${requestId}/status`, {
      headers: { Authorization: `Key ${falKey}` },
    });
    const rawText = await statusRes.text();
    try {
      statusData = JSON.parse(rawText);
    } catch {
      return res.status(502).json({
        error: "fal.ai returned non-JSON",
        httpStatus: statusRes.status,
        raw: rawText.slice(0, 300),
        polled: `${FAL_BASE}/${requestId}/status`,
      });
    }
  } catch (e) {
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
    } catch (e) {
      return res.status(502).json({
        status: "FAILED",
        error: `Result fetch failed: ${e.message}`,
      });
    }

    if (type === "video") {
      const videoUrl = resultData?.video?.url;
      if (!videoUrl) {
        console.error("[poll] no video URL:", JSON.stringify(resultData).slice(0, 300));
        return res.status(502).json({
          status: "FAILED",
          error: "Result had no video URL",
        });
      }
      console.log("[poll] video COMPLETED (Seedance 2.5):", requestId, videoUrl);
      return res.status(200).json({ status: "COMPLETED", url: videoUrl });
    }

    // Image — Grok 2.0 returns images[0].url
    const falUrl = resultData?.images?.[0]?.url;
    if (!falUrl) {
      const description = resultData?.detail || resultData?.description || "";
      console.error("[poll] no image URL. body:", JSON.stringify(resultData).slice(0, 400));
      return res.status(502).json({
        status: "FAILED",
        error: description
          ? `Blocked or empty result: ${typeof description === "string" ? description : JSON.stringify(description)}`
          : "Result had no image URL",
      });
    }
    console.log("[poll] image COMPLETED (Grok 2.0):", requestId, falUrl);
    return res.status(200).json({
      status: "COMPLETED",
      imageUrl: falUrl,
      url: falUrl,
    });
  }

  if (status === "FAILED" || status === "NOT_FOUND") {
    return res.status(200).json({
      status: "FAILED",
      error: `fal.ai job ${status.toLowerCase()}`,
    });
  }

  return res.status(200).json({
    status,
    queuePosition: statusData?.queue_position ?? null,
  });
}
