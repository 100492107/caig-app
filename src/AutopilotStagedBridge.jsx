import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const MODEL = "mlx-community/Qwen3-8B-4bit";
const PERSONAS = { cara: "Cara", lila: "Lila", cara_lila: "Cara + Lila", duo: "Cara + Lila" };
const FORMATS = ["Talking Head", "POV", "B-roll + Captions", "Slideshow", "Carousel", "Single Image", "Duo Banter"];

const card = { background: "var(--tb-surface, #17191e)", border: "1px solid var(--tb-line, rgba(255,255,255,.07))", borderRadius: 14, padding: 18 };
const field = { width: "100%", boxSizing: "border-box", minHeight: 44, background: "var(--tb-surface-2, #1c1f24)", color: "var(--tb-text, #f2f2f0)", border: "1px solid var(--tb-line-strong, rgba(255,255,255,.12))", borderRadius: 10, padding: "10px 12px" };
const secondary = { border: "1px solid var(--tb-line, rgba(255,255,255,.07))", background: "transparent", color: "var(--tb-text, #f2f2f0)", minHeight: 44, borderRadius: 10, padding: "0 14px", fontWeight: 750, cursor: "pointer" };
const primary = { border: "1px solid var(--tb-accent, #b9a982)", background: "var(--tb-accent, #b9a982)", color: "#171713", minHeight: 44, borderRadius: 10, padding: "0 16px", fontWeight: 850, cursor: "pointer" };

const parse = (value) => { try { return JSON.parse(String(value || "{}")); } catch { return {}; } };
const personaId = (value) => value === "duo" ? "cara_lila" : value;
const formatLabel = (value) => FORMATS.find((item) => item.toLowerCase().replace(/\s+/g, "_") === String(value || "").toLowerCase()) || value || "Single Image";

async function queueJob({ title, jobType, persona, userPrompt, systemPrompt, formatId = null, maxTokens = 3200, options = {} }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({
    title, job_type: jobType, model: MODEL, persona_id: persona,
    system_prompt: systemPrompt, user_prompt: userPrompt,
    options: { max_tokens: maxTokens, temperature: 0.55, format_id: formatId, ...options },
    status: "queued", production_status: "not_started",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

function StatusPill({ status }) {
  const value = String(status || "queued").replaceAll("_", " ");
  return <span className="tb-status-pill" style={{ fontSize: 10, color: status === "completed" ? "var(--tb-success)" : "var(--tb-muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>{value}</span>;
}

function ProductionCard({ job, onRefresh }) {
  const result = parse(job.result);
  const pkg = result.package || result.concept || result;
  const media = result.media || {};
  const hasAsset = Boolean(media.imageUrl || (Array.isArray(media.imageUrls) && media.imageUrls.length) || job.video_url || job.captioned_video_url);
  const qa = result.verification || result.sceneVerification || {};
  const qaState = qa.pass === true ? "passed" : qa.pass === false ? "failed" : null;
  return <div style={card}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div>
        <div style={{ color: "var(--tb-muted)", fontSize: 10 }}>{PERSONAS[job.persona_id] || job.persona_id} · {formatLabel(pkg.formatId || job.options?.format_id)}</div>
        <h3 style={{ margin: "5px 0 6px", color: "var(--tb-text)" }}>{pkg.title || job.title}</h3>
        <div style={{ color: "var(--tb-text)", fontSize: 12, lineHeight: 1.5 }}>{pkg.hook || pkg.visual_prompt || "Production package queued."}</div>
      </div>
      <StatusPill status={job.production_status || job.status} />
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, color: "var(--tb-muted)", fontSize: 10 }}>
      <span>{job.status}</span><span>·</span><span>{job.production_status || "not started"}</span>
      {qaState && <><span>·</span><span style={{ color: qaState === "passed" ? "var(--tb-success)" : "var(--tb-danger)" }}>Scene QA {qaState}</span></>}
      {hasAsset && <><span>·</span><span style={{ color: "var(--tb-success)" }}>Asset saved</span></>}
    </div>
    {job.error_message && <div style={{ marginTop: 10, color: "var(--tb-danger)", fontSize: 11, lineHeight: 1.45 }}>{job.error_message}</div>}
    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
      {hasAsset && <a href={media.imageUrl || job.captioned_video_url || job.video_url} target="_blank" rel="noreferrer" style={{ ...secondary, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Open asset</a>}
      <button type="button" style={secondary} onClick={onRefresh}>Refresh</button>
    </div>
  </div>;
}

export default function AutopilotStagedBridge({ stage = 0, onStageChange }) {
  const [persona, setPersona] = useState("duo");
  const [platform, setPlatform] = useState("TikTok");
  const [goal, setGoal] = useState("Grow account");
  const [niche, setNiche] = useState("Quiet ambition · style · everyday life · mindset · money · calm luxury");
  const [signals, setSignals] = useState("");
  const [count, setCount] = useState(12);
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadJobs() {
    const { data } = await supabase.from("local_ai_jobs")
      .select("id,title,job_type,model,status,result,error_message,created_at,completed_at,persona_id,production_status,video_url,caption_job_id,captioned_video_url,options")
      .in("job_type", ["trend_scan", "autopilot_concept", "content_package"])
      .order("created_at", { ascending: false }).limit(100);
    setJobs(data || []);
  }

  useEffect(() => { loadJobs(); const timer = setInterval(loadJobs, 3500); return () => clearInterval(timer); }, []);

  const opportunities = useMemo(() => {
    const latest = jobs.find((job) => job.job_type === "trend_scan" && job.status === "completed");
    const result = parse(latest?.result);
    return Array.isArray(result.opportunities) ? result.opportunities : [];
  }, [jobs]);
  const concepts = useMemo(() => jobs.filter((job) => job.job_type === "autopilot_concept"), [jobs]);
  const production = useMemo(() => jobs.filter((job) => job.job_type === "content_package"), [jobs]);

  async function scan() {
    setBusy(true); setMessage("Qwen is scanning the signal layer…");
    try {
      const p = PERSONAS[personaId(persona)] || PERSONAS.cara_lila;
      await queueJob({ title: `Autopilot Radar · ${new Date().toLocaleDateString("en-GB")}`, jobType: "trend_scan", persona: personaId(persona), maxTokens: 4200,
        systemPrompt: "You are the Cornerstone creative director. Extract mechanisms from supplied signals and return original opportunities. Never invent performance numbers. JSON only.",
        userPrompt: `PLATFORM: ${platform}\nGOAL: ${goal}\nCREATOR: ${p}\nNICHE: ${niche}\nTARGET: ${count}\nVALID FORMATS: ${FORMATS.join(", ")}\nSIGNALS:\n${signals || "No signals supplied. Generate conservative mechanism-first opportunities."}\nReturn {\"opportunities\":[{\"id\":\"\",\"title\":\"\",\"mechanism\":\"\",\"hook\":\"\",\"psychology\":\"\",\"formatId\":\"single_image\",\"score\":0,\"confidence\":\"medium\"}]} with exactly ${count} opportunities.` });
      onStageChange?.(1); setMessage("Radar queued.");
      await loadJobs();
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  async function createConcepts() {
    const picks = opportunities.filter((item) => selected.includes(item.id));
    if (!picks.length) { setMessage("Select at least one opportunity."); return; }
    setBusy(true); setMessage(`Qwen is building ${picks.length} concept${picks.length === 1 ? "" : "s"}…`);
    try {
      const p = PERSONAS[personaId(persona)] || PERSONAS.cara_lila;
      for (const pick of picks) await queueJob({ title: `Autopilot Concept · ${pick.title}`, jobType: "autopilot_concept", persona: personaId(persona), formatId: pick.formatId || "single_image", maxTokens: 3800,
        systemPrompt: "You are the Cornerstone creative director. Preserve the proven mechanism but make the concept original, specific and native to the chosen creator. Include a machine-readable sceneLock with location, timeOfDay, action, props, wardrobe, composition and avoid. JSON only.",
        userPrompt: `PLATFORM: ${platform}\nGOAL: ${goal}\nCREATOR: ${p}\nNICHE: ${niche}\nSELECTED FORMAT: ${pick.formatId || "single_image"}\nPROVEN MECHANISM:\n${JSON.stringify(pick)}\nReturn {\"concept\":{\"title\":\"\",\"creator\":\"\",\"formatId\":\"\",\"hook\":\"\",\"script\":\"\",\"visual_prompt\":\"\",\"caption\":\"\",\"cta\":\"\",\"why_it_should_work\":\"\",\"sceneLock\":{\"location\":\"\",\"timeOfDay\":\"\",\"action\":\"\",\"props\":\"\",\"wardrobe\":\"\",\"composition\":\"\",\"avoid\":\"\"}}}.` });
      setSelected([]); onStageChange?.(1); setMessage("Concepts queued."); await loadJobs();
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  async function queueProduction(conceptJob) {
    const parsed = parse(conceptJob.result);
    const concept = parsed.concept || parsed;
    const formatId = concept.formatId || concept.format || "single_image";
    const sceneLock = concept.sceneLock || {};
    setBusy(true); setMessage(`Preparing ${concept.title || conceptJob.title} for production…`);
    try {
      await queueJob({ title: `Production · ${concept.title || conceptJob.title}`, jobType: "content_package", persona: conceptJob.persona_id || personaId(persona), formatId, maxTokens: 1400,
        options: { source_concept_job_id: conceptJob.id, scene_contract: sceneLock, production_route: "qwen_fal_storage_caption_sceneqa" },
        systemPrompt: "You are the Cornerstone production planner. Turn the approved concept into a production-ready package for the existing Qwen → FAL renderer → permanent storage → caption → local vision QA pipeline. Preserve identity and sceneLock exactly. Return JSON only.",
        userPrompt: `APPROVED CONCEPT:\n${JSON.stringify(concept, null, 2)}\n\nReturn {\"package\":{\"title\":\"\",\"formatId\":\"\",\"creator\":\"\",\"hook\":\"\",\"caption\":\"\",\"visual_prompt\":\"\",\"sceneLock\":${JSON.stringify(sceneLock)},\"quality_gate\":\"human_review_required\"}}.` });
      await loadJobs(); setMessage("Production queued. The downstream renderer/storage/QA path can now take over.");
    } catch (error) { setMessage(error.message || String(error)); }
    finally { setBusy(false); }
  }

  if (stage === 2) return <div className="autopilot-production-surface" style={{ display: "grid", gap: 14 }}>
    <div style={card}><div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}><div><div className="tb-small-label">Production</div><h2 style={{ margin: "5px 0" }}>Approved work, one queue</h2><div style={{ color: "var(--tb-muted)", fontSize: 12 }}>No second engine. Concepts are handed into the existing FAL → storage → caption → scene-QA route.</div></div><button type="button" style={secondary} onClick={() => onStageChange?.(1)}>Back to concepts</button></div></div>
    <div style={{ display: "grid", gap: 10 }}>{production.length ? production.slice(0, 30).map((job) => <ProductionCard key={job.id} job={job} onRefresh={loadJobs} />) : <div style={{ ...card, color: "var(--tb-muted)", fontSize: 12 }}>No production packages yet. Approve a concept and send it here.</div>}</div>
  </div>;

  if (stage === 1) return <div style={{ display: "grid", gap: 14 }}>
    <div style={card}><div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}><div><div className="tb-small-label">Concepts</div><h2 style={{ margin: "5px 0" }}>Select what deserves production</h2><div style={{ color: "var(--tb-muted)", fontSize: 12 }}>Selection is explicit. Production is a separate queue.</div></div><div style={{ display: "flex", gap: 8 }}><button type="button" style={secondary} onClick={() => onStageChange?.(0)}>Back to radar</button><button type="button" style={primary} disabled={busy || !selected.length} onClick={createConcepts}>{busy ? "Qwen working…" : `Build ${selected.length || ""} concept${selected.length === 1 ? "" : "s"}`}</button></div></div></div>
    {concepts.length > 0 ? concepts.map((job) => { const c = parse(job.result).concept || parse(job.result); const done = job.status === "completed"; return <div key={job.id} style={card}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div style={{ color: "var(--tb-muted)", fontSize: 10 }}>{PERSONAS[job.persona_id] || job.persona_id} · {formatLabel(c.formatId)}</div><h3 style={{ margin: "5px 0" }}>{c.title || job.title}</h3><div style={{ color: "var(--tb-text)", fontSize: 12 }}>{c.hook || (done ? "Concept ready." : "Qwen is processing…")}</div></div><StatusPill status={job.status} /></div>{c.why_it_should_work && <div style={{ marginTop: 9, color: "var(--tb-muted)", fontSize: 11 }}>{c.why_it_should_work}</div>}<div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}><button type="button" style={primary} disabled={!done || busy} onClick={() => queueProduction(job)}>{busy ? "Preparing…" : "Send to production"}</button></div></div>; }) : opportunities.map((item) => <div key={item.id} style={card}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div style={{ color: "var(--tb-muted)", fontSize: 10 }}>{formatLabel(item.formatId)}</div><h3 style={{ margin: "5px 0" }}>{item.title}</h3><div style={{ color: "var(--tb-muted)", fontSize: 12 }}>{item.hook || item.mechanism}</div></div><b>{item.score ?? "—"}</b></div><button type="button" style={{ ...secondary, marginTop: 10, borderColor: selected.includes(item.id) ? "var(--tb-accent)" : undefined }} onClick={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}>{selected.includes(item.id) ? "Selected" : "Select"}</button></div>)}
    {!concepts.length && !opportunities.length && <div style={{ ...card, color: "var(--tb-muted)", fontSize: 12 }}>No radar results yet. Run a scan first.</div>}
  </div>;

  return <div style={{ display: "grid", gap: 14 }}>
    <div style={card}><div className="tb-small-label">Radar</div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginTop: 12 }}><select value={persona} onChange={(e) => setPersona(e.target.value)} style={field}><option value="cara">Cara</option><option value="lila">Lila</option><option value="duo">Cara + Lila</option></select><select value={platform} onChange={(e) => setPlatform(e.target.value)} style={field}><option>TikTok</option><option>Instagram</option><option>YouTube</option><option>Facebook</option></select><select value={goal} onChange={(e) => setGoal(e.target.value)} style={field}><option>Grow account</option><option>Engagement</option><option>Profile visits</option><option>Conversions</option></select><input value={niche} onChange={(e) => setNiche(e.target.value)} style={field} /></div><textarea value={signals} onChange={(e) => setSignals(e.target.value)} placeholder="Signals, hooks, references or observations…" style={{ ...field, marginTop: 10, minHeight: 110, resize: "vertical" }} /><div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}><label style={{ color: "var(--tb-muted)", fontSize: 11 }}>Opportunities <input type="number" min="4" max="20" value={count} onChange={(e) => setCount(Math.max(4, Math.min(20, Number(e.target.value) || 12)))} style={{ ...field, width: 82, display: "inline-block", marginLeft: 7 }} /></label><button type="button" style={primary} disabled={busy} onClick={scan}>{busy ? "Qwen working…" : "Scan with Qwen"}</button><span style={{ color: "var(--tb-muted)", fontSize: 11 }}>{message}</span></div></div>
    <div style={{ ...card, color: "var(--tb-muted)", fontSize: 12, lineHeight: 1.6 }}><strong style={{ color: "var(--tb-text)" }}>Radar → Concepts → Production</strong><br />Research and mechanism extraction happen in Radar. Concepts are selected here. Production creates the downstream package without mounting another creative engine.</div>
  </div>;
}
