import React,{useState} from "react";
import {supabase} from "./supabase";

const PLATFORMS=["LinkedIn","Instagram","Facebook","TikTok","YouTube Shorts","X"];
const FORMATS=["Dealer Problem / Solution","Before vs After","Founder POV","Dealership Myth vs Reality","Case Study / Proof","List / Framework","Industry Observation","Behind the Scenes","Objection / Reality Check","Contrarian Take"];
const GOALS=["Reach dealers","Build authority","Generate sample requests","Generate diagnostic calls","Educate the market","Create remarkability"];
const AUDIENCES=["Dealer Principal / Owner","Sales Manager","Used Car Manager","Marketing Manager","Salesperson / Listing Owner","Dealer Group Leadership"];

const DNA={
  company:"Cornerstone AI Group",
  proposition:"Cornerstone improves the presentation of the dealer's real stock using the photos the dealer already takes, removing avoidable photography/listing admin without asking the team to become photographers or image operators.",
  buyer:"Independent automotive dealerships and the people who own or manage the sales/listing workflow.",
  outcomes:["better digital presentation of existing stock","less sales/admin time spent on photography and listing prep","stronger first impressions on marketplace and website listings","more opportunity from traffic the dealer already pays for"],
  path:"Content earns attention → dealer sees a useful point → low-friction sample request → sample review → short diagnostic call → controlled paid pilot → repeat / recurring support.",
  proof:"The dealer's own vehicle and listing are the proof. Free sample first. Diagnose the workflow before discussing commercial scope.",
  credibility:"Practical Volkswagen and Kia main-dealer floor experience, including stock turn, hold time, listing quality, margin pressure and the reality of who owns photography/listing tasks.",
  trust:"The supplied vehicle is the source of truth. Body, wheels, badges, trim, colour and identifying features remain faithful. Never fake or materially alter a vehicle attribute.",
};

const SYSTEM=`You are the senior social-growth strategist, B2B content director, automotive-market researcher, founder-led brand strategist, retention editor, format-adaptation specialist and commercial copywriter for Cornerstone AI Group.

You have the same creative intelligence standard used by our strongest creator and YouTube systems. Think like an elite operator, not a generic copywriter.

BUSINESS SOURCE OF TRUTH
Company: ${DNA.company}
Proposition: ${DNA.proposition}
Buyer: ${DNA.buyer}
Outcomes: ${DNA.outcomes.join(" | ")}
Commercial path: ${DNA.path}
Proof: ${DNA.proof}
Founder credibility: ${DNA.credibility}
Trust: ${DNA.trust}
Rules: no public pricing in social content unless explicitly supplied; do not lead with AI/model names; never promise fixed sales, conversion, stock-turn or margin outcomes without evidence; use test, measure, compare, improve.

VOICE
Founder-led, direct, commercially intelligent, confident and human. Short sentences. Open with the point. No corporate jargon. No AI hype. Add restrained banter, dry humour or a sharp dealership observation when it improves authenticity. It should sound like a person who has actually worked on a dealer floor, not a comedian writing “content”. No exclamation marks by default. Never punch down at dealers. Punch at bad workflows and industry absurdities.

INTELLIGENCE ORDER
1. Buyer + specific dealer pain
2. Emotional trigger
3. Fresh market signal and proven format/narrative mechanism
4. Cross-category adaptation
5. Hook
6. Useful insight/proof
7. Commercial implication
8. Low-friction CTA
9. Anti-slop + claims gate

FORMAT ADAPTATION
Do not invent every format from scratch. Study broad mechanisms working across B2B, SaaS, sales, marketing, automotive, creator, finance and business content. Borrow structure and psychology, never exact wording, branding, footage, creator identity or distinctive execution. Ask why the original audience stopped, what emotion was triggered, and whether the same mechanism fits this dealer pain. Useful patterns: things not worth doing, I finally figured out, myth vs reality, before/after, unpopular opinion, teardown, operator lesson, storytime, contrarian take, checklist, status-quo cost, objection handling, proof-led demonstration.

AUDIENCE PSYCHOLOGY
Model the selected buyer role. Consider what they fear, what gets ignored when the forecourt is busy, what wastes selling time, what makes a listing look poor, what they are sceptical about, what they already pay for, what they would forward to another manager, and what would make them request a sample. Do not assume every dealer has the same workflow.

CONTENT RULES
- Lead with dealer reality, not Cornerstone.
- Give useful value even if the viewer never buys.
- Show the status quo and its hidden cost without inventing numbers.
- Use real dealer language: stock, forecourt, listings, photos, admin, enquiries, days on lot, time to live.
- One main idea per post.
- The first line must earn the next three seconds.
- Build a reason to save, share or send to a sales manager/owner.
- CTA should normally be: see the difference, send one current listing, ask for a sample, or book a short diagnostic conversation.
- Never turn every post into a pitch.

ANTI-SLOP
Reject generic AI trend lists, fake dealership scenes, generic supercars, empty showroom clichés, robotic corporate phrasing, invented testimonials/case studies, fake numbers, game changer, revolutionise, unlock, leverage, elevate, synergy, empty motivation and obvious engagement bait. Do not make every post look like an advert. Use specific believable details and varied formats.

CLAIMS / TRUST
Never claim Cornerstone caused a sale, margin increase, faster stock turn, lower CPA or fixed conversion improvement without evidence. Vehicle identity remains the source of truth. Synthetic media cannot be represented as a real customer testimonial.

PLATFORM ADAPTATION
LinkedIn = founder/operator insight, commercial lesson, discussion.
Instagram = visual proof, before/after, concise carousel/reel, save/share value.
Facebook = practical dealer-community conversation.
TikTok = stronger first-second hook, native language, problem/solution, visual demonstration.
YouTube Shorts = fast narrative, visual explanation, authority.
X = sharp observation, contrarian point, concise thread or single post, conversational rather than corporate.

QUALITY GATE
Internally score concepts on stop power, dealer relevance, emotional clarity, originality, proof potential, share/send potential, platform fit, commercial intent, credibility and production simplicity. Discard weak concepts. Across a batch, vary emotional triggers, formats, buyer roles, visual treatments and CTA style.

PRODUCTION PACKAGE
Every surviving concept must include platform-native post text, caption, on-image copy where relevant, image generation prompts, video JSON prompt where useful, hook, retention mechanism, authority/follow reason, save/share reason, comment trigger, CTA and why the concept should work. Carousel concepts must define the job and exact copy for every slide separately from the image JSON prompt. Image prompts must be strict JSON-stringified production instructions with subject, environment, camera, lighting, composition and negative constraints. Do not bake copy into the image prompt unless explicitly requested.

RETURN JSON ONLY.`;

function parseJson(text){
  const cleaned=String(text||"").replace(/```json|```/g,"").trim();
  try{return JSON.parse(cleaned)}catch{}
  const start=cleaned.search(/[\[{]/); if(start<0)throw new Error("Qwen returned invalid JSON");
  const open=cleaned[start]; const close=open==="{"?"}":"]";
  let depth=0,inString=false,escaped=false;
  for(let i=start;i<cleaned.length;i++){
    const c=cleaned[i];
    if(inString){if(escaped)escaped=false;else if(c==="\\")escaped=true;else if(c==='"')inString=false;continue;}
    if(c==='"')inString=true; else if(c===open)depth++; else if(c===close){depth--;if(depth===0)return JSON.parse(cleaned.slice(start,i+1));}
  }
  throw new Error("Qwen returned incomplete JSON");
}

async function createJob({title,systemPrompt,userPrompt}){
  const {data,error}=await supabase.from("local_ai_jobs").insert({
    title,job_type:"social_caption_intelligence",model:"mlx-community/Qwen3-8B-4bit",persona_id:"cornerstone_track_a_social",
    system_prompt:systemPrompt,user_prompt:userPrompt,options:{max_tokens:12000,temperature:.55},status:"queued",production_status:"not_started"
  }).select("id").single();
  if(error)throw error; return data.id;
}

async function waitForJob(id,setStatus){
  const deadline=Date.now()+20*60*1000;
  while(Date.now()<deadline){
    await new Promise(r=>setTimeout(r,3500));
    const {data,error}=await supabase.from("local_ai_jobs").select("status,result,error_message,production_status").eq("id",id).maybeSingle();
    if(error)throw error;
    if(data?.status==="completed")return data.result||"";
    if(data?.status==="error")throw new Error(data.error_message||"Qwen failed");
    setStatus(`Qwen is researching current signals and shaping the batch… ${data?.status||"queued"}`);
  }
  throw new Error("Qwen timed out. Make sure the local Qwen worker is running.");
}

export default function TrackASocialWorkspaceV2(){
  const [platform,setPlatform]=useState("LinkedIn"),[audience,setAudience]=useState(AUDIENCES[0]),[format,setFormat]=useState(FORMATS[0]),[goal,setGoal]=useState(GOALS[0]),[count,setCount]=useState("5"),[direction,setDirection]=useState(""),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[status,setStatus]=useState("");
  async function generate(){
    setBusy(true);setResult(null);setStatus("Qwen is selecting the strongest opportunities…");
    try{
      const user=`PLATFORM: ${platform}\nBUYER ROLE: ${audience}\nFORMAT: ${format}\nGOAL: ${goal}\nVARIATIONS: ${count}\nEXTRA DIRECTION: ${direction||"None — make the strongest strategic choices."}\n\nFresh research is required before selection. Use current public signals across Instagram, TikTok, Reddit and current business/creator trend coverage, then adapt the useful mechanism to the selected dealership audience. The selected platform is the final publishing surface. Never claim that public trend evidence is private performance analytics.\n\nReturn exactly {"concepts":[{"id":"A1","format":"","platform":"${platform}","buyer":"${audience}","emotional_trigger":"","status_quo_problem":"","hook":"","retention_mechanism":"","core_insight":"","proof_angle":"","authority_reason":"","save_share_reason":"","comment_trigger":"","cta":"","post_text":"","caption":"","on_image_copy":"","carousel_slides":[{"slide":1,"purpose":"","copy":"","image_json_prompt":""}],"image_generation_prompts":[{"shot":1,"purpose":"","json_prompt":"","on_image_caption":""}],"video_json_prompt":"","production_notes":"","why_this_should_work":"","quality_gate":"PASS"}]}\n\nFor LinkedIn and X, post_text may be the main post or thread. For Instagram, Facebook, TikTok and YouTube Shorts, include native caption. Keep humour human and restrained. Never invent proof. If proof is absent, frame the idea as an observation, workflow diagnosis or controlled test.`;
      const id=await createJob({title:`Track A Social · ${platform} · ${audience} · ${format}`,systemPrompt:SYSTEM,userPrompt:user});
      const parsed=parseJson(await waitForJob(id,setStatus));
      setResult(parsed);setStatus("Batch ready. Review before publishing.");
    }catch(error){setStatus(error?.message||String(error));}finally{setBusy(false);}
  }
  const copy=(value)=>{navigator.clipboard?.writeText(String(value||""));setStatus("Copied.");};
  return <div style={styles.page}><div style={styles.shell}><div style={styles.eyebrow}>TRACK A / CORNERSTONE AI GROUP</div><div style={styles.hero}><div><h1 style={styles.h1}>Build attention with dealers.</h1><p style={styles.muted}>Research first. Adapt proven formats. Sound like someone who has actually worked on a dealer floor.</p></div><div style={styles.badge}>QWEN · MARKET DIRECTOR<div style={styles.badgeSub}>Evidence first · human voice</div></div></div><div style={styles.source}><div style={styles.sectionTitle}>Commercial source of truth</div><div style={styles.grid}>{[["Problem",DNA.proposition],["Buyer",DNA.buyer],["Outcome",DNA.outcomes.join(" • ")],["Path",DNA.path],["Proof",DNA.proof],["Trust",DNA.trust]].map(([a,b])=><div key={a} style={styles.info}><b>{a}</b><div style={styles.small}>{b}</div></div>)}</div></div><div style={styles.layout}><aside style={styles.card}><div style={styles.sectionTitle}>Creative brief</div>{[["Platform",platform,setPlatform,PLATFORMS],["Buyer",audience,setAudience,AUDIENCES],["Format",format,setFormat,FORMATS],["Goal",goal,setGoal,GOALS]].map(([label,value,setValue,options])=><label key={label} style={styles.label}>{label}<select value={value} onChange={e=>setValue(e.target.value)} style={styles.input}>{options.map(x=><option key={x}>{x}</option>)}</select></label>)}<label style={styles.label}>Batch<select value={count} onChange={e=>setCount(e.target.value)} style={styles.input}><option value="3">3 concepts</option><option value="5">5 concepts</option><option value="10">10 concepts</option></select></label><textarea value={direction} onChange={e=>setDirection(e.target.value)} placeholder="Optional dealer problem, objection, reference format, campaign or observation…" rows={6} style={styles.textarea}/><button disabled={busy} onClick={generate} style={styles.primary}>{busy?"Qwen is thinking…":"Generate Track A batch"}</button><div style={styles.quality}><b>Qwen checks</b><span>Fresh market research</span><span>Format adaptation</span><span>Dealer psychology</span><span>Human voice + banter</span><span>Claims / proof gate</span></div><div style={styles.status}>{status}</div></aside><main>{!result?<div style={styles.empty}><div style={styles.orbit}>✦</div><h2 style={{margin:"0 0 8px"}}>Ready for the next market signal.</h2><p style={styles.muted}>Choose the buyer and surface. Qwen does the strategic work first, then hands you the production package.</p></div>:<div style={{display:"grid",gap:14}}>{(result.concepts||[]).map((c,i)=><article key={c.id||i} style={styles.card}><div style={styles.topline}><div><div style={styles.kicker}>Concept {i+1} · {c.platform} · {c.buyer}</div><h2 style={styles.concept}>{c.hook}</h2></div><button onClick={()=>copy(JSON.stringify(c,null,2))} style={styles.copy}>Copy JSON</button></div><div style={styles.grid4}><div><b>Emotion</b><div style={styles.small}>{c.emotional_trigger}</div></div><div><b>Retention</b><div style={styles.small}>{c.retention_mechanism}</div></div><div><b>Authority</b><div style={styles.small}>{c.authority_reason}</div></div><div><b>Share/save</b><div style={styles.small}>{c.save_share_reason}</div></div></div><div style={styles.two}><div style={styles.output}><div style={styles.kicker}>Post</div>{c.post_text||c.caption}</div><div style={styles.output}><div style={styles.kicker}>Core insight</div>{c.core_insight}<br/><br/><b>CTA:</b> {c.cta}</div></div><details><summary style={styles.summary}>Production package</summary><div style={styles.production}><div><b>On-image copy</b><div>{c.on_image_copy||"—"}</div></div>{(c.carousel_slides||[]).map(sl=><div key={`sl-${sl.slide}`} style={styles.prompt}><b>Slide {sl.slide}</b><div>{sl.copy}</div><pre>{sl.image_json_prompt}</pre></div>)}{(c.image_generation_prompts||[]).map(sh=><div key={`sh-${sh.shot}`} style={styles.prompt}><b>Shot {sh.shot}</b><div>{sh.on_image_caption||""}</div><pre>{sh.json_prompt}</pre></div>)}{c.video_json_prompt&&<div style={styles.prompt}><b>Video JSON</b><pre>{c.video_json_prompt}</pre></div>}<div><b>Why it should work</b><div style={styles.small}>{c.why_this_should_work}</div></div></div></details></article>)}{result.research&&<details style={styles.research}><summary style={styles.summary}>Research used</summary><div style={styles.small}>Confidence: {result.research.confidence} · {result.research.evidence?.length||0} evidence records · {result.research.windowDays}-day window.</div>{(result.research.limitations||[]).map((x,i)=><div key={i} style={styles.small}>• {x}</div>)}</details>}</div>}</main></div></div></div>;
}

const styles={page:{minHeight:"100vh",background:"#080a0f",color:"#fff",padding:24},shell:{maxWidth:1400,margin:"0 auto"},eyebrow:{fontSize:11,color:"#d4af37",fontWeight:950,letterSpacing:".14em"},hero:{display:"flex",justifyContent:"space-between",gap:24,alignItems:"flex-start",padding:"14px 0 18px"},h1:{fontSize:38,lineHeight:1.05,letterSpacing:"-.04em",margin:"0 0 8px"},muted:{color:"#9ca6b6",lineHeight:1.6},badge:{padding:"10px 13px",border:"1px solid #6b5522",borderRadius:14,color:"#e6c85a",fontWeight:900,fontSize:11,textAlign:"right"},badgeSub:{color:"#8f99a9",fontWeight:700,marginTop:5},source:{background:"#10141d",border:"1px solid #242b37",borderRadius:18,padding:16,marginBottom:14},sourceTitle:{fontSize:11,color:"#d4af37",fontWeight:900,letterSpacing:".12em",textTransform:"uppercase",marginBottom:10},layout:{display:"grid",gridTemplateColumns:"320px minmax(0,1fr)",gap:14,alignItems:"start"},card:{background:"#10141d",border:"1px solid #242b37",borderRadius:18,padding:16},grid:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10},grid4:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginTop:12},info:{background:"#0c1017",border:"1px solid #202633",borderRadius:12,padding:11},small:{fontSize:12,color:"#b5bdcb",lineHeight:1.55,marginTop:4},sectionTitle:{fontSize:11,color:"#d4af37",fontWeight:950,letterSpacing:".12em",textTransform:"uppercase",marginBottom:12},label:{display:"grid",gap:5,fontSize:11,color:"#98a2b4",marginBottom:9},input:{width:"100%",background:"#0b0f15",border:"1px solid #303847",color:"#fff",borderRadius:10,padding:"10px 11px"},textarea:{width:"100%",boxSizing:"border-box",background:"#0b0f15",border:"1px solid #303847",color:"#fff",borderRadius:10,padding:11,resize:"vertical",marginTop:4},primary:{width:"100%",marginTop:10,background:"linear-gradient(135deg,#e0bf52,#ad8330)",border:0,borderRadius:11,padding:"12px 14px",fontWeight:950,color:"#171207",cursor:"pointer"},quality:{display:"grid",gap:6,marginTop:12,fontSize:11,color:"#8f99a9"},status:{fontSize:11,color:"#aab2c0",marginTop:10,lineHeight:1.5},empty:{minHeight:520,display:"grid",placeItems:"center",textAlign:"center",padding:40,border:"1px solid #242b37",borderRadius:18,background:"radial-gradient(circle at 50% 25%,rgba(212,175,55,.08),transparent 55%),#10141d"},orbit:{fontSize:28,color:"#d4af37",marginBottom:8},topline:{display:"flex",justifyContent:"space-between",gap:20,alignItems:"flex-start"},kicker:{fontSize:10,color:"#d4af37",fontWeight:900,letterSpacing:".11em",textTransform:"uppercase"},concept:{fontSize:24,lineHeight:1.2,margin:"5px 0 0",letterSpacing:"-.03em"},copy:{background:"transparent",border:"1px solid #57491e",color:"#d9bd57",borderRadius:8,padding:"7px 9px",cursor:"pointer"},two:{display:"grid",gridTemplateColumns:"1.2fr .8fr",gap:10,marginTop:12},output:{background:"#0b0f15",border:"1px solid #202633",borderRadius:12,padding:12,lineHeight:1.6,whiteSpace:"pre-wrap",fontSize:13},summary:{cursor:"pointer",color:"#d4af37",fontWeight:900,fontSize:11,letterSpacing:".08em",textTransform:"uppercase"},production:{display:"grid",gap:10,marginTop:12},prompt:{background:"#0b0f15",border:"1px solid #202633",borderRadius:10,padding:10},research:{background:"#10141d",border:"1px solid #242b37",borderRadius:18,padding:14},pre:{whiteSpace:"pre-wrap",overflowX:"auto",fontSize:11,color:"#d8dde7",marginTop:8}};
