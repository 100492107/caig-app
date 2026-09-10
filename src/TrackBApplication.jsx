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
  { id: "remake", label: "Remake", icon: "✦" },
  { id: "creators", label: "Creators", icon: "◌" },
  { id: "profiles", label: "Profiles", icon: "◎" },
  { id: "production", label: "Studio", icon: "▶" },
  { id: "library", label: "Library", icon: "▦" },
];

function HomeHub({ onGo }) {
  return (
    <div className="tbh">
      <style>{`
        .tbh{max-width:1080px;margin:0 auto;padding:4px 0 48px;position:relative}
        .tbh::before{content:"";position:absolute;inset:-40px -20% auto;height:280px;background:radial-gradient(ellipse 70% 80% at 30% 0%,rgba(212,181,106,.14),transparent 70%);pointer-events:none;z-index:0}
        .tbh > *{position:relative;z-index:1}
        .tbh-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:8px}
        .tbh-kicker{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#d4b56a;font-weight:800}
        .tbh-title{margin:12px 0 0;font-size:clamp(36px,5.5vw,52px);line-height:.95;letter-spacing:-.05em;font-weight:860;color:#f6f4ef}
        .tbh-sub{margin:14px 0 0;max-width:42ch;color:#9a9faa;font-size:16px;line-height:1.55}
        .tbh-stats{display:flex;gap:10px;flex-wrap:wrap}
        .tbh-stat{min-width:100px;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(22,25,34,.85);backdrop-filter:blur(12px)}
        .tbh-stat b{display:block;font-size:18px;font-weight:850;color:#f0e6c8;letter-spacing:-.03em}
        .tbh-stat span{display:block;margin-top:3px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#6e7582;font-weight:700}
        .tbh-jobs{display:grid;grid-template-columns:1.35fr 1fr;gap:14px;margin-top:28px}
        @media(max-width:800px){.tbh-jobs{grid-template-columns:1fr}}
        .tbh-job{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:24px;border-radius:22px;border:1px solid rgba(255,255,255,.08);background:#161922;color:inherit;cursor:pointer;font:inherit;transition:border-color .18s,transform .18s,box-shadow .18s;min-height:160px}
        .tbh-job:hover{border-color:rgba(212,181,106,.4);transform:translateY(-2px);box-shadow:0 18px 40px rgba(0,0,0,.35)}
        .tbh-job.hero{grid-row:span 2;background:linear-gradient(160deg,rgba(212,181,106,.16) 0%,#161922 42%,#12151c 100%);border-color:rgba(212,181,106,.32);min-height:340px;justify-content:space-between}
        .tbh-job-icon{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:rgba(212,181,106,.14);color:#d4b56a;font-size:20px;font-weight:800;margin-bottom:16px}
        .tbh-job.hero .tbh-job-icon{width:56px;height:56px;font-size:24px}
        .tbh-job strong{display:block;font-size:20px;color:#f3f1eb;letter-spacing:-.03em;font-weight:850}
        .tbh-job.hero strong{font-size:26px}
        .tbh-job span{display:block;margin-top:8px;font-size:14px;color:#8b919c;line-height:1.5}
        .tbh-job.hero span{font-size:15px;max-width:36ch}
        .tbh-job-foot{margin-top:auto;padding-top:18px;display:flex;align-items:center;justify-content:space-between;width:100%}
        .tbh-job-foot em{font-style:normal;color:#d4b56a;font-size:13px;font-weight:800}
        .tbh-job-foot i{font-style:normal;color:#d4b56a;font-size:20px}
        .tbh-side{display:grid;gap:14px}
        .tbh-pipeline{margin-top:28px;padding:22px 24px;border-radius:20px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,#161922,#12151c)}
        .tbh-pipeline h2{margin:0;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#6e7582;font-weight:800}
        .tbh-pipe{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px}
        @media(max-width:700px){.tbh-pipe{grid-template-columns:1fr 1fr}}
        .tbh-pipe div{padding:14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}
        .tbh-pipe b{display:block;font-size:12px;color:#e8e4d8;font-weight:800}
        .tbh-pipe span{display:block;margin-top:6px;font-size:12px;color:#7a818c;line-height:1.4}
        .tbh-money{margin-top:16px;padding:18px 22px;border-radius:18px;border:1px solid rgba(212,181,106,.28);background:linear-gradient(135deg,rgba(212,181,106,.12),rgba(212,181,106,.04))}
        .tbh-money strong{display:block;color:#f0e2bc;font-size:14px;font-weight:800}
        .tbh-money p{margin:8px 0 0;color:#cfc3a4;font-size:13px;line-height:1.55;max-width:70ch}
      `}</style>

      <div className="tbh-top">
        <div>
          <div className="tbh-kicker">Content Engine</div>
          <h1 className="tbh-title">What do you<br />want to make?</h1>
          <p className="tbh-sub">One clear job at a time. Research the winners, ship stronger originals, monetise the audience.</p>
        </div>
        <div className="tbh-stats">
          <div className="tbh-stat"><b>1</b><span>Focus</span></div>
          <div className="tbh-stat"><b>3</b><span>Steps</span></div>
          <div className="tbh-stat"><b>$</b><span>Money path</span></div>
        </div>
      </div>

      <div className="tbh-jobs">
        <button type="button" className="tbh-job hero" onClick={() => onGo("remake")}>
          <div>
            <div className="tbh-job-icon">✦</div>
            <strong>Remake a winner</strong>
            <span>Paste a video that already works. Get the mechanism, your original package, titles, script and Shorts — ready for Studio.</span>
          </div>
          <div className="tbh-job-foot">
            <em>Start here</em>
            <i>→</i>
          </div>
        </button>
        <div className="tbh-side">
          <button type="button" className="tbh-job" onClick={() => onGo("creators")}>
            <div className="tbh-job-icon">◌</div>
            <strong>Creator post</strong>
            <span>Package as Cara or Lila for social and Fanvue.</span>
            <div className="tbh-job-foot"><em>Owned faces</em><i>→</i></div>
          </button>
          <button type="button" className="tbh-job" onClick={() => onGo("profiles")}>
            <div className="tbh-job-icon">◎</div>
            <strong>Profiles</strong>
            <span>YouTube, TikTok, IG, Fanvue — where you ship and earn.</span>
            <div className="tbh-job-foot"><em>Accounts</em><i>→</i></div>
          </button>
        </div>
      </div>

      <div className="tbh-pipeline">
        <h2>The loop</h2>
        <div className="tbh-pipe">
          <div><b>01 · Find</b><span>A video or channel that already wins attention</span></div>
          <div><b>02 · Package</b><span>Stronger original + Shorts, not a clone</span></div>
          <div><b>03 · Ship</b><span>Studio → your Profiles</span></div>
          <div><b>04 · Earn</b><span>Fanvue, affiliate, ads, or sponsor test</span></div>
        </div>
      </div>

      <div className="tbh-money">
        <strong>How this makes money</strong>
        <p>
          Proven attention → publish originals → grow on Profiles → attach one monetisation test. The engine handles research and packaging. You ship and close the loop.
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
      return <ContentEngineWorkspace />;
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
    <div className="tb-app">
      <style>{`.creative-studio-surface > button[aria-label="Open saved generations"]{display:none!important}`}</style>
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
            <div className="tb-group-label">Workspace</div>
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
            <span>Command centre</span>
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
