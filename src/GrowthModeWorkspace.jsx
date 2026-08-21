import React, { useState } from "react";
import { supabase } from "./supabase";

const PEOPLE = [
  { id: "cara", name: "Cara", desc: "Direct, dry, disciplined, British." },
  { id: "lila", name: "Lila", desc: "Warm, measured, observant, understated." },
  { id: "cara_lila", name: "Cara + Lila", desc: "Two distinct personalities, chemistry and contrast." },
];

const FORMATS = [
  ["personal_moment", "Personal moment", "Specific lived moment with human texture."],
  ["pov", "POV / relatable", "Sharp observation or recognisable situation."],
  ["quick_take", "Quick take", "One opinion, lesson or surprising observation."],
  ["story", "Micro-story", "Setup, tension, payoff."],
  ["grwm", "GRWM", "Getting ready with a real reason to watch."],
  ["day_in_life", "Day in the life", "Coherent slice of a believable day."],
  ["slideshow", "Photo slideshow", "5–7 swipeable slides with a clear thread."],
  ["reaction", "Reaction", "Natural reaction to an idea, situation or discovery."],
];

const SERIES = {
  cara: [
    "Things I Stopped Doing", "If I Started Again From Zero", "Gym Mistakes I See All The Time", "Beginner vs Advanced",
    "30-Day Challenge", "What Nobody Tells You", "Unpopular Opinion", "What I'd Do Differently", "Realistic Routine",
    "Small Wins / Small Fails", "I Tried It So You Don't Have To", "Behind The Scene Of A Normal Day", "Things That Sound Expensive But Aren't",
    "One Small Change That Made Life Easier", "Same Situation, Different Choice",
  ],
  lila: [
    "I Tried It So You Don't Have To", "Do This, Not That", "Same Product, 3 Ways", "Before vs After", "One-Minute Tutorial",
    "Full Look In 60 Seconds", "Drugstore vs High-End", "GRWM For...", "Testing Things TikTok Made Me Buy", "What Actually Suits Me",
    "Beauty Mistakes I Was Making", "Skincare Routine Breakdown", "Worst To Best", "One Small Change", "Things I Quietly Swear By",
    "What I Changed My Mind About",
  ],
  cara_lila: [
    "Cara Says / Lila Says", "One Thinks It's Brilliant, One Thinks It's Stupid", "We Both Tried It", "Things We Completely Disagree On",
    "Get Ready Together", "Who Knows The Other Better?", "One Has A Plan, The Other Ruins It", "Two Reactions To The Same Thing",
    "Things Cara Does That Lila Finds Hilarious", "Things Lila Does That Cara Pretends Not To Notice", "We Went Out For One Thing",
    "Travel Day Problems", "Same Outfit Brief, Two Different Versions", "One Small Decision That Changed The Day",
  ],
};

const AUDIENCE = {
  cara: "Discipline without misery; confidence without loud performance; realistic routines; blunt opinions; everyday frustrations; progress that feels earned.",
  lila: "Calm aspiration with usefulness underneath; beauty and lifestyle filtering; realistic improvement; understated taste; curiosity about routines, products and places.",
  cara_lila: "Relationship dynamics, humour, anticipation of disagreement, recognition of friendship behaviour, two distinct reactions and the pleasure of seeing what happens next.",
};

const FORMAT_ADAPTATION = [
  "things worth your money -> things NOT worth your money",
  "I finally figured out... curiosity-gap reveal",
  "-maxxing language used only when it naturally fits the creator and audience",
  "a win is a win: frustration -> unexpected upside",
  "challenge/progression formats with a visible next-step payoff",
  "manifestation or participation mechanics adapted only when the emotional trigger matches",
  "comparison and ranking structures adapted from unrelated categories",
  "confessional or storytime structures adapted from another niche when the same emotion is present",
];

const BIBLES = {
  cara: `Cara is an adult fictional creator. Direct, dry, disciplined and British. Practical, confident, slightly self-aware. Her public content should feel like a real person caught in an ordinary moment, not a polished influencer advertisement.`,
  lila: `Lila is an adult fictional creator. Warm, measured, observant and understated. Calm rather than loud. Her public content should feel intimate, composed and believable rather than performative.`,
  cara_lila: `Cara and Lila are two separate adult fictional creators. Cara is direct, dry and disciplined. Lila is warm, measured and observant. Never merge identities. Duo content should use genuine chemistry, contrast, teasing or shared situations.`,
};

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned invalid JSON");
  const opener = clean[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0, quote = false, escaped = false;
  for (let i = start; i < clean.length; i += 1) {
    const c = clean[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quote = false;
    } else if (c === '"') quote = true;
    else if (c === opener) depth += 1;
    else if (c === closer) {
      depth -= 1;
      if (depth === 0) return JSON.parse(clean.slice(start, i + 1));
    }
  }
  throw new Error("Qwen returned incomplete JSON");
}

async function queueQwen({ title, persona, systemPrompt, userPrompt }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title, job_type: "growth_mode", model: "mlx-community/Qwen3-8B-4bit", persona_id: persona,
    system_prompt: systemPrompt, user_prompt: userPrompt,
    options: { max_tokens: 9000, temperature: 0.72 }, status: "queued", production_status: "not_started",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function waitQwen(jobId, setMessage) {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3500));
    const { data, error } = await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id", jobId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Qwen job disappeared from the queue.");
    if (data.status === "completed") return data.result || "";
    if (data.status === "error") throw new Error(data.error_message || "Qwen failed.");
    setMessage(`Qwen is building human creator content… ${data.status}`);
  }
  throw new Error("Qwen timed out. Make sure the local Qwen worker is running.");
}

function copy(text, setMessage) { navigator.clipboard?.writeText(String(text || "")); setMessage("Copied."); }

export default function GrowthModeWorkspace() {
  const [persona, setPersona] = useState("cara");
  const [format, setFormat] = useState("personal_moment");
  const [series, setSeries] = useState("Auto-select best series");
  const [count, setCount] = useState("10");
  const [direction, setDirection] = useState("");
  const [fanvueFunnel, setFanvueFunnel] = useState(true);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    setBusy(true); setResults([]); setMessage(`Building ${count} follower-growth tests…`);
    try {
      const person = PEOPLE.find((p) => p.id === persona);
      const fmt = FORMATS.find((x) => x[0] === format);
      const seriesList = SERIES[persona] || SERIES.cara;
      const systemPrompt = `You are the senior TikTok creator strategist, UGC director, retention editor, audience psychologist and anti-AI-slop creative director inside CornerstoneAIAssets. You are not a generic copywriter.\n\nCREATOR SOURCE:\n${BIBLES[persona]}\n\nAUDIENCE PSYCHOLOGY:\n${AUDIENCE[persona]}\n\nSIGNATURE SERIES LIBRARY:\n${seriesList.join(" | ")}\n\nMISSION:\nGrow the account first. There is deliberately NO product. Build recognition, repeat viewing, audience relationship and follower growth before TikTok Shop. Fanvue remains a quiet background destination only.\n\nCREATIVE HIERARCHY:\nPERSON -> AUDIENCE -> EMOTION -> SERIES -> FORMAT -> HOOK -> CONTENT -> VISUAL -> CAPTION. Never reverse this into trend -> prompt -> image.\n\nSERIES RULES:\n1. Choose a recurring series when it gives the viewer a reason to return.\n2. Vary the situation, hook and visual execution within the series. Never publish the same script with nouns swapped.\n3. A series should be recognisable without becoming a catchphrase machine.\n\nFORMAT ADAPTATION:\nDo not invent formats from a blank page when a proven mechanism can be adapted. Extract the emotional trigger, hook structure, pacing, participation mechanic and payoff shape. Rebuild it for this creator. Never copy a specific creator's wording, identity, exact script or distinctive execution.\nUseful adaptation patterns include: ${FORMAT_ADAPTATION.join("; ")}. The emotional trigger must actually match this audience.\n\nANTI-SLOP GATE:\nReject any concept with random luxury backdrops, unexplained props, perfect influencer posing, plastic skin, AI-perfect symmetry, meaningless camera changes, fake vulnerability, generic motivational language, fake achievements, fake purchases, fake testimonials, invented relationships, empty engagement bait, unexplained wardrobe changes, physically impossible actions, or a caption that sounds written by a social media manager. The scene needs a believable reason for the creator to be there and a specific human action.\n\nHUMAN TEXTURE:\nUse ordinary friction, tiny observations, imperfect moments, changing emotion, believable phone framing, useful environmental detail and specific behaviour. The creator may be tired, amused, wrong, awkward, excited or indecisive. Do not optimise every post into confidence.\n\nFOLLOWER TEST:\nEvery concept must answer: why follow this creator tomorrow? Also identify why a viewer might comment, save and share.\n\nCONTINUITY:\nTreat the account as an unfolding life. Continue an ongoing series, challenge, routine, place or question when context is available. Never invent prior events.\n\nCONTENT MIX GUIDANCE:\nAcross a batch, approximately 30% relatable lifestyle, 20% signature series, 15% useful/educational, 15% personality/humour, 10% aspiration/identity, 10% experimental format adaptation. Use this as a balancing guide, not a rigid quota.\n\nFANVUE:\nKeep the Fanvue destination in the bio only. Never hard-sell Fanvue in ordinary growth content.\n\nReturn JSON only. No markdown.`;
      const userPrompt = `CREATOR: ${person?.name}\nFORMAT: ${fmt?.[1]}\nSERIES DIRECTION: ${series}\nAVAILABLE SERIES: ${seriesList.join(", ")}\nVARIATIONS: ${count}\nEXTRA DIRECTION: ${direction.trim() || "none — choose the strongest concepts yourself"}\nBACKGROUND FANVUE FUNNEL: ${fanvueFunnel ? "ON — quiet bio destination only" : "OFF"}\n\nGenerate exactly ${count} materially different follower-growth tests. Prioritise recognisable recurring series, human moments and strong emotional reasons to watch. Return:\n{"tests":[{"id":"G1","series":"","emotional_trigger":"","hook":"","retention_mechanism":"","follower_reason":"","comment_reason":"","save_reason":"","share_reason":"","script":"","post_caption":"","on_image_caption":"","image_generation_prompts":[{"shot":1,"purpose":"","on_image_caption":"","json_prompt":""}],"video_json_prompt":"","why_this_should_work":"","anti_slop_checks":""}]}\n\nFor slideshow use 5–7 coherent slides. For video-led formats include 1–3 source-frame/B-roll prompts only when useful. Every json_prompt must be a production-ready JSON-stringified image brief with identity, environment, wardrobe, action, camera, framing, lighting, continuity, realism constraints and negative constraints. Do not put text inside generated images by default; return exact on-image copy separately.\n\nDo not fabricate personal experience. Make the content strong enough to post immediately.`;
      const jobId = await queueQwen({ title: `Growth Mode · ${person?.name} · ${fmt?.[1]}`, persona, systemPrompt, userPrompt });
      const parsed = parseJson(await waitQwen(jobId, setMessage));
      const generated = Array.isArray(parsed.tests) ? parsed.tests : [];
      if (!generated.length) throw new Error("Qwen returned no growth tests.");
      setResults(generated); setMessage(`${generated.length} anti-slop growth tests ready.`);
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  return <div style={page}><div style={shell}>
    <div style={{ marginBottom: 20 }}><div style={eyebrow}>Track B · Growth Mode</div><h1 style={h1}>Grow First. Monetise Second.</h1><p style={mutedLarge}>Follower-growth mode for Cara, Lila and the duo. Signature series, audience psychology, format adaptation, life continuity and anti-AI-slop checks are built into the Qwen brief.</p></div>

    <section style={card}><div style={title}>1. Creator</div><div style={grid3}>{PEOPLE.map((p) => <button key={p.id} onClick={() => { setPersona(p.id); setSeries("Auto-select best series"); }} style={persona === p.id ? activeCard : cardButton}><div style={{ fontWeight: 900 }}>{p.name}</div><div style={muted}>{p.desc}</div></button>)}</div></section>

    <section style={card}><div style={title}>2. Format + Signature Series</div><div style={grid4}>{FORMATS.map(([id, label, desc]) => <button key={id} onClick={() => setFormat(id)} style={format === id ? activeCard : cardButton}><div style={{ fontWeight: 900 }}>{label}</div><div style={muted}>{desc}</div></button>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12, marginTop: 12 }}>
        <label style={label}>Signature series<select value={series} onChange={(e) => setSeries(e.target.value)} style={input}><option>Auto-select best series</option>{(SERIES[persona] || SERIES.cara).map((s) => <option key={s}>{s}</option>)}</select></label>
        <label style={label}>Variations<select value={count} onChange={(e) => setCount(e.target.value)} style={input}><option value="5">5</option><option value="10">10</option></select></label>
        <label style={label}>Background Fanvue<select value={fanvueFunnel ? "ON" : "OFF"} onChange={(e) => setFanvueFunnel(e.target.value === "ON")} style={input}><option>ON</option><option>OFF</option></select></label>
      </div>
      <textarea value={direction} onChange={(e) => setDirection(e.target.value)} rows={3} placeholder="Optional: situation, trend, recurring series, audience problem or vibe. Leave blank for Qwen to choose." style={{ ...textarea, marginTop: 12 }} />
      <button disabled={busy} onClick={generate} style={{ ...primary, marginTop: 12, padding: "12px 18px" }}>{busy ? "Qwen is working…" : `Generate ${count} Growth Tests`}</button>
    </section>

    <section style={card}><div style={title}>3. Ready-to-post test board</div>{!results.length && <div style={empty}>Nothing generated yet.</div>}
      <div style={{ display: "grid", gap: 14 }}>{results.map((test, index) => <article key={test.id || index} style={resultCard}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}><div><div style={eyebrowSmall}>TEST {index + 1} · {test.series || "Growth idea"}</div><h2 style={{ margin: "5px 0", fontSize: 20 }}>{test.hook}</h2></div><button onClick={() => copy(JSON.stringify(test, null, 2), setMessage)} style={button}>Copy JSON</button></div>
        <div style={statGrid}><Info label="Emotion" value={test.emotional_trigger} /><Info label="Retention" value={test.retention_mechanism} /><Info label="Why follow" value={test.follower_reason} /><Info label="Comment" value={test.comment_reason} /></div>
        <div style={statGrid}><Info label="Save" value={test.save_reason} /><Info label="Share" value={test.share_reason} /><Info label="Fanvue" value={test.fanvue_profile_note || "Quiet bio destination only"} /><Info label="Quality gate" value={test.anti_slop_checks} /></div>
        <div style={twoCol}><Box title="Script" value={test.script} /><Box title="TikTok caption" value={test.post_caption} copy={() => copy(test.post_caption, setMessage)} /><Box title="On-image copy" value={test.on_image_caption || "—"} copy={() => copy(test.on_image_caption, setMessage)} /><Box title="Why this should work" value={test.why_this_should_work} /></div>
        <div style={{ marginTop: 12 }}><div style={section}>Image production prompts</div><div style={{ display: "grid", gap: 10 }}>{(test.image_generation_prompts || []).map((shot, shotIndex) => <div key={shot.shot || shotIndex} style={promptCard}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b>Shot {shot.shot || shotIndex + 1}</b><button onClick={() => copy(shot.json_prompt, setMessage)} style={button}>Copy prompt</button></div><div style={smallLine}>On-image copy: <b>{shot.on_image_caption || "—"}</b></div><pre style={pre}>{shot.json_prompt || "—"}</pre></div>)}</div></div>
        {test.video_json_prompt && <div style={{ marginTop: 12 }}><Box title="Video JSON prompt" value={test.video_json_prompt} copy={() => copy(test.video_json_prompt, setMessage)} /></div>}
      </article>)}</div>
    </section>
  </div>{message && <div style={toast}>{message}</div>}</div>;
}

function Info({ label, value }) { return <div style={info}><div style={section}>{label}</div><div style={valueText}>{value || "—"}</div></div>; }
function Box({ title, value, copy: copyFn }) { return <div><div style={section}>{title}{copyFn && <button onClick={copyFn} style={{ ...button, marginLeft: 8, padding: "4px 8px", fontSize: 10 }}>Copy</button>}</div><div style={output}>{value || "—"}</div></div>; }

const page={minHeight:"100vh",background:"#08070d",color:"#eef1f7",padding:26,fontFamily:"Inter,system-ui,sans-serif"};
const shell={maxWidth:1280,margin:"0 auto"};
const card={background:"#0e1017",border:"1px solid #252a39",borderRadius:16,padding:18,marginBottom:16};
const title={fontSize:14,fontWeight:900,marginBottom:12};
const h1={margin:"7px 0 5px",fontSize:36,letterSpacing:"-.05em"};
const eyebrow={fontSize:10,letterSpacing:".18em",textTransform:"uppercase",color:"#d9a43c",fontWeight:900};
const eyebrowSmall={fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"#d9a43c",fontWeight:900};
const muted={color:"#838ca0",fontSize:11,lineHeight:1.45,marginTop:4};
const mutedLarge={color:"#9ba4b5",maxWidth:880,lineHeight:1.65,margin:0};
const mutedSmall={color:"#838ca0",fontSize:10.5,lineHeight:1.4,marginTop:4};
const grid3={display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10};
const grid4={display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10};
const cardButton={border:"1px solid #303648",background:"#151924",color:"#eef1f7",borderRadius:10,padding:"11px 12px",fontWeight:800,cursor:"pointer",textAlign:"left",minHeight:70};
const activeCard={...cardButton,borderColor:"#d4af37",background:"rgba(212,175,55,.12)"};
const label={display:"flex",flexDirection:"column",gap:7,fontSize:10,textTransform:"uppercase",letterSpacing:".08em",fontWeight:800,color:"#7f8798"};
const input={width:"100%",boxSizing:"border-box",background:"#151822",color:"#fff",border:"1px solid #2a3040",borderRadius:10,padding:"10px 12px"};
const textarea={...input,resize:"vertical",fontFamily:"inherit",lineHeight:1.45};
const primary={border:"1px solid #d4af37",background:"rgba(212,175,55,.14)",color:"#f7d77b",borderRadius:10,padding:"10px 14px",fontWeight:900,cursor:"pointer"};
const button={border:"1px solid #303648",background:"#151924",color:"#eef1f7",borderRadius:10,padding:"8px 11px",fontWeight:800,cursor:"pointer"};
const empty={padding:24,textAlign:"center",border:"1px dashed #2a3040",borderRadius:12,color:"#626b7e"};
const resultCard={border:"1px solid #2a3040",borderRadius:14,padding:16,background:"#10131a"};
const statGrid={display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginTop:12};
const info={border:"1px solid #252a39",borderRadius:10,padding:10};
const section={fontSize:10,textTransform:"uppercase",letterSpacing:".08em",fontWeight:900,color:"#7f8798",marginBottom:6};
const valueText={fontSize:12,lineHeight:1.5,color:"#d7dde8"};
const twoCol={display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12};
const output={background:"#151822",border:"1px solid #2a3040",borderRadius:10,padding:11,color:"#dce2ec",fontSize:12,lineHeight:1.55,whiteSpace:"pre-wrap",minHeight:46};
const promptCard={border:"1px solid #252a39",borderRadius:10,padding:12,background:"#0c0f15"};
const smallLine={marginTop:8,fontSize:11,color:"#d7dde8"};
const pre={margin:"10px 0 0",whiteSpace:"pre-wrap",overflowWrap:"anywhere",background:"#0a0d12",border:"1px solid #202635",borderRadius:8,padding:10,color:"#bfc8d8",fontSize:10.5,lineHeight:1.45};
const toast={position:"fixed",left:"50%",bottom:18,transform:"translateX(-50%)",background:"#151a24",border:"1px solid #2e3646",color:"#e8edf5",borderRadius:999,padding:"10px 15px",fontSize:11.5,fontWeight:700,zIndex:200,maxWidth:"90vw",textAlign:"center"};
