import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const MODES = [
  ['cinematic_motion','Cinematic Motion',8],
  ['short_form','Short-form',30],
  ['long_form','Long-form',600],
  ['ugc','UGC',15],
  ['multi_image_motion','Multi-image Motion',16],
  ['carousel','Carousel',1],
  ['static_image','Static Image',1],
];

const css = `
.cp{color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif}
.cp-head{display:flex;justify-content:space-between;gap:24px;align-items:end}.cp-k{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--text-subtle);font-weight:850}.cp-h{margin:8px 0 0;font-size:clamp(34px,5vw,58px);line-height:.95;letter-spacing:-.065em}.cp-p{margin:12px 0 0;max-width:66ch;color:var(--text-muted);font-size:13px;line-height:1.6}
.cp-command{margin-top:20px;padding:16px 18px;border:1px solid rgba(212,181,106,.22);border-radius:16px;background:linear-gradient(135deg,rgba(212,181,106,.08),var(--surface));display:flex;justify-content:space-between;gap:16px;align-items:center}.cp-command strong{font-size:13px}.cp-command span{display:block;margin-top:4px;font-size:11px;color:var(--text-muted)}
.cp-layout{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:14px;margin-top:14px}.cp-card{border:1px solid var(--border);background:var(--surface);border-radius:18px;padding:18px;min-width:0}.cp-card-head{display:flex;justify-content:space-between;gap:12px;align-items:start}.cp-title{font-size:14px;font-weight:850}.cp-sub{margin-top:4px;color:var(--text-muted);font-size:11px;line-height:1.45}
.cp-list{display:grid;gap:7px;margin-top:14px}.cp-item{width:100%;text-align:left;padding:13px;border:1px solid var(--border);border-radius:13px;background:var(--surface-2);color:var(--text);cursor:pointer}.cp-item:hover{border-color:rgba(255,255,255,.15)}.cp-item.active{border-color:rgba(212,181,106,.5);background:rgba(212,181,106,.08)}.cp-item strong{display:block;font-size:12px}.cp-meta{margin-top:5px;color:var(--text-muted);font-size:10px}.cp-badge{display:inline-block;margin-top:8px;padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.04);font-size:9px;color:var(--text-muted)}
.cp-modes{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:13px}.cp-mode{padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);color:var(--text);text-align:left;cursor:pointer}.cp-mode.active{border-color:rgba(212,181,106,.55);box-shadow:inset 0 0 0 1px rgba(212,181,106,.12)}.cp-mode b{display:block;font-size:11px}.cp-mode span{display:block;margin-top:4px;color:var(--text-muted);font-size:9px}
.cp-field{width:100%;margin-top:6px;padding:11px 12px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2);color:var(--text);font:inherit}.cp-actions{display:flex;gap:8px;margin-top:12px}.cp-btn{flex:1;min-height:44px;border:1px solid rgba(212,181,106,.4);border-radius:11px;background:linear-gradient(180deg,#e0c87a,#d4b56a);color:#17130c;font-weight:900;cursor:pointer}.cp-btn:disabled{opacity:.5;cursor:default}.cp-link{min-height:44px;padding:0 13px;border:1px solid var(--border);border-radius:11px;background:transparent;color:var(--text);font:inherit;font-size:11px;font-weight:800;cursor:pointer}
.cp-section{margin-top:14px}.cp-jobs{display:grid;gap:7px;margin-top:12px}.cp-job{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:12px 13px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2)}.cp-job strong{font-size:11px}.cp-job span{display:block;margin-top:4px;color:var(--text-muted);font-size:10px}.cp-status{padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.05);font-size:9px;color:var(--text-muted)}.cp-error{margin-top:8px;color:#d9a4a4!important}.cp-empty{padding:18px;border:1px dashed var(--border);border-radius:14px;background:var(--surface-2)}.cp-empty strong{font-size:13px}.cp-empty p{margin:6px 0 0;color:var(--text-muted);font-size:11px;line-height:1.5}.cp-message{margin-top:10px;color:var(--text-muted);font-size:11px;line-height:1.45}
@media(max-width:900px){.cp-layout{grid-template-columns:1fr}}@media(max-width:560px){.cp-modes{grid-template-columns:1fr 1fr}.cp-command{align-items:flex-start;flex-direction:column}.cp-actions{flex-direction:column}.cp-link{width:100%}}
`;

export default function CanonicalProductionWorkspace(){
  const [projects,setProjects]=useState([]); const [jobs,setJobs]=useState([]); const [selectedId,setSelectedId]=useState('');
  const [mode,setMode]=useState('cinematic_motion'); const [duration,setDuration]=useState(8); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  const selected=useMemo(()=>projects.find(p=>p.id===selectedId)||null,[projects,selectedId]);
  async function load(){
    const [p,j]=await Promise.all([
      supabase.from('track_b_content_projects').select('id,title,status,source_type,source_url,brief,created_at,updated_at').order('updated_at',{ascending:false}).limit(100),
      supabase.from('track_b_production_jobs').select('id,project_id,mode,target_duration_seconds,output_count,provider_strategy,status,estimated_credits,actual_credits,failure_stage,failure_code,created_at,updated_at,completed_at').order('created_at',{ascending:false}).limit(100)
    ]);
    if(p.error)setMessage(p.error.message); else setProjects(p.data||[]);
    if(j.error)setMessage(j.error.message); else setJobs(j.data||[]);
  }
  useEffect(()=>{load();const t=setInterval(load,7000);return()=>clearInterval(t)},[]);
  useEffect(()=>{const m=MODES.find(x=>x[0]===mode);if(m)setDuration(m[2])},[mode]);
  async function queue(){
    if(!selected){setMessage('Choose a package first.');return}
    setBusy(true);setMessage('Starting production…');
    try{
      const {data:userData,error:userError}=await supabase.auth.getUser(); if(userError||!userData?.user) throw new Error('Sign in required.');
      const uid=userData.user.id; const brief=selected.brief||{}; const projectionId=`ce-${crypto.randomUUID()}`;
      const {data:q,error:qError}=await supabase.from('content_queue').insert({id:projectionId,client_id:uid,created_at:new Date().toISOString(),persona_id:'cornerstone',persona_name:'Cornerstone',platform:String(brief.platform||'YouTube'),pillar:'Track B Content Engine',hook:String(brief.hook||''),caption:String(brief.caption||''),status:'ready',content_label:selected.title||'Cornerstone creative',post_type:mode,post_format:'video',photo_direction:String(brief.photo_direction||brief.visual_direction||''),photo_idea:String(brief.photo_idea||''),notes:JSON.stringify({canonical_project_id:selected.id,canonical_source:true,brief})}).select('id').single();
      if(qError)throw qError;
      const {data:job,error:jobError}=await supabase.from('track_b_production_jobs').insert({project_id:selected.id,mode,target_duration_seconds:Number(duration),output_count:1,provider_strategy:'auto',estimated_credits:0,estimated_compute_tier:mode==='long_form'?'high':'medium',config:{canonical:true,content_queue_projection_id:q.id,provider:'mpt'},status:'queued',owner_id:uid,cost_tier:'baseline'}).select('id').single();
      if(jobError)throw jobError;
      const {data:mpt,error:mptError}=await supabase.from('mpt_video_jobs').insert({content_queue_id:q.id,owner_id:uid,status:'queued',payload:{mode,target_duration_seconds:Number(duration),output_count:1,provider_strategy:'auto',canonical_project_id:selected.id,canonical_production_job_id:job.id}}).select('id').single();
      if(mptError)throw mptError;
      const {error:jobLinkError}=await supabase.from('track_b_production_jobs').update({source_job_id:mpt.id}).eq('id',job.id).eq('owner_id',uid); if(jobLinkError)throw jobLinkError;
      const {error:pubError}=await supabase.from('track_b_publications').insert({project_id:selected.id,production_job_id:job.id,platform:String(brief.platform||'YouTube'),title:selected.title,status:'draft',metadata:{content_queue_projection_id:q.id,mpt_video_job_id:mpt.id}}); if(pubError)throw pubError;
      setMessage('Production queued. The package is now moving through the engine.'); await load();
    }catch(e){setMessage(e?.message||String(e));}finally{setBusy(false)}
  }
  return <main className="cp"><style>{css}</style><div className="cp-head"><div><div className="cp-k">Production</div><h1 className="cp-h">Make the work.</h1><p className="cp-p">Choose a package, decide what you want produced, and start it. The machine handles the pipeline after that.</p></div></div>{selected?<div className="cp-command"><div><strong>{selected.title}</strong><span>{selected.brief?.hook||'Package selected · ready for a production decision.'}</span></div><div className="cp-badge">Selected</div></div>:null}<div className="cp-layout"><section className="cp-card"><div className="cp-card-head"><div><div className="cp-title">Packages</div><div className="cp-sub">Original work waiting to become assets.</div></div><button className="cp-link" onClick={()=>window.location.href='/content/remake'}>Build another</button></div><div className="cp-list">{projects.length?projects.map(p=><button key={p.id} type="button" className={`cp-item${selectedId===p.id?' active':''}`} onClick={()=>setSelectedId(p.id)}><strong>{p.title||'Untitled package'}</strong><div className="cp-meta">{p.source_type||'source'} · {p.status||'ready'} · {new Date(p.updated_at||p.created_at).toLocaleDateString('en-GB')}</div></button>):<div className="cp-empty"><strong>Your production desk is waiting.</strong><p>Build the first original package, then it will appear here for production.</p><button className="cp-link" onClick={()=>window.location.href='/content/remake'}>Find & build →</button></div>}</div></section><section className="cp-card"><div className="cp-title">Output</div><div className="cp-sub">Pick the asset shape. Defaults are tuned for speed.</div><div className="cp-modes">{MODES.map(m=><button key={m[0]} className={`cp-mode${mode===m[0]?' active':''}`} onClick={()=>setMode(m[0])}><b>{m[1]}</b><span>{m[2]} sec default</span></button>)}</div><label className="cp-k" style={{display:'block',marginTop:14}}>Duration<input className="cp-field" type="number" min="1" max="7200" value={duration} onChange={e=>setDuration(Number(e.target.value)||1)}/></label><div className="cp-actions"><button className="cp-btn" disabled={busy||!selected} onClick={queue}>{busy?'Starting…':'Produce this package →'}</button></div><div className="cp-message">Production creates the canonical job plus the execution adapter and publication record.</div></section></div><section className="cp-card cp-section"><div className="cp-title">In motion</div><div className="cp-sub">Live production state from the canonical job layer.</div><div className="cp-jobs">{jobs.length?jobs.slice(0,20).map(j=><div className="cp-job" key={j.id}><div><strong>{j.mode}</strong><span>{j.status} · {j.target_duration_seconds}s · project {String(j.project_id).slice(0,8)}…</span>{j.failure_code?<span className="cp-error">Blocked: {j.failure_stage||'execution'} / {j.failure_code}</span>:null}</div><div className="cp-status">{j.status}</div></div>):<div className="cp-empty"><strong>No production yet.</strong><p>When you start a package, the machine state appears here.</p></div>}</div></section>{message?<div className="cp-message">{message}</div>:null}</main>;
}
