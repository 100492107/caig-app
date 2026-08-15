import React, { useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./creativeWorkspace.css";

const PEOPLE = [
  { id: "cara", name: "Cara", note: "Direct · dry · disciplined · British" },
  { id: "lila", name: "Lila", note: "Measured · warm · observant · understated" },
  { id: "cara_lila", name: "Cara + Lila", note: "Contrast · chemistry · shared moments" },
];

const PLATFORMS = ["Instagram Reels", "TikTok", "Facebook Reels", "YouTube Shorts", "Instagram", "Facebook", "YouTube"];
const PURPOSES = [
  ["show", "Show / model", "Visual-first. Let the person, product or setting do the work."],
  ["filler", "Lifestyle / filler", "Build presence and familiarity without forcing a sale."],
  ["reach", "Reach", "Maximise discovery among people who do not know the account."],
  ["engagement", "Engagement", "Earn comments, shares, saves or conversation."],
  ["story", "Story", "Make a real moment, opinion or experience feel worth following."],
  ["discovery", "Product discovery", "Introduce a product naturally inside a useful or aspirational moment."],
  ["conversion", "Conversion", "Give the viewer a reason to take an action now."],
  ["proof", "Proof", "Demonstrate use, result, transformation or credibility."],
];
const HOOKS = [
  ["curiosity", "Curiosity", "Open a loop the viewer wants closed."],
  ["specific", "Specific claim", "Lead with a concrete statement or detail."],
  ["contrast", "Contrast", "Expected version vs actual version."],
  ["disagreement", "Disagreement", "Two people genuinely see the thing differently."],
  ["question", "Real question", "Start with something the creator has actually wondered."],
  ["number", "Number", "A specific true number carries the hook."],
  ["confession", "Confession", "An honest admission or mistake."],
  ["visual", "Visual reveal", "Make the opening image itself the hook."],
];
const ANGLES = [
  ["real_life", "Real life", "A lived moment, not an advert."],
  ["proof", "Proof", "Demonstration or evidence."],
  ["routine", "Routine", "Product/person naturally inside a repeatable habit."],
  ["comparison", "Comparison", "Two things, two approaches or two perspectives."],
  ["banter", "Banter", "Personality and chemistry create the reason to watch."],
  ["aspiration", "Aspiration", "Make the viewer want the world around the product."],
  ["observation", "Observation", "A detail others would not normally say."],
  ["transformation", "Transformation", "Show a meaningful before/after or shift."],
];
const FORMATS = [
  ["single", "Single image", "One finished still."],
  ["carousel", "Carousel", "3–5 connected stills."],
  ["hook_reel", "Hook-led Reel", "Short-form video built around the opening hook."],
  ["ugc_demo", "UGC demo", "Natural use / hold / wear / demonstrate."],
  ["creator_duo", "Duo conversation", "Cara + Lila contrast, banter or shared moment."],
  ["photo_story", "Photo story", "Sequential stills that tell a small narrative."],
];

const ACCOUNTS = ["Cara & Lila", "Cornerstone AI Group", "Client Account"];

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("Gemini returned invalid JSON");
}

async function askGemini(system, user, maxTokens = 5000) {
  const r = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user, maxTokens }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || "Gemini request failed");
  return data.text;
}

function formatLabel(list, ids) {
  return ids.map(id => list.find(x => x[0] === id)?.[1]).filter(Boolean).join(", ") || "Let Gemini choose";
}

function newCreativeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `ce_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function CreativeEngineWorkspace() {
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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const toggle = (setter, id) => setter(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  const destinationName = account === "Client Account" ? (clientAccountName.trim() || "Client Account") : account;

  async function uploadProduct(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Product must be an image."); return; }
    if (file.size > 20 * 1024 * 1024) { setMessage("Maximum product image size is 20MB."); return; }
    setBusy(true); setMessage("Uploading product…");
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `creative/products/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("post-images").upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      setProductUrl(data.publicUrl);
      setProductPreview(data.publicUrl);
      setMessage("Product uploaded.");
    } catch (e) {
      setMessage(e.message);
    } finally { setBusy(false); }
  }

  async function generateHypotheses() {
    setBusy(true); setMessage("Gemini is building the creative board…"); setHypotheses([]); setChosen(null); setProduction(null); setCreativeId(null);
    try {
      const peopleLabel = people.map(id => PEOPLE.find(p => p.id === id)?.name).join(", ");
      const purposeLabel = PURPOSES.find(x => x[0] === purpose)?.[1] || purpose;
      const system = `You are the senior creative strategist inside Cornerstone AI Group. Create a board of distinct hypotheses before any production happens. The goal is to help an executive choose what to make. Never return generic AI-UGC filler. Cara is direct, dry, disciplined and British. Lila is measured, warm, observant and understated. Cara + Lila means two separate personalities with real contrast and chemistry. If a product is supplied, never invent claims or features. Match the selected platform and purpose. Return JSON only.`;
      const user = `BRIEF\nDestination account: ${destinationName}\nPeople: ${peopleLabel}\nProduct: ${productName || "None"}\nProduct URL: ${productUrl || "None"}\nPlatform: ${platform}\nPurpose: ${purposeLabel}\nHooks I like: ${formatLabel(HOOKS, hookIds)}\nAngles I like: ${formatLabel(ANGLES, angleIds)}\nFormats I like: ${formatLabel(FORMATS, formatIds)}\nExtra idea: ${seed || "None"}\n\nReturn exactly {"hypotheses":[...]} with 6 objects. Each object must contain: id, title, hook, angle, format, creator, why_it_might_work, visual_opening, caption_direction, cta, variation_prompt. At least 4 concepts must differ in psychological mechanism, not merely wording. If Cara + Lila is selected, at least 2 should use the duo and at least 1 should feature only one of them.`;
      const out = parseJson(await askGemini(system, user));
      setHypotheses(Array.isArray(out.hypotheses) ? out.hypotheses : []);
      setMessage(`${Array.isArray(out.hypotheses) ? out.hypotheses.length : 0} hypotheses ready.`);
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }

  function creatorIdForProduction(name) {
    const s = String(name || "").toLowerCase();
    if (s.includes("cara + lila") || s.includes("cara and lila")) return "cara_lila";
    if (s.includes("lila")) return "lila";
    return "cara";
  }

  function buildQueueRow({ status = "draft", imageUrl = null, imageUrls = null, videoUrl = null }) {
    const id = creativeId || newCreativeId();
    if (!creativeId) setCreativeId(id);
    return {
      id,
      persona_id: creatorIdForProduction(chosen?.creator),
      persona_name: chosen?.creator || "Cara & Lila",
      platform,
      status,
      pillar: purpose,
      hook: production?.hook || "",
      caption: production?.caption || "",
      hashtags: production?.hashtags || "",
      cta: production?.cta || null,
      photo_direction: production?.reelDirection || production?.photoIdea || null,
      photo_idea: production?.photoIdea || null,
      post_type: production?.postFormat || "single_photo",
      content_label: `${destinationName} · Creative Engine`,
      image_prompt: production?.imagePrompt ? JSON.stringify(production.imagePrompt) : null,
      image_url: imageUrl,
      image_urls: imageUrls,
      video_url: videoUrl,
      scheduled_date: new Date().toISOString().slice(0, 10),
      scheduled_time: new Date().toTimeString().slice(0, 5),
    };
  }

  async function persistDraft(mediaOverride = {}) {
    const row = buildQueueRow(mediaOverride);
    const { error } = await supabase.from("content_queue").upsert(row, { onConflict: "id" });
    if (error) throw new Error(`Could not save creative: ${error.message}`);
    return row.id;
  }

  async function turnIntoProduction(h) {
    setBusy(true); setChosen(h); setProduction({ stage: "briefing" }); setMessage("Building production brief…"); setCreativeId(newCreativeId());
    try {
      const system = `You are the production director for Cornerstone AI Group. Turn one approved creative hypothesis into a complete production brief. Keep the exact selected identity. Do not invent product claims. Return JSON only.`;
      const user = `CHOSEN HYPOTHESIS\nTitle: ${h.title}\nHook: ${h.hook}\nAngle: ${h.angle}\nFormat: ${h.format}\nCreator: ${h.creator}\nWhy: ${h.why_it_might_work}\nVisual opening: ${h.visual_opening}\nCaption direction: ${h.caption_direction}\nCTA: ${h.cta}\n\nCONTEXT\nDestination account: ${destinationName}\nProduct: ${productName || "None"}\nProduct URL: ${productUrl || "None"}\nPlatform: ${platform}\nPurpose: ${PURPOSES.find(x=>x[0]===purpose)?.[1] || purpose}\n\nReturn exactly {"hook","caption","hashtags","cta","postFormat","photoIdea","imagePrompt","slides","reelDirection"}. postFormat is single_photo, carousel or reel. For carousel return 3-5 slides each with imagePrompt and photoIdea. For duo imagery make it explicit that Cara and Lila remain two distinct people. For public social captions, never mention AI.`;
      const out = parseJson(await askGemini(system, user, 4500));
      setProduction({ stage: "ready", ...out }); setMessage("Production brief ready. Generate media to save the creative automatically.");
    } catch (e) { setProduction({ stage: "error", error: e.message }); setMessage(e.message); }
    finally { setBusy(false); }
  }

  async function poll(requestId, statusUrl, resultUrl, type) {
    const deadline = Date.now() + 3 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 4500));
      const r = await fetch("/api/generate-poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: requestId, type, status_url: statusUrl, result_url: resultUrl }) });
      const d = await r.json();
      if (d.status === "COMPLETED") return type === "video" ? (d.videoUrl || d.url) : (d.imageUrl || d.url);
      if (d.status === "FAILED") throw new Error(d.error || `${type} generation failed`);
    }
    throw new Error(`${type} generation timed out`);
  }

  async function generateImages() {
    if (!production || production.stage === "briefing" || production.stage === "error") return;
    setBusy(true); setProduction(p => ({ ...p, stage: "generating_images", imageUrls: [], videoUrl: null })); setMessage("Generating media…");
    try {
      const isCarousel = production.postFormat === "carousel";
      const slides = isCarousel && Array.isArray(production.slides) && production.slides.length ? production.slides : [{ imagePrompt: production.imagePrompt, photoIdea: production.photoIdea }];
      const personaId = creatorIdForProduction(chosen?.creator);
      const urls = [];
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        const sr = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: s.imagePrompt, photo_idea: s.photoIdea, hook: production.hook, caption: production.caption, photoDirection: production.reelDirection, personaId, seed: Math.floor(Math.random() * 9999999) }) });
        const sd = await sr.json();
        if (!sr.ok) throw new Error(sd?.detail || sd?.error || "Image submit failed");
        const url = await poll(sd.requestId, sd.statusUrl, sd.resultUrl, "image");
        urls.push(url);
        fetch("/api/store-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ falUrl: url, requestId: sd.requestId, postId: `creative_${Date.now()}_${i}`, slideIndex: i }) }).catch(() => {});
        setProduction(p => ({ ...p, imageUrls: [...urls], imageUrl: urls[0] }));
      }
      setProduction(p => ({ ...p, stage: "image_ready", imageUrls: urls, imageUrl: urls[0] }));
      await persistDraft({ status: "draft", imageUrl: urls[0], imageUrls: urls.length > 1 ? urls : null, videoUrl: null });
      setMessage(isCarousel ? `Carousel ready and saved to the app — ${urls.length} images.` : "Image ready and saved to the app.");
    } catch (e) { setProduction(p => ({ ...p, stage: "ready" })); setMessage(e.message); }
    finally { setBusy(false); }
  }

  async function generateReel() {
    if (!production?.imageUrl) return;
    setBusy(true); setProduction(p => ({ ...p, stage: "generating_video" })); setMessage("Generating Reel…");
    try {
      const personaId = creatorIdForProduction(chosen?.creator);
      const sr = await fetch("/api/generate-video-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: production.imageUrl, postId: creativeId || `creative_${Date.now()}`, caption: production.caption, photo_idea: production.photoIdea, hook: production.hook, personaId, resolution: "720p", duration: "8" }) });
      const sd = await sr.json();
      if (!sr.ok) throw new Error(sd?.error || "Video submit failed");
      const videoUrl = await poll(sd.request_id, sd.status_url, sd.result_url, "video");
      setProduction(p => ({ ...p, stage: "video_ready", videoUrl }));
      await persistDraft({ status: "draft", imageUrl: production.imageUrl, imageUrls: production.imageUrls?.length > 1 ? production.imageUrls : null, videoUrl });
      setMessage("Reel ready and saved to the app.");
    } catch (e) { setProduction(p => ({ ...p, stage: "image_ready" })); setMessage(e.message); }
    finally { setBusy(false); }
  }

  async function sendToReview() {
    if (!production?.imageUrl) return;
    setBusy(true); setMessage("Saving to Review Queue…");
    try {
      await persistDraft({ status: "ready", imageUrl: production.imageUrl, imageUrls: production.imageUrls?.length > 1 ? production.imageUrls : null, videoUrl: production.videoUrl || null });
      setMessage("Saved to the existing Review Queue.");
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }

  async function publishToMake() {
    const media = production?.videoUrl || production?.imageUrl;
    if (!media) return;
    setBusy(true); setMessage("Sending to Make…");
    try {
      const r = await fetch("/api/make-publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        caption: [production.hook, production.caption, production.cta, production.hashtags].filter(Boolean).join("\n\n"),
        imageUrl: production.imageUrl,
        imageUrls: production.imageUrls?.length > 1 ? production.imageUrls : null,
        videoUrl: production.videoUrl || null,
        postId: creativeId || `creative_${Date.now()}`,
        platform: "all",
        format: production.videoUrl ? "reel" : (production.imageUrls?.length > 1 ? "carousel" : "photo"),
      }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Make publish failed");
      await persistDraft({ status: "posted", imageUrl: production.imageUrl, imageUrls: production.imageUrls?.length > 1 ? production.imageUrls : null, videoUrl: production.videoUrl || null });
      setMessage("Sent to Make and marked as posted in the app.");
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }

  function downloadMedia() {
    const urls = production?.imageUrls?.length ? production.imageUrls : [production?.imageUrl].filter(Boolean);
    urls.forEach((url, i) => { const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.download = `cornerstone_creative_${i + 1}`; a.click(); });
    if (production?.videoUrl) { const a = document.createElement("a"); a.href = production.videoUrl; a.target = "_blank"; a.download = "cornerstone_creative_reel"; a.click(); }
  }

  const selectedPurpose = useMemo(() => PURPOSES.find(x => x[0] === purpose), [purpose]);

  return (
    <div className="cw-shell">
      <div className="cw-head"><div><div className="cw-kicker">Cornerstone AI Group</div><h1>Creative Engine</h1><p>Brief → hypotheses → choose → produce → Reel → review → publish → learn.</p></div><a className="cw-back" href="/">Open full app →</a></div>

      <section className="cw-card">
        <div className="cw-step">01 · Creative brief</div>
        <div className="cw-grid four">
          <label>Account<select value={account} onChange={e=>setAccount(e.target.value)}>{ACCOUNTS.map(x=><option key={x}>{x}</option>)}</select></label>
          {account === "Client Account" && <label>Client account name<input value={clientAccountName} onChange={e=>setClientAccountName(e.target.value)} placeholder="e.g. GlowLab" /></label>}
          <label>Platform<select value={platform} onChange={e=>setPlatform(e.target.value)}>{PLATFORMS.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Purpose<select value={purpose} onChange={e=>setPurpose(e.target.value)}>{PURPOSES.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label>
        </div>
        <div className="cw-block"><div className="cw-label">People</div><div className="cw-options">{PEOPLE.map(p=><button className={people.includes(p.id)?"on":""} key={p.id} onClick={()=>toggle(setPeople,p.id)}><b>{p.name}</b><span>{p.note}</span></button>)}</div></div>
        <div className="cw-block product-block"><div><div className="cw-label">Product <span>optional</span></div><div className="cw-product-row"><input value={productName} onChange={e=>setProductName(e.target.value)} placeholder="Product / campaign / object" /><input value={productUrl} onChange={e=>setProductUrl(e.target.value)} placeholder="Public image URL (optional)" /></div><label className="cw-upload">{busy ? "Working…" : "Upload product image"}<input type="file" accept="image/*" onChange={e=>uploadProduct(e.target.files?.[0])} /></label></div>{productPreview && <img className="cw-product-preview" src={productPreview} alt="Product" />}</div>
        <label className="cw-full">Idea seed <textarea value={seed} onChange={e=>setSeed(e.target.value)} placeholder="Optional: make it feel like a Sunday morning in London, compare two routines, use this product naturally…" /></label>

        <div className="cw-block"><div className="cw-label">Optional creative direction <span>leave empty and Gemini chooses</span></div>
          <div className="cw-mini-grid"><div><div className="cw-sub">Hooks</div>{HOOKS.map(x=><button key={x[0]} className={`cw-mini ${hookIds.includes(x[0])?"on":""}`} onClick={()=>toggle(setHookIds,x[0])}>{x[1]}</button>)}</div><div><div className="cw-sub">Angles</div>{ANGLES.map(x=><button key={x[0]} className={`cw-mini ${angleIds.includes(x[0])?"on":""}`} onClick={()=>toggle(setAngleIds,x[0])}>{x[1]}</button>)}</div><div><div className="cw-sub">Formats</div>{FORMATS.map(x=><button key={x[0]} className={`cw-mini ${formatIds.includes(x[0])?"on":""}`} onClick={()=>toggle(setFormatIds,x[0])}>{x[1]}</button>)}</div></div>
        </div>
        <button className="cw-primary" disabled={busy || !people.length} onClick={generateHypotheses}>Generate creative hypotheses</button>
      </section>

      {hypotheses.length > 0 && <section className="cw-card"><div className="cw-step">02 · Choose the idea</div><div className="cw-hypotheses">{hypotheses.map((h,i)=><article className={`cw-hyp ${chosen?.id===h.id?"selected":""}`} key={h.id || i}><div className="cw-hyp-top"><span>0{i+1}</span><div><h3>{h.title}</h3><small>{h.creator} · {h.format}</small></div></div><div className="cw-hook">{h.hook}</div><p><b>Angle:</b> {h.angle}</p><p><b>Why test it:</b> {h.why_it_might_work}</p><p><b>Visual:</b> {h.visual_opening}</p><button className="cw-secondary" onClick={()=>turnIntoProduction(h)}>Use this concept →</button></article>)}</div></section>}

      {production && <section className="cw-card"><div className="cw-step">03 · Produce</div>{production.stage === "briefing" && <div className="cw-loading">Building production brief…</div>}{production.stage === "error" && <div className="cw-error">{production.error}</div>}{production.stage !== "briefing" && production.stage !== "error" && <>
        <div className="cw-production"><div><div className="cw-label">Hook</div><div className="cw-output strong">{production.hook}</div><div className="cw-label">Caption</div><div className="cw-output">{production.caption}</div><div className="cw-label">Visual direction</div><div className="cw-output">{production.photoIdea || production.reelDirection}</div></div><div><div className="cw-label">Format</div><div className="cw-output">{production.postFormat}</div><div className="cw-label">Hashtags / CTA</div><div className="cw-output">{production.hashtags}\n\n{production.cta}</div><button className="cw-primary" disabled={busy || production.stage === "generating_images" || production.stage === "generating_video"} onClick={generateImages}>{production.stage === "generating_images" ? "Generating…" : "Generate media"}</button></div></div>
        {(production.imageUrls?.length > 0 || production.videoUrl) && <div className="cw-media"><div className="cw-media-main">{production.videoUrl ? <video controls src={production.videoUrl} /> : <img src={production.imageUrls?.[0]} alt="Generated creative" />}</div>{production.imageUrls?.length > 1 && <div className="cw-thumbs">{production.imageUrls.map(u=><img key={u} src={u} alt="Slide" />)}</div>}</div>}
        {production.imageUrl && !production.videoUrl && <div className="cw-actions"><button className="cw-secondary" onClick={generateReel} disabled={busy}>Generate Reel</button><button className="cw-secondary" onClick={sendToReview} disabled={busy}>Send to Review Queue</button><button className="cw-secondary" onClick={downloadMedia}>Download media</button><button className="cw-primary" onClick={publishToMake} disabled={busy}>Send to Facebook + Instagram via Make</button></div>}
        {production.videoUrl && <div className="cw-actions"><button className="cw-secondary" onClick={sendToReview} disabled={busy}>Send to Review Queue</button><button className="cw-secondary" onClick={downloadMedia}>Download media</button><button className="cw-primary" onClick={publishToMake} disabled={busy}>Send Reel to Facebook + Instagram via Make</button></div>}
      </>}</section>}

      {message && <div className="cw-status">{message}</div>}
    </div>
  );
}
