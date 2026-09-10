import React, { useEffect, useMemo, useState } from "react";
import "./trackBApplication.css";
import ContentEngineWorkspace from "./ContentEngineWorkspace.jsx";
import CaptionWriterStaged from "./CaptionWriterStaged.jsx";
import MPTVideoStudio from "./MPTVideoStudio.jsx";
import TrackBMeasurementWorkspace from "./TrackBMeasurementWorkspace.jsx";
import TrackBPublishWorkspace from "./TrackBPublishWorkspace.jsx";
import { CreatorsStaged, ShopStaged, MediaStaged, CaptionStudioStaged, LocalAIStaged } from "./TrackBStagedSurfaces.jsx";
import LocalAIStatus from "./LocalAIStatus.jsx";
import ProfileChannelsWorkspace from "./ProfileChannelsWorkspace.jsx";

const NAV = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "remake", label: "Remake a winner", icon: "✦" },
  { id: "creators", label: "Creators", icon: "◌" },
  { id: "profiles", label: "Profiles", icon: "◎" },
  { id: "production", label: "Studio", icon: "▶" },
  { id: "library", label: "Library", icon: "▦" },
];

function HomeHub({ onGo }) {
  return (
    <div className="tbh">
      <style>{`
        .tbh{max-width:920px;margin:0 auto;padding:8px 0 40px}
        .tbh-kicker{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#d4b56a;font-weight:800}
        .tbh-title{margin:10px 0 0;font-size:clamp(32px,5vw,48px);line-height:.98;letter-spacing:-.045em;font-weight:850;color:#f3f1eb}
        .tbh-sub{margin:14px 0 0;max-width:48ch;color:#9a9faa;font-size:16px;line-height:1.55}
        .tbh-jobs{display:grid;gap:12px;margin-top:28px}
        .tbh-job{display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:center;text-align:left;padding:20px 22px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:#161922;color:inherit;cursor:pointer;font:inherit;transition:border-color .15s,transform .15s}
        .tbh-job:hover{border-color:rgba(212,181,106,.35);transform:translateY(-1px)}
        .tbh-job.primary{border-color:rgba(212,181,106,.4);background:linear-gradient(135deg,rgba(212,181,106,.12),#161922 55%)}
        .tbh-job-icon{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:rgba(212,181,106,.12);color:#d4b56a;font-size:18px;font-weight:800}
        .tbh-job strong{display:block;font-size:17px;color:#f3f1eb;letter-spacing:-.02em}
        .tbh-job span{display:block;margin-top:5px;font-size:13px;color:#8b919c;line-height:1.4}
        .tbh-job em{font-style:normal;color:#d4b56a;font-size:18px}
        .tbh-money{margin-top:28px;padding:18px 20px;border-radius:16px;border:1px solid rgba(212,181,106,.25);background:rgba(212,181,106,.08)}
        .tbh-money strong{display:block;color:#f0e2bc;font-size:14px}
        .tbh-money p{margin:8px 0 0;color:#cfc3a4;font-size:13px;line-height:1.55}
      `}</style>
      <div className="tbh-kicker">Content Engine</div>
      <h1 className="tbh-title">What do you want to make?</h1>
      <p className="tbh-sub">Pick a job. One path. No seven-step labyrinth.</p>
      <div className="tbh-jobs">
        <button type="button" className="tbh-job primary" onClick={() => onGo("remake")}>
          <div className="tbh-job-icon">✦</div>
          <div>
            <strong>Remake a winner</strong>
            <span>Paste a video that already works. Get analysis, an original package, and Shorts ideas.</span>
          </div>
          <em>→</em>
        </button>
        <button type="button" className="tbh-job" onClick={() => onGo("creators")}>
          <div className="tbh-job-icon">◌</div>
          <div>
            <strong>Creator post</strong>
            <span>Package content as Cara or Lila for social and Fanvue.</span>
          </div>
          <em>→</em>
        </button>
        <button type="button" className="tbh-job" onClick={() => onGo("profiles")}>
          <div className="tbh-job-icon">◎</div>
          <div>
            <strong>Profiles & accounts</strong>
            <span>YouTube, TikTok, Instagram, Fanvue — where packages ship and earn.</span>
          </div>
          <em>→</em>
        </button>
        <button type="button" className="tbh-job" onClick={() => onGo("production")}>
          <div className="tbh-job-icon">▶</div>
          <div>
            <strong>Open studio</strong>
            <span>Render, caption, and prepare approved packages to publish.</span>
          </div>
          <em>→</em>
        </button>
      </div>
      <div className="tbh-money">
        <strong>How this makes money</strong>
        <p>
          Find proven attention → publish stronger originals → grow audience on your Profiles → monetise with Fanvue, affiliates, ads, or sponsors. The engine does the research and packaging. You ship.
        </p>
      </div>
    </div>
  );
}

function Workspace({ id, stage, onAdvance, onGo }) {
  switch (id) {
    case "home":
      return <HomeHub onGo={onGo} />;
    case "remake":
      return <ContentEngineWorkspace stage={stage} mode="remake" />;
    case "creators":
      return <CreatorsStaged stage={stage} onAdvance={onAdvance} />;
    case "profiles":
      return <ProfileChannelsWorkspace />;
    case "production":
      return <MPTVideoStudio stage={stage} />;
    case "library":
      return <MediaStaged stage={0} />;
    case "publish":
      return <TrackBPublishWorkspace stage={stage} />;
    case "measurement":
      return <TrackBMeasurementWorkspace stage={stage} />;
    case "shop":
      return <ShopStaged stage={stage} onAdvance={onAdvance} />;
    case "caption-studio":
      return <CaptionStudioStaged stage={stage} />;
    case "caption-writer":
      return <CaptionWriterStaged stage={stage} />;
    case "local-ai":
      return <LocalAIStaged stage={stage} />;
    default:
      return <HomeHub onGo={onGo} />;
  }
}

export default function TrackBApplication() {
  const [view, setView] = useState(() => {
    try {
      return sessionStorage.getItem("caig_track_b_view") || "home";
    } catch {
      return "home";
    }
  });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stage, setStage] = useState(0);
  const current = useMemo(() => NAV.find((item) => item.id === view) || NAV[0], [view]);

  useEffect(() => {
    try {
      sessionStorage.setItem("caig_track_b_view", view);
    } catch {}
    setStage(0);
    setMobileOpen(false);
  }, [view]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onAdvance = () => setStage((s) => s + 1);
  const onGo = (id) => setView(id);

  return (
    <div className={`tb-app${collapsed ? " is-collapsed" : ""}`}>
      <style>{`.creative-studio-surface > button[aria-label="Open saved generations"]{display:none!important}
      .tb-app{--tb-bg:#0c0e12;--tb-sidebar:#0a0c10;--tb-surface:#14171e;--tb-line:rgba(255,255,255,.07);--tb-text:#f3f1eb;--tb-muted:#8b919c;--tb-accent:#d4b56a}
      `}</style>
      {mobileOpen && (
        <button className="tb-mobile-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`tb-sidebar${mobileOpen ? " is-open" : ""}`}>
        <div className="tb-brand">
          <a href="/" className="tb-brand-link" aria-label="Back to Cornerstone">
            <span className="tb-mark">C</span>
            <span className="tb-brand-copy">
              <strong>Content Engine</strong>
              <span>Make · ship · earn</span>
            </span>
          </a>
          <button className="tb-mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close">
            ×
          </button>
        </div>
        <nav className="tb-nav" aria-label="Main">
          <section className="tb-group">
            <div className="tb-group-label">Main</div>
            {NAV.map((item) => (
              <button
                key={item.id}
                className={`tb-item${view === item.id ? " is-active" : ""}`}
                type="button"
                onClick={() => setView(item.id)}
                aria-current={view === item.id ? "page" : undefined}
              >
                <span className="tb-icon">{item.icon}</span>
                <span className="tb-label">{item.label}</span>
              </button>
            ))}
          </section>
        </nav>
        <div className="tb-sidebar-footer">
          <LocalAIStatus compact />
          <a href="/" className="tb-enterprise">
            <span>←</span>
            <span>Home</span>
          </a>
        </div>
      </aside>
      <main className="tb-main">
        <header className="tb-topbar">
          <div className="tb-topbar-inner">
            <button type="button" className="tb-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Menu">
              ☰
            </button>
            <div className="tb-context">
              <div className="tb-context-kicker">Content Engine</div>
              <div className="tb-context-title">{current.label}</div>
            </div>
            <LocalAIStatus compact />
          </div>
        </header>
        <div className="tb-content">
          <div className="tb-workspace-body">
            <Workspace id={view} stage={stage} onAdvance={onAdvance} onGo={onGo} />
          </div>
          <div className="tb-bottom-safe" />
        </div>
      </main>
    </div>
  );
}
