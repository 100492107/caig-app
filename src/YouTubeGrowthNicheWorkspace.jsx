import React, { useState } from "react";
import { supabase } from "./supabase";

const NICHE = {
  name: "Animated Business Mysteries & Money Stories",
  audience: "Adults 25–54 interested in business, money, economics, company stories, scams, ambition, innovation and high-stakes decisions.",
  positioning: "Original long-form business and money storytelling presented as nostalgic 2D animation with a late-1990s/early-2000s hand-drawn television/cinema feel.",
  pillars: [
    "Rise and fall of companies",
    "Fortunes, frauds and financial disasters",
    "Business wars and unlikely winners",
    "Hidden economics behind familiar products",
    "Money psychology and behavioural stories",
    "Inventions, industries and people who changed markets",
  ],
  visual: "Original hand-drawn 2D animation, expressive character acting, painterly backgrounds, cinematic composition, warm cel-painted lighting, subtle film grain and nostalgic late-1990s/early-2000s visual language. Never reproduce Disney or other proprietary studio IP.",
};

const FORMATS = [
  "Business mystery",
  "Rise and fall",
  "How X made/broke a fortune",
  "Corporate battle",
  "Money psychology",
  "Hidden economics",
  "Scam / fraud story",
  "Invention that changed an industry",
];
const GOALS = ["Grow channel", "Maximise retention", "Maximise CTR", "Build authority", "Monetise"];

function parseJson(text) {
  const clean = String(text || "").replace(/```json|```/gi, "").trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned invalid JSON.");
  const open = clean[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === open) depth += 1;
    else if (ch === close && --depth === 0) return JSON.parse(clean.slice(start, i + 1));
  }
  throw new Error("Qwen returned incomplete JSON.");
}

async function queueQwen({ title, systemPrompt, userPrompt }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title,
    job_type: "youtube_growth_niche",
    model: "mlx-community/Qwen3-8B-4bit",
    persona_id: "youtube_business_animation",
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    options: { max_tokens: 14000, temperature: 0.55 },
    status: "queued",
    production_status: "not_started",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function waitQwen(id, setMessage) {
  const deadline = Date.now() + 25 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3500));
    const { data, error } = await supabase.from("local_ai_jobs").select("status,result,error_message").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Qwen job disappeared from the queue.");
    if (data.status === "completed") return data.result || "";
    if (data.status === "error") throw new Error(data.error_message || "Qwen failed.");
    setMessage(`Qwen is researching and engineering the next story… ${data.status}`);
  }
  throw new Error("Qwen timed out. Make sure the local Qwen worker is running.");
}

const SYSTEM = `You are the lead creative director, YouTube strategist, documentary researcher, narrative architect, retention editor, audience psychologist, title/thumbnail strategist, SEO strategist and visual director for a premium adult long-form YouTube channel called ${NICHE.name}.

CHANNEL DNA
Niche: ${NICHE.name}
Audience: ${NICHE.audience}
Positioning: ${NICHE.positioning}
Pillars: ${NICHE.pillars.join(" | ")}
Visual language: ${NICHE.visual}

CORE JOB
Do not behave like a generic AI script writer. Think like an elite YouTube operator whose job is to find and exploit attention patterns, then turn them into original high-retention stories.

CREATIVE HIERARCHY
1. Audience desire/problem
2. Emotional trigger
3. Topic opportunity
4. Proven format or cross-category format adaptation
5. Title + thumbnail promise
6. Opening 5 seconds
7. Narrative engine
8. Curiosity loops and escalating stakes
9. Visual storytelling
10. Payoff and next-video behaviour

FORMAT ADAPTATION ENGINE
Study the mechanics of formats that work elsewhere, including other YouTube categories, TikTok, documentaries, podcasts, newsletters and social storytelling. Do not copy creators. Extract the underlying mechanism: curiosity gap, reversal, ranking, confession, reveal, comparison, countdown, investigation, timeline, rise/fall, hidden truth, consequence, participation, myth-vs-reality, challenge/progression, business war or emotional transformation.

Then ask:
- What emotion made the source format work?
- Does this audience feel the same emotion?
- What should remain structurally identical?
- What needs to change for business/money storytelling?
- What would make the adaptation feel fresh rather than derivative?

Never lift exact wording, scripts, thumbnails, branding or distinctive visual identity. Steal the structure, psychology and pacing only.

RESEARCH-FIRST RULE
Before scripting, build a ranked topic board. Prefer subjects with a clear human story, conflict or mystery; a strong consequence or transformation; enough evidence or public material to support claims; a visual story that can be animated; a reason the topic matters now or remains evergreen; and commercial relevance without forcing finance jargon.

Do not invent facts, revenue numbers, quotes or outcomes. Mark estimates as estimates. Use uncertainty explicitly when evidence is incomplete.

CTR + RETENTION
Treat title, thumbnail and opening as one promise. Generate 10 title options and rank them. Generate 3 thumbnail concepts and rank them. The title promises a question, conflict or outcome. The thumbnail visually intensifies that promise without repeating the title word-for-word. The first 5 seconds should create immediate tension, mystery, consequence or surprise. Do not begin with generic channel intros. Every 30–60 seconds should introduce a new question, reveal, complication, reversal, evidence beat or emotional escalation.

NARRATIVE STANDARD
Write spoken narration, not an essay. Use scenes, people, decisions, stakes, objects, places and consequences. Make numbers meaningful by attaching them to human decisions. Prefer causal chains: because X happened, Y changed, which caused Z.

VISUAL STORY STANDARD
The animation is not decoration. Every visual must do at least one job: explain, reveal, contrast, foreshadow, create emotion, establish place/time, visualise a number, embody a decision, or reset attention.
Default visual beat cadence is approximately 5 seconds, but do not force a cut if one shot can carry the narration better through Flow Labs motion.
Use original hand-drawn 2D animation inspired by broad late-1990s/early-2000s television/cinema nostalgia. Do not imitate Disney characters, logos, shots or proprietary designs.
Every visual prompt must be self-contained JSON and include continuity details for recurring characters, wardrobe, locations, props, camera, framing, lighting and negative constraints.

SEO
SEO supports discoverability; it does not override story quality. Provide primary keyword, secondary keywords, search intent, description, tags, hashtags, pinned comment, chapters and next-video CTA. Avoid keyword stuffing.

QUALITY GATE
Before returning the package, internally score each candidate on click potential, emotional clarity, novelty of angle, audience fit, evidence strength, long-form retention potential, visual potential, commercial potential and series potential. Discard weak candidates before returning survivors.

BATCH INTELLIGENCE
When generating several topic ideas, vary the emotional engine and narrative shape. Do not return ten versions of the same story. When generating follow-ups, use what has already worked in the package to propose differentiated next episodes.

POLICY / ORIGINALITY
The final video must be materially original and educational or entertaining in its own right. Do not rely on copied articles, videos, stock narratives or interchangeable AI templates.

RETURN JSON ONLY. No markdown.`;

export default function YouTubeGrowthNicheWorkspace() {
  const [format, setFormat] = useState(FORMATS[0]);
  const [goal, setGoal] = useState(GOALS[0]);
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("10");
  const [direction, setDirection] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [openPanel, setOpenPanel] = useState("brief");

  async function generate() {
    setBusy(true); setResult(null); setMessage("Qwen is building the opportunity board before writing the video…"); setOpenPanel("opportunity");
    try {
      const userPrompt = `FORMAT: ${format}\nGOAL: ${goal}\nTARGET DURATION: ${duration} minutes\nTOPIC: ${topic || "None — choose the strongest opportunity yourself."}\nEXTRA DIRECTION: ${direction || "None."}\n\nWORKFLOW:\n1. Generate a ranked opportunity board of 8–12 topics/angles inside the fixed niche.\n2. For each, identify the emotional trigger, proven format mechanism, why the audience clicks, evidence/research requirements, visual potential, commercial potential and series potential.\n3. Select the strongest topic using those criteria, not personal preference.\n4. Generate 10 ranked title options and 3 ranked thumbnail concepts.\n5. Write the complete long-form script with deliberate retention loops and a strong payoff.\n6. Generate enough 5-second visual beats to cover the full duration.\n7. Every visual beat must have a self-contained JSON prompt for Nano Banana 2 / Flow Labs plus a motion note where useful.\n8. Produce the complete SEO/upload package.\n9. Produce 5 follow-up video ideas that exploit the same audience interest without becoming duplicates.\n\nReturn exactly:\n{\"channel\":{\"niche\":\"\",\"audience\":\"\",\"positioning\":\"\",\"pillars\":[],\"visual_style\":\"\"},\"topic_board\":[{\"rank\":1,\"topic\":\"\",\"format_mechanism\":\"\",\"emotional_trigger\":\"\",\"why_people_click\":\"\",\"evidence_strength\":\"\",\"visual_potential\":\"\",\"commercial_potential\":\"\",\"series_potential\":\"\"}],\"selected_video\":{\"topic\":\"\",\"angle\":\"\",\"emotional_engine\":\"\",\"format_adaptation\":\"\",\"titles\":[{\"rank\":1,\"title\":\"\",\"reason\":\"\"}],\"thumbnails\":[{\"rank\":1,\"text\":\"\",\"composition\":\"\",\"visual_hierarchy\":\"\",\"reason\":\"\"}],\"hook_0_5s\":\"\",\"script\":\"\",\"chapters\":[{\"time\":\"\",\"title\":\"\"}],\"seo\":{\"primary_keyword\":\"\",\"secondary_keywords\":[],\"search_intent\":\"\",\"description\":\"\",\"tags\":[],\"hashtags\":[],\"pinned_comment\":\"\",\"next_video_cta\":\"\"},\"visual_timeline\":[{\"start\":0,\"end\":5,\"type\":\"IMAGE\",\"spoken_support\":\"\",\"visual_objective\":\"\",\"on_screen_text\":\"\",\"json_prompt\":\"\",\"flow_motion_note\":\"\"}],\"production_checklist\":[],\"verification_notes\":[],\"quality_gate\":{\"click\":\"\",\"retention\":\"\",\"originality\":\"\",\"evidence\":\"\",\"visual\":\"\"},\"why_this_package_should_work\":\"\"},\"next_video_ideas\":[{\"topic\":\"\",\"format_mechanism\":\"\",\"why_follow\":\"\"}]}`;
      const id = await queueQwen({ title: `YouTube Studio · ${NICHE.name} · ${topic || "Opportunity Discovery"}`, systemPrompt: SYSTEM, userPrompt });
      const parsed = parseJson(await waitQwen(id, setMessage));
      if (!parsed?.selected_video) throw new Error("Qwen returned no selected video package.");
      setResult(parsed); setMessage("Complete channel-ready package generated."); setOpenPanel("package");
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  const copy = (value) => { navigator.clipboard?.writeText(String(value || "")); setMessage("Copied."); };
  const selected = result?.selected_video;

  return (
    <div className="yt-studio">
      <style>{`
        .yt-studio{--yt-bg:#111318;--yt-surface:#17191e;--yt-surface2:#1c1f25;--yt-line:rgba(255,255,255,.075);--yt-text:#f0f0ed;--yt-muted:#8d929c;--yt-dim:#606672;--yt-accent:#c2b28a;width:100%;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,system-ui,sans-serif;color:var(--yt-text)}
        .yt-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:8px 0 22px;border-bottom:1px solid var(--yt-line)}
        .yt-kicker{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#686e78;font-weight:800}.yt-title{margin:7px 0 0;font-size:clamp(30px,4vw,46px);line-height:1.02;letter-spacing:-.055em;font-weight:760}.yt-copy{max-width:700px;margin:9px 0 0;color:var(--yt-muted);font-size:13px;line-height:1.6}.yt-state{font-size:10px;color:#7b827c;white-space:nowrap}
        .yt-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}.yt-step{border:1px solid var(--yt-line);background:transparent;border-radius:10px;padding:14px;text-align:left;color:#858b95;cursor:pointer}.yt-step strong{display:block;color:#d4d5d3;font-size:12px}.yt-step span{display:block;margin-top:4px;color:#646a74;font-size:10px;line-height:1.4}.yt-step.active{background:rgba(194,178,138,.08);border-color:rgba(194,178,138,.3)}.yt-step.active strong{color:#ded4bf}
        .yt-panel{border:1px solid var(--yt-line);background:var(--yt-surface);border-radius:16px;margin-top:10px;overflow:hidden}.yt-panel-head{padding:15px 18px;display:flex;align-items:center;justify-content:space-between;gap:15px;border-bottom:1px solid var(--yt-line);cursor:pointer}.yt-panel-title{font-size:13px;font-weight:800}.yt-panel-meta{font-size:10px;color:var(--yt-dim)}.yt-panel-body{padding:18px}
        .yt-form{display:grid;grid-template-columns:1.2fr 1fr .55fr;gap:10px}.yt-label{display:grid;gap:6px;font-size:10px;color:#969ca5;font-weight:700}.yt-field{width:100%;min-height:44px;border:1px solid var(--yt-line);background:rgba(255,255,255,.025);color:var(--yt-text);border-radius:9px;padding:11px 12px;outline:none;font:inherit}.yt-field:focus{border-color:rgba(194,178,138,.42);box-shadow:0 0 0 3px rgba(194,178,138,.08)}.yt-area{min-height:96px;resize:vertical}.yt-wide{grid-column:1/-1}.yt-primary{margin-top:12px;width:100%;min-height:46px;border:1px solid var(--yt-accent);background:var(--yt-accent);color:#181713;border-radius:9px;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.yt-primary:disabled{opacity:.55;cursor:wait}.yt-message{margin-top:10px;font-size:11px;color:#9297a0;line-height:1.5}
        .yt-list{display:grid;gap:8px}.yt-item{border:1px solid var(--yt-line);border-radius:12px;background:rgba(255,255,255,.015);padding:13px}.yt-item-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.yt-rank{font-size:10px;color:#757b84}.yt-item h4{margin:3px 0 0;font-size:14px;letter-spacing:-.02em}.yt-mini{margin-top:6px;color:#8e949e;font-size:11px;line-height:1.55}.yt-score{color:#bfb398;font-size:11px;white-space:nowrap}.yt-copy{display:inline-flex;align-items:center;gap:5px;margin-top:7px;font-size:10px;color:#b8b19f;background:transparent;border:1px solid var(--yt-line);padding:6px 8px;border-radius:7px;cursor:pointer}.yt-output{white-space:pre-wrap;border:1px solid var(--yt-line);border-radius:10px;background:#14161b;padding:14px;color:#d8dadc;font-size:12px;line-height:1.65}.yt-split{display:grid;grid-template-columns:1fr 1fr;gap:10px}.yt-head{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6c727c;font-weight:800;margin:14px 0 7px}.yt-details{border-top:1px solid var(--yt-line);margin-top:15px;padding-top:15px}.yt-details:first-child{border-top:0;margin-top:0;padding-top:0}.yt-timeline{display:grid;gap:7px}.yt-timeline details{border:1px solid var(--yt-line);border-radius:10px;padding:11px;background:rgba(255,255,255,.015)}.yt-timeline summary{cursor:pointer;font-size:11px;font-weight:750}.yt-pre{white-space:pre-wrap;overflow:auto;margin:10px 0 0;border:1px solid var(--yt-line);padding:10px;border-radius:8px;background:#101216;color:#cdd1d6;font-size:10px;max-height:320px}
        @media(max-width:700px){.yt-hero{display:block}.yt-state{margin-top:9px}.yt-steps{display:flex;overflow-x:auto;scrollbar-width:none}.yt-steps::-webkit-scrollbar{display:none}.yt-step{min-width:150px}.yt-panel-body{padding:14px}.yt-form,.yt-split{grid-template-columns:1fr}.yt-primary{position:sticky;bottom:10px;z-index:10;box-shadow:0 10px 30px rgba(0,0,0,.35)}.yt-title{font-size:31px}.yt-item-top{display:block}.yt-score{display:block;margin-top:7px}.yt-output{font-size:11px}}
      `}</style>

      <header className="yt-hero">
        <div><div className="yt-kicker">YouTube Studio</div><h1 className="yt-title">{NICHE.name}</h1><p className="yt-copy">A focused path from audience opportunity to a channel-ready documentary package.</p></div>
        <div className="yt-state">{busy ? "Qwen working locally" : result ? "Package ready" : "Ready"}</div>
      </header>

      <div className="yt-steps">
        {[
          ["brief", "01", "Brief", "Set the job before making content."],
          ["opportunity", "02", "Opportunity", "Rank the ideas worth pursuing."],
          ["package", "03", "Package", "Shape the winning story."],
          ["production", "04", "Production", "Carry the approved story into execution."],
        ].map(([id, number, label, note]) => <button key={id} type="button" className={`yt-step ${openPanel === id ? "active" : ""}`} onClick={() => setOpenPanel(id)}><strong>{number} · {label}</strong><span>{note}</span></button>)}
      </div>

      {openPanel === "brief" && <section className="yt-panel"><div className="yt-panel-head"><div><div className="yt-panel-title">Video brief</div><div className="yt-panel-meta">Define the constraints once. Let Qwen do the strategy work.</div></div></div><div className="yt-panel-body">
        <div className="yt-form">
          <label className="yt-label">Format<select className="yt-field" value={format} onChange={(e) => setFormat(e.target.value)}>{FORMATS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="yt-label">Goal<select className="yt-field" value={goal} onChange={(e) => setGoal(e.target.value)}>{GOALS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="yt-label">Length<select className="yt-field" value={duration} onChange={(e) => setDuration(e.target.value)}>{["8","10","12","15","20"].map((x) => <option key={x}>{x} min</option>)}</select></label>
          <label className="yt-label yt-wide">Topic <textarea className="yt-field yt-area" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Leave blank and Qwen will find the strongest opportunity." /></label>
          <label className="yt-label yt-wide">Direction / references <textarea className="yt-field yt-area" value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="Optional references, constraints or angle." /></label>
        </div>
        <button className="yt-primary" disabled={busy} onClick={generate}>{busy ? "Qwen is building the package…" : "Build the opportunity board"}</button>
        {message && <div className="yt-message">{message}</div>}
      </div></section>}

      {openPanel === "opportunity" && <section className="yt-panel"><div className="yt-panel-head"><div><div className="yt-panel-title">Opportunity board</div><div className="yt-panel-meta">The strongest idea should earn the next screen.</div></div></div><div className="yt-panel-body">
        {!result && <div className="yt-output">Run the brief first. Qwen will rank 8–12 opportunities here, then select the strongest one.</div>}
        {result && <div className="yt-list">{(result.topic_board || []).map((item) => <article key={item.rank} className="yt-item"><div className="yt-item-top"><div><div className="yt-rank">#{item.rank}</div><h4>{item.topic}</h4></div><div className="yt-score">Evidence {item.evidence_strength}</div></div><div className="yt-mini">{item.why_people_click}</div><div className="yt-mini">{item.format_mechanism} · {item.emotional_trigger}</div></article>)}</div>}
      </div></section>}

      {openPanel === "package" && <section className="yt-panel"><div className="yt-panel-head"><div><div className="yt-panel-title">Selected video</div><div className="yt-panel-meta">The winning concept, promise and narrative package.</div></div></div><div className="yt-panel-body">
        {!selected && <div className="yt-output">Once Qwen has selected a story, the complete package will appear here.</div>}
        {selected && <>
          <div className="yt-head">Story</div><h2 style={{margin:"0 0 6px",fontSize:24,letterSpacing:"-.035em"}}>{selected.topic}</h2><div className="yt-mini">{selected.angle}</div>
          <div className="yt-split"><div><div className="yt-head">Format adaptation</div><div className="yt-output">{selected.format_adaptation}</div></div><div><div className="yt-head">Emotional engine</div><div className="yt-output">{selected.emotional_engine}</div></div></div>
          <div className="yt-details"><div className="yt-head">Titles</div><div className="yt-list">{(selected.titles || []).map((x) => <div key={x.rank} className="yt-item"><div className="yt-item-top"><div><div className="yt-rank">#{x.rank}</div><h4>{x.title}</h4></div><button className="yt-copy" onClick={() => copy(x.title)}>Copy</button></div><div className="yt-mini">{x.reason}</div></div>)}</div></div>
          <div className="yt-details"><div className="yt-head">Thumbnails</div><div className="yt-list">{(selected.thumbnails || []).map((x) => <div key={x.rank} className="yt-item"><div className="yt-rank">#{x.rank}</div><h4>{x.text}</h4><div className="yt-mini">{x.composition}</div><div className="yt-mini">{x.reason}</div></div>)}</div></div>
          <div className="yt-details"><div className="yt-head">Opening</div><div className="yt-output">{selected.hook_0_5s}</div></div>
          <div className="yt-details"><div className="yt-head">Script</div><button className="yt-copy" onClick={() => copy(selected.script)}>Copy script</button><div className="yt-output" style={{marginTop:8}}>{selected.script}</div></div>
        </>}
      </div></section>}

      {openPanel === "production" && <section className="yt-panel"><div className="yt-panel-head"><div><div className="yt-panel-title">Production package</div><div className="yt-panel-meta">Everything needed to move from approved story to production.</div></div></div><div className="yt-panel-body">
        {!selected && <div className="yt-output">The production package appears after the story package is generated.</div>}
        {selected && <>
          <div className="yt-head">SEO / upload</div><div className="yt-split"><div className="yt-item"><h4>{selected.seo?.primary_keyword}</h4><div className="yt-mini">{selected.seo?.search_intent}</div><div className="yt-output" style={{marginTop:8}}>{selected.seo?.description}</div></div><div className="yt-item"><div className="yt-head" style={{marginTop:0}}>Tags</div><div className="yt-mini">{(selected.seo?.tags || []).join(", ")}</div><div className="yt-head">Hashtags</div><div className="yt-mini">{(selected.seo?.hashtags || []).join(" ")}</div><div className="yt-head">Pinned comment</div><div className="yt-output">{selected.seo?.pinned_comment}</div></div></div>
          <div className="yt-details"><div className="yt-head">Chapters</div><div className="yt-list">{(selected.chapters || []).map((x) => <div className="yt-item" key={x.time}><b>{x.time}</b><div className="yt-mini">{x.title}</div></div>)}</div></div>
          <div className="yt-details"><div className="yt-head">5-second visual timeline</div><div className="yt-timeline">{(selected.visual_timeline || []).map((item,index) => <details key={`${item.start}-${index}`}><summary>{item.start}s–{item.end}s · {item.type} — {item.visual_objective}</summary><div className="yt-mini">Narration: {item.spoken_support}</div><div className="yt-mini">On-screen: {item.on_screen_text || "—"}</div><pre className="yt-pre">{item.json_prompt}</pre><div className="yt-mini">Flow Labs: {item.flow_motion_note || "None"}</div></details>)}</div></div>
          <div className="yt-details"><div className="yt-head">Quality gate</div><div className="yt-split">{Object.entries(selected.quality_gate || {}).map(([key,value]) => <div className="yt-item" key={key}><b>{key}</b><div className="yt-mini">{value}</div></div>)}</div></div>
          <div className="yt-details"><div className="yt-head">Next stories</div><div className="yt-list">{(result?.next_video_ideas || []).map((item,index) => <div className="yt-item" key={index}><h4>{item.topic}</h4><div className="yt-mini">{item.format_mechanism} · {item.why_follow}</div></div>)}</div></div>
        </>}
      </div></section>}
    </div>
  );
}
