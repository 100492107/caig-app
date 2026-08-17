import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./creativeWorkspace.css";

const PEOPLE = [
  { id: "cara", name: "Cara", note: "Direct, dry, disciplined, British" },
  { id: "lila", name: "Lila", note: "Measured, warm, observant, understated" },
  { id: "cara_lila", name: "Cara + Lila", note: "Contrast, chemistry, shared moments" },
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

const HUMAN_RULES = [
  "Lead with a specific observation, moment, opinion, tension, question, joke, or useful detail; never with a generic content formula.",
  "Use concrete nouns and sensory details: an actual setting, object, time cue, action, texture, sound, weather, routine, or visual behaviour when appropriate.",
  "Do not invent personal experience, product usage, results, conversations, testimonials, locations, measurements, or claims that were not supplied by the user or supported by the product context.",
  "Avoid empty phrases such as 'you need to see this', 'game changer', 'obsessed', 'elevate your', 'unlock', 'this is everything', 'POV:' unless the concept genuinely requires them.",
  "Avoid generic influencer staging: centre-frame smiling, crossed arms, pointing at text, perfect showroom poses, symmetrical product placement, identical lighting, fake surprise, and needless cinematic slow motion.",
  "Prefer natural behaviour over performance: looking away, mid-action posture, imperfect framing, asymmetry, ordinary environments, believable wardrobe choices and small contextual details.",
  "The visual should feel like a real moment that happened to be worth filming, not an advert brief pretending to be a post.",
  "Captions should sound like a person with a point of view. Use short and long sentences naturally, and allow a little understatement.",
  "Every test needs a distinct psychological mechanism. Do not create six copies with different adjectives.",
  "Premium does not mean sterile. Keep polish in the craft, not in the personality.",
];

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("Gemini returned invalid JSON");
}
async function gemini(system, user, maxTokens = 6000) {
  const r = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, user, maxTokens }) });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || "Gemini request failed");
  return d.text;
}
function newId() { return crypto?.randomUUID?.() || `ce_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function creatorId(name) { const s = String(name || "").toLowerCase(); return s.includes("cara + lila") || s.includes("cara and lila") ? "cara_lila" : s.includes("lila") ? "lila" : "cara"; }
function creatorLabel(id) { return PEOPLE.find(p => p.id === id)?.name || id; }
function cleanList(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }

const baseStyle = { background: "#08070D", color: "#A1A5B7" };
const cardStyle = { background: "#0E0D18", border: "1px solid #262A3C", borderRadius: 16, padding: 20 };
const buttonStyle = { border: "1px solid #2d3246", background: "#141525", color: "#fff", borderRadius: 999, padding: "9px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 };
const activeButtonStyle = { ...buttonStyle, borderColor: "#D4AF37", background: "rgba(212,175,55,.12)", color: "#D4AF37" };

export default function CreativeEngineWorkspaceV4() {
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
  const [humanContext, setHumanContext] = useState("");
  const [productFacts, setProductFacts] = useState("");
  const [avoid, setAvoid] = useState("");
  const [seed, setSeed] = useState("");
  const [hypotheses, setHypotheses] = useState([]);
  const [testSet, setTestSet] = useState([]);
  const [preferredId, setPreferredId] = useState(null);
  const [saved, setSaved] = useState([]);
  const [busy, setBusy] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
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
    const { data } = await supabase
      .from("content_queue")
      .select("id,persona_name,platform,status,caption,image_url,image_urls,video_url,created_at,content_label,post_type,hook,cta")
      .like("content_label", "%Creative Engine%")
      .order("created_at", { ascending: false })
      .limit(100);
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
    setBusy(true);
    setMessage(`Gemini is building six human-first ${isFanvue ? "Fanvue" : "creative"} hypotheses…`);
    setHypotheses([]); setTestSet([]); setPreferredId(null);
    try {
      const peopleLabel = people.map(id => PEOPLE.find(p => p.id === id)?.name).join(", ");
      const purposeLabel = purposes.find(x => x[0] === purpose)?.[1] || purpose;
      const system = `You are the creative director of a premium creator studio. The goal is NOT more AI content. The goal is content that feels authored, specific, socially native and human-reviewed. Build six distinct hypotheses that could plausibly exist on a real person's feed.\n\nCORE ANTI-SLOP STANDARD:\n${HUMAN_RULES.map((r,i)=>`${i+1}. ${r}`).join("\n")}\n\n${isFanvue ? "Fanvue mode: the audience already knows the creator. Favour intimacy, personality, routines, specific thoughts and subscriber value. Keep it non-explicit. Do not fabricate private life details." : "Public mode: optimise for attention and personality without generic creator-speak. The account should feel like a real person or brand with a point of view, not a content factory."}\nCara: direct, dry, disciplined, British. Lila: measured, warm, observant, understated. Cara + Lila: two distinct personalities with chemistry, contrast and natural interaction.\nReturn JSON only.`;
      const user = `MODE: ${isFanvue ? "FANVUE" : "PUBLIC"}\nDESTINATION: ${destination}\nPEOPLE: ${peopleLabel}\nPRODUCT: ${productName || "None"}\nPRODUCT URL: ${productUrl || "None"}\nPLATFORM: ${platformValue}\nPURPOSE: ${purposeLabel}\nPREFERRED HOOK TYPES: ${hookIds.join(", ") || "Let the director choose"}\nPREFERRED ANGLES: ${angleIds.join(", ") || "Let the director choose"}\nPREFERRED FORMATS: ${formatIds.join(", ") || "Let the director choose"}\nHUMAN CONTEXT FROM ME: ${humanContext || "None supplied"}\nPRODUCT FACTS / PROOF: ${productFacts || "None supplied"}\nTHINGS TO AVOID: ${avoid || "None supplied"}\nIDEA SEED: ${seed || "None"}\n\nReturn exactly {"hypotheses":[...]} with 6 objects. Each object must contain: id,title,hook,angle,format,creator,mechanism,scene,why_it_feels_human,visual_language,caption_direction,cta,variation_prompt,slop_risks. The scene must contain at least 2 concrete visual details. The caption_direction must specify what the person should actually say/notice/ask rather than describing a marketing objective. At least 4 concepts must use materially different psychological mechanisms. Do not use generic influencer phrases. Do not invent testimonials, results or first-person experiences that were not supplied. Return one or two concepts that are deliberately quieter or observational rather than all being high-energy.`;
      const out = parseJson(await gemini(system, user));
      const hs = Array.isArray(out.hypotheses) ? out.hypotheses.slice(0, 6) : [];
      setHypotheses(hs);
      setMessage(`${hs.length} hypotheses ready. All six remain active; a preferred choice only flags emphasis.`);
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }

  async function buildProduction(h) {
    const personaRule = isFanvue
      ? `This is Fanvue mode. Keep it non-explicit and subscriber-focused. If Cara appears, append this required disclosure exactly: ${DISCLOSURE}`
      : "Do not mention AI unless the account's disclosure policy explicitly requires it.";
    const system = `You are the production director and human editor for a premium creator studio. Turn one approved hypothesis into a complete production brief. Apply this anti-slop gate before returning anything:\n${HUMAN_RULES.map((r,i)=>`${i+1}. ${r}`).join("\n")}\n\nYou must make the output feel like a real post with a reason to exist. No generic hook ladders, no empty CTAs, no fake personal claims, no 'viral' promises, no polished ad language where a normal person would be simpler. ${personaRule} Return JSON only.`;
    const user = `HYPOTHESIS\nTitle: ${h.title}\nHook: ${h.hook}\nAngle: ${h.angle}\nFormat: ${h.format}\nCreator: ${h.creator}\nMechanism: ${h.mechanism}\nScene: ${h.scene}\nWhy human: ${h.why_it_feels_human}\nVisual language: ${h.visual_language}\nCaption direction: ${h.caption_direction}\nCTA: ${h.cta}\nSlop risks: ${(h.slop_risks || []).join(" | ")}\n\nCONTEXT\nDestination: ${destination}\nProduct: ${productName || "None"}\nProduct URL: ${productUrl || "None"}\nProduct facts: ${productFacts || "None"}\nPlatform: ${platformValue}\nPurpose: ${purposes.find(x=>x[0]===purpose)?.[1] || purpose}\nMy human context: ${humanContext || "None"}\nThings to avoid: ${avoid || "None"}\n\nReturn {hook,caption,hashtags,cta,postFormat,photoIdea,imagePrompt,slides,reelDirection,humanityScore,slopChecks}. humanityScore is 0-100. slopChecks must be an array of concise pass/fail statements. The caption should read like an actual person wrote it, not a content writer. The visual brief must include believable environment, posture, wardrobe, camera behaviour, lighting and small imperfections. Do not over-stage. If carousel, provide 3-5 coherent slides where each slide has a distinct job.`;
    const production = parseJson(await gemini(system, user, 5000));

    const auditSystem = `You are the final human editor. Your only job is to catch synthetic, generic, over-polished or fabricated creative. Score the draft against these rules: specificity, point of view, believable behaviour, non-generic language, natural CTA, visual realism, continuity, and factual honesty. If any issue is material, rewrite the affected field. Do not make it more corporate. Return JSON only.`;
    const auditUser = `DRAFT\n${JSON.stringify(production)}\n\nCONTEXT\nDestination: ${destination}\nCreator: ${h.creator}\nProduct facts: ${productFacts || "None"}\nHuman context: ${humanContext || "None"}\nAvoid: ${avoid || "None"}\n\nReturn {pass,score,issues,revised}. revised must contain the complete corrected production object when pass=false and may equal the original object when pass=true.`;
    const audit = parseJson(await gemini(auditSystem, auditUser, 4500));
    return audit.pass ? production : { ...production, ...(audit.revised || {}), humanityAudit: audit };
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

  function premiumImagePrompt({ imagePrompt, photoIdea, creator }) {
    const personNames = creator === "Cara + Lila" ? "Cara and Lila as two distinct people" : creator;
    return `${imagePrompt || photoIdea || "A candid social photograph"}. ${personNames}. Premium real-life editorial/social photography, not an advertisement. Natural skin texture, believable hands, normal proportions, subtle asymmetry, realistic hair strands, ordinary wardrobe details, lived-in environment, mixed or imperfect natural light, plausible phone-camera or handheld composition, slightly imperfect framing, authentic posture and eye lines, realistic depth of field, no plastic skin, no excessive bokeh, no beauty-filter smoothing, no exaggerated smile, no model-pose stiffness, no floating objects, no duplicate limbs, no generic studio backdrop unless the concept explicitly calls for it. Preserve identity and product truth. Make it feel like a real moment that happened to be photographed.`;
  }

  async function generateMediaForItem(item) {
    const production = item.production;
    const slides = production.postFormat === "carousel" && production.slides?.length ? production.slides : [{ imagePrompt: production.imagePrompt, photoIdea: production.photoIdea }];
    const personaId = creatorId(item.hypothesis.creator);
    const urls = [];
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      const sr = await fetch("/api/generate-submit", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          imagePrompt: premiumImagePrompt({ imagePrompt: s.imagePrompt, photoIdea: s.photoIdea, creator: item.hypothesis.creator }),
          photo_idea: s.photoIdea,
          hook: production.hook,
          caption: production.caption,
          photoDirection: production.reelDirection,
          personaId,
          seed: Math.floor(Math.random() * 9999999),
        })
      });
      const sd = await sr.json();
      if (!sr.ok) throw new Error(sd?.detail || sd?.error || "Image submit failed");
      urls.push(await poll(sd.requestId, sd.statusUrl, sd.resultUrl, "image"));
    }
    const id = newId();
    const row = {
      id,
      persona_id: personaId,
      persona_name: item.hypothesis.creator || "Cara & Lila",
      platform: platformValue,
      status: "draft",
      pillar: purpose,
      hook: production.hook || "",
      caption: production.caption || "",
      hashtags: production.hashtags || "",
      cta: production.cta || null,
      photo_direction: production.reelDirection || production.photoIdea || null,
      photo_idea: production.photoIdea || null,
      post_type: production.postFormat || "single_photo",
      content_label: `${destination} · Creative Engine · Test ${item.index + 1}`,
      image_prompt: production.imagePrompt ? JSON.stringify(production.imagePrompt) : null,
      image_url: urls[0] || null,
      image_urls: urls.length > 1 ? urls : null,
      video_url: null,
      scheduled_date: new Date().toISOString().slice(0, 10),
      scheduled_time: new Date().toTimeString().slice(0, 5),
      notes: JSON.stringify({ hypothesis: item.hypothesis, humanityScore: production.humanityScore || null, humanityAudit: production.humanityAudit || null }),
    };
    const { error } = await supabase.from("content_queue").upsert(row, { onConflict: "id" });
    if (error) throw new Error(`Could not save test ${item.index + 1}: ${error.message}`);
    return { ...item, id, imageUrls: urls, imageUrl: urls[0], status: "image_ready" };
  }

  async function buildSingle(index) {
    const h = hypotheses[index];
    if (!h || testSet[index]?.status === "generating" || testSet[index]?.status === "image_ready") return;
    setTestSet(prev => {
      const next = Array.from({ length: Math.max(prev.length, index + 1) }, (_, i) => prev[i] || null);
      next[index] = { index, hypothesis: h, status: "briefing" };
      return next;
    });
    try {
      const production = await buildProduction(h);
      setTestSet(prev => {
        const next = Array.from({ length: Math.max(prev.length, index + 1) }, (_, i) => prev[i] || null);
        next[index] = { ...(next[index] || { index, hypothesis: h }), production, status: "generating" };
        return next;
      });
      const result = await generateMediaForItem({ index, hypothesis: h, production });
      setTestSet(prev => {
        const next = Array.from({ length: Math.max(prev.length, index + 1) }, (_, i) => prev[i] || null);
        next[index] = result;
        return next;
      });
      await loadSaved();
    } catch (e) {
      setTestSet(prev => {
        const next = Array.from({ length: Math.max(prev.length, index + 1) }, (_, i) => prev[i] || null);
        next[index] = { ...(next[index] || { index, hypothesis: h }), status: "error", error: e.message };
        return next;
      });
    }
  }

  async function generateAllSix() {
    if (hypotheses.length !== 6 || batchBusy) return;
    setBatchBusy(true); setMessage("Building all six creative tests. No hypothesis is being discarded.");
    setTestSet(hypotheses.map((h,index)=>({ index, hypothesis:h, status:"queued" })));
    try {
      for (let i=0;i<hypotheses.length;i++) { await buildSingle(i); setMessage(`Human-first test set progress: ${i+1}/6 complete.`); }
      setMessage("All six tests are generated, saved and ready for review.");
    } finally { setBatchBusy(false); }
  }

  return (
    <div className="ce-shell fu" style={baseStyle}>
      <section className="ce-card" style={cardStyle}>
        <div className="ce-section"><div><div className="ce-title">Creative Engine · Human-First Mode</div><div className="ce-sub">Brief → six hypotheses → human audit → produce all six → publish → measure → learn.</div></div><div className="ce-badge ce-measuring">AI for speed · human judgement for quality</div></div>
        <div className="ce-callout" style={{marginBottom:14}}><strong>Anti-slop rule:</strong> I would rather publish fewer pieces with a real point of view than flood an account with polished filler. Every concept must have a reason to exist, concrete detail and believable behaviour.</div>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}><button style={mode==="public"?activeButtonStyle:buttonStyle} onClick={()=>setMode("public")}>Public Social</button><button style={mode==="fanvue"?activeButtonStyle:buttonStyle} onClick={()=>setMode("fanvue")}>Fanvue</button></div>
        <div className="ce-form">
          <label className="ce-label">Account<select value={account} disabled={isFanvue} onChange={e=>setAccount(e.target.value)}>{ACCOUNTS.map(x=><option key={x}>{x}</option>)}</select></label>
          {account === "Client Account" && !isFanvue && <label className="ce-label">Client account name<input value={clientAccountName} onChange={e=>setClientAccountName(e.target.value)} placeholder="e.g. Brand X" /></label>}
          <label className="ce-label">Product (optional)<input value={productName} onChange={e=>setProductName(e.target.value)} placeholder="e.g. serum, dress, coffee, gym product" /></label>
          <label className="ce-label">Platform<select value={platform} disabled={isFanvue} onChange={e=>setPlatform(e.target.value)}>{PUBLIC_PLATFORMS.map(x=><option key={x}>{x}</option>)}</select></label>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginTop:14}}>
          <label className="ce-label">Purpose<select value={purpose} onChange={e=>setPurpose(e.target.value)}>{purposes.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label>
          <label className="ce-label">Your idea seed<input value={seed} onChange={e=>setSeed(e.target.value)} placeholder="One thought, reference or moment" /></label>
          <label className="ce-label">Human context / known details<textarea value={humanContext} onChange={e=>setHumanContext(e.target.value)} placeholder="Real context I can safely use: setting, routine, opinion, event, customer insight, product use fact…" /></label>
          <label className="ce-label">Product facts / proof<textarea value={productFacts} onChange={e=>setProductFacts(e.target.value)} placeholder="Only claims or facts I know are true." /></label>
          <label className="ce-label">Never say / never show<textarea value={avoid} onChange={e=>setAvoid(e.target.value)} placeholder="Claims, phrases, visual treatments or topics to avoid." /></label>
        </div>
        <div style={{marginTop:14}}><div className="ce-label">People</div><div className="ce-grid">{PEOPLE.map(p=><button key={p.id} className={`ce-chip${people.includes(p.id)?" on":""}`} onClick={()=>toggle(setPeople,p.id)}><b>{p.name}</b><span>{p.note}</span></button>)}</div></div>
        <div style={{marginTop:14}}><div className="ce-label">Optional creative direction</div><div className="ce-grid">{[...HOOKS.map(x=>`Hook: ${x}`),...ANGLES.map(x=>`Angle: ${x}`),...FORMATS.map(x=>`Format: ${x}`)].map(x=><button key={x} className="ce-chip" onClick={()=>{if(x.startsWith("Hook:"))toggle(setHookIds,x.slice(6)); else if(x.startsWith("Angle:"))toggle(setAngleIds,x.slice(7)); else toggle(setFormatIds,x.slice(8));}}><b>{x}</b><span>Optional. Let the director override when a better idea exists.</span></button>)}</div></div>
        <div className="ce-actions"><button className="btn btn-amber" onClick={generateHypotheses} disabled={busy}>{busy?"Thinking…":"Generate 6 human-first hypotheses"}</button><button className="btn btn-dim" onClick={()=>{setHypotheses([]);setTestSet([]);setPreferredId(null);}}>Reset hypotheses</button></div>
      </section>

      {message && <section className="ce-card" style={cardStyle}><div className="ce-sub" style={{color:"#D4AF37"}}>{message}</div></section>}

      {hypotheses.length === 6 && <section className="ce-card" style={{...cardStyle,gridColumn:"1 / -1"}}>
        <div className="ce-section"><div><div className="ce-title">Six hypotheses</div><div className="ce-sub">These are six actual experiments, not six slogans. A preferred choice only flags emphasis; it does not discard the others.</div></div><button className="btn btn-amber" onClick={generateAllSix} disabled={batchBusy}>{batchBusy?"Generating 6…":"Generate all 6 media tests"}</button></div>
        <div className="ce-grid" style={{marginTop:14}}>{hypotheses.map((h,i)=><article key={h.id||i} className={`ce-card ${preferredId===h.id?"ce-selected":""}`} style={{...cardStyle,borderColor:preferredId===h.id?"#D4AF37":"#262A3C"}}><div className="ce-row-meta">TEST {i+1} · {h.mechanism}</div><div className="ce-title" style={{fontSize:18}}>{h.title}</div><div className="ce-row-meta" style={{marginTop:6}}>{h.creator} · {h.format} · {h.angle}</div><p className="ce-row-meta" style={{marginTop:10,color:"#d8dbe6"}}><strong>Hook:</strong> {h.hook}</p><p className="ce-row-meta" style={{marginTop:6}}><strong>Scene:</strong> {h.scene}</p><p className="ce-row-meta" style={{marginTop:6}}><strong>Why it feels human:</strong> {h.why_it_feels_human}</p><p className="ce-row-meta" style={{marginTop:6,color:"#9aa0b6"}}><strong>Slop risk:</strong> {cleanList(h.slop_risks).join(" · ") || "Low"}</p><div className="ce-actions" style={{marginTop:12}}><button className="btn btn-dim" onClick={()=>setPreferredId(h.id)}>Flag preferred</button><button className="btn btn-dim" onClick={()=>buildSingle(i)} disabled={batchBusy}>Generate this test</button></div></article>)}</div>
      </section>}

      {testSet.length > 0 && <section className="ce-card" style={{...cardStyle,gridColumn:"1 / -1"}}><div className="ce-section"><div><div className="ce-title">Test set</div><div className="ce-sub">All six remain in the system. Each has media, a caption and a saved production record.</div></div><div className="ce-badge ce-measuring">{testSet.filter(Boolean).filter(x=>x.status==="image_ready").length}/6 ready</div></div><div className="ce-list">{testSet.filter(Boolean).map((t,i)=><div className="ce-row" key={t?.index ?? i}><div className="ce-row-main"><div className="ce-row-title">Test {(t?.index ?? i)+1} · {t?.hypothesis?.title}</div><div className="ce-row-meta">{t?.hypothesis?.creator} · {t?.hypothesis?.format} · {t?.hypothesis?.angle} · {t?.status || "queued"}</div>{t?.error&&<div className="ce-row-meta" style={{color:"#ff7b7b"}}>{t.error}</div>}{t?.production?.humanityScore!=null&&<div className="ce-row-meta" style={{color:"#D4AF37"}}>Humanity score: {t.production.humanityScore}/100</div>}</div><div className="ce-row-actions"><button className="btn btn-dim" onClick={()=>{const u=t?.production?.caption||""; navigator.clipboard?.writeText(u); setMessage(`Caption copied for Test ${(t?.index ?? i)+1}.`);}}>Copy caption</button>{t?.imageUrl&&<a className="btn btn-dim" href={t.imageUrl} target="_blank" rel="noreferrer">Open media</a>}<button className="btn btn-dim" onClick={()=>buildSingle(t?.index ?? i)} disabled={t?.status==="image_ready"||batchBusy}>{t?.status==="image_ready"?"Ready":"Retry"}</button></div></div>)}</div></section>}

      <section className="ce-card" style={{...cardStyle,gridColumn:"1 / -1"}}><div className="ce-title">Saved creative</div><div className="ce-sub">The existing content queue remains the operational source of truth.</div><div className="ce-list" style={{marginTop:12}}>{saved.slice(0,20).map(row=><div className="ce-row" key={row.id}><div className="ce-row-main"><div className="ce-row-title">{row.content_label}</div><div className="ce-row-meta">{row.persona_name} · {row.platform} · {row.post_type} · {row.status}</div></div><button className="btn btn-dim" onClick={()=>{navigator.clipboard?.writeText(row.caption||"");setMessage("Saved caption copied.");}}>Copy caption</button></div>)}{saved.length===0&&<div className="ce-empty">No saved Creative Engine posts yet.</div>}</div></section>
    </div>
  );
}
