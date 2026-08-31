import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const shell = { minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: "28px 32px 72px", fontFamily: "Inter, system-ui, sans-serif" };
const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18 };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 9, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b" };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 9, padding: 10 };
const muted = { color: "#7f8798", fontSize: 12 };
const GBP_PER_USD = 0.737;

const MODES = [
  { id: "static_image", label: "Static Image", description: "No video generation. Use the approved image as-is.", costType: "free" },
  { id: "carousel", label: "Carousel", description: "Plan 4–6 approved/generated images. No video generation.", costType: "image" },
  { id: "cinematic_motion", label: "Cinematic Motion", description: "One approved image → ~5s premium motion clip.", costType: "video" },
  { id: "multi_image_motion", label: "Multi-Image Motion", description: "Multiple reference images, one motion clip per image.", costType: "video" },
  { id: "ugc", label: "UGC", description: "Character + product reference-led image-to-video.", costType: "video" },
  { id: "short_form", label: "Short-form", description: "Plan several shots; generate premium clips only where useful.", costType: "mixed" },
  { id: "long_form", label: "Long-form", description: "Director plan now; premium clips are generated scene-by-scene.", costType: "mixed" },
];

function usdFor(mode, outputs, clipsPerOutput = 1, resolution = "720p") {
  const perClip = resolution === "480p" ? 0.20 : 0.40;
  if (["static_image"].includes(mode)) return 0;
  if (mode === "carousel") return 0;
  const count = Math.max(1, Number(outputs) || 1) * Math.max(1, Number(clipsPerOutput) || 1);
  return +(perClip * count).toFixed(2);
}

function formatMoney(usd) {
  const gbp = +(usd * GBP_PER_USD).toFixed(2);
  return `$${usd.toFixed(2)} (~£${gbp.toFixed(2)})`;
}

function safeJson(value) {
  if (typeof value !== "string") return value || {};
  try { return JSON.parse(value); } catch { return {}; }
}

export default function CornerstoneAIAssetsProductionStudioV2() {
  const [workspace, setWorkspace] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [mode, setMode] = useState("cinematic_motion");
  const [characterId, setCharacterId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productId, setProductId] = useState("");
  const [referenceIds, setReferenceIds] = useState([]);
  const [duration, setDuration] = useState(5);
  const [outputs, setOutputs] = useState(1);
  const [clipsPerOutput, setClipsPerOutput] = useState(1);
  const [resolution, setResolution] = useState("720p");
  const [provider, setProvider] = useState("premium_fal");
  const [motionPrompt, setMotionPrompt] = useState("Slow cinematic camera push-in with subtle natural movement, realistic breathing and hair movement, gentle environmental motion, grounded phone-camera realism, no sudden motion.");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  async function ensureWorkspace() {
    const { data: existing, error } = await supabase.from("track_b_workspaces").select("*").eq("slug", "cornerstoneaiassets-internal").maybeSingle();
    if (error) throw error;
    if (existing) return existing;
    const { data, error: insertError } = await supabase.from("track_b_workspaces").insert({ name: "CornerstoneAIAssets Internal", slug: "cornerstoneaiassets-internal", workspace_type: "internal", status: "active" }).select("*").single();
    if (insertError) throw insertError;
    return data;
  }

  async function load() {
    try {
      const ws = await ensureWorkspace();
      const [c, b, p, a, j] = await Promise.all([
        supabase.from("track_b_characters").select("*").eq("workspace_id", ws.id).order("created_at"),
        supabase.from("track_b_brands").select("*").eq("workspace_id", ws.id).order("created_at"),
        supabase.from("track_b_products").select("*").order("created_at", { ascending: false }),
        supabase.from("track_b_assets").select("*").eq("workspace_id", ws.id).eq("approval_status", "approved").order("created_at", { ascending: false }).limit(250),
        supabase.from("track_b_production_jobs").select("*, track_b_content_projects(title)").order("created_at", { ascending: false }).limit(40),
      ]);
      if (c.error) throw c.error; if (b.error) throw b.error; if (p.error) throw p.error; if (a.error) throw a.error; if (j.error) throw j.error;
      setWorkspace(ws); setCharacters(c.data || []); setBrands(b.data || []); setProducts(p.data || []); setAssets(a.data || []); setJobs(j.data || []);
      if (!characterId && c.data?.[0]) setCharacterId(c.data[0].id);
    } catch (e) { setMessage(e.message || String(e)); }
  }

  useEffect(() => { load(); }, []);

  const filteredProducts = useMemo(() => brandId ? products.filter((p) => p.brand_id === brandId) : products, [products, brandId]);
  const selectedCharacter = characters.find((c) => c.id === characterId);
  const selectedProduct = products.find((p) => p.id === productId);
  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedRefs = assets.filter((a) => referenceIds.includes(a.id));
  const isPremium = provider === "premium_fal";
  const estimatedUsd = usdFor(mode, outputs, clipsPerOutput, resolution);
  const estimatedGbp = +(estimatedUsd * GBP_PER_USD).toFixed(2);

  function toggleReference(id) {
    setReferenceIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  function buildPrompt() {
    const char = selectedCharacter?.name || "the selected creator";
    const product = selectedProduct ? ` Product: ${selectedProduct.name}. ${selectedProduct.description || ""}` : "";
    const refNames = selectedRefs.map((a) => a.name).join(", ");
    return [
      `Create a premium social-first image-to-video shot featuring ${char}.`,
      refNames ? `Preserve the exact identity, styling and visual details represented by these approved references: ${refNames}.` : "Preserve the source image identity exactly.",
      selectedBrand ? `Brand context: ${selectedBrand.name}.` : "",
      product,
      motionPrompt,
      `The first frame is the approved creative. Keep the scene coherent with the source image; do not redesign the character, product or environment. Realistic human motion, subtle camera movement, natural physics, premium editorial/social craft, no generic AI movement.`,
    ].filter(Boolean).join(" ");
  }

  async function createJobRecord(status = "processing", extra = {}) {
    const { data: project, error: projectError } = await supabase.from("track_b_content_projects").insert({
      workspace_id: workspace?.id || null,
      brand_id: brandId || null,
      product_id: productId || null,
      title: `${mode} · ${selectedCharacter?.name || "Creative"}${selectedProduct ? ` · ${selectedProduct.name}` : ""}`,
      source_type: "image",
      brief: { mode, character_id: characterId || null, reference_asset_ids: referenceIds, motion_prompt: motionPrompt, duration, outputs, provider, resolution },
      status: "in_production",
    }).select("id").single();
    if (projectError) throw projectError;

    const { data: job, error: jobError } = await supabase.from("track_b_production_jobs").insert({
      project_id: project.id,
      mode,
      target_duration_seconds: Number(duration),
      output_count: Number(outputs),
      provider_strategy: provider,
      estimated_credits: 0,
      estimated_compute_tier: isPremium ? "medium" : "low",
      config: { character_id: characterId || null, brand_id: brandId || null, product_id: productId || null, reference_asset_ids: referenceIds, resolution, estimated_usd: estimatedUsd, estimated_gbp: estimatedGbp, ...extra },
      status,
    }).select("id").single();
    if (jobError) throw jobError;
    return { projectId: project.id, jobId: job.id };
  }

  async function generatePremium() {
    if (!selectedRefs[0]?.public_url) {
      setMessage("Select at least one approved image reference. The first selected image is the source frame for this first adapter.");
      return;
    }
    if (mode !== "cinematic_motion" && mode !== "ugc") {
      setMessage("The first live adapter is intentionally limited to Cinematic Motion and UGC. Multi-image, Short-form and Long-form use the same adapter next, shot-by-shot.");
      return;
    }

    setBusy(true); setVideoUrl(""); setMessage("Submitting the approved reference image to fal.ai Wan 2.1…");
    let record;
    try {
      record = await createJobRecord("processing");
      const submit = await fetch("/api/track-b-video-submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: selectedRefs[0].public_url, prompt: buildPrompt(), resolution, aspectRatio: "9:16", numFrames: duration <= 5 ? 81 : 100, fps: 16 }),
      });
      const data = await submit.json();
      if (!submit.ok) throw new Error(data?.detail?.message || data?.error || "Video submit failed");

      for (let i = 0; i < 90; i += 1) {
        await new Promise((r) => setTimeout(r, 4500));
        const poll = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: data.requestId, action: "status" }) });
        const status = await poll.json();
        if (!poll.ok) throw new Error(status?.error || "Video status check failed");
        setMessage(`Generating with fal.ai Wan 2.1… ${status.status}${status.queuePosition != null ? ` · queue ${status.queuePosition}` : ""}`);
        if (status.status === "COMPLETED") break;
        if (["FAILED", "CANCELLED").includes(status.status)) throw new Error(`fal.ai generation ${status.status.toLowerCase()}`);
        if (i === 89) throw new Error("Video generation timed out after ~6.5 minutes");
      }

      const resultPoll = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: data.requestId, action: "result" }) });
      const result = await resultPoll.json();
      if (!resultPoll.ok || !result.videoUrl) throw new Error(result?.error || "Completed video URL was not returned");
      setVideoUrl(result.videoUrl);
      await supabase.from("track_b_production_shots").insert({ production_job_id: record.jobId, shot_order: 1, duration_seconds: data.estimatedSeconds || duration, purpose: mode === "ugc" ? "UGC motion" : "cinematic motion", motion_prompt: motionPrompt, reference_asset_ids: referenceIds, premium_generation: true, metadata: { provider: "fal-ai/wan-i2v", request_id: data.requestId, result_url: result.videoUrl, estimated_usd: estimatedUsd, estimated_gbp: estimatedGbp } });
      await supabase.from("track_b_derivatives").insert({ project_id: record.projectId, parent_production_job_id: record.jobId, derivative_type: mode === "ugc" ? "reel" : "short", source_reference: { provider: "fal-ai/wan-i2v", request_id: data.requestId, reference_asset_ids: referenceIds }, output_url: result.videoUrl, status: "completed", completed_at: new Date().toISOString() });
      await supabase.from("track_b_production_jobs").update({ status: "completed", completed_at: new Date().toISOString(), config: { character_id: characterId || null, product_id: productId || null, reference_asset_ids: referenceIds, provider: "fal-ai/wan-i2v", request_id: data.requestId, output_url: result.videoUrl, estimated_usd: estimatedUsd, estimated_gbp: estimatedGbp } }).eq("id", record.jobId);
      setMessage(`Done. One premium motion clip generated for ${formatMoney(estimatedUsd)} using the selected reference.`);
      await load();
    } catch (e) {
      if (record?.jobId) await supabase.from("track_b_production_jobs").update({ status: "error", config: { error: e.message, estimated_usd: estimatedUsd, estimated_gbp: estimatedGbp } }).eq("id", record.jobId);
      setMessage(e.message || String(e));
    } finally { setBusy(false); }
  }

  return <div style={shell}>
    <div style={{ maxWidth: 1240, margin: "0 auto 18px" }}>
      <div style={{ textTransform: "uppercase", letterSpacing: ".16em", fontSize: 10, color: "#d4af37", fontWeight: 800 }}>CornerstoneAIAssets · Track B</div>
      <h1 style={{ margin: "8px 0 5px", fontSize: 34, letterSpacing: "-.04em" }}>Reference-aware Production Studio</h1>
      <p style={{ margin: 0, ...muted }}>The first live premium adapter uses the exact approved Asset Library image as the source frame, rather than inventing a new character or pulling stock footage.</p>
    </div>

    <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 16 }}>
      <section style={card}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>1. Identity + product references</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={muted}>Character<select value={characterId} onChange={(e) => setCharacterId(e.target.value)} style={input}><option value="">None</option>{characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label style={muted}>Brand<select value={brandId} onChange={(e) => { setBrandId(e.target.value); setProductId(""); }} style={input}><option value="">None</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        </div>
        <label style={{ ...muted, display: "block", marginTop: 10 }}>Product<select value={productId} onChange={(e) => setProductId(e.target.value)} style={input}><option value="">None</option>{filteredProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>

        <div style={{ marginTop: 14, fontWeight: 800 }}>Approved image references</div>
        <div style={{ ...muted, margin: "5px 0 9px" }}>Select one or more. The first selected image is the live source frame for this adapter.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 9 }}>
          {assets.filter((a) => a.asset_type === "image" || a.asset_type === "reference").map((a) => <button key={a.id} onClick={() => toggleReference(a.id)} style={{ padding: 0, textAlign: "left", overflow: "hidden", borderRadius: 12, border: `2px solid ${referenceIds.includes(a.id) ? "#d4af37" : "#252a39"}`, background: "#0a0c12" }}>
            {a.public_url ? <img src={a.public_url} alt={a.name} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} /> : <div style={{ aspectRatio: "4/3", display: "grid", placeItems: "center", color: "#667087" }}>NO URL</div>}
            <div style={{ padding: 9, color: "#fff", fontSize: 11, fontWeight: 800 }}>{a.name}</div>
          </button>)}
        </div>
        {!assets.length && <div style={{ ...muted, padding: 18 }}>No approved assets yet. Sync the Asset Library first.</div>}
      </section>

      <section style={card}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>2. Production</div>
        <div style={{ display: "grid", gap: 8 }}>
          {MODES.map((m) => <button key={m.id} onClick={() => setMode(m.id)} style={{ ...button, textAlign: "left", borderColor: mode === m.id ? "#d4af37" : "#303648", background: mode === m.id ? "rgba(212,175,55,.11)" : "#151924" }}><div>{m.label}</div><div style={{ ...muted, marginTop: 3 }}>{m.description}</div></button>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <label style={muted}>Duration (sec)<input type="number" min="1" max="60" value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={input} /></label>
          <label style={muted}>Outputs<select value={outputs} onChange={(e) => setOutputs(Number(e.target.value))} style={input}>{[1,2,3,5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        </div>
        <label style={{ ...muted, display: "block", marginTop: 10 }}>Resolution<select value={resolution} onChange={(e) => setResolution(e.target.value)} style={input}><option value="720p">720p — recommended</option><option value="480p">480p — cheaper test</option></select></label>
        <label style={{ ...muted, display: "block", marginTop: 10 }}>Motion direction<textarea value={motionPrompt} onChange={(e) => setMotionPrompt(e.target.value)} rows={6} style={{ ...input, resize: "vertical" }} /></label>

        <div style={{ ...card, background: "#0a0c12", marginTop: 12 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", color: "#727c90" }}>Actual external generation cost</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 5 }}>{formatMoney(estimatedUsd)}</div>
          <div style={{ ...muted, marginTop: 5 }}>fal.ai Wan 2.1 · {resolution} · {outputs} output{outputs !== 1 ? "s" : ""}. No credits abstraction.</div>
        </div>

        <button style={{ ...primary, width: "100%", marginTop: 12 }} onClick={generatePremium} disabled={busy || !referenceIds.length}>{busy ? "Generating…" : `Generate with fal.ai · ${formatMoney(estimatedUsd)}`}</button>
        {videoUrl && <div style={{ marginTop: 14 }}><video src={videoUrl} controls playsInline style={{ width: "100%", borderRadius: 12, background: "#000" }} /><a href={videoUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, color: "#d4af37", fontSize: 12 }}>Open generated video →</a></div>}
        {message && <div style={{ ...muted, marginTop: 12, color: message.toLowerCase().includes("done") ? "#d4af37" : "#cbd1dd" }}>{message}</div>}
      </section>
    </div>

    <section style={{ maxWidth: 1240, margin: "16px auto 0", ...card }}>
      <div style={{ fontWeight: 800 }}>Recent Track B production</div>
      <div style={{ ...muted, margin: "5px 0 12px" }}>Generation history records the selected character, product, references, provider and estimated cash cost.</div>
      {jobs.slice(0, 12).map((j) => <div key={j.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "10px 0", borderTop: "1px solid #252a39" }}><div><div style={{ fontSize: 12, fontWeight: 800 }}>{j.track_b_content_projects?.title || j.mode}</div><div style={{ ...muted, marginTop: 3 }}>{j.mode} · {j.status} · ${Number(j.config?.estimated_usd || 0).toFixed(2)} (~£{Number(j.config?.estimated_gbp || 0).toFixed(2)})</div></div>{j.config?.output_url && <a href={j.config.output_url} target="_blank" rel="noreferrer" style={{ color: "#d4af37", fontSize: 11 }}>Open →</a>}</div>)}
      {!jobs.length && <div style={muted}>No Track B production jobs yet.</div>}
    </section>
  </div>;
}
