import React, { useMemo, useState } from "react";
import { supabase } from "./supabase";

const STAGES = ["Discover", "Analyse", "Build", "Multiply", "Publish", "Monetise", "Measure"];
const STAGE_HELP = [
  "Pick a niche and run discovery for ranked topics people already watch.",
  "Paste a winning URL (or notes). We extract the mechanism — not a copy.",
  "Turn that mechanism into titles, hook, script and a shot plan.",
  "Pull Shorts that can stand alone on TikTok, Reels and YouTube Shorts.",
  "Save the approved package, then open Production Studio to render and post.",
  "Attach one money test: Fanvue, affiliate, ads or shop. One metric.",
  "Record what the audience chose. Feed winners back into Discover.",
];
const OUTPUTS = ["Long-form + Shorts", "Long-form only", "Shorts only"];
const NICHES = ["Gaming", "History", "Chatting / stories", "Documentary", "Business / money", "Technology", "Lifestyle", "Other"];
const SOURCE_BUCKET = "track-b-source-media";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  throw new Error(`${label} timed out. Start the local Qwen worker on your Mac.`);
}

function Field({ label, children }) {
  return (
    <label className="ce2-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Block({ title, children, action }) {
  return (
    <section className="ce2-block">
      <div className="ce2-block-head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
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
  const [savedQueueId, setSavedQueueId] = useState("");
  const [showMore, setShowMore] = useState(false);
  const activeStage = Math.max(0, Math.min(stage, STAGES.length - 1));
  const selected = result?.selected_video;
  const shorts = useMemo(() => result?.shorts || result?.short_form || [], [result]);
  const hasRef = Boolean(referenceUrl.trim() || referenceNotes.trim() || sourceFile);

  async function ensureSource() {
    if (!sourceFile) return null;
    if (sourceEvidence) return sourceEvidence;
    let path = sourcePath;
    let jobId = ingestionJobId;
    if (!path) {
      setMessage("Uploading source media…");
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("Sign in to upload source media.");
      const safe = sourceFile.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      path = `${userData.user.id}/${crypto.randomUUID()}-${safe}`;
      const { error } = await supabase.storage.from(SOURCE_BUCKET).upload(path, sourceFile, {
        contentType: sourceFile.type || "application/octet-stream",
        upsert: false,
      });
      if (error) throw new Error(`Upload failed: ${error.message}`);
      setSourcePath(path);
      setMessage("Starting media ingestion…");
      const queued = await api("queue_media_ingestion", {
        userId: userData.user.id,
        objectPath: path,
        fileName: sourceFile.name,
        contentType: sourceFile.type,
      });
      jobId = queued.jobId;
      setIngestionJobId(jobId);
    }
    const ingestionRaw = await waitServerJob(jobId, setMessage, "Ingestion");
    const ingestion = typeof ingestionRaw === "string" ? parseJson(ingestionRaw) : ingestionRaw;
    if (!ingestion?.text_analysis_job_id) throw new Error("Ingestion finished without text analysis.");
    setMessage("Running narrative analysis…");
    const analysisRaw = await waitServerJob(ingestion.text_analysis_job_id, setMessage, "Analysis");
    const textAnalysis = typeof analysisRaw === "string" ? parseJson(analysisRaw) : analysisRaw;
    const evidence = { ingestion, text_analysis: textAnalysis };
    setSourceEvidence(evidence);
    return evidence;
  }

  async function run(mode) {
    setBusy(true);
    setResult(null);
    setSavedQueueId("");
    try {
      const evidence = sourceFile ? await ensureSource() : null;
      setMessage(`Running ${mode}…`);
      const queued = await api("queue_content_engine", {
        niche, channel, referenceUrl, referenceNotes, duration, output, direction, sourceAnalysis: evidence,
      });
      const raw = await waitServerJob(queued.jobId, setMessage, "Content Engine");
      const parsed = parseJson(raw);
      setResult(parsed);
      setMessage("Package ready.");
    } catch (error) {
      setMessage(error?.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveToProduction() {
    if (!selected) return;
    setBusy(true);
    setMessage("Saving to production…");
    try {
      const bestTitle = selected.titles?.[0]?.title || selected.topic || "Content package";
      const hashtags = Array.isArray(selected.seo?.hashtags) ? selected.seo.hashtags.join(" ") : "";
      const notes = JSON.stringify({
        engine: result.engine,
        opportunity_board: result.opportunity_board,
        reference_analysis: result.reference_analysis,
        selected_video: selected,
        shorts,
        publish_plan: result.publish_plan,
        monetisation_tests: result.monetisation_tests,
        source_evidence: sourceEvidence,
      });
      const saved = await api("save_content_package", {
        id: `ce-${crypto.randomUUID()}`,
        contentLabel: `Content Engine · ${bestTitle}`,
        platform: channel || "YouTube",
        hook: selected.hook_0_5s,
        caption: selected.script,
        hashtags,
        cta: selected.seo?.next_video_cta || "",
        photoIdea: selected.thumbnails?.[0]?.composition || "Editorial thumbnail",
        photoDirection: JSON.stringify(selected.visual_timeline || []),
        postType: output,
        notes,
      });
      setSavedQueueId(saved.id);
      setMessage("Saved. Open Production Studio to render.");
    } catch (error) {
      setMessage(error?.message || String(error));
    } finally {
      setBusy(false);
    }
  }

  const stageAction = [
    () => run("DISCOVER"),
    () => run("ANALYSE REFERENCE"),
    () => run("BUILD LONG-FORM"),
    () => run("MULTIPLY INTO SHORTS"),
    saveToProduction,
    () => run("MONETISE + TEST"),
    () => run("MEASURE"),
  ][activeStage];

  const primaryLabel = [
    "Discover topics",
    "Analyse this winner",
    "Build package",
    "Multiply into Shorts",
    "Save to Production",
    "Suggest money tests",
    "Summarise learnings",
  ][activeStage];

  const primaryDisabled =
    busy ||
    (activeStage === 1 && !hasRef) ||
    (activeStage === 4 && !selected);

  function copy(value) {
    navigator.clipboard?.writeText(String(value || "")).then(() => setMessage("Copied."));
  }

  return (
    <div className="ce2">
      <style>{`
        .ce2{--ink:#0e1014;--panel:#161922;--panel2:#12151c;--line:rgba(255,255,255,.08);--text:#f3f1eb;--muted:#9a9faa;--soft:#6e7582;--gold:#d4b56a;--gold-soft:rgba(212,181,106,.12);--ok:#7fa48a;width:100%;color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif}
        .ce2-hero{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:18px}
        .ce2-kicker{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);font-weight:800}
        .ce2-title{margin:8px 0 0;font-size:clamp(28px,4vw,40px);line-height:1;letter-spacing:-.04em;font-weight:850}
        .ce2-help{margin:10px 0 0;max-width:52ch;color:var(--muted);font-size:14px;line-height:1.5}
        .ce2-stage-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;border:1px solid rgba(212,181,106,.28);background:var(--gold-soft);color:#efe3c4;font-size:11px;font-weight:750}
        .ce2-stage-pill b{color:var(--gold)}
        .ce2-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
        @media(max-width:960px){.ce2-grid{grid-template-columns:1fr}}
        .ce2-card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:18px}
        .ce2-card h2{margin:0;font-size:15px;font-weight:800;letter-spacing:-.02em}
        .ce2-card > p{margin:6px 0 0;color:var(--soft);font-size:12px;line-height:1.45}
        .ce2-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
        @media(max-width:700px){.ce2-fields{grid-template-columns:1fr}}
        .ce2-field{display:grid;gap:6px;min-width:0}
        .ce2-field span{font-size:11px;font-weight:700;color:#c4c8d0}
        .ce2-field input,.ce2-field select,.ce2-field textarea{
          width:100%;min-height:46px;padding:11px 13px;border-radius:12px;border:1px solid var(--line);
          background:var(--panel2);color:var(--text);font:inherit;font-size:14px;outline:none
        }
        .ce2-field textarea{min-height:96px;resize:vertical;line-height:1.45}
        .ce2-field input:focus,.ce2-field select:focus,.ce2-field textarea:focus{border-color:rgba(212,181,106,.45);box-shadow:0 0 0 3px rgba(212,181,106,.08)}
        .ce2-url input{font-size:15px;min-height:52px;border-color:rgba(212,181,106,.22)}
        .ce2-file{margin-top:12px;padding:12px 14px;border-radius:12px;border:1px dashed rgba(255,255,255,.12);color:var(--soft);font-size:12px}
        .ce2-file input{margin-top:8px;width:100%;color:var(--muted)}
        .ce2-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;align-items:center}
        .ce2-btn{min-height:46px;padding:0 16px;border-radius:12px;border:1px solid var(--line);background:var(--panel2);color:#e8e6df;font:inherit;font-size:13px;font-weight:750;cursor:pointer}
        .ce2-btn:disabled{opacity:.45;cursor:default}
        .ce2-btn.primary{background:var(--gold);border-color:var(--gold);color:#1a160e;font-weight:850;box-shadow:0 8px 24px rgba(212,181,106,.18)}
        .ce2-btn.primary:hover:not(:disabled){filter:brightness(1.05)}
        .ce2-status{margin-top:12px;font-size:12px;color:var(--muted);min-height:18px}
        .ce2-status.error{color:#d4a0a0}
        .ce2-status.ok{color:var(--ok)}
        .ce2-empty{padding:36px 18px;text-align:center;border:1px dashed rgba(255,255,255,.1);border-radius:14px;color:var(--soft)}
        .ce2-empty strong{display:block;color:#ddd9ce;font-size:15px;margin-bottom:6px}
        .ce2-empty p{margin:0 auto;max-width:36ch;font-size:13px;line-height:1.5}
        .ce2-block{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
        .ce2-block:first-child{margin-top:0;padding-top:0;border-top:0}
        .ce2-block-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}
        .ce2-block h3{margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--soft);font-weight:800}
        .ce2-row{padding:12px 13px;border-radius:12px;border:1px solid var(--line);background:var(--panel2);margin-top:8px}
        .ce2-row strong{display:block;font-size:13px;color:#f0eee8}
        .ce2-row span{display:block;margin-top:4px;font-size:12px;color:var(--soft);line-height:1.4}
        .ce2-script{margin-top:8px;white-space:pre-wrap;max-height:320px;overflow:auto;padding:12px;border-radius:12px;background:var(--panel2);border:1px solid var(--line);font-size:13px;line-height:1.55;color:#dcd9d0}
        .ce2-shorts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
        @media(max-width:700px){.ce2-shorts{grid-template-columns:1fr}}
        .ce2-more{margin-top:8px;background:none;border:0;color:var(--gold);font:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:0}
      `}</style>

      <div className="ce2-hero">
        <div>
          <div className="ce2-kicker">Stage {String(activeStage + 1).padStart(2, "0")} · {STAGES[activeStage]}</div>
          <h1 className="ce2-title">{STAGES[activeStage]}</h1>
          <p className="ce2-help">{STAGE_HELP[activeStage]}</p>
        </div>
        <div className="ce2-stage-pill">
          <b>{STAGES[activeStage]}</b>
          <span>of 7</span>
        </div>
      </div>

      <div className="ce2-grid">
        <section className="ce2-card">
          <h2>What are we working from?</h2>
          <p>Start with a winning URL when you can. Niche alone is enough for Discover.</p>

          <div className="ce2-fields">
            <Field label="Winning video or channel URL">
              <div className="ce2-url">
                <input
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=…"
                  autoComplete="off"
                />
              </div>
            </Field>
            <Field label="Niche">
              <select value={niche} onChange={(e) => setNiche(e.target.value)}>
                {NICHES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>

            {(showMore || activeStage >= 2) && (
              <>
                <Field label="Channel / brand">
                  <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Optional" />
                </Field>
                <Field label="Duration (min)">
                  <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </Field>
                <Field label="Output">
                  <select value={output} onChange={(e) => setOutput(e.target.value)}>
                    {OUTPUTS.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </Field>
                <Field label="Extra direction">
                  <input value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="Stronger hook, different angle…" />
                </Field>
                <Field label="Notes / transcript">
                  <textarea value={referenceNotes} onChange={(e) => setReferenceNotes(e.target.value)} placeholder="Optional notes if you cannot upload the video" />
                </Field>
              </>
            )}
          </div>

          {!showMore && activeStage < 2 && (
            <button type="button" className="ce2-more" onClick={() => setShowMore(true)}>
              More options
            </button>
          )}

          <div className="ce2-file">
            <div>Optional upload for deeper analysis</div>
            <input
              type="file"
              accept="video/*,audio/*,.txt,.md,.srt,.vtt"
              onChange={(e) => {
                setSourceFile(e.target.files?.[0] || null);
                setSourcePath("");
                setIngestionJobId("");
                setSourceEvidence(null);
              }}
            />
            {sourceFile && <div style={{ marginTop: 8, color: "#d8d4c8" }}>{sourceFile.name}</div>}
          </div>

          <div className="ce2-actions">
            <button type="button" className="ce2-btn primary" disabled={primaryDisabled} onClick={stageAction}>
              {busy ? "Working…" : `${primaryLabel} →`}
            </button>
            {activeStage !== 1 && hasRef && (
              <button type="button" className="ce2-btn" disabled={busy} onClick={() => run("ANALYSE REFERENCE")}>
                Analyse URL
              </button>
            )}
          </div>
          <div className={`ce2-status${message.toLowerCase().includes("fail") || message.toLowerCase().includes("error") || message.toLowerCase().includes("timeout") ? " error" : message.includes("ready") || message.includes("Saved") ? " ok" : ""}`}>
            {busy ? message || "Working…" : message || (activeStage === 1 && !hasRef ? "Paste a URL to analyse." : "Ready when you are.")}
          </div>
        </section>

        <section className="ce2-card">
          <h2>Package</h2>
          <p>Results land here after a run.</p>

          {!result && (
            <div className="ce2-empty" style={{ marginTop: 18 }}>
              <strong>No package yet</strong>
              <p>
                {activeStage === 0
                  ? "Choose a niche and press Discover topics."
                  : activeStage === 1
                    ? "Paste a winning URL and press Analyse this winner."
                    : "Run this stage to fill the package."}
              </p>
            </div>
          )}

          {result && (
            <div>
              {(result.opportunity_board || []).length > 0 && (
                <Block title="Opportunities">
                  {(result.opportunity_board || []).slice(0, 5).map((row) => (
                    <div className="ce2-row" key={row.rank}>
                      <strong>#{row.rank} · {row.topic}</strong>
                      <span>{row.why_now}</span>
                    </div>
                  ))}
                </Block>
              )}

              {selected && (
                <>
                  <Block title="Angle">
                    <div className="ce2-row">
                      <strong>{selected.topic}</strong>
                      <span>{selected.angle || selected.why_this_should_work}</span>
                    </div>
                  </Block>
                  {(selected.titles || []).length > 0 && (
                    <Block title="Titles" action={<button type="button" className="ce2-btn" style={{ minHeight: 34, fontSize: 11 }} onClick={() => copy(selected.titles[0].title)}>Copy top</button>}>
                      {(selected.titles || []).slice(0, 5).map((t) => (
                        <div className="ce2-row" key={t.rank}>
                          <strong>{t.title}</strong>
                          <span>{t.reason}</span>
                        </div>
                      ))}
                    </Block>
                  )}
                  {selected.hook_0_5s && (
                    <Block title="Hook">
                      <div className="ce2-row"><strong>{selected.hook_0_5s}</strong></div>
                    </Block>
                  )}
                  {selected.script && (
                    <Block title="Script" action={<button type="button" className="ce2-btn" style={{ minHeight: 34, fontSize: 11 }} onClick={() => copy(selected.script)}>Copy</button>}>
                      <div className="ce2-script">{selected.script}</div>
                    </Block>
                  )}
                </>
              )}

              {shorts.length > 0 && (
                <Block title={`Shorts · ${shorts.length}`}>
                  <div className="ce2-shorts">
                    {shorts.map((clip) => (
                      <div className="ce2-row" key={`${clip.rank}-${clip.hook}`}>
                        <strong>#{clip.rank} · {clip.short_title || "Short"}</strong>
                        <span>{clip.hook}</span>
                      </div>
                    ))}
                  </div>
                </Block>
              )}

              {(result.monetisation_tests || []).length > 0 && (
                <Block title="Money tests">
                  {(result.monetisation_tests || []).map((x, i) => (
                    <div className="ce2-row" key={i}>
                      <strong>{x.route}</strong>
                      <span>{x.test} · {x.metric}</span>
                    </div>
                  ))}
                </Block>
              )}

              {selected && (
                <div className="ce2-actions">
                  <button type="button" className="ce2-btn primary" disabled={busy} onClick={saveToProduction}>
                    {savedQueueId ? "Saved to Production" : "Save to Production →"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
