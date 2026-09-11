import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';

const NICHES=['Gaming','History','Stories','Documentary','Business / money','Technology','Lifestyle','Other'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clean=v=>String(v??'').trim();
function parseJson(text){
 const value=clean(text).replace(/```json|```/gi,'').replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/<analysis>[\s\S]*?<\/analysis>/gi,'').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi,'').replace(/<\|im_end\|>|<\|endoftext\|>/gi,'').trim();
 try{return JSON.parse(value)}catch{}
 const start=value.search(/[\[{]/);if(start<0)throw new Error('Cornerstone could not understand the returned package.');
 const open=value[start],close=open==='{'?'}':']';let depth=0,quoted=false,escaped=false;
 for(let i=start;i<value.length;i++){const c=value[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}if(c==='"'){quoted=true;continue}if(c===open)depth++;else if(c===close&&--depth===0){try{return JSON.parse(value.slice(start,i+1))}catch{break}}}
 throw new Error('Cornerstone returned an incomplete package.');
}
async function api(action,payload={}){const r=await fetch('/api/queue-update',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({action,...payload})});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||`Request failed (${r.status})`);return b;}
async function waitJob(id,setMessage){const until=Date.now()+45*60*1000;let last='queued';while(Date.now()<until){const r=await fetch(`/api/queue-update?action=job_status&id=${encodeURIComponent(id)}`,{credentials:'same-origin',cache:'no-store'});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Could not read the job.');if(b.status!==last){last=b.status;setMessage(`Cornerstone is ${b.status==='processing'?'thinking':b.status}…`)}if(b.status==='completed')return b.result||'';if(b.status==='error')throw new Error(b.error_message||'The package could not be completed.');await sleep(2500)}throw new Error('This is taking longer than expected. Open System and check local intelligence.');}
async function online(){try{const{data}=await supabase.from('local_ai_worker_heartbeat').select('status,last_seen').eq('id','qwen').maybeSingle();return Boolean(data?.last_seen&&Date.now()-new Date(data.last_seen).getTime()<90000&&String(data.status||'').toLowerCase()!=='offline')}catch{return false}}

export default function CreateWorkspace(){
 const[url,setUrl]=useState(''),[notes,setNotes]=useState(''),[niche,setNiche]=useState('Gaming'),[file,setFile]=useState(null),[learning,setLearning]=useState(null),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>{supabase.from('track_b_learning_recommendations').select('id,recommendation_type,hook_type,format,invariant_pattern,confidence,source_evidence_id').eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle().then(({data})=>setLearning(data||null))},[]);
 const selected=result?.selected_video;const shorts=useMemo(()=>result?.shorts||result?.short_form||[],[result]);const scenes=useMemo(()=>result?.scene_directions||result?.scene_options||result?.possible_scenes||selected?.scene_directions||selected?.visual_directions||[],[result,selected]);
 async function run(){
  if(!url.trim()&&!notes.trim()&&!file){setMessage('Start with a reference, a thought, or a source file.');return}
  if(!(await online())){setMessage('Cornerstone is offline. Open System and start local intelligence.');return}
  setBusy(true);setSaved(false);setResult(null);setMessage('Reading the opportunity…');
  try{
   let evidence=null;
   if(file){const{data:u,error:ue}=await supabase.auth.getUser();if(ue||!u?.user)throw new Error('Please sign in to upload a source.');const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'_');const path=`${u.user.id}/${crypto.randomUUID()}-${safe}`;const up=await supabase.storage.from('track-b-source-media').upload(path,file,{contentType:file.type||'application/octet-stream'});if(up.error)throw new Error(up.error.message);setMessage('Inspecting your source…');const q=await api('queue_media_ingestion',{userId:u.user.id,objectPath:path,fileName:file.name,contentType:file.type});const raw=await waitJob(q.jobId,setMessage);const ing=parseJson(raw);if(ing?.text_analysis_job_id){const a=await waitJob(ing.text_analysis_job_id,setMessage);evidence={ingestion:ing,text_analysis:parseJson(a)}}}
   setMessage(learning?'Using the latest learning signal…':'Finding the strongest opportunity…');
   const learningNotes=learning?`\n\nMEASURED LEARNING SIGNAL (direction only, not proof of the new package):\n${JSON.stringify(learning)}\n\nPreserve the strongest invariant mechanism, vary the execution, and do not copy the winning asset.`:'';
   const q=await api('queue_content_engine',{niche,channel:'',referenceUrl:url,referenceNotes:`${notes}${learningNotes}`,duration:'20',output:'Long-form + Shorts',direction:'Create a materially original package. Use the underlying mechanism only. Never copy wording, identity, branding, scenes, footage or distinctive packaging. Include practical original scene directions.',sourceAnalysis:evidence});
   const raw=await waitJob(q.jobId,setMessage);setResult(parseJson(raw));setMessage('Your piece is ready.');
  }catch(e){setMessage(e?.message||String(e))}finally{setBusy(false)}
 }
 async function save(){
  if(!selected||saved)return;setBusy(true);setMessage('Saving the piece…');
  try{const bestTitle=selected.titles?.[0]?.title||selected.topic||'Original package';const hashtags=Array.isArray(selected.seo?.hashtags)?selected.seo.hashtags.join(' '):'';const brief={topic:selected.topic||null,angle:selected.angle||null,why_this_should_work:selected.why_this_should_work||null,hook:selected.hook_0_5s||'',caption:selected.script||'',hashtags,cta:selected.seo?.next_video_cta||'',photo_idea:selected.thumbnails?.[0]?.composition||'',photo_direction:JSON.stringify(selected.visual_timeline||[]),selected_video:selected,shorts,scene_directions:scenes,learning_recommendation:learning};const{error}=await supabase.rpc('create_track_b_content_package',{p_title:bestTitle,p_source_url:url||null,p_source_type:'creative_brief',p_brief:brief,p_source_evidence:result?.reference_analysis||{},p_platform:'YouTube',p_hook:selected.hook_0_5s||'',p_caption:selected.script||'',p_hashtags:hashtags,p_cta:selected.seo?.next_video_cta||'',p_photo_idea:selected.thumbnails?.[0]?.composition||'',p_photo_direction:JSON.stringify(selected.visual_timeline||[]),p_post_type:'Long-form + Shorts',p_content_queue_id:`ce-${crypto.randomUUID()}`});if(error)throw error;setSaved(true);setMessage('Saved. It is ready to make.')}catch(e){setMessage(e?.message||String(e))}finally{setBusy(false)}
 }
 return <main className="create">
  <section className="create-hero">
   <div className="create-k">Create</div>
   <h1 className="create-h">Start with something worth making.</h1>
   <p className="create-p">Give Cornerstone a reference, a rough thought, or a source file. It finds the useful idea, checks it against what you’ve already learned, and builds an original piece around it.</p>
  </section>
  {!result?<section className="idea">
   <div className="idea-top"><div className="label">Brief the next piece</div><h2>What are you thinking?</h2>{learning?<span className="learning">A winning signal is ready to use</span>:null}</div>
   <div className="form">
    <label className="field"><span className="label">Start with a reference</span><input className="input" value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste a video, post, article or source URL"/></label>
    <label className="field"><span className="label">Subject</span><select className="select" value={niche} onChange={e=>setNiche(e.target.value)}>{NICHES.map(n=><option key={n}>{n}</option>)}</select></label>
    <label className="field full"><span className="label">What made you notice it?</span><textarea className="textarea" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Tell Cornerstone what caught your eye. A hook, story, comment, visual idea or opportunity is enough."/></label>
    <label className="field full"><span className="label">Or give Cornerstone the source</span><div className="upload"><span>Video, audio or transcript — Cornerstone will inspect it for evidence.</span><input type="file" accept="video/*,audio/*,.txt,.md" onChange={e=>setFile(e.target.files?.[0]||null)}/></div></label>
   </div>
   <aside className="actions"><div><div className="action-kicker">Cornerstone will</div><strong>Find the idea.<br/>Make it yours.</strong><p>Original packaging. Practical scenes. A complete piece ready for production.</p></div><button className="btn primary" disabled={busy} onClick={run}>{busy?'Working…':'Build the piece →'}</button><div className="status">{message||'Ready when you are.'}</div></aside>
  </section>:<section className="result">
   <article className="result-main"><div className="label">Ready to make</div><h2>{selected?.topic||selected?.titles?.[0]?.title||'Original piece'}</h2><p>{selected?.angle||selected?.why_this_should_work||'Built from the transferable mechanism rather than the source execution.'}</p><div className="actions"><button className="btn primary" disabled={busy||saved} onClick={save}>{saved?'Saved ✓':'Save to Make →'}</button><button className="btn" onClick={()=>{setResult(null);setMessage('')}}>Start another</button></div><div className="status">{message}</div></article>
   <article className="card"><div className="label">The reason</div><h3>Why this should work</h3><p>{selected?.why_this_should_work||selected?.angle||'Cornerstone has packaged the strongest transferable mechanism it found.'}</p></article>
   <article className="card"><div className="label">The opening</div><h3>Hook</h3><p>{selected?.hook_0_5s||'No hook was returned.'}</p></article>
   {scenes.length?<details className="disclosure"><summary>Possible scenes & direction</summary><div className="disclosure-body"><div className="list">{scenes.slice(0,8).map((s,i)=><div key={i}><b>{typeof s==='string'?s:s?.title||s?.name||s?.direction||`Scene ${i+1}`}</b>{typeof s==='object'&&<span>{s?.description||s?.visual||s?.why||s?.notes||''}</span>}</div>)}</div></div></details>:null}
   {selected?.titles?.length?<details className="disclosure"><summary>Title options</summary><div className="disclosure-body"><div className="list">{selected.titles.slice(0,6).map((t,i)=><div key={i}><b>{typeof t==='string'?t:t.title}</b>{typeof t==='object'&&t.reason?<span>{t.reason}</span>:null}</div>)}</div></div></details>:null}
   {selected?.script?<details className="disclosure"><summary>Full spoken script</summary><div className="disclosure-body"><div className="raw">{selected.script}</div></div></details>:null}
   {shorts.length?<details className="disclosure"><summary>{shorts.length} short-form directions</summary><div className="disclosure-body"><div className="list">{shorts.slice(0,8).map((s,i)=><div key={i}><b>{s.short_title||`Short ${i+1}`}</b><span>{s.hook||s.angle||''}</span></div>)}</div></div></details>:null}
  </section>}
 </main>;
}
