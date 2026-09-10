import React, { useMemo, useState } from "react";
import { supabase } from "./supabase";

const NICHES = ["Gaming", "History", "Stories", "Documentary", "Business / money", "Technology", "Lifestyle", "Other"];
const SOURCE_BUCKET = "track-b-source-media";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseJson(text) {
  const value = String(text || "").replace(/```json|```/gi, "").trim();
  try { return JSON.parse(value); } catch {}
  const start = value.search(/[\[{]/);
  if (start < 0) throw new Error("Could not parse the AI response. Try again.");
  const open = value[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0, quoted = false, escaped = false;
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
  throw new Error("Incomplete AI response.");
}

async function api(action, payload = {}) {
  const response = await fetch("/api/queue-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

async function waitServerJob(id, setMessage, label = "Engine") {
  const deadline = Date.now() + 45 * 60 * 1000;
  let last = "queued";
  while (Date.now() < deadline) {
    const response = await fetch(`/api/queue-update?action=job_status&id=${encodeURIComponent(id)}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `${label} could not be read.`);
    if (body.status !== last) {
      last = body.status;
      setMessage(`${label}: ${body.status}…`);
    }
    if (body.status === "completed") return body.result || "";
    if (body.status === "error") throw new Error(body.error_message || `${label} failed.`);
    await sleep(3000);
  }
  throw new Error("Timed out. Start the local Qwen worker on your Mac, then try again.");
}

export default function ContentEngineWorkspace() {
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("Gaming");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [savedId, setSavedId] = useState("");
  const [step, setStep] = useState("input");

  const selected = result?.selected_video;
  const shorts = useMemo(() => result?.shorts || result?.short_form || [], [result]);
  const canRun = Boolean(url.trim() || notes.trim() || file);

  async function run() {
    if (!canRun) {
      setMessage("Paste a winning video URL (or notes) first.");
      return;
    }
    setBusy(true);
    setStep("working");
    setResult(null);
    setSavedId("");
    setMessage("Building your package…");
    try {
      let evidence = null;
      if (file) {
        setMessage("Uploading reference…");
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) throw new Error("Sign in to upload media.");
        const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
        const objectPath = `${userData.user.id}/${crypto.randomUUID()}-${safe}`;
        const { error } = await supabase.storage.from(SOURCE_BUCKET).upload(objectPath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        if (error) throw new Error(error.message);
        setMessage("Analysing media…");
        const queuedIngest = await api("queue_media_ingestion", {
          userId: userData.user.id,
          objectPath,
          fileName: file.name,
          contentType: file.type,
        });
        const ingestionRaw = await waitServerJob(queuedIngest.jobId, setMessage, "Ingest");
        const ingestion = typeof ingestionRaw === "string" ? parseJson(ingestionRaw) : ingestionRaw;
        if (ingestion?.text_analysis_job_id) {
          const analysisRaw = await waitServerJob(ingestion.text_analysis_job_id, setMessage, "Analysis");
          evidence = {
            ingestion,
            text_analysis: typeof analysisRaw === "string" ? parseJson(analysisRaw) : analysisRaw,
          };
        }
      }
      setMessage("Writing original package + Shorts…");
      const queued = await api("queue_content_engine", {
        niche,
        channel: "",
        referenceUrl: url,
        referenceNotes: notes,
        duration: "20",
        output: "Long-form + Shorts",
        direction: "Stronger original. Mechanism only — never copy script, identity, or packaging.",
        sourceAnalysis: evidence,
      });
      const raw = await waitServerJob(queued.jobId, setMessage, "Package");
      setResult(parseJson(raw));
      setStep("result");
      setMessage("Package ready.");
    } catch (e) {
      setMessage(e?.message || String(e));
      setStep("input");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    setMessage("Saving to studio…");
    try {
      const bestTitle = selected.titles?.[0]?.title || selected.topic || "Package";
      const hashtags = Array.isArray(selected.seo?.hashtags) ? selected.seo.hashtags.join(" ") : "";
      const saved = await api("save_content_package", {
        id: `ce-${crypto.randomUUID()}`,
        contentLabel: `Remake · ${bestTitle}`,
        platform: "YouTube",
        hook: selected.hook_0_5s,
        caption: selected.script,
        hashtags,
        cta: selected.seo?.next_video_cta || "",
        photoIdea: selected.thumbnails?.[0]?.composition || "",
        photoDirection: JSON.stringify(selected.visual_timeline || []),
        postType: "Long-form + Shorts",
        notes: JSON.stringify({ selected_video: selected, shorts, reference_analysis: result?.reference_analysis }),
      });
      setSavedId(saved.id);
      setMessage("Saved to Studio. Open Studio to render.");
    } catch (e) {
      setMessage(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function copy(v) {
    navigator.clipboard?.writeText(String(v || "")).then(() => setMessage("Copied."));
  }

  return (
    <div className="rm">
      <style>{`
        .rm{max-width:720px;margin:0 auto;color:#f3f1eb;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif}
        .rm-kicker{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#d4b56a;font-weight:800}
        .rm-title{margin:8px 0 0;font-size:clamp(28px,4vw,40px);line-height:1.02;letter-spacing:-.04em;font-weight:850}
        .rm-sub{margin:10px 0 0;color:#9a9faa;font-size:15px;line-height:1.5}
        .rm-card{margin-top:22px;padding:22px;border-radius:20px;border:1px solid rgba(255,255,255,.08);background:#161922}
        .rm-label{display:block;font-size:12px;font-weight:750;color:#c4c8d0;margin-bottom:8px}
        .rm-input{width:100%;min-height:52px;padding:14px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:#0f1218;color:#f3f1eb;font:inherit;font-size:15px;outline:none;box-sizing:border-box}
        .rm-input:focus{border-color:rgba(212,181,106,.45)}
        .rm-row{display:grid;grid-template-columns:1fr 140px;gap:10px;margin-top:12px}
        @media(max-width:600px){.rm-row{grid-template-columns:1fr}}
        .rm-notes{margin-top:12px}
        .rm-notes textarea{min-height:88px;resize:vertical;line-height:1.45}
        .rm-file{margin-top:12px;font-size:12px;color:#8b919c}
        .rm-file input{margin-top:6px;width:100%}
        .rm-cta{margin-top:18px;width:100%;min-height:52px;border:0;border-radius:14px;background:#d4b56a;color:#1a160e;font:inherit;font-size:15px;font-weight:850;cursor:pointer;box-shadow:0 10px 28px rgba(212,181,106,.2)}
        .rm-cta:disabled{opacity:.5;cursor:default}
        .rm-status{margin-top:12px;font-size:13px;color:#9a9faa;min-height:20px}
        .rm-status.err{color:#d4a0a0}.rm-status.ok{color:#8fb597}
        .rm-steps{display:flex;gap:8px;margin-top:18px;flex-wrap:wrap}
        .rm-steps span{padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.08);font-size:11px;color:#7a818c}
        .rm-steps span.on{border-color:rgba(212,181,106,.35);color:#e8d9b0;background:rgba(212,181,106,.1)}
        .rm-doc{margin-top:22px}
        .rm-section{margin-top:18px;padding-top:18px;border-top:1px solid rgba(255,255,255,.07)}
        .rm-section h3{margin:0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7a818c;font-weight:800}
        .rm-block{margin-top:10px;padding:14px 16px;border-radius:14px;background:#0f1218;border:1px solid rgba(255,255,255,.07)}
        .rm-block strong{display:block;font-size:15px;color:#f0eee8;line-height:1.35}
        .rm-block p,.rm-block span{display:block;margin-top:6px;font-size:13px;color:#9a9faa;line-height:1.5}
        .rm-script{margin-top:10px;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#ddd9d0;max-height:360px;overflow:auto}
        .rm-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
        .rm-btn{min-height:40px;padding:0 14px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:#12151c;color:#e8e6df;font:inherit;font-size:12px;font-weight:750;cursor:pointer}
        .rm-btn.primary{background:#d4b56a;border-color:#d4b56a;color:#1a160e;font-weight:850}
        .rm-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
        @media(max-width:600px){.rm-grid2{grid-template-columns:1fr}}
      `}</style>

      <div className="rm-kicker">Remake a winner</div>
      <h1 className="rm-title">Paste something that already works</h1>
      <p className="rm-sub">
        Like Opus or CapCut: one input, one package. We analyse why it wins, then write your stronger original plus Shorts — not a copy.
      </p>

      {step !== "result" && (
        <div className="rm-card">
          <label className="rm-label">Winning video or channel URL</label>
          <input className="rm-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" autoFocus />
          <div className="rm-row">
            <div>
              <label className="rm-label">Niche</label>
              <select className="rm-input" value={niche} onChange={(e) => setNiche(e.target.value)}>
                {NICHES.map((n) => (<option key={n}>{n}</option>))}
              </select>
            </div>
          </div>
          <div className="rm-notes">
            <label className="rm-label">Notes (optional)</label>
            <textarea className="rm-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What stood out? Audience? Angle you want to beat?" />
          </div>
          <div className="rm-file">
            Optional: upload the video for deeper analysis
            <input type="file" accept="video/*,audio/*,.txt,.md" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && <div style={{ marginTop: 6, color: "#d8d4c8" }}>{file.name}</div>}
          </div>
          <button type="button" className="rm-cta" disabled={busy || !canRun} onClick={run}>
            {busy ? "Working…" : "Build package →"}
          </button>
          <div className={`rm-status${/fail|error|timeout/i.test(message) ? " err" : /ready|Saved/i.test(message) ? " ok" : ""}`}>
            {message || "Takes a minute while local AI runs."}
          </div>
          <div className="rm-steps">
            <span className={step === "input" ? "on" : ""}>1 · Reference</span>
            <span className={step === "working" ? "on" : ""}>2 · Analyse & write</span>
            <span className={step === "result" ? "on" : ""}>3 · Package</span>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="rm-doc">
          <div className="rm-steps">
            <span>1 · Reference</span>
            <span>2 · Analyse & write</span>
            <span className="on">3 · Package</span>
          </div>
          {selected && (<>
            <div className="rm-section"><h3>Your angle</h3><div className="rm-block"><strong>{selected.topic}</strong><p>{selected.angle || selected.why_this_should_work}</p></div></div>
            {(selected.titles || []).length > 0 && (
              <div className="rm-section"><h3>Titles</h3>
                {(selected.titles || []).slice(0, 5).map((t) => (
                  <div className="rm-block" key={t.rank}><strong>{t.title}</strong><span>{t.reason}</span></div>
                ))}
              </div>
            )}
            {selected.hook_0_5s && (<div className="rm-section"><h3>Hook</h3><div className="rm-block"><strong>{selected.hook_0_5s}</strong></div></div>)}
            {selected.script && (
              <div className="rm-section"><h3>Script</h3><div className="rm-block"><div className="rm-script">{selected.script}</div>
                <div className="rm-actions"><button type="button" className="rm-btn" onClick={() => copy(selected.script)}>Copy script</button></div>
              </div></div>
            )}
          </>)}
          {shorts.length > 0 && (
            <div className="rm-section"><h3>Shorts · {shorts.length}</h3>
              <div className="rm-grid2">{shorts.map((c) => (
                <div className="rm-block" key={`${c.rank}-${c.hook}`}><strong>#{c.rank} · {c.short_title || "Short"}</strong><span>{c.hook}</span></div>
              ))}</div>
            </div>
          )}
          {(result.monetisation_tests || []).length > 0 && (
            <div className="rm-section"><h3>Money tests</h3>
              {(result.monetisation_tests || []).map((x, i) => (
                <div className="rm-block" key={i}><strong>{x.route}</strong><span>{x.test} · {x.metric}</span></div>
              ))}
            </div>
          )}
          <div className="rm-actions" style={{ marginTop: 22 }}>
            <button type="button" className="rm-btn primary" disabled={busy || !selected} onClick={save}>{savedId ? "Saved to Studio" : "Save to Studio →"}</button>
            <button type="button" className="rm-btn" onClick={() => { setStep("input"); setResult(null); setMessage(""); }}>New remake</button>
          </div>
          <div className={`rm-status${/fail|error/i.test(message) ? " err" : /Saved|ready/i.test(message) ? " ok" : ""}`}>{message}</div>
        </div>
      )}
    </div>
  );
}
