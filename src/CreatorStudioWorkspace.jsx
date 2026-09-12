import React,{useEffect,useMemo,useState} from 'react'
import {supabase} from './supabase'

const CREATORS=[
  {id:'cara',name:'Cara',tone:'Direct, dry, disciplined'},
  {id:'lila',name:'Lila',tone:'Warm, observant, understated'},
  {id:'cara_lila',name:'Cara + Lila',tone:'Contrast, chemistry, two voices'},
]
const PLATFORMS=['TikTok','Instagram','YouTube','Fanvue','Multi-platform']
const OBJECTIVES=['Content creation','TikTok Shop','Affiliate offers','Fanvue / subscriber content','Sponsorships','Audience growth']
const FORMATS=['POV / relatable','Story / confession','GRWM','Day in the life','Reaction','Product / UGC','Photo carousel','Talking-to-camera','Duo interaction']
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const clean=v=>String(v??'').trim()

function parseJson(text){
 const value=clean(text).replace(/```json|```/gi,'').replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/<analysis>[\s\S]*?<\/analysis>/gi,'').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi,'').replace(/<\|im_end\|>|<\|endoftext\|>/gi,'').trim()
 try{return JSON.parse(value)}catch{}
 const start=value.search(/[\[{]/);if(start<0)return{raw:value}
 const open=value[start],close=open==='{'?'}':']';let depth=0,quoted=false,escaped=false
 for(let i=start;i<value.length;i++){const c=value[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}if(c==='"')quoted=true;else if(c===open)depth++;else if(c===close&&--depth===0){try{return JSON.parse(value.slice(start,i+1))}catch{break}}}
 return{raw:value}
}

async function readUser(){const {data,error}=await supabase.auth.getUser();if(error||!data?.user)throw new Error('Please sign in again.');return data.user}
async function jobStatus(id){const r=await fetch(`/api/queue-update?action=job_status&id=${encodeURIComponent(id)}`,{credentials:'same-origin',cache:'no-store'});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Could not read job status.');return b}
async function waitJob(id,setMessage,label){const until=Date.now()+45*60*1000;let last='';while(Date.now()<until){const j=await jobStatus(id);if(j.status!==last){last=j.status;setMessage(j.status==='processing'?`${label} is being analysed…`:`${label} is ${j.status}…`)}if(j.status==='completed')return j;if(j.status==='error')throw new Error(j.error_message||`${label} failed.`);await sleep(2500)}throw new Error(`${label} took too long. Check System.`)}

function validCreatorUrl(raw){
 try{
  const u=new URL(raw);const host=u.hostname.toLowerCase().replace(/^www\./,'')
  const ok=['youtube.com','m.youtube.com','youtu.be','youtube-nocookie.com','tiktok.com','instagram.com'].includes(host)
  return ok?u.toString():null
 }catch{return null}
}

export default function CreatorStudioWorkspace({onAdvance}={}){
 const [creator,setCreator]=useState('cara')
 const [platform,setPlatform]=useState('TikTok')
 const [objective,setObjective]=useState('Content creation')
 const [format,setFormat]=useState('POV / relatable')
 const [direction,setDirection]=useState('')
 const [referenceUrl,setReferenceUrl]=useState('')
 const [result,setResult]=useState(null)
 const [jobs,setJobs]=useState([])
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [error,setError]=useState('')
 const selected=useMemo(()=>CREATORS.find(x=>x.id===creator)||CREATORS[0],[creator])

 async function load(){
  const u=await readUser();const {data,error:loadError}=await supabase.from('local_ai_jobs').select('id,title,status,created_at,persona_id,job_type,options').eq('owner_id',u.id).in('persona_id',['cara','lila','cara_lila']).order('created_at',{ascending:false}).limit(30)
  if(loadError)throw loadError;setJobs(data||[])
 }
 useEffect(()=>{load().catch(e=>setError(e?.message||String(e)))},[])

 async function build(){
  setBusy(true);setError('');setResult(null);setMessage('Preparing creator intelligence…')
  try{
   const u=await readUser();let sourceEvidence=null;const source=referenceUrl.trim()?validCreatorUrl(referenceUrl.trim()):null
   if(referenceUrl.trim()&&!source)throw new Error('Reference must be a public YouTube, TikTok or Instagram URL.')

   if(source){
    setMessage('Acquiring the creator reference…')
    const {data:sourceJob,error:sourceError}=await supabase.from('local_ai_jobs').insert({
     owner_id:u.id,title:`${selected.name} reference · ${platform}`,job_type:'creator_source_ingestion',model:'mlx-community/Qwen3-8B-4bit',persona_id:creator,
     system_prompt:`Acquire one public reference for ${selected.name}. Download it for local transcript and visual inspection. Never claim inspection before the media pipeline completes.`,
     user_prompt:`Acquire and inspect this public ${platform} creator reference for ${selected.name}: ${source}`,
     options:{source_url:source,original_url:source,research_domain:'TRACK_B_CREATOR_GROWTH',workspace_id:'creator_growth',creator_id:creator,platform,objective},status:'queued',production_status:'creator_source_queued'
    }).select('id').single()
    if(sourceError||!sourceJob?.id)throw sourceError||new Error('Could not queue the creator reference.')
    const acquisition=await waitJob(sourceJob.id,setMessage,'Creator source acquisition');const ar=parseJson(acquisition.result)
    if(!ar.media_job_id)throw new Error('Reference download completed without a media inspection job.')
    const media=await waitJob(ar.media_job_id,setMessage,'Video inspection');const mr=parseJson(media.result)
    if(!mr.text_analysis_job_id)throw new Error('Video inspection completed without source intelligence.')
    const analysisJob=await waitJob(mr.text_analysis_job_id,setMessage,'Source intelligence');const analysis=parseJson(analysisJob.result)
    sourceEvidence={acquisition:ar,media:mr,analysis}
   }

   setMessage('Building the creator package…')
   const prompt=[
    `CREATOR: ${selected.name}`,
    `PERSONA_ID: ${creator}`,
    `PLATFORM: ${platform}`,
    `OBJECTIVE: ${objective}`,
    `FORMAT: ${format}`,
    `REFERENCE URL: ${source||'None'}`,
    `DIRECTION: ${direction.trim()||'Choose the strongest opportunity from creator source-of-truth and fresh public evidence.'}`,
    '',
    'This is an owned creator business job, not generic social media advice.',
    'Use the selected creator character source of truth as a hard identity constraint.',
    'Use current public creator research to identify useful format mechanisms and commercial patterns. Distinguish observed evidence from inference.',
    'Create a complete publishable package: ranked concepts, hook options, opening beat, actual content or spoken lines where appropriate, shot/visual direction, caption, CTA, hashtags, repurposing, KPI, winner rule and next experiment.',
    'For TikTok Shop: build useful product-led content, buyer problem/solution, demo structure, native CTA and a measurable click/cart/purchase test. Never invent product facts, prices, commissions or results.',
    'For Affiliate offers: build useful recommendation content, natural product bridge, disclosure/CTA placement and a measurable click/conversion test. Never invent commission rates or earnings.',
    'For Fanvue / subscriber content: build non-explicit creator-owned premium content, teasers, positioning, retention and a measurable conversion test. Never invent audience behaviour or revenue.',
    'For YouTube: build a standalone concept plus Shorts derivatives. For TikTok/Instagram: prioritise first frame, retention, pacing and repeatability.',
    sourceEvidence?`\nINSPECTED SOURCE EVIDENCE:\n${JSON.stringify(sourceEvidence.analysis)}`:'',
    'Return JSON with operator_brief, creator_research and production_package. creator_research should include comparable patterns, source URLs when available, observable signals, what to adapt and what to ignore.'
   ].join('\n')

   const {data:job,error:jobError}=await supabase.from('local_ai_jobs').insert({
    owner_id:u.id,title:`${selected.name} · ${platform} · ${objective}`,job_type:'content_engine',model:'mlx-community/Qwen3-8B-4bit',persona_id:creator,
    system_prompt:`You are Cornerstone's creator-business director for ${selected.name}. Protect creator identity and build platform-native work. Use current creator-growth research and inspect supplied source evidence where available. Never invent metrics or commercial claims. Never generate explicit sexual content.`,
    user_prompt:prompt,
    options:{research:true,max_tokens:6500,temperature:.42,research_domain:'TRACK_B_CREATOR_GROWTH',workspace_id:'creator_growth',creator_id:creator,platform,objective,format,reference_url:source||null,source_analysis:sourceEvidence},
    status:'queued',production_status:'creator_package_queued'
   }).select('id').single()
   if(jobError||!job?.id)throw jobError||new Error('Could not queue creator package.')
   const completed=await waitJob(job.id,setMessage,'Creator package');setResult(parseJson(completed.result));setMessage('Creator package ready.');await load()
  }catch(e){setError(e?.message||String(e));setMessage('')}finally{setBusy(false)}
 }

 const pkg=result?.production_package||result?.package||result||{};const brief=result?.operator_brief||{};const concepts=Array.isArray(pkg.concepts)?pkg.concepts:Array.isArray(pkg.ideas)?pkg.ideas:Array.isArray(pkg.opportunities)?pkg.opportunities:[];const research=Array.isArray(result?.creator_research)?result.creator_research:[]

 return <main className="creator-studio"><style>{`
 .creator-studio{color:var(--text);font-family:var(--sans)}.cs-head{padding:8px 0 30px;border-bottom:1px solid var(--border)}.cs-k{font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}.cs-title{margin:8px 0 0;font-size:clamp(40px,5.6vw,72px);line-height:.92;letter-spacing:-.06em;max-width:850px}.cs-copy{margin:12px 0 0;max-width:780px;color:var(--text-muted);font-size:14px;line-height:1.65}.cs-roster{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}.cs-person{position:relative;min-height:155px;padding:18px;border:1px solid var(--border);border-radius:14px;background:var(--surface);text-align:left;color:var(--text);cursor:pointer}.cs-person.active{border-color:var(--accent)}.cs-person:before{content:"";position:absolute;left:0;top:0;width:100%;height:3px;background:var(--border-strong)}.cs-person.active:before{background:var(--accent)}.cs-num{font-size:9px;color:var(--text-subtle)}.cs-name{margin-top:28px;font-size:30px;font-weight:850;letter-spacing:-.05em}.cs-tone{margin-top:9px;color:var(--text-muted);font-size:10px}.cs-work{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;margin-top:14px}.cs-card{padding:20px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}.cs-card h2{margin:7px 0 0;font-size:25px;letter-spacing:-.04em}.cs-label{font-size:9px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:var(--text-subtle)}.cs-fields{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:15px}.cs-field{display:grid;gap:7px}.cs-field.full{grid-column:1/-1}.cs-field label{font-size:9px;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:var(--text-subtle)}.cs-field input,.cs-field select,.cs-field textarea{width:100%;padding:11px 12px;border:1px solid var(--border-strong);border-radius:8px;background:var(--panel-2);color:var(--text);font:inherit;font-size:11px;outline:none}.cs-field textarea{min-height:120px;resize:vertical;line-height:1.5}.cs-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.cs-btn{min-height:44px;padding:0 15px;border:0;border-radius:8px;background:var(--accent);color:#1a0f0c;font-size:11px;font-weight:900;cursor:pointer}.cs-btn:disabled{opacity:.45}.cs-btn.alt{background:transparent;border:1px solid var(--line-2);color:var(--text)}.cs-preview{background:var(--panel-2)}.cs-preview h3{margin:7px 0 0;font-size:31px;letter-spacing:-.05em}.cs-preview p{margin-top:9px;color:var(--text-2);font-size:11px;line-height:1.6}.cs-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:15px}.cs-chip{padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text-muted);font-size:9px}.cs-error{margin-top:11px;color:var(--bad);font-size:10px}.cs-status{margin-top:9px;color:var(--text-muted);font-size:10px}.cs-result{margin-top:14px;display:grid;gap:11px}.cs-result-main{padding:18px;border:1px solid var(--accent-line);border-radius:14px;background:var(--accent-soft)}.cs-result-main h2{margin:7px 0 0;font-size:28px;letter-spacing:-.04em}.cs-result-main p{margin-top:8px;color:var(--text-2);font-size:12px;line-height:1.55}.cs-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.cs-item{padding:13px;border:1px solid var(--border);border-radius:10px;background:var(--surface)}.cs-item b{font-size:11px}.cs-item span{display:block;margin-top:4px;color:var(--text-muted);font-size:10px;line-height:1.45}.cs-list{display:grid;gap:7px;margin-top:10px}.cs-research{padding:12px;border:1px solid var(--border);border-radius:9px;background:var(--panel-2)}.cs-research strong{font-size:10px}.cs-research span{display:block;margin-top:4px;color:var(--text-muted);font-size:9px;line-height:1.45}.cs-history{margin-top:18px;padding-top:18px;border-top:1px solid var(--border)}.cs-history-head{display:flex;justify-content:space-between}.cs-history-head strong{font-size:13px}.cs-history-head span{font-size:9px;color:var(--text-subtle)}.cs-jobs{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:10px}.cs-job{padding:11px;border:1px solid var(--border);border-radius:9px;background:var(--surface)}.cs-job strong{font-size:10px}.cs-job span{display:block;margin-top:4px;color:var(--text-muted);font-size:9px}
 @media(max-width:850px){.cs-roster,.cs-work,.cs-grid{grid-template-columns:1fr}.cs-fields{grid-template-columns:1fr}.cs-field.full{grid-column:auto}.cs-jobs{grid-template-columns:1fr}}
 `}</style>
 <header className="cs-head"><div className="cs-k">Voices · Creator business</div><h1 className="cs-title">Give Cara and Lila the same intelligence engine as YouTube.</h1><p className="cs-copy">The destination changes. The engine does not. Study winning content, understand the mechanism, make original work, test TikTok Shop and affiliates, build Fanvue funnels, grow the audience and learn from every result.</p></header>
 <section className="cs-roster">{CREATORS.map((p,i)=><button key={p.id} className={`cs-person${creator===p.id?' active':''}`} onClick={()=>setCreator(p.id)}><div className="cs-num">0{i+1}</div><div className="cs-name">{p.name}</div><div className="cs-tone">{p.tone}</div></button>)}</section>
 {!result?<section className="cs-work"><div className="cs-card"><div className="cs-label">Experiment</div><h2>What should {selected.name} test next?</h2><div className="cs-fields"><div className="cs-field"><label>Platform</label><select value={platform} onChange={e=>setPlatform(e.target.value)}>{PLATFORMS.map(x=><option key={x}>{x}</option>)}</select></div><div className="cs-field"><label>Objective</label><select value={objective} onChange={e=>setObjective(e.target.value)}>{OBJECTIVES.map(x=><option key={x}>{x}</option>)}</select></div><div className="cs-field"><label>Format</label><select value={format} onChange={e=>setFormat(e.target.value)}>{FORMATS.map(x=><option key={x}>{x}</option>)}</select></div><div className="cs-field"><label>Reference</label><input value={referenceUrl} onChange={e=>setReferenceUrl(e.target.value)} placeholder="YouTube, TikTok or Instagram URL"/></div><div className="cs-field full"><label>Direction</label><textarea value={direction} onChange={e=>setDirection(e.target.value)} placeholder="Product, idea, trend, story, comment, offer or experiment worth testing…"/></div></div>{error?<div className="cs-error">{error}</div>:null}<div className="cs-actions"><button className="cs-btn" disabled={busy} onClick={build}>{busy?'Building…':'Build creator package →'}</button><button className="cs-btn alt" onClick={()=>{if(typeof onAdvance==='function')onAdvance();else window.location.href='/content/profiles'}}>Continue to Channels →</button></div>{message?<div className="cs-status">{message}</div>:null}</div><aside className="cs-card cs-preview"><div className="cs-label">Selected asset</div><h3>{selected.name}</h3><p>{selected.tone}. The creator bible remains the identity source of truth while Cornerstone brings in platform, trend and monetisation intelligence.</p><div className="cs-chips">{PLATFORMS.map(x=><span className="cs-chip" key={x}>{x}</span>)}</div></aside></section>:<section className="cs-result"><div className="cs-result-main"><div className="cs-label">Creator package ready</div><h2>{selected.name} · {platform}</h2><p>{brief.finding||pkg.idea||pkg.concept||pkg.angle||'Cornerstone built an original package from the selected creator, platform and evidence.'}</p></div>{brief.next_action?<section className="cs-card"><div className="cs-label">Next action</div><p style={{marginTop:8,fontSize:14,lineHeight:1.5}}>{brief.next_action}</p></section>:null}{concepts.length?<section className="cs-card"><div className="cs-label">Ranked opportunities</div><div className="cs-list">{concepts.slice(0,8).map((x,i)=><div className="cs-item" key={i}><b>{typeof x==='string'?x:x?.title||x?.concept||x?.name||`Opportunity ${i+1}`}</b>{x?.why||x?.hook||x?.angle?<span>{x?.why||x?.hook||x?.angle}</span>:null}</div>)}</div></section>:null}{research.length?<section className="cs-card"><div className="cs-label">Research Cornerstone used</div><div className="cs-list">{research.slice(0,6).map((x,i)=><div className="cs-research" key={i}><strong>{x?.title||x?.source||`Signal ${i+1}`}</strong><span>{x?.observable_signal||x?.signal||x?.mechanism||x?.use||x?.what_to_adapt||'Public creator signal'}</span></div>)}</div></section>:null}<div className="cs-actions"><button className="cs-btn alt" onClick={()=>setResult(null)}>Build another</button></div></section>}
 <section className="cs-history"><div className="cs-history-head"><strong>Recent creator work</strong><span>{jobs.length} jobs</span></div><div className="cs-jobs">{jobs.slice(0,10).map(j=><div className="cs-job" key={j.id}><strong>{j.title}</strong><span>{j.persona_id} · {j.status} · {new Date(j.created_at).toLocaleDateString('en-GB')}</span></div>)}</div></section>
 </main>
}
