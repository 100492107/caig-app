import React, { useMemo, useState } from "react";
import { supabase } from "./supabase";

const STAGES = ["Discover", "Analyse", "Build", "Multiply", "Publish", "Monetise"];
const OUTPUTS = ["Long-form + Shorts", "Long-form only", "Shorts only"];
const DEFAULT_NICHES = ["Gaming", "History", "Chatting / stories", "Documentary", "Business / money", "Technology", "Lifestyle", "Other"];

function clean(value) { return String(value ?? "").trim(); }
function parseJson(text) {
  const value = String(text || "").replace(/```json|```/gi, "").trim();
  try { return JSON.parse(value); } catch {}
  const start = value.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned invalid JSON.");
  const open = value[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < value.length; i += 1) {
    const ch = value[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return JSON.parse(value.slice(start, i + 1));
    }
  }
  throw new Error("Qwen returned incomplete JSON.");
}

async function queueJob(payload) {
  const response = await fetch("/api/queue-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "queue_content_engine", ...payload }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || "Could not queue Content Engine job.");
  return json.jobId;
}

async function waitJob(id, setMessage) {
  const deadline = Date.now() + 30 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3500));
    const { data, error } = await supabase.from("local_ai_jobs").select("status,result,error_message").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Content Engine job disappeared from the queue.");
    if (data.status === "completed") return data.result || "";
    if (data.status === "error") throw new Error(data.error_message || "Qwen failed.");
    setMessage(`Qwen is working: ${data.status}…`);
  }
  throw new Error("Content Engine timed out. Make sure the local Qwen worker is running.");
}

const SYSTEM = `You are the senior operator of Cornerstone AI Enterprise's Track B Content Intelligence & Production Engine.

MISSION
Find content that is already proving demand, understand why it works, create materially original content that is better suited to the target channel, multiply the idea into short-form derivatives, publish, measure and turn genuine winners into repeatable Creative DNA.

THIS IS AN OWNED-MEDIA ENGINE, NOT A CLIENT-DELIVERY SERVICE.
The system is not waiting for a client brief. It actively searches for demand, selects promising niches and channels, studies public reference content and turns evidence into original production.

CORE LOOP
Discover -> Analyse -> Build -> Multiply -> Publish -> Monetise -> Measure -> repeat.

REFERENCE CONTENT RULE
Reference videos and posts are teachers, not templates. Use them to learn topic demand, audience psychology, narrative mechanisms, pacing, structure, packaging, comments and platform behaviour. Never copy wording, script, narration, footage, music, distinctive thumbnail artwork, branding, creator identity or near-identical scene execution. The final output must stand on its own as materially original content.

SOURCE-QUALITY RULE
Prefer sources with repeated evidence of performance rather than isolated viral outliers. Separate public-web evidence from our own channel analytics. Do not invent view counts, retention, revenue, comments or audience reactions.

CONTENT INTELLIGENCE
For each meaningful reference, identify: topic, audience promise, hook, first 5 seconds, title/thumbnail relationship, story engine, pacing, information density, emotional triggers, curiosity loops, reversals, proof beats, payoff, comment patterns, repeatable format structure, production complexity and obvious weaknesses.

REBUILD RULE
Do not merely paraphrase. Find a stronger original angle, improve the opening, tighten causal storytelling, remove dead time, strengthen escalation, add useful evidence or context, and design a better visual narrative. Where the reference is a story, build a new script architecture from the underlying audience interest rather than rewriting sentences.

LONG-FORM STANDARD
The long-form package should include a selected opportunity, angle, 10 ranked titles, 3 thumbnail concepts, an opening hook, a complete spoken script, chapters, a visual timeline, production notes, SEO/upload package and 5 follow-up ideas.

SHORT-FORM MULTIPLICATION
Every long-form package should yield multiple short-form opportunities. Select the strongest hooks, reveals, contrarian moments, emotional beats and questions. Each clip should have a clear reason to exist as a standalone short, a hook, suggested clip window, title/caption and platform notes. Do not pretend a clip is strong simply because it exists.

CREATOR ASSETS
Cara and Lila are owned creator assets within Track B. They can receive content chosen by evidence and fit their character bibles. TikTok Shop, affiliate offers, Fanvue and other monetisation destinations are downstream assets. Do not force monetisation into content before the audience and creator context support it.

QUALITY GATE
Before returning work, score opportunity strength, audience fit, originality, evidence strength, packaging potential, retention potential, visual potential, production cost and monetisation potential. Reject weak ideas. Use USE / ADAPT / IGNORE for reference formats.

VISUAL ORIGINALITY
Use original visual direction. Broad era or genre references are allowed; proprietary characters, logos, footage and distinctive studio assets are not. The visual plan must match the narration, location, time, action and pacing.

OUTPUT
Return JSON only.`;

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return <label className="ce-field"><span>{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} /></label>;
}

function OutputBlock({ title, children }) {
  return <section className="ce-output"><div className="ce-output-title">{title}</div>{children}</section>;
}

export default function ContentEngineWorkspace({ stage = 0 }) {
  const [niche, setNiche] = useState("Gaming");
  const [channel, setChannel] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceNotes, setReferenceNotes] = useState("");
  const [duration, setDuration] = useState("20");
  const [output, setOutput] = useState(OUTPUTS[0]);
  const [direction, setDirection] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sourceFile, setSourceFile] = useState(null);
  const activeStage = Math.max(0, Math.min(stage, STAGES.length - 1));
  const selected = result?.selected_video;
  const shorts = useMemo(() => result?.shorts || result?.short_form || [], [result]);

  async function run(mode) {
    setBusy(true);
    setResult(null);
    try {
      setMessage(`Preparing ${mode}…`);
      const prompt = `MODE: ${mode}\nNICHE: ${clean(niche)}\nCHANNEL: ${clean(channel) || "Choose the strongest suitable channel concept."}\nREFERENCE URL: ${clean(referenceUrl) || "None provided."}\nREFERENCE NOTES / TRANSCRIPT / OBSERVATIONS: ${clean(referenceNotes) || "None provided. Use current public research and state limitations."}\nTARGET DURATION: ${clean(duration)} minutes\nOUTPUT: ${output}\nEXTRA DIRECTION: ${clean(direction) || "None."}\nSOURCE FILE: ${sourceFile?.name || "None uploaded."}\n\nWORKFLOW REQUIREMENTS\n1. Research current public signals for the target niche and identify the strongest opportunities.\n2. When a reference is provided, analyse its mechanics and weaknesses, but do not copy its creative expression.\n3. Decide USE / ADAPT / IGNORE for the reference mechanism.\n4. Build an original long-form package if the output includes long-form.\n5. Build short-form derivatives if the output includes Shorts.\n6. Explain why the selected package should outperform the reference or current baseline, using testable reasoning rather than promises.\n7. Produce a publication and measurement plan.\n8. Produce monetisation tests appropriate to the selected channel.\n\nReturn exactly this shape:\n{\"engine\":{\"mission\":\"\",\"niche\":\"\",\"channel\":\"\"},\"opportunity_board\":[{\"rank\":1,\"topic\":\"\",\"why_now\":\"\",\"format_mechanism\":\"\",\"evidence_strength\":\"\",\"click_potential\":\"\",\"retention_potential\":\"\",\"visual_potential\":\"\",\"commercial_potential\":\"\",\"decision\":\"USE|ADAPT|IGNORE\"}],\"reference_analysis\":{\"source\":\"\",\"mechanism\":\"\",\"strengths\":[],\"weaknesses\":[],\"what_not_to_copy\":[],\"originality_plan\":\"\"},\"selected_video\":{\"topic\":\"\",\"angle\":\"\",\"emotional_engine\":\"\",\"format_adaptation\":\"\",\"titles\":[{\"rank\":1,\"title\":\"\",\"reason\":\"\"}],\"thumbnails\":[{\"rank\":1,\"text\":\"\",\"composition\":\"\",\"reason\":\"\"}],\"hook_0_5s\":\"\",\"script\":\"\",\"chapters\":[{\"time\":\"\",\"title\":\"\"}],\"visual_timeline\":[{\"start\":0,\"end\":5,\"type\":\"\",\"purpose\":\"\",\"spoken_support\":\"\",\"visual_direction\":\"\",\"motion_note\":\"\"}],\"seo\":{\"primary_keyword\":\"\",\"secondary_keywords\":[],\"description\":\"\",\"tags\":[],\"hashtags\":[],\"chapters\":[],\"pinned_comment\":\"\",\"next_video_cta\":\"\"},\"production_notes\":[],\"quality_gate\":{\"evidence\":\"\",\"originality\":\"\",\"packaging\":\"\",\"retention\":\"\",\"visual\":\"\",\"commercial\":\"\"},\"why_this_should_work\":\"\"},\"shorts\":[{\"rank\":1,\"source_window\":\"\",\"hook\":\"\",\"clip_concept\":\"\",\"short_title\":\"\",\"caption\":\"\",\"cta\":\"\",\"platforms\":[],\"why_it_should_work\":\"\"}],\"publish_plan\":{\"sequence\":[],\"measurement\":[],\"winner_rule\":\"\"},\"monetisation_tests\":[{\"route\":\"\",\"why\":\"\",\"test\":\"\",\"metric\":\"\"}],\"follow_up_ideas\":[{\"topic\":\"\",\"reason\":\"\"}]} `;
      const id = await queueJob({ title: `Track B Content Engine · ${niche} · ${mode}`, systemPrompt: SYSTEM, userPrompt: prompt });
      const parsed = parseJson(await waitJob(id, setMessage));
      setResult(parsed);
      setMessage("Package ready for review.");
    } catch (error) {
      setMessage(error?.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  const stageAction = [
    () => run("DISCOVER"),
    () => run("ANALYSE"),
    () => run("BUILD LONG-FORM"),
    () => run("MULTIPLY INTO SHORTS"),
    () => run("PUBLISH PACKAGE"),
    () => run("MONETISE + TEST"),
  ][activeStage];

  function copy(value) {
    navigator.clipboard?.writeText(String(value || "")).then(() => setMessage("Copied."));
  }

  return <div className="ce-shell">
    <style>{`
      .ce-shell{--ce-bg:#101318;--ce-surface:#171a20;--ce-surface2:#1d2128;--ce-line:rgba(255,255,255,.075);--ce-text:#f1f1ee;--ce-muted:#9298a2;--ce-accent:#c4b49a;width:100%;color:var(--ce-text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif}.ce-head{padding:4px 0 18px;border-bottom:1px solid var(--ce-line);display:flex;justify-content:space-between;gap:22px;align-items:end}.ce-kicker{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#7e8490;font-weight:850}.ce-title{margin:8px 0 0;font-size:clamp(30px,4vw,48px);line-height:.98;letter-spacing:-.055em;font-weight:820}.ce-sub{max-width:760px;margin:9px 0 0;color:var(--ce-muted);font-size:13px;line-height:1.6}.ce-status{color:#7c837d;font-size:10px}.ce-stagebar{display:grid;grid-template-columns:repeat(6,1fr);gap:7px;margin-top:14px}.ce-stage{border:1px solid var(--ce-line);background:transparent;color:#777e89;border-radius:10px;padding:12px;text-align:left}.ce-stage.active{background:rgba(196,180,154,.08);border-color:rgba(196,180,154,.3);color:#ded8ca}.ce-stage b{display:block;font-size:10px;font-weight:850}.ce-stage small{display:block;margin-top:3px;color:#636974;font-size:8px}.ce-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:12px;margin-top:12px}.ce-panel,.ce-output{border:1px solid var(--ce-line);background:var(--ce-surface);border-radius:15px;padding:17px}.ce-panel h2{margin:0;font-size:17px;letter-spacing:-.03em}.ce-panel p{color:var(--ce-muted);font-size:11px;line-height:1.55}.ce-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ce-field{display:grid;gap:6px;font-size:9px;color:#8b919a;font-weight:760}.ce-field input,.ce-field select,.ce-panel textarea{width:100%;min-height:42px;box-sizing:border-box;border:1px solid var(--ce-line);border-radius:9px;background:#11151a;color:var(--ce-text);padding:9px 10px;font:inherit}.ce-panel textarea{min-height:110px;resize:vertical}.ce-wide{grid-column:1/-1}.ce-file{border:1px dashed rgba(196,180,154,.25);padding:13px;border-radius:10px;color:#9b9fa7;font-size:10px}.ce-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ce-btn{min-height:40px;border:1px solid var(--ce-line);background:#11151a;color:#e4e4df;border-radius:9px;padding:9px 12px;font-size:10px;font-weight:820;cursor:pointer}.ce-btn.primary{background:#ded9cd;color:#131516;border-color:#ded9cd}.ce-btn:disabled{opacity:.45;cursor:default}.ce-result{margin-top:12px;display:grid;gap:10px}.ce-output-title{font-size:9px;text-transform:uppercase;letter-spacing:.15em;color:#7f8690;font-weight:850}.ce-output h3{margin:7px 0 0;font-size:20px;letter-spacing:-.03em}.ce-output p,.ce-output li{color:#c1c5ca;font-size:11px;line-height:1.6}.ce-title-list{display:grid;gap:7px;margin-top:10px}.ce-title-row,.ce-short{border:1px solid var(--ce-line);background:#11151a;border-radius:9px;padding:10px}.ce-title-row strong{color:#deded8;font-size:12px}.ce-copy{float:right;min-height:28px;padding:5px 8px;font-size:8px}.ce-script{white-space:pre-wrap;background:#11151a;border:1px solid var(--ce-line);border-radius:10px;padding:12px;color:#d9dcdf;font:12px/1.65 -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;max-height:520px;overflow:auto}.ce-short-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}.ce-empty{padding:28px;text-align:center;border:1px dashed var(--ce-line);border-radius:11px;color:#696f79}.ce-note{margin-top:10px;color:#6e747f;font-size:10px;line-height:1.5}.ce-error{margin-top:10px;color:#d99b9b;font-size:10px}.ce-meter{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px}.ce-meter div{padding:10px;background:#11151a;border:1px solid var(--ce-line);border-radius:9px}.ce-meter span{display:block;color:#6f757d;font-size:8px;text-transform:uppercase;letter-spacing:.11em}.ce-meter b{display:block;margin-top:5px;font-size:16px}.ce-publish{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ce-list{margin:8px 0 0;padding-left:17px}.ce-footer{margin-top:12px;border-top:1px solid var(--ce-line);padding-top:11px;color:#6f7580;font-size:9px;line-height:1.55}@media(max-width:900px){.ce-grid{grid-template-columns:1fr}.ce-stagebar{grid-template-columns:repeat(3,1fr)}}@media(max-width:560px){.ce-fields,.ce-short-grid,.ce-publish{grid-template-columns:1fr}.ce-stagebar{grid-template-columns:repeat(2,1fr)}.ce-head{align-items:start;flex-direction:column}}
    `}</style>
    <header className="ce-head"><div><div className="ce-kicker">Track B · Content Intelligence & Production</div><div className="ce-title">Content Engine</div><p className="ce-sub">Find proven attention. Understand the mechanism. Build an original, stronger version. Turn one long-form idea into a complete content system.</p></div><div className="ce-status">{busy ? "Qwen working" : message || "Ready"}</div></header>
    <div className="ce-stagebar">{STAGES.map((name, index) => <div key={name} className={`ce-stage${index === activeStage ? " active" : ""}`}><b>{String(index + 1).padStart(2, "0")} · {name}</b><small>{["Find demand","Reverse-engineer","Produce","Create derivatives","Ship + measure","Convert attention"][index]}</small></div>)}</div>

    <div className="ce-grid">
      <section className="ce-panel">
        <h2>Source the opportunity</h2>
        <p>Use a niche, channel, successful video, transcript or current signal. A reference can be an existing long-form video. It teaches the system what the audience already responds to. It is not copied.</p>
        <div className="ce-fields">
          <label className="ce-field"><span>Niche</span><select value={niche} onChange={(e) => setNiche(e.target.value)}>{DEFAULT_NICHES.map((x) => <option key={x}>{x}</option>)}</select></label>
          <Input label="Channel / account" value={channel} onChange={setChannel} placeholder="e.g. documentary gaming channel" />
          <Input label="Reference URL" value={referenceUrl} onChange={setReferenceUrl} placeholder="YouTube / TikTok / article URL" />
          <Input label="Target length" value={duration} onChange={setDuration} placeholder="20" />
          <label className="ce-field"><span>Output</span><select value={output} onChange={(e) => setOutput(e.target.value)}>{OUTPUTS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <Input label="Extra direction" value={direction} onChange={setDirection} placeholder="stronger hook, different angle, etc." />
          <label className="ce-field ce-wide"><span>Reference notes / transcript / key observations</span><textarea value={referenceNotes} onChange={(e) => setReferenceNotes(e.target.value)} placeholder="Paste transcript excerpts, notes or the reason this reference is interesting." /></label>
        </div>
        <div className="ce-file"><input type="file" accept="video/*,audio/*,.txt,.md,.srt,.vtt" onChange={(e) => setSourceFile(e.target.files?.[0] || null)} />{sourceFile ? <div style={{ marginTop: 7 }}>Selected: {sourceFile.name}</div> : <div style={{ marginTop: 7 }}>Optional source file. The current text engine uses the supplied notes/transcript as the analysis input; visual frame analysis remains a separate vision pipeline.</div>}</div>
        <div className="ce-actions"><button className="ce-btn" onClick={() => run("DISCOVER + RANK") } disabled={busy}>Run discovery</button><button className="ce-btn" onClick={() => run("ANALYSE REFERENCE") } disabled={busy || (!referenceUrl && !referenceNotes)}>Analyse reference</button><button className="ce-btn primary" onClick={stageAction} disabled={busy}>{busy ? "Working…" : `Run ${STAGES[activeStage]}`}</button></div>
        {message && !busy && <div className="ce-footer">{message}</div>}
      </section>

      <section className="ce-panel">
        <h2>Operating principle</h2>
        <p><strong style={{color:"#e4e2db"}}>We do not start by asking what to make.</strong> We start by asking what people are already choosing to watch.</p>
        <div className="ce-meter"><div><span>Discover</span><b>Demand</b></div><div><span>Analyse</span><b>Mechanism</b></div><div><span>Build</span><b>Original</b></div><div><span>Multiply</span><b>Distribution</b></div></div>
        <div className="ce-footer">Reference content is a source of insight. The final output must use new wording, new narration, new visuals or licensed/source-cleared assets, and a materially new editorial treatment.</div>
      </section>
    </div>

    {!result ? <div className="ce-result"><section className="ce-output"><div className="ce-empty">Run the engine to create an opportunity board and production package.</div></section></div> : <div className="ce-result">
      {result.opportunity_board?.length > 0 && <OutputBlock title="Opportunity board"><div className="ce-title-list">{result.opportunity_board.map((item) => <div className="ce-title-row" key={`${item.rank}-${item.topic}`}><strong>#{item.rank} · {item.topic}</strong><div style={{marginTop:5,color:"#8f96a0",fontSize:10}}>{item.format_mechanism} · {item.decision} · evidence {item.evidence_strength}</div><div style={{marginTop:4,color:"#c1c5ca",fontSize:10,lineHeight:1.5}}>{item.why_now}</div></div>)}</div></OutputBlock>}
      {result.reference_analysis && <OutputBlock title="Reference analysis"><p><strong style={{color:"#e2e3de"}}>Mechanism:</strong> {result.reference_analysis.mechanism}</p><p><strong style={{color:"#e2e3de"}}>Originality plan:</strong> {result.reference_analysis.originality_plan}</p><ul className="ce-list">{(result.reference_analysis.what_not_to_copy||[]).map((x,i) => <li key={i}>{x}</li>)}</ul></OutputBlock>}
      {selected && <>
        <OutputBlock title="Selected long-form package"><h3>{selected.topic}</h3><p><strong style={{color:"#e2e3de"}}>Angle:</strong> {selected.angle}</p><p><strong style={{color:"#e2e3de"}}>Emotional engine:</strong> {selected.emotional_engine}</p><div className="ce-title-list">{(selected.titles||[]).slice(0,10).map((x) => <div className="ce-title-row" key={`${x.rank}-${x.title}`}><button className="ce-btn ce-copy" onClick={() => copy(x.title)}>Copy</button><strong>#{x.rank} · {x.title}</strong><div style={{marginTop:4,color:"#858b94",fontSize:9}}>{x.reason}</div></div>)}</div></OutputBlock>
        <OutputBlock title="Script"><button className="ce-btn ce-copy" onClick={() => copy(selected.script)}>Copy script</button><div className="ce-script">{selected.script}</div></OutputBlock>
        <OutputBlock title="Visual timeline"><ul className="ce-list">{(selected.visual_timeline||[]).slice(0,80).map((shot,i) => <li key={i}><strong>{shot.start}-{shot.end}s</strong> · {shot.purpose} · {shot.visual_direction}</li>)}</ul></OutputBlock>
        <OutputBlock title="Publish + SEO"><p><strong style={{color:"#e2e3de"}}>Primary keyword:</strong> {selected.seo?.primary_keyword}</p><p>{selected.seo?.description}</p><ul className="ce-list">{(selected.seo?.tags||[]).slice(0,20).map((x,i)=><li key={i}>{x}</li>)}</ul></OutputBlock>
      </>}
      {shorts.length > 0 && <OutputBlock title={`Short-form derivatives · ${shorts.length}`}><div className="ce-short-grid">{shorts.map((clip) => <div className="ce-short" key={`${clip.rank}-${clip.hook}`}><strong style={{fontSize:11}}>#{clip.rank} · {clip.short_title}</strong><div style={{marginTop:5,color:"#8f96a0",fontSize:9}}>Source: {clip.source_window}</div><div style={{marginTop:6,color:"#c3c7cd",fontSize:10,lineHeight:1.5}}>{clip.hook}</div><div style={{marginTop:6,color:"#7c838d",fontSize:9}}>{clip.platforms?.join(" · ")}</div></div>)}</div></OutputBlock>}
      <div className="ce-publish"><OutputBlock title="Monetisation tests"><ul className="ce-list">{(result.monetisation_tests||[]).map((x,i)=><li key={i}><strong>{x.route}</strong> · {x.test} · measure {x.metric}</li>)}</ul></OutputBlock><OutputBlock title="Follow-up ideas"><ul className="ce-list">{(result.follow_up_ideas||[]).map((x,i)=><li key={i}><strong>{x.topic}</strong> · {x.reason}</li>)}</ul></OutputBlock></div>
    </div>}
  </div>;
}
