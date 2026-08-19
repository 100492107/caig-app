import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const PERSONAS = {
  cara: { name: "Cara", note: "Direct, dry, disciplined, British. Confident without shouting." },
  lila: { name: "Lila", note: "Measured, warm, observant, understated. Quiet confidence." },
  duo: { name: "Cara + Lila", note: "Two distinct women. Natural chemistry, contrast, shared moments. Never blend their voices." },
};
const PLATFORMS = [
  { id: "instagram", name: "Instagram", objective: "Attention + comments + profile visits" },
  { id: "facebook", name: "Facebook", objective: "Conversation + shares + profile visits" },
  { id: "fanvue", name: "Fanvue", objective: "Curiosity + intimacy + paid-page conversion" },
];

const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 18, padding: 18 };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 10, padding: "10px 12px" };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "#d4af37", color: "#08090d" };

function parseJson(value) {
  const text = String(value || "").trim().replace(/```json|```/gi, "").trim();
  try { return JSON.parse(text); } catch {}
  const start = text.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned no JSON.");
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0; let quoted = false; let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === open) depth += 1;
    else if (ch === close && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error("Qwen returned incomplete JSON.");
}

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function captionPrompt(platform, persona, trendEvidence, imageDescription, optionalContext) {
  const personaNote = PERSONAS[persona]?.note || PERSONAS.duo.note;
  const platformInfo = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
  const fanvue = platform === "fanvue";
  return `PLATFORM: ${platformInfo.name}\nOBJECTIVE: ${platformInfo.objective}\nCREATOR: ${PERSONAS[persona]?.name || "Cara + Lila"}\nCREATOR VOICE: ${personaNote}\n\nTREND / PERFORMANCE EVIDENCE:\n${trendEvidence || "No recent trend evidence supplied. Do not invent performance numbers. Use mechanism-first social judgement."}\n\nIMAGE DESCRIPTION:\n${imageDescription}\n\nUSER CONTEXT:\n${optionalContext || "None supplied."}\n\nTASK:\nWrite captions for this exact image. The caption must match what is visibly happening, the creator's identity and the platform objective. Never describe a different outfit, location, time, action or person than the image supports. Do not use generic AI influencer language. Do not write motivational filler.\n\n${fanvue ? "FANVUE RULES: The goal is paid-page conversion through curiosity, personality, exclusivity and a clear reason to click. Keep the copy suggestive but non-explicit. Do not describe sexual acts, explicit nudity or graphic sexual detail. Make the paid page feel like the natural next step, not a desperate sales pitch." : "PUBLIC SOCIAL RULES: The caption should earn attention, comments or profile visits first. Fanvue can be referenced only when the user explicitly asks for a conversion CTA; never make the public caption explicit."}\n\nReturn JSON only:\n{\n  "recommended": "",\n  "alternatives": ["", "", ""],\n  "angle": "",\n  "cta": "",\n  "why_this_angle": "",\n  "test_note": ""\n}\n\nMake the recommended caption ready to paste directly into the platform. Keep alternatives meaningfully different, not rewrites.`;
}

export default function CaptionWriter() {
  const [persona, setPersona] = useState("cara");
  const [platform, setPlatform] = useState("instagram");
  const [files, setFiles] = useState([]);
  const [trendEvidence, setTrendEvidence] = useState("");
  const [context, setContext] = useState("");
  const [jobs, setJobs] = useState([]);
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selectedPlatform = useMemo(() => PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0], [platform]);
  const selectedPersona = useMemo(() => PERSONAS[persona] || PERSONAS.duo, [persona]);

  async function loadRecent() {
    const { data } = await supabase
      .from("local_ai_jobs")
      .select("id,title,job_type,status,result,error_message,created_at,completed_at,persona_id")
      .eq("job_type", "caption_writer")
      .order("created_at", { ascending: false })
      .limit(50);
    setJobs(data || []);
  }

  useEffect(() => {
    loadRecent();
    const timer = setInterval(loadRecent, 3000);
    return () => clearInterval(timer);
  }, []);

  async function loadTrendEvidence() {
    const { data } = await supabase
      .from("local_ai_jobs")
      .select("result,created_at")
      .eq("job_type", "trend_scan")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.result) return "";
    try {
      const parsed = parseJson(data.result);
      return JSON.stringify(parsed.opportunities || parsed).slice(0, 18000);
    } catch { return String(data.result).slice(0, 18000); }
  }

  async function analyseImage(dataUrl, mimeType) {
    const response = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "You are a visual fact checker for a social caption system. Describe only what is actually visible. Identify people, clothing, setting, lighting, objects, pose, expression, composition and overall mood. Do not invent identities or backstory. Return concise JSON only.",
        user: "Describe this image for another AI that must write a caption that matches it exactly. Focus on observable facts and the emotional/vibe impression.",
        images: [{ dataUrl, mimeType }],
        maxTokens: 1200,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "Image analysis failed.");
    return data.text || "";
  }

  async function createJob(file, imageDescription, trend) {
    const systemPrompt = `You are Qwen, the local social caption strategist for CornerstoneAIAssets. Your job is to turn an existing photo into a caption that gets the right person to stop, feel something, interact or click. You are not creating the image; the image already exists. The photo facts are authoritative. The creator bible is authoritative. The platform objective is authoritative. Never invent facts about the image. Never make up performance statistics. Use the supplied trend evidence as the current strategic signal layer. For Cara, write only as Cara. For Lila, only as Lila. For Cara + Lila, preserve two distinct identities and use both only when the image supports both. Keep public social captions non-explicit. For Fanvue, sell curiosity, personality, exclusivity and the reason to subscribe, without explicit sexual content. Return JSON only.`;
    const userPrompt = captionPrompt(platform, persona, trend, imageDescription, context);
    const { data, error } = await supabase.from("local_ai_jobs").insert({
      title: `Caption · ${persona} · ${platform} · ${file.name}`,
      job_type: "caption_writer",
      model: "mlx-community/Qwen3-8B-4bit",
      persona_id: persona === "duo" ? "cara_lila" : persona,
      system_prompt: systemPrompt,
      user_prompt: `${userPrompt}\n\nLOCAL FILE: ${file.name}`,
      options: { max_tokens: 2200, temperature: 0.62 },
      status: "queued",
      production_status: "not_started",
    }).select("id").single();
    if (error) throw error;
    return data.id;
  }

  async function waitForJob(id) {
    for (let i = 0; i < 120; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const { data, error } = await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) continue;
      if (data.status === "error") throw new Error(data.error_message || "Qwen caption job failed.");
      if (data.status === "completed") return parseJson(data.result);
    }
    throw new Error("Caption job timed out.");
  }

  async function generate() {
    if (!files.length) { setMessage("Choose photos from your computer first."); return; }
    setBusy(true); setResults({}); setMessage("Qwen is analysing the photos, then writing captions against the current signal layer…");
    try {
      const trend = trendEvidence.trim() || await loadTrendEvidence();
      const batch = files.slice(0, 20);
      if (files.length > 20) setMessage("First 20 photos are processing. Repeat for the next batch when ready.");
      const next = {};
      for (let index = 0; index < batch.length; index += 1) {
        const file = batch[index];
        setMessage(`Photo ${index + 1}/${batch.length} · analysing ${file.name}…`);
        const dataUrl = await readFileDataUrl(file);
        const description = await analyseImage(dataUrl, file.type || "image/jpeg");
        setMessage(`Photo ${index + 1}/${batch.length} · Qwen writing ${selectedPlatform.name} caption…`);
        const jobId = await createJob(file, description, trend);
        const result = await waitForJob(jobId);
        next[file.name] = { jobId, result, description };
        setResults((current) => ({ ...current, [file.name]: next[file.name] }));
      }
      setMessage(`Done — ${batch.length} caption${batch.length === 1 ? "" : "s"} ready to paste.`);
      await loadRecent();
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  function copy(text) {
    navigator.clipboard?.writeText(text || "");
    setMessage("Caption copied to clipboard.");
  }

  function onFilesChange(event) {
    const picked = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    setFiles(picked);
    setResults({});
    if (picked.length) setMessage(`${picked.length} local photo${picked.length === 1 ? "" : "s"} selected. Nothing is uploaded to the Asset Library.`);
  }

  return <div style={{ minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: "28px 32px 72px", fontFamily: "Inter, system-ui, sans-serif" }}>
    <div style={{ maxWidth: 1250, margin: "0 auto" }}>
      <div style={{ color: "#d4af37", fontSize: 10, fontWeight: 900, letterSpacing: ".18em", textTransform: "uppercase" }}>CornerstoneAIAssets · Qwen Caption Writer</div>
      <h1 style={{ margin: "8px 0 5px", fontSize: 34, letterSpacing: "-.04em" }}>Turn your existing photos into captions.</h1>
      <p style={{ margin: 0, color: "#858da0", maxWidth: 850, lineHeight: 1.6 }}>Choose the photos that are already on your Mac, choose Cara, Lila or both, choose where the copy is going, and let Qwen write captions around what is actually working — without moving the photos into the Asset Library.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16, marginTop: 18 }}>
        <section style={card}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>1. Choose creator</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {Object.entries(PERSONAS).map(([id, value]) => <button key={id} onClick={() => setPersona(id)} style={{ ...button, textAlign: "left", borderColor: persona === id ? "#d4af37" : "#303648", background: persona === id ? "rgba(212,175,55,.11)" : "#151924" }}><div style={{ fontWeight: 900 }}>{value.name}</div><div style={{ marginTop: 4, color: "#7f8798", fontSize: 10 }}>{value.note}</div></button>)}
          </div>

          <div style={{ fontWeight: 900, margin: "18px 0 10px" }}>2. Where is the caption going?</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {PLATFORMS.map((item) => <button key={item.id} onClick={() => setPlatform(item.id)} style={{ ...button, borderColor: platform === item.id ? "#d4af37" : "#303648", background: platform === item.id ? "rgba(212,175,55,.11)" : "#151924" }}><div style={{ fontWeight: 900 }}>{item.name}</div><div style={{ marginTop: 4, color: "#7f8798", fontSize: 10 }}>{item.objective}</div></button>)}
          </div>

          <div style={{ fontWeight: 900, margin: "18px 0 8px" }}>3. Optional current evidence</div>
          <textarea value={trendEvidence} onChange={(e) => setTrendEvidence(e.target.value)} placeholder="Paste current winning hooks, posts, notes, engagement patterns or sales observations here. Qwen will use them as evidence rather than inventing data." style={{ ...input, minHeight: 110, resize: "vertical" }} />
          <input value={context} onChange={(e) => setContext(e.target.value)} placeholder="Optional context for this batch: beach day, gym, dinner, outfit, travel, private set, etc." style={{ ...input, marginTop: 8 }} />

          <div style={{ fontWeight: 900, margin: "18px 0 8px" }}>4. Choose photos from this Mac</div>
          <input type="file" accept="image/*" multiple onChange={onFilesChange} style={{ ...input, padding: 9 }} />
          <div style={{ color: "#6f788a", fontSize: 10, marginTop: 6 }}>Up to 20 photos per batch. The images are read locally for visual analysis and are not added to the Asset Library.</div>

          <button onClick={generate} disabled={busy || !files.length} style={{ ...primary, marginTop: 16, width: "100%", opacity: busy || !files.length ? .55 : 1 }}>{busy ? "Qwen is working…" : `Generate ${selectedPlatform.name} captions`}</button>
          {message && <div style={{ marginTop: 10, color: "#b9c0cf", fontSize: 12, lineHeight: 1.5 }}>{message}</div>}
        </section>

        <section style={card}>
          <div style={{ fontWeight: 900 }}>What Qwen is optimising for</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {[
              ["Attention", "A caption that earns the stop rather than explaining the photograph."],
              ["Identity", `Written in the ${selectedPersona.name} voice, never a generic influencer voice.`],
              ["Platform fit", selectedPlatform.objective],
              ["Visual truth", "The words must match the actual photograph — no invented scene or activity."],
              ["Conversion", platform === "fanvue" ? "Curiosity → personality → clear reason to subscribe." : "Profile interest → deeper relationship → optional Fanvue journey."],
              ["Testing", "Different angles rather than five near-identical rewrites."],
            ].map(([title, body]) => <div key={title} style={{ border: "1px solid #252a39", borderRadius: 12, padding: 12, background: "#0a0c12" }}><div style={{ fontWeight: 900, fontSize: 12 }}>{title}</div><div style={{ color: "#7f8798", fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>{body}</div></div>)}
          </div>
        </section>
      </div>

      <section style={{ ...card, marginTop: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 12 }}>Caption results</div>
        {Object.keys(results).length === 0 ? <div style={{ color: "#6f788a", fontSize: 12 }}>Your generated captions will appear here, one photo at a time.</div> : <div style={{ display: "grid", gap: 14 }}>
          {Object.entries(results).map(([name, item]) => {
            const result = item.result || {};
            return <div key={name} style={{ border: "1px solid #252a39", borderRadius: 14, padding: 14, background: "#0a0c12" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div style={{ fontWeight: 900 }}>{name}</div><button style={button} onClick={() => copy(result.recommended)}>Copy recommended</button></div>
              <div style={{ marginTop: 10, color: "#f7d77b", fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em" }}>{result.angle || "Recommended angle"}</div>
              <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{result.recommended || "No recommended caption returned."}</div>
              <div style={{ marginTop: 10, color: "#7f8798", fontSize: 11 }}>{result.why_this_angle || ""}</div>
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>{(result.alternatives || []).map((caption, index) => <div key={index} style={{ border: "1px solid #252a39", borderRadius: 10, padding: 10 }}><div style={{ color: "#737c8d", fontSize: 9, textTransform: "uppercase", marginBottom: 5 }}>Alternative {index + 1}</div><div style={{ fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{caption}</div><button style={{ ...button, marginTop: 8, width: "100%" }} onClick={() => copy(caption)}>Copy</button></div>)}</div>
              {result.cta && <div style={{ marginTop: 10, color: "#aeb6c6", fontSize: 11 }}><strong>CTA:</strong> {result.cta}</div>}
              {result.test_note && <div style={{ marginTop: 7, color: "#6f788a", fontSize: 10 }}><strong>Test:</strong> {result.test_note}</div>}
            </div>;
          })}
        </div>}
      </section>

      <section style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><div><div style={{ fontWeight: 900 }}>Previous caption jobs</div><div style={{ color: "#6f788a", fontSize: 10, marginTop: 3 }}>The photos stay on your Mac; the caption work stays saved here.</div></div><button style={button} onClick={loadRecent}>Refresh</button></div>
        <div style={{ marginTop: 10 }}>
          {jobs.length === 0 ? <div style={{ color: "#6f788a", fontSize: 11 }}>No previous caption jobs.</div> : jobs.map((job) => <div key={job.id} style={{ borderTop: "1px solid #252a39", padding: "10px 0", display: "grid", gridTemplateColumns: "1.5fr .5fr 1fr", gap: 10, alignItems: "center" }}><div style={{ fontSize: 11 }}>{job.title}</div><div style={{ fontSize: 10, color: job.status === "completed" ? "#8fdbb3" : "#aeb6c6", textTransform: "capitalize" }}>{job.status}</div><div style={{ fontSize: 10, color: "#6f788a" }}>{job.created_at}</div></div>)}
        </div>
      </section>
    </div>
  </div>;
}
