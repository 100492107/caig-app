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
import {
  loadProfiles,
  loadEarnings,
  profileStats,
  formatMoney,
  hydrateOwnedMedia,
} from "./ownedMediaStore.js";

const NAV = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "remake", label: "Remake", icon: "✦" },
  { id: "creators", label: "Creators", icon: "◌" },
  { id: "profiles", label: "Profiles", icon: "◎" },
  { id: "production", label: "Studio", icon: "▶" },
  { id: "library", label: "Library", icon: "▦" },
];

function useOwnedMedia() {
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("caig-profiles-updated", bump);
    window.addEventListener("caig-earnings-updated", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("caig-profiles-updated", bump);
      window.removeEventListener("caig-earnings-updated", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  useEffect(() => {
    let live = true;
    hydrateOwnedMedia().then(() => {
      if (!live) return;
      setReady(true);
      setTick((t) => t + 1);
    });
    return () => {
      live = false;
    };
  }, []);
  return useMemo(() => {
    const profiles = loadProfiles();
    const earnings = loadEarnings();
    const stats = profileStats(profiles);
    return { profiles, earnings, stats, tick, ready };
  }, [tick, ready]);
}

function HomeHub({ onGo }) {
  const { earnings, stats } = useOwnedMedia();
  const linked = stats.linkedList.filter((x) => String(x.url || "").trim());

  return (
    <div className="tbh">
      <style>{`
        .tbh{max-width:1080px;margin:0 auto;padding:4px 0 48px;position:relative;box-sizing:border-box}
        .tbh *,.tbh *::before,.tbh *::after{box-sizing:border-box}
        .tbh::before{content:"";position:absolute;inset:-40px -20% auto;height:280px;background:radial-gradient(ellipse 70% 80% at 30% 0%,rgba(212,181,106,.14),transparent 70%);pointer-events:none;z-index:0}
        .tbh > *{position:relative;z-index:1}
        .tbh-kicker{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#d4b56a;font-weight:800}
        .tbh-title{margin:12px 0 0;font-size:clamp(32px,5vw,48px);line-height:.98;letter-spacing:-.05em;font-weight:860;color:#f6f4ef}
        .tbh-sub{margin:12px 0 0;max-width:48ch;color:#9a9faa;font-size:15px;line-height:1.55}
        .tbh-dash{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:24px}
        @media(max-width:800px){.tbh-dash{grid-template-columns:1fr 1fr}}
        @media(max-width:420px){.tbh-dash{grid-template-columns:1fr}}
        .tbh-kpi{padding:16px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(22,25,34,.9)}
        .tbh-kpi b{display:block;font-size:22px;font-weight:850;color:#f0e6c8;letter-spacing:-.03em}
        .tbh-kpi span{display:block;margin-top:4px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6e7582;font-weight:750}
        .tbh-kpi.money{border-color:rgba(212,181,106,.3);background:linear-gradient(135deg,rgba(212,181,106,.14),rgba(22,25,34,.95))}
        .tbh-section{margin-top:22px}
        .tbh-section h2{margin:0 0 12px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6e7582;font-weight:800}
        .tbh-accounts{display:grid;gap:8px}
        .tbh-acc{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:#161922}
        .tbh-acc strong{font-size:13px;color:#eceae4}
        .tbh-acc span{font-size:12px;color:#8b919c}
        .tbh-acc a{color:#d4b56a;font-size:12px;font-weight:750;text-decoration:none;word-break:break-all}
        .tbh-empty{padding:16px;border-radius:14px;border:1px dashed rgba(255,255,255,.12);color:#8b919c;font-size:13px;line-height:1.5}
        .tbh-jobs{display:grid;grid-template-columns:1.3fr 1fr;gap:12px;margin-top:22px}
        @media(max-width:800px){.tbh-jobs{grid-template-columns:1fr}}
        .tbh-job{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:20px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:#161922;color:inherit;cursor:pointer;font:inherit;transition:border-color .15s,transform .15s}
        .tbh-job:hover{border-color:rgba(212,181,106,.4);transform:translateY(-1px)}
        .tbh-job.hero{background:linear-gradient(160deg,rgba(212,181,106,.14),#161922 50%);border-color:rgba(212,181,106,.32)}
        .tbh-job-icon{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(212,181,106,.14);color:#d4b56a;font-size:18px;font-weight:800;margin-bottom:12px}
        .tbh-job strong{display:block;font-size:17px;color:#f3f1eb;font-weight:850}
        .tbh-job span{display:block;margin-top:6px;font-size:13px;color:#8b919c;line-height:1.45}
        .tbh-job-foot{margin-top:14px;color:#d4b56a;font-size:13px;font-weight:800}
        .tbh-side{display:grid;gap:12px}
        .tbh-cta-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
        .tbh-btn{min-height:42px;padding:0 16px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:#161922;color:#e8e6df;font:inherit;font-size:13px;font-weight:750;cursor:pointer}
        .tbh-btn.primary{background:#d4b56a;border-color:#d4b56a;color:#1a160e;font-weight:850}
      `}</style>

      <div className="tbh-kicker">Content Engine · dashboard</div>
      <h1 className="tbh-title">Your media at a glance</h1>
      <p className="tbh-sub">
        Stats sync from your account when signed in. Edit links and money in Profiles.
      </p>

      <div className="tbh-dash">
        <div className="tbh-kpi money">
          <b>{formatMoney(earnings.total, earnings.currency)}</b>
          <span>Money logged</span>
        </div>
        <div className="tbh-kpi">
          <b>{stats.withUrl}</b>
          <span>Links set</span>
        </div>
        <div className="tbh-kpi">
          <b>{stats.active}</b>
          <span>Active accounts</span>
        </div>
        <div className="tbh-kpi">
          <b>{stats.profiles}</b>
          <span>Profiles</span>
        </div>
      </div>

      <div className="tbh-section">
        <h2>Linked pages</h2>
        {linked.length === 0 ? (
          <div className="tbh-empty">
            No exact links yet. Open Profiles, paste each public URL, set status to active.
            <div className="tbh-cta-row">
              <button type="button" className="tbh-btn primary" onClick={() => onGo("profiles")}>
                Add links in Profiles →
              </button>
            </div>
          </div>
        ) : (
          <div className="tbh-accounts">
            {linked.map((pl, i) => (
              <div className="tbh-acc" key={`${pl.network}-${pl.url}-${i}`}>
                <div>
                  <strong>{pl.network}</strong>
                  <span style={{ marginLeft: 8 }}>{pl.handle || pl.status}</span>
                </div>
                <a href={pl.url} target="_blank" rel="noreferrer">{pl.url}</a>
              </div>
            ))}
            <div className="tbh-cta-row">
              <button type="button" className="tbh-btn" onClick={() => onGo("profiles")}>Edit profiles</button>
            </div>
          </div>
        )}
      </div>

      <div className="tbh-jobs">
        <button type="button" className="tbh-job hero" onClick={() => onGo("remake")}>
          <div className="tbh-job-icon">✦</div>
          <strong>Remake a winner</strong>
          <span>Paste a working video. Get package + Shorts.</span>
          <div className="tbh-job-foot">Start →</div>
        </button>
        <div className="tbh-side">
          <button type="button" className="tbh-job" onClick={() => onGo("creators")}>
            <div className="tbh-job-icon">◌</div>
            <strong>Creator post</strong>
            <span>Cara / Lila packages</span>
            <div className="tbh-job-foot">Open →</div>
          </button>
          <button type="button" className="tbh-job" onClick={() => onGo("production")}>
            <div className="tbh-job-icon">▶</div>
            <strong>Studio</strong>
            <span>Render saved packages</span>
            <div className="tbh-job-foot">Open →</div>
          </button>
        </div>
      </div>
    </div>
  );
}

function Workspace({ id, stage, onAdvance, onGo }) {
  switch (id) {
    case "home":
      return <HomeHub onGo={onGo} />;
    case "remake":
      return <ContentEngineWorkspace onGo={onGo} />;
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

  useEffect(() => {
    if (view === "home") window.dispatchEvent(new Event("caig-profiles-updated"));
  }, [view]);

  const onAdvance = () => setStage((s) => s + 1);
  const onGo = (id) => setView(id);

  return (
    <div className="tb-app">
      <style>{`
        .creative-studio-surface > button[aria-label="Open saved generations"]{display:none!important}
        .tb-mobile-backdrop{position:fixed;inset:0;z-index:90;border:0;background:rgba(0,0,0,.55);cursor:pointer}
        .tb-mobile-close{display:none;margin-left:auto;width:36px;height:36px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#161922;color:#eceae4;font-size:20px;cursor:pointer;line-height:1}
        @media(max-width:900px){
          .tb-mobile-close{display:grid;place-items:center}
          .tb-sidebar{padding-bottom:env(safe-area-inset-bottom)}
        }
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
          <button className="tb-mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close">×</button>
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
          <a href="/" className="tb-enterprise"><span>←</span><span>Command centre</span></a>
        </div>
      </aside>
      <main className="tb-main">
        <header className="tb-topbar">
          <div className="tb-topbar-inner">
            <button type="button" className="tb-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Menu">☰</button>
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
