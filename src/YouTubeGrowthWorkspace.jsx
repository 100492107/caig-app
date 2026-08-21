import React, { useState } from "react";
import { supabase } from "./supabase";

const GOALS = ["Grow channel", "Maximise retention", "Maximise CTR", "Build authority", "Monetise"];
const FORMATS = [
  ["business_story", "Business Story / Mini Documentary"],
  ["deep_dive", "Explainer / Deep Dive"],
  ["case_study", "Case Study / How X Happened"],
  ["list", "High-value List / Breakdown"],
  ["news_analysis", "AI / Tech News Analysis"],
  ["money", "Finance / Wealth Storytelling"],
];
const RPM_LANES = [
  ["finance", "Finance & Wealth"],
  ["tech", "Tech & AI"],
  ["business", "Business Storytelling / Mini-Docs"],
  ["other", "Other / Let Qwen Recommend"],
];

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned invalid JSON");
  const opener = clean[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0, quote = false, escaped = false;
  for (let i = start; i < clean.length; i++) {
    const c = clean[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quote = false;
    } else if (c === '"') quote = true;
    else if (c === opener) depth++;
    else if (c === closer) { depth--; if (depth === 0) return JSON.parse(clean.slice(start, i + 1)); }
  }
  throw new Error("Qwen returned incomplete JSON");
}

async function queueQwen({ title, systemPrompt, userPrompt }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title,
    job_type: "youtube_growth",
    model: "mlx-community/Qwen3-8B-4bit",
    persona_id: "youtube_system",
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    options: { max_tokens: 10000, temperature: 0.58 },
    status: "queued",
    production_status: "not_started",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function waitQwen(jobId, setMessage) {
  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3500));
    const { data, error } = await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id", jobId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Qwen job disappeared from the queue.");
    if (data.status === "completed") return data.result || "";
    if (data.status === "error") throw new Error(data.error_message || "Qwen failed.");
    setMessage(`Qwen is building the YouTube package… ${data.status}`);
  }
  throw new Error("Qwen timed out. Make sure the local Qwen worker is running.");
}

const systemPrompt = `You are the senior YouTube growth strategist, documentary scriptwriter, retention editor, SEO strategist, thumbnail strategist and AI visual director inside CornerstoneAIAssets.

You are not a generic AI copywriter. You understand long-form YouTube growth as a system: topic selection → demand → title/thumbnail promise → first-5-second hook → narrative tension → curiosity loops → visual pacing → payoff → next-video behaviour.

SOURCE PRINCIPLES TO APPLY:
- Prefer high-value lanes such as finance & wealth, tech & AI, and business storytelling / mini-documentaries when the user's chosen niche supports them.
- Do not rely on generic AI scripts. Start with the strongest conflict, revelation or surprising fact. No 'welcome back'.
- Build a curiosity loop roughly every 30–60 seconds. Each section should create a reason to continue.
- Treat title + thumbnail as a major part of the idea, not an afterthought. Generate multiple title angles and thumbnail concepts.
- Think in formats, not isolated videos. Study proven formats from outside the channel's category and adapt the emotional mechanism to the chosen audience. Do not copy wording, creator identity or copyrighted material.
- A format adaptation must preserve structure and emotional trigger while changing the actual subject, examples and creative execution.
- Batchability matters: the output should be executable repeatedly, not a one-off masterpiece.
- Visuals should change frequently enough to support retention. Default to a new visual beat every 5 seconds. If a shot can last longer, explain why.
- Image prompts are written for Nano Banana 2 / Flow Labs image generation. Each visual prompt must be self-contained enough to generate the intended frame while maintaining subject/style continuity.

YOUTUBE OUTPUT REQUIREMENTS:
1. Give a channel/topic recommendation if the user has not supplied a clear one.
2. Give 3 proven-format adaptations from outside the niche, with the emotional trigger and the adaptation logic.
3. Give 10 topic ideas ranked by opportunity.
4. Select the strongest topic and give 10 title candidates, ranked.
5. Give 3 thumbnail concepts with exact thumbnail text, composition and visual hierarchy.
6. Write a high-retention script. Default 1,500–2,000 words unless the requested duration says otherwise. Start immediately with the pattern interrupt. Use natural spoken cadence, specific examples, numbers only when supplied or clearly framed as estimates, and no fabricated claims.
7. Give chapter headings with timestamps based on the script.
8. Give YouTube SEO package: primary keyword, secondary keywords, search intent, description, tags, hashtags, pinned comment and suggested next-video CTA.
9. Give visual timeline for the full script at approximately 5-second intervals. Each beat must have start/end seconds, the spoken line or section it supports, visual objective, on-screen text (when useful), and a production-ready JSON image prompt for Nano Banana 2 / Flow Labs.
10. Keep visual continuity. Repeat the same subject, wardrobe, environment and visual language where the story requires it.
11. Include optional B-roll/motion notes for when an image should be turned into a 2.5–5 second motion shot in Flow Labs.
12. Mark every visual beat as IMAGE, SCREEN/GRAPHIC, B-ROLL, or MOTION.
13. Give a final production checklist: voiceover, visuals, music/SFX, captions, edit pace, thumbnail, title, upload metadata.

QUALITY RULES:
- No robotic exposition.
- No generic intro.
- No unsupported $ figures, RPM claims, case-study claims or 'this will go viral' guarantees.
- Do not hallucinate current events. If the topic depends on current information, explicitly flag that live research/verification is required before publishing.
- Do not copy a specific creator's exact script, thumbnail, title wording or distinctive style. Adapt broad format mechanics only.
- The first 5 seconds must make the viewer understand exactly why they should stay.
- The title promise, thumbnail promise and opening must all point to the same curiosity gap.
- The script must earn each section rather than padding to hit a word count.
- Every visual beat must have a reason to exist.

Return JSON only, no markdown. Schema:
{
  "channel_strategy": {"lane":"","audience":"","positioning":"","goal":""},
  "format_adaptations":[{"format":"","source_mechanism":"","emotional_trigger":"","adaptation":""}],
  "topic_ideas":[{"rank":1,"topic":"","why_now":"","hook":"","difficulty":"","commercial_potential":""}],
  "selected_video": {
    "topic":"",
    "title_candidates":[{"rank":1,"title":"","why":""}],
    "thumbnail_concepts":[{"rank":1,"text":"","composition":"","visual_hierarchy":""}],
    "script":"",
    "chapters":[{"time":"","title":""}],
    "seo":{"primary_keyword":"","secondary_keywords":[],"search_intent":"","description":"","tags":[],"hashtags":[],"pinned_comment":"","next_video_cta":""},
    "visual_timeline":[{"start":0,"end":5,"type":"IMAGE","spoken_support":"","visual_objective":"","on_screen_text":"","json_prompt":"","flow_motion_note":""}],
    "production_checklist":["","","","","",""],
    "risks_or_verification_notes":[""],
    "why_this_package_should_work":""
  }
}`;

export default function YouTubeGrowthWorkspace() {
  const [lane, setLane] = useState("business");
  const [format, setFormat] = useState("business_story");
  const [goal, setGoal] = useState("Grow channel");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [direction, setDirection] = useState("");
  const [duration, setDuration] = useState("10");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    setBusy(true); setResult(null); setMessage("Building YouTube strategy, script and visual timeline…");
    try {
      const laneName = RPM_LANES.find(x => x[0] === lane)?.[1] || lane;
      const formatName = FORMATS.find(x => x[0] === format)?.[1] || format;
      const userPrompt = `CHANNEL LANE: ${laneName}\nFORMAT: ${formatName}\nGOAL: ${goal}\nAUDIENCE: ${audience || "Recommend an audience with strong watch intent and commercial value."}\nTOPIC / SUBJECT: ${topic || "No topic supplied — research and recommend the strongest opportunity."}\nTARGET DURATION: ${duration} minutes\nEXTRA DIRECTION: ${direction || "None"}\n\nBuild the complete package. Treat the user's articles as strategic principles: high-RPM positioning, high-retention scripts, title/thumbnail importance, batch production, and especially format adaptation from outside the niche.\n\nFor the visual timeline, calculate enough 5-second beats to cover the whole target duration. Do not merely write 'new image every 5 seconds'; each beat must be purposeful. Make the JSON prompts suitable for Nano Banana 2 / Flow Labs and coherent enough that adjacent frames look like the same production. If a sequence is better handled by one image with motion, use FLOW MOTION in the note rather than inventing unnecessary image changes.`;
      const id = await queueQwen({ title: `YouTube Growth · ${topic || "Topic Discovery"}`, systemPrompt, userPrompt });
      const parsed = parseJson(await waitQwen(id, setMessage));
      if (!parsed?.selected_video) throw new Error("Qwen returned no selected video package.");
      setResult(parsed);
      setMessage("YouTube package ready — strategy, script, SEO, thumbnails and 5-second visual plan included.");
    } catch (e) { setMessage(e.message || String(e)); }
    finally { setBusy(false); }
  }

  function copy(value) { navigator.clipboard?.writeText(String(value || "")); setMessage("Copied."); }

  return <div style={page}><div style={shell}>
    <div style={{ marginBottom: 20 }}>
      <div style={eyebrow}>YOUTUBE · AI GROWTH ENGINE</div>
      <h1 style={h1}>Idea → Title → Thumbnail → Retention → Visuals → SEO</h1>
      <p style={muted}>A standalone YouTube system. It is not connected to Cara or Lila. Qwen builds the strategy, script and upload package, then maps the entire video into 5-second visual beats ready for Nano Banana 2 / Flow Labs.</p>
    </div>

    <section style={card}><div style={title}>1. Position the channel</div><div style={grid3}>
      <label style={label}>RPM lane<select value={lane} onChange={e=>setLane(e.target.value)} style={input}>{RPM_LANES.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label>
      <label style={label}>Format<select value={format} onChange={e=>setFormat(e.target.value)} style={input}>{FORMATS.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label>
      <label style={label}>Goal<select value={goal} onChange={e=>setGoal(e.target.value)} style={input}>{GOALS.map(x=><option key={x}>{x}</option>)}</select></label>
    </div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
      <textarea value={audience} onChange={e=>setAudience(e.target.value)} rows={3} style={textarea} placeholder="Who exactly should watch? Leave blank for Qwen to recommend."/>
      <textarea value={direction} onChange={e=>setDirection(e.target.value)} rows={3} style={textarea} placeholder="Any channel positioning, references, constraints or ideas you already have."/>
    </div></section>

    <section style={card}><div style={title}>2. Pick the video</div><div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 150px",gap:10}}>
      <textarea value={topic} onChange={e=>setTopic(e.target.value)} rows={3} style={textarea} placeholder="Topic, story, company, trend or question. Leave blank and Qwen will find an opportunity."/>
      <label style={label}>Minutes<select value={duration} onChange={e=>setDuration(e.target.value)} style={input}>{["6","8","10","12","15","20"].map(x=><option key={x}>{x}</option>)}</select></label>
    </div><button disabled={busy} onClick={generate} style={{...primary,marginTop:12}}>{busy?"Qwen is working…":"Generate Full YouTube Package"}</button></section>

    {result && <>
      <section style={card}><div style={title}>Strategy</div><div style={statGrid}><Info label="Lane" value={result.channel_strategy?.lane}/><Info label="Audience" value={result.channel_strategy?.audience}/><Info label="Positioning" value={result.channel_strategy?.positioning}/><Info label="Goal" value={result.channel_strategy?.goal}/></div>
        <div style={{marginTop:12}}><div style={section}>Format adaptations</div>{(result.format_adaptations||[]).map((x,i)=><div key={i} style={info}><b>{x.format}</b><div style={mutedSmall}>Trigger: {x.emotional_trigger}</div><div style={mutedSmall}>Adaptation: {x.adaptation}</div></div>)}</div>
        <div style={{marginTop:12}}><div style={section}>Topic board</div>{(result.topic_ideas||[]).map(x=><div key={x.rank} style={info}><b>#{x.rank} {x.topic}</b><div style={mutedSmall}>{x.why_now}</div><div style={mutedSmall}>Hook: {x.hook} · Difficulty: {x.difficulty} · Commercial: {x.commercial_potential}</div></div>)}</div>
      </section>

      <section style={card}><div style={title}>Selected video</div><h2 style={{margin:"4px 0 12px",color:"#fff"}}>{result.selected_video.topic}</h2><div style={section}>Titles</div>{(result.selected_video.title_candidates||[]).map(x=><div key={x.rank} style={info}><b>#{x.rank} {x.title}</b><div style={mutedSmall}>{x.why}</div></div>)}
        <div style={{marginTop:12}}><div style={section}>Thumbnail concepts</div>{(result.selected_video.thumbnail_concepts||[]).map(x=><div key={x.rank} style={info}><b>#{x.rank} {x.text}</b><div style={mutedSmall}>{x.composition}</div><div style={mutedSmall}>{x.visual_hierarchy}</div></div>)}</div>
        <div style={{marginTop:12}}><div style={section}>Script <button onClick={()=>copy(result.selected_video.script)} style={button}>Copy</button></div><div style={output}>{result.selected_video.script}</div></div>
      </section>

      <section style={card}><div style={title}>SEO + upload package</div><div style={twoCol}><Box title="Primary keyword" value={result.selected_video.seo?.primary_keyword}/><Box title="Search intent" value={result.selected_video.seo?.search_intent}/><Box title="Description" value={result.selected_video.seo?.description} copy={()=>copy(result.selected_video.seo?.description)}/><Box title="Tags" value={(result.selected_video.seo?.tags||[]).join(", ")} copy={()=>copy((result.selected_video.seo?.tags||[]).join(", "))}/><Box title="Hashtags" value={(result.selected_video.seo?.hashtags||[]).join(" ")}/><Box title="Pinned comment" value={result.selected_video.seo?.pinned_comment}/></div><div style={{marginTop:12}}><div style={section}>Chapters</div>{(result.selected_video.chapters||[]).map((x,i)=><div key={i} style={info}>{x.time} — {x.title}</div>)}</div></section>

      <section style={card}><div style={title}>5-second visual production timeline</div><div style={hint}>Every beat is designed for Nano Banana 2 / Flow Labs. Generate the image, keep adjacent beats visually consistent, then use Flow Labs motion when a still image can carry the shot for 2.5–5 seconds.</div><div style={{display:"grid",gap:10,marginTop:12}}>{(result.selected_video.visual_timeline||[]).map((x,i)=><article key={i} style={info}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><b>{x.start}s–{x.end}s · {x.type}</b><button onClick={()=>copy(x.json_prompt)} style={button}>Copy JSON prompt</button></div><div style={mutedSmall}><b>Spoken:</b> {x.spoken_support}</div><div style={mutedSmall}><b>Visual objective:</b> {x.visual_objective}</div><div style={mutedSmall}><b>On-screen:</b> {x.on_screen_text || "—"}</div><pre style={pre}>{x.json_prompt}</pre><div style={{...mutedSmall,marginTop:6}}><b>Flow motion:</b> {x.flow_motion_note || "—"}</div></article>)}</div></section>

      <section style={card}><div style={title}>Production checklist</div>{(result.selected_video.production_checklist||[]).map((x,i)=><div key={i} style={info}>✓ {x}</div>)}<div style={{marginTop:12}}><div style={section}>Verification notes</div>{(result.selected_video.risks_or_verification_notes||[]).map((x,i)=><div key={i} style={info}>⚠ {x}</div>)}</div><div style={{marginTop:12,padding:12,borderRadius:10,background:"#121521",border:"1px solid #262c3c"}}><b>Why this package should work:</b><div style={mutedSmall}>{result.selected_video.why_this_package_should_work}</div></div></section>
    </>}
    {message && <div style={toast}>{message}</div>}
  </div></div>;
}

function Info({label,value}){return <div style={info}><div style={section}>{label}</div><div style={{fontSize:12,lineHeight:1.5,color:"#d7dde8"}}>{value||"—"}</div></div>}
function Box({title,value,copy}){return <div><div style={section}>{title}{copy&&<button onClick={copy} style={{...button,marginLeft:8,padding:"4px 8px",fontSize:10}}>Copy</button>}</div><div style={output}>{value||"—"}</div></div>}
const page={minHeight:"100vh",background:"#08070d",color:"#eef1f7",padding:26,fontFamily:"Inter,system-ui,sans-serif"};
const shell={maxWidth:1300,margin:"0 auto"};
const card={background:"#0e1017",border:"1px solid #252a39",borderRadius:16,padding:18,marginBottom:16};
const title={fontSize:14,fontWeight:900,marginBottom:12};
const label={display:"flex",flexDirection:"column",gap:7,fontSize:10,textTransform:"uppercase",letterSpacing:".08em",fontWeight:800,color:"#7f8798"};
const input={width:"100%",boxSizing:"border-box",background:"#151822",color:"#fff",border:"1px solid #2a3040",borderRadius:10,padding:"10px 12px"};
const textarea={...input,resize:"vertical",fontFamily:"inherit",lineHeight:1.45};
const button={border:"1px solid #303648",background:"#151924",color:"#eef1f7",borderRadius:10,padding:"8px 11px",fontWeight:800,cursor:"pointer"};
const primary={...button,borderColor:"#d4af37",background:"rgba(212,175,55,.14)",color:"#f7d77b"};
const statGrid={display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10};
const grid3={display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10};
const twoCol={display:"grid",gridTemplateColumns:"1fr 1fr",gap:12};
const section={fontSize:10,textTransform:"uppercase",letterSpacing:".08em",fontWeight:900,color:"#7f8798",marginBottom:6};
const muted={color:"#838ca0",lineHeight:1.65,maxWidth:980};
const mutedSmall={color:"#9aa4b7",fontSize:11,lineHeight:1.5,marginTop:4};
const info={border:"1px solid #252a39",borderRadius:10,padding:10,background:"#10131a"};
const output={background:"#151822",border:"1px solid #2a3040",borderRadius:10,padding:11,color:"#dce2ec",fontSize:12,lineHeight:1.55,whiteSpace:"pre-wrap",minHeight:46};
const pre={margin:"10px 0 0",whiteSpace:"pre-wrap",overflowWrap:"anywhere",background:"#0a0d12",border:"1px solid #202635",borderRadius:8,padding:10,color:"#bfc8d8",fontSize:10.5,lineHeight:1.45};
const hint={marginTop:10,padding:12,borderRadius:10,background:"#121521",border:"1px solid #262c3c",color:"#9ea8ba",fontSize:12,lineHeight:1.55};
const eyebrow={fontSize:10,letterSpacing:".18em",textTransform:"uppercase",color:"#d9a43c",fontWeight:900};
const h1={margin:"7px 0 5px",fontSize:34,letterSpacing:"-.05em"};
const toast={position:"fixed",left:"50%",bottom:18,transform:"translateX(-50%)",background:"#151a24",border:"1px solid #2e3646",color:"#e8edf5",borderRadius:999,padding:"10px 15px",fontSize:11.5,fontWeight:700,zIndex:200,maxWidth:"90vw",textAlign:"center"};
