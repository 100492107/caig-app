import React, { useEffect, useMemo, useState } from "react";
import "./trackBApplication.css";
import ContentEngineWorkspace from "./ContentEngineWorkspace.jsx";
import CaptionWriterStaged from "./CaptionWriterStaged.jsx";
import PersistentGenerations from "./PersistentGenerations.jsx";
import MPTVideoStudio from "./MPTVideoStudio.jsx";
import TrackBMeasurementWorkspace from "./TrackBMeasurementWorkspace.jsx";
import { CreatorsStaged, ShopStaged, MediaStaged, CaptionStudioStaged, LocalAIStaged } from "./TrackBStagedSurfaces.jsx";
import LocalAIStatus from "./LocalAIStatus.jsx";

const GROUPS = [
  { label: "Engine", items: [
    { id: "content-engine", label: "Content Engine", icon: "✦", stages: ["Discover", "Analyse", "Build", "Multiply", "Publish", "Monetise", "Measure"] },
    { id: "measurement", label: "Measure", icon: "◒", stages: ["Published", "Capture", "History"] },
  ]},
  { label: "Production", items: [
    { id: "production", label: "Production Studio", icon: "▶", stages: ["Source", "Mode", "Queue"] },
  ]},
  { label: "Owned Assets", items: [
    { id: "creators", label: "Creators", icon: "◌", stages: ["Creators", "Research", "Production"] },
    { id: "shop", label: "Commerce", icon: "◇", stages: ["Offer", "Creative", "Test"] },
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

function Workspace({ id, stage }) {
  switch (id) {
    case "content-engine": return <ContentEngineWorkspace stage={stage} />;
    case "measurement": return <TrackBMeasurementWorkspace stage={stage} />;
    case "production": return <MPTVideoStudio stage={stage} />;
    case "creators": return <CreatorsStaged stage={stage} />;
    case "shop": return <ShopStaged stage={stage} />;
    case "media": return <MediaStaged stage={stage} />;
    case "caption-writer": return <CaptionWriterStaged stage={stage} />;
    case "caption-studio": return <CaptionStudioStaged stage={stage} />;
    case "local-ai": return <LocalAIStaged stage={stage} />;
    default: return <ContentEngineWorkspace stage={stage} />;
  }
}

export default function TrackBApplication() {
  const [view, setView] = useState(() => { try { return sessionStorage.getItem("caig_track_b_view") || "content-engine"; } catch { return "content-engine"; } });
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
    <style>{`.creative-studio-surface > button[aria-label="Open saved generations"]{display:none!important}`}</style>
    {mobileOpen && <button className="tb-mobile-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`tb-sidebar${mobileOpen ? " is-open" : ""}`}>
      <div className="tb-brand">
        <a href="/" className="tb-brand-link" aria-label="Back to Cornerstone Enterprise"><span className="tb-mark">C</span><span className="tb-brand-copy"><strong>Content Engine</strong><span>Track B</span></span></a>
        <button className="tb-mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation">×</button>
        <button className="tb-collapse" type="button" onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? "›" : "‹"}</button>
      </div>
      <nav className="tb-nav" aria-label="Track B navigation">{GROUPS.map((group) => <section className="tb-group" key={group.label}><div className="tb-group-label">{group.label}</div>{group.items.map((item) => <button key={item.id} className={`tb-item${view === item.id ? " is-active" : ""}`} type="button" onClick={() => item.special ? document.querySelector('[aria-label="Open saved generations"]')?.click() : setView(item.id)} title={collapsed ? item.label : undefined} aria-current={view === item.id ? "page" : undefined}><span className="tb-icon">{item.icon}</span><span className="tb-label">{item.label}</span></button>)}</section>)}</nav>
      <div className="tb-sidebar-footer"><LocalAIStatus compact /><a href="/" className="tb-enterprise"><span>←</span><span>Enterprise</span></a></div>
    </aside>
    <main className="tb-main">
      <header className="tb-topbar"><div className="tb-topbar-inner"><button type="button" className="tb-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-expanded={mobileOpen}>☰</button><div className="tb-context"><div className="tb-context-kicker">Track B</div><div className="tb-context-title">{current.label}</div></div><LocalAIStatus compact /><div className="tb-stagebar">{stages.length > 0 && <div className="tb-stage-nav" aria-label={`${current.label} stages`}>{stages.map((s, i) => <button key={s} type="button" className={stage === i ? "is-active" : ""} onClick={() => changeStage(i)} aria-current={stage === i ? "step" : undefined} aria-label={`${s}, stage ${i + 1} of ${stages.length}`}><span>{String(i + 1).padStart(2, "0")}</span>{s}</button>)}</div>}</div></div></header>
      <div className="tb-content"><div className="tb-workspace-body"><Workspace id={view} stage={stage} /></div>{stages.length > 1 && <div className="tb-mobile-stage-controls"><button className="tb-secondary" disabled={stage === 0} onClick={() => changeStage(stage - 1)}>Back</button><span aria-live="polite">{stages[stage]}</span><button className="tb-primary" disabled={stage === stages.length - 1} onClick={() => changeStage(stage + 1)}>Next</button></div>}<div className="tb-bottom-safe" /></div>
    </main>
  </div>;
}
