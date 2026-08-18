import React, { useMemo, useState } from "react";
import { supabase } from "./supabase";

const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18 };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 9, padding: 10 };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 9, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b" };

const STYLES = [
  { id: "cara_editorial", name: "Cara Editorial", desc: "Large word-level captions, active-word emphasis, cinematic top hook." },
  { id: "lila_minimal", name: "Lila Minimal", desc: "Smaller calm type, generous spacing, understated emphasis." },
  { id: "creator_bold", name: "Creator Bold", desc: "Punchy short lines, high contrast, social-first pacing." },
  { id: "clean_subtitles", name: "Clean Subtitles", desc: "Traditional readable captions with modern line breaks." },
];

const DEMO_WORDS = [
  [0, 0.35, "This"], [0.35, 0.72, "is"], [0.72, 1.14, "why"], [1.14, 1.62, "your"], [1.62, 2.08, "posts"], [2.08, 2.52, "die"],
];

function parseTranscript(text) {
  const clean = String(text || "").trim();
  if (!clean) return [];
  return clean.split(/\s+/).map((word, index) => ({
    start: +(index * 0.42).toFixed(2),
    end: +((index + 1) * 0.42).toFixed(2),
    word,
  }));
}

export default function CaptionStudio() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("Cara Editorial Caption Test");
  const [style, setStyle] = useState("cara_editorial");
  const [transcript, setTranscript] = useState("This is why your posts die before anyone understands what you are saying");
  const [hook, setHook] = useState("THIS IS WHY YOUR POSTS DIE");
  const [position, setPosition] = useState("lower_center");
  const [aspect, setAspect] = useState("9:16");
  const [autoTranscribe, setAutoTranscribe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recentJobs, setRecentJobs] = useState([]);

  const selectedStyle = STYLES.find((item) => item.id === style) || STYLES[0];
  const words = useMemo(() => parseTranscript(transcript), [transcript]);

  async function refresh() {
    const { data, error } = await supabase
      .from("caption_jobs")
      .select("id,title,status,style,source_url,output_url,error_message,created_at,completed_at")
      .order("created_at", { ascending: false })
      .limit(12);
    if (!error) setRecentJobs(data || []);
  }

  async function queueJob() {
    if (!sourceUrl.trim()) {
      setMessage("Paste a video URL first. The local worker needs a source file.");
      return;
    }
    setBusy(true);
    setMessage("Queueing local caption render…");
    const wordTimestamps = autoTranscribe ? null : words;
    const { error } = await supabase.from("caption_jobs").insert({
      title: title.trim() || "Caption render",
      source_url: sourceUrl.trim(),
      transcript: transcript.trim(),
      word_timestamps: wordTimestamps,
      hook: hook.trim(),
      style,
      aspect_ratio: aspect,
      position,
      options: {
        renderer: "ffmpeg_ass",
        auto_transcribe: autoTranscribe,
        active_word: true,
        punch_in: true,
        safe_area: true,
        version: 1,
      },
      status: "queued",
    });
    if (error) setMessage(`Could not queue render: ${error.message}`);
    else {
      setMessage("Queued. Run the local caption worker to transcribe + render this job.");
      await refresh();
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: "28px 32px 72px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto 18px" }}>
        <div style={{ textTransform: "uppercase", letterSpacing: ".16em", fontSize: 10, color: "#d4af37", fontWeight: 800 }}>CornerstoneAIAssets · Caption Engine</div>
        <h1 style={{ margin: "8px 0 5px", fontSize: 32, letterSpacing: "-.04em" }}>Dynamic Caption Studio</h1>
        <p style={{ margin: 0, color: "#8d95a7", fontSize: 13 }}>Local-first word timing, editorial captions, hook cards and FFmpeg finishing.</p>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 16 }}>
        <section style={card}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>Caption treatment</div>
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Title<input value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...input, marginTop: 6 }} /></label>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Source video URL<input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…/video.mp4" style={{ ...input, marginTop: 6 }} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label style={{ fontSize: 11, color: "#9ca5b6" }}>Style<select value={style} onChange={(e) => setStyle(e.target.value)} style={{ ...input, marginTop: 6 }}>{STYLES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <label style={{ fontSize: 11, color: "#9ca5b6" }}>Aspect<select value={aspect} onChange={(e) => setAspect(e.target.value)} style={{ ...input, marginTop: 6 }}><option>9:16</option><option>1:1</option><option>16:9</option></select></label>
              <label style={{ fontSize: 11, color: "#9ca5b6" }}>Position<select value={position} onChange={(e) => setPosition(e.target.value)} style={{ ...input, marginTop: 6 }}><option value="lower_center">Lower center</option><option value="center">Center</option><option value="upper_center">Upper center</option><option value="safe_lower">Safe lower</option></select></label>
            </div>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Top hook<input value={hook} onChange={(e) => setHook(e.target.value)} style={{ ...input, marginTop: 6 }} /></label>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Transcript<input value={transcript} onChange={(e) => setTranscript(e.target.value)} style={{ ...input, marginTop: 6 }} /></label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#c9cfda", fontSize: 12 }}><input type="checkbox" checked={autoTranscribe} onChange={(e) => setAutoTranscribe(e.target.checked)} />Use local Whisper/whisper.cpp for word timestamps</label>
            <div style={{ ...card, background: "#0a0c12" }}><div style={{ fontSize: 10, textTransform: "uppercase", color: "#6f788b" }}>Selected treatment</div><div style={{ fontWeight: 900, marginTop: 6 }}>{selectedStyle.name}</div><div style={{ color: "#7f8798", fontSize: 11, marginTop: 4 }}>{selectedStyle.desc}</div></div>
            <button style={primary} onClick={queueJob} disabled={busy}>{busy ? "Queueing…" : "Queue local render"}</button>
            {message && <div style={{ color: "#b9c0cf", fontSize: 12, lineHeight: 1.5 }}>{message}</div>}
          </div>
        </section>

        <section style={card}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Live editorial preview</div>
          <div style={{ width: "100%", maxWidth: 360, aspectRatio: "9/16", margin: "0 auto", borderRadius: 22, overflow: "hidden", background: "linear-gradient(160deg,#1a1c25,#090b10 70%)", border: "1px solid #303648", position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 35%, rgba(255,255,255,.08), transparent 35%)" }} />
            <div style={{ position: "absolute", top: 22, left: 16, right: 16, fontSize: 12, lineHeight: 1.2, fontWeight: 950, letterSpacing: ".05em", textTransform: "uppercase", color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,.7)" }}>{hook || "YOUR HOOK GOES HERE"}</div>
            <div style={{ position: "absolute", left: 18, right: 18, bottom: 84, textAlign: "center" }}>
              <div style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "center", gap: "2px 7px", maxWidth: "100%" }}>
                {(words.length ? words.slice(0, 9) : DEMO_WORDS.map(([start, end, word]) => ({ start, end, word }))).map((item, index) => (
                  <span key={`${item.word}-${index}`} style={{ fontSize: style === "lila_minimal" ? 20 : 24, fontWeight: index % 3 === 2 ? 950 : 800, color: index % 4 === 2 ? "#f7d77b" : "#fff", textShadow: "0 3px 16px rgba(0,0,0,.85)", transform: index % 5 === 0 ? "scale(1.03)" : "none" }}>{item.word}</span>
                ))}
              </div>
            </div>
            <div style={{ position: "absolute", bottom: 24, left: 18, right: 18, display: "flex", justifyContent: "space-between", color: "#9299aa", fontSize: 9, textTransform: "uppercase", letterSpacing: ".12em" }}><span>CAIG CAPTION ENGINE</span><span>WORD TIMING</span></div>
          </div>
          <div style={{ marginTop: 14, fontSize: 11, lineHeight: 1.6, color: "#7f8798" }}>The preview is deliberately visual: the actual render adds word-level timestamps, active-word emphasis, safe-zone placement, hook treatment and optional punch-ins during the local FFmpeg pass.</div>
        </section>
      </div>

      <section style={{ ...card, maxWidth: 1180, margin: "16px auto 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><div><div style={{ fontWeight: 800 }}>Recent caption jobs</div><div style={{ color: "#7f8798", fontSize: 11, marginTop: 4 }}>Jobs stay in Supabase so the same local worker can handle batches later.</div></div><button style={button} onClick={refresh}>Refresh</button></div>
        <div style={{ marginTop: 12 }}>
          {recentJobs.length === 0 ? <div style={{ color: "#697286", fontSize: 12, padding: "18px 0" }}>No jobs loaded yet.</div> : recentJobs.map((job) => <div key={job.id} style={{ borderTop: "1px solid #252a39", padding: "12px 0", display: "grid", gridTemplateColumns: "1.5fr .7fr 1.3fr", gap: 10, alignItems: "center" }}><div><div style={{ fontWeight: 800, fontSize: 12 }}>{job.title}</div><div style={{ color: "#6e7688", fontSize: 10, marginTop: 3 }}>{job.style}</div></div><div style={{ fontSize: 11, textTransform: "capitalize", color: job.status === "completed" ? "#9de3bb" : "#b9c0cf" }}>{job.status}</div><div style={{ fontSize: 10, color: "#697286", wordBreak: "break-all" }}>{job.output_url || job.error_message || job.created_at}</div></div>)}
        </div>
      </section>
    </div>
  );
}
