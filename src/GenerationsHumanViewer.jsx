import React,{useEffect,useMemo,useState}from'react';
import EnterpriseShell from'./EnterpriseShell.jsx';

const clean=v=>String(v??'').trim();
const label=k=>String(k).replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
const isUrl=v=>/^https?:\/\//i.test(clean(v));
const primitive=v=>typeof v==='string'||typeof v==='number'||typeof v==='boolean';

function parseResult(value){
  if(value&&typeof value==='object')return value;
  let raw=clean(value);
  if(!raw)return null;
  raw=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'')
    .replace(/<think>[\s\S]*?<\/think>/gi,'')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi,'')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi,'')
    .replace(/<\|im_end\|>|<\|endoftext\|>/gi,'').trim();
  try{return JSON.parse(raw)}catch{}
  const start=raw.search(/[\[{]/);
  if(start<0)return null;
  const open=raw[start],close=open==='{'?'}':']';
  let depth=0,quoted=false,escaped=false;
  for(let i=start;i<raw.length;i++){
    const ch=raw[i];
    if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue;}
    if(ch==='"'){quoted=true;continue;}
    if(ch===open)depth++;
    else if(ch===close&&--depth===0){try{return JSON.parse(raw.slice(start,i+1))}catch{return null}}
  }
  return null;
}

function first(obj,keys){for(const k of keys){const v=obj?.[k];if(v!==undefined&&v!==null&&clean(v))return v}return null;}

const PRIORITY=[
 ['finding','What Cornerstone found'],['demand_signal','What Cornerstone found'],['core_mechanism','Transferable mechanism'],['mechanism','Transferable mechanism'],
 ['key_insight','Key insight'],['evidence_status','Evidence status'],['evidence','Evidence'],['source_evidence','Evidence'],['evidence_summary','Evidence'],
 ['why_it_works','Why it works'],['why_this_should_work','Why this should work'],['opportunity','Original opportunity'],['opportunity_statement','Original opportunity'],['original_reconstruction_opportunity','Original opportunity'],
 ['recommended_subject','Recommended subject'],['recommended_angle','Recommended angle'],['best_next_move','Next best move'],['next_action','Next action'],['recommended_next_action','Next action'],['recommendation','Recommendation'],
 ['confidence','Confidence'],['limitations','What to verify'],['uncertainties','What to verify'],['confidence_note','What to verify'],
];
const EXEC=['hook_0_5s','hook','titles','title_options','title_ideas','package_titles','thumbnails','script','chapters','narrative_structure','visual_timeline','curiosity_loops','shorts','short_form','short_form_derivatives','publication_sequence','seo_upload','measurement_plan','monetization_tests','originality_plan','follow_ups'];

function Readable({value,depth=0}){
  if(value===null||value===undefined||value==='')return null;
  if(primitive(value)){
    const text=String(value);
    if(isUrl(text))return <a href={text} target="_blank" rel="noreferrer" style={styles.link}>{text}</a>;
    return <span>{text}</span>;
  }
  if(Array.isArray(value))return <div style={styles.list}>{value.map((v,i)=><div key={i} style={styles.listItem}><Readable value={v} depth={depth+1}/></div>)}</div>;
  return <div style={depth>1?styles.nested:styles.object}>{Object.entries(value).map(([k,v])=>v==null||v===''?null:<div key={k} style={styles.field}><div style={styles.fieldLabel}>{label(k)}</div><div style={styles.fieldValue}><Readable value={v} depth={depth+1}/></div></div>)}</div>;
}

function Card({title,children,hero=false,subtle=false}){return <section style={{...styles.card,...(hero?styles.hero:{}),...(subtle?styles.subtle:{})}}><div style={styles.kicker}>{title}</div><div style={styles.cardBody}>{children}</div></section>}

function HumanResult({value}){
  const data=parseResult(value);
  if(!data||typeof data!=='object'||Array.isArray(data)){
    return <Card title="Interpretation unavailable" subtle><p style={styles.copy}>Cornerstone received output, but it could not safely interpret it as structured evidence. Nothing is being presented as a fact until it can be verified.</p><details style={styles.details}><summary style={styles.summary}>Machine response</summary><pre style={styles.raw}>{clean(value)||'No output stored.'}</pre></details></Card>;
  }
  const finding=first(data,['operator_brief','finding','demand_signal','key_insight','core_mechanism','mechanism','audience_promise']);
  const evidenceStatus=first(data,['evidence_status','support_level','confidence']);
  const why=first(data,['why_it_works','why_this_should_work','strategic_reasoning','rationale']);
  const opportunity=first(data,['recommended_subject','recommended_angle','original_reconstruction_opportunity','opportunity_statement','opportunity']);
  const next=first(data,['next_action','recommended_next_action','best_next_move','recommendation']);
  const evidence=first(data,['evidence','source_evidence','evidence_summary']);
  const limits=first(data,['limitations','uncertainties','confidence_note']);
  const mechanism=first(data,['transferable_mechanism','core_mechanism','mechanism']);
  const hooks=first(data,['hook_0_5s','hook']);
  const titles=first(data,['titles','title_options','title_ideas','package_titles']);
  const brief=data.operator_brief&&typeof data.operator_brief==='object'?data.operator_brief:null;
  const seen=new Set();
  const sections=[];
  const add=(key,title,val,hero=false)=>{if(val==null||val===''||seen.has(key))return;seen.add(key);sections.push(<Card key={key} title={title} hero={hero}><Readable value={val}/></Card>)};
  if(brief){
    add('finding','What Cornerstone found',first(brief,['finding','demand_signal','summary','insight']),true);
    add('brief_status','Evidence status',first(brief,['evidence_status','support_level','confidence']));
    add('brief_evidence','Evidence',first(brief,['evidence_points','evidence','support']));
    add('brief_mechanism','Transferable mechanism',first(brief,['mechanism','core_mechanism','transferable_mechanism']));
    add('brief_why','Why it matters',first(brief,['why','reason','why_it_works']));
    add('brief_subject','What you should make',first(brief,['recommended_subject','recommended_angle','subject','angle']));
    add('brief_next','Recommended next action',first(brief,['next_action','recommended_next_action','best_next_move']));
    add('brief_confidence','Confidence',first(brief,['confidence','confidence_note']));
    add('brief_limits','What to verify',first(brief,['limitations','uncertainties','verification']));
  }else{
    add('finding','What Cornerstone found',finding,true);
    add('status','Evidence status',evidenceStatus);
    add('evidence','Evidence / support',evidence);
    add('mechanism','Transferable mechanism',mechanism);
    add('why','Why it matters',why);
    add('opportunity','What you should make',opportunity);
    add('next','Recommended next action',next);
    add('limits','What to verify',limits);
  }
  add('hook','Opening hook',hooks);
  add('titles','Title options',titles);
  if(data.thumbnails)add('thumbnails','Thumbnail concepts',data.thumbnails);
  if(data.narrative_structure)add('narrative','Story structure',data.narrative_structure);
  if(data.script)add('script','Spoken script',data.script);
  if(data.visual_timeline)add('visual','Visual production timeline',data.visual_timeline);
  if(data.curiosity_loops)add('loops','Curiosity loops',data.curiosity_loops);
  if(data.shorts||data.short_form||data.short_form_derivatives)add('shorts','Short-form family',data.shorts||data.short_form||data.short_form_derivatives);
  if(data.publication_sequence)add('publish','Publication sequence',data.publication_sequence);
  if(data.seo_upload)add('seo','Upload package',data.seo_upload);
  if(data.measurement_plan)add('measure','Measurement plan',data.measurement_plan);
  if(data.originality_plan)add('originality','Originality plan',data.originality_plan);
  if(data.monetization_tests)add('monetization','Monetisation tests',data.monetization_tests);
  return <div style={styles.stack}>{sections.length?sections:<Card title="No operator brief returned" subtle><p style={styles.copy}>The model returned structured production data without a reliable decision summary. Cornerstone will not manufacture one from unsupported assumptions.</p></Card>}<details style={styles.details}><summary style={styles.summary}>Developer / production data</summary><pre style={styles.raw}>{JSON.stringify(data,null,2)}</pre></details></div>;
}

export default function GenerationsHumanViewer(){
 const[jobs,setJobs]=useState([]),[selected,setSelected]=useState(null),[q,setQ]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(){setLoading(true);setError('');try{const r=await fetch('/api/queue-update?action=generations&limit=100&offset=0',{cache:'no-store',credentials:'same-origin'});const b=await r.json();if(!r.ok)throw new Error(b?.error||`Library failed (${r.status})`);const rows=Array.isArray(b.jobs)?b.jobs:[];setJobs(rows);setSelected(s=>s?rows.find(x=>x.id===s.id)||s:rows[0]||null)}catch(e){setError(e?.message||String(e))}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 const visible=useMemo(()=>{const x=q.trim().toLowerCase();return jobs.filter(j=>!x||[j.title,j.job_type,j.status,j.user_prompt,j.result].some(v=>clean(v).toLowerCase().includes(x)))},[jobs,q]);
 return <EnterpriseShell active="library" eyebrow="Track B · Intelligence library"><div style={styles.page}><header style={styles.head}><div><div style={styles.overline}>TRACK B · CONTENT INTELLIGENCE + PRODUCTION</div><h1 style={styles.h1}>What did Cornerstone learn?</h1><p style={styles.lede}>Every generation is a decision. See the evidence, the transferable mechanism, the original opportunity and the next move. Production detail stays underneath.</p></div><button onClick={load} disabled={loading} style={styles.button}>{loading?'Refreshing…':'Refresh'}</button></header><div style={styles.searchRow}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search work, sources, subjects…" style={styles.input}/><div style={styles.count}>{visible.length} saved</div></div>{error?<div style={styles.error}>{error}</div>:null}<div style={styles.layout}><aside style={styles.sidebar}>{loading&&!jobs.length?<div style={styles.empty}>Reading saved work…</div>:visible.map(job=><button key={job.id} onClick={()=>setSelected(job)} style={{...styles.job,...(selected?.id===job.id?styles.jobActive:{})}}><div style={styles.jobMeta}><span>{job.job_type||'Generation'}</span><span>{job.status}</span></div><strong style={styles.jobTitle}>{job.title||'Untitled generation'}</strong><span style={styles.jobDate}>{job.created_at?new Date(job.created_at).toLocaleString('en-GB'):''}</span></button>)}{!loading&&!visible.length?<div style={styles.empty}>No saved generations match this search.</div>:null}</aside><main style={styles.main}>{selected?<><div style={styles.selectedMeta}>{selected.job_type||'Generation'} · {selected.status}</div><h2 style={styles.h2}>{selected.title||'Untitled generation'}</h2><div style={styles.date}>{selected.created_at?new Date(selected.created_at).toLocaleString('en-GB'):''}{selected.model?` · ${selected.model}`:''}</div><HumanResult value={selected.result||selected.error_message}/></>:<div style={styles.emptyMain}><div style={styles.bigMark}>C</div><h2>Pick a generation</h2><p>Select saved work to see what Cornerstone discovered and what it recommends next.</p></div>}</main></div></div></EnterpriseShell>
}

const styles={
 page:{padding:'22px 0 70px',color:'var(--text)',fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif'},
 head:{display:'flex',justifyContent:'space-between',gap:24,alignItems:'flex-end',paddingBottom:24,borderBottom:'1px solid var(--border)'},
 overline:{fontSize:9,fontWeight:900,letterSpacing:'.18em',textTransform:'uppercase',color:'var(--track-b)'},
 h1:{margin:'8px 0 0',fontSize:'clamp(42px,7vw,78px)',lineHeight:.9,letterSpacing:'-.075em',maxWidth:'11ch'},
 lede:{margin:'15px 0 0',maxWidth:'64ch',fontSize:13,lineHeight:1.65,color:'var(--text-muted)'},
 button:{border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',borderRadius:10,padding:'10px 13px',fontWeight:850,cursor:'pointer'},
 searchRow:{display:'flex',alignItems:'center',gap:12,padding:'16px 0'},
 input:{flex:1,minWidth:0,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:11,color:'var(--text)',padding:'12px 13px',fontSize:12},
 count:{fontSize:9,fontWeight:900,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-subtle)'},
 error:{padding:12,border:'1px solid rgba(255,120,120,.28)',borderRadius:11,color:'#ffadad',fontSize:11,marginBottom:12},
 layout:{display:'grid',gridTemplateColumns:'330px minmax(0,1fr)',gap:14,alignItems:'start'},
 sidebar:{border:'1px solid var(--border)',borderRadius:16,background:'var(--surface)',padding:10,maxHeight:'70vh',overflow:'auto'},
 job:{display:'block',width:'100%',textAlign:'left',padding:13,marginBottom:8,border:'1px solid var(--border)',borderRadius:12,background:'transparent',color:'var(--text)',cursor:'pointer'},
 jobActive:{borderColor:'var(--track-b)',background:'var(--surface-2)'},
 jobMeta:{display:'flex',justifyContent:'space-between',fontSize:8,fontWeight:900,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--text-subtle)'},
 jobTitle:{display:'block',marginTop:7,fontSize:12,lineHeight:1.35},jobDate:{display:'block',marginTop:7,fontSize:9,color:'var(--text-subtle)'},
 main:{minWidth:0},selectedMeta:{fontSize:9,fontWeight:900,letterSpacing:'.14em',textTransform:'uppercase',color:'var(--track-b)'},h2:{margin:'7px 0 4px',fontSize:'clamp(26px,4vw,42px)',letterSpacing:'-.05em',lineHeight:1},date:{fontSize:10,color:'var(--text-subtle)',marginBottom:18},
 stack:{display:'grid',gap:11},card:{padding:16,border:'1px solid var(--border)',borderRadius:15,background:'var(--surface)'},hero:{borderColor:'rgba(212,175,55,.33)',background:'linear-gradient(135deg,rgba(212,175,55,.09),var(--surface))'},subtle:{background:'var(--surface-2)'},kicker:{fontSize:9,fontWeight:900,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text-subtle)'},cardBody:{marginTop:8,fontSize:12,lineHeight:1.65},copy:{margin:0,color:'var(--text-muted)',lineHeight:1.65},nested:{display:'grid',gap:6},object:{display:'grid',gap:10},field:{display:'grid',gridTemplateColumns:'170px minmax(0,1fr)',gap:12,paddingBottom:8,borderBottom:'1px solid var(--border)'},fieldLabel:{fontSize:10,fontWeight:800,color:'var(--text-muted)'},fieldValue:{minWidth:0,color:'var(--text)'},list:{display:'grid',gap:7},listItem:{padding:10,borderRadius:9,background:'var(--surface-2)',border:'1px solid var(--border)'},link:{color:'var(--track-b)',wordBreak:'break-all'},details:{border:'1px solid var(--border)',borderRadius:14,padding:13,background:'var(--surface)'},summary:{cursor:'pointer',fontSize:10,fontWeight:850,color:'var(--text-muted)'},raw:{margin:'10px 0 0',maxHeight:560,overflow:'auto',whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:10,lineHeight:1.55,color:'var(--text-muted)',fontFamily:'var(--mono)'},empty:{padding:18,color:'var(--text-muted)',fontSize:11},emptyMain:{minHeight:'58vh',display:'grid',placeItems:'center',alignContent:'center',textAlign:'center',padding:30,color:'var(--text-muted)'},bigMark:{width:52,height:52,margin:'0 auto 12px',display:'grid',placeItems:'center',borderRadius:15,background:'#ddd9cc',color:'#171717',fontSize:20,fontWeight:950}
};
