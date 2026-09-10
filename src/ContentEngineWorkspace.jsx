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

async function localAiOnline() {
  try {
    const { data } = await supabase
      .from("local_ai_worker_heartbeat")
      .select("status,last_seen")
      .eq("id", "qwen")
      .maybeSingle();
    if (!data?.last_seen) return false;
    return Date.now() - new Date(data.last_seen).getTime() < 20000;
  } catch {
    return false;
  }
}

export default function ContentEngineWorkspace({ onGo } = {}) {
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
  const analysis = result?.reference_analysis;

  async function run() {
    if (!canRun) {
      setMessage("Paste a winning video URL (or notes) first.");
      return;
    }
    const online = await localAiOnline();
    if (!online) {
      setMessage("Local AI offline. On your Mac run: bash scripts/start-local-ai-stack.sh");
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
        direction: "Stronger original. Mechanism only. Never copy script, identity, or packaging.",
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
      setMessage("Saved to cloud Studio (content_queue). Open Studio to render.");
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
        .rm{max-width:820px;margin:0 auto;color:#f3f1eb;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif;position:relative}
        .rm *,.rm *::before,.rm *::after{box-sizing:border-box}
        .rm::before{content:"";position:absolute;inset:-30px -15% auto;height:220px;background:radial-gradient(ellipse 60% 80% at 20% 0%,rgba(212,181,106,.12),transparent 70%);pointer-events:none}
        .rm > *{position:relative}
        .rm-kicker{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#d4b56a;font-weight:800}
        .rm-title{margin:10px 0 0;font-size:clamp(30px,4.5vw,44px);line-height:1.02;letter-spacing:-.045em;font-weight:860;color:#f6f4ef}
        .rm-sub{margin:12px 0 0;color:#9a9faa;font-size:15px;line-height:1.55;max-width:52ch}
        .rm-progress{display:flex;gap:0;margin-top:22px;border-radius:999px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:#12151c}
        .rm-progress span{flex:1;text-align:center;padding:10px 8px;font-size:11px;font-weight:750;color:#6e7582;border-right:1px solid rgba(255,255,255,.06)}
        .rm-progress span:last-child{border-right:0}
        .rm-progress span.on{background:rgba(212,181,106,.14);color:#e8d9b0}
        .rm-progress span.done{color:#a8b09a}
        .rm-card{margin-top:20px;padding:26px;border-radius:24px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,#191c26,#14171f);box-shadow:0 24px 60px rgba(0,0,0,.25)}
        .rm-label{display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#a8aeb8;margin-bottom:8px}
        .rm-input{width:100%;min-height:54px;padding:14px 16px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:#0c0e14;color:#f3f1eb;font:inherit;font-size:15px;outline:none}
        .rm-input:focus{border-color:rgba(212,181,106,.5);box-shadow:0 0 0 3px rgba(212,181,106,.1)}
        .rm-row{display:grid;grid-template-columns:1fr;gap:14px;margin-top:14px}
        .rm-notes textarea{min-height:96px;resize:vertical;line-height:1.5}
        .rm-file{margin-top:14px;padding:14px 16px;border-radius:14px;border:1px dashed rgba(255,255,255,.12);background:rgba(255,255,255,.02);font-size:12px;color:#8b919c}
        .rm-file input{margin-top:8px;width:100%;color:#c4c8d0}
        .rm-cta{margin-top:20px;width:100%;min-height:54px;border:0;border-radius:14px;background:linear-gradient(180deg,#e0c87a,#d4b56a);color:#1a160e;font:inherit;font-size:15px;font-weight:850;cursor:pointer;box-shadow:0 12px 32px rgba(212,181,106,.28)}
        .rm-cta:disabled{opacity:.5;cursor:default;box-shadow:none}
        .rm-status{margin-top:14px;font-size:13px;color:#9a9faa;min-height:20px}
        .rm-status.err{color:#d4a0a0}
        .rm-hint{margin-top:18px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
        @media(max-width:640px){.rm-hint{grid-template-columns:1fr}}
        .rm-hint div{padding:12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}
        .rm-hint b{display:block;font-size:11px;color:#e0dccf;font-weight:800}
        .rm-hint span{display:block;margin-top:4px;font-size:11px;color:#7a818c;line-height:1.4}
        .rm-hero-result{margin-top:18px;padding:22px 24px;border-radius:20px;border:1px solid rgba(212,181,106,.28);background:linear-gradient(135deg,rgba(212,181,106,.14),#161922 60%)}
        .rm-hero-result strong{display:block;font-size:22px;letter-spacing:-.03em;color:#f3e7c8;line-height:1.25}
        .rm-hero-result p{margin:10px 0 0;color:#cfc3a4;font-size:14px;line-height:1.5}
        .rm-section{margin-top:22px}
        .rm-section h3{margin:0 0 12px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6e7582;font-weight:800}
        .rm-block{margin-top:8px;padding:16px 18px;border-radius:16px;background:#12151c;border:1px solid rgba(255,255,255,.07)}
        .rm-block strong{display:block;font-size:15px;color:#f0eee8;line-height:1.35}
        .rm-block p,.rm-block span{display:block;margin-top:6px;font-size:13px;color:#9a9faa;line-height:1.5}
        .rm-script{margin-top:10px;white-space:pre-wrap;font-size:14px;line-height:1.65;color:#ddd9d0;max-height:380px;overflow:auto;padding:4px}
        .rm-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
        .rm-btn{min-height:42px;padding:0 16px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:#161922;color:#e8e6df;font:inherit;font-size:13px;font-weight:750;cursor:pointer}
        .rm-btn.primary{background:linear-gradient(180deg,#e0c87a,#d4b56a);border-color:#d4b56a;color:#1a160e;font-weight:850}
        .rm-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        @media(max-width:600px){.rm-grid2{grid-template-columns:1fr}}
        .rm-sticky{position:sticky;bottom:16px;margin-top:24px;padding:14px 16px;border-radius:16px;border:1px solid rgba(212,181,106,.25);background:rgba(18,21,28,.92);backdrop-filter:blur(16px);display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;box-shadow:0 16px 40px rgba(0,0,0,.35)}
        .rm-sticky p{margin:0;font-size:12px;color:#9a9faa}
        .rm-working{margin-top:28px;padding:40px 24px;text-align:center;border-radius:24px;border:1px solid rgba(255,255,255,.08);background:#161922}
        .rm-working .pulse{width:48px;height:48px;margin:0 auto 16px;border-radius:50%;border:2px solid rgba(212,181,106,.3);border-top-color:#d4b56a;animation:rmspin .8s linear infinite}
        @keyframes rmspin{to{transform:rotate(360deg)}}
        .rm-working strong{display:block;font-size:17px;color:#f0eee8}
        .rm-working p{margin:8px 0 0;color:#8b919c;font-size:13px}
      `}</style>

      <div className="rm-kicker">Remake a winner</div>
      <h1 className="rm-title">Paste something that already works</h1>
      <p className="rm-sub">One input. Full package. Mechanism, original, titles, hook, script, Shorts.</p>

      <div className="rm-progress">
        <span className={step === "input" ? "on" : step !== "input" ? "done" : ""}>1 · Reference</span>
        <span className={step === "working" ? "on" : step === "result" ? "done" : ""}>2 · Build</span>
        <span className={step === "result" ? "on" : ""}>3 · Package</span>
      </div>

      {step === "working" && (
        <div className="rm-working">
          <div className="pulse" />
          <strong>Building your package</strong>
          <p>{message || "Local AI is analysing and writing\u2026"}</p>
        </div>
      )}

      {step === "input" && (
        <div className="rm-card">
          <label className="rm-label">Winning video or channel URL</label>
          <input className="rm-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=\u2026" autoFocus />
          <div className="rm-row">
            <div>
              <label className="rm-label">Niche</label>
              <select className="rm-input" value={niche} onChange={(e) => setNiche(e.target.value)}>
                {NICHES.map((n) => (<option key={n}>{n}</option>))}
              </select>
            </div>
            <div className="rm-notes">
              <label className="rm-label">What stood out (optional)</label>
              <textarea className="rm-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Hook, pacing, audience\u2026" />
            </div>
          </div>
          <div className="rm-file">
            Optional upload · needs Whisper + Vision workers on your Mac
            <input type="file" accept="video/*,audio/*,.txt,.md" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && <div style={{ marginTop: 8, color: "#d8d4c8" }}>{file.name}</div>}
          </div>
          <button type="button" className="rm-cta" disabled={busy || !canRun} onClick={run}>Build package \u2192</button>
          <div className={`rm-status${/fail|error|timeout/i.test(message) ? " err" : ""}`}>{message || "Local AI must show Online in the sidebar. Start stack: bash scripts/start-local-ai-stack.sh"}</div>
          <div className="rm-hint">
            <div><b>Mechanism</b><span>Why it holds attention</span></div>
            <div><b>Original</b><span>Titles, hook, script</span></div>
            <div><b>Shorts</b><span>TikTok / Reels / Shorts</span></div>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="rm-doc">
          {selected && (
            <div className="rm-hero-result">
              <strong>{selected.topic || selected.titles?.[0]?.title || "Your package"}</strong>
              <p>{selected.angle || selected.why_this_should_work || "Original package ready to ship."}</p>
            </div>
          )}
          {analysis && (analysis.mechanism || analysis.why_it_works) && (
            <div className="rm-section">
              <h3>Why the reference wins</h3>
              <div className="rm-block"><strong>{analysis.mechanism || "Mechanism"}</strong><p>{analysis.why_it_works || analysis.summary || ""}</p></div>
            </div>
          )}
          {selected && (selected.titles || []).length > 0 && (
            <div className="rm-section">
              <h3>Titles</h3>
              {(selected.titles || []).slice(0, 5).map((t) => (
                <div className="rm-block" key={t.rank || t.title}><strong>{t.title}</strong>{t.reason && <span>{t.reason}</span>}</div>
              ))}
            </div>
          )}
          {selected?.hook_0_5s && (
            <div className="rm-section"><h3>Hook · first 5 seconds</h3><div className="rm-block"><strong>{selected.hook_0_5s}</strong></div></div>
          )}
          {selected?.script && (
            <div className="rm-section">
              <h3>Script</h3>
              <div className="rm-block">
                <div className="rm-script">{selected.script}</div>
                <div className="rm-actions"><button type="button" className="rm-btn" onClick={() => copy(selected.script)}>Copy script</button></div>
              </div>
            </div>
          )}
          {shorts.length > 0 && (
            <div className="rm-section">
              <h3>Shorts · {shorts.length}</h3>
              <div className="rm-grid2">
                {shorts.map((c) => (
                  <div className="rm-block" key={`${c.rank}-${c.hook}`}><strong>#{c.rank} · {c.short_title || "Short"}</strong><span>{c.hook}</span></div>
                ))}
              </div>
            </div>
          )}
          {(result.monetisation_tests || []).length > 0 && (
            <div className="rm-section">
              <h3>Money tests</h3>
              {(result.monetisation_tests || []).map((x, i) => (
                <div className="rm-block" key={i}><strong>{x.route}</strong><span>{x.test} · {x.metric}</span></div>
              ))}
            </div>
          )}
          <div className="rm-sticky">
            <p>{message || (savedId ? "Saved to cloud. Open Studio next." : "Save package to cloud Studio, then render.")}</p>
            <div className="rm-actions" style={{ margin: 0 }}>
              <button type="button" className="rm-btn primary" disabled={busy || !selected} onClick={save}>{savedId ? "Saved \u2713" : "Save to Studio \u2192"}</button>
              {typeof onGo === "function" && (
                <button type="button" className="rm-btn" onClick={() => onGo("production")}>Open Studio</button>
              )}
              <button type="button" className="rm-btn" onClick={() => { setStep("input"); setResult(null); setMessage(""); }}>New remake</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
