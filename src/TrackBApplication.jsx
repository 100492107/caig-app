import React, { useEffect, useMemo, useState } from "react";
import "./trackBApplication.css";
import AutopilotStagedBridge from "./AutopilotStagedBridge.jsx";
import YouTubeGrowthNicheWorkspace from "./YouTubeGrowthNicheWorkspace.jsx";
import CaptionWriterStaged from "./CaptionWriterStaged.jsx";
import PersistentGenerations from "./PersistentGenerations.jsx";
import { CreatorsStaged, ShopStaged, MediaStaged, CaptionStudioStaged, LocalAIStaged } from "./TrackBStagedSurfaces.jsx";
import { supabase } from "./supabase";

const GROUPS = [
  { label: "Create", items: [
    { id: "autopilot", label: "Autopilot", icon: "✦", stages: ["Radar", "Concepts", "Production"] },
    { id: "creators", label: "Creators", icon: "◌", stages: ["Creators", "Research", "Production"] },
    { id: "shop", label: "Shop", icon: "◇", stages: ["Offer", "Creative", "Test"] },
    { id: "youtube", label: "YouTube", icon: "▶", stages: ["Brief", "Opportunity", "Package", "Production"] },
  ]},
  { label: "Library", items: [
    { id: "media", label: "Media", icon: "▦", stages: ["Library", "Sources", "Derived"] },
    { id: "caption-writer", label: "Caption Writer", icon: "Aa", stages: ["Select", "Write", "Review"] },
    { id: "caption-studio", label: "Caption Studio", icon: "≡", stages: ["Backlog", "Edit", "Ready"] },
    { id: "saved", label: "Saved Generations", icon: "▣", special: true, stages: [] },
  ]},
  { label: "System", items: [
    { id: "local-ai", label: "Local AI", icon: "⌘", stages: ["Status", "Queue", "History"] },
  ]},
];
const ITEMS = GROUPS.flatMap((g) => g.items);

function Workspace({ id, stage, onStageChange }) {
  switch (id) {
    case "autopilot": return <AutopilotStagedBridge stage={stage} onStageChange={onStageChange} />;
    case "creators": return <CreatorsStaged stage={stage} />;
    case "shop": return <ShopStaged stage={stage} />;
    case "youtube": return <YouTubeGrowthNicheWorkspace />;
    case "media": return <MediaStaged stage={stage} />;
    case "caption-writer": return <CaptionWriterStaged stage={stage} />;
    case "caption-studio": return <CaptionStudioStaged stage={stage} />;
    case "local-ai": return <LocalAIStaged stage={stage} />;
    default: return <AutopilotStagedBridge stage={stage} onStageChange={onStageChange} />;
  }
}

function LocalAIStatus() {
  const [worker, setWorker] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data, error: queryError } = await supabase
        .from("local_ai_worker_heartbeat")
        .select("status,last_seen,model,current_job_id,current_job_type,hostname")
        .eq("id", "qwen")
        .maybeSingle();
      if (!mounted) return;
      if (queryError) { setError(queryError.message); return; }
      setWorker(data || null);
      setError("");
    }
    load();
    const timer = window.setInterval(load, 5000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  const fresh = worker?.last_seen ? (Date.now() - new Date(worker.last_seen).getTime()) < 15000 : false;
  const status = fresh && worker?.status === "busy" ? "busy" : fresh && worker?.status === "online" ? "online" : "offline";
  const label = status === "busy" ? "Qwen busy" : status === "online" ? "Local AI online" : "Local AI offline";
  const detail = status === "busy" ? `Processing ${worker?.current_job_type || "job"}` : error ? "Status unavailable" : status === "online" ? "Mac ready" : "Start local Qwen on your Mac";

  return (
    <div className={`tb-ai-status is-${status}`} title={worker?.hostname ? `${detail} · ${worker.hostname}` : detail} aria-label={`${label}. ${detail}`}>
      <span className="tb-ai-dot" aria-hidden="true" />
      <span className="tb-ai-label">{label}</span>
      <span className="tb-ai-detail">{detail}</span>
    </div>
  );
}

export default function TrackBApplication() {
  const [view, setView] = useState(() => { try { return sessionStorage.getItem("caig_track_b_view") || "autopilot"; } catch { return "autopilot"; } });
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("caig_tb_sidebar") === "1"; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stage, setStage] = useState(0);
  const current = useMemo(() => ITEMS.find((item) => item.id === view) || ITEMS[0], [view]);
  const stages = current.stages || [];

  useEffect(() => { try { sessionStorage.setItem("caig_track_b_view", view); } catch {} setStage(0); setMobileOpen(false); }, [view]);
  useEffect(() => { try { localStorage.setItem("caig_tb_sidebar", collapsed ? "1" : "0"); } catch {} }, [collapsed]);
  useEffect(() => { const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "\\") { e.preventDefault(); setCollapsed((v) => !v); } if (e.key === "Escape") setMobileOpen(false); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);
  const changeStage = (next) => setStage(Math.max(0, Math.min(next, Math.max(0, stages.length - 1))));

  return <div className={`tb-app${collapsed ? " is-collapsed" : ""}`}>
    <aside className={`tb-sidebar${mobileOpen ? " is-open" : ""}`}>
      <div className="tb-brand"><a href="/" className="tb-brand-link" aria-label="Back to Cornerstone Enterprise"><span className="tb-mark">C</span><span className="tb-brand-copy"><strong>Creative Station</strong><span>Track B</span></span></a><button className="tb-collapse" type="button" onClick={() => setCollapsed((v) => !v)} aria-label="Toggle navigation">{collapsed ? "›" : "‹"}</button></div>
      <nav className="tb-nav" aria-label="Track B navigation">{GROUPS.map((group) => <section className="tb-group" key={group.label}><div className="tb-group-label">{group.label}</div>{group.items.map((item) => <button key={item.id} className={`tb-item${view === item.id ? " is-active" : ""}`} type="button" onClick={() => item.special ? document.querySelector('[aria-label="Open saved generations"]')?.click() : setView(item.id)} title={collapsed ? item.label : undefined}><span className="tb-icon">{item.icon}</span><span className="tb-label">{item.label}</span></button>)}</section>)}</nav>
      <div className="tb-sidebar-footer"><LocalAIStatus /><a href="/" className="tb-enterprise"><span>←</span><span>Enterprise</span></a></div>
    </aside>
    <main className="tb-main">
      <header className="tb-topbar"><div className="tb-topbar-inner"><button type="button" className="tb-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">☰</button><div className="tb-context"><div className="tb-context-kicker">Track B</div><div className="tb-context-title">{current.label}</div></div><div className="tb-stagebar">{stages.length > 0 && <div className="tb-stage-nav" aria-label={`${current.label} stages`}>{stages.map((s, i) => <button key={s} type="button" className={stage === i ? "is-active" : ""} onClick={() => changeStage(i)} aria-current={stage === i ? "step" : undefined}><span>{String(i + 1).padStart(2, "0")}</span>{s}</button>)}</div>}</div></div></header>
      <div className="tb-content"><div className="tb-workspace-body"><Workspace id={view} stage={stage} onStageChange={changeStage} /></div>{stages.length > 1 && <div className="tb-mobile-stage-controls"><button className="tb-secondary" disabled={stage === 0} onClick={() => changeStage(stage - 1)}>Back</button><span>{stages[stage]}</span><button className="tb-primary" disabled={stage === stages.length - 1} onClick={() => changeStage(stage + 1)}>Next</button></div>}<div className="tb-bottom-safe" /></div>
    </main>
  </div>;
}
