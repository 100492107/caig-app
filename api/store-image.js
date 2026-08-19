// api/store-image.js
// Downloads a fal.ai image, stores it permanently in Supabase Storage,
// and registers the generated asset in the Track B asset library.
// POST { falUrl, requestId, postId, slideIndex?, personaName?, metadata? }
// Returns { publicUrl, slideIndex }

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

async function registerAsset({ publicUrl, storagePath, requestId, postId, slideIndex, personaName, metadata }) {
  try {
    const workspaceId = await resolveWorkspace();
    if (!workspaceId) return;

    const created = await supabaseRest("track_b_assets", {
      method: "POST",
      body: JSON.stringify({
        workspace_id: workspaceId,
        asset_type: "image",
        name: `${personaName || "Generated"} · ${postId || requestId || "image"}${typeof slideIndex === "number" ? ` · slide ${slideIndex + 1}` : ""}`,
        provider: "creative_engine",
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
