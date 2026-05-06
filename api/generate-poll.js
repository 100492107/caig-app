// api/generate-poll.js
// Polls fal.ai queue for a submitted job's status and result.
// GET /api/generate-poll?requestId=xxx
// Returns: { status: "IN_QUEUE"|"IN_PROGRESS"|"COMPLETED"|"FAILED", imageUrl?, queuePosition? }

const FAL_BASE = "https://queue.fal.run/fal-ai/nano-banana-2/requests";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "FAL_API_KEY not configured" });

  const { requestId } = req.query;
  if (!requestId) return res.status(400).json({ error: "requestId is required" });

  // Check status
  let statusRes, statusData;
  try {
    statusRes = await fetch(`${FAL_BASE}/${requestId}/status`, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    const rawText = await statusRes.text();
    try { statusData = JSON.parse(rawText); }
    catch { return res.status(502).json({ error: "fal.ai status returned non-JSON", raw: rawText.slice(0, 200) }); }
  } catch (e) {
    return res.status(502).json({ error: "Failed to reach fal.ai status endpoint", detail: e.message });
  }

  const status = statusData?.status || "UNKNOWN";

  if (status === "COMPLETED") {
    // Use response_url from status data if available, otherwise construct from requestId
    const resultUrl = statusData?.response_url || `${FAL_BASE}/${requestId}`;

    let resultRes, resultData;
    try {
      resultRes = await fetch(resultUrl, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      const rawResult = await resultRes.text();
      try { resultData = JSON.parse(rawResult); }
      catch { return res.status(502).json({ status: "FAILED", error: "Result returned non-JSON", raw: rawResult.slice(0, 200) }); }
    } catch (e) {
      return res.status(502).json({ error: "Failed to fetch result from fal.ai", detail: e.message });
    }

    const imageUrl = resultData?.images?.[0]?.url;
    if (!imageUrl) {
      // Log full result for debugging
      console.error("[generate-poll] no image URL in result:", JSON.stringify(resultData));
      return res.status(502).json({ status: "FAILED", error: "Result had no image URL", raw: resultData });
    }

    console.log("[generate-poll] COMPLETED:", requestId, imageUrl);
    return res.status(200).json({ status: "COMPLETED", imageUrl });
  }

  if (status === "FAILED" || status === "NOT_FOUND") {
    console.error("[generate-poll] failed/not found:", requestId, status);
    return res.status(200).json({ status: "FAILED", error: `fal.ai job ${status.toLowerCase()}` });
  }

  // IN_QUEUE or IN_PROGRESS
  return res.status(200).json({
    status,
    queuePosition: statusData?.queue_position ?? null,
  });
}
