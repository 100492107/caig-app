import React,{useEffect,useState} from 'react';
import {supabase} from './supabase';
import {creatorDnaFor} from '../shared/creator-dna.js';
import EnterpriseShell from './EnterpriseShell.jsx';

const FAIL=new Set(['error','failed','blocked']);
const money=v=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(Number(v||0));
const clean=v=>String(v||'').replaceAll('_',' ');
const num=v=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(Number(v||0));
const CREATOR_IMAGES={cara:'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/cara%20ref/Cara_5.jpg',lila:'https://zvyioxhwdyocaanzcgqf.supabase.co/storage/v1/object/public/lila%20ref/lila_2.jpeg'};
const age=v=>{
  if(!v)return 'No recent check-in';
  const s=Math.max(0,Math.round((Date.now()-new Date(v).getTime())/1000));
  return s<60 ? s+'s ago' : Math.round(s/60)+'m ago';
};

async function readState(){
  const [p,j,pu,e,h,l,bm,sm]=await Promise.all([
    supabase.from('track_b_content_projects').select('id,title,status,updated_at,created_at').order('updated_at',{ascending:false}).limit(200),
    supabase.from('track_b_production_jobs').select('id,project_id,mode,status,updated_at,created_at').order('updated_at',{ascending:false}).limit(200),
    supabase.from('track_b_publications').select('id,project_id,title,platform,status,scheduled_at,published_at,updated_at,created_at').order('updated_at',{ascending:false}).limit(200),
    supabase.from('track_b_performance_evidence').select('id,title,revenue,winner,publication_id,operator_note,created_at').order('created_at',{ascending:false}).limit(200),
    supabase.from('local_ai_worker_heartbeat').select('status,last_seen,current_job_type').eq('id','qwen').maybeSingle(),
    supabase.from('track_b_learning_recommendations').select('id,recommendation_type,format,invariant_pattern,confidence,status,source_evidence_id,created_at').eq('status','active').order('created_at',{ascending:false}).limit(20),
    supabase.from('cornerstone_metric_snapshots').select('scope,platform,audience_followers,subscribers,paid_subscribers,revenue,captured_at,verified').order('snapshot_date',{ascending:false}).limit(200),
    supabase.from('subscriber_memory').select('id,lifetime_spend,platform').limit(1000)
  ]);
  for(const r of [p,j,pu,e,h,l,bm,sm]) if(r.error) throw r.error;
  const projects=p.data||[],jobs=j.data||[],pubs=pu.data||[],evidence=e.data||[],hb=h.data||{},learning=l.data||[],metricSnapshots=bm.data||[],subscriberRows=sm.data||[];
  const fresh=Boolean(hb.last_seen&&Date.now()-new Date(hb.last_seen).getTime()<90000);
  const online=fresh&&String(hb.status||'').toLowerCase()!=='offline';
  const failed=[...jobs.filter(x=>FAIL.has(String(x.status))),...pubs.filter(x=>FAIL.has(String(x.status)))];
  const production=jobs.filter(x=>['queued','processing','review','in_production'].includes(String(x.status)));
  const scheduled=pubs.filter(x=>x.status==='scheduled');
  const published=pubs.filter(x=>['published','live'].includes(String(x.status)));
  const winners=evidence.filter(x=>x.winner===true);
  const revenue=evidence.reduce((n,x)=>n+Number(x.revenue||0),0);
  const latestMetric=(scope,platform=null)=>metricSnapshots.find(x=>x.scope===scope&&(platform?x.platform===platform:true));
  const latestBusiness=latestMetric('business');
  const platformMetrics=[...new Set(metricSnapshots.filter(x=>x.scope==='platform').map(x=>x.platform).filter(Boolean))].map(platform=>latestMetric('platform',platform)).filter(Boolean);
  const followers=platformMetrics.reduce((n,x)=>n+Number(x.audience_followers||0),0);
  const subscribers=platformMetrics.reduce((n,x)=>n+Number(x.subscribers||0),0);
  const paidSubscribers=platformMetrics.reduce((n,x)=>n+Number(x.paid_subscribers||0),0);
  const snapshotRevenue=latestBusiness?.revenue==null?0:Number(latestBusiness.revenue);
  const subscriberSpend=subscriberRows.reduce((n,x)=>n+Number(x.lifetime_spend||0),0);

  let next={
    title:'Run the first Build',
    body:'Give Cornerstone one strong reference. It will inspect the signal, extract the mechanism and build an original package.',
    href:'/content/remake',cta:'Start Build',reason:'No closed loop yet.'
  };
  if(failed.length) next={
    title:'Clear the current blocker',
    body:failed.length+' item'+(failed.length===1?' is':'s are')+' stopped. Fix the bottleneck before adding more work.',
    href:'/system',cta:'Open System',reason:'A live workflow needs attention.'
  };
  else if(!online) next={
    title:'Bring intelligence online',
    body:'The local intelligence worker has not checked in recently. New analysis is not ready to run reliably.',
    href:'/system',cta:'Check System',reason:'Cornerstone cannot build on evidence while intelligence is offline.'
  };
  else if(published.length&&evidence.length===0) next={
    title:'Close the first loop',
    body:'Something reached the market. Record what actually happened so the system can learn instead of guessing.',
    href:'/content/measurement',cta:'Record result',reason:'Published work has no measured result yet.'
  };
  else if(learning.length) next={
    title:'Compound what already worked',
    body:'A reusable learning rule exists. Use it to build the next original rather than starting from zero.',
    href:'/content/remake',cta:'Build from learning',reason:learning.length+' active learning rule'+(learning.length===1?'':'s')+' available.'
  };
  else if(production.length) next={
    title:'Finish what is already moving',
    body:production.length+' piece'+(production.length===1?' is':'s are')+' in motion. Finish current work before creating more.',
    href:'/content/production',cta:'Continue',reason:'Work already exists in production.'
  };
  else if(projects.length) next={
    title:'Put the package into production',
    body:'A saved package exists. Turn it into finished media, then let the market tell you what deserves to repeat.',
    href:'/content/production',cta:'Make it',reason:'Build is complete; Make is next.'
  };

  const recent=[...evidence.map(x=>({kind:x.winner?'Winner':'Result',title:x.title||'Performance result',when:x.created_at,href:'/content/measurement'})),
    ...pubs.map(x=>({kind:['published','live'].includes(x.status)?'Published':'Scheduled',title:x.title||'Publication',when:x.published_at||x.scheduled_at||x.updated_at,href:'/content/publish'})),
    ...projects.map(x=>({kind:'Built',title:x.title||'Piece',when:x.updated_at||x.created_at,href:'/content/remake'}))]
    .filter(x=>x.when).sort((a,b)=>new Date(b.when)-new Date(a.when)).slice(0,6);

  const makeDone=jobs.some(x=>['completed','review','in_production'].includes(String(x.status)))||pubs.length>0;
  const loop=[
    ['01','Evidence',Boolean(projects.length||jobs.length||pubs.length),'Signals in the system','/content/remake'],
    ['02','Build',Boolean(projects.length),'Original package exists','/content/remake'],
    ['03','Make',makeDone,'Finished work or production','/content/production'],
    ['04','Publish',Boolean(published.length),'In the market','/content/publish'],
    ['05','Learn',Boolean(evidence.length),'Measured evidence','/content/measurement'],
    ['06','Compound',Boolean(learning.length),'Learning feeds the next build','/content/remake'],
  ];
  const firstOpen=loop.findIndex(x=>!x[2]);

  return {
    revenue:revenue+snapshotRevenue,measuredRevenue:revenue,snapshotRevenue,followers,subscribers,paidSubscribers,subscriberSpend,packages:projects.length,inMotion:production.length+scheduled.length,published:published.length,
    winners:winners.length,online,lastSeen:hb.last_seen,currentJob:hb.current_job_type,
    failed:failed.length,queued:jobs.filter(x=>x.status==='queued').length,
    processing:jobs.filter(x=>x.status==='processing').length,recent,next,learning,
    closedLoops:evidence.length,loop,currentIndex:firstOpen<0?5:firstOpen
  };
}

export default function CommandHome(){
  const[s,setS]=useState(null),[error,setError]=useState('');
  useEffect(()=>{
    let live=true;
    const load=()=>readState().then(v=>{if(live){setS(v);setError('')}}).catch(e=>{if(live)setError(e?.message||String(e))});
    load();
    const t=setInterval(load,10000);
    return()=>{live=false;clearInterval(t)};
  },[]);

  const x=s||{
    revenue:0,measuredRevenue:0,snapshotRevenue:0,followers:0,subscribers:0,paidSubscribers:0,subscriberSpend:0,packages:0,inMotion:0,published:0,winners:0,online:false,lastSeen:null,currentJob:null,
    failed:0,queued:0,processing:0,recent:[],learning:[],closedLoops:0,currentIndex:0,
    loop:[
      ['01','Evidence',false,'Signals in the system','/content/remake'],
      ['02','Build',false,'Original package exists','/content/remake'],
      ['03','Make',false,'Finished work or production','/content/production'],
      ['04','Publish',false,'In the market','/content/publish'],
      ['05','Learn',false,'Measured evidence','/content/measurement'],
      ['06','Compound',false,'Learning feeds the next build','/content/remake']
    ],
    next:{title:'Preparing your brief',body:'Cornerstone is checking what has changed.',href:'/system',cta:'Open System',reason:'Reading current state.'}
  };

  const cara=creatorDnaFor('cara');
  const lila=creatorDnaFor('lila');
  const current=x.loop[x.currentIndex]||x.loop[0];

  return <EnterpriseShell active="command" eyebrow="Command">
    <main className="home">
      <section className="hero">
        <div>
          <div className="k">Command / Creator OS</div>
          <h1>{x.packages?'You are building an owned media system.':'Build the first loop.'}</h1>
          <p>Turn proven attention into original work, put it in the market, capture the result, and let evidence decide what happens next. Cara and Lila are owned creator assets inside the machine.</p>
          <div className="presence">
            <i className={'dot'+(x.online?'':' off')} />
            {x.online?'Intelligence ready':'Intelligence offline'} · {age(x.lastSeen)}{x.currentJob?' · '+clean(x.currentJob):''}
          </div>
        </div>
        <div className="return">
          <b>{money(x.revenue)}</b>
          <span>Revenue recorded / latest snapshot</span>
          <small style={{display:'block',marginTop:8,color:'var(--cs-os-subtle)',fontSize:9}}>Evidence {money(x.measuredRevenue)} · Accounting snapshot {money(x.snapshotRevenue)}</small>
        </div>
      </section>

      <section className="metrics">
        <div className="metric"><b>{x.packages}</b><span>Packages built</span></div>
        <div className="metric"><b>{x.inMotion}</b><span>In motion</span></div>
        <div className="metric"><b>{x.published}</b><span>In market</span></div>
        <div className="metric"><b>{x.winners}</b><span>Proven winners</span></div>
        <div className="metric"><b>{num(x.followers)}</b><span>Followers recorded</span></div>
        <div className="metric"><b>{num(x.subscribers)}</b><span>Subscribers recorded</span></div>
        <div className="metric"><b>{num(x.paidSubscribers)}</b><span>Paid subscribers</span></div>
        <div className="metric"><b>{x.closedLoops}</b><span>Closed loops</span></div>
        <div className="metric"><b>{x.learning.length}</b><span>Learning rules</span></div>
      </section>

      <section className="next">
        <div>
          <div className="k">Play / today’s mission</div>
          <h2>{x.next.title}</h2>
          <p>{x.next.body}</p>
        </div>
        <div className="next-side">
          <a className="primary" href={x.next.href}>{x.next.cta} →</a>
          <small>{x.next.reason}</small>
        </div>
      </section>

      <section className="cs-command-loop">
        <div className="cs-command-card">
          <div className="cs-command-k">The machine</div>
          <h2>Evidence becomes an asset only when it closes a loop.</h2>
          <p>The numbers below are state, not gamification. A stage turns green only when Cornerstone has real evidence that the stage happened.</p>
          <div className="cs-loop">
            {x.loop.map((step,i)=>(
              <a key={step[0]} href={step[4]} className={'cs-loop-step '+(step[2]?'is-done ':'')+(i===x.currentIndex?'is-current':'')}>
                <b>{step[0]}</b>
                <strong>{step[1]}</strong>
                <span>{step[2]?'Done':i===x.currentIndex?'Next':'Not yet'} · {step[3]}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="cs-command-card">
          <div className="cs-command-k">The rule</div>
          <h2>Do not add another idea just because the last one is unfinished.</h2>
          <p>Cornerstone prioritises blockers, current work, market results and proven learning before creating more backlog.</p>
          <a className="ghost" style={{marginTop:15}} href="/content/remake">Open Build →</a>
        </div>
      </section>

      <section className="cs-creators">
        <article className="cs-creator-card">
          <div className="cs-creator-avatar"><img src={CREATOR_IMAGES.cara} alt="Cara Whitmore reference" /></div>
          <div>
            <h3>{cara.name}</h3>
            <div className="cs-creator-meta">{cara.coreVerb} · {cara.coreNeed.split('.')[0]}</div>
            <div className="cs-creator-soul">“{cara.soul}”</div>
            <a className="cs-creator-link" href="/content/creators">Open Cara →</a>
          </div>
        </article>
        <article className="cs-creator-card">
          <div className="cs-creator-avatar"><img src={CREATOR_IMAGES.lila} alt="Lila Sterling reference" /></div>
          <div>
            <h3>{lila.name}</h3>
            <div className="cs-creator-meta">{lila.coreVerb} · {lila.coreNeed.split('.')[0]}</div>
            <div className="cs-creator-soul">“{lila.soul}”</div>
            <a className="cs-creator-link" href="/content/creators">Open Lila →</a>
          </div>
        </article>
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panel-head"><strong>What changed</strong><span>Latest evidence</span></div>
          {x.recent.length?x.recent.map((r,i)=><div className="row" key={i}>
            <div><strong>{r.title}</strong><span>{r.kind} · {new Date(r.when).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div>
            <a href={r.href}>Open</a>
          </div>):<div className="empty">Your operating history appears here as the first pieces move through the loop.</div>}
        </div>
        <div className="panel">
          <div className="panel-head"><strong>What Cornerstone is learning</strong><span>Feeds the next build</span></div>
          <div className="learn">
            {x.learning?.[0]?<>
              <span className="badge">{x.learning[0].recommendation_type} · {x.learning[0].confidence}</span>
              <h3>{x.learning[0].invariant_pattern||x.learning[0].format||'A repeatable creative pattern'}</h3>
              <p>This recommendation came from measured performance and can influence the next original package.</p>
              <div className="learn-actions">
                <a className="primary" href="/content/remake">Use learning →</a>
                <a className="ghost" href="/content/measurement">See result</a>
              </div>
            </>:<>
              <span className="badge">Waiting for evidence</span>
              <h3>Nothing proven yet.</h3>
              <p>One published result with a measured outcome is enough to start turning experience into reusable knowledge.</p>
              <div className="learn-actions"><a className="primary" href="/content/remake">Create first proof →</a></div>
            </>}
            <div className="micro">
              <div><b>{x.queued}</b><span>Queued</span></div>
              <div><b>{x.processing}</b><span>Working now</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="footer">
        <div className="foot"><b>{x.online?'Ready':'Offline'}</b><span>Intelligence</span></div>
        <div className="foot"><b>{x.failed}</b><span>Needs attention</span></div>
        <div className="foot"><b>{x.closedLoops}</b><span>Closed loops</span></div>
        <div className="foot"><b>{x.winners}</b><span>Can compound</span></div>
      </section>
      {error?<div className="error">Could not refresh the command view: {error}</div>:null}
    </main>
  </EnterpriseShell>;
}
