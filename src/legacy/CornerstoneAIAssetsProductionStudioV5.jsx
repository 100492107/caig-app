import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const GBP_PER_USD = 0.737;
const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18 };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 9, padding: 10 };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 9, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b" };
const MODES = [
  ["static_image", "Static Image", "Use an approved image as-is."],
  ["carousel", "Carousel", "Plan a coherent 4–6 image set."],
  ["cinematic_motion", "Cinematic Motion", "One approved image → ~5s motion."],
  ["multi_image_motion", "Multi-Image Motion", "Several approved images → shot sequence."],
  ["ugc", "UGC", "Character + product reference-led motion."],
  ["short_form", "Short-form", "Build a social-first sequence shot-by-shot."],
  ["long_form", "Long-form", "Director plan with selective premium scenes."],
];
function money(usd) { const n = Number(usd) || 0; return `$${n.toFixed(2)} (~£${(n * GBP_PER_USD).toFixed(2)})`; }
function estimate(mode, resolution, outputs) {
  if (mode === "static_image" || mode === "carousel") return 0;
  return +((resolution === "480p" ? 0.2 : 0.4) * Math.max(1, Number(outputs) || 1)).toFixed(2);
}
function asJson(value) { if (value && typeof value === "object") return value; try { return JSON.parse(value || "{}"); } catch { return {}; } }

export default function CornerstoneAIAssetsProductionStudioV5() {
  const [characters, setCharacters] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [characterId, setCharacterId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productId, setProductId] = useState("");
  const [referenceIds, setReferenceIds] = useState([]);
  const [mode, setMode] = useState("cinematic_motion");
  const [resolution, setResolution] = useState("720p");
  const [outputs, setOutputs] = useState(1);
  const [motion, setMotion] = useState("Slow cinematic push-in, subtle natural breathing and hair movement, gentle environmental motion, realistic phone-camera physics, no sudden movement.");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  async function load() {
    try {
      const { data: workspace, error: workspaceError } = await supabase.from("track_b_workspaces").select("id").eq("slug", "cornerstoneaiassets-internal").maybeSingle();
      if (workspaceError) throw workspaceError;
      if (!workspace) throw new Error("CornerstoneAIAssets workspace not found. Run the Track B SQL migration first.");
      const [c, b, p, a, j] = await Promise.all([
        supabase.from("track_b_characters").select("*").eq("workspace_id", workspace.id).order("created_at"),
        supabase.from("track_b_brands").select("*").eq("workspace_id", workspace.id).order("created_at"),
        supabase.from("track_b_products").select("*").order("created_at", { ascending: false }),
        supabase.from("track_b_assets").select("*").eq("workspace_id", workspace.id).eq("approval_status", "approved").order("created_at", { ascending: false }).limit(250),
        supabase.from("track_b_production_jobs").select("*, track_b_content_projects(title)").order("created_at", { ascending: false }).limit(30),
      ]);
      if (c.error) throw c.error; if (b.error) throw b.error; if (p.error) throw p.error; if (a.error) throw a.error; if (j.error) throw j.error;
      setCharacters(c.data || []); setBrands(b.data || []); setProducts(p.data || []); setAssets(a.data || []); setJobs(j.data || []);
      if (!characterId && c.data?.[0]) setCharacterId(c.data[0].id);
      if (!characterId && c.data?.[0]) setMessage(`Loaded ${c.data.length} character(s) and ${a.data?.length || 0} approved asset(s).`);
    } catch (error) { setMessage(error.message || String(error)); }
  }
  useEffect(() => { load(); }, []);

  const filteredProducts = useMemo(() => brandId ? products.filter((p) => p.brand_id === brandId) : products, [products, brandId]);
  const selectedCharacter = characters.find((c) => c.id === characterId);
  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedProduct = products.find((p) => p.id === productId);
  const selectedReferences = assets.filter((a) => referenceIds.includes(a.id));
  const estimatedUsd = estimate(mode, resolution, outputs);

  function toggleReference(id) { setReferenceIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]); }
  function flash(text) { setMessage(text); console.info("[CornerstoneAIAssets]", text); }

  const prompt = [
    `Premium social-first image-to-video for ${selectedCharacter?.name || "the selected creator"}.`,
    selectedBrand ? `Brand context: ${selectedBrand.name}.` : "",
    selectedProduct ? `Product: ${selectedProduct.name}. ${selectedProduct.description || ""}` : "",
    "Use the supplied approved source image as the exact first frame.",
    "Preserve identity, product appearance, wardrobe, environment and composition.",
    motion,
    "Natural human movement, grounded physics, subtle camera movement, premium editorial realism, no generic AI movement, no scene redesign.",
  ].filter(Boolean).join(" ");

  async function generateLive() {
    console.info("[CornerstoneAIAssets] generate clicked", { mode, resolution, outputs, referenceIds });
    if (!referenceIds.length) { flash("Select an approved image reference first. No generation has been submitted."); return; }
    if (!selectedReferences[0]?.public_url) { flash("The selected reference has no public URL, so it cannot be sent to the video model."); return; }
    if (!["cinematic_motion", "ugc"].includes(mode)) { flash("The first live adapter supports Cinematic Motion and UGC. Other modes are planning-only for now."); return; }
    setBusy(true); setVideoUrl(""); flash(`Submitting approved reference to fal.ai Wan 2.1. Estimated external cost: ${money(estimatedUsd)}.`);
    let projectId = null; let jobId = null;
    try {
      const { data: project, error: projectError } = await supabase.from("track_b_content_projects").insert({
        brand_id: brandId || null, product_id: productId || null,
        title: `${mode} · ${selectedCharacter?.name || "Creative"}${selectedProduct ? ` · ${selectedProduct.name}` : ""}`,
        source_type: "image",
        brief: { character_id: characterId || null, reference_asset_ids: referenceIds, motion_prompt: motion, provider: "fal-ai/wan-i2v", resolution, outputs },
        status: "in_production",
      }).select("id").single();
      if (projectError) throw projectError; projectId = project.id;

      const { data: job, error: jobError } = await supabase.from("track_b_production_jobs").insert({
        project_id: projectId, mode, target_duration_seconds: 5, output_count: outputs, provider_strategy: "premium", estimated_credits: 0, estimated_compute_tier: "medium",
        config: { provider: "fal-ai/wan-i2v", reference_asset_ids: referenceIds, estimated_usd: estimatedUsd, estimated_gbp: +(estimatedUsd * GBP_PER_USD).toFixed(2) }, status: "processing",
      }).select("id").single();
      if (jobError) throw jobError; jobId = job.id;

      const submitResponse = await fetch("/api/track-b-video-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: selectedReferences[0].public_url, prompt, resolution, aspectRatio: "9:16", numFrames: 81, fps: 16 }) });
      const submitText = await submitResponse.text(); let submit = {}; try { submit = JSON.parse(submitText); } catch {}
      console.info("[CornerstoneAIAssets] submit response", submitResponse.status, submit);
      if (!submitResponse.ok) throw new Error(submit?.error || `Video submit failed (${submitResponse.status})`);

      let completed = false;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 4500));
        const statusResponse = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: submit.requestId, action: "status" }) });
        const statusText = await statusResponse.text(); let status = {}; try { status = JSON.parse(statusText); } catch {}
        console.info("[CornerstoneAIAssets] poll", statusResponse.status, status);
        if (!statusResponse.ok) throw new Error(status?.error || `Video status check failed (${statusResponse.status})`);
        flash(`Generating… ${status.status}${status.queuePosition != null ? ` · queue ${status.queuePosition}` : ""}`);
        if (status.status === "COMPLETED") { completed = true; break; }
        if (["FAILED", "CANCELLED"].includes(status.status)) throw new Error(`fal.ai generation ${String(status.status).toLowerCase()}`);
      }
      if (!completed) throw new Error("Video generation timed out after about 6 minutes.");

      const resultResponse = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: submit.requestId, action: "result" }) });
      const resultText = await resultResponse.text(); let result = {}; try { result = JSON.parse(resultText); } catch {}
      if (!resultResponse.ok || !result.videoUrl) throw new Error(result?.error || `No completed video URL returned (${resultResponse.status})`);
      setVideoUrl(result.videoUrl);

      await supabase.from("track_b_production_shots").insert({ production_job_id: jobId, shot_order: 1, duration_seconds: 5, purpose: mode, motion_prompt: motion, reference_asset_ids: referenceIds, premium_generation: true, metadata: { provider: "fal-ai/wan-i2v", request_id: submit.requestId, result_url: result.videoUrl, estimated_usd: estimatedUsd, estimated_gbp: +(estimatedUsd * GBP_PER_USD).toFixed(2) } });
      await supabase.from("track_b_derivatives").insert({ project_id: projectId, parent_production_job_id: jobId, derivative_type: mode === "ugc" ? "reel" : "short", source_reference: { provider: "fal-ai/wan-i2v", request_id: submit.requestId, reference_asset_ids: referenceIds }, output_url: result.videoUrl, status: "completed", completed_at: new Date().toISOString() });
      await supabase.from("track_b_production_jobs").update({ status: "completed", completed_at: new Date().toISOString(), config: { provider: "fal-ai/wan-i2v", request_id: submit.requestId, output_url: result.videoUrl, reference_asset_ids: referenceIds, estimated_usd: estimatedUsd, estimated_gbp: +(estimatedUsd * GBP_PER_USD).toFixed(2) } }).eq("id", jobId);
      flash(`Done — 1 live premium clip generated for ${money(estimatedUsd)}.`); await load();
    } catch (error) {
      console.error("[CornerstoneAIAssets] generation error", error);
      if (jobId) await supabase.from("track_b_production_jobs").update({ status: "error", config: { error: error.message, estimated_usd: estimatedUsd, estimated_gbp: +(estimatedUsd * GBP_PER_USD).toFixed(2) } }).eq("id", jobId);
      flash(error.message || String(error));
    } finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: "28px 32px 72px", fontFamily: "Inter,system-ui,sans-serif" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto 18px" }}><div style={{ textTransform: "uppercase", letterSpacing: ".16em", fontSize: 10, color: "#d4af37", fontWeight: 800 }}>CornerstoneAIAssets · Track B</div><h1 style={{ margin: "8px 0 5px", fontSize: 34, letterSpacing: "-.04em" }}>Reference-aware Production Studio</h1><p style={{ margin: 0, color: "#7f8798", fontSize: 12 }}>Live first adapter: approved Asset Library image → fal.ai Wan 2.1 image-to-video.</p></div>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 16 }}>
        <section style={card}><b>References</b><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}><label style={{ fontSize: 11, color: "#9ca5b6" }}>Character<select style={input} value={characterId} onChange={(e) => setCharacterId(e.target.value)}><option value="">None</option>{characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label style={{ fontSize: 11, color: "#9ca5b6" }}>Brand<select style={input} value={brandId} onChange={(e) => { setBrandId(e.target.value); setProductId(""); }}><option value="">None</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div><label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Product<select style={input} value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">None</option>{filteredProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><div style={{ marginTop: 14, fontWeight: 800 }}>Approved source images</div><div style={{ color: "#7f8798", fontSize: 11, margin: "5px 0 10px" }}>The first selected image is the exact source frame sent to the video model.</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 9 }}>{assets.filter((a) => ["image", "reference"].includes(a.asset_type)).map((asset) => { const selected = referenceIds.includes(asset.id); return <button type="button" key={asset.id} onClick={() => toggleReference(asset.id)} style={{ padding: 0, textAlign: "left", overflow: "hidden", borderRadius: 12, border: `2px solid ${selected ? "#d4af37" : "#252a39"}`, background: "#0a0c12" }}>{asset.public_url ? <img src={asset.public_url} alt={asset.name} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} /> : <div style={{ aspectRatio: "4/3", display: "grid", placeItems: "center", color: "#667087" }}>NO URL</div>}<div style={{ padding: 8, color: "#fff", fontSize: 10, fontWeight: 800 }}>{asset.name}</div></button>; })}</div><div style={{ marginTop: 12, fontSize: 11, color: referenceIds.length ? "#9fe5bd" : "#ff9b9b" }}>Selected references: {referenceIds.length}</div></section>
        <section style={card}><b>Production mode</b><div style={{ display: "grid", gap: 8, marginTop: 10 }}>{MODES.map(([id, label, description]) => <button type="button" key={id} onClick={() => setMode(id)} style={{ ...button, textAlign: "left", borderColor: mode === id ? "#d4af37" : "#303648", background: mode === id ? "rgba(212,175,55,.11)" : "#151924" }}><div>{label}</div><div style={{ color: "#7f8798", fontSize: 10, marginTop: 3 }}>{description}</div></button>)}</div><label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Resolution<select style={input} value={resolution} onChange={(e) => setResolution(e.target.value)}><option value="720p">720p — recommended</option><option value="480p">480p — cheaper</option></select></label><label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Outputs<select style={input} value={outputs} onChange={(e) => setOutputs(Number(e.target.value))}>{[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label><label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Motion direction<textarea rows={6} style={{ ...input, resize: "vertical" }} value={motion} onChange={(e) => setMotion(e.target.value)} /></label><div style={{ ...card, background: "#0a0c12", marginTop: 12 }}><div style={{ fontSize: 10, textTransform: "uppercase", color: "#727c90" }}>Actual external generation cost</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 5 }}>{money(estimatedUsd)}</div><div style={{ color: "#7f8798", fontSize: 10, marginTop: 5 }}>720p = $0.40 per ~5s clip; 480p = $0.20.</div></div><button type="button" style={{ ...primary, width: "100%", marginTop: 12, opacity: busy ? 0.65 : 1 }} onClick={generateLive}>{busy ? "Generating…" : `Generate live clip · ${money(estimatedUsd)}`}</button>{videoUrl && <div style={{ marginTop: 14 }}><video src={videoUrl} controls playsInline style={{ width: "100%", borderRadius: 12, background: "#000" }} /><a href={videoUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, color: "#d4af37", fontSize: 11 }}>Open generated video →</a></div>}{message && <div style={{ marginTop: 12, color: "#cbd1dd", fontSize: 11, background: "#0a0c12", borderRadius: 10, padding: 10 }}>{message}</div>}</section>
      </div>
      <section style={{ maxWidth: 1240, margin: "16px auto 0", ...card }}><b>Recent production</b>{jobs.slice(0, 10).map((job) => { const config = asJson(job.config); return <div key={job.id} style={{ borderTop: "1px solid #252a39", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={{ fontSize: 11, fontWeight: 800 }}>{job.track_b_content_projects?.title || job.mode}</div><div style={{ color: "#7f8798", fontSize: 10, marginTop: 3 }}>{job.status} · {money(Number(config.estimated_usd || 0))}</div></div>{config.output_url && <a href={config.output_url} target="_blank" rel="noreferrer" style={{ color: "#d4af37", fontSize: 10 }}>Open →</a>}</div>; })}</section>
    </div>
  );
}
