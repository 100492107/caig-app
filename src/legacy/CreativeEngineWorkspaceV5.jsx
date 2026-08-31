import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./creativeWorkspace.css";

const STORAGE_KEY = "caig_creative_engine_v5";
const PEOPLE = [
  { id: "cara", name: "Cara", note: "Direct, dry, disciplined, British" },
  { id: "lila", name: "Lila", note: "Measured, warm, observant, understated" },
  { id: "cara_lila", name: "Cara + Lila", note: "Contrast, chemistry, shared moments" },
];
const PUBLIC_PLATFORMS = ["Instagram Reels", "TikTok", "Facebook Reels", "YouTube Shorts", "Instagram", "Facebook", "YouTube"];
const PUBLIC_PURPOSES = [["show", "Show / model"], ["filler", "Lifestyle / filler"], ["reach", "Reach"], ["engagement", "Engagement"], ["story", "Story"], ["discovery", "Product discovery"], ["conversion", "Conversion"], ["proof", "Proof"]];
const FANVUE_PURPOSES = [["personal", "Personal post"], ["photo_set", "Photo set"], ["personality", "Personality"], ["interaction", "Interaction"], ["tease", "Tease"], ["behind", "Behind the scenes"]];
const HOOKS = ["Curiosity", "Specific claim", "Contrast", "Disagreement", "Real question", "Number", "Confession", "Visual reveal"];
const ANGLES = ["Real life", "Proof", "Routine", "Comparison", "Banter", "Aspiration", "Observation", "Transformation"];
const FORMATS = ["Single image", "Carousel", "Hook-led Reel", "UGC demo", "Duo conversation", "Photo story"];
const ACCOUNTS = ["Cara & Lila", "Cornerstone AI Group", "Client Account"];
const DISCLOSURE = "Cara is the dedicated demonstration model of Cornerstone AI Assets. Every client asset maps onto private, unique reference weights — ensuring their content remains consistently them, not us.";
const HUMAN_RULES = [
  "Lead with a specific observation, moment, opinion, tension, question, joke, or useful detail; never with a generic content formula.",
  "Use concrete nouns and sensory details: an actual setting, object, time cue, action, texture, sound, weather, routine, or visual behaviour when appropriate.",
  "Do not invent personal experience, product usage, results, conversations, testimonials, locations, measurements, or claims that were not supplied or supported.",
  "Avoid empty phrases such as 'game changer', 'obsessed', 'elevate your', 'unlock' or 'this is everything' unless the concept genuinely requires them.",
  "Avoid generic influencer staging: perfect showroom poses, fake surprise, symmetrical product placement and needless cinematic slow motion.",
  "Prefer natural behaviour, ordinary environments, believable wardrobe choices and small contextual details.",
  "The visual should feel like a real moment that happened to be worth filming, not an advert brief pretending to be a post.",
  "Captions should sound like a person with a point of view, with natural sentence length and some understatement.",
  "Every test needs a distinct psychological mechanism. Do not create six copies with different adjectives.",
  "Premium does not mean sterile. Keep polish in the craft, not in the personality.",
];

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("AI returned invalid JSON");
}
function safeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === "") return [];
  if (typeof value === "string") return [value];
  return [JSON.stringify(value)];
}
function safeJoin(value, separator = " · ") { return safeList(value).join(separator); }
function newId() { return crypto?.randomUUID?.() || `ce_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function creatorId(name) { const s = String(name || "").toLowerCase(); return s.includes("cara + lila") || s.includes("cara and lila") ? "cara_lila" : s.includes("lila") ? "lila" : "cara"; }
async function gemini(system, user, maxTokens = 6000) {
  const r = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, user, maxTokens }) });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || "AI request failed");
  return d.text;
}

const defaults = {
  mode: "public", people: ["cara_lila"], account: "Cara & Lila", clientAccountName: "", productName: "", productUrl: "", platform: "Instagram Reels", purpose: "filler", hookIds: [], angleIds: [], formatIds: [], humanContext: "", productFacts: "", avoid: "", seed: "", hypotheses: [], testSet: [], preferredId: null, message: ""
};
function readState() {
  try { return { ...defaults, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")) }; } catch { return { ...defaults }; }
}

export default function CreativeEngineWorkspaceV5() {
  const [state, setState] = useState(readState);
  const { mode, people, account, clientAccountName, productName, productUrl, platform, purpose, hookIds, angleIds, formatIds, humanContext, productFacts, avoid, seed, hypotheses, testSet, preferredId } = state;
  const [busy, setBusy] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [saved, setSaved] = useState([]);
  const isFanvue = mode === "fanvue";
  const purposes = isFanvue ? FANVUE_PURPOSES : PUBLIC_PURPOSES;
  const destination = isFanvue ? "Fanvue Page" : account === "Client Account" ? (clientAccountName.trim() || "Client Account") : account;
  const platformValue = isFanvue ? "fv_page" : platform;

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }, [state]);
  useEffect(() => { loadSaved(); }, []);
  useEffect(() => { if (isFanvue) setState(s => ({ ...s, platform: "Fanvue Page", purpose: "personal", people: s.people.length ? s.people : ["cara"] })); }, [isFanvue]);

  function patch(values) { setState(s => ({ ...s, ...values })); }
  async function loadSaved() {
    const { data } = await supabase.from("content_queue").select("id,persona_name,platform,status,caption,image_url,image_urls,video_url,created_at,content_label,post_type,hook,cta,notes").like("content_label", "%Creative Engine%").order("created_at", { ascending: false }).limit(100);
    if (data) setSaved(data);
  }
  function toggle(key, value) { patch({ [key]: state[key].includes(value) ? state[key].filter(x => x !== value) : [...state[key], value] }); }

  async function generateHypotheses() {
    setBusy(true); patch({ hypotheses: [], testSet: [], preferredId: null, message: `Building six human-first ${isFanvue ? "Fanvue" : "creative"} hypotheses…` });
    try {
      const peopleLabel = people.map(id => PEOPLE.find(p => p.id === id)?.name).join(", ");
      const purposeLabel = purposes.find(x => x[0] === purpose)?.[1] || purpose;
      const system = `You are the creative director of a premium creator studio. The goal is authored, specific, socially native creative rather than AI-looking content. Build six distinct hypotheses.\n\nANTI-SLOP:\n${HUMAN_RULES.map((r,i)=>`${i+1}. ${r}`).join("\n")}\n\n${isFanvue ? "Fanvue mode: favour intimacy, personality, routines, specific thoughts and subscriber value. Keep it non-explicit." : "Public mode: optimise for attention and personality without generic creator-speak."}\nCara: direct, dry, disciplined, British. Lila: measured, warm, observant, understated. Cara + Lila: contrast, chemistry and natural interaction. Return JSON only.`;
      const user = `MODE: ${isFanvue ? "FANVUE" : "PUBLIC"}\nDESTINATION: ${destination}\nPEOPLE: ${peopleLabel}\nPRODUCT: ${productName || "None"}\nPLATFORM: ${platformValue}\nPURPOSE: ${purposeLabel}\nPREFERRED HOOKS: ${hookIds.join(", ") || "Let the director choose"}\nPREFERRED ANGLES: ${angleIds.join(", ") || "Let the director choose"}\nPREFERRED FORMATS: ${formatIds.join(", ") || "Let the director choose"}\nHUMAN CONTEXT: ${humanContext || "None"}\nPRODUCT FACTS: ${productFacts || "None"}\nAVOID: ${avoid || "None"}\nIDEA SEED: ${seed || "None"}\n\nReturn exactly {"hypotheses":[...]} with 6 objects. Each object: id,title,hook,angle,format,creator,mechanism,scene,why_it_feels_human,visual_language,caption_direction,cta,variation_prompt,slop_risks. At least 4 mechanisms must be materially different. Do not fabricate claims, testimonials or personal experiences.`;
      const out = parseJson(await gemini(system, user));
      const hs = Array.isArray(out.hypotheses) ? out.hypotheses.slice(0, 6) : [];
      if (hs.length !== 6) throw new Error(`AI returned ${hs.length} hypotheses; 6 are required.`);
      patch({ hypotheses: hs, testSet: [], message: "Six hypotheses ready. All six remain active; a preferred choice only flags emphasis." });
    } catch (e) { patch({ message: e.message }); } finally { setBusy(false); }
  }

  async function buildProduction(h) {
    const personaRule = isFanvue ? `Fanvue mode. Keep it non-explicit and subscriber-focused. If Cara appears, append exactly: ${DISCLOSURE}` : "Do not mention AI unless disclosure is explicitly required.";
    const system = `You are the production director and human editor for a premium creator studio. Turn an approved hypothesis into a complete production brief. Apply the anti-slop gate:\n${HUMAN_RULES.map((r,i)=>`${i+1}. ${r}`).join("\n")}\n\nNo generic hooks, fake personal claims, empty CTAs or polished ad language where a normal person would be simpler. ${personaRule} Return JSON only.`;
    const user = `HYPOTHESIS\n${JSON.stringify(h)}\n\nCONTEXT\nDestination: ${destination}\nProduct: ${productName || "None"}\nProduct facts: ${productFacts || "None"}\nPlatform: ${platformValue}\nPurpose: ${purposes.find(x=>x[0]===purpose)?.[1] || purpose}\nHuman context: ${humanContext || "None"}\nAvoid: ${avoid || "None"}\n\nReturn {hook,caption,hashtags,cta,postFormat,photoIdea,imagePrompt,slides,reelDirection,humanityScore,slopChecks}. humanityScore is 0-100. The visual brief must include believable environment, posture, wardrobe, camera behaviour, lighting and small imperfections.`;
    const production = parseJson(await gemini(system, user, 5000));
    const audit = parseJson(await gemini("You are the final human editor. Catch synthetic, generic, over-polished or fabricated creative. Score specificity, point of view, believable behaviour, natural language, visual realism and factual honesty. Rewrite material issues. Return JSON only.", `DRAFT\n${JSON.stringify(production)}\n\nCONTEXT\n${JSON.stringify({ destination, productName, productFacts, humanContext, avoid })}\n\nReturn {pass,score,issues,revised}.`, 4500));
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
    return `${imagePrompt || photoIdea || "A candid social photograph"}. ${personNames}. Premium real-life editorial/social photography, not an advertisement. Natural skin texture, believable hands, normal proportions, subtle asymmetry, realistic hair strands, ordinary wardrobe details, lived-in environment, mixed or imperfect natural light, plausible phone-camera or handheld composition, slightly imperfect framing, authentic posture and eye lines, realistic depth of field, no plastic skin, no beauty-filter smoothing, no exaggerated smile, no model-pose stiffness, no floating objects, no duplicate limbs, no generic studio backdrop unless explicitly required. Make it feel like a real moment that happened to be photographed.`;
  }
  async function generateMedia(item) {
    const production = item.production;
    const slides = production.postFormat === "carousel" && Array.isArray(production.slides) && production.slides.length ? production.slides : [{ imagePrompt: production.imagePrompt, photoIdea: production.photoIdea }];
    const personaId = creatorId(item.hypothesis.creator);
    const urls = [];
    for (const slide of slides) {
      const sr = await fetch("/api/generate-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imagePrompt: premiumImagePrompt({ imagePrompt: slide.imagePrompt, photoIdea: slide.photoIdea, creator: item.hypothesis.creator }), photo_idea: slide.photoIdea, hook: production.hook, caption: production.caption, photoDirection: production.reelDirection, personaId, seed: Math.floor(Math.random() * 9999999) }) });
      const sd = await sr.json(); if (!sr.ok) throw new Error(sd?.detail || sd?.error || "Image submit failed");
      urls.push(await poll(sd.requestId, sd.statusUrl, sd.resultUrl, "image"));
    }
    const id = newId();
    const row = { id, persona_id: personaId, persona_name: item.hypothesis.creator || "Cara & Lila", platform: platformValue, status: "draft", pillar: purpose, hook: production.hook || "", caption: production.caption || "", hashtags: production.hashtags || "", cta: production.cta || null, photo_direction: production.reelDirection || production.photoIdea || null, photo_idea: production.photoIdea || null, post_type: production.postFormat || "single_photo", content_label: `${destination} · Creative Engine · Test ${item.index + 1}`, image_prompt: production.imagePrompt ? JSON.stringify(production.imagePrompt) : null, image_url: urls[0] || null, image_urls: urls.length > 1 ? urls : null, video_url: null, scheduled_date: new Date().toISOString().slice(0,10), scheduled_time: new Date().toTimeString().slice(0,5), notes: JSON.stringify({ hypothesis: item.hypothesis, humanityScore: production.humanityScore || null, humanityAudit: production.humanityAudit || null }) };
    const { error } = await supabase.from("content_queue").upsert(row, { onConflict: "id" }); if (error) throw new Error(`Could not save Test ${item.index + 1}: ${error.message}`);
    return { ...item, id, imageUrls: urls, imageUrl: urls[0], status: "image_ready" };
  }
  async function buildSingle(index) {
    const h = hypotheses[index]; if (!h || batchBusy) return;
    patch({ testSet: hypotheses.map((x,i) => testSet[i] || { index: i, hypothesis: x, status: "queued" }), message: `Generating Test ${index + 1}…` });
    const working = { index, hypothesis: h, status: "briefing" };
    patch({ testSet: hypotheses.map((x,i) => i === index ? working : (testSet[i] || { index: i, hypothesis: x, status: "queued" })) });
    try {
      const production = await buildProduction(h);
      patch({ testSet: JSON.parse(JSON.stringify(hypotheses.map((x,i) => i === index ? { ...working, production, status: "generating" } : (testSet[i] || { index: i, hypothesis: x, status: "queued" })))) });
      const result = await generateMedia({ index, hypothesis: h, production });
      patch({ testSet: hypotheses.map((x,i) => i === index ? result : (testSet[i] || { index: i, hypothesis: x, status: "queued" })), message: `Test ${index + 1} is ready and saved.` });
      await loadSaved();
    } catch (e) {
      patch({ testSet: hypotheses.map((x,i) => i === index ? { ...working, status: "error", error: e.message } : (testSet[i] || { index: i, hypothesis: x, status: "queued" })), message: `Test ${index + 1} failed: ${e.message}` });
    }
  }
  async function generateAllSix() {
    if (hypotheses.length !== 6 || batchBusy) return;
    setBatchBusy(true); patch({ testSet: hypotheses.map((h,index) => ({ index, hypothesis: h, status: "queued" })), message: "Building all six creative tests. No hypothesis is being discarded." });
    try { for (let i=0;i<6;i++) await buildSingle(i); patch({ message: "All six tests are generated, saved and ready for review." }); } finally { setBatchBusy(false); }
  }

  return <div className="ce-shell">
    <section className="ce-card">
      <div className="ce-section"><div><div className="ce-title">Creative Engine · Human-First Mode</div><div className="ce-sub">Brief → six hypotheses → human audit → produce all six → publish → measure → learn.</div></div><div className="ce-badge ce-measuring">AI for speed · human judgement for quality</div></div>
      <div className="ce-callout"><strong>Anti-slop rule:</strong> I would rather publish fewer pieces with a real point of view than flood an account with polished filler. Every concept must have a reason to exist, concrete detail and believable behaviour.</div>
      <div className="ce-actions"><button className={mode === "public" ? "btn btn-amber" : "btn btn-dim"} onClick={() => patch({mode:"public"})}>Public Social</button><button className={mode === "fanvue" ? "btn btn-amber" : "btn btn-dim"} onClick={() => patch({mode:"fanvue"})}>Fanvue</button></div>
      <div className="ce-form">
        <label className="ce-label">Account<select value={account} disabled={isFanvue} onChange={e=>patch({account:e.target.value})}>{ACCOUNTS.map(x=><option key={x}>{x}</option>)}</select></label>
        {account === "Client Account" && !isFanvue && <label className="ce-label">Client account name<input value={clientAccountName} onChange={e=>patch({clientAccountName:e.target.value})} placeholder="e.g. Brand X" /></label>}
        <label className="ce-label">Product (optional)<input value={productName} onChange={e=>patch({productName:e.target.value})} placeholder="e.g. serum, dress, coffee, gym product" /></label>
        <label className="ce-label">Platform<select value={isFanvue ? "Fanvue Page" : platform} disabled={isFanvue} onChange={e=>patch({platform:e.target.value})}>{PUBLIC_PLATFORMS.map(x=><option key={x}>{x}</option>)}</select></label>
      </div>
      <div className="ce-form">
        <label className="ce-label">Purpose<select value={purpose} onChange={e=>patch({purpose:e.target.value})}>{purposes.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label>
        <label className="ce-label">Your idea seed<input value={seed} onChange={e=>patch({seed:e.target.value})} placeholder="One thought, reference or moment" /></label>
        <label className="ce-label">Human context / known details<textarea value={humanContext} onChange={e=>patch({humanContext:e.target.value})} placeholder="Setting, routine, opinion, event, customer insight, product use fact…" /></label>
        <label className="ce-label">Product facts / proof<textarea value={productFacts} onChange={e=>patch({productFacts:e.target.value})} placeholder="Only claims or facts I know are true." /></label>
      </div>
      <label className="ce-label" style={{marginTop:14}}>Never say / never show<textarea value={avoid} onChange={e=>patch({avoid:e.target.value})} placeholder="Claims, phrases, visual treatments or topics to avoid." /></label>
      <div style={{marginTop:14}}><div className="ce-label">People</div><div className="ce-grid">{PEOPLE.map(p=><button key={p.id} className={`ce-chip${people.includes(p.id)?" on":""}`} onClick={()=>toggle("people",p.id)}><b>{p.name}</b><span>{p.note}</span></button>)}</div></div>
      <div style={{marginTop:14}}><div className="ce-label">Optional creative direction</div><div className="ce-grid">{[...HOOKS.map(x=>["hookIds",x]),...ANGLES.map(x=>["angleIds",x]),...FORMATS.map(x=>["formatIds",x])].map(([key,x])=><button key={`${key}-${x}`} className={`ce-chip${state[key].includes(x)?" on":""}`} onClick={()=>toggle(key,x)}><b>{x}</b><span>Optional. Let the director override when a better idea exists.</span></button>)}</div></div>
      <div className="ce-actions"><button className="btn btn-amber" onClick={generateHypotheses} disabled={busy}>{busy ? "Thinking…" : "Generate 6 human-first hypotheses"}</button><button className="btn btn-dim" onClick={()=>patch({hypotheses:[],testSet:[],preferredId:null,message:"Workspace reset."})}>Reset hypotheses</button></div>
    </section>

    {state.message && <section className="ce-card"><div className="ce-sub" style={{color:"#D4AF37"}}>{state.message}</div></section>}
    {hypotheses.length === 6 && <section className="ce-card"><div className="ce-section"><div><div className="ce-title">Six hypotheses</div><div className="ce-sub">Six actual experiments. A preferred choice flags emphasis; it does not discard the others.</div></div><button className="btn btn-amber" onClick={generateAllSix} disabled={batchBusy}>{batchBusy ? "Generating 6…" : "Generate all 6 media tests"}</button></div><div className="ce-grid">{hypotheses.map((h,i)=><article key={h.id || i} className={`ce-card ${preferredId===h.id ? "ce-selected" : ""}`}><div className="ce-row-meta">TEST {i+1} · {h.mechanism || ""}</div><div className="ce-title" style={{fontSize:18}}>{h.title}</div><div className="ce-row-meta">{h.creator} · {h.format} · {h.angle}</div><p className="ce-row-meta"><strong>Hook:</strong> {h.hook}</p><p className="ce-row-meta"><strong>Scene:</strong> {h.scene}</p><p className="ce-row-meta"><strong>Why it feels human:</strong> {h.why_it_feels_human}</p><p className="ce-row-meta"><strong>Slop risk:</strong> {safeJoin(h.slop_risks) || "Low"}</p><div className="ce-actions"><button className="btn btn-dim" onClick={()=>patch({preferredId:h.id})}>Flag preferred</button><button className="btn btn-dim" onClick={()=>buildSingle(i)} disabled={batchBusy}>{testSet[i]?.status === "image_ready" ? "Ready" : "Generate this test"}</button></div></article>)}</div></section>}

    {testSet.length > 0 && <section className="ce-card"><div className="ce-section"><div><div className="ce-title">Test set</div><div className="ce-sub">All six remain in the workspace. Generated media and production records persist when I change tabs or return later.</div></div><div className="ce-badge ce-measuring">{testSet.filter(x=>x?.status === "image_ready").length}/6 ready</div></div><div className="ce-list">{testSet.map((t,i)=><div className="ce-row" key={i}><div className="ce-row-main"><div className="ce-row-title">Test {i+1} · {t?.hypothesis?.title || hypotheses[i]?.title || "Untitled"}</div><div className="ce-row-meta">{t?.hypothesis?.creator || hypotheses[i]?.creator || ""} · {t?.hypothesis?.format || hypotheses[i]?.format || ""} · {t?.status || "queued"}</div>{t?.error && <div className="ce-row-meta" style={{color:"#ff7b7b"}}>{t.error}</div>}{t?.production?.humanityScore != null && <div className="ce-row-meta" style={{color:"#D4AF37"}}>Humanity score: {t.production.humanityScore}/100</div>}</div><div className="ce-row-actions"><button className="btn btn-dim" onClick={()=>navigator.clipboard?.writeText(t?.production?.caption || "")}>Copy caption</button>{t?.imageUrl && <a className="btn btn-dim" href={t.imageUrl} target="_blank" rel="noreferrer">Open media</a>}<button className="btn btn-dim" onClick={()=>buildSingle(i)} disabled={t?.status === "image_ready" || batchBusy}>{t?.status === "image_ready" ? "Ready" : "Retry"}</button></div></div>)}</div></section>}

    <section className="ce-card"><div className="ce-title">Saved creative</div><div className="ce-sub">The existing content queue remains the operational source of truth.</div><div className="ce-list">{saved.map(row=><div className="ce-row" key={row.id}><div className="ce-row-main"><div className="ce-row-title">{row.content_label}</div><div className="ce-row-meta">{row.persona_name} · {row.platform} · {row.post_type} · {row.status}</div></div><button className="btn btn-dim" onClick={()=>navigator.clipboard?.writeText(row.caption || "")}>Copy caption</button></div>)}{saved.length===0&&<div className="ce-empty">No saved Creative Engine posts yet.</div>}</div></section>
  </div>;
}
