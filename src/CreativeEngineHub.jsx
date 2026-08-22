import React, { useEffect, useState } from "react";
import AICreatorWorkspaceTrackB from "./AICreatorWorkspaceTrackB.jsx";
import CommerceTestWorkspace from "./CommerceTestWorkspace.jsx";
import GrowthModeWorkspace from "./GrowthModeWorkspace.jsx";
import TrackASocialWorkspaceV2 from "./TrackASocialWorkspaceV2.jsx";
import TrackBAssetLibrary from "./TrackBAssetLibraryV2.jsx";
import CaptionStudio from "./CaptionStudio.jsx";
import CaptionWriter from "./CaptionWriter.jsx";
import LocalAIStudio from "./LocalAIStudio.jsx";
import AutopilotCreativeEngineV3 from "./AutopilotCreativeEngineV3.jsx";
import YouTubeGrowthNicheWorkspace from "./YouTubeGrowthNicheWorkspace.jsx";

const pane = (visible) => ({ display: visible ? "block" : "none" });

function extractFirstJsonValue(text) {
  const source = String(text || "");
  const start = source.search(/[\[{]/);
  if (start < 0) throw new Error("No JSON value found");
  const open = source[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("Incomplete JSON value");
}

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
          return originalParse.call(JSON, extractFirstJsonValue(value), reviver);
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

const WORKSPACES = [
  { id: "autopilot", label: "Autopilot", title: "Find the next opportunity", desc: "Research what is working, choose the strongest angle and turn it into a production-ready concept.", icon: "✦", tone: "gold" },
  { id: "trackasocial", label: "Track A", title: "Put Cornerstone in front of dealers", desc: "Build authority, reach and commercial curiosity across the platforms your buyers already use.", icon: "↗", tone: "blue" },
  { id: "growth", label: "Creators", title: "Grow Cara & Lila", desc: "Build recognisable people, recurring series and audience before monetisation.", icon: "◌", tone: "rose" },
  { id: "commerce", label: "Shop", title: "Turn attention into sales", desc: "Test creator-led products, hooks and formats, then scale whatever actually converts.", icon: "◇", tone: "green" },
  { id: "youtube", label: "YouTube", title: "Build the long-form channel", desc: "Create animated business mysteries and money stories designed for click-through and retention.", icon: "▶", tone: "purple" },
];

const TOOLS = [
  { id: "assets", label: "Media library", desc: "Images, prompts and finished outputs." },
  { id: "captionwriter", label: "Caption Writer", desc: "Platform-native captions and copy." },
  { id: "captions", label: "Caption Studio", desc: "Subtitles, captions and delivery." },
  { id: "localai", label: "System", desc: "Jobs, workers and local AI status." },
  { id: "legacy", label: "Older tools", desc: "Previous creator tooling." },
];

const tones = {
  gold: { tint: "rgba(212,175,55,.13)", border: "rgba(212,175,55,.35)", icon: "#e7c75a" },
  blue: { tint: "rgba(86,148,255,.11)", border: "rgba(86,148,255,.3)", icon: "#8cb5ff" },
  rose: { tint: "rgba(224,116,146,.11)", border: "rgba(224,116,146,.28)", icon: "#ef9bb4" },
  green: { tint: "rgba(94,194,155,.11)", border: "rgba(94,194,155,.28)", icon: "#85d8b5" },
  purple: { tint: "rgba(159,121,255,.11)", border: "rgba(159,121,255,.28)", icon: "#b59aff" },
};

function WorkspaceCard({ item, onOpen, large = false }) {
  const tone = tones[item.tone] || tones.gold;
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      style={{
        textAlign: "left",
        width: "100%",
        padding: large ? 24 : 20,
        borderRadius: 22,
        border: `1px solid ${tone.border}`,
        background: `radial-gradient(circle at 85% 10%, ${tone.tint}, transparent 38%), linear-gradient(160deg,#131721,#0d1017)`,
        color: "#fff",
        cursor: "pointer",
        transition: "transform .18s ease, border-color .18s ease, box-shadow .18s ease",
        minHeight: large ? 230 : 190,
        boxShadow: "0 14px 44px rgba(0,0,0,.18)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 20px 56px rgba(0,0,0,.28)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 14px 44px rgba(0,0,0,.18)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18 }}>
        <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 14, background: tone.tint, border: `1px solid ${tone.border}`, color: tone.icon, fontSize: 20, fontWeight: 900 }}>{item.icon}</span>
        <span style={{ color: "#5d6778", fontSize: 12, fontWeight: 800 }}>Open →</span>
      </div>
      <div style={{ marginTop: 26, color: "#7d8798", fontSize: 10, textTransform: "uppercase", letterSpacing: ".13em", fontWeight: 900 }}>{item.label}</div>
      <h2 style={{ margin: "7px 0 8px", fontSize: large ? 28 : 22, lineHeight: 1.06, letterSpacing: "-.035em" }}>{item.title}</h2>
      <p style={{ margin: 0, color: "#a5afbe", fontSize: 13, lineHeight: 1.55, maxWidth: 520 }}>{item.desc}</p>
    </button>
  );
}

export default function CreativeEngineHub() {
  const [view, setView] = useState("home");
  useSafeQwenJsonParser(["legacy", "commerce", "growth", "youtube", "trackasocial"].includes(view));

  const current = WORKSPACES.find((item) => item.id === view);

  const content = (
    <>
      <div style={pane(view === "autopilot")}><AutopilotCreativeEngineV3 /></div>
      <div style={pane(view === "trackasocial")}><TrackASocialWorkspaceV2 /></div>
      <div style={pane(view === "growth")}><GrowthModeWorkspace /></div>
      <div style={pane(view === "commerce")}><CommerceTestWorkspace /></div>
      <div style={pane(view === "youtube")}><YouTubeGrowthNicheWorkspace /></div>
      <div style={pane(view === "captionwriter")}><CaptionWriter /></div>
      <div style={pane(view === "assets")}><TrackBAssetLibrary /></div>
      <div style={pane(view === "captions")}><CaptionStudio /></div>
      <div style={pane(view === "localai")}><LocalAIStudio /></div>
      <div style={pane(view === "legacy")}><AICreatorWorkspaceTrackB /></div>
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080a0e", color: "#fff" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 400, background: "rgba(8,10,14,.84)", backdropFilter: "blur(22px)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ maxWidth: 1500, margin: "0 auto", padding: "16px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <button type="button" onClick={() => setView("home")} style={{ border: 0, background: "transparent", color: "inherit", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
            <span style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 13, background: "linear-gradient(135deg,#e4c25a,#9f7526)", color: "#171108", fontWeight: 950, fontSize: 18 }}>C</span>
            <span><span style={{ display: "block", color: "#8e98aa", fontSize: 9, textTransform: "uppercase", letterSpacing: ".16em", fontWeight: 900 }}>Cornerstone</span><span style={{ display: "block", fontSize: 17, fontWeight: 950, letterSpacing: "-.02em" }}>Creative Studio</span></span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ padding: "8px 11px", borderRadius: 999, border: "1px solid #252b38", background: "#0d1017", color: "#8f99aa", fontSize: 10, fontWeight: 800 }}>Strategy first</span>
            <span style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 11px", borderRadius: 999, border: "1px solid rgba(114,205,167,.22)", background: "rgba(114,205,167,.06)", color: "#9fd9c0", fontSize: 10, fontWeight: 800 }}><span style={{ width: 6, height: 6, borderRadius: 50, background: "#72cda7" }} />Working</span>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1500, margin: "0 auto", padding: "28px 26px 90px" }}>
        {view === "home" ? (
          <main>
            <section style={{ display: "grid", gridTemplateColumns: "1.35fr .65fr", gap: 18, alignItems: "stretch", marginBottom: 20 }}>
              <div style={{ borderRadius: 26, padding: 30, border: "1px solid #262c38", background: "radial-gradient(circle at 85% 20%,rgba(212,175,55,.13),transparent 32%),linear-gradient(150deg,#141821,#0c1016)", boxShadow: "0 20px 70px rgba(0,0,0,.22)" }}>
                <div style={{ color: "#d4af37", fontSize: 10, textTransform: "uppercase", letterSpacing: ".15em", fontWeight: 950 }}>Creative Studio</div>
                <h1 style={{ margin: "14px 0 12px", fontSize: "clamp(38px,5vw,66px)", lineHeight: .96, letterSpacing: "-.055em", maxWidth: 760 }}>Make something worth stopping for.</h1>
                <p style={{ maxWidth: 720, margin: 0, color: "#a3adbc", fontSize: 15, lineHeight: 1.65 }}>Choose the outcome. The system researches what is working, finds the right format, adapts it to your world and hands you the finished creative direction.</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 22 }}>
                  {["Research first", "Niche-aware", "Format-led", "Production-ready"].map((x) => <span key={x} style={{ padding: "8px 10px", borderRadius: 999, border: "1px solid #292f3b", background: "#0d1118", color: "#8e98aa", fontSize: 10, fontWeight: 850 }}>{x}</span>)}
                </div>
              </div>
              <div style={{ borderRadius: 26, padding: 26, border: "1px solid #262c38", background: "linear-gradient(160deg,#11151d,#0c1016)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div><div style={{ color: "#7f899b", fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 900 }}>Start here</div><div style={{ marginTop: 12, fontSize: 23, fontWeight: 900, letterSpacing: "-.03em" }}>What are you trying to grow?</div></div>
                <div style={{ marginTop: 24, display: "grid", gap: 9 }}>
                  {[WORKSPACES[1], WORKSPACES[2], WORKSPACES[3], WORKSPACES[4]].map((item) => <button key={item.id} type="button" onClick={() => setView(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 13px", borderRadius: 13, border: "1px solid #252c39", background: "#0c1016", color: "#f2f4f7", cursor: "pointer", textAlign: "left" }}><span style={{ width: 30, height: 30, borderRadius: 10, display: "grid", placeItems: "center", background: tones[item.tone].tint, color: tones[item.tone].icon, fontWeight: 900 }}>{item.icon}</span><span><span style={{ display: "block", fontSize: 12, fontWeight: 900 }}>{item.title}</span><span style={{ display: "block", color: "#6e7889", fontSize: 10, marginTop: 2 }}>{item.label}</span></span><span style={{ marginLeft: "auto", color: "#4f596a" }}>→</span></button>)}
                </div>
              </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 16, marginBottom: 32 }}>
              {WORKSPACES[0] && <WorkspaceCard item={WORKSPACES[0]} onOpen={setView} large />}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 16 }}>
                {WORKSPACES.slice(1, 3).map((item) => <WorkspaceCard key={item.id} item={item} onOpen={setView} />)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 16 }}>
                {WORKSPACES.slice(3, 5).map((item) => <WorkspaceCard key={item.id} item={item} onOpen={setView} />)}
              </div>
            </section>

            <section>
              <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 12, marginBottom: 12 }}><div><div style={{ color: "#677186", fontSize: 9, textTransform: "uppercase", letterSpacing: ".13em", fontWeight: 900 }}>Tools</div><h2 style={{ margin: "5px 0 0", fontSize: 20, letterSpacing: "-.03em" }}>Supporting studio tools</h2></div></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 10 }}>
                {TOOLS.map((tool) => <button key={tool.id} type="button" onClick={() => setView(tool.id)} style={{ padding: 15, minHeight: 106, borderRadius: 16, border: "1px solid #252c39", background: "#0e1219", color: "#fff", textAlign: "left", cursor: "pointer" }}><div style={{ fontSize: 12, fontWeight: 900 }}>{tool.label}</div><div style={{ color: "#727d8e", fontSize: 10, lineHeight: 1.5, marginTop: 6 }}>{tool.desc}</div></button>)}
              </div>
            </section>
          </main>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
              <div><button type="button" onClick={() => setView("home")} style={{ border: 0, background: "transparent", padding: 0, color: "#727d8e", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>← Back to studio</button><div style={{ marginTop: 8, fontSize: 27, fontWeight: 950, letterSpacing: "-.04em" }}>{current?.title || TOOLS.find((x) => x.id === view)?.label || "Studio"}</div><div style={{ color: "#737e90", fontSize: 12, marginTop: 3 }}>{current?.desc || TOOLS.find((x) => x.id === view)?.desc || ""}</div></div>
            </div>
            {content}
          </div>
        )}
      </div>
    </div>
  );
}
