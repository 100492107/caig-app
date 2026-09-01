import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import AutopilotCreativeEngine from "./AutopilotCreativeEngine.jsx";

const MODEL = "mlx-community/Qwen3-8B-4bit";
const PERSONAS = { cara: "Cara", lila: "Lila", cara_lila: "Cara + Lila", duo: "Cara + Lila" };
const FORMATS = ["Talking Head", "POV", "B-roll + Captions", "Slideshow", "Carousel", "Single Image", "Duo Banter"];

const panel = { background: "var(--tb-surface, #17191e)", border: "1px solid var(--tb-line, rgba(255,255,255,.07))", borderRadius: 14, padding: 20 };
const field = { width: "100%", boxSizing: "border-box", minHeight: 44, background: "var(--tb-surface-2, #1c1f24)", color: "var(--tb-text, #f2f2f0)", border: "1px solid var(--tb-line-strong, rgba(255,255,255,.12))", borderRadius: 9, padding: "10px 12px" };
const quiet = { border: "1px solid var(--tb-line, rgba(255,255,255,.07))", background: "transparent", color: "var(--tb-text, #f2f2f0)", minHeight: 44, borderRadius: 9, padding: "0 14px", fontWeight: 700, cursor: "pointer" };
const primary = { border: "1px solid var(--tb-accent, #b9a982)", background: "var(--tb-accent, #b9a982)", color: "#171713", minHeight: 44, borderRadius: 9, padding: "0 16px", fontWeight: 850, cursor: "pointer" };

const parse = (value) => { try { return JSON.parse(String(value || "{}")); } catch { return {}; } };

async function queueJob({ title, jobType, personaId, userPrompt, systemPrompt, formatId = null, maxTokens = 3200 }) {
  const { data, error } = await supabase.from("local_ai_jobs").insert({ title, job_type: jobType, model: MODEL, persona_id: personaId, system_prompt: systemPrompt, user_prompt: userPrompt, options: { max_tokens: maxTokens, temperature: 0.55, format_id: formatId }, status: "queued", production_status: "not_started" }).select("id").single();
  if (error) throw error;
  return data.id;
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

  useEffect(() => { let mounted = true; const load = async () => { const { data } = await supabase.from("local_ai_jobs").select("id,title,job_type,status,result,persona_id,production_status,created_at,video_url,caption_job_id,captioned_video_url").in("job_type", ["trend_scan", "autopilot_concept", "content_package"]).order("created_at", { ascending: false }).limit(80); if (mounted) setJobs(data || []); }; load(); const timer = setInterval(load, 4000); return () => { mounted = false; clearInterval(timer); }; }, []);

  const opportunities = useMemo(() => { const latest = jobs.find((job) => job.job_type === "trend_scan" && job.status === "completed"); const result = parse(latest?.result); return Array.isArray(result.opportunities) ? result.opportunities : []; }, [jobs]);
  const concepts = useMemo(() => jobs.filter((job) => job.job_type === "autopilot_concept"), [jobs]);
  const production = useMemo(() => jobs.filter((job) => job.job_type === "content_package"), [jobs]);

  async function scan() {
    setBusy(true); setMessage("Qwen is scanning the signal layer…");
    try {
      const personaName = PERSONAS[persona] || PERSONAS.duo;
      await queueJob({ title: `Autopilot Radar · ${new Date().toLocaleDateString("en-GB")}`, jobType: "trend_scan", personaId: persona === "duo" ? "cara_lila" : persona, maxTokens: 4200, systemPrompt: "You are the Cornerstone creative director. Extract mechanisms from supplied signals and return original opportunities. Never invent performance numbers. JSON only.", userPrompt: `PLATFORM: ${platform}\nGOAL: ${goal}\nCREATOR: ${personaName}\nNICHE: ${niche}\nTARGET: ${count}\nVALID FORMATS: ${FORMATS.join(", ")}\nSIGNALS:\n${signals || "No signals supplied. Generate conservative mechanism-first opportunities."}\nReturn {\"opportunities\":[{\"id\":\"\",\"title\":\"\",\"mechanism\":\"\",\"hook\":\"\",\"psychology\":\"\",\"formatId\":\"single_image\",\"score\":0,\"confidence\":\"medium\"}]} with exactly ${count} opportunities.` });
      onStageChange?.(1); setMessage("Radar queued. Concepts will populate as Qwen completes the scan.");
    } catch (error) { setMessage(error.message || String(error)); } finally { setBusy(false); }
  }

  async function remix() {
    const picks = opportunities.filter((item) => selected.includes(item.id)); if (!picks.length) return;
    setBusy(true); setMessage(`Qwen is rebuilding ${picks.length} mechanism${picks.length === 1 ? "" : "s"}…`);
    try {
      const personaName = PERSONAS[persona] || PERSONAS.duo;
      for (const pick of picks) await queueJob({ title: `Autopilot Concept · ${pick.title}`, jobType: "autopilot_concept", personaId: persona === "duo" ? "cara_lila" : persona, maxTokens: 3800, formatId: pick.formatId || "single_image", systemPrompt: "You are the Cornerstone creative director. Preserve the proven mechanism but make the concept original, specific and native to the chosen creator. JSON only.", userPrompt: `PLATFORM: ${platform}\nGOAL: ${goal}\nCREATOR: ${personaName}\nNICHE: ${niche}\nSELECTED FORMAT: ${pick.formatId || "single_image"}\nPROVEN MECHANISM:\n${JSON.stringify(pick)}\nReturn {\"concept\":{\"title\":\"\",\"creator\":\"\",\"formatId\":\"\",\"hook\":\"\",\"script\":\"\",\"visual_prompt\":\"\",\"caption\":\"\",\"cta\":\"\",\"why_it_should_work\":\"\"}}.` });
      setSelected([]); onStageChange?.(1); setMessage("Concepts queued.");
    } catch (error) { setMessage(error.message || String(error)); } finally { setBusy(false); }
  }

  if (stage === 2) return <div className="autopilot-production-surface" style={{ display: "grid", gap: 12 }}><div style={panel}><div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}><div><div className="tb-small-label">Production</div><h2 style={{ margin: "6px 0 5px" }}>Approved production work</h2><p style={{ margin: 0, color: "var(--tb-muted)", fontSize: 12 }}>Production stays on the existing Qwen → FAL → storage → caption → QA pipeline.</p></div><button type="button" style={quiet} onClick={() => onStageChange?.(1)}>Back to concepts</button></div></div><div><AutopilotCreativeEngine /></div></div>;

  if (stage === 1) return <div style={{ display: "grid", gap: 12 }}><div style={panel}><div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start", flexWrap: "wrap" }}><div><div className="tb-small-label">Concepts</div><h2 style={{ margin: "6px 0 4px" }}>Choose what deserves production</h2><p style={{ margin: 0, color: "var(--tb-muted)", fontSize: 12 }}>This stage owns selection. Production is the next stage.</p></div><div style={{ display: "flex", gap: 8 }}><button type="button" style={quiet} onClick={() => onStageChange?.(0)}>Back to radar</button>{selected.length > 0 && <button type="button" style={primary} onClick={() => onStageChange?.(2)}>Move to production</button>}</div></div></div>{concepts.map((job) => { const c = parse(job.result).concept || parse(job.result); return <div key={job.id} style={panel}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div style={{ color: "var(--tb-muted)", fontSize: 10 }}>{PERSONAS[job.persona_id] || job.persona_id}</div><h3 style={{ margin: "5px 0" }}>{c.title || job.title}</h3><div style={{ color: "var(--tb-text)", fontSize: 12, lineHeight: 1.5 }}>{c.hook || "Qwen is processing…"}</div></div><span style={{ color: job.status === "completed" ? "var(--tb-success)" : "var(--tb-muted)", fontSize: 10 }}>{job.status}</span></div><div style={{ marginTop: 10, color: "var(--tb-muted)", fontSize: 11 }}>{c.why_it_should_work || "Awaiting the completed concept."}</div><button type="button" style={{ ...quiet, marginTop: 10 }} onClick={() => onStageChange?.(2)}>Use in production</button></div>; })}{concepts.length === 0 && opportunities.map((item) => <div key={item.id} style={panel}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><div style={{ color: "var(--tb-muted)", fontSize: 10 }}>{item.formatId || "Format pending"}</div><h3 style={{ margin: "5px 0" }}>{item.title}</h3><div style={{ color: "var(--tb-muted)", fontSize: 12 }}>{item.hook || item.mechanism}</div></div><b>{item.score ?? "—"}</b></div><button type="button" style={{ ...quiet, marginTop: 10, borderColor: selected.includes(item.id) ? "var(--tb-accent)" : undefined }} onClick={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}>{selected.includes(item.id) ? "Selected" : "Select"}</button></div>)}{concepts.length === 0 && opportunities.length > 0 && selected.length > 0 && <div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" style={primary} disabled={busy} onClick={remix}>{busy ? "Qwen working…" : `Remix ${selected.length} selected →`}</button></div>}{concepts.length === 0 && !opportunities.length && <div style={{ ...panel, color: "var(--tb-muted)", fontSize: 12 }}>No radar results yet. Return to Radar and run a scan.</div>}</div>;

  return <div style={{ display: "grid", gap: 12 }}><div style={panel}><div className="tb-small-label">Radar</div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginTop: 12 }}><select value={persona} onChange={(e) => setPersona(e.target.value)} style={field}><option value="cara">Cara</option><option value="lila">Lila</option><option value="duo">Cara + Lila</option></select><select value={platform} onChange={(e) => setPlatform(e.target.value)} style={field}><option>TikTok</option><option>Instagram</option><option>YouTube</option><option>Facebook</option></select><select value={goal} onChange={(e) => setGoal(e.target.value)} style={field}><option>Grow account</option><option>Engagement</option><option>Profile visits</option><option>Conversions</option></select><input value={niche} onChange={(e) => setNiche(e.target.value)} style={field} /></div><textarea value={signals} onChange={(e) => setSignals(e.target.value)} placeholder="Paste signals, hooks, references or observations for Qwen to extract mechanisms from." style={{ ...field, marginTop: 10, minHeight: 110, resize: "vertical" }} /><div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}><label style={{ color: "var(--tb-muted)", fontSize: 11 }}>Opportunities <input type="number" min="4" max="20" value={count} onChange={(e) => setCount(Math.max(4, Math.min(20, Number(e.target.value) || 12)))} style={{ ...field, width: 80, display: "inline-block", marginLeft: 7 }} /></label><button type="button" style={primary} disabled={busy} onClick={scan}>{busy ? "Qwen working…" : "Scan with Qwen"}</button><span style={{ color: "var(--tb-muted)", fontSize: 11 }}>{message}</span></div></div><div style={{ ...panel, color: "var(--tb-muted)", fontSize: 12 }}>Radar creates evidence → Concepts selects the mechanism → Production handles generation, permanence, captions and scene verification.</div></div>;
}
