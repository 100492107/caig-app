import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

const CRM_URL = "https://cornerstonegroupdatabase-bfc2v3f4m-100492107s-projects.vercel.app/";

function dayEnd() { const d = new Date(); d.setHours(23, 59, 59, 999); return d.toISOString(); }

function Stat({ value, label, urgent }) {
  return <div className={`operator-stat${urgent ? " is-urgent" : ""}`}><strong>{value}</strong><span>{label}</span></div>;
}

export default function OperatorCommandStrip() {
  const [state, setState] = useState({ warm: "—", samples: "—", calls: "—", followUps: "—", captions: 0, production: 0, ai: 0, failed: 0, partial: false });
  const [hour] = useState(() => new Date().getHours());
  const morning = hour >= 8 && hour < 13;

  useEffect(() => {
    let live = true;
    (async () => {
      const limit = dayEnd();
      const [r, c, p, a, f] = await Promise.all([
        supabase.from("track_a_revenue_events").select("dealer_id,dealer_name,event_type,stage,next_action_at,created_at").order("created_at", { ascending: false }).limit(400),
        supabase.from("track_b_caption_backlog").select("id").in("status", ["waiting", "processing", "ready", "queued"]),
        supabase.from("track_b_production_jobs").select("id").in("status", ["draft", "queued", "processing", "review"]),
        supabase.from("local_ai_jobs").select("id").in("status", ["queued", "processing"]),
        supabase.from("track_b_scene_contracts").select("id").eq("status", "failed"),
      ]);
      if (!live) return;
      const rows = r.error ? [] : (r.data || []);
      const latest = new Map();
      rows.forEach((x) => { const k = x.dealer_id || x.dealer_name; if (!latest.has(k)) latest.set(k, x); });
      const warm = [...latest.values()].filter((x) => ["positive", "sample", "diagnostic", "pilot"].includes(x.stage)).length;
      const samples = rows.filter((x) => (x.event_type === "sample_ready" || x.stage === "sample") && x.next_action_at && x.next_action_at <= limit).length;
      const calls = rows.filter((x) => (x.event_type === "diagnostic_booked" || x.stage === "diagnostic") && x.next_action_at && x.next_action_at <= limit).length;
      const now = new Date().toISOString();
      const followUps = rows.filter((x) => x.next_action_at && x.next_action_at <= now && !["lost", "recurring"].includes(x.stage)).length;
      setState({ warm: rows.length ? warm : "—", samples: rows.length ? samples : "—", calls: rows.length ? calls : "—", followUps: rows.length ? followUps : "—", captions: c.error ? 0 : c.data.length, production: p.error ? 0 : p.data.length, ai: a.error ? 0 : a.data.length, failed: f.error ? 0 : f.data.length, partial: [r,c,p,a,f].some((x) => x.error) });
    })();
    return () => { live = false; };
  }, []);

  const cashPressure = typeof state.samples === "number" && (state.samples > 0 || state.calls > 0 || state.followUps > 0);
  const shipCount = state.captions + state.production;

  return <div className="operator-strip">
    <section className={`operator-command operator-a${cashPressure ? " has-pressure" : ""}`}>
      <div className="operator-head"><div><div className="operator-kicker">TRACK A · CASH</div><h2>{cashPressure ? "Clear the cash queue." : "Generate demand."}</h2><p>{morning ? "Money work comes first." : "Keep the pipeline moving before you make more."}</p></div><a className="operator-cta" href={CRM_URL} target="_blank" rel="noreferrer">Open CRM ↗</a></div>
      <div className="operator-stats"><Stat value={state.warm} label="warm" urgent={state.warm > 0}/><Stat value={state.samples} label="samples due" urgent={state.samples > 0}/><Stat value={state.calls} label="calls due" urgent={state.calls > 0}/></div>
      <div className="operator-foot"><span>{state.followUps === "—" ? "CRM queue not mirrored here" : `${state.followUps} next actions due`}</span><span>3 samples · 2 calls · 1 follow-up target</span></div>
    </section>
    <section className="operator-command operator-b">
      <div className="operator-head"><div><div className="operator-kicker">TRACK B · SHIP</div><h2>{state.failed > 0 ? "Quality gate needs attention." : shipCount > 0 ? "Finish what is already in motion." : "Ship one package."}</h2><p>{morning ? "Do not browse creative until the cash queue is clear." : "Production before ideation."}</p></div><a className="operator-cta" href="/creative">Open Station →</a></div>
      <div className="operator-stats"><Stat value={state.captions} label="caption jobs" urgent={state.captions > 0}/><Stat value={state.production} label="production" urgent={state.production > 0}/><Stat value={state.ai} label="local AI" urgent={state.ai > 0}/></div>
      <div className="operator-foot"><span>{state.failed ? `${state.failed} failed scene check${state.failed === 1 ? "" : "s"}` : `${shipCount} unfinished item${shipCount === 1 ? "" : "s"}`}</span><span>Finish → ship → learn</span></div>
    </section>
  </div>;
}
