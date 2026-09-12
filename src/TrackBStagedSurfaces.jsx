import React,{useEffect,useMemo,useState} from 'react'
import {supabase} from './supabase'

const PERSONAS=[
  {id:'cara',name:'Cara',tone:'Direct, dry, disciplined',tag:'Sharper takes'},
  {id:'lila',name:'Lila',tone:'Warm, observant, understated',tag:'Quietly personal'},
  {id:'cara_lila',name:'Cara + Lila',tone:'Contrast, chemistry, two voices',tag:'Built for interaction'},
]
const PLATFORMS=['TikTok','Instagram','YouTube','Fanvue']
const OBJECTIVES=['Grow audience','Create content','Test monetisation','Drive clicks / sales','Build a repeatable series']
const MONETISATION=['None / audience first','TikTok Shop','Affiliate offer','Fanvue','Brand / sponsorship','YouTube monetisation','Product / digital offer']
const FORMATS=['Personal moment','POV / relatable','Quick take','Micro-story','GRWM','Day in the life','Photo slideshow','Reaction','Product-led demo','Story + recommendation','Talking-head','Storytime']
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const clean=v=>String(v??'').trim()
function parseJson(text){const value=clean(text).replace(/```json|```/gi,'').replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/<analysis>[\s\S]*?<\/analysis>/gi,'').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi,'').replace(/<\|im_end\|>|<\|endoftext\|>/gi,'').trim();try{return JSON.parse(value)}catch{}const start=value.search(/[\[{]/);if(start<0)throw new Error('Cornerstone could not understand the creator package.');const open=value[start],close=open==='{'?'}':']';let depth=0,quoted=false,escaped=false;for(let i=start;i<value.length;i+=1){const c=value[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}if(c==='"')quoted=true;else if(c===open)depth++;else if(c===close&&--depth===0)return JSON.parse(value.slice(start,i+1))}throw new Error('Cornerstone returned an incomplete creator package.')}
async function readUser(){const{data,error}=await supabase.auth.getUser();if(error||!data?.user)throw new Error('Please sign in again.');return data.user}
async function jobStatus(id){const{data,error}=await supabase.from('local_ai_jobs').select('id,status,error_message,result').eq('id',id).maybeSingle();if(error)throw error;if(!data)throw new Error('Creator job disappeared.');return data}
async function waitJob(id,setMessage,label){const until=Date.now()+45*60*1000;let last='';while(Date.now()<until){const job=await jobStatus(id);if(job.status!==last){last=job.status;setMessage(job.status==='processing'?`${label} is working…`:job.status==='completed'?`${label} complete.`:`${label} is ${job.status}…`)}if(job.status==='completed')return job;if(job.status==='error')throw new Error(job.error_message||`${label} failed.`);await sleep(2500)}throw new Error(`${label} took too long. Check System.`)}

export function CreatorsStaged({onAdvance}={}){
 const[persona,setPersona]=useState('cara')
 const[platform,setPlatform]=useState('TikTok')
 const[objective,setObjective]=useState('Create content')
 const[monetisation,setMonetisation]=useState('None / audience first')
 const[format,setFormat]=useState('Personal moment')
 const[direction,setDirection]=useState('')
 const[referenceUrl,setReferenceUrl]=useState('')
 const[jobs,setJobs]=useState([])
 const[busy,setBusy]=useState(false)
 const[message,setMessage]=useState('')
 const[result,setResult]=useState(null)
 const selected=PERSONAS.find(x=>x.id===persona)||PERSONAS[0]

 async function load(){const user=await readUser();const{data,error}=await supabase.from('local_ai_jobs').select('id,title,status,created_at,persona_id,job_type,options,result').eq('owner_id',user.id).in('persona_id',['cara','lila','cara_lila','duo']).order('created_at',{ascending:false}).limit(30);if(error)throw error;setJobs(data||[])}
 useEffect(()=>{load().catch(e=>setMessage(e?.message||String(e)))},[])
 const counts=useMemo(()=>PERSONAS.reduce((a,p)=>(a[p.id]=jobs.filter(j=>j.persona_id===p.id).length,a),{}),[jobs])

 async function queue(){
  setBusy(true);setMessage('Preparing creator intelligence…');setResult(null)
  try{
   const user=await readUser();
   let sourceEvidence=null
   if(referenceUrl.trim()){
    let sourceUrl
    try{sourceUrl=new URL(referenceUrl.trim())}catch{throw new Error('Reference must be a valid YouTube, TikTok or Instagram URL.')}
    const host=sourceUrl.hostname.toLowerCase().replace(/^www\./,'')
    if(!['youtube.com','m.youtube.com','youtu.be','youtube-nocookie.com','tiktok.com','instagram.com'].includes(host))throw new Error('Reference must be a public YouTube, TikTok or Instagram URL.')
    setMessage('Acquiring the creator reference…')
    const{data:sourceJob,error:sourceError}=await supabase.from('local_ai_jobs').insert({
      owner_id:user.id,title:`Creator source · ${selected.name} · ${platform}`,job_type:'creator_source_ingestion',model:'mlx-community/Qwen3-8B-4bit',persona_id:persona,
      system_prompt:'Acquire one public creator reference for local media inspection. Protect creator identity. Never claim source analysis before transcript and visual analysis complete.',
      user_prompt:`Acquire and inspect this public ${platform} reference for ${selected.name}: ${sourceUrl.toString()}`,
      options:{source_url:sourceUrl.toString(),original_url:sourceUrl.toString(),platform,creator_id:persona,research_domain:'TRACK_B_CREATOR_GROWTH',workspace_id:'track_b'},
      status:'queued',production_status:'creator_source_queued'
    }).select('id').single()
    if(sourceError||!sourceJob?.id)throw sourceError||new Error('Could not queue creator source.')
    const acquisition=await waitJob(sourceJob.id,setMessage,'Creator reference acquisition')
    const acquired=parseJson(acquisition.result||'{}')
    if(!acquired.media_job_id)throw new Error('Creator reference downloaded without an inspection job.')
    const media=await waitJob(acquired.media_job_id,setMessage,'Creator reference inspection')
    const mediaResult=parseJson(media.result||'{}')
    if(!mediaResult.text_analysis_job_id)throw new Error('Creator reference inspection produced no source-analysis job.')
    const analysisJob=await waitJob(mediaResult.text_analysis_job_id,setMessage,'Creator source intelligence')
    sourceEvidence={acquisition:acquired,media:mediaResult,analysis:parseJson(analysisJob.result||'{}')}
   }

   setMessage('Researching and building the creator package…')
   const sourceBlock=sourceEvidence?`\n\nINSPECTED SOURCE EVIDENCE\n${JSON.stringify(sourceEvidence)}\n\nUse this as mechanism evidence only. Never copy exact wording, identity, branding, scenes, footage, thumbnail or distinctive execution.`:''
   const prompt=[
    `CREATOR: ${selected.name}`,
    `PLATFORM: ${platform}`,
    `OBJECTIVE: ${objective}`,
    `MONETISATION OBJECTIVE: ${monetisation}`,
    `FORMAT: ${format}`,
    `REFERENCE URL: ${referenceUrl.trim()||'None'}`,
    `DIRECTION: ${direction.trim()||'Choose the strongest evidence-supported opportunity for this creator.'}`,
    '',
    'Build a practical, platform-native package for this owned creator asset.',
    'Use the creator bible as hard identity context.',
    'Include ranked concepts, strongest hook, opening beat, outline, shot list, spoken lines where appropriate, caption, CTA, visual direction, repurposing plan, KPI, monetisation route, monetisation test and next experiment.',
    'For TikTok Shop: useful creator content first, then integrate the product naturally. Do not invent product facts, commissions or results.',
    'For Affiliate offer: make the content earn the click before asking for the sale. Do not invent offer claims or conversion results.',
    'For Fanvue: make the strategy specific to the supplied creator context and monetisation objective. Do not invent private facts, audience behaviour or revenue.',
    'For YouTube: build a strong standalone concept and a short-form derivative plan.',
    'For TikTok and Instagram: prioritise first-frame behaviour, native pacing, retention and repeatability.',
    'Use only claims supported by supplied context or current public research.',
   ].join('\n')+sourceBlock

   const{data:created,error}=await supabase.from('local_ai_jobs').insert({
    owner_id:user.id,title:`${selected.name} · ${platform} · ${format}`,job_type:'growth_mode',model:'mlx-community/Qwen3-8B-4bit',persona_id:persona,
    system_prompt:'You are Cornerstone Track B creator growth director. Preserve creator identity, platform context and commercial objective. Use current public evidence. Build concrete content experiments. Never invent metrics, audience reactions, product facts or revenue. Return operator-useful JSON.',
    user_prompt:prompt,
    options:{research:true,max_tokens:6500,temperature:.42,research_domain:'TRACK_B_CREATOR_GROWTH',workspace_id:'track_b',creator_id:persona,platform,objective,format,monetisation,reference_url:referenceUrl.trim()||null,source_analysis:sourceEvidence},
    status:'queued',production_status:'creator_package_queued'
   }).select('id').single()
   if(error||!created?.id)throw error||new Error('Could not queue creator package.')
   const job=await waitJob(created.id,setMessage,'Creator package')
   setResult(typeof job.result==='string'?parseJson(job.result):job.result)
   setMessage('Creator package ready.');await load()
  }catch(e){setMessage(e?.message||String(e))}finally{setBusy(false)}
 }

 return <main className="voices"><style>{`.voices{color:var(--text);font-family:var(--sans)}.v-head{display:flex;justify-content:space-between;gap:30px;align-items:flex-end;padding:8px 0 30px;border-bottom:1px solid var(--border)}.v-eyebrow{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}.v-title{margin:8px 0 0;font-size:clamp(38px,5.5vw,68px);line-height:.98;letter-spacing:-.06em;max-width:820px}.v-copy{margin:10px 0 0;max-width:760px;color:var(--text-muted);font-size:14px;line-height:1.6}.v-roster{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px}.v-person{position:relative;min-height:180px;padding:20px;border:1px solid var(--border);border-radius:16px;background:var(--surface);text-align:left;cursor:pointer;overflow:hidden;color:var(--text)}.v-person:before{content:"";position:absolute;left:0;top:0;width:100%;height:4px;background:var(--border-strong)}.v-person.active{border-color:var(--accent)}.v-person.active:before{background:var(--accent)}.v-number{font-size:9px;color:var(--text-subtle);letter-spacing:.12em}.v-name{margin-top:26px;font-size:31px;font-weight:800;letter-spacing:-.05em}.v-tag{margin-top:5px;display:inline-block;padding:5px 8px;border-radius:999px;background:var(--surface-2);font-size:9px;color:var(--text-muted)}.v-tone{margin-top:14px;color:var(--text-muted);font-size:10px}.v-count{position:absolute;right:18px;bottom:17px;font-size:9px;color:var(--text-subtle)}.v-studio{display:grid;grid-template-columns:1.1fr .9fr;gap:16px;margin-top:16px}.v-card{padding:22px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}.v-card h2{margin:7px 0 0;font-size:25px;letter-spacing:-.04em}.v-label{font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--text-subtle)}.v-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.v-field{display:grid;gap:7px}.v-field.full{grid-column:1/-1}.v-field label{font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--text-subtle)}.v-field select,.v-field input,.v-field textarea{width:100%;padding:12px;border:1px solid var(--border-strong);border-radius:10px;background:var(--panel-2);color:var(--text);font:inherit;font-size:11px}.v-field textarea{min-height:120px;resize:vertical;line-height:1.5}.v-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:15px}.v-btn{min-height:46px;padding:0 16px;border:0;border-radius:10px;background:var(--accent);color:#1a0f0c;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.v-btn:disabled{opacity:.45}.v-btn.ghost{background:transparent;border:1px solid var(--line-2);color:var(--text)}.v-preview{background:var(--panel-2)}.v-preview h3{margin:8px 0 0;font-size:32px;letter-spacing:-.05em}.v-preview p{margin-top:10px;color:var(--text-2);font-size:11px;line-height:1.65}.v-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:18px}.v-chip{padding:6px 8px;border:1px solid var(--border);background:var(--surface);border-radius:999px;font-size:9px;color:var(--text-muted)}.v-result{margin-top:16px;padding:18px;border:1px solid var(--accent-line);border-radius:16px;background:var(--accent-soft)}.v-result h3{margin:6px 0 0;font-size:22px}.v-result p{margin:8px 0 0;color:var(--text-2);font-size:12px;line-height:1.55}.v-result pre{margin:12px 0 0;white-space:pre-wrap;max-height:360px;overflow:auto;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--text-2)}.v-message{margin-top:10px;color:var(--text-muted);font-size:10px}.v-error{margin-top:12px;padding:10px 12px;border-left:3px solid var(--bad);background:rgba(220,90,90,.08);font-size:10px;color:var(--bad)}.v-history{margin-top:18px;padding-top:20px;border-top:1px solid var(--border)}.v-history-head{display:flex;justify-content:space-between}.v-history-head strong{font-size:13px}.v-history-head span{font-size:9px;color:var(--text-subtle)}.v-jobs{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px}.v-job{padding:13px;border:1px solid var(--border);border-radius:11px;background:var(--surface)}.v-job strong{font-size:10px}.v-job span{display:block;margin-top:4px;color:var(--text-muted);font-size:9px}@media(max-width:850px){.v-roster{grid-template-columns:1fr}.v-studio{grid-template-columns:1fr}.v-fields{grid-template-columns:1fr}.v-jobs{grid-template-columns:1fr}}`}</style>
 <header className="v-head"><div><div className="v-eyebrow">Voices · Creator engine</div><h1 className="v-title">Give Cara and Lila an actual content business.</h1><p className="v-copy">One creator engine across TikTok, Instagram, YouTube and Fanvue. Choose the creator, platform, commercial objective and format. Cornerstone researches the market, inspects references when supplied, and builds the experiment.</p></div></header>
 <section className="v-roster">{PERSONAS.map((p,i)=><button key={p.id} className={`v-person${persona===p.id?' active':''}`} onClick={()=>setPersona(p.id)}><div className="v-number">0{i+1}</div><div className="v-name">{p.name}</div><span className="v-tag">{p.tag}</span><div className="v-tone">{p.tone}</div><div className="v-count">{counts[p.id]||0} packages</div></button>)}</section>
 <section className="v-studio"><div className="v-card"><div className="v-label">Creator brief</div><h2>What should {selected.name} test next?</h2><div className="v-fields"><div className="v-field"><label>Platform</label><select value={platform} onChange={e=>setPlatform(e.target.value)}>{PLATFORMS.map(x=><option key={x}>{x}</option>)}</select></div><div className="v-field"><label>Objective</label><select value={objective} onChange={e=>setObjective(e.target.value)}>{OBJECTIVES.map(x=><option key={x}>{x}</option>)}</select></div><div className="v-field"><label>Monetisation</label><select value={monetisation} onChange={e=>setMonetisation(e.target.value)}>{MONETISATION.map(x=><option key={x}>{x}</option>)}</select></div><div className="v-field"><label>Format</label><select value={format} onChange={e=>setFormat(e.target.value)}>{FORMATS.map(x=><option key={x}>{x}</option>)}</select></div><div className="v-field full"><label>Reference URL</label><input value={referenceUrl} onChange={e=>setReferenceUrl(e.target.value)} placeholder="Optional YouTube, TikTok or Instagram example"/></div><div className="v-field full"><label>Direction</label><textarea value={direction} onChange={e=>setDirection(e.target.value)} placeholder="A story, product, trend, feeling, offer, conversation or experiment worth owning…"/></div></div><div className="v-actions"><button className="v-btn" disabled={busy} onClick={queue}>{busy?'Building…':'Research + build →'}</button><button type="button" className="v-btn ghost" onClick={()=>{if(typeof onAdvance==='function')onAdvance();else window.location.href='/content/profiles'}}>Continue to Channels →</button></div>{message?<div className="v-message">{message}</div>:null}</div>
 <aside className="v-card v-preview"><div className="v-label">Selected creator</div><h3>{selected.name}</h3><p>{selected.tone}. The identity stays fixed while platform, format and monetisation can change.</p><div className="v-chips"><span className="v-chip">{platform}</span><span className="v-chip">{objective}</span><span className="v-chip">{monetisation}</span><span className="v-chip">{format}</span></div>{result?<div className="v-result"><div className="v-label">Latest package</div><h3>{result?.concept?.title||result?.title||result?.opportunity||'Creator package ready'}</h3><p>{result?.why_it_should_work||result?.opportunity||result?.operator_brief?.finding||'Platform-native creator experiment built.'}</p><pre>{JSON.stringify(result,null,2)}</pre></div>:null}</aside></section>
 <section className="v-history"><div className="v-history-head"><strong>Recent creator work</strong><span>Owned creator workspace</span></div><div className="v-jobs">{jobs.slice(0,8).map(job=><div className="v-job" key={job.id}><strong>{job.title}</strong><span>{job.persona_id} · {job.options?.platform||'creator'} · {job.status} · {new Date(job.created_at).toLocaleDateString('en-GB')}</span></div>)}{!jobs.length?<div style={{marginTop:10,color:'var(--text-muted)',fontSize:10}}>Creator experiments will appear here.</div>:null}</div></section>
 </main>
}

export function ShopStaged(){return null}
export function MediaStaged(){return null}
export function CaptionStudioStaged(){return null}
export function LocalAIStaged(){return null}
