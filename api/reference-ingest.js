import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function clean(value) {
  return String(value || "").replace(/\\s+/g, " ").trim();
}

function sourcePlatform(value) {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\\./, "");
    if (host === "pin.it" || host.endsWith("pinterest.com")) return "pinterest";
    if (host.includes("vinted.")) return "vinted";
    if (host.endsWith("depop.com")) return "depop";
  } catch {}
  return "other";
}

function getMeta(html, key) {
  const patterns = [
    new RegExp('<meta[^>]+property=["\\\']' + key + '["\\\'][^>]+content=["\\\']([^"\\\']+)["\\\'][^>]*>', "i"),
    new RegExp('<meta[^>]+content=["\\\']([^"\\\']+)["\\\'][^>]+property=["\\\']' + key + '["\\\'][^>]*>', "i"),
    new RegExp('<meta[^>]+name=["\\\']' + key + '["\\\'][^>]+content=["\\\']([^"\\\']+)["\\\'][^>]*>', "i"),
    new RegExp('<meta[^>]+content=["\\\']([^"\\\']+)["\\\'][^>]+name=["\\\']' + key + '["\\\'][^>]*>', "i")
  ];
  for (const re of patterns) {
    const match = String(html || "").match(re);
    if (match && match[1]) return clean(match[1]);
  }
  return "";
}

async function persistReferenceImage(imageUrl, ownerId) {
  if (!imageUrl) return { url: null, storagePath: null, error: null };
  try {
    const response = await fetch(imageUrl, {
      redirect: "follow",
      headers: { "User-Agent": "CornerstoneAI/1.0 reference-board image", Accept: "image/avif,image/webp,image/jpeg,image/png,*/*" },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error("Image source returned " + response.status + ".");
    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.toLowerCase().startsWith("image/")) throw new Error("Source preview is not an image.");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 10 * 1024 * 1024) throw new Error("Reference image is larger than 10 MB.");
    const bucket = "visual-reference-assets";
    await fetch(SUPABASE_URL + "/storage/v1/bucket", {
      method: "POST",
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ id: bucket, name: bucket, public: true })
    }).catch(() => {});
    const ext = /png/i.test(contentType) ? "png" : /webp/i.test(contentType) ? "webp" : "jpg";
    const storagePath = ownerId + "/" + crypto.randomUUID() + "." + ext;
    const upload = await fetch(SUPABASE_URL + "/storage/v1/object/" + bucket + "/" + storagePath, {
      method: "POST",
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY, "Content-Type": contentType, "x-upsert": "true" },
      body: buffer
    });
    if (!upload.ok) throw new Error("Reference image upload failed (" + upload.status + ").");
    return { url: SUPABASE_URL + "/storage/v1/object/public/" + bucket + "/" + storagePath, storagePath, error: null };
  } catch (error) {
    return { url: null, storagePath: null, error: error && error.message ? error.message : String(error) };
  }
}

function categoryHint(text) {
  const value = String(text || "").toLowerCase();
  if (/mirror|selfie|pose|posing|walking|standing|seated|sitting|grwm|outfit check/.test(value)) return "pose";
  if (/dress|jean|denim|coat|jacket|blazer|skirt|trouser|shirt|top|knit|hoodie|cardigan|boot|sneaker|loafer|bag|leather|silk|cotton|wool/.test(value)) return "wardrobe";
  if (/cafe|kitchen|bedroom|hotel|street|gym|beach|terrace|desk|office|travel|restaurant|bathroom/.test(value)) return "scene";
  if (/earring|necklace|bracelet|watch|ring|sunglasses|belt|scarf/.test(value)) return "accessory";
  return "mixed";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "Supabase is not configured." });

  const token = String(req.headers.authorization || "").replace(/^Bearer\\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "Sign in is required." });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = await admin.auth.getUser(token);
  if (auth.error || !auth.data.user) return res.status(401).json({ error: "Session is invalid or expired." });

  const body = (req.body && typeof req.body === "object") ? req.body : {};
  const pageUrl = String(body.url || "").trim();
  if (!pageUrl) return res.status(400).json({ error: "A public source URL is required." });

  let parsed;
  try { parsed = new URL(pageUrl); } catch { return res.status(400).json({ error: "That URL is not valid." }); }
  if (!/^https?:$/.test(parsed.protocol)) return res.status(400).json({ error: "Only HTTP(S) URLs are supported." });

  const source = sourcePlatform(pageUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const upstream = await fetch(pageUrl, {
      redirect: "follow",
      headers: { "User-Agent": "CornerstoneAI/1.0 reference-board", "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8" },
      signal: controller.signal
    });
    if (!upstream.ok) return res.status(502).json({ error: "Source page returned " + upstream.status + ".", source_platform: source });
    const type = upstream.headers.get("content-type") || "";
    if (!type.includes("text/html")) return res.status(415).json({ error: "The source is not an HTML page.", source_platform: source });

    const html = (await upstream.text()).slice(0, 1000000);
    const sourceImageUrl = clean(body.image_url || getMeta(html, "og:image") || getMeta(html, "twitter:image"));
    const storedImage = await persistReferenceImage(sourceImageUrl, auth.data.user.id);
    const imageUrl = storedImage.url || sourceImageUrl;
    const title = clean(body.title || getMeta(html, "og:title") || getMeta(html, "twitter:title"));
    const description = clean(body.description || getMeta(html, "og:description") || getMeta(html, "description"));
    const canonical = clean(getMeta(html, "og:url") || upstream.url || pageUrl);
    const category = categoryHint(title + " " + description);
    const recipe = {
      category,
      source,
      inspiration_mode: "structure_only",
      wardrobe: { silhouette: "", garments: [], materials: [], colours: [], fit: "", details: "" },
      pose: { family: "", geometry: "", crop: "", gaze: "", hands: "" },
      environment: { setting: "", lived_in_details: [], lighting: "" },
      composition: { camera_height: "", perspective: "", framing: "", subject_position: "" },
      instruction: "Use this reference for visual structure only. Preserve the selected Cornerstone creator identity and create an original scene."
    };

    return res.status(200).json({
      ok: true,
      owner_id: auth.data.user.id,
      source_platform: source,
      source_url: pageUrl,
      canonical_url: canonical,
      image_url: imageUrl || null,
      title: title || null,
      description: description || null,
      structured_data: {
        source,
        requested_url: pageUrl,
        resolved_url: upstream.url || pageUrl,
        title: title || null,
        description: description || null,
        image_url: imageUrl || null,
        storage_path: storedImage.storagePath || null,
        source_image_url: sourceImageUrl || null,
        image_persistence_error: storedImage.error || null,
        retrieved_at: new Date().toISOString()
      },
      recipe,
      can_analyse_image: Boolean(imageUrl),
      note: source === "pinterest"
        ? "Public Pin metadata captured. Pinterest API access remains optional."
        : "Public page metadata captured; no private marketplace API is required."
    });
  } catch (error) {
    return res.status(502).json({
      error: error && error.name === "AbortError" ? "Source page timed out." : (error && error.message || "Could not read that public page."),
      source_platform: source
    });
  } finally {
    clearTimeout(timer);
  }
}
