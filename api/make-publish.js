// Server-side bridge for immediate Creative Engine publishing.
// The Make webhook remains the actual Facebook/Instagram publisher.

const MAKE_WEBHOOK = "https://hook.eu1.make.com/6s3r7qmjnmygmvstp8i6je4rh6jb5cyt";

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = await readBody(req);
    const {
      caption = "",
      imageUrl = null,
      videoUrl = null,
      imageUrls = null,
      postId,
      platform = "all",
      format = videoUrl ? "reel" : (Array.isArray(imageUrls) && imageUrls.length > 1 ? "carousel" : "photo"),
    } = body;

    if (!postId) return res.status(400).json({ error: "postId is required" });
    if (!imageUrl && !videoUrl && !(Array.isArray(imageUrls) && imageUrls.length)) {
      return res.status(400).json({ error: "At least one media URL is required" });
    }

    const r = await fetch(MAKE_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption,
        imageUrl,
        videoUrl,
        imageUrls,
        postId,
        platform,
        format,
      }),
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(502).json({ error: `Make webhook failed (${r.status})`, detail: text.slice(0, 500) });
    }

    return res.status(200).json({ ok: true, makeResponse: text.slice(0, 500) });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Make publish failed" });
  }
}
