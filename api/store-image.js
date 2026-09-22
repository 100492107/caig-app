// api/store-image.js
// Stores generated images in Supabase Storage.
// Existing mode: falUrl + requestId.
// Qwen mode: provider=qwen-image-2.1, generated through the hosted Space.
// Keeping both modes in one Vercel Function avoids exceeding Hobby's function limit.
// and registers the generated asset in the Track B asset library.
// POST { falUrl, requestId, postId, slideIndex?, personaName?, metadata? }
// Returns { publicUrl, slideIndex }

import { generateQwenImageServer } from "../shared/qwen-image-provider.js";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "post-images";
const WORKSPACE_SLUG = "cornerstoneaiassets-internal";

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

async function supabaseRest(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
}

async function resolveWorkspace() {
  const lookup = await supabaseRest(`track_b_workspaces?slug=eq.${encodeURIComponent(WORKSPACE_SLUG)}&select=id&limit=1`);
  if (!lookup.ok) return null;
  const rows = await lookup.json().catch(() => []);
  if (rows?.[0]?.id) return rows[0].id;

  const create = await supabaseRest("track_b_workspaces", {
    method: "POST",
    body: JSON.stringify({ name: "CornerstoneAIAssets Internal", slug: WORKSPACE_SLUG, workspace_type: "internal" }),
  });
  if (!create.ok) return null;
  const created = await create.json().catch(() => []);
  return created?.[0]?.id || null;
}

function referenceSourcePlatform(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const pathName = parsed.pathname.toLowerCase();
    if (host === "pin.it" || host.endsWith("pinterest.com")) return "pinterest";
    if (host.includes("vinted.")) return "vinted";
    if (host.endsWith("depop.com")) return "depop";
    if (host === "temu.com" || host.endsWith(".temu.com")) return "temu";
    if (host === "alibaba.com" || host.endsWith(".alibaba.com")) return "alibaba";
    if (host === "shop.tiktok.com" || (host.endsWith("tiktok.com") && pathName.includes("/shop/"))) return "tiktok_shop";
    if (host.endsWith("tiktok.com") || host === "ads.tiktok.com") return "tiktok";
  } catch {}
  return "other";
}

function referenceClean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function referenceMeta(html, key) {
  const patterns = [
    new RegExp('<meta[^>]+property=["\\\']' + key + '["\\\'][^>]+content=["\\\']([^"\\\']+)["\\\'][^>]*>', "i"),
    new RegExp('<meta[^>]+content=["\\\']([^"\\\']+)["\\\'][^>]+property=["\\\']' + key + '["\\\'][^>]*>', "i"),
    new RegExp('<meta[^>]+name=["\\\']' + key + '["\\\'][^>]+content=["\\\']([^"\\\']+)["\\\'][^>]*>', "i"),
    new RegExp('<meta[^>]+content=["\\\']([^"\\\']+)["\\\'][^>]+name=["\\\']' + key + '["\\\'][^>]*>', "i")
  ];
  for (const re of patterns) {
    const match = String(html || "").match(re);
    if (match && match[1]) return referenceClean(match[1]);
  }
  return "";
}

function referenceCategoryHint(text) {
  const value = String(text || "").toLowerCase();
  if (/mirror|selfie|pose|posing|walking|standing|seated|sitting|grwm|outfit check/.test(value)) return "pose";
  if (/dress|jean|denim|coat|jacket|blazer|skirt|trouser|shirt|top|knit|hoodie|cardigan|boot|sneaker|loafer|bag|leather|silk|cotton|wool/.test(value)) return "wardrobe";
  if (/cafe|kitchen|bedroom|hotel|street|gym|beach|terrace|desk|office|travel|restaurant|bathroom/.test(value)) return "scene";
  if (/earring|necklace|bracelet|watch|ring|sunglasses|belt|scarf/.test(value)) return "accessory";
  return "mixed";
}

async function persistReferenceImage(imageUrl, ownerId, bucket = "visual-reference-assets") {
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
    await fetch(SUPABASE_URL + "/storage/v1/bucket", {
      method: "POST",
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: "Bearer " + SUPABASE_SERVICE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ id: bucket, name: bucket, public: true })
    }).catch(() => {});
    const extension = /png/i.test(contentType) ? "png" : /webp/i.test(contentType) ? "webp" : "jpg";
    const storagePath = ownerId + "/" + crypto.randomUUID() + "." + extension;
    const upload = await fetch(SUPABASE_URL + "/storage/v1/object/" + bucket + "/" + storagePath, {
      method: "POST",
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: "Bearer " + SUPABASE_SERVICE_KEY, "Content-Type": contentType, "x-upsert": "true" },
      body: buffer
    });
    if (!upload.ok) throw new Error("Reference image upload failed (" + upload.status + ").");
    return { url: SUPABASE_URL + "/storage/v1/object/public/" + bucket + "/" + storagePath, storagePath, error: null };
  } catch (error) {
    return { url: null, storagePath: null, error: error?.message || String(error) };
  }
}

function jsonLdProducts(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi;
  let match;
  while ((match = re.exec(String(html || ""))) && blocks.length < 12) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const push = (value) => Array.isArray(value) ? value.forEach(push) : (value && typeof value === "object" ? blocks.push(value) : null);
      push(parsed);
    } catch {}
  }
  return blocks.flatMap((item) => {
    if (item["@graph"] && Array.isArray(item["@graph"])) return item["@graph"].filter(Boolean);
    return [item];
  });
}

function firstProductJson(html) {
  return jsonLdProducts(html).find((item) => String(item?.["@type"] || "").toLowerCase() === "product" || item?.name && (item?.offers || item?.brand));
}

function productOfferValue(offers) {
  const offer = Array.isArray(offers) ? offers.find(Boolean) : offers;
  if (!offer || typeof offer !== "object") return {};
  const price = Number(offer.price ?? offer.lowPrice ?? offer.highPrice);
  return {
    price_amount: Number.isFinite(price) ? price : null,
    price_currency: referenceClean(offer.priceCurrency || ""),
    availability: referenceClean(offer.availability || "").replace(/^https?:\\/\\/schema.org\\//, "")
  };
}

function numberFromText(html, patterns) {
  for (const pattern of patterns) {
    const match = String(html || "").match(pattern);
    if (!match) continue;
    const value = Number(String(match[1]).replace(/[^0-9.]/g, ""));
    if (Number.isFinite(value)) return value;
  }
  return null;
}

async function handleCommerceIngest(body, ownerId) {
  const pageUrl = String(body.url || "").trim();
  if (!pageUrl) throw new Error("A public source URL is required.");
  let parsed;
  try { parsed = new URL(pageUrl); } catch { throw new Error("That URL is not valid."); }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Only HTTP(S) URLs are supported.");
  const source = referenceSourcePlatform(pageUrl);
  const host = parsed.hostname.toLowerCase().replace(/^www\\./, "");
  const allowedHost =
    host === "temu.com" || host.endsWith(".temu.com") ||
    host === "alibaba.com" || host.endsWith(".alibaba.com") ||
    host === "shop.tiktok.com" || host.endsWith("tiktok.com") ||
    host === "pin.it" || host.endsWith("pinterest.com") ||
    host.includes("vinted.") || host.endsWith("depop.com");
  if (!allowedHost) throw new Error("Commerce ingestion supports TikTok Shop, TikTok, Temu, Alibaba, Pinterest, Vinted and Depop public URLs.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const upstream = await fetch(pageUrl, {
      redirect: "follow",
      headers: { "User-Agent": "CornerstoneAI/1.0 commerce-intelligence metadata fetch", Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8" },
      signal: controller.signal
    });
    if (!upstream.ok) throw new Error("Source page returned " + upstream.status + ".");
    const type = upstream.headers.get("content-type") || "";
    if (!type.includes("text/html")) throw new Error("The source is not an HTML page.");
    const html = (await upstream.text()).slice(0, 1200000);
    const sourceImageUrl = referenceClean(body.image_url || referenceMeta(html, "og:image") || referenceMeta(html, "twitter:image"));
    const storedImage = await persistReferenceImage(sourceImageUrl, ownerId, "commerce-assets");
    const imageUrl = storedImage.url || sourceImageUrl;
    const title = referenceClean(body.title || referenceMeta(html, "og:title") || referenceMeta(html, "twitter:title"));
    const description = referenceClean(body.description || referenceMeta(html, "og:description") || referenceMeta(html, "description"));
    const canonicalUrl = referenceClean(referenceMeta(html, "og:url") || upstream.url || pageUrl);
    const product = firstProductJson(html);
    const offer = productOfferValue(product?.offers);
    const rating = Number(product?.aggregateRating?.ratingValue);
    const reviewCount = Number(product?.aggregateRating?.reviewCount || product?.aggregateRating?.ratingCount);
    const sourceProductId = referenceClean(product?.sku || product?.productID || "");
    const brand = referenceClean(typeof product?.brand === "object" ? product.brand?.name : product?.brand);
    const soldCount = numberFromText(html, [/([0-9][0-9,.]*)\\s*(?:sold|sales)/i, /(?:sold|sales)\\s*[:\\-]?\\s*([0-9][0-9,.]*)/i]);
    const metricValue = source === "tiktok" && /creativecenter|trends|hashtag|inspiration/i.test(pageUrl)
      ? numberFromText(html, /([0-9][0-9,.]*)\\s*(?:posts|views)/i)
      : null;
    const signalType = source === "tiktok" ? "trend" : (source === "pinterest" || source === "vinted" || source === "depop" ? "visual" : "product");
    const category = referenceCategoryHint(title + " " + description);
    const tags = [source, signalType, category].filter(Boolean);
    const affiliateRoute =
      source === "temu" ? "temu_affiliate_candidate" :
      source === "tiktok_shop" ? "tiktok_shop_candidate" :
      source === "alibaba" ? "supplier_research" :
      null;
    return {
      ok: true,
      owner_id: ownerId,
      source_platform: source,
      signal_type: signalType,
      source_url: pageUrl,
      canonical_url: canonicalUrl,
      image_url: imageUrl || null,
      title: title || (product?.name ? referenceClean(product.name) : null),
      description: description || (product?.description ? referenceClean(product.description) : null),
      product_id: sourceProductId || null,
      shop_name: source === "tiktok_shop" ? referenceClean(product?.seller?.name || product?.offers?.seller?.name || "") || null : null,
      brand: brand || null,
      price_amount: offer.price_amount,
      price_currency: offer.price_currency || null,
      availability: offer.availability || null,
      rating: Number.isFinite(rating) ? rating : null,
      review_count: Number.isFinite(reviewCount) ? reviewCount : null,
      sold_count: Number.isFinite(soldCount) ? soldCount : null,
      metric_name: metricValue != null ? "public_metric" : null,
      metric_value: metricValue,
      metric_window: /period=([0-9]+)/i.test(pageUrl) ? (pageUrl.match(/period=([0-9]+)/i)?.[1] + "d") : null,
      trend_direction: null,
      category,
      tags,
      affiliate_route: affiliateRoute,
      evidence_confidence: product || metricValue != null ? "high" : "medium",
      structured_data: {
        source,
        signal_type: signalType,
        requested_url: pageUrl,
        resolved_url: upstream.url || pageUrl,
        title: title || null,
        description: description || null,
        source_image_url: sourceImageUrl || null,
        storage_path: storedImage.storagePath || null,
        image_persistence_error: storedImage.error || null,
        product_jsonld: product || null,
        retrieved_at: new Date().toISOString()
      }
    };
  } finally {
    clearTimeout(timer);
  }
}

async function discoverTikTokShopProducts(body, ownerId) {
  const accessToken = String(process.env.TIKTOK_RESEARCH_ACCESS_TOKEN || "").trim();
  if (!accessToken) throw new Error("TikTok Shop Research API is not configured. Add TIKTOK_RESEARCH_ACCESS_TOKEN to the server environment.");
  const shopId = String(body.shop_id || "").trim();
  if (!shopId) throw new Error("shop_id is required.");
  const fields = "product_id,product_sold_count,product_description,product_price,product_review_count,product_name,product_rating_1_count,product_rating_2_count,product_rating_3_count,product_rating_4_count,product_rating_5_count";
  const response = await fetch("https://open.tiktokapis.com/v2/research/tts/product/?fields=" + encodeURIComponent(fields), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
    body: JSON.stringify({ shop_id: Number(shopId), page_start: 1, page_size: 10 })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.error?.code) throw new Error("TikTok Shop Research API failed: " + JSON.stringify(json?.error || { status: response.status }));
  const products = Array.isArray(json?.data) ? json.data : (Array.isArray(json?.data?.products) ? json.data.products : []);
  return products.map((item) => {
    const ratingCounts = [1,2,3,4,5].map((n) => Number(item?.["product_rating_" + n + "_count"] || 0));
    const totalRatings = ratingCounts.reduce((a,b) => a+b, 0);
    const rating = totalRatings ? ratingCounts.reduce((sum, count, i) => sum + count * (i + 1), 0) / totalRatings : null;
    const priceList = Array.isArray(item?.product_price) ? item.product_price : [];
    const firstPrice = priceList.find((p) => Number.isFinite(Number(p?.sale_price ?? p?.price ?? p)));
    const priceAmount = firstPrice ? Number(firstPrice?.sale_price ?? firstPrice?.price ?? firstPrice) : null;
    return {
      product_id: item.product_id,
      product_name: item.product_name,
      product_description: item.product_description,
      product_sold_count: item.product_sold_count,
      product_review_count: item.product_review_count,
      rating: Number.isFinite(rating) ? Number(rating.toFixed(2)) : null,
      price_amount: Number.isFinite(priceAmount) ? priceAmount : null,
      price_currency: "EUR",
      source_url: "https://shop.tiktok.com/",
      image_url: null,
      shop_name: null,
      category: "mixed"
    };
  });
}

async function handleReferenceIngest(body, ownerId) {
  const pageUrl = String(body.url || "").trim();
  if (!pageUrl) throw new Error("A public source URL is required.");
  let parsed;
  try { parsed = new URL(pageUrl); } catch { throw new Error("That URL is not valid."); }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Only HTTP(S) URLs are supported.");
  const source = referenceSourcePlatform(pageUrl);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const allowedHost = host === "pin.it" || host.endsWith("pinterest.com") || host.includes("vinted.") || host.endsWith("depop.com");
  if (!allowedHost) throw new Error("Reference ingestion currently supports Pinterest, Vinted and Depop URLs only.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const upstream = await fetch(pageUrl, {
      redirect: "follow",
      headers: { "User-Agent": "CornerstoneAI/1.0 reference-board metadata fetch", Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8" },
      signal: controller.signal
    });
    if (!upstream.ok) throw new Error("Source page returned " + upstream.status + ".");
    const type = upstream.headers.get("content-type") || "";
    if (!type.includes("text/html")) throw new Error("The source is not an HTML page.");
    const html = (await upstream.text()).slice(0, 1000000);
    const sourceImageUrl = referenceClean(body.image_url || referenceMeta(html, "og:image") || referenceMeta(html, "twitter:image"));
    const storedImage = await persistReferenceImage(sourceImageUrl, ownerId);
    const imageUrl = storedImage.url || sourceImageUrl;
    const title = referenceClean(body.title || referenceMeta(html, "og:title") || referenceMeta(html, "twitter:title"));
    const description = referenceClean(body.description || referenceMeta(html, "og:description") || referenceMeta(html, "description"));
    const canonicalUrl = referenceClean(referenceMeta(html, "og:url") || upstream.url || pageUrl);
    const category = referenceCategoryHint(title + " " + description);
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
    return {
      ok: true,
      owner_id: ownerId,
      source_platform: source,
      source_url: pageUrl,
      canonical_url: canonicalUrl,
      image_url: imageUrl || null,
      title: title || null,
      description: description || null,
      structured_data: {
        source,
        requested_url: pageUrl,
        resolved_url: upstream.url || pageUrl,
        title: title || null,
        description: description || null,
        source_image_url: sourceImageUrl || null,
        storage_path: storedImage.storagePath || null,
        image_persistence_error: storedImage.error || null,
        retrieved_at: new Date().toISOString()
      },
      recipe,
      can_analyse_image: Boolean(imageUrl)
    };
  } finally {
    clearTimeout(timer);
  }
}

function characterNames(personaName) {
  const value = String(personaName || "").toLowerCase();
  if (value.includes("cara + lila") || value.includes("cara and lila") || value.includes("cara_lila")) return ["Cara", "Lila"];
  if (value.includes("lila")) return ["Lila"];
  if (value.includes("cara")) return ["Cara"];
  return [];
}

function creatorSlug(personaName) {
  const value = String(personaName || "").toLowerCase();
  if (value.includes("cara + lila") || value.includes("cara and lila") || value.includes("cara_lila")) return "cara-lila";
  if (value.includes("lila")) return "lila";
  return "cara";
}

async function registerAsset({ publicUrl, storagePath, requestId, postId, slideIndex, personaName, metadata, ownerId }) {
  try {
    const workspaceId = await resolveWorkspace();
    if (!workspaceId) return;

    const created = await supabaseRest("track_b_assets", {
      method: "POST",
      body: JSON.stringify({
        workspace_id: workspaceId,
        owner_id: ownerId || null,
        asset_type: "image",
        name: `${personaName || "Generated"} · ${postId || requestId || "image"}${typeof slideIndex === "number" ? ` · slide ${slideIndex + 1}` : ""}`,
        provider: metadata?.provider || "creative_engine",
        source_url: publicUrl,
        storage_path: storagePath,
        public_url: publicUrl,
        approval_status: "approved",
        metadata: {
          request_id: requestId || null,
          post_id: postId || null,
          slide_index: typeof slideIndex === "number" ? slideIndex : null,
          ...(metadata || {}),
        },
      }),
    });
    if (!created.ok) return;
    const assets = await created.json().catch(() => []);
    const assetId = assets?.[0]?.id;
    if (!assetId) return;

    for (const characterName of characterNames(personaName)) {
      const charLookup = await supabaseRest(`track_b_characters?workspace_id=eq.${encodeURIComponent(workspaceId)}&name=eq.${encodeURIComponent(characterName)}&select=id&limit=1`);
      if (!charLookup.ok) continue;
      const chars = await charLookup.json().catch(() => []);
      const characterId = chars?.[0]?.id;
      if (!characterId) continue;
      await supabaseRest("track_b_character_assets", {
        method: "POST",
        body: JSON.stringify({ character_id: characterId, asset_id: assetId, role: "generated_media", sort_order: typeof slideIndex === "number" ? slideIndex : 0 }),
      }).catch(() => null);
    }
  } catch (error) {
    console.warn("[store-image] asset-library registration skipped:", error?.message || error);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ error: "Supabase not configured" });

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  if (body.mode === "commerce_ingest" || body.mode === "tiktok_shop_discover") {
    const accessToken = String(req.headers.authorization || "").replace(/^Bearer\\s+/i, "").trim();
    if (!accessToken) return res.status(401).json({ error: "Sign in is required." });
    const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const auth = await authClient.auth.getUser(accessToken);
    if (auth.error || !auth.data.user) return res.status(401).json({ error: "Session is invalid or expired." });
    try {
      if (body.mode === "tiktok_shop_discover") return res.status(200).json({ ok: true, source_platform: "tiktok_shop", signal_type: "product", products: await discoverTikTokShopProducts(body, auth.data.user.id) });
      return res.status(200).json(await handleCommerceIngest(body, auth.data.user.id));
    } catch (error) {
      return res.status(502).json({ error: error?.name === "AbortError" ? "Source page timed out." : (error?.message || "Could not read that commerce source.") });
    }
  }

  if (body.mode === "reference_ingest") {
    const accessToken = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) return res.status(401).json({ error: "Sign in is required." });
    const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const auth = await authClient.auth.getUser(accessToken);
    if (auth.error || !auth.data.user) return res.status(401).json({ error: "Session is invalid or expired." });
    try {
      return res.status(200).json(await handleReferenceIngest(body, auth.data.user.id));
    } catch (error) {
      return res.status(502).json({ error: error?.name === "AbortError" ? "Source page timed out." : (error?.message || "Could not read that public reference.") });
    }
  }

  if (body.mode === "qwen" || body.provider === "qwen-image-2.1") {
    const accessToken = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) return res.status(401).json({ error: "Sign in is required to generate images." });
    const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const auth = await authClient.auth.getUser(accessToken);
    if (auth.error || !auth.data.user) return res.status(401).json({ error: "Session is invalid or expired." });
    const ownerId = auth.data.user.id;
    const postId = body.postId || null;

    const personaId = String(body.personaId || body.persona_id || "cara").toLowerCase();
    const allowed = new Set(["cara", "lila", "cara_lila", "duo", "cara&lila"]);
    if (!allowed.has(personaId)) return res.status(400).json({ error: "Unknown creator identity." });
    const canonicalPersona = personaId === "duo" || personaId === "cara&lila" ? "cara_lila" : personaId;

    try {
      const generated = await generateQwenImageServer({
        personaId: canonicalPersona,
        visionJson: body.visionJson && typeof body.visionJson === "object" ? body.visionJson : null,
        flowPrompt: body.flowPrompt || "",
        aspectRatio: body.aspectRatio || "9:16",
        seed: body.seed,
        randomizeSeed: body.randomizeSeed == null ? true : Boolean(body.randomizeSeed),
        references: Array.isArray(body.references) ? body.references.slice(0, 8) : [],
      });
      const imgRes = await fetch(generated.sourceUrl, { signal: AbortSignal.timeout(45000) });
      if (!imgRes.ok) throw new Error("Generated image fetch failed: " + imgRes.status);
      const blob = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get("content-type") || "image/png";
      const extension = /jpe?g/i.test(contentType) ? "jpg" : "png";
      const creator = canonicalPersona === "cara_lila" ? "cara-lila" : canonicalPersona;
      const path = "qwen2.1/" + creator + "/" + ownerId + "/" + String(postId || ("qwen-" + Date.now())) + "-" + Date.now() + "." + extension;
      const upRes = await fetch(SUPABASE_URL + "/storage/v1/object/" + BUCKET + "/" + path, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: "Bearer " + SUPABASE_SERVICE_KEY,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: blob,
      });
      if (!upRes.ok) throw new Error("Upload failed (" + upRes.status + "): " + (await upRes.text()).slice(0, 300));
      const publicUrl = SUPABASE_URL + "/storage/v1/object/public/" + BUCKET + "/" + path;
      await registerAsset({
        publicUrl,
        storagePath: path,
        requestId: generated.requestId,
        postId,
        slideIndex: body.slideIndex,
        personaName: canonicalPersona === "cara_lila" ? "Cara + Lila" : canonicalPersona === "cara" ? "Cara" : "Lila",
        ownerId,
        metadata: {
          provider: "qwen-image-2.1",
          provider_space: "Qwen/Qwen-Image-2.1",
          aspect_ratio: body.aspectRatio || "9:16",
          width: generated.width,
          height: generated.height,
          seed: generated.seed,
          reference_count: generated.referenceCount,
          vision_json: body.visionJson || null,
          flow_prompt: body.flowPrompt || "",
        },
      });
      return res.status(200).json({
        ok: true,
        provider: "qwen-image-2.1",
        model: "Qwen-Image-2.1",
        space: "Qwen/Qwen-Image-2.1",
        requestId: generated.requestId,
        publicUrl,
        imageUrl: publicUrl,
        storagePath: path,
        aspectRatio: body.aspectRatio || "9:16",
        width: generated.width,
        height: generated.height,
        seed: generated.seed,
      });
    } catch (e) {
      console.error("[store-image:qwen] failed:", e.message);
      return res.status(502).json({ error: e.message, provider: "qwen-image-2.1" });
    }
  }

  const { falUrl, requestId, postId, slideIndex, personaName, metadata } = body;
  if (!falUrl || !requestId) return res.status(400).json({ error: "falUrl and requestId required" });

  try {
    await ensureBucket();
    const imgRes = await fetch(falUrl);
    if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`);
    const blob = await imgRes.arrayBuffer();

    const suffix = typeof slideIndex === "number" ? `_${slideIndex}` : "";
    const path = `qwen/${creatorSlug(personaName)}/${postId || requestId}${suffix}.jpg`;

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
      throw new Error(`Upload failed (${upRes.status}): ${errText.slice(0, 200)}`);
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    await registerAsset({ publicUrl, storagePath: path, requestId, postId, slideIndex, personaName, metadata });

    console.log("[store-image] stored:", publicUrl);
    return res.status(200).json({ publicUrl, storagePath: path, slideIndex: slideIndex ?? null });
  } catch (e) {
    console.error("[store-image] failed:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
