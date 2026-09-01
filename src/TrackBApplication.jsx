import React, { useEffect, useMemo, useState } from "react";
import AutopilotCreativeEngine from "./AutopilotCreativeEngine.jsx";
import GrowthModeWorkspace from "./GrowthModeWorkspace.jsx";
import CommerceTestWorkspace from "./CommerceTestWorkspace.jsx";
import YouTubeGrowthNicheWorkspace from "./YouTubeGrowthNicheWorkspace.jsx";
import TrackASocialWorkspace from "./TrackASocialWorkspace.jsx";
import TrackBAssetLibrary from "./TrackBAssetLibrary.jsx";
import CaptionWriter from "./CaptionWriter.jsx";
import CaptionStudio from "./CaptionStudio.jsx";
import LocalAIStudio from "./LocalAIStudio.jsx";

const GROUPS = [
  {
    label: "Create",
    items: [
      { id: "autopilot", label: "Autopilot", icon: "✦", description: "Discover opportunities, choose a direction and build the next asset.", stages: ["Radar", "Concepts", "Production"] },
      { id: "creators", label: "Creators", icon: "◌", description: "Build and manage creator-led content and production packages.", stages: ["Creators", "Research", "Production"] },
      { id: "shop", label: "Shop", icon: "◇", description: "Develop commerce creative, offers and tests.", stages: ["Offer", "Creative", "Test"] },
      { id: "youtube", label: "YouTube", icon: "▶", description: "Turn an audience opportunity into a complete YouTube package.", stages: ["Brief", "Opportunity", "Package", "Production"] },
      { id: "social", label: "Social", icon: "↗", description: "Build platform-native social packages ready for review and publishing.", stages: ["Brief", "Creative", "Review", "Publish"] },
    ],
  },
  {
    label: "Library",
    items: [
      { id: "media", label: "Media", icon: "▦", description: "Find, inspect and organise source and derived assets.", stages: ["Library", "Sources", "Derived"] },
      { id: "caption-writer", label: "Caption Writer", icon: "Aa", description: "Turn selected media into publish-ready copy.", stages: ["Select", "Write", "Review"] },
      { id: "caption-studio", label: "Caption Studio", icon: "≡", description: "Work through the caption backlog and finalise captions.", stages: ["Backlog", "Edit", "Ready"] },
      { id: "saved", label: "Saved Generations", icon: "▣", special: true, description: "Open the permanent generation library.", stages: [] },
    ],
  },
  {
    label: "System",
    items: [
      { id: "local-ai", label: "Local AI", icon: "⌘", description: "Check local Qwen status and active jobs.", stages: ["Status", "Queue", "History"] },
    ],
  },
];

const ITEMS = GROUPS.flatMap((group) => group.items);

function resolveSaved() {
  document.querySelector('[aria-label="Open saved generations"]')?.click();
}

function Workspace({ id }) {
  switch (id) {
    case "autopilot": return <AutopilotCreativeEngine />;
    case "creators": return <GrowthModeWorkspace />;
    case "shop": return <CommerceTestWorkspace />;
    case "youtube": return <YouTubeGrowthNicheWorkspace />;
    case "social": return <TrackASocialWorkspace />;
    case "media": return <TrackBAssetLibrary />;
    case "caption-writer": return <CaptionWriter />;
    case "caption-studio": return <CaptionStudio />;
    case "local-ai": return <LocalAIStudio />;
    default: return <AutopilotCreativeEngine />;
  }
}

function StageNav({ item }) {
  const [active, setActive] = useState(0);
  const stages = item.stages || [];
  useEffect(() => setActive(0), [item.id]);
  if (!stages.length) return null;

  const go = (stage, index) => {
    setActive(index);
    const candidates = Array.from(document.querySelectorAll(".tb-workspace-body h1,.tb-workspace-body h2,.tb-workspace-body h3,.tb-workspace-body h4,.tb-workspace-body summary,.tb-workspace-body label"));
    const node = candidates.find((element) => String(element.textContent || "").toLowerCase().includes(stage.toLowerCase()));
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="tb-stage-nav" aria-label="Workspace stages">
      {stages.map((stage, index) => (
        <button key={stage} type="button" className={index === active ? "is-active" : ""} onClick={() => go(stage, index)}>
          <span>{String(index + 1).padStart(2, "0")}</span>{stage}
        </button>
      ))}
    </div>
  );
}

export default function TrackBApplication() {
  const [view, setView] = useState(() => {
    try { return sessionStorage.getItem("caig_track_b_view") || "autopilot"; } catch { return "autopilot"; }
  });
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("caig_tb_sidebar") === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = useMemo(() => ITEMS.find((item) => item.id === view) || ITEMS[0], [view]);

  useEffect(() => {
    try { sessionStorage.setItem("caig_track_b_view", view); } catch {}
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

  return (
    <div className={`tb-app ${collapsed ? "is-collapsed" : ""}`}>
      <style>{`
        .tb-app{--tb-bg:#111318;--tb-sidebar:#0d0f13;--tb-surface:#17191e;--tb-surface2:#1c1f25;--tb-line:rgba(255,255,255,.075);--tb-line2:rgba(255,255,255,.12);--tb-text:#f0f0ed;--tb-muted:#9095a0;--tb-dim:#626873;--tb-accent:#c2b28a;--tb-accent-soft:rgba(194,178,138,.11);--tb-a:#7f90a4;--tb-good:#70927a;display:flex;min-height:100dvh;width:100%;background:var(--tb-bg);color:var(--tb-text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow:hidden}
        .tb-sidebar{width:250px;flex:0 0 250px;height:100dvh;position:sticky;top:0;display:flex;flex-direction:column;background:var(--tb-sidebar);border-right:1px solid var(--tb-line);transition:width .2s ease,flex-basis .2s ease;z-index:100}
        .tb-app.is-collapsed .tb-sidebar{width:72px;flex-basis:72px}
        .tb-brand{height:72px;display:flex;align-items:center;gap:11px;padding:16px 14px;border-bottom:1px solid var(--tb-line)}
        .tb-mark{width:38px;height:38px;flex:0 0 38px;border:1px solid rgba(194,178,138,.28);border-radius:10px;display:grid;place-items:center;color:#ddd5c4;background:#191a1d;font-weight:800;font-size:17px}
        .tb-brand-copy{min-width:0;overflow:hidden;white-space:nowrap}.tb-brand-copy strong{display:block;font-size:13px;line-height:1.2}.tb-brand-copy span{display:block;margin-top:3px;font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:var(--tb-dim)}
        .tb-collapse{margin-left:auto;width:30px;height:30px;display:grid;place-items:center;border:1px solid var(--tb-line);border-radius:8px;background:transparent;color:var(--tb-muted);cursor:pointer}.tb-collapse:hover{background:rgba(255,255,255,.04);color:#fff}
        .tb-app.is-collapsed .tb-brand{justify-content:center;padding:14px}.tb-app.is-collapsed .tb-brand-copy{display:none}.tb-app.is-collapsed .tb-collapse{display:none}
        .tb-nav{flex:1;padding:15px 10px;overflow:auto}.tb-group{margin-bottom:22px}.tb-group-label{padding:0 11px 7px;font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:#555b65;font-weight:800}.tb-app.is-collapsed .tb-group-label{display:none}
        .tb-item{position:relative;width:100%;height:42px;border:0;border-radius:9px;background:transparent;color:#808792;display:flex;align-items:center;gap:11px;padding:0 11px;cursor:pointer;text-align:left;font:inherit;font-size:13px;font-weight:650}.tb-item:hover{background:rgba(255,255,255,.045);color:#ececea}.tb-item.is-active{background:rgba(255,255,255,.075);color:#f6f6f3}.tb-item.is-active:before{content:"";position:absolute;left:-10px;top:9px;bottom:9px;width:2px;border-radius:2px;background:var(--tb-accent)}
        .tb-icon{width:20px;min-width:20px;text-align:center;color:#656d79;font-size:14px}.tb-item.is-active .tb-icon{color:var(--tb-accent)}.tb-item.is-special .tb-icon{color:#a9acb1}
        .tb-label{white-space:nowrap}.tb-app.is-collapsed .tb-item{justify-content:center;padding:0}.tb-app.is-collapsed .tb-label{display:none}
        .tb-sidebar-footer{border-top:1px solid var(--tb-line);padding:10px}.tb-enterprise{display:flex;align-items:center;gap:9px;height:40px;padding:0 11px;color:#707782;text-decoration:none;border-radius:9px;font-size:11px;font-weight:700}.tb-enterprise:hover{background:rgba(255,255,255,.04);color:#d6d8db}.tb-app.is-collapsed .tb-enterprise{justify-content:center;padding:0}.tb-app.is-collapsed .tb-enterprise span{display:none}
        .tb-main{min-width:0;flex:1;display:flex;flex-direction:column;height:100dvh;overflow:auto;background:var(--tb-bg)}
        .tb-topbar{position:sticky;top:0;z-index:40;height:66px;flex:0 0 66px;display:flex;align-items:center;border-bottom:1px solid var(--tb-line);background:rgba(17,19,24,.94);backdrop-filter:blur(18px)}
        .tb-topbar-inner{width:100%;display:flex;align-items:center;gap:18px;padding:0 30px}.tb-mobile-menu{display:none}
        .tb-context{min-width:0}.tb-context-kicker{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#666d78;font-weight:800}.tb-context-title{margin-top:2px;font-size:14px;font-weight:800;letter-spacing:-.015em}.tb-top-spacer{flex:1}.tb-local-status{display:flex;align-items:center;gap:7px;color:#7b837d;font-size:10px}.tb-status-dot{width:6px;height:6px;border-radius:50%;background:var(--tb-good)}
        .tb-content{padding:0 30px 70px;width:100%}.tb-hero{max-width:1500px;margin:0 auto;padding:30px 0 20px;border-bottom:1px solid var(--tb-line);display:flex;align-items:flex-end;justify-content:space-between;gap:24px}.tb-hero-copy{min-width:0}.tb-hero-title{margin:0;font-size:clamp(30px,3.5vw,48px);letter-spacing:-.055em;line-height:1.02;font-weight:760}.tb-hero-description{max-width:720px;margin:9px 0 0;color:var(--tb-muted);font-size:13px;line-height:1.6}.tb-stage-nav{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.tb-stage-nav button{height:32px;padding:0 10px;border:1px solid var(--tb-line);border-radius:7px;background:transparent;color:#717782;cursor:pointer;font:inherit;font-size:10px;font-weight:750}.tb-stage-nav button:hover{color:#eee;background:rgba(255,255,255,.035)}.tb-stage-nav button.is-active{border-color:rgba(194,178,138,.34);background:var(--tb-accent-soft);color:#ddd1b8}.tb-stage-nav button span{color:#555b64;margin-right:6px;font-size:8px}.tb-stage-nav button.is-active span{color:#a59673}
        .tb-workspace-body{width:100%;max-width:1500px;margin:0 auto;padding-top:18px;min-width:0}.tb-workspace-body>div:first-child{width:100%!important;max-width:none!important;min-width:0!important;background:transparent!important;border:0!important;box-shadow:none!important;margin:0!important}
        .tb-workspace-body input,.tb-workspace-body select,.tb-workspace-body textarea{max-width:100%!important}.tb-workspace-body img,.tb-workspace-body video,.tb-workspace-body canvas{max-width:100%!important}
        .tb-workspace-body h1,.tb-workspace-body h2,.tb-workspace-body h3{letter-spacing:-.035em!important}.tb-workspace-body button{font-family:inherit!important}
        .tb-workspace-body [style*="#08070d"],[style*="#08080f"],[style*="#07090d"],[style*="#121120"],[style*="#0f0e1a"],[style*="#0d0c16"],[style*="#0b0a13"]{background:var(--tb-surface)!important;color:var(--tb-text)!important;border-color:var(--tb-line)!important}
        .tb-workspace-body [style*="#D4AF37"],[style*="#d4af37"],[style*="#e4c25a"]{color:var(--tb-accent)!important;border-color:rgba(194,178,138,.3)!important}
        .tb-workspace-body button[style*="#D4AF37"],.tb-workspace-body button[style*="#d4af37"],.tb-workspace-body button[style*="#e4c25a"]{background:var(--tb-accent)!important;color:#181714!important;border-color:var(--tb-accent)!important}
        .tb-workspace-body [style*="linear-gradient"]{background-image:none!important}
        .tb-workspace-body [style*="radial-gradient"]{background-image:none!important}
        .tb-workspace-body label{color:#c9ccd1!important;font-weight:650!important}
        .tb-workspace-body textarea:focus,.tb-workspace-body input:focus,.tb-workspace-body select:focus{outline:2px solid rgba(194,178,138,.35)!important;outline-offset:1px}
        .tb-bottom-safe{height:max(12px,env(safe-area-inset-bottom))}
        @media(max-width:900px){
          .tb-app{display:block;overflow-x:hidden}.tb-sidebar{position:fixed;left:0;top:0;bottom:0;height:100dvh;width:min(86vw,320px);transform:translateX(-102%);transition:transform .2s ease;box-shadow:26px 0 80px rgba(0,0,0,.5)}.tb-sidebar.is-open{transform:translateX(0)}.tb-app.is-collapsed .tb-sidebar{width:min(86vw,320px);transform:translateX(-102%)}
          .tb-main{height:auto;min-height:100dvh;overflow:visible}.tb-topbar{height:58px}.tb-topbar-inner{padding:0 14px}.tb-mobile-menu{display:grid;place-items:center;width:40px;height:40px;border:1px solid var(--tb-line);border-radius:9px;background:#15171c;color:#f4f4f0;cursor:pointer}.tb-context-kicker{display:none}.tb-top-spacer{display:none}.tb-local-status{margin-left:auto}.tb-content{padding:0 14px 58px}.tb-hero{padding:20px 0 16px;display:block}.tb-hero-title{font-size:32px}.tb-hero-description{font-size:12px;margin-top:7px}.tb-stage-nav{justify-content:flex-start;overflow-x:auto;flex-wrap:nowrap;padding:13px 0 1px;scrollbar-width:none}.tb-stage-nav::-webkit-scrollbar{display:none}.tb-stage-nav button{flex:0 0 auto;min-height:38px;height:38px;padding:0 13px;font-size:11px}.tb-workspace-body{padding-top:14px}
          .tb-workspace-body>div:first-child{min-width:0!important;width:100%!important}.tb-workspace-body [style*="grid-template-columns"]{grid-template-columns:1fr!important}.tb-workspace-body [style*="display: grid"]{grid-template-columns:1fr!important}.tb-workspace-body [style*="display:grid"]{grid-template-columns:1fr!important}.tb-workspace-body [style*="flex-direction: row"]{flex-direction:column!important}.tb-workspace-body [style*="flex-direction:row"]{flex-direction:column!important}.tb-workspace-body table{display:block!important;width:100%!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}.tb-workspace-body td,.tb-workspace-body th{min-width:110px!important}.tb-workspace-body pre{max-width:100%!important;overflow:auto!important}.tb-workspace-body details{max-width:100%!important}.tb-workspace-body button{min-height:44px!important}.tb-workspace-body input,.tb-workspace-body select,.tb-workspace-body textarea{min-height:44px!important;width:100%!important}.tb-bottom-safe{height:max(18px,env(safe-area-inset-bottom))}
        }
      `}</style>
      <aside className={`tb-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="tb-brand"><a href="/" style={{display:"flex",alignItems:"center",gap:11,textDecoration:"none",color:"inherit",minWidth:0}}><span className="tb-mark">C</span><span className="tb-brand-copy"><strong>Creative Station</strong><span>Cornerstone AI Enterprise</span></span></a><button type="button" className="tb-collapse" onClick={() => setCollapsed((value) => !value)}>{collapsed ? "›" : "‹"}</button></div>
        <nav className="tb-nav" aria-label="Track B">
          {GROUPS.map((group) => <section className="tb-group" key={group.label}><div className="tb-group-label">{group.label}</div>{group.items.map((item) => <button type="button" key={item.id} className={`tb-item ${view === item.id ? "is-active" : ""} ${item.special ? "is-special" : ""}`} title={collapsed ? item.label : undefined} onClick={() => item.special ? resolveSaved() : setView(item.id)}><span className="tb-icon">{item.icon}</span><span className="tb-label">{item.label}</span></button>)}</section>)}
        </nav>
        <div className="tb-sidebar-footer"><a className="tb-enterprise" href="/"><span>⌂</span><span>Enterprise</span></a></div>
      </aside>
      <main className="tb-main">
        <header className="tb-topbar"><div className="tb-topbar-inner"><button type="button" className="tb-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">☰</button><div className="tb-context"><div className="tb-context-kicker">Track B</div><div className="tb-context-title">{current.label}</div></div><div className="tb-top-spacer"/><div className="tb-local-status"><span className="tb-status-dot"/>Local AI</div></div></header>
        <div className="tb-content"><section className="tb-hero"><div className="tb-hero-copy"><h1 className="tb-hero-title">{current.label}</h1><p className="tb-hero-description">{current.description}</p></div><StageNav item={current}/></section><section className="tb-workspace-body"><Workspace id={view}/></section><div className="tb-bottom-safe"/></div>
      </main>
    </div>
  );
}
