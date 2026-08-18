import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const MODEL = "mlx-community/Qwen3-8B-4bit";
const PEOPLE = [
  { id: "cara", name: "Cara", note: "Direct, dry, disciplined, British" },
  { id: "lila", name: "Lila", note: "Measured, warm, observant, understated" },
  { id: "cara_lila", name: "Cara + Lila", note: "Contrast, chemistry, natural interaction" },
  { id: "cornerstone", name: "Cornerstone AI Group", note: "Automotive / B2B brand voice" },
];

const MODEL_LABELS = {
  grok: "Grok Imagine Video",
  h3: "MiniMax H3",
  kling: "Kling 2.1 Pro",
  seedance: "Seedance 2.0",
};

const style = {
  page: { minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: "28px 28px 72px", fontFamily: "Inter,system-ui,sans-serif" },
  shell: { maxWidth: 1200, margin: "0 auto" },
  card: { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18 },
  input: { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 9, padding: 10 },
  btn: { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 9, padding: "10px 14px", fontWeight: 800, cursor: "pointer" },
  primary: { border: "1px solid #d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b", borderRadius: 9, padding: "10px 14px", fontWeight: 900, cursor: "pointer" },
};

function creatorId(id) {
  return id === "cornerstone" ? "cara" : id;
}

async function queueQwen({ title, personaId, userPrompt }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title,
    job_type: "content_package",
    model: MODEL,
    persona_id: personaId,
    system_prompt: `You are the local creative director for CornerstoneAIAssets. Create specific, socially native content. Never invent product claims, prices, results, personal experiences, testimonials, screenshots or facts. Avoid generic AI language. Write like a human creator. For Cara: direct, dry, disciplined, British. For Lila: warm, measured, observant, understated. For Cara + Lila: natural chemistry and distinct voices. For Cornerstone AI Group: direct automotive/B2B commercial tone. The video prompt must be production-ready and describe a real camera, natural movement, continuity, environment, sound and timing.`,
    user_prompt: userPrompt,
    options: { max_tokens: 1800, temperature: 0.72 },
    status: "queued",
    production_status: "not_started",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

function parsePackage(result, personaId) {
  const text = String(result || "");
  const get = (label, next) => {
    const a = text.search(new RegExp(`(?:^|\\n)\\s*[*#-]*\\s*${label}\\s*:?`, "i"));
    if (a < 0) return "";
    const from = text.slice(a);
    const stop = next.map((x) => from.search(new RegExp(`(?:^|\\n)\\s*[*#-]*\\s*${x}\\s*:?`, "i"))).filter((x) => x > 0);
    const end = stop.length ? Math.min(...stop) : from.length;
    return from.slice(0, end).replace(new RegExp(`^(?:.*?${label}\\s*:?)`, "i"), "").trim();
  };
  const script = get("SCRIPT", ["VISUAL PROMPT", "VIDEO PROMPT", "CAPTION PLAN", "SHOT LIST", "EDIT NOTES", "CTA"]);
  const hook = get("HOOK", ["SCRIPT", "VISUAL PROMPT", "VIDEO PROMPT", "CAPTION PLAN"]);
  const caption = get("CAPTION", ["HASHTAGS", "VIDEO PROMPT", "VISUAL PROMPT", "SHOT LIST", "CTA"]);
  const videoPrompt = get("VIDEO PROMPT", ["CAPTION PLAN", "SHOT LIST", "EDIT NOTES", "CTA"]);
  const visualPrompt = get("VISUAL PROMPT", ["VIDEO PROMPT", "CAPTION PLAN", "SHOT LIST", "EDIT NOTES"]);
  return {
    hook: hook || text.split("\n").find((x) => x.trim()) || "",
    script: script || text,
    caption: caption || script || text,
    videoPrompt,
    visualPrompt,
    personaId,
  };
}

async function waitForQwen(jobId, setMessage) {
  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3500));
    const { data, error } = await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id", jobId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Qwen job disappeared from the queue.");
    if (data.status === "completed") return data.result || "";
    if (data.status === "error") throw new Error(data.error_message || "Qwen failed.");
    setMessage(`Qwen is writing the content… ${data.status}`);
  }
  throw new Error("Qwen timed out. Make sure the local Qwen worker is running on the Mac.");
}

export default function AICreatorWorkspace() {
  const [persona, setPersona] = useState("cara");
  const [platform, setPlatform] = useState("Instagram Reels");
  const [goal, setGoal] = useState("Reach / attention");
  const [brief, setBrief] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [advancedModel, setAdvancedModel] = useState("seedance");
  const [advancedDuration, setAdvancedDuration] = useState("10");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("content_queue").select("id,persona_name,status,caption,image_url,video_url,content_label,hook,cta,notes,created_at,post_type").like("content_label", "%AI Creator%").order("created_at", { ascending: false }).limit(40);
      if (data?.length) setItems(data.map((x) => ({ ...x, source: "saved", stage: x.image_url ? "image_ready" : "review" })));
    };
    load();
  }, []);

  const selected = useMemo(() => PEOPLE.find((p) => p.id === persona), [persona]);

  async function generateContent() {
    setBusy(true);
    setMessage("Sending the brief to local Qwen…");
    try {
      const personaName = selected?.name || "Cara";
      const id = creatorId(persona);
      const userPrompt = `Create a production-ready social content package for ${personaName}. Platform: ${platform}. Goal: ${goal}. User brief: ${brief || "Create a strong, specific idea that suits the persona and platform."}. Return plain text with these exact headings: HOOK, SCRIPT, VISUAL PROMPT, VIDEO PROMPT, CAPTION, SHOT LIST, EDIT NOTES, CTA. Keep the spoken script 20-40 seconds unless a shorter format is clearly better. VIDEO PROMPT must be written like a premium image-to-video prompt: identity/continuity, camera behaviour, physical action, timed beats, realistic environment, natural audio, and negative constraints. For a simple reel, keep it suitable for 5-8 seconds. Do not invent facts.`;
      const jobId = await queueQwen({ title: `AI Creator · ${personaName}`, personaId: id, userPrompt });
      const result = await waitForQwen(jobId, setMessage);
      const parsed = parsePackage(result, id);
      const row = {
        id: crypto.randomUUID(),
        persona_id: id,
        persona_name: personaName,
        platform,
        status: "review",
        pillar: goal,
        hook: parsed.hook,
        caption: parsed.caption,
        cta: parsed.cta || null,
        photo_direction: parsed.visualPrompt,
        photo_idea: parsed.visualPrompt,
        post_type: "single_photo",
        content_label: `AI Creator · ${personaName}`,
        image_prompt: parsed.visualPrompt,
        image_url: null,
        image_urls: null,
        video_url: null,
        notes: JSON.stringify({ script: parsed.script, video_prompt: parsed.videoPrompt, qwen_job_id: jobId }),
        scheduled_date: new Date().toISOString().slice(0, 10),
        scheduled_time: new Date().toTimeString().slice(0, 5),
      };
      const { error } = await supabase.from("content_queue").upsert(row, { onConflict: "id" });
      if (error) throw error;
      setItems((old) => [{ ...row, stage: "review", source: "new" }, ...old]);
      setMessage("Content ready for review. The caption is already written.");
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  async function generateImage(item) {
    setBusy(true);
    setMessage(`Generating the ${item.persona_name} image…`);
    try {
      const notes = item.notes ? JSON.parse(item.notes) : {};
      const prompt = item.image_prompt || item.photo_direction || `${item.persona_name}, natural social content scene`;
      const r = await fetch("/api/generate-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: prompt,
          photo_idea: item.photo_idea,
          hook: item.hook,
          caption: item.caption,
          photoDirection: notes.video_prompt || item.photo_direction,
          personaId: item.persona_id,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.detail || d?.error || "Image generation failed");
      const deadline = Date.now() + 4 * 60 * 1000;
      let imageUrl = "";
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const pr = await fetch("/api/generate-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: d.requestId, type: "image", status_url: d.statusUrl, result_url: d.resultUrl }) });
        const pd = await pr.json();
        if (pd.status === "COMPLETED") { imageUrl = pd.imageUrl || pd.url; break; }
        if (pd.status === "FAILED") throw new Error(pd.error || "Image generation failed");
      }
      if (!imageUrl) throw new Error("Image generation timed out.");
      const { error } = await supabase.from("content_queue").update({ image_url: imageUrl, image_urls: [imageUrl], status: "draft" }).eq("id", item.id);
      if (error) throw error;
      setItems((old) => old.map((x) => x.id === item.id ? { ...x, image_url: imageUrl, image_urls: [imageUrl], stage: "image_ready", status: "draft" } : x));
      setMessage("Image ready. Download it, make a Simple Reel, or make an Advanced Reel.");
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  async function generateReel(item, provider, duration = "6") {
    if (!item.image_url) return setMessage("Generate the image first.");
    setBusy(true);
    setMessage(`Generating ${provider === "simple" ? "Simple Reel" : MODEL_LABELS[provider]}…`);
    try {
      const notes = item.notes ? JSON.parse(item.notes) : {};
      const prompt = [
        notes.video_prompt || item.photo_direction || "Natural social movement",
        "Preserve the exact person, face, hair, body proportions, wardrobe, setting and product. No identity drift. Natural handheld camera physics and realistic motion.",
        provider === "simple" ? "Simple social motion: 5-8 seconds, subtle camera drift, small posture shift, natural breathing, hair/environment movement, no scene change." : "Premium production. Use deliberate camera language, physical action, continuity and a clear beginning/middle/end within the selected duration.",
      ].join(" ");
      const vr = await fetch("/api/track-b-video-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: item.image_url, prompt, provider: provider === "simple" ? "grok" : provider, duration: Number(duration), resolution: provider === "simple" ? "720p" : "720p", aspectRatio: "9:16", generateAudio: provider !== "simple" }) });
      const vd = await vr.json();
      if (!vr.ok) throw new Error(vd?.error || "Video submit failed");
      const deadline = Date.now() + 10 * 60 * 1000;
      let videoUrl = "";
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 3500));
        const pr = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: vd.requestId, provider: vd.provider, action: "status" }) });
        const pd = await pr.json();
        if (!pr.ok) throw new Error(pd?.error || "Video status failed");
        setMessage(`Generating… ${pd.status || "working"}`);
        if (pd.status === "COMPLETED") {
          const rr = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: vd.requestId, provider: vd.provider, action: "result" }) });
          const rd = await rr.json();
          videoUrl = rd.videoUrl;
          break;
        }
        if (["FAILED", "CANCELLED"].includes(pd.status)) throw new Error(pd.detail || `Video generation ${pd.status.toLowerCase()}`);
      }
      if (!videoUrl) throw new Error("Video generation timed out.");
      const { error } = await supabase.from("content_queue").update({ video_url: videoUrl, status: "draft", notes: JSON.stringify({ ...(item.notes ? JSON.parse(item.notes) : {}), video_provider: vd.provider }) }).eq("id", item.id);
      if (error) throw error;
      setItems((old) => old.map((x) => x.id === item.id ? { ...x, video_url: videoUrl, stage: "video_ready" } : x));
      setMessage("Reel ready.");
    } catch (error) {
      setMessage(error.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  function download(url, name) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div style={style.page}>
      <div style={style.shell}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ textTransform: "uppercase", letterSpacing: ".16em", fontSize: 10, color: "#d4af37", fontWeight: 900 }}>CornerstoneAIAssets · Track B</div>
          <h1 style={{ margin: "8px 0 4px", fontSize: 34, letterSpacing: "-.04em" }}>AI Creator</h1>
          <p style={{ margin: 0, color: "#8d95a7", fontSize: 13 }}>Choose the creator. Generate the content. Review it. Generate the image. Then turn the approved image into a Reel.</p>
        </div>

        <section style={{ ...style.card, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Creator<select value={persona} onChange={(e) => setPersona(e.target.value)} style={{ ...style.input, marginTop: 6 }}>{PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><div style={{ color: "#737b8f", marginTop: 5 }}>{selected?.note}</div></label>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Platform<select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ ...style.input, marginTop: 6 }}><option>Instagram Reels</option><option>TikTok</option><option>Facebook Reels</option><option>YouTube Shorts</option><option>Instagram</option><option>Facebook</option><option>YouTube</option></select></label>
            <label style={{ fontSize: 11, color: "#9ca5b6" }}>Goal<select value={goal} onChange={(e) => setGoal(e.target.value)} style={{ ...style.input, marginTop: 6 }}><option>Reach / attention</option><option>Engagement</option><option>Product discovery</option><option>Conversion</option><option>Story / personality</option><option>Proof</option></select></label>
          </div>
          <label style={{ display: "block", marginTop: 12, fontSize: 11, color: "#9ca5b6" }}>What do you want to create?<textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={4} placeholder="Example: Cara talking about why earning more money has not fixed her spending habits." style={{ ...style.input, marginTop: 6, resize: "vertical" }} /></label>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}><button onClick={generateContent} disabled={busy} style={style.primary}>{busy ? "Working…" : "Generate Content"}</button></div>
          {message && <div style={{ marginTop: 12, color: "#aab2c3", fontSize: 12 }}>{message}</div>}
        </section>

        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><div><h2 style={{ margin: 0, fontSize: 21 }}>Review Queue</h2><div style={{ color: "#777f92", fontSize: 12, marginTop: 3 }}>The caption and production brief are ready before you spend anything on an image or video.</div></div></div>
          <div style={{ display: "grid", gap: 14 }}>
            {items.map((item) => {
              const notes = item.notes ? JSON.parse(item.notes) : {};
              const hasImage = Boolean(item.image_url);
              return <article key={item.id} style={style.card}>
                <div style={{ display: "grid", gridTemplateColumns: hasImage ? "260px 1fr" : "1fr", gap: 16 }}>
                  {hasImage && <div><img src={item.image_url} alt={item.persona_name} style={{ width: "100%", aspectRatio: "9/16", objectFit: "cover", borderRadius: 12, border: "1px solid #272c3d" }} /></div>}
                  <div>
                    <div style={{ fontSize: 10, color: "#d4af37", textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 800 }}>{item.persona_name} · {item.platform}</div>
                    <h3 style={{ margin: "6px 0 8px", fontSize: 21 }}>{item.hook || "Untitled"}</h3>
                    <div style={{ background: "#151822", border: "1px solid #242a3a", padding: 12, borderRadius: 10, color: "#d9deea", fontSize: 13, lineHeight: 1.55 }}><strong>Caption</strong><br />{item.caption}</div>
                    {notes.script && <details style={{ marginTop: 10, color: "#9da5b7", fontSize: 12 }}><summary>Spoken script / production brief</summary><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", marginTop: 8 }}>{notes.script}</pre></details>}
                    {item.image_url && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      <button style={style.btn} onClick={() => download(item.image_url, `cornerstone-${item.persona_name}-image.jpg`)}>Download Image</button>
                      <button style={style.primary} onClick={() => generateReel(item, "simple", "6")} disabled={busy}>Generate Simple Reel</button>
                      <button style={style.btn} onClick={() => generateReel(item, advancedModel, advancedDuration)} disabled={busy}>Generate Advanced Reel</button>
                      <select value={advancedModel} onChange={(e) => setAdvancedModel(e.target.value)} style={{ ...style.input, width: 190 }}><option value="h3">MiniMax H3</option><option value="kling">Kling 2.1 Pro</option><option value="seedance">Seedance 2.0</option><option value="grok">Grok Imagine Video</option></select>
                      <select value={advancedDuration} onChange={(e) => setAdvancedDuration(e.target.value)} style={{ ...style.input, width: 110 }}><option value="6">6 sec</option><option value="8">8 sec</option><option value="10">10 sec</option><option value="12">12 sec</option><option value="15">15 sec</option></select>
                    </div>}
                    {!hasImage && <button style={style.primary} onClick={() => generateImage(item)} disabled={busy}>{busy ? "Generating…" : "Generate Image"}</button>}
                    {item.video_url && <div style={{ marginTop: 12 }}><video src={item.video_url} controls playsInline style={{ width: "100%", maxWidth: 720, borderRadius: 12, background: "#000" }} /><div style={{ display: "flex", gap: 8, marginTop: 8 }}><button style={style.btn} onClick={() => download(item.video_url, `cornerstone-${item.persona_name}-reel.mp4`)}>Download Reel</button></div></div>}
                  </div>
                </div>
              </article>;
            })}
            {!items.length && <div style={{ ...style.card, color: "#7f8798", textAlign: "center", padding: 40 }}>No content in the review queue yet. Choose a creator and Generate Content.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
