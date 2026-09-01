import React, { useEffect, useState } from "react";
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
  { label: "Create", items: [
    { id: "autopilot", label: "Autopilot", icon: "✦" },
    { id: "growth", label: "Creators", icon: "◌" },
    { id: "commerce", label: "Shop", icon: "◇" },
    { id: "youtube", label: "YouTube", icon: "▶" },
    { id: "trackasocial", label: "Social", icon: "↗" },
  ]},
  { label: "Library", items: [
    { id: "assets", label: "Media", icon: "▦" },
    { id: "captionwriter", label: "Caption Writer", icon: "Aa" },
    { id: "captions", label: "Caption Studio", icon: "≡" },
    { id: "saved", label: "Saved Generations", icon: "▣", special: true },
  ]},
  { label: "System", items: [{ id: "localai", label: "Local AI", icon: "⌘" }]},
];

const ALL_NAV = NAV_GROUPS.flatMap((group) => group.items);

function openSavedGenerations() {
  document.querySelector('[aria-label="Open saved generations"]')?.click();
}

function useSafeQwenJsonParser(enabled) {
  useEffect(() => {
    if (!enabled || typeof JSON === "undefined" || typeof JSON.parse !== "function") return undefined;
    const originalParse = JSON.parse;
    const patchedParse = function safeParse(value, reviver) {
      try { return originalParse.call(JSON, value, reviver); }
      catch (error) {
        const message = String(error?.message || "");
        if (typeof value === "string" && message.includes("non-whitespace character after JSON")) {
          const start = value.search(/[\[{]/);
          if (start >= 0) {
            const open = value[start];
            const close = open === "{" ? "}" : "]";
            let depth = 0; let quoted = false; let escaped = false;
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
    return () => { if (JSON.parse === patchedParse) JSON.parse = originalParse; };
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

function NavItem({ item, active, collapsed, onClick }) {
  const handleClick = () => item.special ? openSavedGenerations() : onClick(item.id);
  return (
    <button type="button" onClick={handleClick} title={collapsed ? item.label : undefined}
      className={`cs-nav-item${active ? " is-active" : ""}${item.special ? " is-special" : ""}`}>
      <span className="cs-nav-icon">{item.icon}</span>
      <span className="cs-nav-label">{item.label}</span>
    </button>
  );
}

export default function CreativeEngineHub() {
  const [view, setView] = useState(() => {
    try { return sessionStorage.getItem("caig_creative_view") || "autopilot"; } catch { return "autopilot"; }
  });
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("caig_cs_sidebar_collapsed") === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [savedCount, setSavedCount] = useState("");
  const current = ALL_NAV.find((item) => item.id === view) || ALL_NAV[0];

  useSafeQwenJsonParser(["growth", "commerce", "youtube", "trackasocial"].includes(view));

  useEffect(() => {
    try { sessionStorage.setItem("caig_creative_view", view); } catch {}
    setMobileOpen(false);
  }, [view]);

  useEffect(() => {
    try { localStorage.setItem("caig_cs_sidebar_collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  useEffect(() => {
    const syncSavedCount = () => {
      const el = document.querySelector('[aria-label="Open saved generations"]');
      const match = String(el?.textContent || "").match(/\b\d+\b/);
      if (match) setSavedCount(match[0]);
    };
    syncSavedCount();
    const timer = window.setInterval(syncSavedCount, 1200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        setCollapsed((value) => !value);
      }
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className={`cs-shell${collapsed ? " is-collapsed" : ""}`}>
      <style>{`
        :root{color-scheme:dark}
        *{box-sizing:border-box}
        html,body,#root{min-width:100%;width:100%}
        body{background:#0b0d11;overflow-x:hidden}
        .cs-shell{--sidebar:252px;--rail:74px;min-height:100dvh;width:100%;background:#0b0d11;color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",Inter,system-ui,sans-serif;display:flex;letter-spacing:-.01em}
        .cs-sidebar{width:var(--sidebar);flex:0 0 var(--sidebar);height:100dvh;position:sticky;top:0;background:#090b0f;border-right:1px solid rgba(255,255,255,.065);display:flex;flex-direction:column;z-index:50;overflow:hidden;transition:width .22s cubic-bezier(.2,.8,.2,1),flex-basis .22s cubic-bezier(.2,.8,.2,1)}
        .cs-shell.is-collapsed .cs-sidebar{width:var(--rail);flex-basis:var(--rail)}
        .cs-brand{height:70px;padding:16px 14px;border-bottom:1px solid rgba(255,255,255,.055);display:flex;align-items:center;justify-content:space-between;gap:8px;flex:0 0 70px}
        .cs-brand-link{display:flex;align-items:center;gap:11px;min-width:0;color:inherit;text-decoration:none;overflow:hidden}
        .cs-brand-mark{width:36px;height:36px;min-width:36px;border-radius:11px;background:linear-gradient(135deg,#e8c762,#9f7628);display:grid;place-items:center;color:#141109;font-weight:950;font-size:17px;box-shadow:0 5px 20px rgba(212,175,55,.12)}
        .cs-brand-copy{min-width:0;white-space:nowrap;transition:opacity .16s ease}
        .cs-brand-kicker{font-size:8px;letter-spacing:.18em;color:#737d8d;text-transform:uppercase;font-weight:900}
        .cs-brand-title{margin-top:2px;font-size:14px;font-weight:850}
        .cs-collapse{width:30px;height:30px;border:1px solid #212733;border-radius:9px;background:#0d1016;color:#8b95a5;display:grid;place-items:center;cursor:pointer;flex:0 0 30px;transition:background .16s,color .16s}
        .cs-collapse:hover{background:#151a22;color:#fff}
        .cs-shell.is-collapsed .cs-brand{justify-content:center;padding-inline:13px}.cs-shell.is-collapsed .cs-brand-copy{opacity:0;width:0}.cs-shell.is-collapsed .cs-collapse{position:absolute;right:21px;top:20px;transform:translateX(50%);opacity:0}.cs-sidebar:hover .cs-collapse{opacity:1}
        .cs-nav{padding:17px 10px;flex:1;overflow:auto;scrollbar-width:none}.cs-nav::-webkit-scrollbar{display:none}
        .cs-group{margin-bottom:22px}.cs-group-label{padding:0 12px 7px;color:#4d5664;font-size:8px;letter-spacing:.18em;text-transform:uppercase;font-weight:900;white-space:nowrap;transition:opacity .14s}
        .cs-shell.is-collapsed .cs-group-label{opacity:0;height:0;padding:0;margin:0}
        .cs-nav-item{position:relative;width:100%;display:flex;align-items:center;gap:12px;height:40px;padding:0 12px;border:0;border-radius:11px;background:transparent;color:#818b9b;text-align:left;cursor:pointer;font:inherit;font-size:13px;font-weight:650;white-space:nowrap;transition:background .16s,color .16s,transform .16s}
        .cs-nav-item:hover{background:rgba(255,255,255,.045);color:#e7eaf0}.cs-nav-item.is-active{background:rgba(255,255,255,.09);color:#fff;font-weight:800;box-shadow:inset 0 0 0 1px rgba(255,255,255,.035)}
        .cs-nav-item.is-active:before{content:"";position:absolute;left:-10px;top:9px;bottom:9px;width:2px;border-radius:2px;background:#d4af37}.cs-nav-item.is-special{margin-top:4px;color:#a7b0bf}.cs-nav-item.is-special:hover{color:#fff}
        .cs-nav-icon{width:22px;min-width:22px;display:grid;place-items:center;color:#5f6877;font-size:15px;font-weight:900}.cs-nav-item.is-active .cs-nav-icon,.cs-nav-item.is-special .cs-nav-icon{color:#d9bd4f}.cs-nav-label{transition:opacity .16s ease}.cs-shell.is-collapsed .cs-nav-item{justify-content:center;padding-inline:0}.cs-shell.is-collapsed .cs-nav-label{opacity:0;width:0;overflow:hidden}.cs-shell.is-collapsed .cs-nav-item.is-active:before{left:-10px}
        .cs-sidebar-footer{padding:10px;border-top:1px solid rgba(255,255,255,.045)}
        .cs-enterprise{display:flex;align-items:center;gap:10px;height:40px;padding:0 12px;border-radius:11px;color:#697383;text-decoration:none;font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden}.cs-enterprise:hover{background:rgba(255,255,255,.045);color:#d5dae1}.cs-shell.is-collapsed .cs-enterprise{justify-content:center;padding:0}.cs-shell.is-collapsed .cs-enterprise span:last-child{display:none}
        .cs-main{min-width:0;min-height:100dvh;flex:1;display:flex;flex-direction:column;background:#0b0d11}
        .cs-topbar{height:64px;flex:0 0 64px;position:sticky;top:0;z-index:30;border-bottom:1px solid rgba(255,255,255,.055);background:rgba(11,13,17,.88);backdrop-filter:blur(24px)}
        .cs-topbar-inner{height:100%;padding:0 30px;display:flex;align-items:center;justify-content:space-between;gap:18px}
        .cs-breadcrumb{display:flex;align-items:center;gap:9px;min-width:0;color:#636d7c;font-size:12px}.cs-breadcrumb strong{color:#edf0f4;font-size:13px;font-weight:800}.cs-dot{width:6px;height:6px;border-radius:50%;background:#6fcaa5;box-shadow:0 0 13px rgba(111,202,165,.5)}
        .cs-top-actions{display:flex;align-items:center;gap:12px;color:#737d8d;font-size:10px;font-weight:750}.cs-shortcut{padding:6px 8px;border:1px solid #202632;border-radius:8px;color:#667081;background:#0e1117;font-size:9px}
        .cs-content{width:100%;padding:26px clamp(24px,3vw,48px) 80px}.cs-workspace{width:100%;min-width:0}.cs-content-inner{width:100%;min-width:0}.cs-content-inner>div{min-width:0;width:100%}
        .cs-workspace-head{display:flex;align-items:end;justify-content:space-between;margin:0 0 22px}.cs-workspace-title{margin:0;font-size:34px;line-height:1;letter-spacing:-.05em;font-weight:850}.cs-workspace-note{display:none}
        .cs-menu,.cs-mobile-brand{display:none}
        .creative-studio-surface{width:100%;min-height:100dvh}
        [aria-label="Open saved generations"]{display:none!important}
        @media(max-width:900px){
          .cs-shell{display:block}.cs-sidebar{position:fixed;left:0;top:0;bottom:0;height:100dvh;transform:translateX(-102%);transition:transform .22s ease;box-shadow:28px 0 80px rgba(0,0,0,.45);width:252px;flex-basis:252px}.cs-sidebar.open{transform:translateX(0)}
          .cs-menu{display:grid;place-items:center;width:36px;height:36px;border:1px solid #202632;border-radius:10px;background:#0f1319;color:#fff;cursor:pointer}.cs-mobile-brand{display:flex;align-items:center;gap:9px;color:#f3f4f7;font-size:12px;font-weight:850}.cs-breadcrumb{display:none}.cs-topbar-inner{padding:0 15px}.cs-top-actions{display:none}.cs-content{padding:20px 15px 56px}
        }
      `}</style>

      <aside className={`cs-sidebar${mobileOpen ? " open" : ""}`}>
        <div className="cs-brand">
          <a href="/" className="cs-brand-link">
            <span className="cs-brand-mark">C</span>
            <span className="cs-brand-copy"><span className="cs-brand-kicker">Cornerstone</span><span className="cs-brand-title">Creative Station</span></span>
          </a>
          <button type="button" className="cs-collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? "›" : "‹"}</button>
        </div>
        <nav className="cs-nav" aria-label="Creative Station">
          {NAV_GROUPS.map((group) => (
            <section className="cs-group" key={group.label}>
              <div className="cs-group-label">{group.label}</div>
              {group.items.map((item) => <NavItem key={item.id} item={item} active={view === item.id} collapsed={collapsed} onClick={setView} />)}
            </section>
          ))}
        </nav>
        <div className="cs-sidebar-footer"><a href="/" className="cs-enterprise"><span>⌂</span><span>Enterprise</span></a></div>
      </aside>

      {mobileOpen && <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} style={{ position:"fixed", inset:0, zIndex:40, border:0, background:"rgba(0,0,0,.55)" }} />}

      <section className="cs-main">
        <header className="cs-topbar">
          <div className="cs-topbar-inner">
            <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
              <button type="button" className="cs-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">☰</button>
              <div className="cs-mobile-brand"><span className="cs-brand-mark" style={{ width:27,height:27,borderRadius:8,fontSize:12 }}>C</span><span>Creative Station</span></div>
              <div className="cs-breadcrumb"><span>Creative Station</span><span style={{ color:"#333946" }}>/</span><strong>{current.label}</strong></div>
            </div>
            <div className="cs-top-actions"><span className="cs-dot"/><span>Local AI</span><span className="cs-shortcut">⌘K</span></div>
          </div>
        </header>
        <main className="cs-content">
          <div className="cs-workspace">
            {view !== "autopilot" && <div className="cs-workspace-head"><h1 className="cs-workspace-title">{current.label}</h1></div>}
            <div className="cs-content-inner"><Workspace view={view} /></div>
          </div>
        </main>
      </section>
    </div>
  );
}
