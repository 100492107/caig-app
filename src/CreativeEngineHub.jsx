import React, { useState } from "react";
import CreativeEngineWorkspace from "./CreativeEngineWorkspaceV4.jsx";
import TikTokSlideshowStudio from "./TikTokSlideshowStudio.jsx";

export default function CreativeEngineHub() {
  const [view, setView] = useState("engine");
  return <div>
    <div style={{position:"sticky",top:0,zIndex:150,background:"rgba(8,7,13,.96)",backdropFilter:"blur(14px)",borderBottom:"1px solid #262A3C",padding:"10px 16px",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <a href="/" style={{color:"#fff",textDecoration:"none",fontWeight:800,fontSize:12,padding:"9px 13px",border:"1px solid #2d3246",borderRadius:999}}>Home</a>
      <button onClick={()=>setView("engine")} style={{padding:"9px 14px",borderRadius:999,border:`1px solid ${view==="engine"?"#D4AF37":"#2d3246"}`,background:view==="engine"?"rgba(212,175,55,.12)":"#141525",color:view==="engine"?"#D4AF37":"#fff",fontWeight:800,cursor:"pointer"}}>Creative Engine</button>
      <button onClick={()=>setView("slideshow")} style={{padding:"9px 14px",borderRadius:999,border:`1px solid ${view==="slideshow"?"#D4AF37":"#2d3246"}`,background:view==="slideshow"?"rgba(212,175,55,.12)":"#141525",color:view==="slideshow"?"#D4AF37":"#fff",fontWeight:800,cursor:"pointer"}}>TikTok Slideshow Studio</button>
      <span style={{marginLeft:"auto",fontSize:11,color:"#777d94"}}>Premium creative testing · human-first · distribution-aware</span>
    </div>
    {view==="engine" ? <CreativeEngineWorkspace /> : <TikTokSlideshowStudio />}
  </div>;
}
