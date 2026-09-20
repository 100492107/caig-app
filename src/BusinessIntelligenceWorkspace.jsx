import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';
import EnterpriseShell from './EnterpriseShell.jsx';

const money=v=>v==null?'—':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(Number(v||0));
const num=v=>v==null?'—':new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(Number(v||0));
const pct=v=>v==null?'—':(Number(v)*100).toFixed(1)+'%';
const date=v=>v?new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';
const latestBy=(rows,key)=>{const m=new Map(); for(const r of rows){const k=r[key]||'business'; if(!m.has(k))m.set(k,r)} return [...m.values()]};

const DOCS=[
 ['financial','P&L statements','Last 3–5 years','Verify revenue, gross profit, add-backs and recurring costs.'],
 ['financial','Balance sheets','Last 3 years','Verify assets, liabilities, debt and working capital.'],
 ['financial','Cash flow statements','Last 3 years','Reconcile operating cash generation and financing.'],
 ['financial','Business tax returns','Last 3 years','Cross-check declared revenue and taxable profit.'],
 ['financial','Bank statements','Monthly','Reconcile deposits to recorded revenue.'],
 ['legal','Articles / incorporation documents','Current','Confirm entity and registration.'],
 ['legal','Operating / shareholder agreement','Current','Confirm ownership, rights and restrictions.'],
 ['legal','Cap table','Current','Confirm equity ownership percentages.'],
 ['legal','Litigation disclosures','Current','Check claims, liens and material disputes.'],
 ['contracts','Customer contracts','Current','Check terms, renewals, assignability and concentration.'],
 ['contracts','Vendor agreements','Current','Check obligations, pricing and termination.'],
 ['contracts','Lease agreement','Current','Check term, renewal and assignment if applicable.'],
 ['contracts','Employment agreements','Current','Check key-person dependency, restrictions and obligations.'],
 ['ip','Trademark / domain registrations','Current','Confirm the business owns the brand assets.'],
 ['ip','Software / technology documentation','Current','Confirm proprietary systems and access.'],
 ['ip','IP assignment agreements','Current','Confirm founders and contractors assigned IP to the entity.'],
 ['customer','Customer reference log','Current','Record current and churned customer checks.'],
];

function Status({ok}){return <span className={'bi-status '+(ok?'ok':'')}>{ok?'Verified':'Needs evidence'}</span>}

export default function BusinessIntelligenceWorkspace(){
 const [tab,setTab]=useState('overview'),[metrics,setMetrics]=useState([]),[docs,setDocs]=useState([]),[evidence,setEvidence]=useState([]),[pubs,setPubs]=useState([]),[subs,setSubs]=useState([]),[creators,setCreators]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[uploading,setUploading]=useState(false),[selectedDoc,setSelectedDoc]=useState(null);

 async function load(){
   setLoading(true);
   const rs=await Promise.all([
     supabase.from('cornerstone_metric_snapshots').select('*').order('snapshot_date',{ascending:false}).limit(500),
     supabase.from('cornerstone_documents').select('*').order('updated_at',{ascending:false}).limit(500),
     supabase.from('track_b_performance_evidence').select('*').order('created_at',{ascending:false}).limit(500),
     supabase.from('track_b_publications').select('*').order('published_at',{ascending:false}).limit(500),
     supabase.from('subscriber_memory').select('id,persona_id,platform,lifetime_spend,created_at,updated_at').order('updated_at',{ascending:false}).limit(500),
     supabase.from('creators').select('name,handle,platform,follower_count,is_active').order('name')
   ]);
   const bad=rs.find(r=>r.error); if(bad){setError(bad.error.message);setLoading(false);return}
   setMetrics(rs[0].data||[]);setDocs(rs[1].data||[]);setEvidence(rs[2].data||[]);setPubs(rs[3].data||[]);setSubs(rs[4].data||[]);setCreators(rs[5].data||[]);setLoading(false);
 }
 useEffect(()=>{load()},[]);

 const business=useMemo(()=>latestBy(metrics,'scope').find(x=>x.scope==='business')||null,[metrics]);
 const platforms=useMemo(()=>latestBy(metrics.filter(x=>x.scope==='platform'),'platform'),[metrics]);
 const creatorsM=useMemo(()=>latestBy(metrics.filter(x=>x.scope==='creator'),'creator_id'),[metrics]);
 const measuredRevenue=useMemo(()=>evidence.reduce((n,x)=>n+Number(x.revenue||0),0),[evidence]);
 const paidSubs=useMemo(()=>platforms.reduce((n,x)=>n+Number(x.paid_subscribers||0),0),[platforms]);
 const totalSubs=useMemo(()=>platforms.reduce((n,x)=>n+Number(x.subscribers||0),0),[platforms]);
 const totalFollowers=useMemo(()=>platforms.reduce((n,x)=>n+Number(x.audience_followers||0),0),[platforms]);
 const verifiedDocs=docs.filter(d=>d.verified).length;
 const missingDocs=DOCS.filter(([c,t])=>!docs.some(d=>d.category===c&&d.document_type===t&&['received','verified'].includes(d.status))).length;

 async function upload(e){
   const f=e.target.files?.[0]; if(!f)return;
   setUploading(true);setError('');
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){setError('You need to be signed in to upload documents.');setUploading(false);return}
   const type=document.querySelector('[data-doc-type]')?.value||'Business document';
   const category=document.querySelector('[data-doc-category]')?.value||'other';
   const path=user.id+'/'+crypto.randomUUID()+'-'+f.name.replace(/[^a-zA-Z0-9._-]/g,'_');
   const up=await supabase.storage.from('cornerstone-documents').upload(path,f,{upsert:false});
   if(up.error){setError(up.error.message);setUploading(false);return}
   const ins=await supabase.from('cornerstone_documents').insert({owner_id:user.id,category,document_type:type,title:f.name,status:'received',filename:f.name,mime_type:f.type,size_bytes:f.size,storage_path:path}).select().single();
   if(ins.error){await supabase.storage.from('cornerstone-documents').remove([path]);setError(ins.error.message)}else await load();
   setUploading(false);e.target.value='';
 }

 async function seedRequest(item){
   const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
   const [category,type,period,notes]=item;
   await supabase.from('cornerstone_documents').insert({owner_id:user.id,category,document_type:type,title:type,status:'requested',notes:period+' — '+notes});
   await load();
 }

 const kpis=[
   ['Cash / verified cash',money(business?.cash_balance),'Latest verified business snapshot'],
   ['Revenue / period',money(business?.revenue),'Accounting or platform source'],
   ['Gross margin',business?.revenue!=null&&business?.cogs!=null?pct((Number(business.revenue)-Number(business.cogs))/Number(business.revenue)):'—','Revenue less COGS'],
   ['Net margin',business?.revenue!=null&&business?.operating_expenses!=null?pct((Number(business.revenue)-Number(business.cogs||0)-Number(business.operating_expenses||0))/Number(business.revenue)):'—','Operating profitability'],
   ['Monthly burn',money(business?.monthly_burn),'Latest verified business snapshot'],
   ['Runway',business?.cash_balance!=null&&business?.monthly_burn>0?(Number(business.cash_balance)/Number(business.monthly_burn)).toFixed(1)+' mo':'—','Cash balance ÷ monthly burn'],
   ['LTV : CAC',business?.cac&&business?.ltv?(Number(business.ltv)/Number(business.cac)).toFixed(1)+'×':'—','Customer economics'],
   ['Current ratio',business?.current_assets!=null&&business?.current_liabilities? (Number(business.current_assets)/Number(business.current_liabilities)).toFixed(2)+'×':'—','Current assets ÷ liabilities'],
 ];

 return <EnterpriseShell active="business" eyebrow="Business Intelligence">
   <main className="bi">
    <header className="bi-head">
      <div><div className="bi-k">Business Intelligence / Evidence Room</div><h1>Know what the business is actually doing.</h1><p>One place for money, audience, operating performance and the documents behind every material claim. Blank means unknown—not zero.</p></div>
      <div className="bi-head-meta"><b>{loading?'Refreshing…':date(business?.snapshot_date)}</b><span>Latest business snapshot</span><small>{verifiedDocs} verified documents · {missingDocs} checklist gaps</small></div>
    </header>

    <nav className="bi-tabs">{[['overview','Overview'],['financial','Financial'],['audience','Audience'],['operations','Operations'],['documents','Documents'],['validation','Validation']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>

    {error&&<div className="bi-error">{error}</div>}

    {tab==='overview'&&<section>
      <div className="bi-kpis">{kpis.map(([a,b,c])=><article key={a}><span>{a}</span><strong>{b}</strong><small>{c}</small></article>)}</div>
      <div className="bi-grid2">
       <article className="bi-panel"><div className="bi-panel-head"><b>Money in</b><span>Measured evidence + verified snapshots</span></div><div className="bi-big">{money(measuredRevenue+Number(business?.revenue||0))}</div><p className="bi-muted">Performance evidence: {money(measuredRevenue)} · Latest business snapshot: {money(business?.revenue)}</p><div className="bi-rule">Revenue is only treated as verified when it has a source. Platform performance and accounting revenue stay separate until reconciled.</div></article>
       <article className="bi-panel"><div className="bi-panel-head"><b>Audience</b><span>Latest recorded platform state</span></div><div className="bi-audience-grid"><div><strong>{num(totalFollowers)}</strong><span>Followers</span></div><div><strong>{num(totalSubs)}</strong><span>Subscribers</span></div><div><strong>{num(paidSubs)}</strong><span>Paid subscribers</span></div><div><strong>{money(subs.reduce((n,x)=>n+Number(x.lifetime_spend||0),0))}</strong><span>Subscriber spend</span></div></div><a className="bi-link" onClick={()=>setTab('audience')}>Open audience ledger →</a></article>
      </div>
      <article className="bi-panel"><div className="bi-panel-head"><b>Evidence health</b><span>Is the business documented?</span></div><div className="bi-health"><div><strong>{verifiedDocs}</strong><span>Verified docs</span></div><div><strong>{docs.length}</strong><span>Uploaded / requested</span></div><div><strong>{missingDocs}</strong><span>Checklist gaps</span></div><div><strong>{evidence.length}</strong><span>Performance records</span></div><div><strong>{pubs.filter(x=>x.published_at).length}</strong><span>Published records</span></div></div></article>
    </section>}

    {tab==='financial'&&<section>
      <div className="bi-section-title"><div><div className="bi-k">Financial health</div><h2>Profitability, cash and unit economics</h2></div><button className="bi-primary" onClick={()=>setTab('documents')}>Add source document</button></div>
      <div className="bi-kpis">{kpis.slice(0,8).map(([a,b,c])=><article key={a}><span>{a}</span><strong>{b}</strong><small>{c}</small></article>)}</div>
      <div className="bi-grid2"><article className="bi-panel"><div className="bi-panel-head"><b>Latest financial snapshot</b><span>{business?date(business.snapshot_date):'No verified snapshot'}</span></div><div className="bi-table">{[['Revenue',money(business?.revenue)],['COGS',money(business?.cogs)],['Operating expenses',money(business?.operating_expenses)],['Cash balance',money(business?.cash_balance)],['Receivables',money(business?.receivables)],['Debt',money(business?.debt)],['Current assets',money(business?.current_assets)],['Current liabilities',money(business?.current_liabilities)]].map(r=><div key={r[0]}><span>{r[0]}</span><b>{r[1]}</b></div>)}</div></article><article className="bi-panel"><div className="bi-panel-head"><b>Customer economics</b><span>Only shown when source data exists</span></div><div className="bi-table">{[['CAC',money(business?.cac)],['LTV',money(business?.ltv)],['Churn',pct(business?.churn_rate)],['Customers',num(business?.customer_count)],['New customers',num(business?.new_customers)],['DSO',business?.dso_days==null?'—':Number(business.dso_days).toFixed(1)+' days'],['Revenue / employee',business?.employee_count&&business?.revenue?money(Number(business.revenue)/Number(business.employee_count)):'—'],['Employees',num(business?.employee_count)]].map(r=><div key={r[0]}><span>{r[0]}</span><b>{r[1]}</b></div>)}</div></article></div>
    </section>}

    {tab==='audience'&&<section>
      <div className="bi-section-title"><div><div className="bi-k">Audience & monetisation</div><h2>Subscribers, followers and money by platform</h2></div></div>
      <div className="bi-platforms">{platforms.length?platforms.map(p=><article key={p.id}><div><b>{p.platform||'Platform'}</b><Status ok={p.verified}/></div><div className="bi-platform-grid"><span><strong>{num(p.audience_followers)}</strong>followers</span><span><strong>{num(p.subscribers)}</strong>subscribers</span><span><strong>{num(p.paid_subscribers)}</strong>paid</span><span><strong>{money(p.revenue)}</strong>revenue</span></div><small>Captured {date(p.captured_at)} · {p.source_name||p.source_type}</small></article>):<div className="bi-empty">No platform snapshots recorded yet. Connectors may exist, but a connector is not the same as a verified metric. Record the latest platform numbers here or wire the platform API into this ledger.</div>}</div>
      <div className="bi-grid2"><article className="bi-panel"><div className="bi-panel-head"><b>Owned creators</b><span>Current database records</span></div>{creators.length?creators.map(c=><div className="bi-listrow" key={c.name}><div><b>{c.name}</b><span>{c.handle||'No handle'} · {c.platform||'Platform not set'}</span></div><strong>{num(c.follower_count)} followers</strong></div>):<div className="bi-empty">No creator records.</div>}</article><article className="bi-panel"><div className="bi-panel-head"><b>Subscriber memory</b><span>Private operational data</span></div><div className="bi-big">{num(subs.length)}</div><p className="bi-muted">Known subscriber records. Lifetime spend currently totals {money(subs.reduce((n,x)=>n+Number(x.lifetime_spend||0),0))}.</p></article></div>
    </section>}

    {tab==='operations'&&<section>
      <div className="bi-section-title"><div><div className="bi-k">Operational quality</div><h2>Can the machine run without guesswork?</h2></div></div>
      <div className="bi-kpis">{[['Published',num(pubs.filter(x=>x.published_at).length),'Publication records'],['Performance records',num(evidence.length),'Measured outcomes'],['Winners',num(evidence.filter(x=>x.winner).length),'Explicitly proven patterns'],['Revenue evidence',money(measuredRevenue),'Performance-linked revenue'],['Customer records',num(business?.customer_count),'Latest snapshot'],['DSO',business?.dso_days==null?'—':Number(business.dso_days).toFixed(1)+' days','Receivables collection time']].map(([a,b,c])=><article key={a}><span>{a}</span><strong>{b}</strong><small>{c}</small></article>)}</div>
      <article className="bi-panel"><div className="bi-panel-head"><b>Recent performance evidence</b><span>Nothing is inferred from views alone</span></div>{evidence.length?evidence.slice(0,12).map(e=><div className="bi-listrow" key={e.id}><div><b>{e.title||'Untitled result'}</b><span>{e.platform} · {date(e.published_at||e.created_at)} · {num(e.views)} views · {num(e.conversions)} conversions</span></div><strong>{money(e.revenue)} {e.winner?'· WINNER':''}</strong></div>):<div className="bi-empty">No performance evidence has been captured yet.</div>}</article>
    </section>}

    {tab==='documents'&&<section>
      <div className="bi-section-title"><div><div className="bi-k">Evidence room</div><h2>Documents behind the numbers</h2><p>Private files live in Supabase Storage. Each record has an evidence status and can later become the source for a metric snapshot.</p></div></div>
      <div className="bi-upload">
        <div><b>Add a document</b><span>PDF, CSV, XLSX, DOCX and other business records</span></div>
        <select data-doc-category defaultValue="financial">{['financial','legal','contracts','operations','ip','customer','other'].map(x=><option key={x}>{x}</option>)}</select>
        <select data-doc-type defaultValue="Business document"><option>Business document</option>{DOCS.map(x=><option key={x[1]}>{x[1]}</option>)}</select>
        <label className="bi-primary">{uploading?'Uploading…':'Upload file'}<input type="file" onChange={upload} disabled={uploading}/></label>
      </div>
      <div className="bi-doc-grid">{DOCS.map(item=>{const found=docs.find(d=>d.category===item[0]&&d.document_type===item[1]);return <article key={item[1]} className={found?'has':'missing'}><div><span>{item[0]}</span><Status ok={found?.verified}/></div><h3>{item[1]}</h3><p>{item[3]}</p><small>{found?found.status+' · '+date(found.created_at):'Not received'} · {item[2]}</small><button onClick={()=>found?setSelectedDoc(found):seedRequest(item)}>{found?'View record':'Request / mark expected'}</button></article>})}</div>
      {docs.length>0&&<article className="bi-panel"><div className="bi-panel-head"><b>Document ledger</b><span>{docs.length} records</span></div>{docs.map(d=><div className="bi-listrow" key={d.id}><div><b>{d.title}</b><span>{d.category} · {d.document_type} · {d.status}</span></div><strong>{d.verified?'Verified':date(d.created_at)}</strong></div>)}</article>}
    </section>}

    {tab==='validation'&&<section>
      <div className="bi-section-title"><div><div className="bi-k">Validation protocol</div><h2>What still needs to be proven?</h2></div></div>
      <div className="bi-validation">{[
        ['Reconcile revenue','Match bank deposits to invoices / platform payouts line by line.','financial'],
        ['Blind customer references','Speak to 3–5 current customers and at least 2 churned accounts.','customer'],
        ['Key-person dependency','Document whether the business can operate independently for 60 days.','operations'],
        ['Ownership','Confirm entity ownership of equity, domains, trademarks, software and creator assets.','legal'],
        ['Concentration risk','Measure revenue by customer and flag material dependency.','financial'],
        ['Contract transferability','Check expiry, renewal, NDA/non-compete and assignment clauses.','contracts'],
      ].map(([a,b,c])=><article key={a}><div><b>{a}</b><Status ok={docs.some(d=>d.category===c&&d.verified)}/></div><p>{b}</p><button onClick={()=>setTab('documents')}>Open evidence room →</button></article>)}</div>
    </section>}

    {selectedDoc&&<div className="bi-modal" onClick={()=>setSelectedDoc(null)}><div onClick={e=>e.stopPropagation()}><button className="bi-close" onClick={()=>setSelectedDoc(null)}>×</button><div className="bi-k">Document record</div><h2>{selectedDoc.title}</h2><p>{selectedDoc.document_type} · {selectedDoc.status}</p><div className="bi-rule">{selectedDoc.notes||'No notes recorded.'}</div><small>Uploaded {date(selectedDoc.created_at)} · {selectedDoc.verified?'Verified':'Not verified'}</small></div></div>}
   </main>
 </EnterpriseShell>
}
