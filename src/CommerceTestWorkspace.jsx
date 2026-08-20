import React, { useMemo, useState } from "react";
import { supabase } from "./supabase";

const PEOPLE=[
  {id:"cara",name:"Cara",description:"Direct, dry, disciplined, British."},
  {id:"lila",name:"Lila",description:"Warm, measured, observant, understated."},
  {id:"cara_lila",name:"Cara + Lila",description:"Two distinct voices, chemistry and contrast."},
];
const OBJECTIVES=["Sell","Discover","Test Hook","Build Demand"];
const FORMATS=[
  ["problem_solution","Problem / Solution","Pain → discovery → demonstration → payoff → CTA"],
  ["talking_ugc","Talking UGC","Creator speaks directly to camera with the product woven into the story"],
  ["reaction","Reaction","Creator reacts to the problem, product or discovery"],
  ["slideshow","Slideshow","TikTok Photo Mode: swipeable story with on-image copy"],
  ["before_after","Before / After","Observable contrast without fabricated results"],
  ["grwm","GRWM","Product appears naturally inside getting-ready content"],
  ["story","Story","Specific micro-story with curiosity and payoff"],
  ["comparison","Comparison","Simple A/B or old-way-vs-new-way contrast"],
];
const BIBLES={
  cara:`Cara is an adult fictional creator. Direct, dry, disciplined and British. Practical, confident and slightly self-aware. She speaks plainly, never like a corporate brand. Strong worlds: routines, style, training, work, confidence and useful discoveries.`,
  lila:`Lila is an adult fictional creator. Warm, measured, observant and understated. Calm rather than loud. Strong worlds: beauty, skincare, haircare, lifestyle, travel, routines and small discoveries.`,
  cara_lila:`Cara and Lila are two separate adult fictional creators. Cara is direct, dry and disciplined. Lila is warm, measured and observant. Never merge identities; use contrast, chemistry or shared situations.`,
};
const FORMAT_RULES={
  problem_solution:"Make the problem concrete immediately. Frustration first, product second. End with a natural shopping cue.",
  talking_ugc:"Start mid-thought. Use one believable observation, one product detail and one reason to care. Avoid sales-script cadence.",
  reaction:"Open with a genuine reaction or curiosity gap. The reaction must matter to the viewer. Product enters naturally.",
  slideshow:"Create 5–7 coherent slides. Each earns the next swipe. Every slide gets short on-image text plus a detailed JSON image prompt.",
  before_after:"Define the exact visual difference. No fabricated numbers, testimonials or medical/beauty claims.",
  grwm:"The product belongs inside the routine. Use real situations: work, date night, going out, travel, skincare, hair or getting dressed.",
  story:"Use setup, tension, discovery and payoff. Be specific enough to feel lived rather than generic.",
  comparison:"Use a useful, simple contrast. Never invent prices, specs or superiority claims.",
};
function parseJson(text){
  const clean=String(text||"").replace(/```json|```/g,"").trim();
  try{return JSON.parse(clean);}catch{}
  const start=clean.search(/[\[{]/); if(start<0) throw new Error("Qwen returned invalid JSON");
  const opener=clean[start], closer=opener==="{"?"}":"]"; let depth=0,quote=false,escaped=false;
  for(let i=start;i<clean.length;i++){
    const c=clean[i];
    if(quote){if(escaped) escaped=false; else if(c==="\\") escaped=true; else if(c==='"') quote=false;}
    else if(c==='"') quote=true; else if(c===opener) depth++; else if(c===closer){depth--; if(depth===0)return JSON.parse(clean.slice(start,i+1));}
  }
  throw new Error("Qwen returned incomplete JSON");
}
async function queueQwen({title,persona,systemPrompt,userPrompt}){
  const {data,error}=await supabase.from("local_ai_jobs").insert({
    title,job_type:"commerce_test",model:"mlx-community/Qwen3-8B-4bit",persona_id:persona,system_prompt:systemPrompt,user_prompt:userPrompt,
    options:{max_tokens:7000,temperature:0.62},status:"queued",production_status:"not_started"
  }).select("id").single();
  if(error)throw error; return data.id;
}
async function waitQwen(jobId,setMessage){
  const deadline=Date.now()+10*60*1000;
  while(Date.now()<deadline){
    await new Promise(r=>setTimeout(r,3500));
    const {data,error}=await supabase.from("local_ai_jobs").select("id,status,result,error_message").eq("id",jobId).maybeSingle();
    if(error)throw error; if(!data)throw new Error("Qwen job disappeared from the queue.");
    if(data.status==="completed")return data.result||"";
    if(data.status==="error")throw new Error(data.error_message||"Qwen failed.");
    setMessage(`Qwen is thinking like a TikTok UGC strategist… ${data.status}`);
  }
  throw new Error("Qwen timed out. Make sure the local Qwen worker is running.");
}
function loadProducts(){try{return JSON.parse(localStorage.getItem("caig_commerce_products")||"[]")}catch{return[]}}
function Info({label,value}){return <div style={info}><div style={section}>{label}</div><div style={{fontSize:12,lineHeight:1.5,color:"#d7dde8"}}>{value||"—"}</div></div>}
function Box({title,value,copy}){return <div><div style={section}>{title}{copy&&<button onClick={copy} style={{...button,marginLeft:8,padding:"4px 8px",fontSize:10}}>Copy</button>}</div><div style={output}>{value||"—"}</div></div>}

export default function CommerceTestWorkspace(){
  const [persona,setPersona]=useState("cara");
  const [productId,setProductId]=useState("");
  const [productName,setProductName]=useState("");
  const [productUrl,setProductUrl]=useState("");
  const [productPrice,setProductPrice]=useState("");
  const [commission,setCommission]=useState("");
  const [problem,setProblem]=useState("");
  const [proof,setProof]=useState("");
  const [objective,setObjective]=useState("Sell");
  const [format,setFormat]=useState("problem_solution");
  const [count,setCount]=useState("5");
  const [direction,setDirection]=useState("");
  const [products,setProducts]=useState(()=>loadProducts());
  const [tests,setTests]=useState([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const selectedProduct=useMemo(()=>products.find(p=>p.id===productId)||null,[products,productId]);

  function loadProduct(id){
    setProductId(id);
    const p=products.find(x=>x.id===id); if(!p)return;
    setProductName(p.name||""); setProductUrl(p.url||""); setProductPrice(p.price||""); setCommission(p.commission||""); setProblem(p.problem||""); setProof(p.proof||"");
  }
  function saveProduct(){
    if(!productName.trim()){setMessage("Add a product name first.");return;}
    const p={id:productId||crypto.randomUUID(),name:productName.trim(),url:productUrl.trim(),price:productPrice.trim(),commission:commission.trim(),problem:problem.trim(),proof:proof.trim()};
    const next=[p,...products.filter(x=>x.id!==p.id)]; localStorage.setItem("caig_commerce_products",JSON.stringify(next)); setProducts(next); setProductId(p.id); setMessage("Product saved.");
  }
  function copy(text){navigator.clipboard?.writeText(String(text||""));setMessage("Copied.")}

  async function generateTests(){
    if(!productName.trim()){setMessage("Add a product before generating.");return;}
    setBusy(true);setTests([]);setMessage(`Building ${count} commerce tests…`);
    try{
      const person=PEOPLE.find(p=>p.id===persona); const fmt=FORMATS.find(x=>x[0]===format);
      const systemPrompt=`You are the senior TikTok Shop creative strategist, UGC director, retention editor and follower-growth analyst inside CornerstoneAIAssets. You are an expert, not a generic copywriter. You understand TikTok-native hooks, retention, comments, saves, shares, follower conversion, product discovery, UGC, creator voice and commerce.\n\nCREATOR:\n${BIBLES[persona]}\n\nJOB: Design content that can grow the creator AND sell the product. A post must be worth consuming even if the viewer never buys. The creator is the reason people follow; the product is the reason they may click.\n\nNON-NEGOTIABLES:\n1. Never invent product facts, prices, reviews, testimonials, specs, results or personal experiences.\n2. Never use fake urgency unless supplied as verified.\n3. Avoid unsupported medical, therapeutic or beauty claims. Prefer observable demonstration or personal framing.\n4. Do not sound like an advert. Avoid generic influencer filler.\n5. Hook for a stranger, not an existing fan.\n6. The first 1–2 seconds or first slide must be understandable without context.\n7. Build a reason to keep watching/swiping, comment, save or share before asking for the click.\n8. Product appears at the correct narrative moment.\n9. Captions sound like the creator, not a brand manager.\n10. Every image prompt must be production-ready JSON direction containing identity, environment, wardrobe, action, framing, camera, lighting, product placement, realism constraints and negative constraints.\n11. Carousels: every slide gets exact on-image text AND its own JSON production prompt, with visual continuity.\n12. UGC actions must be physically plausible and easy to demonstrate.\n13. Prefer specific everyday pain points and social situations over abstract benefits.\n14. Objective emphasis: Sell=conversion after value; Discover=curiosity; Test Hook=isolate hook quality; Build Demand=problem awareness plus saves/shares.\n15. Produce materially different angles, not rewrites.\n\nFORMAT: ${fmt?.[1]}\nFORMAT RULES: ${FORMAT_RULES[format]}\n\nQUALITY BAR: Think like someone who has reviewed thousands of short-form posts. Reject anything that could belong to any random influencer. Every test needs a clear stop reason, retention mechanism, follower reason, natural product role and production-ready execution.\n\nReturn JSON only. No markdown.`;
      const userPrompt=`CREATOR: ${person?.name}\nPRODUCT: ${productName.trim()}\nPRODUCT URL: ${productUrl.trim()||"not supplied"}\nPRICE: ${productPrice.trim()||"not supplied"}\nCOMMISSION: ${commission.trim()||"not supplied"}\nCORE PROBLEM: ${problem.trim()||"not supplied"}\nVERIFIED FACTS/PROOF: ${proof.trim()||"none supplied"}\nOBJECTIVE: ${objective}\nFORMAT: ${fmt?.[1]}\nEXTRA DIRECTION: ${direction.trim()||"none"}\n\nGenerate exactly ${count} tests. Return exactly {"tests":[{"id":"T1","angle":"","hook":"","retention_mechanism":"","follower_reason":"","creator_role":"","product_role":"","script":"","post_caption":"","cta":"","comment_prompt":"","image_generation_prompts":[{"shot":1,"purpose":"","on_image_caption":"","json_prompt":""}],"video_json_prompt":"","why_this_should_work":""}]}\n\nFor non-carousel formats use only as many image prompts as genuinely useful, usually 1–4. For slideshow use 5–7. post_caption is the TikTok post caption. on_image_caption is the exact text to place on the visual. json_prompt is production-ready JSON-stringified direction, not vague prose. Make every test usable by the production engine without another creative pass.`;
      const jobId=await queueQwen({title:`Commerce Test · ${person?.name} · ${productName.trim()}`,persona,systemPrompt,userPrompt});
      const parsed=parseJson(await waitQwen(jobId,setMessage)); const generated=Array.isArray(parsed.tests)?parsed.tests:[];
      if(!generated.length)throw new Error("Qwen returned no commerce tests.");
      setTests(generated); setMessage(`${generated.length} tests ready — captions, on-image copy and JSON prompts included.`);
    }catch(e){setMessage(e.message||String(e))}finally{setBusy(false)}
  }

  return <div style={page}><div style={shell}>
    <div style={{marginBottom:20}}><div style={eyebrow}>Track B · Commerce Test</div><h1 style={h1}>Product → Hook → UGC → Test → Winner</h1><p style={muted}>This is the switched-on commerce brain for Cara and Lila. Qwen is instructed to think like a senior TikTok Shop UGC strategist and return the whole production package, not just an idea.</p></div>

    <section style={card}><div style={title}>1. Select creator</div><div style={grid3}>{PEOPLE.map(p=><button key={p.id} onClick={()=>setPersona(p.id)} style={persona===p.id?activeCard:cardButton}><div style={{fontWeight:900}}>{p.name}</div><div style={mutedSmall}>{p.description}</div></button>)}</div></section>

    <section style={card}><div style={title}>2. Select product</div><div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 220px",gap:12}}><div>
      <label style={label}>Saved product<select value={productId} onChange={e=>loadProduct(e.target.value)} style={input}><option value="">New product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}{p.commission?` · ${p.commission}`:""}</option>)}</select></label>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginTop:10}}><input value={productName} onChange={e=>setProductName(e.target.value)} placeholder="Product name" style={input}/><input value={productPrice} onChange={e=>setProductPrice(e.target.value)} placeholder="Price" style={input}/><input value={commission} onChange={e=>setCommission(e.target.value)} placeholder="Commission" style={input}/></div>
      <input value={productUrl} onChange={e=>setProductUrl(e.target.value)} placeholder="TikTok Shop/product URL" style={{...input,marginTop:10}}/>
      </div><div><button onClick={saveProduct} style={{...primary,width:"100%"}}>Save Product</button>{selectedProduct&&<div style={savedBox}>Saved: <b>{selectedProduct.name}</b><br/>Commission: {selectedProduct.commission||"—"}</div>}</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}><textarea value={problem} onChange={e=>setProblem(e.target.value)} placeholder="Problem it solves — use the customer's actual language where possible" rows={4} style={textarea}/><textarea value={proof} onChange={e=>setProof(e.target.value)} placeholder="Verified facts, demo observations or real proof. Leave blank rather than invent." rows={4} style={textarea}/></div>
    </section>

    <section style={card}><div style={title}>3. Choose objective + format</div><div style={grid3}><label style={label}>Objective<select value={objective} onChange={e=>setObjective(e.target.value)} style={input}>{OBJECTIVES.map(x=><option key={x}>{x}</option>)}</select></label><label style={label}>Format<select value={format} onChange={e=>setFormat(e.target.value)} style={input}>{FORMATS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label style={label}>Variations<select value={count} onChange={e=>setCount(e.target.value)} style={input}><option value="1">1</option><option value="5">5</option><option value="10">10</option></select></label></div><div style={hint}>{FORMATS.find(x=>x[0]===format)?.[2]}</div><textarea value={direction} onChange={e=>setDirection(e.target.value)} placeholder="Optional: hook, situation, trend, product angle or test you want Qwen to explore" rows={3} style={{...textarea,marginTop:10}}/><button disabled={busy} onClick={generateTests} style={{...primary,marginTop:12,padding:"12px 18px"}}>{busy?"Qwen is working…":`Generate ${count} Commerce Test${count==="1"?"":"s"}`}</button></section>

    <section style={card}><div style={title}>4. Test board</div>{!tests.length&&<div style={empty}>Your generated tests will appear here.</div>}<div style={{display:"grid",gap:16}}>{tests.map((test,index)=><article key={test.id||index} style={testCard}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}><div><div style={section}>TEST {index+1} · {test.angle||"Angle"}</div><h2 style={h2}>{test.hook||"Hook"}</h2></div><button onClick={()=>copy(JSON.stringify(test,null,2))} style={button}>Copy JSON</button></div>
      <div style={statGrid}><Info label="Retention mechanism" value={test.retention_mechanism}/><Info label="Follower reason" value={test.follower_reason}/><Info label="Creator role" value={test.creator_role}/><Info label="Product role" value={test.product_role}/></div>
      <div style={twoCol}><Box title="Script" value={test.script}/><Box title="TikTok caption" value={test.post_caption} copy={()=>copy(test.post_caption)}/><Box title="CTA" value={test.cta}/><Box title="Comment prompt" value={test.comment_prompt}/></div>
      <div style={{marginTop:12}}><div style={section}>Image / carousel production prompts</div><div style={{display:"grid",gap:10}}>{(test.image_generation_prompts||[]).map((shot,i)=><div key={shot.shot||i} style={promptCard}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><b>Shot {shot.shot||i+1}</b><button onClick={()=>copy(shot.json_prompt)} style={button}>Copy prompt</button></div><div style={{marginTop:7,fontSize:11,color:"#d7dde8"}}>On-image caption: <b>{shot.on_image_caption||"—"}</b></div><pre style={pre}>{shot.json_prompt||"—"}</pre></div>)}</div></div>
      {test.video_json_prompt&&<div style={{marginTop:12}}><Box title="Video JSON prompt" value={test.video_json_prompt} copy={()=>copy(test.video_json_prompt)}/></div>}
      <div style={{marginTop:12}}><Box title="Why this should work" value={test.why_this_should_work}/></div>
    </article>)}</div></section>
  </div>{message&&<div style={toast}>{message}</div>}</div>
}

const page={minHeight:"100vh",background:"#08070d",color:"#eef1f7",padding:26,fontFamily:"Inter,system-ui,sans-serif"};
const shell={maxWidth:1280,margin:"0 auto"};
const card={background:"#0e1017",border:"1px solid #252a39",borderRadius:16,padding:18,marginBottom:16};
const title={fontSize:14,fontWeight:900,marginBottom:12};
const eyebrow={fontSize:10,letterSpacing:".18em",textTransform:"uppercase",color:"#d9a43c",fontWeight:900};
const h1={margin:"7px 0 5px",fontSize:34,letterSpacing:"-.05em"};
const h2={margin:"6px 0",fontSize:20};
const label={display:"flex",flexDirection:"column",gap:7,fontSize:10,textTransform:"uppercase",letterSpacing:".08em",fontWeight:800,color:"#7f8798"};
const input={width:"100%",boxSizing:"border-box",background:"#151822",color:"#fff",border:"1px solid #2a3040",borderRadius:10,padding:"10px 12px"};
const textarea={...input,resize:"vertical",fontFamily:"inherit",lineHeight:1.45};
const button={border:"1px solid #303648",background:"#151924",color:"#eef1f7",borderRadius:10,padding:"8px 11px",fontWeight:800,cursor:"pointer"};
const primary={...button,borderColor:"#d4af37",background:"rgba(212,175,55,.14)",color:"#f7d77b"};
const cardButton={...button,textAlign:"left",minHeight:68};
const activeCard={...cardButton,borderColor:"#d4af37",background:"rgba(212,175,55,.12)"};
const muted={color:"#838ca0",fontSize:12,lineHeight:1.6,maxWidth:900};
const mutedSmall={color:"#838ca0",fontSize:11,lineHeight:1.45,marginTop:4};
const grid3={display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10};
const twoCol={display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12};
const statGrid={display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginTop:12};
const section={fontSize:10,textTransform:"uppercase",letterSpacing:".08em",fontWeight:900,color:"#7f8798",marginBottom:6};
const output={background:"#151822",border:"1px solid #2a3040",borderRadius:10,padding:11,color:"#dce2ec",fontSize:12,lineHeight:1.55,whiteSpace:"pre-wrap",minHeight:46};
const info={border:"1px solid #252a39",borderRadius:10,padding:10};
const testCard={border:"1px solid #2a3040",borderRadius:14,padding:16,background:"#10131a"};
const promptCard={border:"1px solid #252a39",borderRadius:10,padding:12,background:"#0c0f15"};
const pre={margin:"10px 0 0",whiteSpace:"pre-wrap",overflowWrap:"anywhere",background:"#0a0d12",border:"1px solid #202635",borderRadius:8,padding:10,color:"#bfc8d8",fontSize:10.5,lineHeight:1.45};
const hint={marginTop:10,padding:12,borderRadius:10,background:"#121521",border:"1px solid #262c3c",color:"#aeb6c6",fontSize:12,lineHeight:1.55};
const savedBox={marginTop:8,padding:10,border:"1px solid #252a39",borderRadius:10,color:"#9fa8ba",fontSize:11,lineHeight:1.5};
const empty={padding:24,textAlign:"center",border:"1px dashed #2a3040",borderRadius:12,color:"#626b7e"};
const toast={position:"fixed",left:"50%",bottom:18,transform:"translateX(-50%)",background:"#151a24",border:"1px solid #2e3646",color:"#e8edf5",borderRadius:999,padding:"10px 15px",fontSize:11.5,fontWeight:700,zIndex:200,maxWidth:"90vw",textAlign:"center"};
