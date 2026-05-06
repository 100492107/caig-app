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

  // First check status
  let statusRes, statusData;
  try {
    statusRes = await fetch(`${FAL_BASE}/${requestId}/status`, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    statusData = await statusRes.json();
  } catch (e) {
    return res.status(502).json({ error: "Failed to reach fal.ai status endpoint", detail: e.message });
  }

  const status = statusData?.status || "UNKNOWN";

  if (status === "COMPLETED") {
    // Fetch the actual result
    let resultRes, resultData;
    try {
      resultRes = await fetch(`${FAL_BASE}/${requestId}`, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      resultData = await resultRes.json();
    } catch (e) {
      return res.status(502).json({ error: "Failed to fetch result from fal.ai", detail: e.message });
    }

    const imageUrl = resultData?.images?.[0]?.url;
    if (!imageUrl) {
      return res.status(502).json({ status: "FAILED", error: "Result had no image URL", raw: resultData });
    }

    console.log("[generate-poll] COMPLETED:", requestId, imageUrl);
    return res.status(200).json({ status: "COMPLETED", imageUrl });
  }

  if (status === "FAILED") {
    console.error("[generate-poll] FAILED:", requestId, JSON.stringify(statusData));
    return res.status(200).json({ status: "FAILED", error: statusData?.error || "Generation failed on fal.ai" });
  }

  // Still IN_QUEUE or IN_PROGRESS
  return res.status(200).json({
    status,
    queuePosition: statusData?.queue_position ?? null,
  });
}
