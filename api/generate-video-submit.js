export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return res.status(500).json({ error: "FAL_KEY not configured" });

  let body;
  try {
    body = await new Promise((resolve, reject) => {
      let d = "";
      req.on("data", c => d += c);
      req.on("end", () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
      req.on("error", reject);
    });
  } catch(e) { return res.status(400).json({ error: "Invalid JSON" }); }

  const { imageUrl, postId } = body;
  if (!imageUrl) return res.status(400).json({ error: "imageUrl required" });

  const motionPrompt = "subtle natural movement, gentle breathing, hair shifts slightly in a light breeze, eyes blink naturally, micro-expressions, photorealistic, handheld camera feel, authentic lifestyle energy";

  try {
    const response = await fetch("https://queue.fal.run/fal-ai/kling-video/v2.5/turbo/image-to-video", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: motionPrompt,
        duration: "5",
        aspect_ratio: "9:16",
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.detail || "Kling submission failed" });

    return res.status(200).json({ request_id: data.request_id, type: "video", postId });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
