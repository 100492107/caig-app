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

function triggerWorkspaceStage(item, index) {
  const stage = item.stages?.[index];
  if (!stage) return;
  const root = document.querySelector(".tb-workspace-body");
  if (!root) return;

  const exactButtons = Array.from(root.querySelectorAll("button")).filter((button) => {
    const text = String(button.textContent || "").trim().toLowerCase();
    return text === stage.toLowerCase() || text.includes(stage.toLowerCase());
  });
  const target = exactButtons.find((button) => !button.closest(".tb-stage-nav"));
  if (target) {
    target.click();
    return;
  }

  const headings = Array.from(root.querySelectorAll("h2,h3,h4,summary,label"));
  const node = headings.find((element) => String(element.textContent || "").toLowerCase().includes(stage.toLowerCase()));
  node?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const changeStage = (index) => {
    setStage(index);
    window.setTimeout(() => triggerWorkspaceStage(current, index), 0);
  };
  const nextStage = () => changeStage(Math.min(stage + 1, current.stages.length - 1));
  const previousStage = () => changeStage(Math.max(stage - 1, 0));

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
            <div className="tb-stagebar"><StageNav item={current} active={stage} onChange={changeStage} /></div>
          </div>
        </header>

        <div className="tb-content">
          <div className="tb-workspace-body"><Workspace id={view} /></div>
          {current.stages?.length > 1 && (
            <div className="tb-mobile-stage-controls" aria-label="Stage controls">
              <button type="button" className="tb-secondary" disabled={stage === 0} onClick={previousStage}>Back</button>
              <span>{current.stages[stage]}</span>
              <button type="button" className="tb-primary" disabled={stage === current.stages.length - 1} onClick={nextStage}>Next</button>
            </div>
          )}
          <div className="tb-bottom-safe" />
        </div>
      </main>
    </div>
  );
}
