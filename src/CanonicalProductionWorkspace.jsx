import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const MODES = [
  ['cinematic_motion','Cinematic Motion',8],
  ['short_form','Short-form',30],
  ['long_form','Long-form',600],
  ['ugc','UGC',15],
  ['multi_image_motion','Multi-Image Motion',16],
  ['carousel','Carousel',1],
  ['static_image','Static Image',1],
];

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
    if(!selected){setMessage('Pick a package first. Cornerstone will queue production against that package.');return}
    setBusy(true);setMessage('Starting production…');
    try{
      const {data:userData,error:userError}=await supabase.auth.getUser(); if(userError||!userData?.user) throw new Error('Sign in required.');
      const uid=userData.user.id; const brief=selected.brief||{};
      const projectionId=`ce-${crypto.randomUUID()}`;
      const {data:q,error:qError}=await supabase.from('content_queue').insert({
        id:projectionId,client_id:uid,created_at:new Date().toISOString(),persona_id:'cornerstone',persona_name:'Cornerstone',platform:String(brief.platform||'YouTube'),pillar:'Track B Content Engine',hook:String(brief.hook||''),caption:String(brief.caption||''),status:'ready',content_label:selected.title||'Cornerstone creative',post_type:mode,post_format:'video',photo_direction:String(brief.photo_direction||brief.visual_direction||''),photo_idea:String(brief.photo_idea||''),notes:JSON.stringify({canonical_project_id:selected.id,canonical_source:true,brief})
      }).select('id').single();
      if(qError)throw qError;

      const {data:job,error:jobError}=await supabase.from('track_b_production_jobs').insert({
        project_id:selected.id,mode,target_duration_seconds:Number(duration),output_count:1,provider_strategy:'auto',estimated_credits:0,estimated_compute_tier:mode==='long_form'?'high':'medium',config:{canonical:true,content_queue_projection_id:q.id,provider:'mpt'},status:'queued',owner_id:uid,cost_tier:'baseline'
      }).select('id').single();
      if(jobError)throw jobError;

      const {data:mpt,error:mptError}=await supabase.from('mpt_video_jobs').insert({
        content_queue_id:q.id,owner_id:uid,status:'queued',payload:{mode,target_duration_seconds:Number(duration),output_count:1,provider_strategy:'auto',canonical_project_id:selected.id,canonical_production_job_id:job.id}
      }).select('id').single();
      if(mptError)throw mptError;

      const {error:jobLinkError}=await supabase.from('track_b_production_jobs').update({source_job_id:mpt.id}).eq('id',job.id).eq('owner_id',uid);
      if(jobLinkError)throw jobLinkError;

      const {error:pubError}=await supabase.from('track_b_publications').insert({project_id:selected.id,production_job_id:job.id,platform:String(brief.platform||'YouTube'),title:selected.title,status:'draft',metadata:{content_queue_projection_id:q.id,mpt_video_job_id:mpt.id}});
      if(pubError)throw pubError;
      setMessage('Production started. Cornerstone will move this package forward. Check Going live when it is ready to schedule.'); await load();
    }catch(e){setMessage(e?.message||String(e));}finally{setBusy(false)}
  }
  const goToRemake=()=>{window.location.href='/content/remake'};
  return <main className="canonical-production"><style>{`.canonical-production{color:var(--text)}.cp-head{display:flex;justify-content:space-between;gap:18px;align-items:end}.cp-kicker{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-subtle);font-weight:850}.cp-title{margin:10px 0 0;font-size:clamp(36px,6vw,64px);line-height:.92;letter-spacing:-.07em}.cp-sub{margin:12px 0 0;color:var(--text-muted);font-size:13px;line-height:1.55;max-width:65ch}.cp-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:12px;margin-top:22px}.cp-card{border:1px solid var(--border);background:var(--surface);border-radius:18px;padding:18px}.cp-label{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-subtle);font-weight:850}.cp-list{display:grid;gap:8px;margin-top:12px}.cp-item{width:100%;text-align:left;padding:13px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);color:var(--text);cursor:pointer}.cp-item.active{border-color:rgba(212,181,106,.4);background:rgba(212,181,106,.08)}.cp-item strong{display:block;font-size:12px}.cp-meta{margin-top:5px;color:var(--text-muted);font-size:10px}.cp-modes{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.cp-mode{padding:12px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2);color:var(--text);text-align:left;cursor:pointer}.cp-mode.active{border-color:rgba(212,181,106,.4)}.cp-mode b{display:block;font-size:11px}.cp-mode span{display:block;margin-top:4px;color:var(--text-muted);font-size:9px}.cp-field{width:100%;margin-top:7px;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--text);font:inherit}.cp-btn{margin-top:14px;width:100%;min-height:44px;border:1px solid #ddd9cc;border-radius:10px;background:#ddd9cc;color:#171717;font-weight:900;cursor:pointer}.cp-history{display:grid;gap:8px;margin-top:12px}.cp-job{padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2)}.cp-job strong{font-size:11px}.cp-job span{display:block;margin-top:4px;color:var(--text-muted);font-size:9px}.cp-message{margin-top:10px;color:var(--text-muted);font-size:10px}.cp-empty{padding:22px;border:1px dashed var(--border);border-radius:14px;background:var(--surface-2)}.cp-empty strong{display:block;font-size:14px}.cp-empty p{margin:7px 0 0;color:var(--text-muted);font-size:12px;line-height:1.5}.cp-empty-btn{margin-top:14px;min-height:40px;padding:0 14px;border:1px solid rgba(212,181,106,.45);border-radius:10px;background:rgba(212,181,106,.1);color:var(--text);font:inherit;font-size:12px;font-weight:850;cursor:pointer}@media(max-width:900px){.cp-grid{grid-template-columns:1fr}}`}</style><div className="cp-head"><div><div className="cp-kicker">Making</div><h1 className="cp-title">What Cornerstone can produce next.</h1><p className="cp-sub">These are original packages ready to become media. Pick one and put it into production. You are approving work, not designing a pipeline.</p></div></div><div className="cp-grid"><section className="cp-card"><div className="cp-label">Packages ready to make</div><div className="cp-list">{projects.length?projects.map(p=><button key={p.id} className={`cp-item ${selectedId===p.id?'active':''}`} onClick={()=>setSelectedId(p.id)}><strong>{p.title}</strong><div className="cp-meta">{p.source_type} · {p.status} · {new Date(p.updated_at||p.created_at).toLocaleDateString('en-GB')}</div></button>):<div className="cp-empty"><strong>Nothing is ready to produce yet.</strong><p>That does not mean the product is empty — it means the engine needs its first package. Find a winner and build one.</p><button type="button" className="cp-empty-btn" onClick={goToRemake}>Find & build a package →</button></div>}</div>{selected&&<div style={{marginTop:14}}><div className="cp-label">Selected brief</div><div className="cp-item" style={{marginTop:8,cursor:'default'}}><strong>{selected.title}</strong><div className="cp-meta">{selected.brief?.hook||'No hook recorded.'}</div></div></div>}</section><section className="cp-card"><div className="cp-label">Start production</div><div className="cp-modes">{MODES.map(m=><button key={m[0]} className={`cp-mode ${mode===m[0]?'active':''}`} onClick={()=>setMode(m[0])}><b>{m[1]}</b><span>{m[2]} sec default</span></button>)}</div><label className="cp-label" style={{display:'block',marginTop:14}}>Duration (seconds)<input className="cp-field" type="number" min="1" max="7200" value={duration} onChange={e=>setDuration(Number(e.target.value)||1)}/></label><button className="cp-btn" disabled={busy||!selected} onClick={queue}>{busy?'Starting…':'Produce this package →'}</button></section></div><section className="cp-card" style={{marginTop:12}}><div className="cp-label">In motion</div><div className="cp-history">{jobs.length?jobs.map(j=><div className="cp-job" key={j.id}><strong>{j.mode}</strong><span>{j.status} · {j.target_duration_seconds}s · project {String(j.project_id).slice(0,8)}…</span>{j.failure_code&&<span>Blocked: {j.failure_stage||'execution'} / {j.failure_code}</span>}</div>):<div className="cp-empty"><strong>No production running.</strong><p>When packages exist, this is where you see the machine working.</p><button type="button" className="cp-empty-btn" onClick={goToRemake}>Find & build a package →</button></div>}</div></section>{message&&<div className="cp-message">{message}</div>}</main>;
}
