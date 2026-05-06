// api/store-image.js
// Downloads a fal.ai image and stores it permanently in Supabase Storage.
// Called after the image is already displayed in the UI — fire and forget.
// POST { falUrl, requestId, postId }
// Returns { publicUrl }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "post-images";

async function ensureBucket() {
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return res.status(500).json({ error: "Supabase not configured" });

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch { return res.status(400).json({ error: "Invalid JSON" }); }

  const { falUrl, requestId, postId } = body;
  if (!falUrl || !requestId) return res.status(400).json({ error: "falUrl and requestId required" });

  try {
    await ensureBucket();

    const imgRes = await fetch(falUrl);
    if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`);
    const blob = await imgRes.arrayBuffer();

    const path = `cara/${postId || requestId}.jpg`;
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
      throw new Error(`Upload failed (${upRes.status}): ${errText.slice(0, 100)}`);
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    console.log("[store-image] stored:", publicUrl);
    return res.status(200).json({ publicUrl });
  } catch (e) {
    console.error("[store-image] failed:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
