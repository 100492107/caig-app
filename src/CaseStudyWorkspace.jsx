import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';
import EnterpriseShell from './EnterpriseShell.jsx';
import { creatorDnaFor } from '../shared/creator-dna.js';

const money=v=>v==null?'—':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(Number(v||0));
const num=v=>v==null?'—':new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(Number(v||0));
const date=v=>v?new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';

export default function CaseStudyWorkspace(){
 const [updates,setUpdates]=useState([]),[metrics,setMetrics]=useState([]),[evidence,setEvidence]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [form,setForm]=useState({week_ending:new Date().toISOString().slice(0,10),title:'',summary:'',wins:'',failures:'',next_move:'',public_url:'',published:false});
 async function load(){
   const [u,m,e]=await Promise.all([
     supabase.from('cornerstone_case_study_updates').select('*').order('week_ending',{ascending:false}).limit(52),
     supabase.from('cornerstone_metric_snapshots').select('*').order('snapshot_date',{ascending:false}).limit(250),
     supabase.from('track_b_performance_evidence').select('id,title,platform,views,conversions,revenue,winner,published_at,created_at').order('created_at',{ascending:false}).limit(100)
   ]);
   if(u.error||m.error||e.error){setError((u.error||m.error||e.error).message);return}
   setUpdates(u.data||[]);setMetrics(m.data||[]);setEvidence(e.data||[]);
 }
 useEffect(()=>{load()},[]);
 async function save(){
  setError('');setMessage('');
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError('Sign in required.');return}
  if(!form.title||!form.summary){setError('Title and summary are required.');return}
  setBusy(true);
  const {error}=await supabase.from('cornerstone_case_study_updates').insert({...form,owner_id:user.id});
  setBusy(false);
  if(error){setError(error.message);return}
  setForm({...form,title:'',summary:'',wins:'',failures:'',next_move:'',public_url:'',published:false});
  setMessage('Weekly case-study record saved.');
  await load();
 }
 const current=metrics[0]||null;
 const latestPlatforms=useMemo(()=>{const m=new Map();for(const r of metrics.filter(x=>x.scope==='platform')){if(!m.has(r.platform))m.set(r.platform,r)}return [...m.values()]},[metrics]);
 const totalFollowers=latestPlatforms.reduce((n,x)=>n+Number(x.audience_followers||0),0);
 const totalSubs=latestPlatforms.reduce((n,x)=>n+Number(x.subscribers||0),0);
 const totalPaid=latestPlatforms.reduce((n,x)=>n+Number(x.paid_subscribers||0),0);
 const evidenceRevenue=evidence.reduce((n,x)=>n+Number(x.revenue||0),0);

 return <EnterpriseShell active="business" eyebrow="Business / Case Study">
  <main className="bi">
   <header className="bi-head">
    <div><div className="bi-k">Live Build / Public case study</div><h1>Make the journey auditable.</h1><p>This is the public record of building Cara and Lila. Real numbers, real failures, real decisions. No invented traction and no polished story that hides the gaps.</p></div>
    <div className="bi-head-meta"><b>{updates.length} weeks</b><span>Documented</span><small>{updates.filter(x=>x.published).length} public · {updates.filter(x=>!x.published).length} private drafts</small></div>
   </header>
   <div className="bi-tabs"><a href="/business">Business overview</a><a href="/business/capture">Capture</a><a className="active" href="/business/case-study">Case Study</a></div>
   <section className="cs-case-identity">
    <div><span>CANONICAL CREATOR SYSTEM</span><strong>{creatorDnaFor('cara').name} + {creatorDnaFor('lila').name}</strong></div>
    <p>{creatorDnaFor('duo').coreDynamic} Every case-study entry records what the system actually learned from running them.</p>
   </section>
   {error&&<div className="bi-error">{error}</div>}{message&&<div className="bi-success">{message}</div>}

   <section className="bi-health">
    <div><strong>{num(totalFollowers)}</strong><span>Followers recorded</span></div>
    <div><strong>{num(totalSubs)}</strong><span>Subscribers recorded</span></div>
    <div><strong>{num(totalPaid)}</strong><span>Paid subscribers</span></div>
    <div><strong>{money(current?.revenue)}</strong><span>Latest business revenue</span></div>
    <div><strong>{money(evidenceRevenue)}</strong><span>Performance-linked revenue</span></div>
   </section>

   <article className="bi-panel">
    <div className="bi-panel-head"><b>Write this week</b><span>Business record first · public post second</span></div>
    <div className="bi-capture-form">
      <label><span>Week ending</span><input type="date" value={form.week_ending} onChange={e=>setForm({...form,week_ending:e.target.value})}/></label>
      <label><span>Title</span><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Week 1 — The first 7 days"/></label>
      <label style={{gridColumn:'1/-1'}}><span>Summary</span><textarea value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} placeholder="What happened? Include the numbers that matter and be explicit where data is missing."/></label>
      <label><span>Wins</span><textarea value={form.wins} onChange={e=>setForm({...form,wins:e.target.value})} placeholder="What actually worked?"/></label>
      <label><span>Failures / gaps</span><textarea value={form.failures} onChange={e=>setForm({...form,failures:e.target.value})} placeholder="What did not work? What do we still not know?"/></label>
      <label><span>Next move</span><textarea value={form.next_move} onChange={e=>setForm({...form,next_move:e.target.value})}/></label>
      <label><span>Public URL</span><input value={form.public_url} onChange={e=>setForm({...form,public_url:e.target.value})} placeholder="https://…"/></label>
      <label className="bi-check"><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})}/><span>Publicly published</span></label>
    </div>
    <div className="bi-panel-actions"><button className="bi-primary" disabled={busy} onClick={save}>{busy?'Saving…':'Save weekly update →'}</button><span>Do not omit failures because they make the case study less impressive.</span></div>
   </article>

   <article className="bi-panel">
    <div className="bi-panel-head"><b>Experiment trail</b><span>Market events that can become proof</span></div>
    {evidence.length?evidence.slice(0,20).map(e=><div className="bi-listrow" key={e.id}><div><b>{e.title||'Untitled asset'}</b><span>{e.platform} · {date(e.published_at||e.created_at)} · {num(e.views)} views · {num(e.conversions)} conversions</span></div><strong>{money(e.revenue)}{e.winner?' · Winner':''}</strong></div>):<div className="bi-empty">No published performance evidence yet. That is the honest starting position.</div>}
   </article>

   <article className="bi-panel">
    <div className="bi-panel-head"><b>Case-study history</b><span>52-week operating memory</span></div>
    {updates.length?updates.map(u=><div className="bi-listrow" key={u.id}><div><b>{u.title}</b><span>{date(u.week_ending)} · {u.published?'Public':'Private'}</span><p style={{margin:'5px 0 0',color:'var(--cs-os-muted)',fontSize:9,lineHeight:1.4}}>{u.summary}</p></div><strong>{u.next_move||'—'}</strong></div>):<div className="bi-empty">The public case study begins here. The first entry should describe the starting point, not retroactively rewrite it.</div>}
   </article>
  </main>
 </EnterpriseShell>
}
