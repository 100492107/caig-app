import React, { useEffect, useMemo, useState } from "react";
import AutopilotCreativeEngine from "./AutopilotCreativeEngine.jsx";
import GrowthModeWorkspace from "./GrowthModeWorkspace.jsx";
import CommerceTestWorkspace from "./CommerceTestWorkspace.jsx";
import YouTubeGrowthNicheWorkspace from "./YouTubeGrowthNicheWorkspace.jsx";
import TrackBAssetLibrary from "./TrackBAssetLibrary.jsx";
import CaptionWriterStaged from "./CaptionWriterStaged.jsx";
import CaptionStudio from "./CaptionStudio.jsx";
import LocalAIStudio from "./LocalAIStudio.jsx";

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

const ITEMS = GROUPS.flatMap((group) => group.items);

function Workspace({ id }) {
  switch (id) {
    case "autopilot": return <AutopilotCreativeEngine />;
    case "creators": return <GrowthModeWorkspace />;
    case "shop": return <CommerceTestWorkspace />;
    case "youtube": return <YouTubeGrowthNicheWorkspace />;
    case "media": return <TrackBAssetLibrary />;
    case "caption-writer": return <CaptionWriterStaged />;
    case "caption-studio": return <CaptionStudio />;
    case "local-ai": return <LocalAIStudio />;
    default: return <AutopilotCreativeEngine />;
  }
}

function openSaved() {
  document.querySelector('[aria-label="Open saved generations"]')?.click();
}

function StageNav({ item, active, onChange }) {
  if (!item.stages?.length) return null;
  return (
    <div className="tb-stage-nav" aria-label={`${item.label} workflow stages`}>
      {item.stages.map((stage, index) => (
        <button key={stage} type="button" className={index === active ? "is-active" : ""} onClick={() => onChange(index)} aria-current={index === active ? "step" : undefined}>
          <span>{String(index + 1).padStart(2, "0")}</span>{stage}
        </button>
      ))}
    </div>
  );
}

function stageMessage(item, stage) {
  const messages = {
    autopilot: ["Read the live signal before making a creative decision.", "Compare concepts before committing production effort.", "Build only after the concept earns its place."],
    creators: ["Choose the creator and the job to be done.", "Use the latest evidence to shape the package.", "Produce the approved package with identity locked."],
    shop: ["Define the commercial offer and customer action.", "Build the creative around the offer, not the model.", "Run the test and record the outcome."],
    youtube: ["Set the brief and audience promise.", "Choose the strongest opportunity with evidence.", "Lock the title, thumbnail, hook and story package.", "Turn the approved package into production media."],
    media: ["Find the right asset first.", "Inspect the source and its provenance.", "Work from the approved derived asset."],
    "caption-writer": ["Choose the source photo and voice.", "Give Qwen the real context and evidence.", "Review, choose and copy the strongest line."],
    "caption-studio": ["Clear the backlog.", "Edit for platform and identity.", "Mark the caption ready."],
    "local-ai": ["Confirm local Qwen is online.", "See active jobs and bottlenecks.", "Inspect recent completed work."],
  };
  return (messages[item.id] || ["Work the current stage."])[stage] || "Work the current stage.";
}

export default function TrackBApplication() {
  const [view, setView] = useState(() => {
    try { return sessionStorage.getItem("caig_track_b_view") || "autopilot"; } catch { return "autopilot"; }
  });
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("caig_tb_sidebar") === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stage, setStage] = useState(0);
  const current = useMemo(() => ITEMS.find((item) => item.id === view) || ITEMS[0], [view]);

  useEffect(() => {
    try { sessionStorage.setItem("caig_track_b_view", view); } catch {}
    setStage(0);
    setMobileOpen(false);
  }, [view]);

  useEffect(() => {
    try { localStorage.setItem("caig_tb_sidebar", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        setCollapsed((value) => !value);
      }
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setStageSafe = (next) => setStage(Math.max(0, Math.min(next, Math.max(0, (current.stages?.length || 1) - 1))));

  return (
    <div className={`tb-app${collapsed ? " is-collapsed" : ""}`}>
      <aside className={`tb-sidebar${mobileOpen ? " is-open" : ""}`}>
        <div className="tb-brand">
          <a href="/" className="tb-brand-link" aria-label="Back to Cornerstone Enterprise">
            <span className="tb-mark">C</span>
            <span className="tb-brand-copy"><strong>Creative Station</strong><span>Track B</span></span>
          </a>
          <button className="tb-collapse" type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? "›" : "‹"}</button>
        </div>
        <nav className="tb-nav" aria-label="Track B workspace navigation">
          {GROUPS.map((group) => (
            <section className="tb-group" key={group.label}>
              <div className="tb-group-label">{group.label}</div>
              {group.items.map((item) => (
                <button key={item.id} type="button" className={`tb-item${view === item.id ? " is-active" : ""}${item.special ? " is-special" : ""}`} onClick={() => item.special ? openSaved() : setView(item.id)} title={collapsed ? item.label : undefined}>
                  <span className="tb-icon">{item.icon}</span><span className="tb-label">{item.label}</span>
                </button>
              ))}
            </section>
          ))}
        </nav>
        <div className="tb-sidebar-footer"><a href="/" className="tb-enterprise"><span>←</span><span>Enterprise</span></a></div>
      </aside>

      <main className="tb-main">
        <header className="tb-topbar">
          <div className="tb-topbar-inner">
            <button type="button" className="tb-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">☰</button>
            <div className="tb-context"><div className="tb-context-kicker">Track B</div><div className="tb-context-title">{current.label}</div></div>
            <div className="tb-stagebar"><StageNav item={current} active={stage} onChange={setStageSafe} /></div>
          </div>
        </header>

        <div className="tb-content">
          <section className="tb-taskbar">
            <div>
              <div className="tb-small-label">{current.stages?.length ? `Stage ${String(stage + 1).padStart(2, "0")}` : "Workspace"}</div>
              <h1>{current.stages?.[stage] || current.label}</h1>
              <p>{stageMessage(current, stage)}</p>
            </div>
            {current.stages?.length > 1 && (
              <div className="tb-step-controls">
                <button type="button" className="tb-secondary" onClick={() => setStageSafe(stage - 1)} disabled={stage === 0}>Back</button>
                <button type="button" className="tb-primary" onClick={() => setStageSafe(stage + 1)} disabled={stage >= current.stages.length - 1}>Next</button>
              </div>
            )}
          </section>
          <div className="tb-workspace-body"><Workspace id={view} /></div>
          <div className="tb-bottom-safe" />
        </div>
      </main>
    </div>
  );
}
