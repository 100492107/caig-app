import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18 };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 9, padding: 10 };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 9, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b" };
const danger = { ...button, borderColor: "#6b3131", background: "rgba(160,60,60,.1)", color: "#ffb0b0" };
const MODEL = "mlx-community/Qwen3-8B-4bit";

const DEFAULT_SYSTEM = `You are the local creative director and video prompt writer for CornerstoneAIAssets.
Write production-grade, human, platform-native output. Avoid generic AI phrasing, hustle-bro language, fabricated claims and empty adjectives.
Never invent bank balances, prices, performance numbers, brands, screenshots or factual claims unless supplied by the user.
For video production, think like a director: continuity, action, camera language, timing, sound design and payoff matter.
The finished video must feel like real creator footage, not a single animated still.
When writing for Cara or Lila, preserve the supplied persona and visual identity.`;

const PRESETS = {
  creative_director: "Create 5 short-form hooks for Cara about discipline and money. Make them specific, slightly blunt and British. No generic motivational quotes.",
  content_package: `Create a production-ready 30-second short-form video package for Cara about discipline and money. Return these sections exactly: HOOK, SCRIPT, VIDEO PROMPT, SHOT TIMELINE, AUDIO, CAPTION PLAN, EDIT NOTES, NEGATIVE CONSTRAINTS.
VIDEO PROMPT must be a single production prompt in the style of modern multi-shot video systems: exact reference-image role, identity/continuity lock, realistic phone-camera style, 6 timed beats covering 0-30s, camera movement, body movement, dialogue placement, realistic diegetic audio, and a final payoff. The result should feel like authentic social video, not cinematic AI footage.
Make it specific, slightly blunt and British. No generic motivational quotes and do not invent factual figures. No subtitles or text overlays in the generated video; CAIG adds captions later.`,
  caption_direction: "Create a caption treatment for a 30-second Cara talking-head video about discipline and money. Give the hook, caption rhythm, emphasis words, line-break rules and edit/punch-in notes.",
  repurpose: "Turn the idea into a 30-second short-form video package with hook, script, VIDEO PROMPT, SHOT TIMELINE, AUDIO, caption plan and CTA. Preserve persona and make it platform-native.",
  fanvue_copy: "Create 5 non-explicit Fanvue post concepts and captions for Cara. Keep them personal, confident, teasing-but-safe and socially native.",
  prompt_builder: "Build a production-ready image/video prompt for a photorealistic Cara social post. Include reference role, setting, wardrobe, camera, action, lighting, audio, identity-lock and negative constraints.",
};

const norm = (value) => String(value ?? "").replace(/\r/g, "").trim();

function extractSection(text, labels) {
  const source = norm(text);
  const upper = source.toUpperCase();
  for (const label of labels) {
    const token = label.toUpperCase();
    const candidates = [token, `## ${token}`, `### ${token}`, `**${token}**`];
    let start = -1;
    let matched = "";
    for (const candidate of candidates) {
      const i = upper.indexOf(candidate);
      if (i >= 0 && (start < 0 || i < start)) { start = i; matched = candidate; }
    }
    if (start < 0) continue;
    const bodyStart = start + matched.length;
    let end = source.length;
    const nextLabels = ["HOOK", "SCRIPT", "VIDEO PROMPT", "SHOT TIMELINE", "AUDIO", "CAPTION PLAN", "EDIT NOTES", "NEGATIVE CONSTRAINTS", "CTA"].filter((x) => !labels.includes(x));
    for (const next of nextLabels) {
      const re = new RegExp(`(?:^|\\n)\\s*(?:#{1,3}\\s*)?(?:\\*\\*)?${next.replace(/[-\\/\\^$*+?.()|[\]{}]/g, "\\$&")}(?:\\*\\*)?\\s*(?::|\\n|$)`, "i");
      const match = re.exec(source.slice(bodyStart));
      if (match) end = Math.min(end, bodyStart + match.index);
    }
    return source.slice(bodyStart, end).replace(/^\s*[:\-]?\s*/, "").trim();
  }
  return "";
}

function parsePackage(result) {
  const text = norm(result);
  return {
    hook: extractSection(text, ["HOOK"]),
    script: extractSection(text, ["SCRIPT", "SPOKEN SCRIPT", "VIDEO SCRIPT"]),
    videoPrompt: extractSection(text, ["VIDEO PROMPT", "SEEDANCE PROMPT", "PRODUCTION PROMPT"]),
    timeline: extractSection(text, ["SHOT TIMELINE", "TIMELINE", "SHOT LIST"]),
    audio: extractSection(text, ["AUDIO", "AUDIO DIRECTION"]),
    edit: extractSection(text, ["EDIT NOTES"]),
    negative: extractSection(text, ["NEGATIVE CONSTRAINTS", "NEGATIVE"]),
  };
}

function buildSeedancePrompt(job, parsed) {
  const persona = job.persona_id === "lila" ? "Lila" : "Cara";
  return [
    parsed.videoPrompt,
    parsed.timeline ? `SHOT TIMELINE:\n${parsed.timeline}` : "",
    parsed.audio ? `AUDIO:\n${parsed.audio}` : "",
    parsed.script ? `DIALOGUE / SCRIPT:\n${parsed.script}` : "",
    `Identity & continuity: Use the supplied ${persona} reference image as the identity anchor. Preserve exact face, skin tone, hairstyle, body proportions, outfit and jewellery throughout. No identity drift, no duplicate person, no facial morphing.`,
    "Style: authentic smartphone creator footage, realistic autofocus breathing, exposure shifts, subtle handheld movement, natural motion blur, realistic colour. Avoid a glossy commercial or cinematic-AI look.",
    "Do not generate subtitles, captions, logos or text overlays. CAIG adds captions in post.",
    parsed.negative ? `NEGATIVE: ${parsed.negative}` : "Negative: no identity drift, no warped hands, no extra fingers, no duplicate person, no CGI look, no beauty filter, no watermark.",
  ].filter(Boolean).join("\n\n");
}

export default function LocalAIStudio() {
  const [title, setTitle] = useState("Local Qwen test");
  const [jobType, setJobType] = useState("content_package");
  const [personaId, setPersonaId] = useState("cara");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM);
  const [prompt, setPrompt] = useState(PRESETS.content_package);
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("local_ai_jobs")
      .select("id,title,job_type,model,status,result,error_message,created_at,completed_at,persona_id,production_status,video_url,caption_job_id,captioned_video_url")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) setMessage(error.message);
    else setJobs(data || []);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, []);

  function onJobTypeChange(value) {
    setJobType(value);
    setPrompt(PRESETS[value] || PRESETS.creative_director);
  }

  async function queue() {
    if (!prompt.trim()) return;
    setBusy(true);
    setMessage("Queueing local Qwen job…");
    const { error } = await supabase.from("local_ai_jobs").insert({
      title: title.trim() || "Local AI job",
      job_type: jobType,
      model: MODEL,
      persona_id: personaId,
      system_prompt: systemPrompt.trim(),
      user_prompt: prompt.trim(),
      options: { max_tokens: jobType === "content_package" || jobType === "repurpose" ? 1800 : 768, temperature: 0.68 },
      status: "queued",
      production_status: "not_started",
    });
    if (error) setMessage(`Could not queue job: ${error.message}`);
    else { setMessage("Queued. Your Mac's local Qwen worker will pick it up when running."); await load(); }
    setBusy(false);
  }

  async function deleteJob(id) {
    if (!window.confirm("Delete this Local AI job and saved result?")) return;
    const { error } = await supabase.from("local_ai_jobs").delete().eq("id", id);
    if (error) setMessage(`Could not delete: ${error.message}`);
    else await load();
  }

  async function updateProduction(id, patch) {
    const { error } = await supabase.from("local_ai_jobs").update(patch).eq("id", id);
    if (error) throw error;
    await load();
  }

  async function pollImage(requestId, statusUrl, resultUrl) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const response = await fetch("/api/generate-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, type: "image", statusUrl, resultUrl }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Image poll failed (${response.status})`);
      setMessage(`Creating ${personaId} visual anchor… ${data.status || "working"}`);
      if (data.status === "COMPLETED") return data.imageUrl || data.url;
      if (data.status === "FAILED") throw new Error(data?.error || "Scene generation failed");
    }
    throw new Error("Scene generation timed out.");
  }

  async function pollVideo(requestId, provider) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const response = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, provider, action: "status" }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Video status failed (${response.status})`);
      setMessage(`Generating video with ${provider === "seedance_2_5" ? "Seedance 2.5" : "Wan fallback"}… ${data.status || "working"}`);
      if (data.status === "COMPLETED") return true;
      if (["FAILED", "CANCELLED"].includes(data.status)) throw new Error(data?.detail?.error?.message || data?.error || `Video generation ${String(data.status).toLowerCase()}`);
    }
    throw new Error("Video generation timed out after about 10 minutes.");
  }

  async function produceVideo(job) {
    if (!["content_package", "repurpose"].includes(job.job_type)) { setMessage("Produce Video is available for Full content package / Repurpose jobs."); return; }
    setBusy(true);
    setMessage("Starting Seedance-style production pipeline…");
    try {
      const parsed = parsePackage(job.result);
      if (!parsed.script) throw new Error("No usable SCRIPT found. Delete this job and run a fresh Full content package.");
      const videoPrompt = buildSeedancePrompt(job, parsed);
      await updateProduction(job.id, { production_status: "producing", error_message: null });

      const scenePrompt = [
        parsed.videoPrompt || parsed.hook || "authentic talking-head creator scene",
        `Create the visual anchor for ${job.persona_id === "lila" ? "Lila" : "Cara"}.`,
        "Vertical 9:16 social-first frame, realistic smartphone capture, lived-in environment, natural face, strong eye contact, correct wardrobe and jewellery from references.",
        "This image is the reference frame for the final multi-shot video; prioritize exact identity and continuity over decorative composition.",
      ].join(" ");

      const imageSubmit = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: { subject: scenePrompt, photo_idea: scenePrompt }, photo_idea: scenePrompt, hook: parsed.hook, caption: "", personaId: job.persona_id || "cara" }) });
      const imageJob = await imageSubmit.json().catch(() => ({}));
      if (!imageSubmit.ok || !imageJob.requestId) throw new Error(imageJob?.error || `Visual anchor submit failed (${imageSubmit.status})`);
      const imageUrl = await pollImage(imageJob.requestId, imageJob.statusUrl, imageJob.resultUrl);
      if (!imageUrl) throw new Error("Visual anchor completed without an image URL.");

      const videoSubmit = await fetch("/api/track-b-video-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "seedance_2_5", imageUrl, prompt: videoPrompt, resolution: "720p", aspectRatio: "9:16", duration: 30 }),
      });
      const videoJob = await videoSubmit.json().catch(() => ({}));
      if (!videoSubmit.ok || !videoJob.requestId) throw new Error(videoJob?.error || `Seedance 2.5 submit failed (${videoSubmit.status})`);
      await pollVideo(videoJob.requestId, videoJob.provider || "seedance_2_5");

      const resultResponse = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: videoJob.requestId, provider: videoJob.provider || "seedance_2_5", action: "result" }) });
      const result = await resultResponse.json().catch(() => ({}));
      if (!resultResponse.ok || !result.videoUrl) throw new Error(result?.error || "Seedance finished without a video URL.");
      await updateProduction(job.id, { production_status: "video_ready", video_url: result.videoUrl, error_message: null });

      const captionInsert = await supabase.from("caption_jobs").insert({
        title: `${job.title} · ${job.persona_id === "lila" ? "Lila" : "Cara"} Editorial captions`,
        source_url: result.videoUrl,
        transcript: parsed.script,
        hook: parsed.hook,
        style: job.persona_id === "lila" ? "lila_minimal" : "cara_editorial",
        aspect_ratio: "9:16",
        position: "lower_center",
        options: { auto_transcribe: true, punch_in: true, source_job_id: job.id },
        status: "queued",
      }).select("id").single();
      if (captionInsert.error) throw new Error(`Video is ready, but caption queue failed: ${captionInsert.error.message}`);
      await updateProduction(job.id, { production_status: "caption_queued", caption_job_id: captionInsert.data.id, error_message: null });
      setMessage("30-second video created with Seedance 2.5 and sent to local Whisper + FFmpeg captions.");
    } catch (error) {
      await updateProduction(job.id, { production_status: "error", error_message: error instanceof Error ? error.message : String(error) }).catch(() => {});
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: "28px 32px 72px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto 18px" }}>
        <div style={{ textTransform: "uppercase", letterSpacing: ".16em", fontSize: 10, color: "#d4af37", fontWeight: 800 }}>CornerstoneAIAssets · Local AI</div>
        <h1 style={{ margin: "8px 0 5px", fontSize: 32, letterSpacing: "-.04em" }}>Qwen Local Brain</h1>
        <p style={{ margin: 0, color: "#8d95a7", fontSize: 13 }}>Qwen writes the production brief. Seedance 2.5 renders the 30-second video. Local Whisper + FFmpeg finish the captions.</p>
      </div>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 16 }}>
        <section style={card}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>Queue a local creative job</div>
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Title<input value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...input, marginTop: 6 }} /></label>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Persona<select value={personaId} onChange={(e) => setPersonaId(e.target.value)} style={{ ...input, marginTop: 6 }}><option value="cara">Cara</option><option value="lila">Lila</option></select></label>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Job type<select value={jobType} onChange={(e) => onJobTypeChange(e.target.value)} style={{ ...input, marginTop: 6 }}><option value="content_package">Full content package</option><option value="creative_director">Creative director</option><option value="caption_direction">Caption direction</option><option value="repurpose">Repurpose content</option><option value="fanvue_copy">Fanvue copy</option><option value="prompt_builder">Prompt builder</option></select></label>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>System prompt<textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={8} style={{ ...input, marginTop: 6, resize: "vertical" }} /></label>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>User prompt<textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={11} style={{ ...input, marginTop: 6, resize: "vertical" }} /></label>
            <div style={{ ...card, background: "#0a0c12" }}><div style={{ fontSize: 10, textTransform: "uppercase", color: "#6f788b" }}>Video engine</div><div style={{ fontWeight: 900, marginTop: 6 }}>Seedance 2.5 · BytePlus ModelArk</div><div style={{ color: "#7f8798", fontSize: 11, marginTop: 4 }}>30s native generation, audio enabled, reference-image driven. Requires ARK_API_KEY and model activation in the BytePlus/Ark console.</div></div>
            <button style={primary} onClick={queue} disabled={busy}>{busy ? "Working…" : "Queue to local Qwen"}</button>
            {message && <div style={{ color: "#b9c0cf", fontSize: 12, lineHeight: 1.5 }}>{message}</div>}
          </div>
        </section>
        <section style={card}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Local jobs</div>
          <div style={{ ...card, background: "#0a0c12", marginBottom: 12 }}><div style={{ color: "#7f8798", fontSize: 11 }}>Mac services:</div><pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", color: "#d9dde7", fontSize: 11 }}>npm run qwen:server\nnpm run qwen:worker\nnpm run caption:whisper\nnpm run caption:worker</pre></div>
          <button style={button} onClick={load} disabled={busy}>Refresh jobs</button>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {jobs.length === 0 ? <div style={{ color: "#697286", fontSize: 12, padding: "18px 0" }}>No local jobs yet.</div> : jobs.map((job) => (
              <article key={job.id} style={{ border: "1px solid #252a39", borderRadius: 12, padding: 12, background: "#0a0c12" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div style={{ fontWeight: 800, fontSize: 12 }}>{job.title}</div><div style={{ fontSize: 11, textTransform: "capitalize" }}>{job.status}</div></div>
                <div style={{ color: "#6f788b", fontSize: 10, marginTop: 4 }}>{job.job_type} · {job.model} · {job.persona_id || "cara"}</div>
                {job.production_status && job.production_status !== "not_started" && <div style={{ color: job.production_status === "error" ? "#ffb0b0" : "#d4af37", fontSize: 10, marginTop: 6 }}>Production: {job.production_status.replaceAll("_", " ")}</div>}
                {job.error_message && <div style={{ marginTop: 8, color: "#ffb0b0", fontSize: 10 }}>{job.error_message}</div>}
                {job.result && <details style={{ marginTop: 9 }}><summary style={{ cursor: "pointer", color: "#cbd2df", fontSize: 11, fontWeight: 700 }}>Content package</summary><pre style={{ margin: "9px 0 0", whiteSpace: "pre-wrap", fontSize: 11, lineHeight: 1.5, color: "#cbd2df" }}>{job.result}</pre></details>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <button style={primary} onClick={() => produceVideo(job)} disabled={busy || !["content_package", "repurpose"].includes(job.job_type) || job.status !== "completed" || Boolean(job.video_url)}>Produce 30s Video</button>
                  {job.video_url && <a href={job.video_url} target="_blank" rel="noreferrer" style={{ ...button, textDecoration: "none", display: "inline-block" }}>Open Video</a>}
                  {job.captioned_video_url && <a href={job.captioned_video_url} target="_blank" rel="noreferrer" style={{ ...primary, textDecoration: "none", display: "inline-block" }}>Open Captioned Video</a>}
                  <button style={danger} onClick={() => deleteJob(job.id)} disabled={busy}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
