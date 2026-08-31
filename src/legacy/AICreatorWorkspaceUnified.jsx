import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const QWEN_MODEL = "mlx-community/Qwen3-8B-4bit";
const DISCLOSURE = "Cara is the dedicated demonstration model of Cornerstone AI Assets. Every client asset maps onto private, unique reference weights — ensuring their content remains consistently them, not us.";

const PEOPLE = [
  { id: "cara", name: "Cara", note: "Direct, dry, disciplined, British" },
  { id: "lila", name: "Lila", note: "Measured, warm, observant, understated" },
  { id: "cara_lila", name: "Cara + Lila", note: "Contrast, chemistry, natural interaction" },
  { id: "cornerstone", name: "Cornerstone AI Group", note: "Automotive / B2B commercial voice" },
];
const CONTENT_TYPES = [
  ["social", "Social post"],
  ["carousel", "Carousel"],
  ["fanvue", "Fanvue"],
];
const PLATFORMS = ["Instagram", "Instagram Reels", "TikTok", "Facebook", "Facebook Reels", "YouTube Shorts"];
const GOALS = ["Reach / attention", "Engagement", "Lifestyle / filler", "Product discovery", "Conversion", "Story / personality", "Proof / authority"];
const FANVUE_PURPOSES = ["Personal post", "Photo set", "Personality", "Interaction", "Tease", "Behind the scenes"];
const CAROUSEL_STRUCTURES = ["Story / conflict", "Useful list", "Identity / aspiration", "Quick hit", "Proof / comparison", "Visual reveal"];
const ADVANCED_MODELS = [
  ["h3", "MiniMax H3", 8],
  ["kling", "Kling 3.0 Pro", 5],
  ["seedance", "Seedance 2.0 Fast", 10],
  ["grok", "Grok Imagine Video", 6],
];

const PERSONA_BIBLE = {
  cara: `Cara Whitmore. Adult fictional creator. Direct, dry, disciplined, British. Natural content worlds: discipline, training, work, money, routines, confidence, ordinary life, humour and specific observations. Practical, understated behaviour. Never a generic motivational influencer. Canonical visual identity is enforced server-side by the existing Cara reference pipeline.`,
  lila: `Lila Sterling. Adult fictional creator. Measured, warm, observant, understated. Natural content worlds: lifestyle, travel, wellness, beauty, routines, quiet opinions, small observations and believable aspiration. Calm rather than loud. Never generic influencer language. Canonical visual identity is enforced server-side by the existing Lila reference pipeline.`,
  duo: `Cara + Lila. Two separate adult fictional creators with distinct personalities. Cara is direct, dry, disciplined and British. Lila is warm, measured, observant and understated. Their content should show believable chemistry, contrast and small natural interactions. Never merge their identities.`,
  cornerstone: `Cornerstone AI Group. Direct automotive/B2B commercial voice. Content worlds: dealership presentation, vehicle merchandising, better lot/listing photos, practical dealer observations, social proof and clear commercial value. No generic agency language.`,
};

const page = { minHeight: "100vh", background: "#08070d", color: "#eef1f7", padding: "28px 28px 72px", fontFamily: "Inter,system-ui,sans-serif" };
const shell = { maxWidth: 1240, margin: "0 auto" };
const card = { background: "#0e1017", border: "1px solid #252a39", borderRadius: 16, padding: 18 };
const input = { width: "100%", boxSizing: "border-box", background: "#151822", color: "#fff", border: "1px solid #2a3040", borderRadius: 9, padding: 10 };
const button = { border: "1px solid #303648", background: "#151924", color: "#eef1f7", borderRadius: 9, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const primary = { ...button, borderColor: "#d4af37", background: "rgba(212,175,55,.14)", color: "#f7d77b" };

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("Qwen returned invalid JSON");
}
function creatorId(id) { return id === "cornerstone" ? "cara" : id === "cara_lila" ? "duo" : id; }
function nameFor(id) { return PEOPLE.find((p) => p.id === id)?.name || "Cara"; }
function notesFor(item) { try { return item?.notes ? JSON.parse(item.notes) : {}; } catch { return {}; } }
function modeLabel(mode) { return CONTENT_TYPES.find((x) => x[0] === mode)?.[1] || mode; }

async function queueQwen({ title, personaId, jobType, systemPrompt, userPrompt }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title,
    job_type: jobType,
    model: QWEN_MODEL,
    persona_id: personaId,
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    options: { max_tokens: 3200, temperature: 0.62 },
    status: "queued",
    production_status: "not_started",
  }).select("id").single();
  if (error) throw error;
  return data.id;
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
    setMessage(`Qwen is working locally… ${data.status}`);
  }
  throw new Error("Qwen timed out. Make sure the local Qwen worker is running.");
}

async function waitImage(request, setMessage) {
  const deadline = Date.now() + 4 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const r = await fetch("/api/generate-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: request.requestId, type: "image", status_url: request.statusUrl, result_url: request.resultUrl }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error || "Image status check failed");
    if (d.status === "COMPLETED") return d.imageUrl || d.url;
    if (d.status === "FAILED") throw new Error(d?.error || "Image generation failed");
    setMessage(`Generating image… ${d.status}`);
  }
  throw new Error("Image generation timed out.");
}

async function waitVideo(request, setMessage) {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3500));
    const r = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: request.requestId, model: request.model, statusUrl: request.statusUrl, action: "status" }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error || "Video status failed");
    if (["FAILED", "CANCELLED"].includes(d.status)) throw new Error(d.detail || `Video generation ${String(d.status).toLowerCase()}`);
    if (d.status === "COMPLETED") {
      const result = await fetch("/api/track-b-video-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: request.requestId, model: request.model, action: "result" }) });
      const out = await result.json();
      if (!result.ok || !out.videoUrl) throw new Error(out?.error || "Completed video did not return a URL");
      return out.videoUrl;
    }
    setMessage(`Generating reel… ${d.status || "working"}`);
  }
  throw new Error("Video generation timed out.");
}

export default function AICreatorWorkspaceUnified() {
  const [persona, setPersona] = useState("cara");
  const [contentType, setContentType] = useState("social");
  const [platform, setPlatform] = useState("Instagram Reels");
  const [goal, setGoal] = useState("Reach / attention");
  const [fanvuePurpose, setFanvuePurpose] = useState("Personal post");
  const [carouselStructure, setCarouselStructure] = useState("Story / conflict");
  const [brief, setBrief] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const personaKey = creatorId(persona);
  const selected = useMemo(() => PEOPLE.find((p) => p.id === persona), [persona]);
  const personaBible = PERSONA_BIBLE[persona === "cara_lila" ? "duo" : persona] || PERSONA_BIBLE.cara;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("content_queue").select("id,persona_id,persona_name,platform,status,caption,image_url,image_urls,video_url,content_label,hook,cta,notes,created_at,post_type").like("content_label", "%AI Creator%").order("created_at", { ascending: false }).limit(50);
      if (data) setItems(data.map((row) => ({ ...row, stage: row.video_url ? "video_ready" : row.image_url ? "image_ready" : "review" })));
    })();
  }, []);

  function buildContext() {
    return [
      `CONTENT TYPE: ${modeLabel(contentType)}`,
      contentType === "social" ? `PLATFORM: ${platform}\nGOAL: ${goal}` : "",
      contentType === "fanvue" ? `FANVUE PURPOSE: ${fanvuePurpose}\nRequired disclosure on Cara captions: ${DISCLOSURE}` : "",
      contentType === "carousel" ? `CAROUSEL STRUCTURE: ${carouselStructure}\nBuild 5–7 slides.` : "",
      brief.trim() ? `OPTIONAL USER DIRECTION: ${brief.trim()}` : "OPTIONAL USER DIRECTION: none. Choose the strongest idea from the persona bible yourself.",
    ].filter(Boolean).join("\n");
  }

  async function generateContent() {
    setBusy(true);
    setMessage("Creating content from the persona bible… then running the human-quality check…");
    try {
      const writerSystem = `You are the senior creative director for CornerstoneAIAssets. The PERSONA BIBLE below is the source of truth. Never invent a different personality or generic creator identity.\n\nPERSONA BIBLE:\n${personaBible}\n\nHUMAN CREATIVE RULES:\n1. Start from a believable human moment, observation, tension, opinion, useful detail, joke or question.\n2. The visual must make literal sense with the hook and caption. No random pretty scene.\n3. Every prop and action needs a reason to be in the scene.\n4. Use believable wardrobe, locations and behaviour for the creator.\n5. Never fabricate personal experience, product use, testimonials, results, prices, locations or facts.\n6. No generic influencer language, glossy advertising staging or AI-slop filler.\n7. Premium means believable craft, not sterile perfection.\n8. Image prompts must describe a logical scene, not a list of disconnected aesthetics.\n9. Video prompts must include continuity, camera behaviour, physical action, timing, sound and negative constraints.\n10. If no user direction is given, choose the concept yourself from the persona's established world.\n\nReturn JSON only.`;
      const writerUser = `CREATOR: ${selected?.name}\n${buildContext()}\n\nReturn exactly: {"hook":"","script":"","caption":"","hashtags":"","cta":"","image_prompt":"","video_prompt":"","post_type":"single_photo|carousel|reel","carousel_slides":[{"slide":1,"text":"","image_prompt":""}],"creative_reason":""}.\nFor Fanvue, keep the content adult and non-explicit, personality-led and appropriate to a private page.\nFor Carousel, create 5–7 slides; each slide must earn the next swipe and visually support its text.`;
      const draftJob = await queueQwen({ title: `AI Creator · ${selected?.name} · draft`, personaId: personaKey, jobType: "content_draft", systemPrompt: writerSystem, userPrompt: writerUser });
      const draft = parseJson(await waitQwen(draftJob, setMessage));

      const checkerSystem = `You are the Human Quality Gate for CornerstoneAIAssets. You are the last editor before a concept enters Review Queue. Reject AI slop.\n\nCHECK THE DRAFT AGAINST:\n- Does this sound specifically like the chosen creator?\n- Does the concept have a believable reason to exist?\n- Does the visual literally make sense with the hook/caption?\n- Do setting, wardrobe, props, people and action belong together?\n- Would a real person plausibly post this?\n- Is there random visual spectacle or generic influencer staging?\n- Is any fact, personal experience, result or testimonial invented?\n- Is the image prompt coherent enough that an image model will not make up unrelated objects or contexts?\n- For car content, does the vehicle/location/action make sense?\n- For Cara + Lila, are they two separate people with believable chemistry?\n- For Carousel, does every slide earn the next swipe?\n\nIf anything is weak, rewrite it. Return JSON only: {"pass":true|false,"score":0-100,"issues":["..."],"revised":{same fields as draft}}.`;
      const checkerUser = `PERSONA BIBLE:\n${personaBible}\n\nCONTEXT:\n${buildContext()}\n\nDRAFT:\n${JSON.stringify(draft)}`;
      const checkJob = await queueQwen({ title: `AI Creator · ${selected?.name} · human quality gate`, personaId: personaKey, jobType: "creative_human_check", systemPrompt: checkerSystem, userPrompt: checkerUser });
      const audit = parseJson(await waitQwen(checkJob, setMessage));
      const final = audit?.revised ? { ...draft, ...audit.revised } : draft;
      const score = Number(audit?.score || 0);
      if (score < 72) throw new Error("Human Quality Gate rejected this concept. Generate Content again for a different idea.");

      const row = {
        id: crypto.randomUUID(),
        persona_id: personaKey,
        persona_name: selected?.name,
        platform: contentType === "fanvue" ? "fv_page" : contentType === "carousel" ? "TikTok Photo Mode" : platform,
        status: "review",
        pillar: contentType === "fanvue" ? fanvuePurpose : contentType === "carousel" ? carouselStructure : goal,
        hook: final.hook || "",
        caption: final.caption || "",
        hashtags: final.hashtags || "",
        cta: final.cta || null,
        photo_direction: final.image_prompt || "",
        photo_idea: final.image_prompt || "",
        post_type: contentType === "carousel" ? "carousel" : contentType === "fanvue" ? "fanvue_photo" : "single_photo",
        content_label: `AI Creator · ${selected?.name} · ${modeLabel(contentType)}`,
        image_prompt: final.image_prompt || "",
        image_url: null,
        image_urls: null,
        video_url: null,
        scheduled_date: new Date().toISOString().slice(0, 10),
        scheduled_time: new Date().toTimeString().slice(0, 5),
        notes: JSON.stringify({ script: final.script || "", video_prompt: final.video_prompt || "", carousel_slides: final.carousel_slides || [], creative_reason: final.creative_reason || "", human_check: { score, issues: audit?.issues || [] }, content_type: contentType, qwen_draft_job_id: draftJob, qwen_human_check_job_id: checkJob }),
      };
      const { error } = await supabase.from("content_queue").upsert(row, { onConflict: "id" });
      if (error) throw error;
      setItems((old) => [{ ...row, stage: "review" }, ...old]);
      setMessage(`Ready for Review Queue. Human Quality Gate: ${score}/100.`);
      setBrief("");
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  async function generateImage(item) {
    setBusy(true);
    const notes = notesFor(item);
    const carouselSlides = Array.isArray(notes.carousel_slides) ? notes.carousel_slides : [];
    const targets = item.post_type === "carousel" && carouselSlides.length ? carouselSlides : [{ image_prompt: item.image_prompt }];
    setMessage(item.post_type === "carousel" ? `Generating ${targets.length} coherent carousel images…` : `Generating the ${item.persona_name} image…`);
    try {
      const urls = [];
      for (const target of targets) {
        const r = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: target.image_prompt || item.image_prompt, photo_idea: target.image_prompt || item.photo_idea, hook: item.hook, caption: item.caption, photoDirection: notes.video_prompt || item.photo_direction, personaId: item.persona_id }) });
        const request = await r.json();
        if (!r.ok) throw new Error(request?.detail || request?.error || "Image generation failed");
        urls.push(await waitImage(request, setMessage));
      }
      const { error } = await supabase.from("content_queue").update({ image_url: urls[0] || null, image_urls: urls, status: "draft" }).eq("id", item.id);
      if (error) throw error;
      setItems((old) => old.map((x) => x.id === item.id ? { ...x, image_url: urls[0], image_urls: urls, stage: "image_ready", status: "draft" } : x));
      setMessage(item.post_type === "carousel" ? `Carousel ready: ${urls.length} images.` : "Image ready. Download it or generate a reel.");
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  async function generateReel(item, provider, duration) {
    if (!item.image_url) { setMessage("Generate the image first."); return; }
    setBusy(true);
    const simple = provider === "simple";
    const model = ADVANCED_MODELS.find((x) => x[0] === provider);
    setMessage(simple ? "Generating Simple Reel…" : `Generating ${model?.[1] || provider}…`);
    try {
      const notes = notesFor(item);
      const prompt = [notes.video_prompt || item.photo_direction || "Natural social motion.", "Preserve the exact canonical identity, face, hairstyle, body proportions, wardrobe, environment and any product. No identity drift.", simple ? "Simple Reel: 5-8 seconds, one continuous shot, subtle believable motion, natural breathing, small posture shift, hair/environment movement, no random actions or scene changes." : "Advanced Reel: treat the prompt as a production brief. Use deliberate camera language, physical action, continuity, timed beats, environmental sound and a clear payoff within the selected duration.", "No generic AI motion, morphing, floating objects, anatomy changes or unrelated scene redesign."] .join(" ");
      const r = await fetch("/api/track-b-video-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: item.image_url, prompt, provider: simple ? "grok" : provider, duration: Number(duration), resolution: "720p", aspectRatio: "9:16" }) });
      const request = await r.json();
      if (!r.ok) throw new Error(request?.error || "Video submit failed");
      const videoUrl = await waitVideo(request, setMessage);
      const { error } = await supabase.from("content_queue").update({ video_url: videoUrl, status: "draft", notes: JSON.stringify({ ...notes, video_provider: simple ? "grok" : provider, video_model: request.model }) }).eq("id", item.id);
      if (error) throw error;
      setItems((old) => old.map((x) => x.id === item.id ? { ...x, video_url: videoUrl, stage: "video_ready", status: "draft" } : x));
      setMessage("Reel ready.");
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  function download(url, name) { if (!url) return; const a = document.createElement("a"); a.href = url; a.download = name; a.target = "_blank"; document.body.appendChild(a); a.click(); a.remove(); }

  function renderItem(item) {
    const notes = notesFor(item);
    const human = notes.human_check || {};
    return <article key={item.id} style={{ ...card, marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div><div style={{ color: "#d4af37", fontSize: 10, fontWeight: 900 }}>{item.persona_name} · {item.post_type === "fanvue_photo" ? "FANVUE" : item.post_type === "carousel" ? "CAROUSEL" : "SOCIAL"}</div><h3 style={{ margin: "6px 0" }}>{item.hook || "Content concept"}</h3><div style={{ color: "#a7afbe", fontSize: 12, lineHeight: 1.55 }}>{item.caption}</div></div>
        <div style={{ color: human.score >= 80 ? "#9fd7a8" : "#f0b36b", fontSize: 11, fontWeight: 800 }}>Human check {human.score || "—"}/100</div>
      </div>
      {item.image_urls?.length ? <div style={{ display: "grid", gridTemplateColumns: item.image_urls.length > 1 ? "repeat(auto-fit,minmax(150px,1fr))" : "1fr", gap: 8, marginTop: 14 }}>{item.image_urls.map((url, i) => <img key={`${item.id}-${i}`} src={url} alt={`${item.persona_name} ${i + 1}`} style={{ width: "100%", maxHeight: 520, objectFit: "cover", borderRadius: 12, border: "1px solid #252a39" }} />)}</div> : null}
      {item.video_url ? <video controls src={item.video_url} style={{ width: "100%", maxHeight: 650, borderRadius: 12, marginTop: 14, background: "#000" }} /> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {!item.image_url && <button style={primary} onClick={() => generateImage(item)} disabled={busy}>Generate Image</button>}
        {item.image_url && <button style={button} onClick={() => download(item.image_url, `${item.persona_name}-image.jpg`)}>Download Image</button>}
        {item.image_url && !item.video_url && item.post_type !== "carousel" && <button style={primary} onClick={() => generateReel(item, "simple", 6)} disabled={busy}>Generate Simple Reel</button>}
        {item.image_url && !item.video_url && item.post_type !== "carousel" && <select style={{ ...input, width: 260 }} value={"seedance"} onChange={(e) => generateReel(item, e.target.value, ADVANCED_MODELS.find((x) => x[0] === e.target.value)?.[2] || 8)} disabled={busy}><option value="seedance">Advanced: Seedance 2.0 Fast</option><option value="h3">Advanced: MiniMax H3</option><option value="kling">Advanced: Kling 3.0 Pro</option><option value="grok">Advanced: Grok Imagine Video</option></select>}
        {item.video_url && <button style={button} onClick={() => download(item.video_url, `${item.persona_name}-reel.mp4`)}>Download Reel</button>}
      </div>
      {item.post_type === "fanvue_photo" ? <div style={{ marginTop: 12, fontSize: 11, color: "#8e97aa" }}>Fanvue caption includes the required Cornerstone disclosure.</div> : null}
      {item.post_type === "carousel" ? <div style={{ marginTop: 12, fontSize: 11, color: "#8e97aa" }}>Carousel text remains with the content record so the slides and copy stay together.</div> : null}
      {human.issues?.length ? <details style={{ marginTop: 12, color: "#8e97aa", fontSize: 11 }}><summary>Why the human check changed it</summary><div style={{ marginTop: 8 }}>{human.issues.map((x, i) => <div key={i}>• {x}</div>)}</div></details> : null}
    </article>;
  }

  return <div style={page}>
    <div style={shell}>
      <div style={{ marginBottom: 18 }}><div style={{ textTransform: "uppercase", letterSpacing: ".16em", fontSize: 10, color: "#d4af37", fontWeight: 900 }}>CornerstoneAIAssets · Track B</div><h1 style={{ margin: "8px 0 5px", fontSize: 34 }}>AI Creator</h1><p style={{ margin: 0, color: "#7f8798", fontSize: 12 }}>One connected flow: creator → idea → human check → review → image → download or Reel.</p></div>
      <section style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <label style={{ fontSize: 11, color: "#9ca5b6" }}>Creator<select style={input} value={persona} onChange={(e) => setPersona(e.target.value)}>{PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label style={{ fontSize: 11, color: "#9ca5b6" }}>Content type<select style={input} value={contentType} onChange={(e) => setContentType(e.target.value)}>{CONTENT_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          {contentType === "social" ? <label style={{ fontSize: 11, color: "#9ca5b6" }}>Platform<select style={input} value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></label> : contentType === "fanvue" ? <label style={{ fontSize: 11, color: "#9ca5b6" }}>Fanvue purpose<select style={input} value={fanvuePurpose} onChange={(e) => setFanvuePurpose(e.target.value)}>{FANVUE_PURPOSES.map((p) => <option key={p}>{p}</option>)}</select></label> : <label style={{ fontSize: 11, color: "#9ca5b6" }}>Carousel structure<select style={input} value={carouselStructure} onChange={(e) => setCarouselStructure(e.target.value)}>{CAROUSEL_STRUCTURES.map((p) => <option key={p}>{p}</option>)}</select></label>}
        </div>
        {contentType === "social" ? <label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>Goal<select style={input} value={goal} onChange={(e) => setGoal(e.target.value)}>{GOALS.map((g) => <option key={g}>{g}</option>)}</select></label> : null}
        <label style={{ display: "block", fontSize: 11, color: "#9ca5b6", marginTop: 10 }}>What do you want to create? <span style={{ color: "#697187" }}>(optional)</span><textarea rows={3} style={{ ...input, resize: "vertical" }} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Leave blank. I will choose the idea from the creator's established world." /></label>
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#151822", color: "#aab2c3", fontSize: 11, lineHeight: 1.5 }}><b style={{ color: "#fff" }}>{selected?.name}</b> · persona memory active. The canonical character bible and reference locks are applied automatically when the image is generated.</div>
        <button type="button" style={{ ...primary, width: "100%", marginTop: 14 }} onClick={generateContent} disabled={busy}>{busy ? "Working…" : "Generate Content"}</button>
        {message && <div style={{ marginTop: 10, color: "#cbd1dd", fontSize: 11 }}>{message}</div>}
      </section>

      <section style={{ marginTop: 18 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><h2 style={{ margin: 0 }}>Review Queue</h2><p style={{ margin: "5px 0 0", color: "#697187", fontSize: 11 }}>The app writes the caption first. You approve the concept before spending image-generation credits.</p></div><span style={{ color: "#697187", fontSize: 11 }}>{items.length} saved</span></div>{items.length ? items.map(renderItem) : <div style={{ ...card, marginTop: 14, textAlign: "center", color: "#697187" }}>Nothing here yet. Generate your first piece.</div>}</section>
    </div>
  </div>;
}
