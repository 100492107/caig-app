// api/generate-poll.js
// Two modes:
//   GET ?requestId=xxx&wait=1  — server-side poll loop (waits up to 55s, returns imageUrl when done)
//   GET ?requestId=xxx          — single status check (legacy, still works)
//
// The wait=1 mode is preferred: one browser call → server polls fal.ai → returns final result.
// Avoids browser timer throttling killing the poll loop in backgrounded/mobile tabs.

const FAL_BASE = "https://queue.fal.run/fal-ai/nano-banana-2/requests";
const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 54000; // stay under Vercel 60s limit

async function fetchResult(requestId, apiKey) {
  const resultRes = await fetch(`${FAL_BASE}/${requestId}`, {
    headers: { Authorization: `Key ${apiKey}` },
  });
  const raw = await resultRes.text();
  let data;
  try { data = JSON.parse(raw); }
  catch { return { error: "Result returned non-JSON", raw: raw.slice(0, 200) }; }
  return data;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "FAL_API_KEY not configured" });

  const { requestId, wait } = req.query;
  if (!requestId) return res.status(400).json({ error: "requestId is required" });

  const serverWait = wait === "1";
  const deadline = Date.now() + MAX_WAIT_MS;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Check status
    let statusData;
    try {
      const statusRes = await fetch(`${FAL_BASE}/${requestId}/status`, {
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
      const resultData = await fetchResult(requestId, apiKey);
      if (resultData.error) return res.status(502).json({ status: "FAILED", error: resultData.error, raw: resultData.raw });

      const imageUrl = resultData?.images?.[0]?.url;
      if (!imageUrl) {
        const description = resultData?.description || "";
        console.error("[generate-poll] no image URL. description:", description, "full:", JSON.stringify(resultData));
        return res.status(502).json({
          status: "FAILED",
          error: description ? `Blocked by safety filter: ${description}` : "Result had no image URL",
          raw: resultData,
        });
      }

      console.log("[generate-poll] COMPLETED:", requestId, imageUrl);
      return res.status(200).json({ status: "COMPLETED", imageUrl });
    }

    if (status === "FAILED" || status === "NOT_FOUND") {
      console.error("[generate-poll] fal status:", status, requestId);
      return res.status(200).json({ status: "FAILED", error: `fal.ai job ${status.toLowerCase()}` });
    }

    // IN_QUEUE or IN_PROGRESS
    if (!serverWait) {
      // Single-check mode — return status immediately
      return res.status(200).json({
        status,
        queuePosition: statusData?.queue_position ?? null,
      });
    }

    // Server-wait mode — check if we still have time left
    if (Date.now() + POLL_INTERVAL_MS > deadline) {
      return res.status(200).json({ status: "IN_PROGRESS", timedOut: true });
    }

    // Wait before next poll
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}
