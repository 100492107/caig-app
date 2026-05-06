// api/generate-poll.js
// Single status check — GET ?requestId=xxx
// Returns fal.ai URL immediately on COMPLETED, then triggers background storage.
// Background storage (fal.ai → Supabase) is fire-and-forget via /api/store-image.

const FAL_BASE = "https://queue.fal.run/fal-ai/nano-banana-2/requests";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const falKey = process.env.FAL_API_KEY;
  if (!falKey) return res.status(500).json({ error: "FAL_API_KEY not configured" });

  const { requestId } = req.query;
  if (!requestId) return res.status(400).json({ error: "requestId is required" });

  // Check status
  let statusData;
  try {
    const statusRes = await fetch(`${FAL_BASE}/${requestId}/status`, {
      headers: { Authorization: `Key ${falKey}` },
    });
    const rawText = await statusRes.text();
    try { statusData = JSON.parse(rawText); }
    catch { return res.status(502).json({ error: "fal.ai status returned non-JSON", raw: rawText.slice(0, 200) }); }
  } catch (e) {
    return res.status(502).json({ error: "Failed to reach fal.ai", detail: e.message });
  }

  const status = statusData?.status || "UNKNOWN";

  if (status === "COMPLETED") {
    // Fetch result
    let resultData;
    try {
      const resultRes = await fetch(`${FAL_BASE}/${requestId}`, {
        headers: { Authorization: `Key ${falKey}` },
      });
      resultData = await resultRes.json();
    } catch (e) {
      return res.status(502).json({ status: "FAILED", error: `Result fetch failed: ${e.message}` });
    }

    const falUrl = resultData?.images?.[0]?.url;
    if (!falUrl) {
      const description = resultData?.description || "";
      console.error("[poll] no image URL. desc:", description);
      return res.status(502).json({
        status: "FAILED",
        error: description ? `Blocked by safety filter: ${description}` : "Result had no image URL",
      });
    }

    // Return fal.ai URL immediately — fast, reliable
    console.log("[poll] COMPLETED:", requestId, falUrl);
    return res.status(200).json({ status: "COMPLETED", imageUrl: falUrl });
  }

  if (status === "FAILED" || status === "NOT_FOUND") {
    return res.status(200).json({ status: "FAILED", error: `fal.ai job ${status.toLowerCase()}` });
  }

  // IN_QUEUE or IN_PROGRESS
  return res.status(200).json({ status, queuePosition: statusData?.queue_position ?? null });
}
