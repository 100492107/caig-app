import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18 };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 9, padding: 10 };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 9, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b" };

const DEFAULT_SYSTEM = `You are the local creative director for CornerstoneAIAssets. Write specific, human, socially native creative output. Prefer concrete details, strong hooks and useful structure. Avoid generic AI phrasing, hustle-bro language, fabricated claims and empty adjectives. When writing for Cara or Lila, preserve the established persona and voice supplied by the user.`;
const MODEL = "mlx-community/Qwen3-8B-4bit";

const PRESETS = {
  creative_director: "Create 5 short-form hooks for Cara about discipline and money. Make them specific, slightly blunt and British. No generic motivational quotes.",
  content_package: "Create a production-ready short-form video package for Cara about discipline and money. Give me a strong hook, a 25-40 second spoken script, 6-8 shot ideas, visual prompts, a caption plan with word-level emphasis suggestions, B-roll and edit notes. Make it specific, slightly blunt and British. No generic motivational quotes.",
  caption_direction: "Create a caption treatment for a 30-second Cara talking-head video about discipline and money. Give the hook, caption rhythm, emphasis words, line-break rules and edit/punch-in notes.",
  repurpose: "Turn the idea into a short-form content package with hook, script, shot list, caption plan, B-roll and CTA. Preserve the persona and make it platform-native.",
  fanvue_copy: "Create 5 non-explicit Fanvue post concepts and captions for Cara. Keep them personal, confident, teasing-but-safe and socially native.",
  prompt_builder: "Build a production-ready image/video prompt for a photorealistic Cara social post. Include setting, wardrobe, camera, action, lighting, identity-lock and negative constraints.",
};

export default function LocalAIStudio() {
  const [title, setTitle] = useState("Local Qwen test");
  const [jobType, setJobType] = useState("content_package");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM);
  const [prompt, setPrompt] = useState(PRESETS.content_package);
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("local_ai_jobs")
      .select("id,title,job_type,model,status,result,error_message,created_at,completed_at")
      .order("created_at", { ascending: false })
      .limit(12);
    if (!error) setJobs(data || []);
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
      system_prompt: systemPrompt.trim(),
      user_prompt: prompt.trim(),
      options: { max_tokens: jobType === "content_package" || jobType === "repurpose" ? 1400 : 768, temperature: 0.8 },
      status: "queued",
    });
    if (error) setMessage(`Could not queue job: ${error.message}`);
    else {
      setMessage("Queued. Your Mac's local Qwen worker will pick it up when it is running.");
      await load();
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: "28px 32px 72px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto 18px" }}>
        <div style={{ textTransform: "uppercase", letterSpacing: ".16em", fontSize: 10, color: "#d4af37", fontWeight: 800 }}>CornerstoneAIAssets · Local AI</div>
        <h1 style={{ margin: "8px 0 5px", fontSize: 32, letterSpacing: "-.04em" }}>Qwen Local Brain</h1>
        <p style={{ margin: 0, color: "#8d95a7", fontSize: 13 }}>Cloud UI + Supabase queue. Your Mac runs the model locally. Production jobs can become scripts, shot lists, caption plans and visual prompts ready for the video engine.</p>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
        <section style={card}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>Queue a local creative job</div>
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Title<input value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...input, marginTop: 6 }} /></label>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Job type<select value={jobType} onChange={(e) => onJobTypeChange(e.target.value)} style={{ ...input, marginTop: 6 }}>
              <option value="content_package">Full content package</option>
              <option value="creative_director">Creative director</option>
              <option value="caption_direction">Caption direction</option>
              <option value="repurpose">Repurpose content</option>
              <option value="fanvue_copy">Fanvue copy</option>
              <option value="prompt_builder">Prompt builder</option>
            </select></label>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>System prompt<textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={7} style={{ ...input, marginTop: 6, resize: "vertical" }} /></label>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>User prompt<textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={10} style={{ ...input, marginTop: 6, resize: "vertical" }} /></label>
            <div style={{ ...card, background: "#0a0c12" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6f788b" }}>Local model</div>
              <div style={{ fontWeight: 900, marginTop: 6 }}>{MODEL}</div>
              <div style={{ color: "#7f8798", fontSize: 11, marginTop: 4 }}>Public MLX Qwen3 8B · 4-bit · ~4.62 GB model files · starter configuration for your 16 GB M1 Pro</div>
            </div>
            <button style={primary} onClick={queue} disabled={busy}>{busy ? "Queueing…" : "Queue to local Qwen"}</button>
            {message && <div style={{ color: "#b9c0cf", fontSize: 12, lineHeight: 1.5 }}>{message}</div>}
          </div>
        </section>

        <section style={card}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Local worker status</div>
          <div style={{ ...card, background: "#0a0c12", marginBottom: 12 }}>
            <div style={{ color: "#7f8798", fontSize: 11 }}>Run this on your Mac:</div>
            <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", color: "#d9dde7", fontSize: 11 }}>npm run qwen:server\nnpm run qwen:worker</pre>
          </div>
          <div style={{ color: "#7f8798", fontSize: 11, lineHeight: 1.6, marginBottom: 14 }}>The browser never talks directly to the model. The cloud queues a job in Supabase; the local worker claims it, calls the Qwen OpenAI-compatible server on localhost, strips model reasoning from the response, then writes the usable result back.</div>
          <button style={button} onClick={load}>Refresh jobs</button>
          <div style={{ marginTop: 12 }}>
            {jobs.length === 0 ? <div style={{ color: "#697286", fontSize: 12, padding: "18px 0" }}>No local jobs yet.</div> : jobs.map((job) => <div key={job.id} style={{ borderTop: "1px solid #252a39", padding: "12px 0" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div style={{ fontWeight: 800, fontSize: 12 }}>{job.title}</div><div style={{ fontSize: 11, textTransform: "capitalize" }}>{job.status}</div></div><div style={{ color: "#6f788b", fontSize: 10, marginTop: 4 }}>{job.job_type} · {job.model}</div>{job.result && <pre style={{ margin: "9px 0 0", whiteSpace: "pre-wrap", fontSize: 11, lineHeight: 1.5, color: "#cbd2df" }}>{job.result}</pre>}{job.error_message && <div style={{ marginTop: 8, color: "#e1a6a6", fontSize: 10 }}>{job.error_message}</div>}</div>)}
          </div>
        </section>
      </div>
    </div>
  );
}
