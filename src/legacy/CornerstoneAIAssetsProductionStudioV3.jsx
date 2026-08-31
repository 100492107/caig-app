import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const card={background:"#0e1017",border:"1px solid #252a39",borderRadius:16,padding:18};
const input={width:"100%",boxSizing:"border-box",background:"#151822",color:"#fff",border:"1px solid #2a3040",borderRadius:9,padding:10};
const btn={border:"1px solid #303648",background:"#151924",color:"#eef1f7",borderRadius:9,padding:"10px 14px",fontWeight:800,cursor:"pointer"};
const primary={...btn,borderColor:"#d4af37",background:"rgba(212,175,55,.14)",color:"#f7d77b"};
const GBP_PER_USD=0.737;
const MODES=[
 {id:"static_image",label:"Static Image",desc:"Approved image only — no video cost."},
 {id:"carousel",label:"Carousel",desc:"Build a coherent multi-image set."},
 {id:"cinematic_motion",label:"Cinematic Motion",desc:"One approved image → premium motion."},
 {id:"multi_image_motion",label:"Multi-Image Motion",desc:"Multiple approved images → one clip each."},
 {id:"ugc",label:"UGC",desc:"Creator + product reference-led motion."},
 {id:"short_form",label:"Short-form",desc:"Build short-form shots from the same references."},
 {id:"long_form",label:"Long-form",desc:"Director plan; generate scenes selectively."},
];
function money(usd){return `$${usd.toFixed(2)} (~£${(usd*GBP_PER_USD).toFixed(2)})`}
function cost(mode,resolution,outputs,clips=1){if(mode==="static_image"||mode==="carousel")return 0;const per=resolution==="480p"?0.2:0.4;return +(per*Math.max(1,outputs)*Math.max(1,clips)).toFixed(2)}

export default function CornerstoneAIAssetsProductionStudioV3(){
 const [characters,setCharacters]=useState([]),[brands,setBrands]=useState([]),[products,setProducts]=useState([]),[assets,setAssets]=useState([]),[jobs,setJobs]=useState([]);
 const [characterId,setCharacterId]=useState(""),[brandId,setBrandId]=useState(""),[productId,setProductId]=useState(""),[refs,setRefs]=useState([]),[mode,setMode]=useState("cinematic_motion"),[resolution,setResolution]=useState("720p"),[outputs,setOutputs]=useState(1),[motion,setMotion]=useState("Slow cinematic push-in, subtle natural breathing and hair movement, gentle environmental motion, realistic phone-camera physics, no sudden movement.");
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[videoUrl,setVideoUrl]=useState("");
 async function load(){
  try{
   const {data:ws,error:we}=await supabase.from("track_b_workspaces").select("*").eq("slug","cornerstoneaiassets-internal").maybeSingle(); if(we)throw we;
   const [c,b,p,a,j]=await Promise.all([
    supabase.from("track_b_characters").select("*").eq("workspace_id",ws?.id).order("created_at"),
    supabase.from("track_b_brands").select("*").eq("workspace_id",ws?.id).order("created_at"),
    supabase.from("track_b_products").select("*").order("created_at",{ascending:false}),
    supabase.from("track_b_assets").select("*").eq("workspace_id",ws?.id).eq("approval_status","approved").order("created_at",{ascending:false}).limit(200),
    supabase.from("track_b_production_jobs").select("*,track_b_content_projects(title)").order("created_at",{ascending:false}).limit(30)
   ]);
   if(c.error)throw c.error;if(b.error)throw b.error;if(p.error)throw p.error;if(a.error)throw a.error;if(j.error)throw j.error;
   setCharacters(c.data||[]);setBrands(b.data||[]);setProducts(p.data||[]);setAssets(a.data||[]);setJobs(j.data||[]);if(!characterId&&c.data?.[0])setCharacterId(c.data[0].id);
  }catch(e){setMessage(e.message||String(e))}
 }
 useEffect(()=>{load()},[]);
 const filteredProducts=useMemo(()=>brandId?products.filter(p=>p.brand_id===brandId):products,[products,brandId]);
 const selectedCharacter=characters.find(x=>x.id===characterId),selectedBrand=brands.find(x=>x.id===brandId),selectedProduct=products.find(x=>x.id===productId),selectedRefs=assets.filter(x=>refs.includes(x.id));
 const clips=(mode==="multi_image_motion"?Math.max(1,selectedRefs.length):1),usd=cost(mode,resolution,outputs,clips);
 const toggle=id=>setRefs(r=>r.includes(id)?r.filter(x=>x!==id):[...r,id]);
 const prompt=()=>[
  `Premium social-first image-to-video for ${selectedCharacter?.name||"the selected creator"}.`,
  selectedBrand?`Brand: ${selectedBrand.name}.`:"",
  selectedProduct?`Product: ${selectedProduct.name}. ${selectedProduct.description||""}`:"",
  "Use the supplied approved source image as the exact first frame. Preserve identity, product appearance, wardrobe, environment and composition.",
  motion,
  "Natural human movement, grounded physics, subtle camera motion, premium editorial/social realism, no generic AI movement, no redesign of the scene."
 ].filter(Boolean).join(" ");
 async function generate(){
  if(!selectedRefs[0]?.public_url){setMessage("Select an approved image reference first.");return}
  if(!["cinematic_motion","ugc"].includes(mode)){setMessage("The live adapter currently supports Cinematic Motion and UGC. Multi-image, Short-form and Long-form are planned shot-by-shot next.");return}
  setBusy(true);setVideoUrl("");setMessage("Submitting approved reference to fal.ai Wan 2.1…");let projectId=null,jobId=null;
  try{
   const {data:project,error:pe}=await supabase.from("track_b_content_projects").insert({brand_id:brandId||null,product_id:productId||null,title:`${mode} · ${selectedCharacter?.name||"Creative"}${selectedProduct?` · ${selectedProduct.name}`:""}`,source_type:"image",brief:{character_id:characterId||null,reference_asset_ids:refs,motion_prompt:motion,provider:"fal-ai/wan-i2v",resolution,outputs},status:"in_production"}).select("id").single();if(pe)throw pe;projectId=project.id;
   const {data:job,error:je}=await supabase.from("track_b_production_jobs").insert({project_id:projectId,mode,target_duration_seconds:5,output_count:outputs,provider_strategy:"premium",estimated_credits:0,estimated_compute_tier:"medium",config:{provider:"fal-ai/wan-i2v",reference_asset_ids:refs,estimated_usd:usd,estimated_gbp:+(usd*GBP_PER_USD).toFixed(2)},status:"processing"}).select("id").single();if(je)throw je;jobId=job.id;
   const s=await fetch("/api/track-b-video-submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageUrl:selectedRefs[0].public_url,prompt:prompt(),resolution,aspectRatio:"9:16",numFrames:81,fps:16})});const sd=await s.json();if(!s.ok)throw new Error(sd?.error||"Video submit failed");
   let completed=false;
   for(let i=0;i<80;i++){
    await new Promise(r=>setTimeout(r,4500));const p=await fetch("/api/track-b-video-poll",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:sd.requestId,action:"status"})});const st=await p.json();if(!p.ok)throw new Error(st?.error||"Video status failed");setMessage(`Generating… ${st.status}${st.queuePosition!=null?` · queue ${st.queuePosition}`:""}`);if(st.status==="COMPLETED"){completed=true;break}if(["FAILED","CANCELLED"].includes(st.status))throw new Error(`fal.ai generation ${String(st.status).toLowerCase()}`)
   }
   if(!completed)throw new Error("Video generation timed out after about 6 minutes.");
   const r=await fetch("/api/track-b-video-poll",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:sd.requestId,action:"result"})});const rd=await r.json();if(!r.ok||!rd.videoUrl)throw new Error(rd?.error||"No completed video URL returned");setVideoUrl(rd.videoUrl);
   await supabase.from("track_b_production_shots").insert({production_job_id:jobId,shot_order:1,duration_seconds:5,purpose:mode,motion_prompt:motion,reference_asset_ids:refs,premium_generation:true,metadata:{provider:"fal-ai/wan-i2v",request_id:sd.requestId,result_url:rd.videoUrl,estimated_usd:usd,estimated_gbp:+(usd*GBP_PER_USD).toFixed(2)}});
   await supabase.from("track_b_derivatives").insert({project_id:projectId,parent_production_job_id:jobId,derivative_type:mode==="ugc"?"reel":"short",source_reference:{provider:"fal-ai/wan-i2v",request_id:sd.requestId,reference_asset_ids:refs},output_url:rd.videoUrl,status:"completed",completed_at:new Date().toISOString()});
   await supabase.from("track_b_production_jobs").update({status:"completed",completed_at:new Date().toISOString(),config:{provider:"fal-ai/wan-i2v",request_id:sd.requestId,output_url:rd.videoUrl,reference_asset_ids:refs,estimated_usd:usd,estimated_gbp:+(usd*GBP_PER_USD).toFixed(2)}}).eq("id",jobId);
   setMessage(`Done — 1 live premium clip generated for ${money(usd)}. The selected Asset Library image was the source frame.`);await load();
  }catch(e){if(jobId)await supabase.from("track_b_production_jobs").update({status:"error",config:{error:e.message,estimated_usd:usd,estimated_gbp:+(usd*GBP_PER_USD).toFixed(2)}}).eq("id",jobId);setMessage(e.message||String(e));}
  finally{setBusy(false)}
 }
 return <div style={{minHeight:"100vh",background:"#08070d",color:"#eef1f7",padding:"28px 32px 72px",fontFamily:"Inter,system-ui,sans-serif"}}>
  <div style={{maxWidth:1240,margin:"0 auto 18px"}}><div style={{textTransform:"uppercase",letterSpacing:".16em",fontSize:10,color:"#d4af37",fontWeight:800}}>CornerstoneAIAssets · Track B</div><h1 style={{margin:"8px 0 5px",fontSize:34,letterSpacing:"-.04em"}}>Reference-aware Production Studio</h1><p style={{margin:0,color:"#7f8798",fontSize:12}}>Live first adapter: approved Asset Library image → fal.ai Wan 2.1 image-to-video.</p></div>
  <div style={{maxWidth:1240,margin:"0 auto",display:"grid",gridTemplateColumns:"1.15fr .85fr",gap:16}}>
   <section style={card}><b>References</b><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}><label style={{fontSize:11,color:"#9ca5b6"}}>Character<select style={input} value={characterId} onChange={e=>setCharacterId(e.target.value)}><option value="">None</option>{characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label style={{fontSize:11,color:"#9ca5b6"}}>Brand<select style={input} value={brandId} onChange={e=>{setBrandId(e.target.value);setProductId("")}}><option value="">None</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div><label style={{display:"block",fontSize:11,color:"#9ca5b6",marginTop:10}}>Product<select style={input} value={productId} onChange={e=>setProductId(e.target.value)}><option value="">None</option>{filteredProducts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><div style={{marginTop:14,fontWeight:800}}>Approved source images</div><div style={{color:"#7f8798",fontSize:11,margin:"5px 0 10px"}}>The first selected image is the actual source frame sent to the video model.</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:9}}>{assets.filter(a=>a.asset_type==="image"||a.asset_type==="reference").map(a=><button key={a.id} onClick={()=>toggle(a.id)} style={{padding:0,textAlign:"left",overflow:"hidden",borderRadius:12,border:`2px solid ${refs.includes(a.id)?"#d4af37":"#252a39"}`,background:"#0a0c12"}}>{a.public_url?<img src={a.public_url} alt={a.name} style={{width:"100%",aspectRatio:"4/3",objectFit:"cover",display:"block"}}:<div style={{aspectRatio:"4/3",display:"grid",placeItems:"center",color:"#667087"}}>NO URL</div>}<div style={{padding:8,color:"#fff",fontSize:10,fontWeight:800}}>{a.name}</div></button>)}</div></section>
   <section style={card}><b>Production mode</b><div style={{display:"grid",gap:8,marginTop:10}}>{MODES.map(m=><button key={m.id} onClick={()=>setMode(m.id)} style={{...btn,textAlign:"left",borderColor:mode===m.id?"#d4af37":"#303648",background:mode===m.id?"rgba(212,175,55,.11)":"#151924"}}><div>{m.label}</div><div style={{color:"#7f8798",fontSize:10,marginTop:3}}>{m.desc}</div></button>)}</div><label style={{display:"block",fontSize:11,color:"#9ca5b6",marginTop:10}}>Resolution<select style={input} value={resolution} onChange={e=>setResolution(e.target.value)}><option value="720p">720p — recommended</option><option value="480p">480p — cheaper</option></select></label><label style={{display:"block",fontSize:11,color:"#9ca5b6",marginTop:10}}>Outputs<select style={input} value={outputs} onChange={e=>setOutputs(Number(e.target.value))}>{[1,2,3,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label><label style={{display:"block",fontSize:11,color:"#9ca5b6",marginTop:10}}>Motion direction<textarea rows={6} style={{...input,resize:"vertical"}} value={motion} onChange={e=>setMotion(e.target.value)}/></label><div style={{...card,background:"#0a0c12",marginTop:12}}><div style={{fontSize:10,textTransform:"uppercase",color:"#727c90"}}>Actual external generation cost</div><div style={{fontSize:24,fontWeight:900,marginTop:5}}>{money(usd)}</div><div style={{color:"#7f8798",fontSize:10,marginTop:5}}>fal.ai Wan 2.1. 720p is $0.40 per ~5s clip; 480p is $0.20.</div></div><button style={{...primary,width:"100%",marginTop:12}} onClick={generate} disabled={busy||!refs.length}>{busy?"Generating…":`Generate live clip · ${money(usd)}`}</button>{videoUrl&&<div style={{marginTop:14}}><video src={videoUrl} controls playsInline style={{width:"100%",borderRadius:12,background:"#000"}}/><a href={videoUrl} target="_blank" rel="noreferrer" style={{display:"inline-block",marginTop:8,color:"#d4af37",fontSize:11}}>Open generated video →</a></div>}{message&&<div style={{color:"#cbd1dd",fontSize:11,marginTop:12}}>{message}</div>}</section>
  </div>
  <section style={{maxWidth:1240,margin:"16px auto 0",...card}}><b>Recent production</b>{jobs.slice(0,10).map(j=><div key={j.id} style={{borderTop:"1px solid #252a39",padding:"10px 0",display:"flex",justifyContent:"space-between",gap:10}}><div><div style={{fontSize:11,fontWeight:800}}>{j.track_b_content_projects?.title||j.mode}</div><div style={{color:"#7f8798",fontSize:10,marginTop:3}}>{j.status} · ${Number(j.config?.estimated_usd||0).toFixed(2)} (~£{Number(j.config?.estimated_gbp||0).toFixed(2)})</div></div>{j.config?.output_url&&<a href={j.config.output_url} target="_blank" rel="noreferrer" style={{color:"#d4af37",fontSize:10}}>Open →</a>}</div>)}</section>
 </div>
}
