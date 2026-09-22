// api/qwen-image.js
// Cornerstone image adapter for the hosted Qwen/Qwen-Image-2.1 Space.
// Authenticated requests come here; canonical creator references are
// selected server-side and the final image is persisted to Supabase.

import { getPersonaVisual } from "./cara-config.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SPACE_URL = (process.env.QWEN_IMAGE_SPACE_URL || "https://qwen-qwen-image-2-1.hf.space").replace(/\/$/, "");
const SPACE_TOKEN = process.env.QWEN_IMAGE_HF_TOKEN || process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || "";
const BUCKET = "post-images";
const SIZE_PRESETS = {
  "9:16": [1536, 2688],
  "16:9": [2688, 1536],
  "1:1": [2048, 2048],
  "4:3": [2368, 1728],
  "3:4": [1728, 2368],
};
const REQUEST_TIMEOUT_MS = 290000;
const ALLOWED_PERSONAS = new Set(["cara", "lila", "cara_lila", "duo", "cara&lila"]);

function responseHeaders(extra = {}) {
  return { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra };
}
function text(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}
function safeSlug(value) {
  return String(value || "creator").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "creator";
}
function jsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { reject(new Error("Invalid JSON request body")); }
    });
    req.on("error", reject);
  });
}
async function supabaseUser(accessToken) {
  if (!SUPABASE_URL || !accessToken) return null;
  const apikey = SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY;
  if (!apikey) return null;
  const response = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey, Authorization: "Bearer " + accessToken },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}
function compactVision(visionJson) {
  if (!visionJson || typeof visionJson !== "object") return "";
  const sections = ["objective","canvas","scene","subject","face","skin","hair","jewelry","wardrobe","body_and_pose","background","lighting","camera","composition_geometry","colour_palette","photographic_style","negative_prompt","final_generation_instruction"];
  return sections.filter((key) => visionJson[key] != null && text(visionJson[key]))
    .map((key) => key.toUpperCase() + ": " + text(visionJson[key]))
    .join("\n").slice(0, 18000);
}
function buildPrompt({ personaId, visionJson, flowPrompt }) {
  const visual = getPersonaVisual(personaId);
  const providedPrompt = text(flowPrompt);
  const vision = compactVision(visionJson);
  const identity = visual.id === "duo"
    ? "Use the supplied Cara and Lila reference images as two separate canonical identity anchors. Keep both women recognisably distinct; never merge or swap their identities."
    : "Use the supplied " + visual.name + " reference images as the canonical identity anchor. Preserve the same face, hair identity, proportions, skin characteristics and recognisable details across the output.";
  const scene = providedPrompt || ["Create the image exactly from the supplied production vision specification.", vision].filter(Boolean).join("\n");
  const negative = Array.isArray(visionJson?.negative_prompt) ? visionJson.negative_prompt.join(", ") : text(visionJson?.negative_prompt);
  return [
    identity,
    "This is an original creator image, not a recreation of another person's work.",
    scene,
    vision ? "Production vision specification:\n" + vision : "",
    negative ? "Exclude: " + negative : "",
    visual.negative ? "Additional identity/quality exclusions: " + visual.negative : "",
    "Preserve real human anatomy, natural skin texture, coherent hands, believable objects, logical spatial relationships and continuity with the supplied references.",
    "Do not add text, captions, logos, watermarks or social-media interface elements unless the production specification explicitly requires visible text.",
  ].filter(Boolean).join("\n\n").slice(0, 30000);
}
function fileValue(url) { return [url, null]; }
function authHeaders(extra = {}) {
  const headers = { ...extra };
  if (SPACE_TOKEN) headers.Authorization = "Bearer " + SPACE_TOKEN;
  return headers;
}
async function startGeneration({ prompt, refs, aspectRatio, seed, randomizeSeed, negativePrompt }) {
  const [width, height] = SIZE_PRESETS[aspectRatio] || SIZE_PRESETS["9:16"];
  const payload = {
    data: [
      refs.map(fileValue),
      prompt,
      false,
      true,
      "",
      Number.isFinite(Number(seed)) ? Number(seed) : 42,
      Boolean(randomizeSeed),
      height,
      width,
      negativePrompt || "",
    ],
  };
  const post = await fetch(SPACE_URL + "/gradio_api/call/generate_with_enhance", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
  const bodyText = await post.text();
  let body = {};
  try { body = JSON.parse(bodyText); } catch {}
  if (!post.ok || !body?.event_id) throw new Error("Qwen Space submit failed (" + post.status + "): " + bodyText.slice(0, 500));
  return { eventId: body.event_id, width, height };
}
function parseSseEvents(buffer) {
  const events = [];
  for (const chunk of buffer.split(/\n\n+/)) {
    if (!chunk.trim()) continue;
    let event = "message";
    const dataLines = [];
    for (const line of chunk.split(/\r?\n/)) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) events.push({ event, data: dataLines.join("\n") });
  }
  return events;
}
async function waitGeneration(eventId) {
  const response = await fetch(SPACE_URL + "/gradio_api/call/generate_with_enhance/" + encodeURIComponent(eventId), {
    headers: authHeaders({ Accept: "text/event-stream" }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Qwen Space result stream failed (" + response.status + ")");
  if (!response.body) throw new Error("Qwen Space returned no result stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const events = parseSseEvents(buffer);
      const lastBoundary = buffer.lastIndexOf("\n\n");
      if (lastBoundary >= 0) buffer = done ? "" : buffer.slice(lastBoundary + 2);
      for (const item of events) {
        if (item.event === "error") throw new Error("Qwen Space generation error: " + item.data.slice(0, 500));
        if (item.event !== "complete") continue;
        let data;
        try { data = JSON.parse(item.data); } catch { throw new Error("Qwen Space returned invalid completion data."); }
        return Array.isArray(data) ? data : (data?.data || data);
      }
      if (done) break;
    }
  } finally {
    try { await reader.cancel(); } catch {}
  }
  throw new Error("Qwen Space result stream ended without a completed image.");
}
function findMedia(value) {
  if (!value) return null;
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? { url: value } : { path: value };
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMedia(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    if (typeof value.url === "string" && value.url) return { url: value.url, mimeType: value.mime_type || value.mimeType || "" };
    if (typeof value.path === "string" && value.path) return { url: value.path, mimeType: value.mime_type || value.mimeType || "" };
    if (value.data != null) return findMedia(value.data);
  }
  return null;
}
function absoluteMediaUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return SPACE_URL + value;
  return SPACE_URL + "/" + value;
}
async function ensureBucket() {
  const response = await fetch(SUPABASE_URL + "/storage/v1/bucket", {
    method: "POST",
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  if (!response.ok && response.status !== 409) throw new Error("Supabase bucket setup failed (" + response.status + ")");
}
async function storeImage({ sourceUrl, userId, personaId, postId }) {
  const imageResponse = await fetch(sourceUrl, { signal: AbortSignal.timeout(45000) });
  if (!imageResponse.ok) throw new Error("Generated image download failed (" + imageResponse.status + ")");
  const bytes = await imageResponse.arrayBuffer();
  const contentType = imageResponse.headers.get("content-type") || "image/png";
  const extension = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
  const path = "qwen2.1/" + safeSlug(personaId) + "/" + safeSlug(userId) + "/" + safeSlug(postId || crypto.randomUUID()) + "-" + Date.now() + "." + extension;
  await ensureBucket();
  const upload = await fetch(SUPABASE_URL + "/storage/v1/object/" + BUCKET + "/" + path, {
    method: "POST",
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY, "Content-Type": contentType, "x-upsert": "true" },
    body: bytes,
  });
  if (!upload.ok) throw new Error("Supabase image upload failed (" + upload.status + ")");
  return { publicUrl: SUPABASE_URL + "/storage/v1/object/public/" + BUCKET + "/" + path, storagePath: path, contentType };
}
async function registerAsset({ publicUrl, storagePath, userId, personaId, postId, metadata }) {
  try {
    const workspaceLookup = await fetch(SUPABASE_URL + "/rest/v1/track_b_workspaces?slug=eq.cornerstoneaiassets-internal&select=id&limit=1", {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY },
    });
    const workspaces = await workspaceLookup.json().catch(() => []);
    if (!workspaceLookup.ok || !workspaces?.[0]?.id) return;
    const payload = {
      workspace_id: workspaces[0].id,
      asset_type: "image",
      name: personaId + " · Qwen Image 2.1 · " + (postId || "image"),
      provider: "qwen-image-2.1",
      source_url: publicUrl,
      storage_path: storagePath,
      public_url: publicUrl,
      approval_status: "approved",
      metadata: { owner_id: userId, persona_id: personaId, provider_space: "Qwen/Qwen-Image-2.1", ...(metadata || {}) },
    };
    await fetch(SUPABASE_URL + "/rest/v1/track_b_assets", {
      method: "POST",
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("[qwen-image] asset registration skipped:", error?.message || error);
  }
}
export default async function handler(req, res) {
  if (req.method !== "POST") { res.writeHead(405, responseHeaders({ Allow: "POST" })); return res.end(JSON.stringify({ error: "Method not allowed" })); }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { res.writeHead(500, responseHeaders()); return res.end(JSON.stringify({ error: "Supabase server configuration is incomplete." })); }

  const accessToken = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const user = await supabaseUser(accessToken);
  if (!user?.id) { res.writeHead(401, responseHeaders()); return res.end(JSON.stringify({ error: "Sign in is required to generate images." })); }

  let body;
  try { body = await jsonBody(req); } catch (error) { res.writeHead(400, responseHeaders()); return res.end(JSON.stringify({ error: error.message })); }

  const rawPersona = String(body.personaId || body.persona_id || "cara").toLowerCase();
  if (!ALLOWED_PERSONAS.has(rawPersona)) { res.writeHead(400, responseHeaders()); return res.end(JSON.stringify({ error: "Unknown creator identity." })); }
  const personaId = rawPersona === "duo" || rawPersona === "cara&lila" ? "cara_lila" : rawPersona;
  const aspectRatio = Object.prototype.hasOwnProperty.call(SIZE_PRESETS, String(body.aspectRatio || "")) ? String(body.aspectRatio) : "9:16";
  const visionJson = body.visionJson && typeof body.visionJson === "object" ? body.visionJson : null;
  const prompt = buildPrompt({ personaId, visionJson, flowPrompt: body.flowPrompt });
  const visual = getPersonaVisual(personaId);
  const negativePrompt = [
    Array.isArray(visionJson?.negative_prompt) ? visionJson.negative_prompt.join(", ") : text(visionJson?.negative_prompt),
    visual.negative,
  ].filter(Boolean).join(", ");
  const refs = visual.refs.slice(0, 10);
  const seed = Number.isFinite(Number(body.seed)) ? Number(body.seed) : 42;
  const randomizeSeed = body.randomizeSeed == null ? true : Boolean(body.randomizeSeed);
  const postId = text(body.postId || body.post_id || ("qwen-" + Date.now()));

  try {
    const started = await startGeneration({ prompt, refs, aspectRatio, seed, randomizeSeed, negativePrompt });
    const output = await waitGeneration(started.eventId);
    const media = findMedia(output);
    if (!media) throw new Error("Qwen Space completed without an image result.");
    const sourceUrl = absoluteMediaUrl(media.url || media.path);
    if (!sourceUrl) throw new Error("Qwen Space returned an unreadable image URL.");
    const stored = await storeImage({ sourceUrl, userId: user.id, personaId, postId });
    await registerAsset({
      ...stored,
      userId: user.id,
      personaId,
      postId,
      metadata: {
        request_id: started.eventId,
        aspect_ratio: aspectRatio,
        width: started.width,
        height: started.height,
        seed,
        randomize_seed: randomizeSeed,
        reference_count: refs.length,
      },
    });
    res.writeHead(200, responseHeaders());
    return res.end(JSON.stringify({
      ok: true,
      provider: "qwen-image-2.1",
      model: "Qwen-Image-2.1",
      space: "Qwen/Qwen-Image-2.1",
      requestId: started.eventId,
      imageUrl: stored.publicUrl,
      storagePath: stored.storagePath,
      aspectRatio,
      width: started.width,
      height: started.height,
      seed,
      rewrittenPrompt: Array.isArray(output) ? text(output[2]) : "",
    }));
  } catch (error) {
    console.error("[qwen-image] generation failed:", error);
    res.writeHead(502, responseHeaders());
    return res.end(JSON.stringify({ error: error?.message || String(error), provider: "qwen-image-2.1" }));
  }
}
