import React, { useEffect } from "react";
import AICreatorWorkspaceTrackB from "./AICreatorWorkspaceTrackB.jsx";
import CommerceTestWorkspace from "./CommerceTestWorkspace.jsx";
import GrowthModeWorkspace from "./GrowthModeWorkspace.jsx";
import TrackASocialWorkspace from "./TrackASocialWorkspace.jsx";
import TrackBAssetLibrary from "./TrackBAssetLibrary.jsx";
import CaptionStudio from "./CaptionStudio.jsx";
import CaptionWriter from "./CaptionWriter.jsx";
import LocalAIStudio from "./LocalAIStudio.jsx";
import AutopilotCreativeEngine from "./AutopilotCreativeEngine.jsx";
import YouTubeGrowthNicheWorkspace from "./YouTubeGrowthNicheWorkspace.jsx";

const NAV_GROUPS = [
  {
    label: "Create",
    items: [
      { id: "autopilot", label: "Autopilot", icon: "✦" },
      { id: "growth", label: "Creators", icon: "◌" },
      { id: "commerce", label: "Shop", icon: "◇" },
      { id: "youtube", label: "YouTube", icon: "▶" },
      { id: "trackasocial", label: "Social", icon: "↗" },
    ],
  },
  {
    label: "Library",
    items: [
      { id: "assets", label: "Media", icon: "▦" },
      { id: "captionwriter", label: "Caption Writer", icon: "Aa" },
      { id: "captions", label: "Caption Studio", icon: "≡" },
    ],
  },
  {
    label: "System",
    items: [{ id: "localai", label: "Local AI", icon: "⌘" }],
  },
];

const ALL_NAV = NAV_GROUPS.flatMap((group) => group.items);

function useSafeQwenJsonParser(enabled) {
  useEffect(() => {
    if (!enabled || typeof JSON === "undefined" || typeof JSON.parse !== "function") return undefined;
    const originalParse = JSON.parse;
    const patchedParse = function safeParse(value, reviver) {
      try {
        return originalParse.call(JSON, value, reviver);
      } catch (error) {
        const message = String(error?.message || "");
        if (typeof value === "string" && message.includes("non-whitespace character after JSON")) {
          const start = value.search(/[\[{]/);
          if (start >= 0) {
            const open = value[start];
            const close = open === "{" ? "}" : "]";
            let depth = 0;
            let quoted = false;
            let escaped = false;
            for (let i = start; i < value.length; i += 1) {
              const ch = value[i];
              if (quoted) {
                if (escaped) escaped = false;
                else if (ch === "\\") escaped = true;
                else if (ch === '"') quoted = false;
                continue;
              }
              if (ch === '"') quoted = true;
              else if (ch === open) depth += 1;
              else if (ch === close && --depth === 0) return originalParse.call(JSON, value.slice(start, i + 1), reviver);
            }
          }
        }
        throw error;
      }
    };
    JSON.parse = patchedParse;
    return () => {
      if (JSON.parse === patchedParse) JSON.parse = originalParse;
    };
  }, [enabled]);
}

function Workspace({ view }) {
  switch (view) {
    case "autopilot": return <AutopilotCreativeEngine />;
    case "growth": return <GrowthModeWorkspace />;
    case "commerce": return <CommerceTestWorkspace />;
    case "youtube": return <YouTubeGrowthNicheWorkspace />;
    case "trackasocial": return <TrackASocialWorkspace />;
    case "assets": return <TrackBAssetLibrary />;
    case "captionwriter": return <CaptionWriter />;
    case "captions": return <CaptionStudio />;
    case "localai": return <LocalAIStudio />;
    default: return <AICreatorWorkspaceTrackB />;
  }
}

function NavItem({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      aria-current={active ? "page" : undefined}
      className={`cs-nav-item${active ? " is-active" : ""}`}
    >
      <span className="cs-nav-icon">{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

export default function CreativeEngineHub() {
  const [view, setView] = React.useState(() => {
    try { return sessionStorage.getItem("caig_creative_view") || "autopilot"; } catch { return "autopilot"; }
  });
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const current = ALL_NAV.find((item) => item.id === view) || ALL_NAV[0];

  useSafeQwenJsonParser(["growth", "commerce", "youtube", "trackasocial"].includes(view));

  useEffect(() => {
    try { sessionStorage.setItem("caig_creative_view", view); } catch {}
    setMobileOpen(false);
  }, [view]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setView("autopilot");
      }
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="cs-shell">
      <style>{`
        :root{color-scheme:dark}
        *{box-sizing:border-box}
        .cs-shell{min-height:100vh;background:#0b0d11;color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",Inter,system-ui,sans-serif;display:flex;letter-spacing:-.01em}
        .cs-sidebar{width:232px;flex:0 0 232px;position:sticky;top:0;height:100vh;background:rgba(9,11,15,.96);border-right:1px solid rgba(255,255,255,.055);display:flex;flex-direction:column;z-index:50}
        .cs-brand{padding:18px 16px 17px;border-bottom:1px solid rgba(255,255,255,.055)}
        .cs-brand-link{display:flex;align-items:center;gap:11px;color:inherit;text-decoration:none}
        .cs-brand-mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#e8c762,#9f7628);display:grid;place-items:center;color:#141109;font-weight:950;font-size:16px;box-shadow:0 4px 18px rgba(212,175,55,.12)}
        .cs-brand-kicker{font-size:8px;letter-spacing:.19em;color:#737d8d;text-transform:uppercase;font-weight:900}
        .cs-brand-title{margin-top:2px;font-size:14px;font-weight:850}
        .cs-nav{padding:18px 10px;flex:1;overflow:auto}
        .cs-group{margin-bottom:24px}
        .cs-group-label{padding:0 11px 7px;color:#4d5664;font-size:8px;letter-spacing:.18em;text-transform:uppercase;font-weight:900}
        .cs-nav-item{position:relative;width:100%;display:flex;align-items:center;gap:11px;height:38px;padding:0 11px;border:0;border-radius:10px;background:transparent;color:#818b9b;text-align:left;cursor:pointer;font:inherit;font-size:13px;font-weight:650;transition:background .16s ease,color .16s ease}
        .cs-nav-item:hover{background:rgba(255,255,255,.045);color:#dce0e6}
        .cs-nav-item.is-active{background:rgba(255,255,255,.085);color:#fff;font-weight:800;box-shadow:inset 0 0 0 1px rgba(255,255,255,.035)}
        .cs-nav-item.is-active:before{content:"";position:absolute;left:-10px;top:9px;bottom:9px;width:2px;border-radius:2px;background:#d4af37}
        .cs-nav-icon{width:20px;display:grid;place-items:center;color:#5f6877;font-size:15px;font-weight:900}
        .cs-nav-item.is-active .cs-nav-icon{color:#d9bd4f}
        .cs-sidebar-footer{padding:10px;border-top:1px solid rgba(255,255,255,.045)}
        .cs-enterprise{display:flex;align-items:center;gap:10px;padding:10px 11px;border-radius:10px;color:#697383;text-decoration:none;font-size:12px;font-weight:700}
        .cs-enterprise:hover{background:rgba(255,255,255,.045);color:#d5dae1}
        .cs-main{min-width:0;flex:1;display:flex;flex-direction:column}
        .cs-topbar{height:60px;position:sticky;top:0;z-index:30;border-bottom:1px solid rgba(255,255,255,.055);background:rgba(11,13,17,.78);backdrop-filter:blur(24px)}
        .cs-topbar-inner{height:100%;max-width:1480px;margin:0 auto;padding:0 30px;display:flex;align-items:center;justify-content:space-between;gap:18px}
        .cs-breadcrumb{display:flex;align-items:center;gap:8px;min-width:0;color:#606a79;font-size:12px}
        .cs-breadcrumb strong{color:#e9ebef;font-size:13px;font-weight:800}
        .cs-dot{width:5px;height:5px;border-radius:50%;background:#6fcaa5;box-shadow:0 0 12px rgba(111,202,165,.45)}
        .cs-top-actions{display:flex;align-items:center;gap:10px;color:#737d8d;font-size:10px;font-weight:750}
        .cs-shortcut{padding:6px 8px;border:1px solid #202632;border-radius:7px;color:#667081;background:#0e1117;font-size:9px}
        .cs-menu{display:none}
        .cs-content{width:100%;max-width:1480px;margin:0 auto;padding:30px 30px 80px}
        .cs-workspace{min-width:0}
        .cs-workspace-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px}
        .cs-workspace-title{margin:0;font-size:32px;line-height:1;letter-spacing:-.045em;font-weight:850}
        .cs-workspace-note{margin:8px 0 0;color:#687283;font-size:12px;line-height:1.5}
        .cs-section-divider{height:1px;background:rgba(255,255,255,.055);margin:24px 0}
        .cs-content-inner{min-width:0}
        .cs-content-inner>div{min-width:0}
        .cs-mobile-brand{display:none}
        @media(max-width:900px){
          .cs-shell{display:block}
          .cs-sidebar{position:fixed;left:0;top:0;bottom:0;height:auto;transform:translateX(-102%);transition:transform .22s ease;box-shadow:28px 0 80px rgba(0,0,0,.45)}
          .cs-sidebar.open{transform:translateX(0)}
          .cs-menu{display:grid;place-items:center;width:34px;height:34px;border:1px solid #202632;border-radius:9px;background:#10131a;color:#f3f4f6;cursor:pointer}
          .cs-mobile-brand{display:flex;align-items:center;gap:9px;color:#f3f4f7;font-size:12px;font-weight:850}
          .cs-topbar-inner{padding:0 16px}
          .cs-top-actions{display:none}
          .cs-content{padding:22px 16px 60px}
          .cs-workspace-title{font-size:28px}
        }
      `}</style>

      <aside className={`cs-sidebar${mobileOpen ? " open" : ""}`}>
        <div className="cs-brand">
          <a href="/" className="cs-brand-link">
            <span className="cs-brand-mark">C</span>
            <span>
              <span className="cs-brand-kicker">Cornerstone</span>
              <span className="cs-brand-title">Creative Station</span>
            </span>
          </a>
        </div>

        <nav className="cs-nav" aria-label="Creative Station">
          {NAV_GROUPS.map((group) => (
            <section className="cs-group" key={group.label}>
              <div className="cs-group-label">{group.label}</div>
              {group.items.map((item) => (
                <NavItem key={item.id} item={item} active={view === item.id} onClick={setView} />
              ))}
            </section>
          ))}
        </nav>

        <div className="cs-sidebar-footer">
          <a href="/" className="cs-enterprise"><span>⌂</span><span>Enterprise</span></a>
        </div>
      </aside>

      {mobileOpen && <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} style={{ position:"fixed", inset:0, zIndex:40, border:0, background:"rgba(0,0,0,.55)" }} />}

      <section className="cs-main">
        <header className="cs-topbar">
          <div className="cs-topbar-inner">
            <div style={{ display:"flex", alignItems:"center", gap:11, minWidth:0 }}>
              <button className="cs-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu">☰</button>
              <div className="cs-mobile-brand"><span className="cs-brand-mark" style={{ width:26,height:26,borderRadius:8,fontSize:12 }}>C</span><span>Creative Station</span></div>
              <div className="cs-breadcrumb"><span>Creative Station</span><span style={{ color:"#333946" }}>/</span><strong>{current.label}</strong></div>
            </div>
            <div className="cs-top-actions"><span className="cs-dot" /> <span>Local AI</span><span className="cs-shortcut">⌘K</span></div>
          </div>
        </header>

        <main className="cs-content">
          <div className="cs-workspace">
            {view !== "autopilot" && (
              <div className="cs-workspace-head">
                <div>
                  <h1 className="cs-workspace-title">{current.label}</h1>
                  <p className="cs-workspace-note">{view === "growth" ? "Create and manage creator-led content." : view === "commerce" ? "Test ideas, products and conversion-led formats." : view === "youtube" ? "Build long-form stories and channel assets." : view === "trackasocial" ? "Create and refine Cornerstone social content." : view === "assets" ? "Browse and manage finished creative." : view === "captionwriter" ? "Write platform-native captions." : view === "captions" ? "Create and deliver subtitles." : "Local processing and worker status."}</p>
                </div>
              </div>
            )}
            <div className="cs-content-inner"><Workspace view={view} /></div>
          </div>
        </main>
      </section>
    </div>
  );
}
