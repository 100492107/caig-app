import React, { useState } from "react";
import { supabase } from "./supabase";

const PEOPLE = [
  { id: "cara", name: "Cara" },
  { id: "lila", name: "Lila" },
  { id: "cara_lila", name: "Cara + Lila" },
];

const STRUCTURES = [
  ["pain", "Pain funnel", "Specific pain → relatable escalation → soft solution → proof → CTA"],
  ["swap", "Swap / list", "Useful list or swaps people will save and revisit"],
  ["identity", "Identity / aspiration", "Make the viewer feel seen or show the person they want to become"],
  ["quick", "Quick hit", "2–3 decisive slides built around urgency, novelty or a visual payoff"],
  ["story", "Story / conflict", "Third-person tension, doubt, reveal or change of mind"],
  ["proof", "Proof / comparison", "Specific evidence, contrast or before/after without fabricated claims"],
];

const HUMAN_RULES = [
  "The post needs a reason to exist beyond selling the product.",
  "Slide 1 must create a clear reason to swipe; the image matters as much as the words.",
  "Every slide needs its own micro-hook or open loop, not just numbered filler.",
  "Use concrete observations, specific scenes and ordinary human behaviour.",
  "Never invent testimonials, results, private experiences or facts that were not supplied.",
  "Do not make every image look like a polished ad. Mix real-looking moments, close details and product-context frames.",
  "Keep text short enough to read immediately but specific enough to be worth reading.",
  "The final slide may carry the product or CTA; do not front-load the sale unless urgency genuinely is the story.",
  "For TikTok Photo Mode, prefer native TikTok text treatment. Generate clean visuals and export the slide copy separately for final in-app text.",
];

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("Gemini returned invalid JSON");
}

async function gemini(system, user, maxTokens = 6500) {
  const r = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user, maxTokens }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error || "Gemini request failed");
  return d.text;
}

function creatorId(name) {
  const s = String(name || "").toLowerCase();
  if (s.includes("cara + lila") || s.includes("cara and lila")) return "cara_lila";
  if (s.includes("lila")) return "lila";
  return "cara";
}

async function poll(requestId, statusUrl, resultUrl) {
  const deadline = Date.now() + 3 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4500));
    const r = await fetch("/api/generate-poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, type: "image", status_url: statusUrl, result_url: resultUrl }),
    });
    const d = await r.json();
    if (d.status === "COMPLETED") return d.imageUrl || d.url;
    if (d.status === "FAILED") throw new Error(d.error || "Image generation failed");
  }
  throw new Error("Image generation timed out");
}

export default function TikTokSlideshowStudio() {
  const [people, setPeople] = useState("cara_lila");
  const [product, setProduct] = useState("");
  const [humanContext, setHumanContext] = useState("");
  const [facts, setFacts] = useState("");
  const [structure, setStructure] = useState("story");
  const [seed, setSeed] = useState("");
  const [hypotheses, setHypotheses] = useState([]);
  const [sets, setSets] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const togglePeople = value => setPeople(prev => prev === value ? "" : value);

  async function createHypotheses() {
    setBusy(true); setMessage("Building six slideshow hypotheses…"); setHypotheses([]); setSets([]);
    try {
      const person = PEOPLE.find(p => p.id === people)?.name || "Creator";
      const preferredStructure = STRUCTURES.find(s => s[0] === structure)?.[1] || structure;
      const system = `You are the senior TikTok creative director for Cornerstone AI Assets. We use TikTok Photo Mode as a deliberate distribution format, not as lazy filler. The goal is to produce premium, human-feeling slideshows that interrupt scrolling through a strong visual and a reason to swipe.\n\nRULES:\n${HUMAN_RULES.map((x,i)=>`${i+1}. ${x}`).join("\n")}\n\nDo not claim that any specific ranking signal guarantees virality. Treat these as creative hypotheses to test. Keep the creator's personality visible through behaviour and specific observation. Return JSON only.`;
      const user = `CREATOR: ${person}\nPRODUCT: ${product || "None"}\nHUMAN CONTEXT: ${humanContext || "None"}\nPRODUCT FACTS: ${facts || "None"}\nPREFERRED STRUCTURE: ${preferredStructure}\nIDEA SEED: ${seed || "None"}\n\nReturn exactly {"hypotheses":[...]} with 6 objects. Each object: id,title,structure,hook,psychological_mechanism,why_it_feels_human,slides,caption,cta. slides must contain 5-7 objects with slideNumber,text,imageConcept,microHook. Slide 1 must be a scroll-stopper. Slides 2 onward must each earn the next swipe. The final slide should be a natural payoff, CTA or curiosity continuation. Make the six hypotheses materially different: conflict, useful information, identity, story, visual reveal, and proof/comparison where appropriate. Avoid generic influencer language.`;
      const out = parseJson(await gemini(system, user));
      const hs = Array.isArray(out.hypotheses) ? out.hypotheses.slice(0, 6) : [];
      setHypotheses(hs);
      setMessage(`${hs.length} slideshow hypotheses ready. All six remain active.`);
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }

  async function generateSet(index) {
    const h = hypotheses[index];
    if (!h) return;
    setSets(prev => { const next=[...prev]; next[index]={index,h,status:"generating",images:[]}; return next; });
    try {
      const personaId = creatorId(h.creator || PEOPLE.find(p=>p.id===people)?.name);
      const images = [];
      for (const slide of h.slides || []) {
        const prompt = `Premium social-first photograph for a TikTok Photo Mode slideshow. Creator: ${h.creator || PEOPLE.find(p=>p.id===people)?.name}. Product: ${product || "none"}. Slide ${slide.slideNumber}.\n\nSCENE: ${slide.imageConcept}\n\nHUMAN REALISM: candid-but-intentional framing, believable body language, natural skin and hands, realistic fabric, ordinary environment details, subtle asymmetry, imperfect practical lighting, believable phone/camera perspective, no catalogue pose, no plastic beauty treatment, no generic influencer studio, no text baked into the image. The image must support the specific slide idea rather than merely look pretty.`;
        const r = await fetch("/api/generate-submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagePrompt: prompt, photo_idea: slide.imageConcept, hook: slide.microHook, caption: h.caption, personaId, seed: Math.floor(Math.random()*9999999) }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d?.detail || d?.error || "Image submit failed");
        images.push(await poll(d.requestId, d.statusUrl, d.resultUrl));
      }

      const id = (crypto?.randomUUID?.() || `slide_${Date.now()}_${index}`);
      const slideCopy = (h.slides || []).map(s => `SLIDE ${s.slideNumber}: ${s.text}`).join("\n");
      const { error } = await supabase.from("content_queue").upsert({
        id,
        persona_id: personaId,
        persona_name: h.creator || PEOPLE.find(p=>p.id===people)?.name || "Cara + Lila",
        platform: "TikTok Photo Mode",
        status: "draft",
        pillar: "tiktok_slideshow",
        hook: h.hook || h.slides?.[0]?.text || "",
        caption: h.caption || "",
        cta: h.cta || null,
        photo_direction: JSON.stringify({ structure: h.structure, mechanism: h.psychological_mechanism, slideCopy }),
        photo_idea: h.slides?.[0]?.imageConcept || null,
        post_type: "carousel",
        content_label: `TikTok Slideshow · Hypothesis ${index + 1}`,
        image_url: images[0] || null,
        image_urls: images,
        created_at: new Date().toISOString(),
        scheduled_date: new Date().toISOString().slice(0,10),
        scheduled_time: new Date().toTimeString().slice(0,5),
      }, { onConflict: "id" });
      if (error) throw new Error(`Could not save slideshow: ${error.message}`);
      setSets(prev => { const next=[...prev]; next[index]={index,h,status:"ready",images,id}; return next; });
      setMessage(`Slideshow ${index + 1} generated and saved.`);
    } catch (e) {
      setSets(prev => { const next=[...prev]; next[index]={index,h,status:"error",error:e.message}; return next; });
    }
  }

  async function generateAll() {
    if (hypotheses.length !== 6 || busy) return;
    setBusy(true); setMessage("Generating all six slideshow tests. This may take a while…");
    try {
      for (let i=0;i<6;i++) {
        await generateSet(i);
        setMessage(`Slideshow test progress: ${i+1}/6`);
      }
      setMessage("All six slideshow tests are generated and saved.");
    } finally { setBusy(false); }
  }

  return <div style={{minHeight:"100vh",background:"#08070D",color:"#A1A5B7",fontFamily:"Inter,system-ui,sans-serif",padding:24}}>
    <div style={{maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:20,flexWrap:"wrap",alignItems:"flex-end",marginBottom:22}}>
        <div><div style={{fontSize:12,fontWeight:800,letterSpacing:3,color:"#D4AF37"}}>TIKTOK PHOTO MODE</div><h1 style={{fontSize:"clamp(28px,5vw,48px)",margin:"8px 0",color:"#fff"}}>The Slideshow Studio</h1><p style={{maxWidth:720,lineHeight:1.65}}>I am treating the slideshow as its own creative weapon: a swipeable story, useful reference, identity mirror or visual reveal — not a repackaged Reel.</p></div>
        <div style={{padding:"10px 14px",border:"1px solid #D4AF37",borderRadius:999,color:"#D4AF37",fontSize:12,fontWeight:800}}>6 hypotheses → 6 testable sets</div>
      </div>

      <div style={{...styles.card,marginBottom:18}}>
        <div style={styles.grid}>
          <label style={styles.label}>Creator<select style={styles.input} value={people} onChange={e=>{setPeople(e.target.value)}}>{PEOPLE.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label style={styles.label}>Structure<select style={styles.input} value={structure} onChange={e=>setStructure(e.target.value)}>{STRUCTURES.map(s=><option key={s[0]} value={s[0]}>{s[1]}</option>)}</select></label>
          <label style={styles.label}>Product<input style={styles.input} value={product} onChange={e=>setProduct(e.target.value)} placeholder="Optional product" /></label>
          <label style={styles.label}>Idea seed<input style={styles.input} value={seed} onChange={e=>setSeed(e.target.value)} placeholder="Anything I specifically want to explore" /></label>
        </div>
        <div style={styles.grid2}>
          <label style={styles.label}>Human context<textarea style={styles.textarea} value={humanContext} onChange={e=>setHumanContext(e.target.value)} placeholder="Where are they? What just happened? What are they doing? Any real detail that should shape the post." /></label>
          <label style={styles.label}>Product facts / proof<textarea style={styles.textarea} value={facts} onChange={e=>setFacts(e.target.value)} placeholder="Only real facts, features, observations or customer proof. Leave blank rather than inventing." /></label>
        </div>
        <div style={{marginTop:14,padding:14,background:"#141525",borderRadius:12,fontSize:13,lineHeight:1.6}}><b style={{color:"#fff"}}>Operating rule:</b> I am not trying to make six pretty slideshows. I am testing six different reasons a stranger would stop, swipe, read, save, share or ask about the creator/product.</div>
        <button style={styles.primary} disabled={busy} onClick={createHypotheses}>{busy?"Working…":"Generate 6 slideshow hypotheses"}</button>
      </div>

      {hypotheses.length>0 && <div style={{...styles.card,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><h2 style={styles.h2}>Hypothesis board</h2><p style={styles.sub}>Every hypothesis stays alive. I can mark a favourite for emphasis, but the experiment is the set.</p></div><button style={styles.primary} disabled={busy} onClick={generateAll}>Generate all 6 media sets</button></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:12,marginTop:16}}>{hypotheses.map((h,i)=><article key={h.id||i} style={styles.hyp}><div style={{fontSize:11,fontWeight:800,color:"#D4AF37"}}>TEST {i+1} · {h.structure}</div><h3 style={{margin:"8px 0",color:"#fff"}}>{h.title}</h3><div style={{fontSize:13,lineHeight:1.55}}><b style={{color:"#fff"}}>Hook:</b> {h.hook}<br/><b style={{color:"#fff"}}>Mechanism:</b> {h.psychological_mechanism}<br/><b style={{color:"#fff"}}>Human reason:</b> {h.why_it_feels_human}</div><div style={{marginTop:12,fontSize:12,color:"#777d94"}}>{(h.slides||[]).map(s=><div key={s.slideNumber}>Slide {s.slideNumber}: {s.text}</div>)}</div></article>)}</div>
      </div>}

      {sets.length>0 && <div style={{...styles.card}}>
        <h2 style={styles.h2}>Production results</h2><p style={styles.sub}>These are saved in the normal app as drafts. For TikTok Photo Mode, I recommend adding the slide text natively in TikTok and choosing the music there.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:18,marginTop:16}}>{sets.map((s,i)=>s?.h ? <div key={i} style={styles.set}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><b style={{color:"#fff"}}>Test {i+1}</b><span style={{fontSize:11,color:s.status==="ready"?"#6ee7b7":"#D4AF37"}}>{s.status}</span></div>{s.images?.length ? <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:10}}>{s.images.map((u,j)=><img key={u} src={u} alt={`Slide ${j+1}`} style={{width:"100%",aspectRatio:"9/16",objectFit:"cover",borderRadius:8}} />)}</div> : <div style={{marginTop:12,padding:20,background:"#141525",borderRadius:10,fontSize:12}}>{s.error || "Generating…"}</div>}<div style={{marginTop:10,fontSize:12,lineHeight:1.5}}><b style={{color:"#fff"}}>Slide copy</b><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",color:"#9aa1b8"}}>{(s.h.slides||[]).map(x=>`SLIDE ${x.slideNumber}: ${x.text}`).join("\n")}</pre></div><button style={styles.secondary} onClick={()=>generateSet(i)}>Regenerate this test</button></div> : null)}</div>
      </div>}

      {message && <div style={{marginTop:16,color:"#D4AF37",fontSize:13}}>{message}</div>}
    </div>
  </div>;
}

const styles={
  card:{background:"#0E0D18",border:"1px solid #262A3C",borderRadius:16,padding:20},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14},
  grid2:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14,marginTop:14},
  label:{display:"block",fontSize:11,fontWeight:800,letterSpacing:.8,color:"#A1A5B7"},
  input:{display:"block",width:"100%",boxSizing:"border-box",marginTop:7,padding:"12px 13px",borderRadius:10,border:"1px solid #2d3246",background:"#141525",color:"#fff"},
  textarea:{display:"block",width:"100%",minHeight:110,boxSizing:"border-box",marginTop:7,padding:"12px 13px",borderRadius:10,border:"1px solid #2d3246",background:"#141525",color:"#fff",resize:"vertical"},
  primary:{marginTop:16,padding:"12px 18px",borderRadius:999,border:"1px solid #D4AF37",background:"#D4AF37",color:"#08070D",fontWeight:900,cursor:"pointer"},
  secondary:{padding:"9px 13px",borderRadius:999,border:"1px solid #2d3246",background:"#141525",color:"#fff",fontWeight:700,cursor:"pointer"},
  h2:{color:"#fff",margin:0},
  sub:{fontSize:13,lineHeight:1.5,color:"#777d94"},
  hyp:{background:"#141525",border:"1px solid #2d3246",borderRadius:14,padding:16},
  set:{background:"#0b0b12",border:"1px solid #262A3C",borderRadius:14,padding:14},
};
