import React, { useState } from "react";
import AICreatorWorkspaceFlowV2 from "./AICreatorWorkspaceFlowV2.jsx";
import DistributionLab from "./DistributionLab.jsx";
import TrackBAssetLibrary from "./TrackBAssetLibraryV2.jsx";
import CaptionStudio from "./CaptionStudio.jsx";
import LocalAIStudio from "./LocalAIStudio.jsx";

const pane = (visible) => ({ display: visible ? "block" : "none" });

export default function CreativeEngineHub() {
  const [view, setView] = useState("engine");
  const tabs = [
    ["engine", "AI Creator"],
    ["assets", "Asset Library"],
    ["formats", "Distribution Lab"],
    ["captions", "Caption Studio"],
    ["localai", "Local AI"],
  ];

  return <div>
    <div style={{position:"sticky",top:0,zIndex:150,background:"rgba(8,7,13,.96)",backdropFilter:"blur(14px)",borderBottom:"1px solid #262A3C",padding:"10px 16px",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <a href="/" style={{color:"#fff",textDecoration:"none",fontWeight:800,fontSize:12,padding:"9px 13px",border:"1px solid #2d3246",borderRadius:999}}>Home</a>
      {tabs.map(([id,label]) => <button key={id} type="button" onClick={()=>setView(id)} style={{padding:"9px 14px",borderRadius:999,border:`1px solid ${view===id?"#D4AF37":"#2d3246"}`,background:view===id?"rgba(212,175,55,.12)":"#141525",color:view===id?"#D4AF37":"#fff",fontWeight:800,cursor:"pointer"}}>{label}</button>)}
      <span style={{marginLeft:"auto",fontSize:11,color:"#777d94"}}>CornerstoneAIAssets · Track B</span>
    </div>

    <div style={pane(view === "engine")}><AICreatorWorkspaceFlowV2 /></div>
    <div style={pane(view === "assets")}><TrackBAssetLibrary /></div>
    <div style={pane(view === "formats")}><DistributionLab /></div>
    <div style={pane(view === "captions")}><CaptionStudio /></div>
    <div style={pane(view === "localai")}><LocalAIStudio /></div>
  </div>;
}
