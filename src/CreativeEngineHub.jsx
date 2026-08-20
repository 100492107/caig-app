import React, { useEffect, useState } from "react";
import AICreatorWorkspaceTrackB from "./AICreatorWorkspaceTrackB.jsx";
import CommerceTestWorkspace from "./CommerceTestWorkspace.jsx";
import TrackBAssetLibrary from "./TrackBAssetLibraryV2.jsx";
import CaptionStudio from "./CaptionStudio.jsx";
import CaptionWriter from "./CaptionWriter.jsx";
import LocalAIStudio from "./LocalAIStudio.jsx";
import AutopilotCreativeEngineV3 from "./AutopilotCreativeEngineV3.jsx";

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
      try { return originalParse.call(JSON, value, reviver); }
      catch (error) {
        const message = String(error?.message || "");
        if (typeof value === "string" && message.includes("non-whitespace character after JSON")) {
          return originalParse.call(JSON, extractFirstJsonValue(value), reviver);
        }
        throw error;
      }
    };
    JSON.parse = patchedParse;
    return () => { if (JSON.parse === patchedParse) JSON.parse = originalParse; };
  }, [enabled]);
}

export default function CreativeEngineHub() {
  const [view, setView] = useState("autopilot");
  useSafeQwenJsonParser(view === "legacy" || view === "commerce");
  const tabs = [
    ["autopilot", "Qwen Autopilot"],
    ["commerce", "Commerce Test"],
    ["captionwriter", "Caption Writer"],
    ["assets", "Asset Library"],
    ["captions", "Caption Studio"],
    ["localai", "Local AI"],
    ["legacy", "Legacy Creator"],
  ];
  return <div>
    <div style={{ position: "sticky", top: 0, zIndex: 150, background: "rgba(8,7,13,.96)", backdropFilter: "blur(14px)", borderBottom: "1px solid #262A3C", padding: "10px 16px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <a href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 12, padding: "9px 13px", border: "1px solid #2d3246", borderRadius: 999 }}>Home</a>
      {tabs.map(([id, label]) => <button key={id} type="button" onClick={() => setView(id)} style={{ padding: "9px 14px", borderRadius: 999, border: `1px solid ${view === id ? "#D4AF37" : "#2d3246"}`, background: view === id ? "rgba(212,175,55,.12)" : "#141525", color: view === id ? "#D4AF37" : "#fff", fontWeight: 800, cursor: "pointer" }}>{label}</button>)}
      <span style={{ marginLeft: "auto", fontSize: 11, color: "#777d94" }}>CornerstoneAIAssets · autonomous creative system</span>
    </div>
    <div style={pane(view === "autopilot")}><AutopilotCreativeEngineV3 /></div>
    <div style={pane(view === "commerce")}><CommerceTestWorkspace /></div>
    <div style={pane(view === "captionwriter")}><CaptionWriter /></div>
    <div style={pane(view === "assets")}><TrackBAssetLibrary /></div>
    <div style={pane(view === "captions")}><CaptionStudio /></div>
    <div style={pane(view === "localai")}><LocalAIStudio /></div>
    <div style={pane(view === "legacy")}><AICreatorWorkspaceTrackB /></div>
  </div>;
}
