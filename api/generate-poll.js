// api/generate-poll.js
// Status polling for image (Grok Imagine Image 2.0) and video (Seedance 2.5).
// Tries both status URL shapes fal has used for subpath models.

const IMAGE_STATUS_CANDIDATES = (requestId) => [
  // Official OpenAPI for v2.0/edit
  `https://queue.fal.run/xai/grok-imagine-image/v2.0/edit/requests/${requestId}/status`,
  // Some fal subpath models strip the leaf segment for status
  `https://queue.fal.run/xai/grok-imagine-image/v2.0/requests/${requestId}/status`,
  // Legacy non-versioned edit
  `https://queue.fal.run/xai/grok-imagine-image/edit/requests/${requestId}/status`,
];

const IMAGE_RESULT_CANDIDATES = (requestId) => [
  `https://queue.fal.run/xai/grok-imagine-image/v2.0/edit/requests/${requestId}`,
  `https://queue.fal.run/xai/grok-imagine-image/v2.0/requests/${requestId}`,
  `https://queue.fal.run/xai/grok-imagine-image/edit/requests/${requestId}`,
];

const VIDEO_BASE = "https://queue.fal.run/bytedance/seedance-2.5/image-to-video/requests";

async function fetchJson(url, falKey) {
  const res = await fetch(url, {
    headers: { Authorization: `Key ${falKey}` },
  });
  const raw = await res.text();
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    /* non-JSON */
  }
  return { res, raw, data };
}

export default async function handler(req, res) {
  const falKey = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!falKey) return res.status(500).json({ error: "FAL key not configured" });

  let requestId, type, statusUrlHint, resultUrlHint;

  if (req.method === "GET") {
    requestId = req.query.requestId;
    type = "image";
    if (!requestId) return res.status(400).json({ error: "requestId is required" });
  } else if (req.method === "POST") {
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
    requestId = body.request_id || body.requestId;
    type = body.type === "video" ? "video" : "image";
    statusUrlHint = body.status_url || body.statusUrl || null;
    resultUrlHint = body.result_url || body.resultUrl || null;
    if (!requestId) return res.status(400).json({ error: "request_id is required" });
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── VIDEO ────────────────────────────────────────────────────────────────
  if (type === "video") {
    const { res: statusRes, raw, data: statusData } = await fetchJson(
      `${VIDEO_BASE}/${requestId}/status`,
      falKey
    );
    if (!statusData) {
      return res.status(502).json({
        error: "fal.ai returned non-JSON (video status)",
        httpStatus: statusRes.status,
        raw: raw.slice(0, 300),
      });
    }
    const status = statusData.status || "UNKNOWN";
    if (status === "COMPLETED") {
      const { data: resultData } = await fetchJson(`${VIDEO_BASE}/${requestId}`, falKey);
      const videoUrl = resultData?.video?.url;
      if (!videoUrl) {
        return res.status(502).json({ status: "FAILED", error: "Result had no video URL" });
      }
      return res.status(200).json({ status: "COMPLETED", url: videoUrl });
    }
    if (status === "FAILED" || status === "NOT_FOUND") {
      return res.status(200).json({ status: "FAILED", error: `fal.ai job ${status.toLowerCase()}` });
    }
    return res.status(200).json({ status, queuePosition: statusData.queue_position ?? null });
  }

  // ── IMAGE — try hint URL first, then candidates ──────────────────────────
  const statusUrls = [];
  if (statusUrlHint) statusUrls.push(statusUrlHint);
  statusUrls.push(...IMAGE_STATUS_CANDIDATES(requestId));

  let statusData = null;
  let usedStatusUrl = null;
  let lastRaw = "";
  let lastHttp = 0;
  const tried = [];

  for (const url of statusUrls) {
    try {
      const { res: r, raw, data } = await fetchJson(url, falKey);
      tried.push({ url, http: r.status, json: !!data, snippet: raw.slice(0, 80) });
      lastRaw = raw;
      lastHttp = r.status;
      if (data && data.status) {
        statusData = data;
        usedStatusUrl = url;
        break;
      }
    } catch (e) {
      tried.push({ url, error: e.message });
    }
  }

  if (!statusData) {
    return res.status(502).json({
      error: "fal.ai returned non-JSON",
      httpStatus: lastHttp,
      raw: lastRaw.slice(0, 400),
      tried,
    });
  }

  const status = statusData.status || "UNKNOWN";

  if (status === "COMPLETED") {
    const resultUrls = [];
    if (resultUrlHint) resultUrls.push(resultUrlHint);
    if (statusData.response_url) resultUrls.push(statusData.response_url);
    // Derive result URL from successful status URL (strip /status)
    if (usedStatusUrl && usedStatusUrl.endsWith("/status")) {
      resultUrls.push(usedStatusUrl.replace(/\/status$/, ""));
    }
    resultUrls.push(...IMAGE_RESULT_CANDIDATES(requestId));

    let falUrl = null;
    const resultTried = [];
    for (const url of resultUrls) {
      try {
        const { data, raw, res: r } = await fetchJson(url, falKey);
        resultTried.push({ url, http: r.status, hasImages: !!(data?.images?.[0]?.url) });
        const u = data?.images?.[0]?.url;
        if (u) {
          falUrl = u;
          break;
        }
        // Sometimes result is nested
        const u2 = data?.data?.images?.[0]?.url;
        if (u2) {
          falUrl = u2;
          break;
        }
      } catch (e) {
        resultTried.push({ url, error: e.message });
      }
    }

    if (!falUrl) {
      return res.status(502).json({
        status: "FAILED",
        error: "Result had no image URL",
        resultTried,
      });
    }
    console.log("[poll] image COMPLETED (Grok 2.0):", requestId, falUrl, "via", usedStatusUrl);
    return res.status(200).json({ status: "COMPLETED", imageUrl: falUrl, url: falUrl });
  }

  if (status === "FAILED" || status === "NOT_FOUND") {
    return res.status(200).json({
      status: "FAILED",
      error: `fal.ai job ${status.toLowerCase()}`,
    });
  }

  return res.status(200).json({
    status,
    queuePosition: statusData.queue_position ?? null,
    via: usedStatusUrl,
  });
}
