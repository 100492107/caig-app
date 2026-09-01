import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import GrowthModeWorkspace from "./GrowthModeWorkspace.jsx";
import CommerceTestWorkspace from "./CommerceTestWorkspace.jsx";

const PERSONAS = [
  { id: "cara", name: "Cara", note: "Direct · dry · disciplined · British" },
  { id: "lila", name: "Lila", note: "Measured · warm · observant · understated" },
  { id: "cara_lila", name: "Cara + Lila", note: "Distinct voices · chemistry · contrast" },
];
const FORMATS = ["Personal moment", "POV / relatable", "Quick take", "Micro-story", "GRWM", "Day in the life", "Photo slideshow", "Reaction"];

function Shell({ eyebrow, title, copy, children, actions }) {
  return <div className="tb-stage-workspace">
    <div className="stage-surface-head"><div><div className="tb-small-label">{eyebrow}</div><h2>{title}</h2><p>{copy}</p></div>{actions}</div>
    {children}
  </div>;
}
function Card({ children, className = "" }) { return <section className={`tb-panel staged-card ${className}`}>{children}</section>; }
function Button({ children, primary = false, ...props }) { return <button {...props} className={primary ? "tb-primary" : "tb-secondary"}>{children}</button>; }

export function CreatorsStaged({ stage }) {
  const [persona, setPersona] = useState("cara");
  const [format, setFormat] = useState(FORMATS[0]);
  const [direction, setDirection] = useState("");
  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function load() {
    const { data } = await supabase.from("local_ai_jobs").select("id,title,status,result,created_at,persona_id,job_type").eq("job_type", "growth_mode").order("created_at", { ascending: false }).limit(30);
    setJobs(data || []);
  }
  useEffect(() => { load(); }, []);
  async function queue() {
    setBusy(true); setMessage("Queuing creator brief…");
    const person = PERSONAS.find((x) => x.id === persona) || PERSONAS[0];
    const { error } = await supabase.from("local_ai_jobs").insert({ title: `Creator package · ${person.name} · ${format}`, job_type: "growth_mode", model: "mlx-community/Qwen3-8B-4bit", persona_id: persona, system_prompt: "You are the creator strategy director for Cornerstone. Preserve creator identity and write specific, platform-native concepts. Return concise JSON.", user_prompt: `CREATOR: ${person.name}\nFORMAT: ${format}\nDIRECTION: ${direction || "Choose the strongest opportunity from the creator bible."}\nReturn a package with hook, concept, outline, shot_list, caption, cta and why_it_should_work.`, options: { max_tokens: 5000, temperature: .62 }, status: "queued", production_status: "not_started" });
    if (error) setMessage(error.message); else { setMessage("Queued. Local Qwen will build the package."); await load(); }
    setBusy(false);
  }
  if (stage === 0) return <Shell eyebrow="01 · CREATOR" title="Choose the creator and the job." copy="Start with identity, format and intent. Nothing gets produced until the brief is clear.">
    <Card><div className="staged-grid staged-grid-3">{PERSONAS.map((p) => <button key={p.id} className={`staged-choice ${persona === p.id ? "is-selected" : ""}`} onClick={() => setPersona(p.id)}><strong>{p.name}</strong><span>{p.note}</span></button>)}</div>
      <div className="staged-field"><label>Format</label><select value={format} onChange={(e) => setFormat(e.target.value)}><option>{FORMATS.join("</option><option>")}</option></select></div>
      <div className="staged-actions"><Button primary onClick={() => setMessage("Brief locked. Move to Research.")}>Lock brief</Button></div>
      {message && <div className="staged-status">{message}</div>}</Card>
  </Shell>;
  if (stage === 1) return <Shell eyebrow="02 · RESEARCH" title="Give Qwen the signal before production." copy="Add what you know. The local worker turns it into a creator-specific opportunity package."><Card>
    <div className="staged-context-row"><span>Creator</span><strong>{PERSONAS.find((x) => x.id === persona)?.name}</strong><span>Format</span><strong>{format}</strong></div>
    <textarea value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="Winning hooks, ideas, references, audience notes, current trends or a specific challenge…" />
    <div className="staged-actions"><Button onClick={() => setMessage("Research brief saved in this session.")}>Save direction</Button><Button primary disabled={busy} onClick={queue}>{busy ? "Queueing…" : "Queue creator package"}</Button></div>
    {message && <div className="staged-status">{message}</div>}</Card></Shell>;
  return <Shell eyebrow="03 · PRODUCTION" title="Production packages." copy="Use the existing creator production engine here, with the selected brief and latest Qwen jobs as context."><Card><div className="staged-list">{jobs.length ? jobs.map((job) => <div className="staged-row" key={job.id}><div><strong>{job.title}</strong><span>{job.status} · {job.created_at ? new Date(job.created_at).toLocaleString() : ""}</span></div><span>{job.persona_id}</span></div>) : <div className="staged-empty">No creator packages yet.</div>}</div><div className="staged-actions"><Button primary onClick={() => setMessage("Open the full creator production surface from this stage when you are ready to produce.")}>Open creator production</Button></div>{message && <div className="staged-status">{message}</div>}</Card><div className="staged-legacy-slot"><GrowthModeWorkspace /></div></Shell>;
}

export function ShopStaged({ stage }) {
  const [offer, setOffer] = useState(""); const [audience, setAudience] = useState(""); const [brief, setBrief] = useState(""); const [tests, setTests] = useState([]); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function queueTest() { setBusy(true); setMessage("Queuing commerce brief…"); const { data, error } = await supabase.from("local_ai_jobs").insert({ title: `Commerce test · ${offer || "New offer"}`, job_type: "commerce_test", model: "mlx-community/Qwen3-8B-4bit", persona_id: "system", system_prompt: "You are a commerce creative strategist. Return a practical test package with offer, audience, creative angle, hook, asset plan and measurement notes.", user_prompt: `OFFER: ${offer}\nAUDIENCE: ${audience}\nBRIEF: ${brief}`, options: { max_tokens: 4000, temperature: .6 }, status: "queued", production_status: "not_started" }).select("id,title,status,created_at").single(); if (error) setMessage(error.message); else setTests((x) => [data, ...x]); setBusy(false); }
  if (stage === 0) return <Shell eyebrow="01 · OFFER" title="Define what the creative is selling." copy="One commercial action. One audience. One reason to care."><Card><div className="staged-grid staged-grid-2"><div className="staged-field"><label>Offer</label><input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Product, offer or commercial outcome" /></div><div className="staged-field"><label>Audience</label><input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Who needs to act?" /></div></div><div className="staged-actions"><Button primary disabled={!offer || !audience} onClick={() => setMessage("Offer locked. Move to Creative.")}>Lock offer</Button></div>{message && <div className="staged-status">{message}</div>}</Card></Shell>;
  if (stage === 1) return <Shell eyebrow="02 · CREATIVE" title="Build the test around the offer." copy="Keep the commercial job visible while the creative is being shaped."><Card><textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Angle, mechanism, hook, format, proof, objections, creative reference…" /><div className="staged-context-row"><span>Offer</span><strong>{offer || "—"}</strong><span>Audience</span><strong>{audience || "—"}</strong></div><div className="staged-actions"><Button primary disabled={busy} onClick={queueTest}>{busy ? "Queueing…" : "Queue creative test"}</Button></div>{message && <div className="staged-status">{message}</div>}</Card></Shell>;
  return <Shell eyebrow="03 · TEST" title="Test and learn." copy="Record what was tried and keep the result close to the next decision."><Card><div className="staged-list">{tests.length ? tests.map((t) => <div className="staged-row" key={t.id}><strong>{t.title}</strong><span>{t.status}</span></div>) : <div className="staged-empty">No tests queued in this session.</div>}</div><div className="staged-actions"><Button primary onClick={() => setMessage("Open the full commerce testing surface for deeper analysis.")}>Open commerce testing</Button></div>{message && <div className="staged-status">{message}</div>}</Card><div className="staged-legacy-slot"><CommerceTestWorkspace /></div></Shell>;
}

export function CaptionStudioStaged({ stage }) {
  const [source, setSource] = useState(""); const [title, setTitle] = useState("Caption render"); const [style, setStyle] = useState("cara_editorial"); const [hook, setHook] = useState(""); const [transcript, setTranscript] = useState(""); const [jobs, setJobs] = useState([]); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function load() { const { data } = await supabase.from("caption_jobs").select("id,title,status,style,source_url,output_url,error_message,created_at,completed_at").order("created_at", { ascending: false }).limit(20); setJobs(data || []); }
  useEffect(() => { load(); }, []);
  async function queue() { if (!source.trim()) { setMessage("Add a source video first."); return; } setBusy(true); setMessage("Queueing local caption render…"); const { error } = await supabase.from("caption_jobs").insert({ title: title.trim() || "Caption render", source_url: source.trim(), transcript: transcript.trim(), hook: hook.trim(), style, aspect_ratio: "9:16", position: "lower_center", options: { renderer: "ffmpeg_ass", auto_transcribe: true, active_word: true, punch_in: true, safe_area: true, version: 1 }, status: "queued" }); if (error) setMessage(error.message); else { setMessage("Queued for the local worker."); await load(); } setBusy(false); }
  if (stage === 0) return <Shell eyebrow="01 · BACKLOG" title="Clear the caption queue." copy="Start with the videos that are waiting, then pick the next one to edit."><Card><div className="staged-list">{jobs.length ? jobs.map((job) => <button key={job.id} className="staged-row-button" onClick={() => setSource(job.source_url || "")}><strong>{job.title}</strong><span>{job.status}</span></button>) : <div className="staged-empty">No caption jobs found.</div>}</div></Card></Shell>;
  if (stage === 1) return <Shell eyebrow="02 · EDIT" title="Shape the caption treatment." copy="Set the title, hook and treatment before the local FFmpeg render."><Card><div className="staged-grid staged-grid-2"><div className="staged-field"><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} /></div><div className="staged-field"><label>Style</label><select value={style} onChange={(e) => setStyle(e.target.value)}><option value="cara_editorial">Cara Editorial</option><option value="lila_minimal">Lila Minimal</option><option value="creator_bold">Creator Bold</option><option value="clean_subtitles">Clean Subtitles</option></select></div></div><div className="staged-field"><label>Source video URL</label><input value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://…/video.mp4" /></div><div className="staged-field"><label>Hook</label><input value={hook} onChange={(e) => setHook(e.target.value)} /></div><div className="staged-field"><label>Transcript (optional)</label><textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Leave blank for local Whisper." /></div><div className="staged-actions"><Button primary disabled={busy} onClick={queue}>{busy ? "Queueing…" : "Render locally"}</Button></div>{message && <div className="staged-status">{message}</div>}</Card></Shell>;
  return <Shell eyebrow="03 · READY" title="Approved caption renders." copy="Only completed output belongs in the ready state."><Card><div className="staged-list">{jobs.filter((x) => x.status === "completed").map((job) => <div className="staged-row" key={job.id}><div><strong>{job.title}</strong><span>{job.style}</span></div><a href={job.output_url || "#"} target="_blank" rel="noreferrer">Open</a></div>)}{!jobs.some((x) => x.status === "completed") && <div className="staged-empty">Nothing is ready yet.</div>}</div><div className="staged-actions"><Button onClick={load}>Refresh</Button></div></Card></Shell>;
}

export function MediaStaged({ stage }) {
  const [workspace, setWorkspace] = useState(null); const [assets, setAssets] = useState([]); const [characters, setCharacters] = useState([]); const [message, setMessage] = useState("");
  async function load() { const { data: ws } = await supabase.from("track_b_workspaces").select("id,name,slug").eq("slug", "cornerstoneaiassets-internal").maybeSingle(); setWorkspace(ws); if (!ws) { setMessage("Track B workspace not found."); return; } const [a,c] = await Promise.all([supabase.from("track_b_assets").select("id,name,asset_type,source_url,public_url,approval_status,created_at,metadata").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(200),supabase.from("track_b_characters").select("id,name,description").eq("workspace_id", ws.id)]); setAssets(a.data || []); setCharacters(c.data || []); }
  useEffect(() => { load(); }, []);
  const refs = useMemo(() => assets.filter((a) => a.asset_type === "reference"), [assets]);
  const derived = useMemo(() => assets.filter((a) => a.asset_type !== "reference"), [assets]);
  const shown = stage === 0 ? assets : stage === 1 ? refs : derived;
  const title = stage === 0 ? "Find the asset." : stage === 1 ? "Inspect the sources." : "Work from derived media.";
  const copy = stage === 0 ? "One library for the source and derived asset chain." : stage === 1 ? "Identity references and source provenance stay explicit." : "Derived outputs remain linked to their source records.";
  return <Shell eyebrow={`0${stage + 1} · ${["LIBRARY","SOURCES","DERIVED"][stage]}`} title={title} copy={copy} actions={<Button onClick={load}>Refresh</Button>}><Card><div className="staged-metric-row"><span>{assets.length} assets</span><span>{characters.length} characters</span><span>{refs.length} references</span><span>{derived.length} derived</span></div><div className="staged-list">{shown.slice(0, 80).map((asset) => <div className="staged-row" key={asset.id}><div><strong>{asset.name || asset.id}</strong><span>{asset.asset_type} · {asset.approval_status || "unreviewed"}</span></div>{asset.public_url && <a href={asset.public_url} target="_blank" rel="noreferrer">Open</a>}</div>)}{!shown.length && <div className="staged-empty">No assets in this stage yet.</div>}</div>{message && <div className="staged-status">{message}</div>}</Card></Shell>;
}

export function LocalAIStaged({ stage }) {
  const [jobs, setJobs] = useState([]); const [title, setTitle] = useState("Local Qwen job"); const [prompt, setPrompt] = useState("Create a concise production-ready creative package for Cara."); const [persona, setPersona] = useState("cara"); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function load() { const { data } = await supabase.from("local_ai_jobs").select("id,title,job_type,status,model,created_at,completed_at,error_message").order("created_at", { ascending: false }).limit(40); setJobs(data || []); }
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);
  async function queue() { if (!prompt.trim()) return; setBusy(true); setMessage("Queueing local Qwen job…"); const { error } = await supabase.from("local_ai_jobs").insert({ title: title.trim() || "Local Qwen job", job_type: "creative_director", model: "mlx-community/Qwen3-8B-4bit", persona_id: persona, system_prompt: "You are the local creative director for Cornerstone. Be specific, human and production-ready. Return useful structured text.", user_prompt: prompt.trim(), options: { max_tokens: 1400, temperature: .65 }, status: "queued", production_status: "not_started" }); if (error) setMessage(error.message); else { setMessage("Queued for local Qwen."); await load(); } setBusy(false); }
  if (stage === 0) return <Shell eyebrow="01 · STATUS" title="Know whether local AI is actually online." copy="Use this screen as the operational check before you start a batch."><Card><div className="staged-status-grid"><div><span>Model</span><strong>Qwen3-8B-4bit</strong></div><div><span>Queued</span><strong>{jobs.filter((j) => j.status === "queued").length}</strong></div><div><span>Processing</span><strong>{jobs.filter((j) => j.status === "processing").length}</strong></div><div><span>Completed</span><strong>{jobs.filter((j) => j.status === "completed").length}</strong></div></div><div className="staged-actions"><Button onClick={load}>Refresh local state</Button></div></Card></Shell>;
  if (stage === 1) return <Shell eyebrow="02 · QUEUE" title="Send work to Qwen." copy="Queue work here; your Mac worker picks it up when it is online."><Card><div className="staged-grid staged-grid-2"><div className="staged-field"><label>Job title</label><input value={title} onChange={(e) => setTitle(e.target.value)} /></div><div className="staged-field"><label>Creator</label><select value={persona} onChange={(e) => setPersona(e.target.value)}><option value="cara">Cara</option><option value="lila">Lila</option><option value="cara_lila">Cara + Lila</option></select></div></div><div className="staged-field"><label>Prompt</label><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} /></div><div className="staged-actions"><Button primary disabled={busy} onClick={queue}>{busy ? "Queueing…" : "Queue Qwen job"}</Button></div>{message && <div className="staged-status">{message}</div>}</Card></Shell>;
  return <Shell eyebrow="03 · HISTORY" title="Recent local work." copy="Keep the queue visible and make failures legible."><Card><div className="staged-list">{jobs.map((job) => <div className="staged-row" key={job.id}><div><strong>{job.title}</strong><span>{job.job_type} · {job.model}</span></div><span className={job.status === "completed" ? "staged-good" : job.status === "error" ? "staged-bad" : ""}>{job.status}</span></div>)}</div></Card></Shell>;
}
