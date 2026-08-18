import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const GBP_PER_USD = 0.737;
const GROK_SCENE_USD = 0.022;
const WAN_720_USD = 0.4;
const WAN_480_USD = 0.2;
const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18 };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 9, padding: 10 };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 9, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b" };

const MODES = [
  ["animate_existing", "Animate Existing", "Use the exact approved image as the video source."],
  ["scene_plus_motion", "Create Scene + Motion", "Use Cara/Lila identity refs → create a NEW scene → add premium motion."],
  ["ugc", "UGC", "Character + product reference → new scene → premium motion."],
  ["carousel", "Carousel", "Plan a coherent 4–6 image set."],
  ["multi_image_motion", "Multi-Image Motion", "Several approved/generated images → shot sequence."],
  ["short_form", "Short-form", "Build a social-first sequence shot-by-shot."],
  ["long_form", "Long-form", "Director plan with selective premium scenes."],
];

function money(usd) {
  const n = Number(usd) || 0;
  return `$${n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")} (~£${(n * GBP_PER_USD).toFixed(2)})`;
}

function personaFromCharacter(character) {
  const name = String(character?.name || "").toLowerCase();
  if (name.includes("lila")) return "lila";
  if (name.includes("duo") || name.includes("cara & lila") || name.includes("cara and lila")) return "duo";
  return "cara";
}

export default function CornerstoneAIAssetsProductionStudioV6() {
  const [characters, setCharacters] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [characterId, setCharacterId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productId, setProductId] = useState("");
  const [referenceIds, setReferenceIds] = useState([]);
  const [mode, setMode] = useState("scene_plus_motion");
  const [resolution, setResolution] = useState("720p");
  const [outputs, setOutputs] = useState(1);
  const [scenePrompt, setScenePrompt] = useState("Create a fresh candid scene for this creator. Keep identity locked to the reference images, but do not reuse the selected source image. Natural lived-in environment, premium phone realism, realistic wardrobe and lighting, visually specific and social-first.");
  const [motion, setMotion] = useState("Very subtle premium motion. Slow natural camera drift, gentle breathing, tiny posture adjustment and realistic environmental movement. Avoid deliberate blinking, avoid exaggerated facial motion, avoid sudden head turns, avoid morphing.");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [generatedSceneUrl, setGeneratedSceneUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  async function load() {
    try {
      const { data: workspace, error: workspaceError } = await supabase
        .from("track_b_workspaces")
        .select("id")
        .eq("slug", "cornerstoneaiassets-internal")
        .maybeSingle();
      if (workspaceError) throw workspaceError;
      if (!workspace) throw new Error("CornerstoneAIAssets workspace not found. Run the Track B SQL migration first.");

      const [c, b, p, a, j] = await Promise.all([
        supabase.from("track_b_characters").select("*").eq("workspace_id", workspace.id).order("created_at"),
        supabase.from("track_b_brands").select("*").eq("workspace_id", workspace.id).order("created_at"),
        supabase.from("track_b_products").select("*").order("created_at", { ascending: false }),
        supabase.from("track_b_assets").select("*").eq("workspace_id", workspace.id).eq("approval_status", "approved").order("created_at", { ascending: false }).limit(250),
        supabase.from("track_b_production_jobs").select("*, track_b_content_projects(title)").order("created_at", { ascending: false }).limit(30),
      ]);
      if (c.error) throw c.error;
      if (b.error) throw b.error;
      if (p.error) throw p.error;
      if (a.error) throw a.error;
      if (j.error) throw j.error;
      setCharacters(c.data || []); setBrands(b.data || []); setProducts(p.data || []); setAssets(a.data || []); setJobs(j.data || []);
      if (!characterId && c.data?.[0]) setCharacterId(c.data[0].id);
    } catch (error) {
      setMessage(error.message || String(error));
    }
  }

  useEffect(() => { load(); }, []);

  const filteredProducts = useMemo(() => brandId ? products.filter((p) => p.brand_id === brandId) : products, [products, brandId]);
  const selectedCharacter = characters.find((c) => c.id === characterId);
  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedProduct = products.find((p) => p.id === productId);
  const selectedReferences = assets.filter((a) => referenceIds.includes(a.id));
  const personaId = personaFromCharacter(selectedCharacter);
  const createScene = ["scene_plus_motion", "ugc"].includes(mode);
  const motionUsd = resolution === "480p" ? WAN_480_USD : WAN_720_USD;
  const estimatedUsd = (createScene ? GROK_SCENE_USD : 0) + motionUsd;

  function toggleReference(id) {
    setReferenceIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  function flash(text) {
    setMessage(text);
    console.info("[CornerstoneAIAssets]", text);
  }

  const finalScenePrompt = [
    scenePrompt,
    selectedBrand ? `Brand context: ${selectedBrand.name}.` : "",
    selectedProduct ? `Product context: ${selectedProduct.name}. ${selectedProduct.description || ""}` : "",
    createScene ? "Create a new scene rather than copying the selected approved source image. Keep the person recognisable from identity references." : "",
  ].filter(Boolean).join(" ");

  const motionPrompt = [
    motion,
    "Preserve the generated scene exactly as the starting frame.",
    "Keep identity, product appearance, wardrobe, environment and composition stable.",
    "Do not redesign the face or introduce a different person.",
  ].join(" ");

  async function pollImage(requestId, statusUrl, resultUrl) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const response = await fetch("/api/generate-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, type: "image", statusUrl, resultUrl }),
      });
      const text = await response.text();
      let data = {};
      try { data = JSON.parse(text); } catch { /* handled below */ }
      console.info("[CornerstoneAIAssets] Grok image poll", response.status, data);
      if (!response.ok) throw new Error(data?.error || `Grok image poll failed (${response.status})`);
      if (data.status === "COMPLETED") return data.imageUrl || data.url;
      if (data.status === "FAILED") throw new Error(data?.error || "Grok scene generation failed");
      flash(`Creating scene… ${data.status}${data.queuePosition != null ? ` · queue ${data.queuePosition}` : ""}`);
    }
    throw new Error("Grok scene generation timed out after about 4 minutes.");
  }

  async function pollVideo(requestId) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3500));
      const response = await fetch("/api/track-b-video-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "status" }),
      });
      const text = await response.text();
      let data = {};
      try { data = JSON.parse(text); } catch { /* handled below */ }
      console.info("[CornerstoneAIAssets] Wan poll", response.status, data);
      if (!response.ok) throw new Error(data?.error || `Video status check failed (${response.status})`);
      if (data.status === "COMPLETED") return true;
      if (["FAILED", "CANCELLED"].includes(data.status)) throw new Error(`fal.ai video generation ${String(data.status).toLowerCase()}`);
      flash(`Adding premium motion… ${data.status}${data.queuePosition != null ? ` · queue ${data.queuePosition}` : ""}`);
    }
    throw new Error("Video generation timed out after about 6 minutes.");
  }

  async function generateLive() {
    console.info("[CornerstoneAIAssets] generate clicked", { mode, resolution, outputs, referenceIds, personaId });
    if (!referenceIds.length) { flash("Select at least one approved Cara/Lila reference first. No generation submitted."); return; }
    if (!selectedReferences[0]?.public_url) { flash("The selected reference has no public URL."); return; }
    if (!["animate_existing", "scene_plus_motion", "ugc"].includes(mode)) { flash("This mode is planning-only for now. Use Animate Existing, Create Scene + Motion or UGC for the live test."); return; }
    setBusy(true); setGeneratedSceneUrl(""); setVideoUrl("");
    flash(createScene ? `Creating a new ${personaId} scene with Grok Imagine, then adding premium motion. Estimated total: ${money(estimatedUsd)}.` : `Animating the approved image with premium motion. Estimated total: ${money(estimatedUsd)}.`);
    let projectId = null; let jobId = null;
    try {
      const { data: project, error: projectError } = await supabase.from("track_b_content_projects").insert({
        brand_id: brandId || null,
        product_id: productId || null,
        title: `${mode} · ${selectedCharacter?.name || "Creative"}${selectedProduct ? ` · ${selectedProduct.name}` : ""}`,
        source_type: "image",
        brief: { character_id: characterId || null, persona_id: personaId, reference_asset_ids: referenceIds, scene_prompt: finalScenePrompt, motion_prompt: motionPrompt, provider: createScene ? "grok-imagine-image + fal-ai/wan-i2v" : "fal-ai/wan-i2v", resolution, outputs },
        status: "in_production",
      }).select("id").single();
      if (projectError) throw projectError;
      projectId = project.id;

      const { data: job, error: jobError } = await supabase.from("track_b_production_jobs").insert({
        project_id: projectId,
        mode,
        target_duration_seconds: 5,
        output_count: outputs,
        provider_strategy: "premium",
        estimated_credits: 0,
        estimated_compute_tier: "medium",
        config: { image_provider: createScene ? "grok-imagine-image-v2" : null, video_provider: "fal-ai/wan-i2v", reference_asset_ids: referenceIds, estimated_usd: estimatedUsd, estimated_gbp: +(estimatedUsd * GBP_PER_USD).toFixed(2) },
        status: "processing",
      }).select("id").single();
      if (jobError) throw jobError;
      jobId = job.id;

      let sourceImageUrl = selectedReferences[0].public_url;
      let sceneRequestId = null;

      if (createScene) {
        const sceneResponse = await fetch("/api/generate-submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imagePrompt: { subject: finalScenePrompt, photo_idea: finalScenePrompt },
            photo_idea: finalScenePrompt,
            hook: selectedProduct ? `Make the product context visually relevant without turning the image into a catalogue shot.` : "",
            caption: "",
            personaId,
          }),
        });
        const sceneText = await sceneResponse.text();
        let sceneJob = {};
        try { sceneJob = JSON.parse(sceneText); } catch { /* handled below */ }
        console.info("[CornerstoneAIAssets] Grok scene submit", sceneResponse.status, sceneJob);
        if (!sceneResponse.ok || !sceneJob.requestId) throw new Error(sceneJob?.error || `Grok scene submit failed (${sceneResponse.status})`);
        sceneRequestId = sceneJob.requestId;
        sourceImageUrl = await pollImage(sceneJob.requestId, sceneJob.statusUrl, sceneJob.resultUrl);
        if (!sourceImageUrl) throw new Error("Grok completed without an image URL");
        setGeneratedSceneUrl(sourceImageUrl);

        await supabase.from("track_b_assets").insert({
          workspace_id: (await supabase.from("track_b_workspaces").select("id").eq("slug", "cornerstoneaiassets-internal").single()).data?.id || null,
          asset_type: "image",
          name: `${selectedCharacter?.name || personaId} · Generated scene · ${new Date().toLocaleString()}`,
          provider: "grok-imagine-image-v2",
          public_url: sourceImageUrl,
          source_url: selectedReferences[0].public_url,
          prompt: finalScenePrompt,
          approval_status: "draft",
          metadata: { persona_id: personaId, source_reference_ids: referenceIds, scene_request_id: sceneRequestId, product_id: productId || null, brand_id: brandId || null },
        });
        flash("New scene created with Grok. Now adding premium motion…");
      }

      const videoResponse = await fetch("/api/track-b-video-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: sourceImageUrl, prompt: motionPrompt, resolution, aspectRatio: "9:16", numFrames: 81, fps: 16 }),
      });
      const videoText = await videoResponse.text();
      let videoJob = {};
      try { videoJob = JSON.parse(videoText); } catch { /* handled below */ }
      console.info("[CornerstoneAIAssets] video submit", videoResponse.status, videoJob);
      if (!videoResponse.ok || !videoJob.requestId) throw new Error(videoJob?.error || `Video submit failed (${videoResponse.status})`);
      await pollVideo(videoJob.requestId);

      const resultResponse = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: videoJob.requestId, action: "result" }) });
      const resultText = await resultResponse.text();
      let result = {};
      try { result = JSON.parse(resultText); } catch { /* handled below */ }
      if (!resultResponse.ok || !result.videoUrl) throw new Error(result?.error || `No completed video URL returned (${resultResponse.status})`);
      setVideoUrl(result.videoUrl);

      await supabase.from("track_b_production_shots").insert({
        production_job_id: jobId,
        shot_order: 1,
        duration_seconds: 5,
        purpose: mode,
        motion_prompt: motionPrompt,
        reference_asset_ids: referenceIds,
        premium_generation: true,
        metadata: { image_provider: createScene ? "grok-imagine-image-v2" : null, image_request_id: sceneRequestId, video_provider: "fal-ai/wan-i2v", video_request_id: videoJob.requestId, source_frame_url: sourceImageUrl, result_url: result.videoUrl, estimated_usd: estimatedUsd, estimated_gbp: +(estimatedUsd * GBP_PER_USD).toFixed(2) },
      });

      await supabase.from("track_b_derivatives").insert({
        project_id: projectId,
        parent_production_job_id: jobId,
        derivative_type: mode === "ugc" ? "reel" : "short",
        source_reference: { image_provider: createScene ? "grok-imagine-image-v2" : null, image_request_id: sceneRequestId, video_provider: "fal-ai/wan-i2v", video_request_id: videoJob.requestId, reference_asset_ids: referenceIds },
        output_url: result.videoUrl,
        status: "completed",
        completed_at: new Date().toISOString(),
      });

      await supabase.from("track_b_production_jobs").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        config: { image_provider: createScene ? "grok-imagine-image-v2" : null, image_request_id: sceneRequestId, source_frame_url: sourceImageUrl, video_provider: "fal-ai/wan-i2v", video_request_id: videoJob.requestId, output_url: result.videoUrl, reference_asset_ids: referenceIds, estimated_usd: estimatedUsd, estimated_gbp: +(estimatedUsd * GBP_PER_USD).toFixed(2) },
      }).eq("id", jobId);

      flash(`Done — ${createScene ? "new Grok scene +" : ""} premium motion complete. Total generation estimate ${money(estimatedUsd)}.`);
      await load();
    } catch (error) {
      console.error("[CornerstoneAIAssets] generation error", error);
      if (jobId) await supabase.from("track_b_production_jobs").update({ status: "error", config: { error: error.message, estimated_usd: estimatedUsd, estimated_gbp: +(estimatedUsd * GBP_PER_USD).toFixed(2) } }).eq("id", jobId);
      flash(error.message || String(error));
    } finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: "28px 32px 72px", fontFamily: "Inter,system-ui,sans-serif" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto 18px" }}>
        <div style={{ textTransform: "uppercase", letterSpacing: ".16em", fontSize: 10, color: "#d4af37", fontWeight: 800 }}>CornerstoneAIAssets · Track B</div>
        <h1 style={{ margin: "8px 0 5px", fontSize: 34, letterSpacing: "-.04em" }}>Reference-aware Production Studio</h1>
        <p style={{ margin: 0, color: "#7f8798", fontSize: 12 }}>Identity refs → Grok scene creation → premium motion. Or animate an existing approved image directly.</p>
      </div>

      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: "1.12fr .88fr", gap: 16 }}>
        <section style={card}>
          <b>Reference memory</b>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Character<select style={input} value={characterId} onChange={(e) => setCharacterId(e.target.value)}><option value="">None</option>{characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Brand<select style={input} value={brandId} onChange={(e) => { setBrandId(e.target.value); setProductId(""); }}><option value="">None</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          </div>
          <label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Product<select style={input} value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">None</option>{filteredProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <div style={{ marginTop: 14, fontWeight: 800 }}>Approved identity / source images</div>
          <div style={{ color: "#7f8798", fontSize: 11, margin: "5px 0 10px" }}>For Create Scene + Motion, these are identity/context references. They do not become the final frame.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 9 }}>
            {assets.filter((asset) => ["image", "reference"].includes(asset.asset_type)).map((asset) => {
              const selected = referenceIds.includes(asset.id);
              return <button type="button" key={asset.id} onClick={() => toggleReference(asset.id)} style={{ padding: 0, textAlign: "left", overflow: "hidden", borderRadius: 12, border: `2px solid ${selected ? "#d4af37" : "#252a39"}`, background: "#0a0c12" }}>
                {asset.public_url ? <img src={asset.public_url} alt={asset.name} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} /> : <div style={{ aspectRatio: "4/3", display: "grid", placeItems: "center", color: "#667087" }}>NO URL</div>}
                <div style={{ padding: 8, color: "#fff", fontSize: 10, fontWeight: 800 }}>{asset.name}</div>
              </button>;
            })}
          </div>
        </section>

        <section style={card}>
          <b>Production</b>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {MODES.map(([id, label, description]) => <button type="button" key={id} onClick={() => setMode(id)} style={{ ...button, textAlign: "left", borderColor: mode === id ? "#d4af37" : "#303648", background: mode === id ? "rgba(212,175,55,.11)" : "#151924" }}><div>{label}</div><div style={{ color: "#7f8798", fontSize: 10, marginTop: 3 }}>{description}</div></button>)}
          </div>

          <label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Scene / creative direction<textarea rows={6} style={{ ...input, resize: "vertical" }} value={scenePrompt} onChange={(e) => setScenePrompt(e.target.value)} /></label>
          <div style={{ fontSize: 10, color: "#778095", marginTop: 5 }}>Tell Grok what new moment to create. Keep the identity references selected above.</div>

          <label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Motion direction<textarea rows={5} style={{ ...input, resize: "vertical" }} value={motion} onChange={(e) => setMotion(e.target.value)} /></label>

          <label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Resolution<select style={input} value={resolution} onChange={(e) => setResolution(e.target.value)}><option value="720p">720p — recommended</option><option value="480p">480p — cheaper</option></select></label>
          <label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Outputs<select style={input} value={outputs} onChange={(e) => setOutputs(Number(e.target.value))}>{[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>

          <div style={{ ...card, background: "#0a0c12", marginTop: 12 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", color: "#727c90" }}>Estimated external generation cost</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 5 }}>{money(estimatedUsd * Math.max(1, outputs))}</div>
            <div style={{ color: "#7f8798", fontSize: 10, marginTop: 5 }}>{createScene ? "Grok Imagine scene $0.022 + " : ""}{resolution === "720p" ? "Wan 2.1 720p $0.40" : "Wan 2.1 480p $0.20"} per output.</div>
          </div>

          <button type="button" style={{ ...primary, width: "100%", marginTop: 12 }} onClick={generateLive} disabled={busy || !referenceIds.length}>{busy ? "Working…" : `Generate ${createScene ? "scene + motion" : "motion"} · ${money(estimatedUsd * Math.max(1, outputs))}`}</button>
          {generatedSceneUrl && <div style={{ marginTop: 14 }}><div style={{ fontSize: 10, color: "#727c90", textTransform: "uppercase", marginBottom: 6 }}>Generated scene frame</div><img src={generatedSceneUrl} alt="Generated scene" style={{ width: "100%", borderRadius: 12, display: "block" }} /></div>}
          {videoUrl && <div style={{ marginTop: 14 }}><video src={videoUrl} controls playsInline style={{ width: "100%", borderRadius: 12, background: "#000" }} /><a href={videoUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, color: "#d4af37", fontSize: 11 }}>Open generated video →</a></div>}
          {message && <div style={{ color: "#cbd1dd", fontSize: 11, marginTop: 12 }}>{message}</div>}
        </section>
      </div>

      <section style={{ maxWidth: 1240, margin: "16px auto 0", ...card }}>
        <b>Recent production</b>
        {jobs.slice(0, 10).map((job) => {
          const config = job.config && typeof job.config === "object" ? job.config : {};
          return <div key={job.id} style={{ borderTop: "1px solid #252a39", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div><div style={{ fontSize: 11, fontWeight: 800 }}>{job.track_b_content_projects?.title || job.mode}</div><div style={{ color: "#7f8798", fontSize: 10, marginTop: 3 }}>{job.status} · {money(Number(config.estimated_usd || 0))}</div></div>
            {config.output_url && <a href={config.output_url} target="_blank" rel="noreferrer" style={{ color: "#d4af37", fontSize: 10 }}>Open →</a>}
          </div>;
        })}
      </section>
    </div>
  );
}
