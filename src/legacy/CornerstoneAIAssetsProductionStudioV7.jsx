import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const GBP_PER_USD = 0.737;
const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18 };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 9, padding: 10 };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 9, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b" };

const MODELS = {
  grok: { label: "Grok Imagine Video", model: "xai/grok-imagine-video/image-to-video", costPerSec: 0.07, duration: 6, resolution: "720p" },
  h3: { label: "MiniMax H3", model: "minimax/h3/image-to-video", costPerSec: null, duration: 8, resolution: "2K" },
  kling: { label: "Kling 3.0 Pro", model: "fal-ai/kling-video/v3/pro/image-to-video", costPerSec: 0.168, duration: 5, resolution: "720p" },
  seedance: { label: "Seedance 2.0 Fast", model: "bytedance/seedance-2.0/fast/image-to-video", costPerSec: 0.2419, duration: 10, resolution: "720p" },
};

function money(usd) {
  if (usd == null) return "Provider pricing varies";
  return `$${usd.toFixed(2)} (~£${(usd * GBP_PER_USD).toFixed(2)})`;
}

function personaFromCharacter(character) {
  const name = String(character?.name || "").toLowerCase();
  if (name.includes("lila")) return "lila";
  if (name.includes("duo") || name.includes("cara & lila") || name.includes("cara and lila")) return "duo";
  return "cara";
}

export default function CornerstoneAIAssetsProductionStudioV7() {
  const [characters, setCharacters] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [characterId, setCharacterId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productId, setProductId] = useState("");
  const [referenceIds, setReferenceIds] = useState([]);
  const [tier, setTier] = useState("simple");
  const [modelKey, setModelKey] = useState("grok");
  const [shotType, setShotType] = useState("ugc");
  const [duration, setDuration] = useState(6);
  const [resolution, setResolution] = useState("720p");
  const [direction, setDirection] = useState("Natural handheld social video. Subtle camera movement, realistic micro-expressions, believable body motion, authentic environment movement, no face drift, no scene redesign.");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [captionStatus, setCaptionStatus] = useState("");

  async function load() {
    const { data: workspace, error: workspaceError } = await supabase
      .from("track_b_workspaces").select("id").eq("slug", "cornerstoneaiassets-internal").maybeSingle();
    if (workspaceError) return setMessage(workspaceError.message);
    if (!workspace) return setMessage("CornerstoneAIAssets workspace not found. Run the Track B SQL migration first.");
    const [c, b, p, a] = await Promise.all([
      supabase.from("track_b_characters").select("*").eq("workspace_id", workspace.id).order("created_at"),
      supabase.from("track_b_brands").select("*").eq("workspace_id", workspace.id).order("created_at"),
      supabase.from("track_b_products").select("*").order("created_at", { ascending: false }),
      supabase.from("track_b_assets").select("*").eq("workspace_id", workspace.id).eq("approval_status", "approved").order("created_at", { ascending: false }).limit(250),
    ]);
    if (c.error) return setMessage(c.error.message);
    if (b.error) return setMessage(b.error.message);
    if (p.error) return setMessage(p.error.message);
    if (a.error) return setMessage(a.error.message);
    setCharacters(c.data || []); setBrands(b.data || []); setProducts(p.data || []); setAssets(a.data || []);
    if (!characterId && c.data?.[0]) setCharacterId(c.data[0].id);
  }

  useEffect(() => { load(); }, []);

  const filteredProducts = useMemo(() => brandId ? products.filter((p) => p.brand_id === brandId) : products, [products, brandId]);
  const selectedCharacter = characters.find((c) => c.id === characterId);
  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedProduct = products.find((p) => p.id === productId);
  const selectedReferences = assets.filter((a) => referenceIds.includes(a.id));
  const personaId = personaFromCharacter(selectedCharacter);
  const model = MODELS[modelKey];
  const estimatedUsd = model.costPerSec == null ? null : model.costPerSec * duration;

  function toggleReference(id) {
    setReferenceIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  function chooseTier(next) {
    setTier(next);
    if (next === "simple") {
      setModelKey("grok"); setDuration(6); setResolution("720p");
    } else {
      setModelKey("h3"); setDuration(8); setResolution("2K");
    }
  }

  function chooseModel(next) {
    setModelKey(next);
    const preset = MODELS[next];
    setDuration(preset.duration);
    setResolution(preset.resolution);
  }

  async function generate() {
    if (!referenceIds.length) return setMessage("Select an approved source image first.");
    if (!selectedReferences[0]?.public_url) return setMessage("The selected image has no public URL.");
    setBusy(true); setVideoUrl(""); setCaptionStatus("");
    const ratio = shotType === "drone" ? "16:9" : "9:16";
    const prompt = [
      `Create a ${tier === "simple" ? "short-form social" : "premium multi-shot or cinematic"} video using the supplied image as the locked opening frame.`,
      `Shot type: ${shotType}.`,
      selectedCharacter ? `Creator: ${selectedCharacter.name}.` : "",
      selectedBrand ? `Brand: ${selectedBrand.name}.` : "",
      selectedProduct ? `Product: ${selectedProduct.name}. ${selectedProduct.description || ""}` : "",
      direction,
      "Preserve identity exactly. Preserve wardrobe, proportions, product appearance and environment. No face drift, no duplicate person, no CGI look, no beauty filter, no random wardrobe changes.",
      shotType === "drone" ? "Drone language: controlled aerial reveal, realistic parallax, natural speed, physically believable camera path, premium property-film feel. No impossible flight path." : "",
      tier === "advanced" ? "Think like a director: use clear beats, deliberate camera movement, believable physical interaction and a controlled ending rather than generic image animation." : "",
    ].filter(Boolean).join(" ");

    try {
      const submitResponse = await fetch("/api/track-b-video-submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: selectedReferences[0].public_url, prompt, provider: modelKey, resolution, aspectRatio: ratio, duration }),
      });
      const submit = await submitResponse.json().catch(() => ({}));
      if (!submitResponse.ok) throw new Error(submit?.error || `Video submit failed (${submitResponse.status})`);
      setMessage(`Generating with ${model.label}… ${estimatedUsd == null ? "provider pricing" : money(estimatedUsd)}`);

      let completed = false;
      for (let attempt = 0; attempt < 90; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 3500));
        const response = await fetch("/api/track-b-video-poll", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: submit.requestId, action: "status", provider: submit.provider, model: submit.model, statusUrl: submit.statusUrl }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || `Video status failed (${response.status})`);
        setMessage(`${model.label}: ${data.status}${data.queuePosition != null ? ` · queue ${data.queuePosition}` : ""}`);
        if (data.status === "COMPLETED") { completed = true; break; }
        if (["FAILED", "CANCELLED"].includes(data.status)) throw new Error(data?.error || `Video generation ${String(data.status).toLowerCase()}`);
      }
      if (!completed) throw new Error("Video generation timed out.");

      const resultResponse = await fetch("/api/track-b-video-poll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: submit.requestId, action: "result", provider: submit.provider, model: submit.model }),
      });
      const result = await resultResponse.json().catch(() => ({}));
      if (!resultResponse.ok || !result.videoUrl) throw new Error(result?.error || "No completed video URL returned.");
      setVideoUrl(result.videoUrl);

      const { data: project, error: projectError } = await supabase.from("track_b_content_projects").insert({
        brand_id: brandId || null, product_id: productId || null,
        title: `${tier} reel · ${selectedCharacter?.name || "Creator"}${selectedProduct ? ` · ${selectedProduct.name}` : ""}`,
        source_type: "image",
        brief: { persona_id: personaId, reference_asset_ids: referenceIds, shot_type: shotType, model: submit.model, direction, duration, resolution, aspect_ratio: ratio },
        status: "completed",
      }).select("id").single();
      if (projectError) throw projectError;
      const { data: job, error: jobError } = await supabase.from("track_b_production_jobs").insert({
        project_id: project.id, mode: tier === "simple" ? "cinematic_motion" : "short_form", target_duration_seconds: duration, output_count: 1,
        provider_strategy: "fal", estimated_credits: 0, estimated_compute_tier: tier === "simple" ? "low" : "premium",
        config: { provider: submit.provider, model: submit.model, output_url: result.videoUrl, estimated_usd: estimatedUsd, shot_type: shotType }, status: "completed", completed_at: new Date().toISOString(),
      }).select("id").single();
      if (jobError) throw jobError;
      await supabase.from("track_b_production_shots").insert({ production_job_id: job.id, shot_order: 1, duration_seconds: duration, purpose: shotType, motion_prompt: direction, reference_asset_ids: referenceIds, premium_generation: tier === "advanced", metadata: { provider: submit.provider, model: submit.model, result_url: result.videoUrl } });
      await supabase.from("track_b_derivatives").insert({ project_id: project.id, parent_production_job_id: job.id, derivative_type: "reel", source_reference: { provider: submit.provider, model: submit.model, reference_asset_ids: referenceIds }, output_url: result.videoUrl, status: "completed", completed_at: new Date().toISOString() });

      const captionInsert = await supabase.from("caption_jobs").insert({
        title: `${selectedCharacter?.name || "Creator"} · ${tier} reel`, source_url: result.videoUrl, transcript: null,
        hook: "", style: "cara_editorial", aspect_ratio: ratio, position: "lower_center", options: { auto_transcribe: true, source_job_id: job.id }, status: "queued",
      }).select("id").single();
      setCaptionStatus(captionInsert.error ? "Caption queue error" : "Caption queued");
      setMessage(`Finished. ${model.label} clip is ready.`);
    } catch (error) {
      setMessage(error.message || String(error));
    } finally { setBusy(false); }
  }

  return <div style={{ minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: "28px 32px 72px", fontFamily: "Inter,system-ui,sans-serif" }}>
    <div style={{ maxWidth: 1240, margin: "0 auto 18px" }}>
      <div style={{ textTransform: "uppercase", letterSpacing: ".16em", fontSize: 10, color: "#d4af37", fontWeight: 800 }}>CornerstoneAIAssets · Reel Studio</div>
      <h1 style={{ margin: "8px 0 5px", fontSize: 34, letterSpacing: "-.04em" }}>Simple Reels → Advanced Reels</h1>
      <p style={{ margin: 0, color: "#7f8798", fontSize: 12 }}>One approved image in. The app chooses a proper image-to-video model, then queues captions automatically.</p>
    </div>

    <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
      <section style={card}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button type="button" onClick={() => chooseTier("simple")} style={tier === "simple" ? primary : button}>Simple Reel</button>
          <button type="button" onClick={() => chooseTier("advanced")} style={tier === "advanced" ? primary : button}>Advanced Reel</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ fontSize: 11, color: "#9ca5b6" }}>Character<select style={input} value={characterId} onChange={(e) => setCharacterId(e.target.value)}><option value="">None</option>{characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label style={{ fontSize: 11, color: "#9ca5b6" }}>Shot type<select style={input} value={shotType} onChange={(e) => setShotType(e.target.value)}><option value="ugc">UGC / Talking Head</option><option value="lifestyle">Lifestyle / Product</option><option value="drone">Cinematic Drone / Real Estate</option></select></label>
        </div>

        {tier === "advanced" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
          <label style={{ fontSize: 11, color: "#9ca5b6" }}>Video model<select style={input} value={modelKey} onChange={(e) => chooseModel(e.target.value)}>{Object.entries(MODELS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
          <label style={{ fontSize: 11, color: "#9ca5b6" }}>Duration<select style={input} value={duration} onChange={(e) => setDuration(Number(e.target.value))}><option value={5}>5 sec</option><option value={6}>6 sec</option><option value={8}>8 sec</option><option value={10}>10 sec</option><option value={15}>15 sec</option></select></label>
          <label style={{ fontSize: 11, color: "#9ca5b6" }}>Resolution<select style={input} value={resolution} onChange={(e) => setResolution(e.target.value)}><option value="720p">720p</option><option value="2K">2K</option></select></label>
        </div>}

        <label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 12 }}>Direction / script<textarea rows={6} style={{ ...input, marginTop: 6, resize: "vertical" }} value={direction} onChange={(e) => setDirection(e.target.value)} /></label>

        <div style={{ marginTop: 14, fontWeight: 800 }}>Approved source images</div>
        <div style={{ color: "#7f8798", fontSize: 11, margin: "5px 0 10px" }}>Select the image you want as the locked starting point. The first selected image is used.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 9 }}>{assets.filter((a) => ["image", "reference"].includes(a.asset_type)).map((asset) => { const selected = referenceIds.includes(asset.id); return <button type="button" key={asset.id} onClick={() => toggleReference(asset.id)} style={{ padding: 0, textAlign: "left", overflow: "hidden", borderRadius: 12, border: `2px solid ${selected ? "#d4af37" : "#252a39"}`, background: "#0a0c12" }}>{asset.public_url ? <img src={asset.public_url} alt={asset.name} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} /> : <div style={{ aspectRatio: "4/3", display: "grid", placeItems: "center", color: "#777d94" }}>No preview</div>}<div style={{ padding: 7, fontSize: 10 }}>{asset.name}</div></button>; })}</div>

        <button type="button" disabled={busy} onClick={generate} style={{ ...primary, width: "100%", marginTop: 16, opacity: busy ? .55 : 1 }}>{busy ? "Generating…" : `Generate ${tier === "simple" ? "Simple" : "Advanced"} Reel`}</button>
        <div style={{ marginTop: 10, color: "#8d95a7", fontSize: 11 }}>Estimated video cost: {money(estimatedUsd)}. Simple defaults to Grok Imagine Video for a cheap 6s test. Advanced exposes H3, Kling 3.0 Pro, Seedance 2.0 Fast and Grok.</div>
      </section>

      <section style={card}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Production</div>
        <div style={{ color: "#9ca5b6", fontSize: 12, lineHeight: 1.6 }}>{message || "Ready."}</div>
        {captionStatus && <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#141525", border: "1px solid #252a39", fontSize: 11 }}>Captions: <b>{captionStatus}</b></div>}
        {videoUrl && <div style={{ marginTop: 14 }}><video src={videoUrl} controls playsInline style={{ width: "100%", borderRadius: 12, background: "#000" }} /><a href={videoUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 10, color: "#f7d77b", fontWeight: 800 }}>Open / download video</a></div>}
        <div style={{ marginTop: 18, fontSize: 11, color: "#7f8798" }}>
          <b>Simple</b>: fast 5–6s motion for testing, social cutaways and low-cost volume.<br />
          <b>Advanced</b>: H3 for richer multimodal shots, Kling for polished creator motion, Seedance for cinematic multi-beat shots, Grok for fast photoreal social clips.
        </div>
      </section>
    </div>
  </div>;
}
