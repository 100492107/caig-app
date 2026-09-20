import React,{useEffect,useState} from 'react';
import {supabase} from './supabase';
import EnterpriseShell from './EnterpriseShell.jsx';

const N=v=>v===''||v==null?'':Number(v);
const fields=[
  ['revenue','Revenue'],['cogs','COGS'],['operating_expenses','Operating expenses'],['cash_balance','Cash balance'],
  ['monthly_burn','Monthly burn'],['receivables','Receivables'],['current_assets','Current assets'],['current_liabilities','Current liabilities'],
  ['debt','Debt'],['customer_count','Customers'],['new_customers','New customers'],['churn_rate','Churn rate'],
  ['cac','CAC'],['ltv','LTV'],['employee_count','Employees'],['dso_days','DSO days']
];
const pfields=[['audience_followers','Followers'],['subscribers','Subscribers'],['paid_subscribers','Paid subscribers'],['views','Views'],['reach','Reach'],['clicks','Clicks'],['conversions','Conversions'],['revenue','Revenue']];

export default function BusinessCaptureWorkspace(){
 const [mode,setMode]=useState('platform');
 const [platform,setPlatform]=useState('Instagram');
 const [snapshotDate,setSnapshotDate]=useState(new Date().toISOString().slice(0,10));
 const [periodDays,setPeriodDays]=useState('30');
 const [sourceType,setSourceType]=useState('manual');
 const [sourceName,setSourceName]=useState('');
 const [verified,setVerified]=useState(false);
 const [vals,setVals]=useState({});
 const [pubs,setPubs]=useState([]);
 const [creators,setCreators]=useState([]);
 const [exp,setExp]=useState({publication_id:'',creator_id:'',platform:'Instagram',hypothesis:'',mechanism:'',variant:'',primary_metric:'Views',success_threshold:'',decision:'',notes:''});
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');

 useEffect(()=>{
   Promise.all([
     supabase.from('track_b_publications').select('id,title,platform').order('created_at',{ascending:false}).limit(100),
     supabase.from('creators').select('name,handle').order('name')
   ]).then(([p,c])=>{setPubs(p.data||[]);setCreators(c.data||[])});
 },[]);

 const set=(k,v)=>setVals({...vals,[k]:v});
 async function saveSnapshot(){
   setMessage('');setError('');
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){setError('Sign in required.');return}
   const row={owner_id:user.id,snapshot_date:snapshotDate,period_days:Number(periodDays)||30,scope:mode,platform:mode==='platform'?platform:null,source_type:sourceType,source_name:sourceName||null,verified};
   const list=mode==='platform'?pfields.map(x=>x[0]):fields.map(x=>x[0]);
   list.forEach(k=>{if(vals[k]!==''&&vals[k]!=null)row[k]=N(vals[k])});
   const {error}=await supabase.from('cornerstone_metric_snapshots').insert(row);
   if(error){setError(error.message);return}
   setMessage('Metric snapshot saved. It is now part of the evidence ledger.');
   setVals({});
 }
 async function saveExperiment(){
   setMessage('');setError('');
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){setError('Sign in required.');return}
   if(!exp.hypothesis.trim()){setError('A measurable experiment needs a hypothesis.');return}
   const payload={...exp,owner_id:user.id,success_threshold:exp.success_threshold===''?null:Number(exp.success_threshold),publication_id:exp.publication_id||null};
   const {error}=await supabase.from('cornerstone_experiment_log').insert(payload);
   if(error){setError(error.message);return}
   setMessage('Experiment recorded. Measure the linked publication after it ships.');
   setExp({...exp,hypothesis:'',mechanism:'',variant:'',success_threshold:'',decision:'',notes:''});
 }
 return <EnterpriseShell active="business" eyebrow="Business / Capture">
  <main className="bi">
   <header className="bi-head">
    <div><div className="bi-k">Manual capture</div><h1>Put the truth into the machine.</h1><p>For the first 30–60 days, capture platform and business numbers manually. Record the source and verification state every time. This becomes the training data for future automation.</p></div>
    <div className="bi-head-meta"><b>Manual first</b><span>Automation follows evidence</span><small>No snapshot is treated as current unless it has a capture date and source.</small></div>
   </header>
   <div className="bi-tabs"><a href="/business">Business overview</a><a className="active" href="/business/capture">Capture</a><a href="/business/case-study">Case Study</a><a href="/business">Documents</a></div>
   {error&&<div className="bi-error">{error}</div>}{message&&<div className="bi-success">{message}</div>}
   <section className="bi-panel">
    <div className="bi-panel-head"><b>Metric snapshot</b><span>Current platform or business state</span></div>
    <div className="bi-capture-form">
     <label><span>Scope</span><select value={mode} onChange={e=>{setMode(e.target.value);setVals({})}}><option value="platform">Platform</option><option value="business">Business</option></select></label>
     {mode==='platform'&&<label><span>Platform</span><input value={platform} onChange={e=>setPlatform(e.target.value)} placeholder="Instagram / TikTok / YouTube / Fanvue"/></label>}
     <label><span>Snapshot date</span><input type="date" value={snapshotDate} onChange={e=>setSnapshotDate(e.target.value)}/></label>
     <label><span>Period covered</span><input inputMode="numeric" value={periodDays} onChange={e=>setPeriodDays(e.target.value)}/></label>
     <label><span>Source type</span><select value={sourceType} onChange={e=>setSourceType(e.target.value)}><option>manual</option><option>platform_api</option><option>accounting</option><option>bank</option><option>document</option><option>import</option></select></label>
     <label><span>Source name</span><input value={sourceName} onChange={e=>setSourceName(e.target.value)} placeholder="e.g. Fanvue dashboard / bank statement"/></label>
     {(mode==='platform'?pfields:fields).map(([k,label])=><label key={k}><span>{label}</span><input inputMode="decimal" value={vals[k]||''} onChange={e=>set(k,e.target.value)} placeholder={k==='churn_rate'?'0.05 = 5%':''}/></label>)}
     <label className="bi-check"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/><span>I checked this against the source and it is verified.</span></label>
    </div>
    <div className="bi-panel-actions"><button className="bi-primary" onClick={saveSnapshot}>Save snapshot →</button><span>Blank fields stay unknown.</span></div>
   </section>

   <section className="bi-panel">
    <div className="bi-panel-head"><b>Asset experiment</b><span>Published work should have a hypothesis</span></div>
    <div className="bi-capture-form">
      <label><span>Publication</span><select value={exp.publication_id} onChange={e=>setExp({...exp,publication_id:e.target.value})}><option value="">Link after publishing</option>{pubs.map(p=><option key={p.id} value={p.id}>{p.title||'Untitled'} · {p.platform}</option>)}</select></label>
      <label><span>Creator</span><select value={exp.creator_id} onChange={e=>setExp({...exp,creator_id:e.target.value})}><option value="">Not set</option>{creators.map(c=><option key={c.name} value={String(c.name).toLowerCase().replaceAll(' ','_')}>{c.name}</option>)}</select></label>
      <label><span>Platform</span><input value={exp.platform} onChange={e=>setExp({...exp,platform:e.target.value})}/></label>
      <label><span>Primary metric</span><input value={exp.primary_metric} onChange={e=>setExp({...exp,primary_metric:e.target.value})}/></label>
      <label style={{gridColumn:'1/-1'}}><span>Hypothesis</span><textarea value={exp.hypothesis} onChange={e=>setExp({...exp,hypothesis:e.target.value})} placeholder="Because X, we expect Y to improve on this platform."></textarea></label>
      <label><span>Mechanism</span><textarea value={exp.mechanism} onChange={e=>setExp({...exp,mechanism:e.target.value})}/></label>
      <label><span>Variant</span><textarea value={exp.variant} onChange={e=>setExp({...exp,variant:e.target.value})}/></label>
      <label><span>Success threshold</span><input inputMode="decimal" value={exp.success_threshold} onChange={e=>setExp({...exp,success_threshold:e.target.value})}/></label>
      <label><span>Decision</span><input value={exp.decision} onChange={e=>setExp({...exp,decision:e.target.value})} placeholder="Repeat / change / stop"/></label>
      <label style={{gridColumn:'1/-1'}}><span>Notes</span><textarea value={exp.notes} onChange={e=>setExp({...exp,notes:e.target.value})}/></label>
    </div>
    <div className="bi-panel-actions"><button className="bi-primary" onClick={saveExperiment}>Save experiment →</button><span>Results are captured later in Learn.</span></div>
   </section>
  </main>
 </EnterpriseShell>
