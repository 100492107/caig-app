import React, { useMemo, useState } from "react";
import { supabase } from "./supabase";

const STAGES = ["Discover", "Analyse", "Build", "Multiply", "Publish", "Monetise", "Measure"];
const STAGE_HELP = [
  { label: "Discover", job: "Find what is already winning", do: "Pick a niche. Run discovery. You get ranked topics people already watch." },
  { label: "Analyse", job: "Understand why a winner works", do: "Paste a URL or notes from a strong video. Learn the mechanism. Do not copy it." },
  { label: "Build", job: "Write your stronger original", do: "Turn the mechanism into a full script, titles, thumbnails and shot plan." },
  { label: "Multiply", job: "Cut Shorts from the long piece", do: "Pull short clips that can stand alone on TikTok, Reels and Shorts." },
  { label: "Publish", job: "Send the package to production", do: "Save the approved package, then open Production Studio to render and post." },
  { label: "Monetise", job: "Attach a money test", do: "Pick one route: Fanvue, affiliates, ads, shop. One test, one metric." },
  { label: "Measure", job: "Keep what worked", do: "Record what the audience chose. Feed winners back into the next Discover run." },
];
const OUTPUTS = ["Long-form + Shorts", "Long-form only", "Shorts only"];
const NICHES = ["Gaming", "History", "Chatting / stories", "Documentary", "Business / money", "Technology", "Lifestyle", "Other"];
const SOURCE_BUCKET = "track-b-source-media";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value ?? "").trim();

function parseJson(text) {
  const value = String(text || "").replace(/```json|```/gi, "").trim();
  try { return JSON.parse(value); } catch {}
  const start = value.search(/[\[{]/);
  if (start < 0) throw new Error("Qwen returned invalid JSON.");
  const open = value[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0; let quoted = false; let escaped = false;
  for (let i = start; i < value.length; i += 1) {
    const ch = value[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === open) depth += 1;
    else if (ch === close) { depth -= 1; if (depth === 0) return JSON.parse(value.slice(start, i + 1)); }
  }
  throw new Error("Qwen returned incomplete JSON.");
}

async function api(action, payload = {}) {
  const response = await fetch("/api/queue-update", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

async function waitServerJob(id, setMessage, label = "Qwen") {
  const deadline = Date.now() + 45 * 60 * 1000;
  let lastStatus = "queued";
  while (Date.now() < deadline) {
    const response = await fetch(`/api/queue-update?action=job_status&id=${encodeURIComponent(id)}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `${label} job could not be read.`);
    if (body.status !== lastStatus) { lastStatus = body.status; setMessage(`${label}: ${body.status}…`); }
    if (body.status === "completed") return body.result || "";
    if (body.status === "error") throw new Error(body.error_message || `${label} failed.`);
    await sleep(3000);
  }
  throw new Error(`${label} timed out. Check the local workers.`);
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return <label className="ce-field"><span>{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}

function OutputBlock({ title, children }) {
  return <section className="ce-output"><div className="ce-output-title">{title}</div>{children}</section>;
}

function ProgressStrip({ progress }) {
  const labels = ["Upload", "Ingest", "Frames", "Whisper", "Vision", "Qwen text", "Evidence", "Build", "Publish", "Measure"];
  return <div className="ce-pipeline">{labels.map((label, index) => <div key={label} className={`ce-pipeline-step ${progress >= index ? "done" : ""}`}><span>{String(index + 1).padStart(2, "0")}</span><b>{label}</b></div>)}</div>;
}

export default function ContentEngineWorkspace({ stage = 0 }) {
  const [niche, setNiche] = useState("Gaming");
  const [channel, setChannel] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceNotes, setReferenceNotes] = useState("");
  const [duration, setDuration] = useState("20");
  const [output, setOutput] = useState(OUTPUTS[0]);
  const [direction, setDirection] = useState("");
  const [sourceFile, setSourceFile] = useState(null);
  const [sourcePath, setSourcePath] = useState("");
  const [ingestionJobId, setIngestionJobId] = useState("");
  const [sourceEvidence, setSourceEvidence] = useState(null);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(-1);
  const [savedQueueId, setSavedQueueId] = useState("");
  const activeStage = Math.max(0, Math.min(stage, STAGES.length - 1));
  const selected = result?.selected_video;
  const shorts = useMemo(() => result?.shorts || result?.short_form || [], [result]);

  async function ensureSource() {
    if (!sourceFile) return null;
    if (sourceEvidence) return sourceEvidence;
    if (!sourcePath) {
      setProgress(0); setMessage("Uploading source media…");
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("You must be signed in to upload source media.");
      const safe = sourceFile.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const objectPath = `${userData.user.id}/${crypto.randomUUID()}-${safe}`;
      const { error } = await supabase.storage.from(SOURCE_BUCKET).upload(objectPath, sourceFile, { contentType: sourceFile.type || "application/octet-stream", upsert: false });
      if (error) throw new Error(`Source upload failed: ${error.message}`);
      setSourcePath(objectPath);
      setProgress(1); setMessage("Source uploaded. Starting media ingestion…");
      const queued = await api("queue_media_ingestion", { userId: userData.user.id, objectPath, fileName: sourceFile.name, contentType: sourceFile.type });
      setIngestionJobId(queued.jobId);
      setProgress(2);
    }
    const ingestionRaw = await waitServerJob(ingestionJobId, (text) => { setMessage(text); setProgress(text.includes("processing") ? 3 : 2); }, "Media ingestion");
    const ingestion = typeof ingestionRaw === "string" ? parseJson(ingestionRaw) : ingestionRaw;
    if (!ingestion?.text_analysis_job_id) throw new Error("Media ingestion completed without a Qwen text-analysis handoff.");
    setProgress(4); setMessage("Qwen Vision completed. Running Qwen text narrative analysis…");
    const analysisRaw = await waitServerJob(ingestion.text_analysis_job_id, setMessage, "Qwen text");
    const textAnalysis = typeof analysisRaw === "string" ? parseJson(analysisRaw) : analysisRaw;
    setProgress(6);
    const evidence = { ingestion, text_analysis: textAnalysis };
    setSourceEvidence(evidence);
    return evidence;
  }

  async function run(mode) {
    setBusy(true); setResult(null); setSavedQueueId("");
    try {
      const evidence = sourceFile ? await ensureSource() : null;
      setProgress(sourceFile ? 7 : 6); setMessage(`Preparing ${mode}…`);
      const queued = await api("queue_content_engine", { niche, channel, referenceUrl, referenceNotes, duration, output, direction, sourceAnalysis: evidence });
      setProgress(7); const raw = await waitServerJob(queued.jobId, setMessage, "Content Engine");
      setProgress(8); const parsed = parseJson(raw); setResult(parsed); setMessage("Package ready for review.");
    } catch (error) {
      setMessage(error?.message || String(error)); setProgress(-1);
    } finally { setBusy(false); }
  }

  async function saveToProduction() {
    if (!selected) return;
    setBusy(true); setMessage("Saving approved package to the production queue…");
    try {
      const bestTitle = selected.titles?.[0]?.title || selected.topic || "Track B creative";
      const hashtags = Array.isArray(selected.seo?.hashtags) ? selected.seo.hashtags.join(" ") : "";
      const notes = JSON.stringify({ engine: result.engine, opportunity_board: result.opportunity_board, reference_analysis: result.reference_analysis, selected_video: selected, shorts, publish_plan: result.publish_plan, monetisation_tests: result.monetisation_tests, source_evidence: sourceEvidence });
      const saved = await api("save_content_package", {
        id: `ce-${crypto.randomUUID()}`,
        contentLabel: `Creative Engine · ${bestTitle}`,
        platform: channel || "YouTube",
        hook: selected.hook_0_5s,
        caption: selected.script,
        hashtags,
        cta: selected.seo?.next_video_cta || "",
        photoIdea: selected.thumbnails?.[0]?.composition || "Original editorial thumbnail concept",
        photoDirection: JSON.stringify(selected.visual_timeline || []),
        postType: output,
        notes,
      });
      setSavedQueueId(saved.id); setMessage("Saved to Track B Production. Open Production Studio to render it."); setProgress(9);
    } catch (error) { setMessage(error?.message || String(error)); }
    finally { setBusy(false); }
  }

  const stageAction = [
    () => run("DISCOVER"), () => run("ANALYSE REFERENCE"), () => run("BUILD LONG-FORM"),
    () => run("MULTIPLY INTO SHORTS"), saveToProduction, () => run("MONETISE + TEST"), () => run("MEASURE"),
  ][activeStage];

  function copy(value) { navigator.clipboard?.writeText(String(value || "")).then(() => setMessage("Copied.")); }

  return <div className="ce-shell">
    <style>{`
      .ce-shell{--bg:#101318;--surface:#171a20;--surface2:#11151a;--line:rgba(255,255,255,.075);--text:#f1f1ee;--muted:#9298a2;--accent:#c4b49a;width:100%;color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif}
      .ce-brief{margin:14px 0 0;padding:16px 18px;border:1px solid rgba(196,180,154,.22);border-radius:14px;background:rgba(196,180,154,.06)}.ce-brief h3{margin:0;font-size:14px;letter-spacing:-.02em;color:#e8e2d4}.ce-brief p{margin:8px 0 0;color:#9aa1ab;font-size:12px;line-height:1.55;max-width:70ch}.ce-brief ol{margin:10px 0 0;padding-left:18px;color:#c5c9cf;font-size:12px;line-height:1.55}.ce-brief li{margin:4px 0}.ce-brief strong{color:#e6e2d8}.ce-now{margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);font-size:12px;color:#b8bdc5;line-height:1.5}
      .ce-head{padding:4px 0 18px;border-bottom:1px solid var(--line)}.ce-kicker{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#7e8490;font-weight:850}.ce-title{margin:8px 0 0;font-size:clamp(30px,4vw,48px);line-height:.98;letter-spacing:-.055em;font-weight:820}.ce-sub{max-width:800px;margin:9px 0 0;color:var(--muted);font-size:13px;line-height:1.6}.ce-status{color:#7c837d;font-size:10px}.ce-stagebar{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;margin-top:14px}.ce-stage{border:1px solid var(--line);background:transparent;color:#777e89;border-radius:10px;padding:11px;text-align:left}.ce-stage.active{background:rgba(196,180,154,.08);border-color:rgba(196,180,154,.3);color:#ded8ca}.ce-stage b{display:block;font-size:9px;font-weight:850}.ce-stage small{display:block;margin-top:3px;color:#636974;font-size:8px;line-height:1.35}.ce-grid{display:grid;grid-template-columns:1.08fr .92fr;gap:12px;margin-top:12px}.ce-panel,.ce-output{border:1px solid var(--line);background:var(--surface);border-radius:15px;padding:17px}.ce-panel h2{margin:0;font-size:17px;letter-spacing:-.03em}.ce-panel p{color:var(--muted);font-size:11px;line-height:1.55}.ce-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ce-field{display:grid;gap:6px;font-size:9px;color:#8b919a;font-weight:760}.ce-field input,.ce-field select,.ce-panel textarea{width:100%;min-height:42px;box-sizing:border-box;border:1px solid var(--line);border-radius:9px;background:var(--surface2);color:var(--text);padding:9px 10px;font:inherit}.ce-panel textarea{min-height:110px;resize:vertical}.ce-wide{grid-column:1/-1}.ce-file{border:1px dashed rgba(196,180,154,.25);padding:13px;border-radius:10px;color:#9b9fa7;font-size:10px}.ce-file input{max-width:100%}.ce-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ce-btn{min-height:40px;border:1px solid var(--line);background:var(--surface2);color:#e4e4df;border-radius:9px;padding:9px 12px;font-size:10px;font-weight:820;cursor:pointer}.ce-btn.primary{background:#ded9cd;color:#131516;border-color:#ded9cd}.ce-btn:disabled{opacity:.45;cursor:default}.ce-pipeline{display:grid;grid-template-columns:repeat(10,1fr);gap:5px;margin:12px 0}.ce-pipeline-step{padding:8px 6px;border:1px solid var(--line);border-radius:8px;color:#606671;background:#11151a}.ce-pipeline-step span{font-size:7px;display:block;color:#666c76}.ce-pipeline-step b{font-size:8px;display:block;margin-top:3px}.ce-pipeline-step.done{border-color:rgba(196,180,154,.28);background:rgba(196,180,154,.08);color:#e0d9cb}.ce-result{margin-top:12px;display:grid;gap:10px}.ce-output-title{font-size:9px;text-transform:uppercase;letter-spacing:.15em;color:#7f8690;font-weight:850}.ce-output h3{margin:7px 0 0;font-size:20px;letter-spacing:-.03em}.ce-output p,.ce-output li{color:#c1c5ca;font-size:11px;line-height:1.6}.ce-title-list{display:grid;gap:7px;margin-top:10px}.ce-title-row,.ce-short{border:1px solid var(--line);background:var(--surface2);border-radius:9px;padding:10px}.ce-title-row strong{color:#deded8;font-size:12px}.ce-copy{float:right;min-height:28px;padding:5px 8px;font-size:8px}.ce-script{white-space:pre-wrap;background:var(--surface2);border:1px solid var(--line);border-radius:10px;padding:12px;color:#d9dcdf;font:12px/1.65 -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;max-height:520px;overflow:auto}.ce-short-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}.ce-empty{padding:28px;text-align:center;border:1px dashed var(--line);border-radius:11px;color:#696f79}.ce-footer{margin-top:10px;color:#6f7580;font-size:9px;line-height:1.55}.ce-note{margin-top:9px;color:#6e747f;font-size:10px;line-height:1.5}.ce-source-card{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px;border:1px solid rgba(196,180,154,.18);background:rgba(196,180,154,.045);border-radius:10px;margin-top:10px}.ce-source-dot{width:8px;height:8px;border-radius:50%;background:#c4b49a}.ce-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9px;color:#b5bac2}.ce-success{color:#b9c7bb;font-size:10px}.ce-meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:9px}.ce-meta{padding:9px;border:1px solid var(--line);border-radius:9px;background:var(--surface2)}.ce-list{margin:8px 0 0;padding-left:16px}.ce-publish{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ce-actions-bottom{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.ce-anchor{color:#c4b49a;font-size:11px}
      @media(max-width:900px){.ce-grid,.ce-fields,.ce-stagebar,.ce-pipeline,.ce-short-grid,.ce-publish,.ce-meta-grid{grid-template-columns:1fr}}
    `}</style>

    <div className="ce-head">
      <div>
        <div className="ce-kicker">Track B · owned media engine</div>
        <div className="ce-title">Content Engine</div>
        <p className="ce-sub">This is not a client tool. It builds content for channels you own. Find what already works, rebuild it as original, publish, then monetise the audience.</p>
        <div className="ce-brief">
          <h3>Start here if this screen feels confusing</h3>
          <p>Track A is cash from recovering lost enquiries. Track B is slower money from owned content. Cara and Lila live under <strong>Creators</strong> in the sidebar, not in this engine. Use this engine for YouTube-style research and scripts. Use Creators when the face and voice is Cara or Lila.</p>
          <ol>
            <li><strong>Today money path:</strong> open Creators, pick Cara or Lila, lock a format, queue one package, post it, point Fanvue or an affiliate in the bio.</li>
            <li><strong>This page:</strong> research a niche, analyse a winning video, build a stronger original script, then hand off to Production.</li>
            <li><strong>Do not:</strong> invent demand, copy another creator, or wait for perfect systems before posting.</li>
          </ol>
          <div className="ce-now"><strong>What to do on this stage:</strong> {STAGE_HELP[activeStage].job}. {STAGE_HELP[activeStage].do}</div>
        </div>
      </div>
      <div className="ce-status">{busy ? "Working…" : message || "Ready"}</div>
    </div>

    <div className="ce-stagebar">{STAGES.map((name, index) => <div key={name} className={`ce-stage${index === activeStage ? " active" : ""}`}><b>{String(index + 1).padStart(2, "0")} · {name}</b><small>{STAGE_HELP[index].job}</small></div>)}</div>
    <ProgressStrip progress={progress} />

    <div className="ce-grid">
      <section className="ce-panel">
        <h2>Inputs</h2>
        <p>Fill what you know. Leave blanks if you do not know yet. Discovery still works with niche alone.</p>
        <div className="ce-fields">
          <label className="ce-field"><span>Niche</span><select value={niche} onChange={(e) => setNiche(e.target.value)}>{NICHES.map((x) => <option key={x}>{x}</option>)}</select></label>
          <Input label="Channel / brand" value={channel} onChange={setChannel} placeholder="Optional channel name" />
          <Input label="Reference URL" value={referenceUrl} onChange={setReferenceUrl} placeholder="https://… winning video" />
          <Input label="Duration (min)" value={duration} onChange={setDuration} type="number" />
          <label className="ce-field"><span>Output</span><select value={output} onChange={(e) => setOutput(e.target.value)}>{OUTPUTS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <Input label="Extra direction" value={direction} onChange={setDirection} placeholder="stronger hook, different angle, etc." />
          <label className="ce-field ce-wide"><span>Reference notes / transcript / observations</span><textarea value={referenceNotes} onChange={(e) => setReferenceNotes(e.target.value)} placeholder="Paste useful notes when the reference is not uploaded." /></label>
        </div>
        <div className="ce-file"><input type="file" accept="video/*,audio/*,.txt,.md,.srt,.vtt" onChange={(e) => { setSourceFile(e.target.files?.[0] || null); setSourcePath(""); setIngestionJobId(""); setSourceEvidence(null); setProgress(-1); }} />{sourceFile ? <div style={{marginTop:7}}><strong>{sourceFile.name}</strong> · {Math.round(sourceFile.size / 1024 / 1024 * 10) / 10} MB</div> : <div style={{marginTop:7}}>Optional: upload a reference video/audio/transcript for deeper analysis.</div>}</div>
        {sourceEvidence && <div className="ce-source-card"><div className="ce-source-dot"/><div><div className="ce-mono">{sourceEvidence.ingestion?.metadata?.fileName || sourceFile?.name}</div><div style={{fontSize:9,color:"#969ca5",marginTop:3}}>Source analysis complete</div></div><span className="ce-success">READY</span></div>}
        <div className="ce-actions"><button className="ce-btn" disabled={busy} onClick={() => run("DISCOVER + RANK")}>Run discovery</button><button className="ce-btn" disabled={busy || (!referenceUrl && !referenceNotes && !sourceFile)} onClick={() => run("ANALYSE REFERENCE")}>Analyse reference</button><button className="ce-btn primary" disabled={busy} onClick={stageAction}>{busy ? "Working…" : `Run ${STAGES[activeStage]}`}</button></div>
        {savedQueueId && <div className="ce-footer">Saved production item: <span className="ce-mono">{savedQueueId}</span></div>}
        {message && !busy && <div className="ce-footer">{message}</div>}
      </section>

      <section className="ce-panel">
        <h2>What you get</h2>
        <p>After a run, this side shows ranked opportunities, the script package, Shorts and money tests.</p>
        {!result && <div className="ce-empty">Nothing generated yet. Start with niche + Run discovery, or paste a winning video and Analyse reference.</div>}
        {result && <div className="ce-result">
          {(result.opportunity_board || []).length > 0 && <OutputBlock title="Opportunity board"><div className="ce-title-list">{(result.opportunity_board || []).slice(0, 8).map((row) => <div className="ce-title-row" key={row.rank}><strong>#{row.rank} · {row.topic}</strong><div style={{marginTop:4,color:"#8f96a0",fontSize:10}}>{row.why_now} · {row.decision}</div></div>)}</div></OutputBlock>}
          {selected && <>
            <OutputBlock title="Selected video"><h3>{selected.topic}</h3><p>{selected.angle}</p><p>{selected.why_this_should_work}</p></OutputBlock>
            <OutputBlock title="Titles">{(selected.titles || []).slice(0, 10).map((t) => <div className="ce-title-row" key={t.rank}><button className="ce-btn ce-copy" onClick={() => copy(t.title)}>Copy</button><strong>{t.title}</strong><div style={{marginTop:4,color:"#8f96a0",fontSize:10}}>{t.reason}</div></div>)}</OutputBlock>
            <OutputBlock title="Hook"><p>{selected.hook_0_5s}</p></OutputBlock>
            <OutputBlock title="Script"><button className="ce-btn ce-copy" onClick={() => copy(selected.script)}>Copy script</button><div className="ce-script">{selected.script}</div></OutputBlock>
          </>}
          {shorts.length > 0 && <OutputBlock title={`Shorts · ${shorts.length}`}><div className="ce-short-grid">{shorts.map((clip) => <div className="ce-short" key={`${clip.rank}-${clip.hook}`}><strong style={{fontSize:11}}>#{clip.rank} · {clip.short_title}</strong><div style={{marginTop:6,color:"#c3c7cd",fontSize:10,lineHeight:1.5}}>{clip.hook}</div></div>)}</div></OutputBlock>}
          {(result.monetisation_tests || []).length > 0 && <OutputBlock title="Monetisation tests"><ul className="ce-list">{(result.monetisation_tests || []).map((x, i) => <li key={i}><strong>{x.route}</strong> · {x.test} · {x.metric}</li>)}</ul></OutputBlock>}
          {selected && <OutputBlock title="Production handoff"><div className="ce-actions-bottom"><button className="ce-btn primary" disabled={busy} onClick={saveToProduction}>{savedQueueId ? "Saved to Production" : "Save approved package to Production"}</button></div></OutputBlock>}
        </div>}
      </section>
    </div>
  </div>;
}
