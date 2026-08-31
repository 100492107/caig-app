import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const QWEN_MODEL = "mlx-community/Qwen3-8B-4bit";
const PEOPLE = [
  { id: "cara", name: "Cara", note: "Direct, dry, disciplined, British" },
  { id: "lila", name: "Lila", note: "Measured, warm, observant, understated" },
  { id: "cara_lila", name: "Cara + Lila", note: "Natural contrast and chemistry" },
  { id: "cornerstone", name: "Cornerstone AI Group", note: "Automotive / B2B brand voice" },
];
const ADVANCED = [
  ["h3", "MiniMax H3"],
  ["kling", "Kling 3.0 Pro"],
  ["seedance", "Seedance 2.0 Fast"],
  ["grok", "Grok Imagine Video"],
];

const page = { minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: "28px 28px 72px", fontFamily: "Inter,system-ui,sans-serif" };
const shell = { maxWidth: 1180, margin: "0 auto" };
const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18 };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 9, padding: 10 };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 9, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b" };

function creatorId(id) { return id === "cornerstone" ? "cara" : id; }
function nameFor(id) { return PEOPLE.find((p) => p.id === id)?.name || "Cara"; }
function parseNotes(item) { try { return item?.notes ? JSON.parse(item.notes) : {}; } catch { return {}; } }

async function queueQwen(personaId, brief) {
  const persona = nameFor(personaId);
  const userPrompt = `Create one fresh social content concept for ${persona}. The concept should be based on the established character, not on the user having to supply a topic. Use the persona's natural interests, personality, routines, humour, observations, ambitions and audience fit to choose the idea. User optional direction: ${brief || "None. Choose the strongest natural idea yourself."}\n\nReturn plain text with exactly these headings: HOOK, SCRIPT, VISUAL PROMPT, VIDEO PROMPT, CAPTION, SHOT LIST, EDIT NOTES, CTA.\n\nRequirements: specific, human, socially native, British/natural where appropriate, no generic motivational filler, no invented facts or personal experiences, no fake testimonials. The IMAGE prompt should be photorealistic and preserve the selected persona. The VIDEO PROMPT must be written to premium image-to-video standards: identity and wardrobe continuity, camera behaviour, physical action, timed beats, realistic environment, natural audio and negative constraints. A simple reel must work in 5-8 seconds. An advanced reel can use a richer 5-15 second sequence.`;
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title: `AI Creator · ${persona}`,
    job_type: "content_package",
    model: QWEN_MODEL,
    persona_id: creatorId(personaId),
    system_prompt: `You are the resident creative director for CornerstoneAIAssets. You already know the creator personas. Cara is direct, dry, disciplined, British and practical. Lila is warm, measured, observant and understated. Cara + Lila have natural contrast and chemistry. Cornerstone AI Group is a direct automotive/B2B brand voice. Generate ideas from the persona and audience context without requiring the user to provide a topic. Your output should feel authored rather than like AI content. Never invent claims, results, testimonials, locations, product use or personal experiences.`,
    user_prompt: userPrompt,
    options: { max_tokens: 2200, temperature: 0.78 },
    status: "queued",
    production_status: "not_started",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

function extractSection(text, label, stops) {
  const raw = String(text || "");
  const match = raw.match(new RegExp(`(?:^|\\n)\\s*[*#-]*\\s*${label}\\s*:?([\\s\\S]*?)(?=(?:\\n\\s*[*#-]*\\s*(?:${stops.join("|")})\\s*:?)|$)`, "i"));
  return match ? match[1].trim() : "";
}
function parseQwen(text, personaId) {
  const hook = extractSection(text, "HOOK", ["SCRIPT", "VISUAL PROMPT", "VIDEO PROMPT", "CAPTION"]);
  const script = extractSection(text, "SCRIPT", ["VISUAL PROMPT", "VIDEO PROMPT", "CAPTION", "SHOT LIST"]);
  const visualPrompt = extractSection(text, "VISUAL PROMPT", ["VIDEO PROMPT", "CAPTION", "SHOT LIST", "EDIT NOTES"]);
  const videoPrompt = extractSection(text, "VIDEO PROMPT", ["CAPTION", "SHOT LIST", "EDIT NOTES", "CTA"]);
  const caption = extractSection(text, "CAPTION", ["SHOT LIST", "EDIT NOTES", "CTA"]);
  const shotList = extractSection(text, "SHOT LIST", ["EDIT NOTES", "CTA"]);
  const editNotes = extractSection(text, "EDIT NOTES", ["CTA"]);
  const cta = extractSection(text, "CTA", []);
  return { hook, script, visualPrompt, videoPrompt, caption, shotList, editNotes, cta, personaId };
}

async function waitQwen(jobId, setMessage) {
  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3500));
    const { data, error } = await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id", jobId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Qwen job disappeared from the queue.");
    if (data.status === "completed") return data.result || "";
    if (data.status === "error") throw new Error(data.error_message || "Qwen failed.");
    setMessage(`Qwen is creating the content… ${data.status}`);
  }
  throw new Error("Qwen timed out. Make sure the local Qwen worker is running.");
}

async function waitImage(request, setMessage) {
  const deadline = Date.now() + 4 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const response = await fetch("/api/generate-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: request.requestId, type: "image", status_url: request.statusUrl, result_url: request.resultUrl }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Image status check failed");
    if (data.status === "COMPLETED") return data.imageUrl || data.url;
    if (data.status === "FAILED") throw new Error(data?.error || "Image generation failed");
    setMessage(`Generating image… ${data.status}`);
  }
  throw new Error("Image generation timed out.");
}

async function waitVideo(request, setMessage) {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3500));
    const statusResponse = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: request.requestId, model: request.model, statusUrl: request.statusUrl, action: "status" }) });
    const status = await statusResponse.json();
    if (!statusResponse.ok) throw new Error(status?.error || "Video status failed");
    if (["FAILED", "CANCELLED"].includes(status.status)) throw new Error(status.detail || `Video generation ${status.status.toLowerCase()}`);
    if (status.status === "COMPLETED") {
      const resultResponse = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: request.requestId, model: request.model, action: "result" }) });
      const result = await resultResponse.json();
      if (!resultResponse.ok || !result.videoUrl) throw new Error(result?.error || "Completed video did not return a URL");
      return result.videoUrl;
    }
    setMessage(`Generating reel… ${status.status || "working"}`);
  }
  throw new Error("Video generation timed out.");
}

export default function AICreatorWorkspaceV2() {
  const [persona, setPersona] = useState("cara");
  const [brief, setBrief] = useState("");
  const [platform, setPlatform] = useState("Instagram Reels");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [advancedModel, setAdvancedModel] = useState("seedance");
  const [advancedDuration, setAdvancedDuration] = useState("10");

  const selected = useMemo(() => PEOPLE.find((p) => p.id === persona), [persona]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("content_queue").select("id,persona_name,status,caption,image_url,video_url,content_label,hook,cta,notes,created_at,post_type").like("content_label", "%AI Creator%").order("created_at", { ascending: false }).limit(50);
      if (data) setItems(data.map((item) => ({ ...item, stage: item.image_url ? "image_ready" : "review" })));
    })();
  }, []);

  async function saveContent(parsed, jobId) {
    const row = {
      id: crypto.randomUUID(),
      persona_id: parsed.personaId,
      persona_name: nameFor(persona),
      platform,
      status: "review",
      pillar: "AI Creator",
      hook: parsed.hook,
      caption: parsed.caption,
      cta: parsed.cta || null,
      photo_direction: parsed.visualPrompt,
      photo_idea: parsed.visualPrompt,
      post_type: "single_photo",
      content_label: `AI Creator · ${nameFor(persona)}`,
      image_prompt: parsed.visualPrompt,
      image_url: null,
      image_urls: null,
      video_url: null,
      scheduled_date: new Date().toISOString().slice(0, 10),
      scheduled_time: new Date().toTimeString().slice(0, 5),
      notes: JSON.stringify({ script: parsed.script, video_prompt: parsed.videoPrompt, shot_list: parsed.shotList, edit_notes: parsed.editNotes, qwen_job_id: jobId }),
    };
    const { error } = await supabase.from("content_queue").upsert(row, { onConflict: "id" });
    if (error) throw error;
    return { ...row, stage: "review" };
  }

  async function generateContent() {
    setBusy(true);
    setMessage(`Creating a fresh ${selected?.name || "creator"} concept…`);
    try {
      const jobId = await queueQwen(persona, brief.trim());
      const result = await waitQwen(jobId, setMessage);
      const parsed = parseQwen(result, creatorId(persona));
      if (!parsed.hook && !parsed.caption && !parsed.visualPrompt) throw new Error("Qwen returned an unusable content package. Please generate again.");
      const row = await saveContent(parsed, jobId);
      setItems((old) => [row, ...old]);
      setMessage("Content ready for review. The caption is already prepared.");
      setBrief("");
    } catch (error) {
      setMessage(error.message || String(error));
    } finally { setBusy(false); }
  }

  async function generateImage(item) {
    setBusy(true);
    setMessage(`Generating the ${item.persona_name} image…`);
    try {
      const notes = parseNotes(item);
      const response = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: item.image_prompt || item.photo_direction, photo_idea: item.photo_idea, hook: item.hook, caption: item.caption, photoDirection: notes.video_prompt || item.photo_direction, personaId: item.persona_id }) });
      const request = await response.json();
      if (!response.ok) throw new Error(request?.detail || request?.error || "Image generation failed");
      const imageUrl = await waitImage(request, setMessage);
      const { error } = await supabase.from("content_queue").update({ image_url: imageUrl, image_urls: [imageUrl], status: "draft" }).eq("id", item.id);
      if (error) throw error;
      const next = { ...item, image_url: imageUrl, image_urls: [imageUrl], stage: "image_ready", status: "draft" };
      setItems((old) => old.map((x) => x.id === item.id ? next : x));
      setMessage("Image ready. Download it or generate a reel.");
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  async function generateReel(item, provider, duration) {
    if (!item.image_url) { setMessage("Generate the image first."); return; }
    setBusy(true);
    const simple = provider === "simple";
    setMessage(simple ? "Generating Simple Reel…" : `Generating ${ADVANCED.find((x) => x[0] === provider)?.[1] || provider}…`);
    try {
      const notes = parseNotes(item);
      const prompt = [
        notes.video_prompt || item.photo_direction || "Natural social movement.",
        "Preserve the exact person, face, hairstyle, body proportions, wardrobe and environment. No identity drift. Natural human movement and realistic camera physics.",
        simple ? "Simple Reel: 5-8 seconds, one continuous shot, subtle camera movement, small posture shift, natural breathing and environmental motion, no scene change." : "Advanced Reel: deliberate camera language, physical action, continuity, timed beats and a clear visual payoff within the selected duration. Use the prompt as a production brief, not a generic animation instruction.",
      ].join(" ");
      const requestResponse = await fetch("/api/track-b-video-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: item.image_url, prompt, provider: simple ? "grok" : provider, duration: Number(duration), resolution: "720p", aspectRatio: "9:16" }) });
      const request = await requestResponse.json();
      if (!requestResponse.ok) throw new Error(request?.error || "Video submit failed");
      const videoUrl = await waitVideo(request, setMessage);
      const notesWithVideo = { ...notes, video_provider: simple ? "grok" : provider, video_model: request.model };
      const { error } = await supabase.from("content_queue").update({ video_url: videoUrl, status: "draft", notes: JSON.stringify(notesWithVideo) }).eq("id", item.id);
      if (error) throw error;
      setItems((old) => old.map((x) => x.id === item.id ? { ...x, video_url: videoUrl, stage: "video_ready", status: "draft" } : x));
      setMessage("Reel ready.");
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  function download(url, name) {
    if (!url) return;
    const a = document.createElement("a"); a.href = url; a.download = name; a.target = "_blank"; document.body.appendChild(a); a.click(); a.remove();
  }

  return <div style={page}>
    <div style={shell}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ textTransform: "uppercase", letterSpacing: ".16em", fontSize: 10, color: "#d4af37", fontWeight: 900 }}>CornerstoneAIAssets · AI Creator</div>
        <h1 style={{ margin: "8px 0 5px", fontSize: 34, letterSpacing: "-.04em" }}>Create content from the persona</h1>
        <p style={{ margin: 0, color: "#7f8798", fontSize: 13 }}>Choose the creator. The studio already knows who they are and what kind of content fits them.</p>
      </div>

      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Who are we creating for?</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
          {PEOPLE.map((person) => <button key={person.id} type="button" onClick={() => setPersona(person.id)} style={{ ...button, textAlign: "left", borderColor: persona === person.id ? "#d4af37" : "#303648", background: persona === person.id ? "rgba(212,175,55,.12)" : "#151924" }}><div style={{ fontWeight: 900 }}>{person.name}</div><div style={{ fontSize: 11, color: "#8b93a5", marginTop: 4 }}>{person.note}</div></button>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, marginTop: 12 }}>
          <label style={{ fontSize: 11, color: "#8b93a5" }}>Platform<select value={platform} onChange={(e) => setPlatform(e.target.value)} style={input}><option>Instagram Reels</option><option>TikTok</option><option>Facebook Reels</option><option>YouTube Shorts</option></select></label>
          <label style={{ fontSize: 11, color: "#8b93a5" }}>What do you want to create? <span style={{ color: "#596173" }}>(optional)</span><textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={`Optional. Leave blank and Qwen will choose a strong ${selected?.name || "creator"} idea based on the persona.`} rows={2} style={{ ...input, resize: "vertical", minHeight: 72 }} /></label>
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}><button disabled={busy} type="button" onClick={generateContent} style={busy ? { ...primary, opacity: .55, cursor: "wait" } : primary}>{busy ? "Creating…" : "Generate Content"}</button></div>
        {message && <div style={{ marginTop: 12, color: "#aeb6c7", fontSize: 12 }}>{message}</div>}
      </section>

      <section style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><div style={{ fontWeight: 900, fontSize: 18 }}>Review Queue</div><div style={{ color: "#687188", fontSize: 11 }}>{items.length} item(s)</div></div>
        <div style={{ display: "grid", gap: 14 }}>
          {items.map((item) => {
            const notes = parseNotes(item);
            return <article key={item.id} style={card}>
              <div style={{ display: "grid", gridTemplateColumns: item.image_url ? "260px 1fr" : "1fr", gap: 16 }}>
                <div>{item.image_url ? <img src={item.image_url} alt={item.persona_name} style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 12, display: "block" }} /> : <div style={{ aspectRatio: "4/5", borderRadius: 12, border: "1px dashed #343b50", display: "grid", placeItems: "center", color: "#626c80", fontSize: 12 }}>Image not generated yet</div>}</div>
                <div>
                  <div style={{ fontSize: 11, color: "#d4af37", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>{item.persona_name} · {item.platform}</div>
                  <h2 style={{ margin: "6px 0 10px", fontSize: 22 }}>{item.hook || "Content concept"}</h2>
                  <div style={{ background: "#121620", border: "1px solid #252a39", borderRadius: 12, padding: 13, marginBottom: 10 }}><div style={{ fontSize: 10, color: "#6f7890", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 900 }}>Caption ready</div><div style={{ marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{item.caption || "No caption returned."}</div></div>
                  {notes.script && <details style={{ marginBottom: 10 }}><summary style={{ cursor: "pointer", color: "#9fa8ba", fontWeight: 800 }}>View script</summary><div style={{ marginTop: 8, whiteSpace: "pre-wrap", color: "#bac1cf", lineHeight: 1.45 }}>{notes.script}</div></details>}
                  {notes.video_prompt && <details style={{ marginBottom: 10 }}><summary style={{ cursor: "pointer", color: "#9fa8ba", fontWeight: 800 }}>View video direction</summary><div style={{ marginTop: 8, whiteSpace: "pre-wrap", color: "#bac1cf", lineHeight: 1.45 }}>{notes.video_prompt}</div></details>}
                  {!item.image_url ? <button disabled={busy} type="button" onClick={() => generateImage(item)} style={busy ? { ...primary, opacity: .55 } : primary}>Generate Image</button> : <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => download(item.image_url, `${item.persona_name.replace(/[^a-z0-9]+/gi,"-")}-image.jpg`)} style={button}>Download Image</button>
                    <button disabled={busy} type="button" onClick={() => generateReel(item, "simple", 6)} style={button}>Generate Simple Reel</button>
                    <select disabled={busy} value={advancedModel} onChange={(e) => setAdvancedModel(e.target.value)} style={{ ...input, width: 180 }}><option value="h3">MiniMax H3</option><option value="kling">Kling 3.0 Pro</option><option value="seedance">Seedance 2.0 Fast</option><option value="grok">Grok Imagine Video</option></select>
                    <select disabled={busy} value={advancedDuration} onChange={(e) => setAdvancedDuration(e.target.value)} style={{ ...input, width: 110 }}><option value="5">5 sec</option><option value="8">8 sec</option><option value="10">10 sec</option><option value="15">15 sec</option></select>
                    <button disabled={busy} type="button" onClick={() => generateReel(item, advancedModel, Number(advancedDuration))} style={primary}>Generate Advanced Reel</button>
                  </div>}
                  {item.video_url && <div style={{ marginTop: 12 }}><video src={item.video_url} controls playsInline style={{ width: "100%", maxHeight: 440, borderRadius: 12, background: "#05060a" }} /><div style={{ marginTop: 8, display: "flex", gap: 8 }}><button type="button" onClick={() => download(item.video_url, `${item.persona_name.replace(/[^a-z0-9]+/gi,"-")}-reel.mp4`)} style={primary}>Download Reel</button></div></div>}
                </div>
              </div>
            </article>;
          })}
          {!items.length && <div style={{ ...card, color: "#727c91", textAlign: "center", padding: 36 }}>Choose Cara or Lila and click Generate Content. You do not need to provide a topic.</div>}
        </div>
      </section>
    </div>
  </div>;
}
