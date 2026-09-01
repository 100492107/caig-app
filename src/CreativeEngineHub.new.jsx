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

const NAV = [
  { id: "autopilot", label: "Autopilot", icon: "✦", section: "Create" },
  { id: "growth", label: "Creators", icon: "◌", section: "Create" },
  { id: "commerce", label: "Shop", icon: "◇", section: "Create" },
  { id: "youtube", label: "YouTube", icon: "▶", section: "Create" },
  { id: "trackasocial", label: "Social", icon: "↗", section: "Create" },
  { id: "assets", label: "Media", icon: "▦", section: "Library" },
  { id: "captionwriter", label: "Caption Writer", icon: "Aa", section: "Library" },
  { id: "captions", label: "Caption Studio", icon: "≡", section: "Library" },
  { id: "localai", label: "Local AI", icon: "⌘", section: "Tools" },
];

function NavItem({ item, active, onClick }) {
  return (
    <button type="button" onClick={() => onClick(item.id)} aria-current={active ? "page" : undefined} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 11px", borderRadius: 11, border: 0, background: active ? "rgba(255,255,255,.08)" : "transparent", color: active ? "#fff" : "#8a94a4", textAlign: "left", cursor: "pointer", fontSize: 13, fontWeight: active ? 800 : 650 }}>
      <span style={{ width: 22, textAlign: "center", color: active ? "#d4af37" : "#606a7a", fontSize: item.id === "captionwriter" ? 10 : 15, fontWeight: 900 }}>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

function Workspace({ view }) {
  const common = { style: { maxWidth: 1180, margin: "0 auto" } };
  switch (view) {
    case "autopilot": return <AutopilotCreativeEngine {...common} />;
    case "growth": return <GrowthModeWorkspace {...common} />;
    case "commerce": return <CommerceTestWorkspace {...common} />;
    case "youtube": return <YouTubeGrowthNicheWorkspace {...common} />;
    case "trackasocial": return <TrackASocialWorkspace {...common} />;
    case "assets": return <TrackBAssetLibrary {...common} />;
    case "captionwriter": return <CaptionWriter {...common} />;
    case "captions": return <CaptionStudio {...common} />;
    case "localai": return <LocalAIStudio {...common} />;
    default: return <AICreatorWorkspaceTrackB {...common} />;
  }
}

export default function CreativeEngineHub() {
  const [view, setView] = useState(() => {
    try { return sessionStorage.getItem("caig_creative_view") || "autopilot"; } catch { return "autopilot"; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { try { sessionStorage.setItem("caig_creative_view", view); } catch {} setMobileOpen(false); }, [view]);

  const current = NAV.find((item) => item.id === view) || NAV[0];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f5f6f8", fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text',Inter,system-ui,sans-serif", display: "flex" }}>
      <style>{`
        .cs-sidebar{width:236px;flex:0 0 236px;min-height:100vh;position:sticky;top:0;border-right:1px solid rgba(255,255,255,.06);background:#090b0f;display:flex;flex-direction:column;}
        .cs-main{min-width:0;flex:1;}
        .cs-topbar{height:64px;position:sticky;top:0;z-index:20;border-bottom:1px solid rgba(255,255,255,.055);background:rgba(10,12,16,.82);backdrop-filter:blur(20px);}
        .cs-inner{max-width:1440px;margin:0 auto;width:100%;}
        .cs-mobile{display:none;}
        @media(max-width:900px){.cs-sidebar{position:fixed;left:0;top:0;bottom:0;z-index:60;transform:translateX(-100%);transition:transform .2s ease;box-shadow:25px 0 70px rgba(0,0,0,.4)}.cs-sidebar.open{transform:translateX(0)}.cs-mobile{display:flex}.cs-topbar{height:58px}.cs-content{padding-top:10px !important}.cs-inner{padding-left:18px !important;padding-right:18px !important}}
      `}</style>

      <aside className={`cs-sidebar ${mobileOpen ? "open" : ""}`}>
        <div style={{ padding: "18px 14px 16px", borderBottom: "1px solid rgba(255,255,255,.055)" }}>
          <a href="/" style={{ color: "inherit", textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "0 4px" }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#e7c65f,#9c7123)", color: "#151109", fontSize: 15, fontWeight: 950 }}>C</span>
            <span><span style={{ display: "block", color: "#697383", fontSize: 8, fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase" }}>Cornerstone</span><span style={{ display: "block", marginTop: 2, fontSize: 14, fontWeight: 850 }}>Creative Station</span></span>
          </a>
        </div>
        <nav style={{ padding: "18px 10px", flex: 1 }}>
          {['Create','Library','Tools'].map((section) => <div key={section} style={{ marginBottom: 22 }}><div style={{ color: "#4e5868", fontSize: 8, fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase", padding: "0 11px", marginBottom: 7 }}>{section}</div>{NAV.filter((item) => item.section === section).map((item) => <NavItem key={item.id} item={item} active={view === item.id} onClick={setView} />)}</div>)}
        </nav>
        <div style={{ padding: "10px", borderTop: "1px solid rgba(255,255,255,.045)" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", borderRadius: 11, color: "#697383", textDecoration: "none", fontSize: 12, fontWeight: 700 }}><span>←</span><span>Enterprise</span></a>
        </div>
      </aside>

      {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,.52)" }} />}

      <section className="cs-main">
        <header className="cs-topbar">
          <div className="cs-inner" style={{ height: "100%", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
            <div className="cs-mobile" style={{ alignItems: "center", gap: 12 }}>
              <button type="button" onClick={() => setMobileOpen(true)} style={{ border: 0, background: "transparent", color: "#fff", fontSize: 21 }}>☰</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              <span style={{ color: "#5d6675", fontSize: 12 }}>Creative Station</span><span style={{ color: "#343a45" }}>/</span><span style={{ fontSize: 13, fontWeight: 850 }}>{current.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#667182", fontSize: 10, fontWeight: 700 }}><span style={{ width: 6, height: 6, borderRadius: 50, background: "#72cda7", boxShadow: "0 0 12px rgba(114,205,167,.45)" }} />Local AI</div>
          </div>
        </header>

        <main className="cs-content cs-inner" style={{ padding: "28px 30px 70px" }}>
          {view === "autopilot" ? (
            <div>
              <div style={{ marginBottom: 24 }}><div style={{ color: "#d4af37", fontSize: 9, fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase" }}>Autopilot</div><h1 style={{ margin: "7px 0 0", fontSize: "clamp(30px,4vw,46px)", lineHeight: 1, letterSpacing: "-.05em", fontWeight: 850 }}>What should we make next?</h1></div>
              <Workspace view={view} />
            </div>
          ) : <Workspace view={view} />}
        </main>
      </section>
    </div>
  );
}
