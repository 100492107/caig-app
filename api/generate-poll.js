// api/generate-poll.js
// Single status check — GET ?requestId=xxx
// When COMPLETED: downloads image from fal.ai server-side, uploads to
// Supabase Storage, returns permanent publicUrl. Falls back to fal.ai
// URL if storage upload fails.

const FAL_BASE = "https://queue.fal.run/fal-ai/nano-banana-2/requests";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "post-images";

async function ensureBucket() {
  // Create bucket if it doesn't exist (idempotent)
  await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
}

async function storeImage(falUrl, requestId) {
  // Download from fal.ai
  const imgRes = await fetch(falUrl);
  if (!imgRes.ok) throw new Error(`fal.ai image fetch failed: ${imgRes.status}`);
  const blob = await imgRes.arrayBuffer();

  const path = `cara/${requestId}.jpg`;

  // Upload to Supabase Storage
  const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
    },
    body: blob,
  });

  if (!upRes.ok) {
    const errText = await upRes.text();
    throw new Error(`Supabase upload failed (${upRes.status}): ${errText.slice(0, 100)}`);
  }

  // Return public URL
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

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
    return res.status(502).json({ error: "Failed to reach fal.ai status endpoint", detail: e.message });
  }

  const status = statusData?.status || "UNKNOWN";

  if (status === "COMPLETED") {
    // Fetch result from fal.ai
    let resultData;
    try {
      const resultRes = await fetch(`${FAL_BASE}/${requestId}`, {
        headers: { Authorization: `Key ${falKey}` },
      });
      const raw = await resultRes.text();
      resultData = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ status: "FAILED", error: `Result fetch failed: ${e.message}` });
    }

    const falUrl = resultData?.images?.[0]?.url;
    if (!falUrl) {
      const description = resultData?.description || "";
      console.error("[generate-poll] no image URL. desc:", description, JSON.stringify(resultData));
      return res.status(502).json({
        status: "FAILED",
        error: description ? `Blocked by safety filter: ${description}` : "Result had no image URL",
        raw: resultData,
      });
    }

    // Store permanently in Supabase, fall back to fal.ai URL on failure
    let imageUrl = falUrl;
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        await ensureBucket();
        imageUrl = await storeImage(falUrl, requestId);
        console.log("[generate-poll] stored to Supabase:", imageUrl);
      } catch (e) {
        console.warn("[generate-poll] Supabase storage failed, using fal.ai URL:", e.message);
        imageUrl = falUrl;
      }
    }

    return res.status(200).json({ status: "COMPLETED", imageUrl });
  }

  if (status === "FAILED" || status === "NOT_FOUND") {
    console.error("[generate-poll] fal status:", status, requestId);
    return res.status(200).json({ status: "FAILED", error: `fal.ai job ${status.toLowerCase()}` });
  }

  // IN_QUEUE or IN_PROGRESS
  return res.status(200).json({
    status,
    queuePosition: statusData?.queue_position ?? null,
  });
}
