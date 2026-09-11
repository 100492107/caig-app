import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';

const MODES=[
  ['cinematic_motion','Cinematic video','Smooth movement, cinematic pacing',8],
  ['short_form','Short video','Fast, direct, made for feeds',30],
  ['long_form','Long video','A complete story or deep dive',600],
  ['ugc','UGC','Natural, creator-led delivery',15],
  ['multi_image_motion','Photo motion','Bring stills to life',16],
  ['carousel','Carousel','A sequence of clear slides',1],
  ['static_image','Single image','One strong visual',1]
];

export default function CanonicalProductionWorkspace(){
 const [projects,setProjects]=useState([]),[jobs,setJobs]=useState([]),[selectedId,setSelectedId]=useState(''),[mode,setMode]=useState('cinematic_motion'),[duration,setDuration]=useState(8),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const selected=useMemo(()=>projects.find(p=>p.id===selectedId)||null,[projects,selectedId]);
 async function load(){
  const {data:u}=await supabase.auth.getUser();if(!u?.user){setMessage('Sign in required.');return}
  const uid=u.user.id;
  const [p,j]=await Promise.all([
   supabase.from('track_b_content_projects').select('id,title,status,source_type,source_url,brief,created_at,updated_at').eq('owner_id',uid).not('status','in','(archived)').order('updated_at',{ascending:false}).limit(100),
   supabase.from('track_b_production_jobs').select('id,project_id,mode,target_duration_seconds,output_count,provider_strategy,status,estimated_credits,actual_credits,failure_stage,failure_code,created_at,updated_at,completed_at').eq('owner_id',uid).order('created_at',{ascending:false}).limit(100)
  ]);
  if(p.error)setMessage(p.error.message);else setProjects(p.data||[]);if(j.error)setMessage(j.error.message);else setJobs(j.data||[]);
 }
 useEffect(()=>{load();const t=setInterval(load,7000);return()=>clearInterval(t)},[]);
 useEffect(()=>{const m=MODES.find(x=>x[0]===mode);if(m)setDuration(m[3])},[mode]);
 async function queue(){
  if(!selected){setMessage('Choose a piece first.');return}
  setBusy(true);setMessage('Getting it ready…');
  try{
   const {data:u,error:ue}=await supabase.auth.getUser();if(ue||!u?.user)throw new Error('Sign in required.');const uid=u.user.id;
   const {data:existing}=await supabase.from('track_b_production_jobs').select('id,status,source_job_id').eq('owner_id',uid).eq('project_id',selected.id).eq('mode',mode).in('status',['queued','processing','review']).limit(1);
   if(existing?.[0]){setMessage('This piece is already being made.');await load();return}
   const brief=selected.brief||{};const qid=`ce-${crypto.randomUUID()}`;
   const {data:q,error:qe}=await supabase.from('content_queue').insert({id:qid,client_id:uid,created_at:new Date().toISOString(),persona_id:'cornerstone',persona_name:'Cornerstone',platform:String(brief.platform||'YouTube'),pillar:'Track B Content Engine',hook:String(brief.hook||''),caption:String(brief.caption||''),status:'ready',content_label:selected.title||'Cornerstone creative',post_type:mode,post_format:'video',photo_direction:String(brief.photo_direction||brief.visual_direction||''),photo_idea:String(brief.photo_idea||''),notes:JSON.stringify({canonical_project_id:selected.id,canonical_source:true,brief})}).select('id').single();if(qe)throw qe;
   const {data:job,error:je}=await supabase.from('track_b_production_jobs').insert({project_id:selected.id,mode,target_duration_seconds:Number(duration),output_count:1,provider_strategy:'auto',estimated_credits:0,estimated_compute_tier:mode==='long_form'?'high':'medium',config:{canonical:true,content_queue_projection_id:q.id,provider:'mpt'},status:'queued',owner_id:uid,cost_tier:'medium'}).select('id').single();if(je)throw je;
   const {data:mpt,error:me}=await supabase.from('mpt_video_jobs').insert({content_queue_id:q.id,owner_id:uid,status:'queued',payload:{mode,target_duration_seconds:Number(duration),output_count:1,provider_strategy:'auto',canonical_project_id:selected.id,canonical_production_job_id:job.id}}).select('id').single();if(me)throw me;
   const {error:le}=await supabase.from('track_b_production_jobs').update({source_job_id:mpt.id}).eq('id',job.id).eq('owner_id',uid);if(le)throw le;
   const {error:pe}=await supabase.from('track_b_publications').insert({project_id:selected.id,production_job_id:job.id,platform:String(brief.platform||'YouTube'),title:selected.title,status:'draft',metadata:{content_queue_projection_id:q.id,mpt_video_job_id:mpt.id}});if(pe&&pe.code!=='23505')throw pe;
   setMessage('It is now in production.');await load();
  }catch(e){setMessage(e?.message||String(e))}finally{setBusy(false)}
 }
 return <main className="production-workspace">
  <style>{`
   .production-workspace{max-width:1160px;margin:0 auto;color:var(--text);font-family:var(--sans)}
   .pw-intro{padding:4px 0 26px}.pw-eyebrow{font-size:8px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#a99773}.pw-title{margin:7px 0 0;font-family:var(--display);font-size:clamp(38px,5.2vw,62px);line-height:.93;letter-spacing:-.045em}.pw-copy{margin:10px 0 0;max-width:62ch;color:var(--text-muted);font-size:13px;line-height:1.6}
   .pw-hero{display:grid;grid-template-columns:1.15fr .85fr;gap:16px;margin-top:2px}.pw-card{min-width:0;border:1px solid var(--border);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.026),rgba(255,255,255,.01));padding:19px}.pw-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.pw-label{font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--text-subtle)}.pw-card h2{margin:7px 0 0;font-family:var(--display);font-size:25px;line-height:1.04;letter-spacing:-.035em}.pw-muted{margin-top:6px;color:var(--text-muted);font-size:10px;line-height:1.5}.pw-list{display:grid;gap:7px;margin-top:14px;max-height:460px;overflow:auto;padding-right:2px}.pw-item{width:100%;text-align:left;padding:13px 14px;border:1px solid var(--border);border-radius:13px;background:#121419;color:var(--text);cursor:pointer;transition:.16s ease}.pw-item:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.15)}.pw-item.active{border-color:rgba(216,195,154,.4);background:rgba(216,195,154,.075)}.pw-item strong{display:block;font-size:12px;line-height:1.3}.pw-item span{display:block;margin-top:5px;color:var(--text-subtle);font-size:9px}.pw-selected{margin-top:14px;padding:13px 14px;border:1px solid rgba(216,195,154,.2);border-radius:13px;background:rgba(216,195,154,.055)}.pw-selected strong{font-size:13px}.pw-selected p{margin-top:5px;color:var(--text-muted);font-size:10px;line-height:1.5}
   .pw-modes{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:14px}.pw-mode{padding:12px;border:1px solid var(--border);border-radius:12px;background:#121419;color:var(--text);text-align:left;cursor:pointer}.pw-mode.active{border-color:rgba(216,195,154,.4);background:rgba(216,195,154,.075)}.pw-mode b{display:block;font-size:11px}.pw-mode span{display:block;margin-top:4px;color:var(--text-muted);font-size:9px;line-height:1.4}.pw-field{margin-top:13px}.pw-field label{display:block;font-size:8px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:var(--text-subtle)}.pw-field input{width:100%;margin-top:6px;min-height:43px;padding:10px 11px;border:1px solid var(--border);border-radius:10px;background:#0d0f13;color:var(--text);font:inherit;font-size:11px}.pw-cta{width:100%;min-height:46px;margin-top:13px;border:1px solid #efe8da;border-radius:10px;background:#efe8da;color:#171614;font:inherit;font-size:10px;font-weight:900;cursor:pointer}.pw-cta:disabled{opacity:.5;cursor:default}.pw-jobs{display:grid;gap:7px;margin-top:13px}.pw-job{display:flex;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid var(--border);border-radius:11px;background:#121419}.pw-job strong{font-size:10px}.pw-job span{display:block;margin-top:3px;color:var(--text-muted);font-size:9px}.pw-status{margin-top:10px;color:var(--text-muted);font-size:10px}
   @media(max-width:860px){.pw-hero{grid-template-columns:1fr}}@media(max-width:560px){.pw-modes{grid-template-columns:1fr}.pw-card{padding:16px}}
  `}</style>
  <header className="pw-intro"><div className="pw-eyebrow">Make</div><h1 className="pw-title">Turn the idea into finished work.</h1><p className="pw-copy">Choose the piece you want to make, decide how it should feel, and start. Cornerstone handles the production handoff from there.</p></header>
  <div className="pw-hero">
   <section className="pw-card"><div className="pw-label">Ready to make</div><h2>Choose a piece</h2><p className="pw-muted">Your saved ideas are ready for production. Start with the one you want in the world next.</p><div className="pw-list">{projects.length?projects.map(p=><button key={p.id} className={`pw-item${selectedId===p.id?' active':''}`} onClick={()=>setSelectedId(p.id)}><strong>{p.title||'Untitled piece'}</strong><span>{p.status||'Ready'} · Updated {new Date(p.updated_at||p.created_at).toLocaleDateString('en-GB')}</span></button>):<div className="pw-muted">Nothing is ready yet. Create your first piece in Create.</div>}</div>{selected?<div className="pw-selected"><strong>{selected.title}</strong><p>{selected.brief?.hook||selected.brief?.angle||'Ready to become a finished asset.'}</p></div>:null}</section>
   <section className="pw-card"><div className="pw-label">How should it come to life?</div><h2>Choose the format</h2><div className="pw-modes">{MODES.map(m=><button key={m[0]} className={`pw-mode${mode===m[0]?' active':''}`} onClick={()=>setMode(m[0])}><b>{m[1]}</b><span>{m[2]}</span></button>)}</div><div className="pw-field"><label>Length in seconds</label><input type="number" min="1" max="7200" value={duration} onChange={e=>setDuration(Number(e.target.value)||1)}/></div><button className="pw-cta" disabled={busy||!selected} onClick={queue}>{busy?'Preparing…':'Start making →'}</button></section>
  </div>
  <section className="pw-card" style={{marginTop:16}}><div className="pw-card-head"><div><div className="pw-label">Currently moving</div><h2>Work in progress</h2></div><span className="pw-muted">{jobs.length} recent</span></div><div className="pw-jobs">{jobs.length?jobs.slice(0,12).map(j=><div className="pw-job" key={j.id}><div><strong>{j.mode||'Production'}</strong><span>{j.status} · {j.target_duration_seconds||0}s</span>{j.failure_code?<span style={{color:'#d9a4a4'}}>Needs attention: {j.failure_stage||'production'}</span>:null}</div><strong>{j.status}</strong></div>):<div className="pw-muted">Nothing is being made yet.</div>}</div>{message?<div className="pw-status">{message}</div>:null}</section>
 </main>;
}
