import React, { useEffect, useState } from "react";
import AICreatorWorkspaceTrackB from "./AICreatorWorkspaceTrackB.jsx";
import CommerceTestWorkspace from "./CommerceTestWorkspace.jsx";
import GrowthModeWorkspace from "./GrowthModeWorkspace.jsx";
import TrackASocialWorkspace from "./TrackASocialWorkspace.jsx";
import TrackBAssetLibrary from "./TrackBAssetLibraryV2.jsx";
import CaptionStudio from "./CaptionStudio.jsx";
import CaptionWriter from "./CaptionWriter.jsx";
import LocalAIStudio from "./LocalAIStudio.jsx";
import AutopilotCreativeEngineV3 from "./AutopilotCreativeEngineV3.jsx";
import YouTubeGrowthNicheWorkspace from "./YouTubeGrowthNicheWorkspace.jsx";

const pane=(visible)=>({display:visible?"block":"none"});
function extractFirstJsonValue(text){const source=String(text||"");const start=source.search(/[\[{]/);if(start<0)throw new Error("No JSON value found");const open=source[start],close=open==="{"?"}":"]";let depth=0,inString=false,escaped=false;for(let i=start;i<source.length;i+=1){const ch=source[i];if(inString){if(escaped)escaped=false;else if(ch==="\\")escaped=true;else if(ch==='"')inString=false;continue;}if(ch==='"')inString=true;else if(ch===open)depth+=1;else if(ch===close){depth-=1;if(depth===0)return source.slice(start,i+1);}}throw new Error("Incomplete JSON value");}
function useSafeQwenJsonParser(enabled){useEffect(()=>{if(!enabled||typeof JSON==="undefined"||typeof JSON.parse!=="function")return undefined;const originalParse=JSON.parse;const patchedParse=function safeParse(value,reviver){try{return originalParse.call(JSON,value,reviver)}catch(error){const message=String(error?.message||"");if(typeof value==="string"&&message.includes("non-whitespace character after JSON"))return originalParse.call(JSON,extractFirstJsonValue(value),reviver);throw error;}};JSON.parse=patchedParse;return()=>{if(JSON.parse===patchedParse)JSON.parse=originalParse}},[enabled]);}

const TABS=[
  ["autopilot","Autopilot","Radar + creative director"],
  ["trackasocial","Track A Social","Dealer market growth engine"],
  ["growth","Creator Growth","Cara / Lila audience engine"],
  ["commerce","Commerce","TikTok Shop testing"],
  ["youtube","YouTube","Animated long-form studio"],
  ["assets","Assets","Generated media library"],
  ["captionwriter","Caption Writer","Copy production"],
  ["captions","Caption Studio","Video captions"],
  ["localai","Local AI","Workers + jobs"],
  ["legacy","Legacy","Older Track B tools"],
];

const DESCRIPTIONS={
  autopilot:"Signal radar, concept selection and production orchestration.",
  trackasocial:"Build Cornerstone AI Group authority and dealer demand across social platforms.",
  growth:"Build recognisable creators before monetisation.",
  commerce:"Turn creator attention into validated product sales.",
  youtube:"Adult animated business stories built for long-form retention.",
  assets:"Your generated media, prompts and production outputs.",
  captionwriter:"Write and refine platform-native captions.",
  captions:"Caption and subtitle production workspace.",
  localai:"Queue, inspect and monitor local Qwen jobs.",
  legacy:"Older creator tooling kept available for continuity.",
};

export default function CreativeEngineHub(){
  const [view,setView]=useState("autopilot");
  useSafeQwenJsonParser(view==="legacy"||view==="commerce"||view==="growth"||view==="youtube"||view==="trackasocial");
  return <div style={{minHeight:"100vh",background:"#080a0f",color:"#fff"}}>
    <header style={{position:"sticky",top:0,zIndex:300,background:"rgba(8,10,15,.88)",backdropFilter:"blur(18px)",borderBottom:"1px solid #1f2532"}}>
      <div style={{maxWidth:1500,margin:"0 auto",padding:"14px 22px 0"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}><a href="/" style={{display:"grid",placeItems:"center",width:38,height:38,borderRadius:12,border:"1px solid #303648",background:"#11151e",color:"#d4af37",textDecoration:"none",fontWeight:950}}>C</a><div><div style={{fontSize:10,color:"#d4af37",fontWeight:950,letterSpacing:".13em",textTransform:"uppercase"}}>Cornerstone AI Assets</div><div style={{fontSize:18,fontWeight:950,letterSpacing:"-.02em"}}>Creative Engine</div></div></div>
          <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{display:"flex",alignItems:"center",gap:7,fontSize:10,color:"#8c96a9",padding:"8px 10px",border:"1px solid #262d3d",borderRadius:999}}><span style={{width:7,height:7,borderRadius:99,background:"#73d2ad"}}/>Qwen local intelligence online</div></div>
        </div>
        <nav style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,scrollbarWidth:"thin"}}>{TABS.map(([id,label,sub])=><button key={id} type="button" onClick={()=>setView(id)} title={sub} style={{whiteSpace:"nowrap",padding:"10px 13px",borderRadius:11,border:`1px solid ${view===id?"#9a7828":"#252b39"}`,background:view===id?"linear-gradient(135deg,rgba(212,175,55,.17),rgba(212,175,55,.04))":"#0f131b",color:view===id?"#e7c75a":"#aeb6c4",fontWeight:900,fontSize:11,cursor:"pointer"}}>{label}</button>)}</nav>
      </div>
    </header>
    <div style={{maxWidth:1500,margin:"0 auto",padding:"12px 22px 0"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,padding:"8px 2px 12px"}}><div><div style={{fontSize:10,color:"#626c7e",textTransform:"uppercase",fontWeight:900,letterSpacing:".1em"}}>Current workspace</div><div style={{fontSize:14,fontWeight:900,marginTop:3}}>{TABS.find(x=>x[0]===view)?.[1] || "Creative Engine"}</div></div><div style={{color:"#657085",fontSize:11,textAlign:"right"}}>{DESCRIPTIONS[view]}</div></div></div>
    <div style={pane(view==="autopilot")}><AutopilotCreativeEngineV3/></div>
    <div style={pane(view==="trackasocial")}><TrackASocialWorkspace/></div>
    <div style={pane(view==="growth")}><GrowthModeWorkspace/></div>
    <div style={pane(view==="commerce")}><CommerceTestWorkspace/></div>
    <div style={pane(view==="youtube")}><YouTubeGrowthNicheWorkspace/></div>
    <div style={pane(view==="captionwriter")}><CaptionWriter/></div>
    <div style={pane(view==="assets")}><TrackBAssetLibrary/></div>
    <div style={pane(view==="captions")}><CaptionStudio/></div>
    <div style={pane(view==="localai")}><LocalAIStudio/></div>
    <div style={pane(view==="legacy")}><AICreatorWorkspaceTrackB/></div>
  </div>;
}
