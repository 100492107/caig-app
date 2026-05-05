// api/queue-update.js
// Server-side queue row updater — bypasses RLS using service role key.
// Used for: schedule (status=ready), reject (status=rejected), image_url save.

const SUPABASE_URL = "https://zvyioxhwdyocaanzcgqf.supabase.co";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" });

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { id, update } = body;
  if (!id || !update || typeof update !== "object") {
    return res.status(400).json({ error: "id and update object required" });
  }

  // PATCH the row using the REST API with service role key
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/content_queue?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(update),
    }
  );

  if (!patchRes.ok) {
    const err = await patchRes.text();
    console.error("queue-update error:", patchRes.status, err);
    return res.status(patchRes.status).json({ error: `Supabase update failed: ${err}` });
  }

  return res.status(200).json({ success: true });
}
