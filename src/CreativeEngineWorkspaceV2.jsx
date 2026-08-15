import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./creativeWorkspace.css";

const PEOPLE = [
  { id: "cara", name: "Cara", note: "Direct · dry · disciplined · British" },
  { id: "lila", name: "Lila", note: "Measured · warm · observant · understated" },
  { id: "cara_lila", name: "Cara + Lila", note: "Contrast · chemistry · shared moments" },
];
const PUBLIC_PLATFORMS = ["Instagram Reels", "TikTok", "Facebook Reels", "YouTube Shorts", "Instagram", "Facebook", "YouTube"];
const PUBLIC_PURPOSES = [
  ["show", "Show / model"], ["filler", "Lifestyle / filler"], ["reach", "Reach"], ["engagement", "Engagement"],
  ["story", "Story"], ["discovery", "Product discovery"], ["conversion", "Conversion"], ["proof", "Proof"],
];
const FANVUE_PURPOSES = [
  ["personal", "Personal post"], ["photo_set", "Photo set"], ["personality", "Personality"],
  ["interaction", "Interaction"], ["tease", "Tease"], ["behind", "Behind the scenes"],
];
const HOOKS = ["Curiosity", "Specific claim", "Contrast", "Disagreement", "Real question", "Number", "Confession", "Visual reveal"];
const ANGLES = ["Real life", "Proof", "Routine", "Comparison", "Banter", "Aspiration", "Observation", "Transformation"];
const FORMATS = ["Single image", "Carousel", "Hook-led Reel", "UGC demo", "Duo conversation", "Photo story"];
const ACCOUNTS = ["Cara & Lila", "Cornerstone AI Group", "Client Account"];
const DISCLOSURE = "Cara is the dedicated demonstration model of Cornerstone AI Assets. Every client asset maps onto private, unique reference weights — ensuring their content remains consistently them, not us.";

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("Gemini returned invalid JSON");
}
async function gemini(system, user, maxTokens = 5000) {
  const r = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, user, maxTokens }) });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || "Gemini request failed");
  return d.text;
}
function newId() { return crypto?.randomUUID?.() || `ce_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function creatorId(name) { const s = String(name || "").toLowerCase(); return s.includes("cara + lila") || s.includes("cara and lila") ? "cara_lila" : s.includes("lila") ? "lila" : "cara"; }

export default function CreativeEngineWorkspace() {
  const [mode, setMode] = useState("public");
  const isFanvue = mode === "fanvue";
  const [people, setPeople] = useState(["cara_lila"]);
  const [account, setAccount] = useState(ACCOUNTS[0]);
  const [clientAccountName, setClientAccountName] = useState("");
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productPreview, setProductPreview] = useState("");
  const [platform, setPlatform] = useState("Instagram Reels");
  const [purpose, setPurpose] = useState("filler");
  const [hookIds, setHookIds] = useState([]);
  const [angleIds, setAngleIds] = useState([]);
  const [formatIds, setFormatIds] = useState([]);
  const [seed, setSeed] = useState("");
  const [hypotheses, setHypotheses] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [production, setProduction] = useState(null);
  const [creativeId, setCreativeId] = useState(null);
  const [saved, setSaved] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const purposes = isFanvue ? FANVUE_PURPOSES : PUBLIC_PURPOSES;
  const destination = isFanvue ? "Fanvue Page" : account === "Client Account" ? (clientAccountName.trim() || "Client Account") : account;
  const platformValue = isFanvue ? "fv_page" : platform;

  useEffect(() => {
    if (!isFanvue) return;
    setPlatform("Fanvue Page");
    setPurpose("personal");
    if (!people.length) setPeople(["cara"]);
  }, [isFanvue]);

  async function loadSaved() {
    const { data } = await supabase.from("content_queue").select("id,persona_name,platform,status,caption,image_url,video_url,created_at,content_label").like("content_label", "%Creative Engine%").order("created_at", { ascending: false }).limit(40);
    if (data) setSaved(data);
  }
  useEffect(() => { loadSaved(); }, []);

  const toggle = (setter, value) => setter(v => v.includes(value) ? v.filter(x => x !== value) : [...v, value]);

  async function uploadProduct(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage("Product must be an image.");
    if (file.size > 20 * 1024 * 1024) return setMessage("Maximum product image size is 20MB.");
    setBusy(true); setMessage("Uploading product…");
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `creative/products/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("post-images").upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      setProductUrl(data.publicUrl); setProductPreview(data.publicUrl); setMessage("Product uploaded.");
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }

  async function generateHypotheses() {
    setBusy(true); setMessage(`Gemini is building the ${isFanvue ? "Fanvue" : "creative"} board…`); setHypotheses([]); setChosen(null); setProduction(null); setCreativeId(null);
    try {
      const peopleLabel = people.map(id => PEOPLE.find(p => p.id === id)?.name).join(", ");
      const purposeLabel = purposes.find(x => x[0] === purpose)?.[1] || purpose;
      const system = `You are the senior creative strategist inside Cornerstone AI Group. Create six distinct creative hypotheses before production. ${isFanvue ? "This is Fanvue mode. The audience already knows the creator. Optimise for intimacy, personality, specificity, routine, interaction and subscriber value without becoming repetitive. Keep content non-explicit. Use the existing Fanvue persona logic for Cara: direct, dry, funny, disciplined, sometimes tired-but-honest, quietly proud or softly grateful. If Cara appears, preserve the required disclosure verbatim in the final caption. Do not invent product claims." : "This is public social mode. Optimise for discovery, shareability, personality, story and visual quality. Do not use generic AI-UGC language."} Cara is direct, dry, disciplined and British. Lila is measured, warm, observant and understated. Cara + Lila means two distinct personalities with real chemistry. Return JSON only.`;
      const user = `MODE: ${isFanvue ? "FANVUE" : "PUBLIC"}\nDESTINATION: ${destination}\nPEOPLE: ${peopleLabel}\nPRODUCT: ${productName || "None"}\nPRODUCT URL: ${productUrl || "None"}\nPLATFORM: ${platformValue}\nPURPOSE: ${purposeLabel}\nHOOKS: ${hookIds.join(", ") || "Let Gemini choose"}\nANGLES: ${angleIds.join(", ") || "Let Gemini choose"}\nFORMATS: ${formatIds.join(", ") || "Let Gemini choose"}\nIDEA SEED: ${seed || "None"}\n\nReturn exactly {"hypotheses":[...]} with 6 objects. Each object: id,title,hook,angle,format,creator,why_it_might_work,visual_opening,caption_direction,cta,variation_prompt. Make at least 4 mechanisms genuinely different. If Cara + Lila is selected, use the duo in at least 2 concepts and a solo in at least 1.`;
      const out = parseJson(await gemini(system, user));
      setHypotheses(Array.isArray(out.hypotheses) ? out.hypotheses : []); setMessage(`${Array.isArray(out.hypotheses) ? out.hypotheses.length : 0} hypotheses ready.`);
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }

  function buildRow({ status = "draft", imageUrl = null, imageUrls = null, videoUrl = null }) {
    const id = creativeId || newId(); if (!creativeId) setCreativeId(id);
    return {
      id, persona_id: creatorId(chosen?.creator), persona_name: chosen?.creator || "Cara & Lila", platform: platformValue, status,
      pillar: purpose, hook: production?.hook || "", caption: production?.caption || "", hashtags: production?.hashtags || "", cta: production?.cta || null,
      photo_direction: production?.reelDirection || production?.photoIdea || null, photo_idea: production?.photoIdea || null,
      post_type: production?.postFormat || "single_photo", content_label: `${destination} · Creative Engine`,
      image_prompt: production?.imagePrompt ? JSON.stringify(production.imagePrompt) : null, image_url: imageUrl, image_urls: imageUrls, video_url: videoUrl,
      scheduled_date: new Date().toISOString().slice(0, 10), scheduled_time: new Date().toTimeString().slice(0, 5),
    };
  }
  async function persist(row) {
    const { error } = await supabase.from("content_queue").upsert(row, { onConflict: "id" });
    if (error) throw new Error(`Could not save creative: ${error.message}`);
    await loadSaved(); return row.id;
  }

  async function choose(h) {
    setBusy(true); setChosen(h); setProduction({ stage: "briefing" }); setCreativeId(newId()); setMessage("Building production brief…");
    try {
      const personaRule = isFanvue ? `This is Fanvue mode. Keep it non-explicit and subscriber-focused. If Cara appears, append this required disclosure exactly: ${DISCLOSURE}` : "For public social captions, never mention AI unless the account specifically requires it.";
      const system = `You are the production director for Cornerstone AI Group. Turn one approved hypothesis into a complete production brief. Keep the selected identities exactly. ${personaRule} Do not invent product claims. Return JSON only.`;
      const user = `HYPOTHESIS\nTitle: ${h.title}\nHook: ${h.hook}\nAngle: ${h.angle}\nFormat: ${h.format}\nCreator: ${h.creator}\nWhy: ${h.why_it_might_work}\nVisual: ${h.visual_opening}\nCaption direction: ${h.caption_direction}\nCTA: ${h.cta}\n\nCONTEXT\nDestination: ${destination}\nProduct: ${productName || "None"}\nProduct URL: ${productUrl || "None"}\nPlatform: ${platformValue}\nPurpose: ${purposes.find(x=>x[0]===purpose)?.[1] || purpose}\n\nReturn {hook,caption,hashtags,cta,postFormat,photoIdea,imagePrompt,slides,reelDirection}. postFormat must be single_photo, carousel or reel. Carousel uses 3-5 coherent slides. For duo imagery, keep Cara and Lila as two separate people.`;
      const out = parseJson(await gemini(system, user, 4500)); setProduction({ stage: "ready", ...out }); setMessage("Production brief ready. Generate media to save it automatically.");
    } catch (e) { setProduction({ stage: "error", error: e.message }); setMessage(e.message); } finally { setBusy(false); }
  }

  async function poll(requestId, statusUrl, resultUrl, type) {
    const deadline = Date.now() + 3 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 4500));
      const r = await fetch("/api/generate-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: requestId, type, status_url: statusUrl, result_url: resultUrl }) });
      const d = await r.json(); if (d.status === "COMPLETED") return type === "video" ? (d.videoUrl || d.url) : (d.imageUrl || d.url); if (d.status === "FAILED") throw new Error(d.error || `${type} generation failed`);
    }
    throw new Error(`${type} generation timed out`);
  }

  async function generateImages() {
    if (!production || production.stage === "briefing" || production.stage === "error") return;
    setBusy(true); setProduction(p => ({ ...p, stage: "generating_images", imageUrls: [], videoUrl: null })); setMessage("Generating media…");
    try {
      const slides = production.postFormat === "carousel" && production.slides?.length ? production.slides : [{ imagePrompt: production.imagePrompt, photoIdea: production.photoIdea }];
      const personaId = creatorId(chosen?.creator); const urls = [];
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        const sr = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: s.imagePrompt, photo_idea: s.photoIdea, hook: production.hook, caption: production.caption, photoDirection: production.reelDirection, personaId, seed: Math.floor(Math.random()*9999999) }) });
        const sd = await sr.json(); if (!sr.ok) throw new Error(sd?.detail || sd?.error || "Image submit failed");
        urls.push(await poll(sd.requestId, sd.statusUrl, sd.resultUrl, "image"));
      }
      setProduction(p => ({ ...p, stage: "image_ready", imageUrls: urls, imageUrl: urls[0] }));
      const row = buildRow({ status: "draft", imageUrl: urls[0], imageUrls: urls.length > 1 ? urls : null, videoUrl: null }); await persist(row);
      setMessage(isFanvue ? "Fanvue media ready and saved to the app." : "Media ready and saved to the app.");
    } catch (e) { setProduction(p => ({ ...p, stage: "ready" })); setMessage(e.message); } finally { setBusy(false); }
  }

  async function generateReel() {
    if (!production?.imageUrl) return; setBusy(true); setProduction(p => ({ ...p, stage: "generating_video" })); setMessage("Generating Reel…");
    try {
      const sr = await fetch("/api/generate-video-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: production.imageUrl, postId: creativeId || newId(), caption: production.caption, photo_idea: production.photoIdea, hook: production.hook, personaId: creatorId(chosen?.creator), resolution: "720p", duration: "8" }) });
      const sd = await sr.json(); if (!sr.ok) throw new Error(sd?.error || "Video submit failed");
      const videoUrl = await poll(sd.request_id, sd.status_url, sd.result_url, "video");
      setProduction(p => ({ ...p, stage: "video_ready", videoUrl })); await persist(buildRow({ status: "draft", imageUrl: production.imageUrl, imageUrls: production.imageUrls?.length > 1 ? production.imageUrls : null, videoUrl }));
      setMessage("Reel ready and saved to the app.");
    } catch (e) { setProduction(p => ({ ...p, stage: "image_ready" })); setMessage(e.message); } finally { setBusy(false); }
  }

  async function sendToReview() {
    if (!creativeId) return setMessage("Generate media first.");
    try { await persist(buildRow({ status: "ready", imageUrl: production.imageUrl, imageUrls: production.imageUrls?.length > 1 ? production.imageUrls : null, videoUrl: production.videoUrl || null })); setMessage("Saved to the existing Review Queue."); }
    catch (e) { setMessage(e.message); }
  }

  async function publishToMake() {
    const media = production?.videoUrl || production?.imageUrl; if (!media) return;
    setBusy(true); setMessage("Sending to Make…");
    try {
      const r = await fetch("/api/run-scheduled-posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "creative-engine" , immediate: true, post: { id: creativeId || newId(), caption: [production.hook, production.caption, production.cta, production.hashtags].filter(Boolean).join("\n\n"), imageUrl: production.imageUrl, imageUrls: production.imageUrls?.length > 1 ? production.imageUrls : null, videoUrl: production.videoUrl || null, platform: isFanvue ? "fv_page" : "all", format: production.videoUrl ? "reel" : production.imageUrls?.length > 1 ? "carousel" : "photo" } }) });
      const d = await r.json(); if (!r.ok) throw new Error(d?.error || "Publishing failed"); setMessage("Sent to the existing publishing workflow.");
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }

  function downloadMedia() {
    const urls = production?.imageUrls?.length ? production.imageUrls : [production?.imageUrl].filter(Boolean); urls.forEach((u,i) => { const a=document.createElement("a"); a.href=u; a.target="_blank"; a.download=`creative_${i+1}`; a.click(); });
    if (production?.videoUrl) { const a=document.createElement("a"); a.href=production.videoUrl; a.target="_blank"; a.download="creative_reel"; a.click(); }
  }

  return <div className="cw-shell">
    <div className="cw-head"><div><div className="cw-kicker">Cornerstone AI Group</div><h1>Creative Engine</h1><p>{isFanvue ? "Fanvue mode · brief → hypotheses → choose → produce → review → publish." : "Brief → hypotheses → choose → produce → Reel → review → publish → learn."}</p></div><a className="cw-back" href="/">Home</a></div>

    <section className="cw-card">
      <div className="cw-step">MODE</div>
      <div className="cw-mode-row"><button className={!isFanvue ? "on" : ""} onClick={()=>setMode("public")}>Public Social</button><button className={isFanvue ? "on" : ""} onClick={()=>setMode("fanvue")}>Fanvue</button></div>
    </section>

    <section className="cw-card">
      <div className="cw-step">01 · Creative brief</div>
      <div className="cw-grid four">
        {!isFanvue ? <label>Account<select value={account} onChange={e=>setAccount(e.target.value)}>{ACCOUNTS.map(x=><option key={x}>{x}</option>)}</select></label> : <label>Destination<select value="Fanvue Page" disabled><option>Fanvue Page</option></select></label>}
        {!isFanvue && account === "Client Account" ? <label>Client account<input value={clientAccountName} onChange={e=>setClientAccountName(e.target.value)} placeholder="e.g. GlowLab" /></label> : <div />}
        <label>Platform<select value={isFanvue ? "Fanvue Page" : platform} disabled={isFanvue} onChange={e=>setPlatform(e.target.value)}>{(isFanvue ? ["Fanvue Page"] : PUBLIC_PLATFORMS).map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Purpose<select value={purpose} onChange={e=>setPurpose(e.target.value)}>{purposes.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label>
      </div>
      <div className="cw-block"><div className="cw-label">People</div><div className="cw-options">{PEOPLE.map(p=><button className={people.includes(p.id)?"on":""} key={p.id} onClick={()=>toggle(setPeople,p.id)}><b>{p.name}</b><span>{p.note}</span></button>)}</div></div>
      <div className="cw-block product-block"><div><div className="cw-label">Product <span>optional</span></div><div className="cw-product-row"><input value={productName} onChange={e=>setProductName(e.target.value)} placeholder="Product / campaign / object" /><input value={productUrl} onChange={e=>setProductUrl(e.target.value)} placeholder="Public image URL (optional)" /></div><label className="cw-upload">{busy ? "Working…" : "Upload product image"}<input type="file" accept="image/*" onChange={e=>uploadProduct(e.target.files?.[0])} /></label></div>{productPreview && <img className="cw-product-preview" src={productPreview} alt="Product" />}</div>
      <label className="cw-full">Idea seed <textarea value={seed} onChange={e=>setSeed(e.target.value)} placeholder={isFanvue ? "Optional: make it feel like a casual evening, gym reset, photo set, subscriber-only routine…" : "Optional: make it feel like a Sunday morning in London, compare two routines, use this product naturally…"} /></label>
      <div className="cw-block"><div className="cw-label">Optional creative direction <span>leave empty and Gemini chooses</span></div><div className="cw-mini-grid"><div><div className="cw-sub">Hooks</div>{HOOKS.map(x=><button key={x} className={`cw-mini ${hookIds.includes(x)?"on":""}`} onClick={()=>toggle(setHookIds,x)}>{x}</button>)}</div><div><div className="cw-sub">Angles</div>{ANGLES.map(x=><button key={x} className={`cw-mini ${angleIds.includes(x)?"on":""}`} onClick={()=>toggle(setAngleIds,x)}>{x}</button>)}</div><div><div className="cw-sub">Formats</div>{FORMATS.map(x=><button key={x} className={`cw-mini ${formatIds.includes(x)?"on":""}`} onClick={()=>toggle(setFormatIds,x)}>{x}</button>)}</div></div></div>
      <button className="cw-primary" disabled={busy || !people.length} onClick={generateHypotheses}>Generate creative hypotheses</button>
    </section>

    {hypotheses.length > 0 && <section className="cw-card"><div className="cw-step">02 · Choose the idea</div><div className="cw-hypotheses">{hypotheses.map((h,i)=><article className={`cw-hyp ${chosen?.id===h.id?"selected":""}`} key={h.id || i}><div className="cw-hyp-top"><span>0{i+1}</span><div><h3>{h.title}</h3><small>{h.creator} · {h.format}</small></div></div><div className="cw-hook">{h.hook}</div><p><b>Angle:</b> {h.angle}</p><p><b>Why test it:</b> {h.why_it_might_work}</p><p><b>Visual:</b> {h.visual_opening}</p><button className="cw-secondary" onClick={()=>choose(h)}>Use this concept →</button></article>)}</div></section>}

    {production && <section className="cw-card"><div className="cw-step">03 · Produce</div>{production.stage === "briefing" ? <div className="cw-loading">Building production brief…</div> : production.stage === "error" ? <div className="cw-error">{production.error}</div> : <>
      <div className="cw-production"><div><div className="cw-label">Hook</div><div className="cw-output strong">{production.hook}</div><div className="cw-label">Caption</div><div className="cw-output">{production.caption}</div><div className="cw-label">Visual direction</div><div className="cw-output">{production.photoIdea || production.reelDirection}</div></div><div><div className="cw-label">Format</div><div className="cw-output">{production.postFormat}</div><div className="cw-label">Hashtags / CTA</div><div className="cw-output">{production.hashtags}\n\n{production.cta}</div><button className="cw-primary" disabled={busy} onClick={generateImages}>{production.stage === "generating_images" ? "Generating…" : "Generate media"}</button></div></div>
      {(production.imageUrls?.length > 0 || production.videoUrl) && <div className="cw-media"><div className="cw-media-main">{production.videoUrl ? <video controls src={production.videoUrl} /> : <img src={production.imageUrls?.[0]} alt="Generated creative" />}</div>{production.imageUrls?.length > 1 && <div className="cw-thumbs">{production.imageUrls.map(u=><img key={u} src={u} alt="Slide" />)}</div>}</div>}
      {production.imageUrl && <div className="cw-actions"><button className="cw-secondary" onClick={generateReel} disabled={busy}>Generate Reel</button><button className="cw-secondary" onClick={sendToReview}>Send to Review Queue</button><button className="cw-secondary" onClick={downloadMedia}>Download media</button><button className="cw-primary" onClick={publishToMake} disabled={busy}>{isFanvue ? "Send to Fanvue" : "Send to Facebook + Instagram via Make"}</button></div>}
    </>}</section>}

    <section className="cw-card"><div className="cw-step">Saved creatives</div>{saved.length ? <div className="cw-list">{saved.map(x=><div className="cw-row" key={x.id}><div><b>{x.persona_name}</b><span>{x.platform} · {x.status}</span></div><div className="cw-row-caption">{x.caption}</div></div>)}</div> : <div className="cw-empty">Generated media is saved into the existing content queue here.</div>}</section>
    {message && <div className="cw-status">{message}</div>}
  </div>;
}
