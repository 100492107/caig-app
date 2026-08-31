import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const tabs = [
  { id: "revenue", label: "Revenue Block", eyebrow: "Morning · cash first" },
  { id: "learning", label: "Learning Loop", eyebrow: "Winners compound" },
  { id: "production", label: "Production Sprint", eyebrow: "Afternoon · ship" },
];

const costOptions = [
  { id: "low", label: "Low", credits: 1, note: "Local / still-first path" },
  { id: "medium", label: "Medium", credits: 4, note: "Hybrid motion path" },
  { id: "high", label: "Premium", credits: 12, note: "Use only when justified" },
];

const card = { background: "#0e1219", border: "1px solid #252d3a", borderRadius: 20, padding: 20 };
const input = { width: "100%", boxSizing: "border-box", background: "#0a0e14", color: "#eef1f6", border: "1px solid #2b3442", borderRadius: 11, padding: "11px 12px" };
const button = { border: "1px solid #313a49", background: "#131923", color: "#eef1f6", borderRadius: 11, padding: "10px 13px", fontWeight: 850, cursor: "pointer" };
const primary = { ...button, background: "#d4af37", borderColor: "#d4af37", color: "#151108" };
const mono = { fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" };

function scoreOutcome(form) {
  const reach = Number(form.reach || 0);
  const saves = Number(form.saves || 0);
  const shares = Number(form.shares || 0);
  const profile = Number(form.profile_actions || 0);
  const clicks = Number(form.clicks || 0);
  const conversions = Number(form.conversions || 0);
  const revenue = Number(form.revenue || 0);
  const views = Math.max(Number(form.views || 0), 1);
  const engagement = ((saves + shares + profile + clicks) / views) * 1000;
  const monetisation = conversions * 8 + revenue;
  return Math.min(100, Math.round((Math.min(40, engagement) * 1.5) + (Math.min(25, profile) * 1.2) + Math.min(20, clicks) + Math.min(20, monetisation)));
}

function normaliseWinnerReason(form, score) {
  const parts = [];
  if (Number(form.saves) > 0) parts.push("earned saves");
  if (Number(form.shares) > 0) parts.push("earned shares");
  if (Number(form.profile_actions) > 0) parts.push("drove profile action");
  if (Number(form.conversions) > 0 || Number(form.revenue) > 0) parts.push("produced monetisation evidence");
  return `${score}/100 · ${parts.join(", ") || "operator-selected evidence"}`;
}

function writeAutopilotLearning(recommendation) {
  const current = {
    persona: recommendation.creator_id === "Lila" ? "lila" : recommendation.creator_id === "Cara + Lila" ? "duo" : "cara",
    platform: recommendation.platform || "TikTok",
    goal: recommendation.proof_type === "fanvue_monetisation" ? "Monetise" : "Grow account",
    signals: `PROVEN WINNER — CONTROLLED REPLICATION\nInvariant pattern: ${recommendation.invariant_pattern || ""}\nHook type: ${recommendation.hook_type || ""}\nFirst-frame behaviour: ${recommendation.first_frame_behaviour || ""}\nEmotional trigger: ${recommendation.emotional_trigger || ""}\nFormat: ${recommendation.format || ""}\n\nOperator instruction: ${recommendation.reusable_prompt_context}\n\nReplicate the mechanism, not the exact execution. Produce controlled variation rather than a duplicate.`,
    niche: "Quiet ambition · style · everyday life · mindset · money · calm luxury",
    count: 12,
    source: "learning_loop",
    seeded_at: new Date().toISOString(),
  };
  try { localStorage.setItem("caig_autopilot_creative_v1", JSON.stringify(current)); } catch {}
  // Durable record already written to track_b_learning_recommendations by saveOutcome / replicateWinner.
}

export default function OperatorWorkbench() {
  const hour = new Date().getHours();
  const defaultTab = hour >= 8 && hour < 13 ? "revenue" : hour >= 13 && hour < 19 ? "production" : "revenue";
  const [tab, setTab] = useState(() => localStorage.getItem("caig_operator_tab") || defaultTab);
  const [events, setEvents] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [dna, setDna] = useState([]);
  const [backlog, setBacklog] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [dealer, setDealer] = useState({ dealer_id: "", dealer_name: "", sample_vehicle: "", listing_url: "", notes: "" });
  const [outcome, setOutcome] = useState({ creator_id: "Cara", proof_type: "public_social", platform: "TikTok", title: "", content_external_id: "", views: "", reach: "", saves: "", shares: "", comments: "", profile_actions: "", clicks: "", conversions: "", revenue: "", operator_note: "", hook_type: "", format: "", first_frame_behaviour: "", emotional_trigger: "", invariant_pattern: "" });
  const [preflightTier, setPreflightTier] = useState(() => localStorage.getItem("caig_preflight_tier") || "low");
  const [sceneContract, setSceneContract] = useState({ location: "", timeOfDay: "", action: "", props: "", wardrobe: "", exclusions: "" });
  const [sceneQaResult, setSceneQaResult] = useState(null);

  useEffect(() => { localStorage.setItem("caig_operator_tab", tab); }, [tab]);
  useEffect(() => { localStorage.setItem("caig_preflight_tier", preflightTier); }, [preflightTier]);

  async function load() {
    setBusy(true);
    const [e, p, d, c, j] = await Promise.all([
      supabase.from("track_a_revenue_events").select("*").order("created_at", { ascending: false }).limit(120),
      supabase.from("track_b_performance_evidence").select("*").order("created_at", { ascending: false }).limit(80),
      supabase.from("track_b_creative_dna").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.from("track_b_caption_backlog").select("*").in("status", ["waiting", "processing", "ready", "queued"]).order("created_at", { ascending: true }).limit(80),
      supabase.from("local_ai_jobs").select("id,title,job_type,status,result,production_status,created_at,completed_at").order("created_at", { ascending: false }).limit(50),
    ]);
    setEvents(e.data || []); setEvidence(p.data || []); setDna(d.data || []); setBacklog(c.data || []); setJobs(j.data || []);
    if (e.error) setMessage(e.error.message);
    setBusy(false);
  }

  useEffect(() => { load(); }, []);

  const stages = useMemo(() => {
    const counts = Object.fromEntries(["outreach", "positive", "sample", "diagnostic", "pilot", "recurring"].map((s) => [s, 0]));
    for (const row of events) counts[row.stage] = (counts[row.stage] || 0) + 1;
    return counts;
  }, [events]);

  const latestWinners = useMemo(() => evidence.filter((x) => x.winner).slice(0, 6), [evidence]);
  const readyReview = useMemo(() => jobs.filter((j) => ["autopilot_concept", "content_package", "repurpose"].includes(j.job_type) && ["completed", "review"].includes(j.status)), [jobs]);
  const cost = costOptions.find((x) => x.id === preflightTier) || costOptions[0];
  const cheaper = costOptions[Math.max(0, costOptions.findIndex((x) => x.id === preflightTier) - 1)];

  async function logRevenue(stage, eventType, extra = {}) {
    if (!dealer.dealer_name) { setMessage("Add the dealer name first."); return; }
    const { error } = await supabase.from("track_a_revenue_events").insert({ dealer_id: dealer.dealer_id || null, dealer_name: dealer.dealer_name, stage, event_type: eventType, source_listing_url: dealer.listing_url || null, sample_package: extra.sample_package || {}, notes: extra.notes || null });
    setMessage(error ? error.message : `${eventType.replaceAll("_", " ")} logged.`);
    await load();
  }

  async function generateSamplePackage() {
    if (!dealer.dealer_name || !dealer.sample_vehicle) { setMessage("Dealer name and sample vehicle are required."); return; }
    setBusy(true); setMessage("Queuing the sample package for local Qwen…");
    const systemPrompt = `You are the Track A merchandising consultant for Cornerstone AI Group. Create a sample vehicle merchandising package from the supplied real listing context. Do not invent vehicle facts. The output is a demonstration for a dealership owner: before/after framing, image treatment notes, listing diagnostic, and the smallest useful next step. Return JSON only.`;
    const userPrompt = `DEALER: ${JSON.stringify(dealer)}\n\nReturn {"listing_diagnostic":"","sample_plan":"","image_direction":"","before_after_explanation":"","diagnostic_call_questions":["","",""]}. Core promise: improve presentation of the real stock using the dealer's existing photos, reduce avoidable photography/listing admin, and make the stock look easier to buy.`;
    const { data, error } = await supabase.from("local_ai_jobs").insert({ title: `Track A sample · ${dealer.dealer_name} · ${dealer.sample_vehicle}`, job_type: "track_a_sample_package", model: "mlx-community/Qwen3-8B-4bit", persona_id: "cornerstone_track_a", system_prompt: systemPrompt, user_prompt: userPrompt, options: { max_tokens: 2600, temperature: 0.42, research_domain: "TRACK_A_AUTOMOTIVE_B2B" }, status: "queued", production_status: "not_started" }).select("id").single();
    if (error) setMessage(error.message); else { await logRevenue("sample", "sample_ready", { sample_package: { job_id: data.id, vehicle: dealer.sample_vehicle, listing_url: dealer.listing_url } }); setMessage(`Sample package queued · ${data.id.slice(0, 8)}`); }
    setBusy(false);
  }

  async function saveOutcome() {
    if (!outcome.title) { setMessage("Give the post a title first."); return; }
    setBusy(true);
    const score = scoreOutcome(outcome);
    const winner = score >= 65;
    const reason = normaliseWinnerReason(outcome, score);
    const structure = { hook_type: outcome.hook_type, format: outcome.format, first_frame_behaviour: outcome.first_frame_behaviour, emotional_trigger: outcome.emotional_trigger, invariant_pattern: outcome.invariant_pattern };
    const { data, error } = await supabase.from("track_b_performance_evidence").insert({ ...Object.fromEntries(Object.entries(outcome).filter(([k]) => !["hook_type", "format", "first_frame_behaviour", "emotional_trigger", "invariant_pattern"].includes(k))), outcome_score: score, winner, winner_reason: winner ? reason : null, structure }).select("id").single();
    if (error) { setMessage(error.message); setBusy(false); return; }
    if (winner) {
      const context = `This is a proven ${outcome.proof_type === "fanvue_monetisation" ? "monetisation" : "public-social"} winner. Preserve the invariant mechanism: ${outcome.invariant_pattern || ""}. Hook: ${outcome.hook_type || ""}. First frame: ${outcome.first_frame_behaviour || ""}. Emotional trigger: ${outcome.emotional_trigger || ""}. Format: ${outcome.format || ""}. Use controlled variation only.`;
      await supabase.from("track_b_learning_recommendations").insert({ source_evidence_id: data.id, proof_type: outcome.proof_type, creator_id: outcome.creator_id, platform: outcome.platform, recommendation_type: "replicate", hook_type: outcome.hook_type, format: outcome.format, first_frame_behaviour: outcome.first_frame_behaviour, emotional_trigger: outcome.emotional_trigger, invariant_pattern: outcome.invariant_pattern, controlled_variations: ["change setting", "change opening line", "change payoff while preserving mechanism"], reusable_prompt_context: context, confidence: score >= 82 ? "high" : "medium" });
      setMessage(`Winner captured at ${score}/100. The invariant mechanism is now reusable.`);
    } else setMessage(`Evidence saved at ${score}/100. Not promoted to winner yet.`);
    await load(); setBusy(false);
  }

  async function replicateWinner(item) {
    const recommendation = {
      creator_id: item.creator_id, platform: item.platform, proof_type: item.proof_type, invariant_pattern: item.invariant_pattern, hook_type: item.hook_type, first_frame_behaviour: item.first_frame_behaviour, emotional_trigger: item.emotional_trigger, format: item.format, reusable_prompt_context: item.reusable_prompt_context,
    };
    writeAutopilotLearning(recommendation);
    setMessage("Winner loaded into the next Autopilot run as controlled-replication context.");
    window.location.href = "/creative";
  }

  async function markReview(job, action) {
    const next = action === "approve" ? "approved" : action === "rewrite" ? "rewrite" : "killed";
    const { error } = await supabase.from("local_ai_jobs").update({ production_status: next }).eq("id", job.id);
    setMessage(error ? error.message : `${action} · ${job.title}`); await load();
  }

  useEffect(() => {
    const onKey = (event) => {
      if (tab !== "production" || !readyReview.length) return;
      const key = event.key.toLowerCase();
      if (["a", "r", "k"].includes(key)) { event.preventDefault(); markReview(readyReview[0], key === "a" ? "approve" : key === "r" ? "rewrite" : "kill"); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [tab, readyReview]);

  function runSceneQa() {
    const checks = {
      location: Boolean(sceneContract.location?.trim()),
      timeOfDay: Boolean(sceneContract.timeOfDay?.trim()),
      action: Boolean(sceneContract.action?.trim()),
      props: Boolean(sceneContract.props?.trim()),
      wardrobe: Boolean(sceneContract.wardrobe?.trim()),
    };
    const missing = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
    const pass = missing.length === 0;
    setSceneQaResult({
      pass,
      missing,
      summary: pass
        ? "Scene contract structurally passes pre-flight. Complete visual verification against the generated media before publish."
        : `Scene contract blocked. Missing: ${missing.join(", ")}.`,
    });
    setMessage(pass
      ? "Scene contract structurally passes pre-flight. Visual verification should run on the final media before publish."
      : `Scene contract blocked: missing ${missing.join(", ")}.`);
  }

  const header = <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}><div><div style={{ color: "#d4af37", fontSize: 10, textTransform: "uppercase", letterSpacing: ".18em", fontWeight: 950 }}>Cornerstone OS · Operator Workbench</div><h1 style={{ margin: "8px 0 8px", fontSize: 42, lineHeight: .98, letterSpacing: "-.05em" }}>{tab === "revenue" ? "Make money first." : tab === "learning" ? "Make winners compound." : "Ship without friction."}</h1><p style={{ margin: 0, color: "#8791a1", maxWidth: 830, lineHeight: 1.65 }}>{tab === "revenue" ? "Your morning surface: pipeline movement, sample-ready dealers and the next commercial action." : tab === "learning" ? "Turn real post-publish evidence into reusable Creative DNA, then load it into the next Autopilot run." : "Your afternoon surface: review queue, cost pre-flight, caption backlog and production health."}</p></div><button onClick={load} style={button}>{busy ? "Working…" : "Refresh"}</button></div>;

  return <div style={{ minHeight: "100vh", background: "#07090d", color: "#f1f3f6", padding: "34px 26px 90px", fontFamily: "Inter, system-ui, sans-serif" }}>
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {header}
      <div style={{ display: "flex", gap: 9, marginTop: 22, marginBottom: 18, flexWrap: "wrap" }}>{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} style={{ ...button, borderColor: tab === item.id ? "#d4af37" : "#303947", background: tab === item.id ? "rgba(212,175,55,.09)" : "#11151d" }}><span style={{ color: tab === item.id ? "#d4af37" : "#7e8899", fontSize: 9, textTransform: "uppercase", letterSpacing: ".1em", marginRight: 8 }}>{item.eyebrow}</span>{item.label}</button>)}</div>
      {message && <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: "#0e141c", border: "1px solid #283240", color: "#c9d0da", fontSize: 12 }}>{message}</div>}

      {tab === "revenue" && <div style={{ display: "grid", gap: 16 }}>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 10 }}>{["outreach", "positive", "sample", "diagnostic", "pilot", "recurring"].map((stage) => <div key={stage} style={{ ...card, padding: 15 }}><div style={{ color: "#7e8797", fontSize: 9, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 900 }}>{stage}</div><div style={{ marginTop: 7, fontSize: 30, fontWeight: 950 }}>{stages[stage]}</div></div>)}</section>
        <section style={{ ...card, borderColor: "rgba(212,175,55,.24)" }}><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 900 }}>Sample generator</div><h2 style={{ margin: "7px 0 6px", fontSize: 25 }}>Turn a real listing into a reason to talk.</h2><p style={{ color: "#8993a3", fontSize: 12, lineHeight: 1.6 }}>Qwen creates the merchandising diagnosis, before/after direction and diagnostic-call questions. It uses only the supplied dealer/listing facts.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginTop: 12 }}>{[["dealer_name","Dealer name"],["sample_vehicle","Sample vehicle"],["dealer_id","Dealer ID (optional)"],["listing_url","Live listing URL (optional)"],["notes","Observed notes (optional)"]].map(([key,label]) => <input key={key} value={dealer[key]} onChange={(e) => setDealer((d) => ({ ...d, [key]: e.target.value }))} placeholder={label} style={{ ...input, gridColumn: key === "notes" ? "1 / -1" : "auto" }} />)}</div><div style={{ display: "flex", gap: 9, marginTop: 12, flexWrap: "wrap" }}><button onClick={generateSamplePackage} style={primary}>Generate sample package →</button><button onClick={() => logRevenue("positive", "positive_reply")} style={button}>Log positive reply</button><button onClick={() => logRevenue("diagnostic", "diagnostic_booked")} style={button}>Log diagnostic booked</button><button onClick={() => logRevenue("pilot", "pilot_started")} style={button}>Log pilot started</button></div></section>
        <section style={{ ...card }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}><div><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 900 }}>Commercial evidence</div><h3 style={{ margin: "6px 0 0", fontSize: 19 }}>Most recent movement</h3></div><a href="/outreach" style={{ ...button, textDecoration: "none" }}>Open Outreach →</a></div><div style={{ display: "grid", gap: 8, marginTop: 14 }}>{events.slice(0, 8).map((row) => <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr .9fr 1.3fr", gap: 10, alignItems: "center", padding: "10px 12px", border: "1px solid #222a35", borderRadius: 11, background: "#0b0f15" }}><div style={{ fontWeight: 850 }}>{row.dealer_name}</div><div style={{ color: "#d4af37", fontSize: 11 }}>{row.stage}</div><div style={{ color: "#7e8797", fontSize: 10 }}>{new Date(row.created_at).toLocaleString()}</div><div style={{ color: "#7f8999", fontSize: 10 }}>{row.notes || "—"}</div></div>)}</div></section>
      </div>}

      {tab === "learning" && <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
        <section style={card}><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 900 }}>Post-publish evidence capture</div><h2 style={{ margin: "7px 0 5px", fontSize: 24 }}>Tell the system what happened.</h2><p style={{ color: "#8791a1", fontSize: 12, lineHeight: 1.55 }}>Capture evidence after publishing. Winner status is earned by real signals, not vibes.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 9, marginTop: 12 }}>{[["creator_id","Creator"],["proof_type","Proof type"],["platform","Platform"],["title","Content title"],["content_external_id","Post ID"],["views","Views"],["reach","Reach"],["saves","Saves"],["shares","Shares"],["comments","Comments"],["profile_actions","Profile actions"],["clicks","Clicks"],["conversions","Conversions"],["revenue","Revenue"]].map(([key,label]) => key === "creator_id" ? <select key={key} value={outcome[key]} onChange={(e) => setOutcome((o) => ({ ...o, [key]: e.target.value }))} style={input}><option>Cara</option><option>Lila</option><option>Cara + Lila</option></select> : key === "proof_type" ? <select key={key} value={outcome[key]} onChange={(e) => setOutcome((o) => ({ ...o, [key]: e.target.value }))} style={input}><option value="public_social">Public social</option><option value="fanvue_monetisation">Fanvue monetisation</option></select> : <input key={key} value={outcome[key]} onChange={(e) => setOutcome((o) => ({ ...o, [key]: e.target.value }))} placeholder={label} style={input} />)}</div><div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 9 }}>{[["hook_type","Hook type"],["format","Format"],["first_frame_behaviour","First-frame behaviour"],["emotional_trigger","Emotional trigger"],["invariant_pattern","Invariant pattern"],["operator_note","Operator note — why did this work?"]].map(([key,label]) => <input key={key} value={outcome[key]} onChange={(e) => setOutcome((o) => ({ ...o, [key]: e.target.value }))} placeholder={label} style={{ ...input, gridColumn: key === "operator_note" ? "1 / -1" : "auto" }} />)}</div><div style={{ marginTop: 12, padding: 13, borderRadius: 12, border: "1px solid #2a3340", background: "#0b0f15" }}><div style={{ color: "#7c8797", fontSize: 9, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 900 }}>Current outcome score</div><div style={{ marginTop: 5, fontSize: 26, fontWeight: 950 }}>{scoreOutcome(outcome)}/100</div><div style={{ marginTop: 5, color: "#6f7889", fontSize: 10 }}>≥65 is eligible to become a reusable winner.</div></div><button onClick={saveOutcome} style={{ ...primary, marginTop: 12 }}>Save evidence + promote winner →</button></section>
        <section style={card}><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 900 }}>Creative DNA</div><h2 style={{ margin: "7px 0 5px", fontSize: 24 }}>Proven winners</h2><p style={{ color: "#8791a1", fontSize: 12, lineHeight: 1.55 }}>Public-social proof and monetisation proof stay separate.</p><div style={{ display: "grid", gap: 10, marginTop: 12 }}>{latestWinners.map((item) => <div key={item.id} style={{ border: "1px solid #28313e", borderRadius: 13, padding: 13, background: "#0b0f15" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div style={{ fontWeight: 900 }}>{item.title}</div><span style={{ color: "#d4af37", fontSize: 10, ...mono }}>{item.outcome_score}/100</span></div><div style={{ color: "#7f899a", fontSize: 10, marginTop: 5 }}>{item.creator_id} · {item.platform} · {item.winner_reason}</div><div style={{ color: "#cbd2dc", fontSize: 11, lineHeight: 1.55, marginTop: 9 }}>{item.operator_note || "No operator note recorded."}</div><button onClick={() => replicateWinner({ ...item, reusable_prompt_context: `Winner: ${item.title}. ${item.winner_reason}. Structure: ${JSON.stringify(item.structure)}. Operator note: ${item.operator_note || ""}` })} style={{ ...button, marginTop: 10, borderColor: "#d4af37" }}>Replicate with controlled variation →</button></div>)}{!latestWinners.length && <div style={{ color: "#667083", fontSize: 12, padding: 16, border: "1px dashed #2a3340", borderRadius: 12 }}>No validated winners yet. Capture your first post-publish outcome.</div>}</div></section>
      </div>}

      {tab === "production" && <div style={{ display: "grid", gap: 16 }}>
        <section style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 16 }}><div style={card}><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 900 }}>Review queue</div><h2 style={{ margin: "7px 0 4px", fontSize: 24 }}>A / R / K</h2><p style={{ color: "#8791a1", fontSize: 12 }}>Keyboard: <b>A</b> approve · <b>R</b> rewrite · <b>K</b> kill.</p><div style={{ display: "grid", gap: 8, marginTop: 12 }}>{readyReview.slice(0, 8).map((job, index) => <div key={job.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "11px 12px", borderRadius: 11, border: index === 0 ? "1px solid #d4af37" : "1px solid #252e3b", background: "#0b0f15" }}><div><div style={{ fontSize: 12, fontWeight: 850 }}>{job.title}</div><div style={{ color: "#6e7889", fontSize: 9, marginTop: 4 }}>{job.job_type} · {job.status}</div></div><div style={{ display: "flex", gap: 6 }}><button onClick={() => markReview(job,"approve")} style={button}>A</button><button onClick={() => markReview(job,"rewrite")} style={button}>R</button><button onClick={() => markReview(job,"kill")} style={button}>K</button></div></div>)}{!readyReview.length && <div style={{ color: "#667083", fontSize: 12, padding: 14, border: "1px dashed #2a3340", borderRadius: 11 }}>Nothing waiting for review.</div>}</div></div><div style={card}><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 900 }}>Cost pre-flight + Scene contract</div><h2 style={{ margin: "7px 0 4px", fontSize: 24 }}>Pay for the idea, not the ego.</h2><select value={preflightTier} onChange={(e) => setPreflightTier(e.target.value)} style={{ ...input, marginTop: 10 }}>{costOptions.map((x) => <option key={x.id} value={x.id}>{x.label} · ~{x.credits} credits</option>)}</select><div style={{ marginTop: 12, color: "#cbd2dc", fontSize: 12 }}>{cost.note}</div>{cheaper && <div style={{ marginTop: 12, padding: 12, borderRadius: 11, background: "#0b0f15", border: "1px solid #26303d", color: "#9aa4b3", fontSize: 11 }}>Cheaper path: <b>{cheaper.label}</b> · save ~{cost.credits - cheaper.credits} credits. Use premium only where identity, motion or client-facing quality genuinely requires it.</div>}<div style={{ marginTop: 16, borderTop: "1px solid #252e3b", paddingTop: 14 }}><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 900, marginBottom: 8 }}>Scene contract pre-flight</div><div style={{ display: "grid", gap: 8 }}><input style={input} placeholder="Location" value={sceneContract.location} onChange={(e) => setSceneContract({ ...sceneContract, location: e.target.value })} /><input style={input} placeholder="Time of day" value={sceneContract.timeOfDay} onChange={(e) => setSceneContract({ ...sceneContract, timeOfDay: e.target.value })} /><input style={input} placeholder="Action" value={sceneContract.action} onChange={(e) => setSceneContract({ ...sceneContract, action: e.target.value })} /><input style={input} placeholder="Props (comma separated)" value={sceneContract.props} onChange={(e) => setSceneContract({ ...sceneContract, props: e.target.value })} /><input style={input} placeholder="Wardrobe" value={sceneContract.wardrobe} onChange={(e) => setSceneContract({ ...sceneContract, wardrobe: e.target.value })} /><input style={input} placeholder="Exclusions (what must not appear)" value={sceneContract.exclusions} onChange={(e) => setSceneContract({ ...sceneContract, exclusions: e.target.value })} /></div><button onClick={runSceneQa} style={{ ...button, marginTop: 10 }}>Validate scene contract →</button>{sceneQaResult && <div style={{ marginTop: 10, padding: 10, borderRadius: 10, border: sceneQaResult.pass ? "1px solid rgba(114,205,167,.35)" : "1px solid rgba(255,100,100,.35)", background: sceneQaResult.pass ? "rgba(114,205,167,.08)" : "rgba(255,100,100,.08)", color: sceneQaResult.pass ? "#a6d9c2" : "#ffb7b7", fontSize: 11 }}>{sceneQaResult.summary}</div>}</div></div></section>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}><div style={card}><div style={{ color: "#7f8999", fontSize: 9, textTransform: "uppercase" }}>Caption backlog</div><div style={{ fontSize: 30, fontWeight: 950, marginTop: 6 }}>{backlog.length}</div><div style={{ color: "#667083", fontSize: 10, marginTop: 4 }}>unfinished local photos</div></div><div style={card}><div style={{ color: "#7f8999", fontSize: 9, textTransform: "uppercase" }}>Queued</div><div style={{ fontSize: 30, fontWeight: 950, marginTop: 6 }}>{jobs.filter((j) => j.status === "queued").length}</div><div style={{ color: "#667083", fontSize: 10, marginTop: 4 }}>Qwen jobs</div></div><div style={card}><div style={{ color: "#7f8999", fontSize: 9, textTransform: "uppercase" }}>Processing</div><div style={{ fontSize: 30, fontWeight: 950, marginTop: 6 }}>{jobs.filter((j) => j.status === "processing").length}</div><div style={{ color: "#667083", fontSize: 10, marginTop: 4 }}>local worker load</div></div><div style={card}><div style={{ color: "#7f8999", fontSize: 9, textTransform: "uppercase" }}>Library</div><div style={{ fontSize: 30, fontWeight: 950, marginTop: 6 }}>{dna.length}</div><div style={{ color: "#667083", fontSize: 10, marginTop: 4 }}>DNA records</div></div></section>
        <section style={card}><div style={{ color: "#d4af37", fontSize: 9, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 900 }}>Permanent caption discipline</div><h2 style={{ margin: "7px 0 5px", fontSize: 21 }}>Nothing unfinished disappears.</h2><div style={{ display: "grid", gap: 8, marginTop: 12 }}>{backlog.slice(0, 12).map((row) => <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr .7fr .7fr .8fr", gap: 10, padding: "10px 12px", background: "#0b0f15", border: "1px solid #232c38", borderRadius: 10, fontSize: 10 }}><div style={{ fontWeight: 850 }}>{row.local_file_name || "Unnamed photo"}</div><div style={{ color: "#d4af37" }}>{row.creator_id}</div><div style={{ color: "#7f8999" }}>{row.platform}</div><div style={{ color: "#7f8999" }}>{row.status}</div></div>)}{!backlog.length && <div style={{ color: "#667083", fontSize: 12 }}>Caption backlog clear.</div>}</div></section>
      </div>}
    </div>
  </div>;
}
