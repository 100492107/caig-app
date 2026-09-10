import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import EnterpriseShell from './EnterpriseShell.jsx';

const ACTIVE_JOB_STATES = ['queued', 'processing', 'ready', 'scheduled', 'publishing'];
const FAILURE_STATES = ['error', 'failed', 'blocked'];

function money(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
}

function ageLabel(lastSeen) {
  if (!lastSeen) return 'No heartbeat';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(lastSeen).getTime()) / 1000));
  return seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`;
}

async function readCommandState() {
  const [revenue, metrics, queue, jobs, heartbeat] = await Promise.all([
    supabase.from('track_a_revenue_events').select('value,event_type').order('created_at', { ascending: false }).limit(1000),
    supabase.from('track_b_content_metrics').select('revenue,winner').order('captured_at', { ascending: false }).limit(1000),
    supabase.from('content_queue').select('id,status,content_label,scheduled_date,scheduled_time').order('created_at', { ascending: false }).limit(250),
    supabase.from('local_ai_jobs').select('id,status,job_type,created_at').order('created_at', { ascending: false }).limit(250),
    supabase.from('local_ai_worker_heartbeat').select('status,last_seen,current_job_type,model,hostname').eq('id', 'qwen').maybeSingle(),
  ]);

  const q = queue.data || [];
  const j = jobs.data || [];
  const m = metrics.data || [];
  const r = revenue.data || [];
  const lastSeen = heartbeat.data?.last_seen ? new Date(heartbeat.data.last_seen).getTime() : 0;
  const aiOnline = Boolean(lastSeen && Date.now() - lastSeen < 20000);
  const failedJobs = j.filter((x) => FAILURE_STATES.includes(String(x.status))).length + q.filter((x) => FAILURE_STATES.includes(String(x.status))).length;
  const activeJobs = j.filter((x) => ACTIVE_JOB_STATES.includes(String(x.status))).length + q.filter((x) => ACTIVE_JOB_STATES.includes(String(x.status))).length;
  const published = q.filter((x) => String(x.status) === 'published').length;
  const winners = m.filter((x) => x.winner === true).length;
  const recoveryValue = r.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const contentReturn = m.reduce((sum, row) => sum + Number(row.revenue || 0), 0);

  let next = { label: 'Remake a winner', href: '/content/remake', reason: 'Create the next evidence-backed package.' };
  if (!aiOnline) next = { label: 'Bring local AI online', href: '/system', reason: 'The production engine cannot complete queued AI work while the worker is offline.' };
  else if (failedJobs) next = { label: 'Resolve blocked work', href: '/system', reason: `${failedJobs} job state${failedJobs === 1 ? '' : 's'} need attention.` };
  else if (activeJobs) next = { label: 'Finish the moving work', href: '/content/production', reason: `${activeJobs} job${activeJobs === 1 ? '' : 's'} are already in the pipeline.` };
  else if (published && !m.length) next = { label: 'Measure the latest asset', href: '/content/measurement', reason: 'Published work has no captured performance yet.' };
  else if (published && winners) next = { label: 'Remake the latest winner', href: '/content/remake', reason: 'Use measured evidence to compound the next package.' };

  return {
    recoveryValue, contentReturn, winners, published,
    queued: j.filter((x) => ['queued', 'ready'].includes(String(x.status))).length,
    processing: j.filter((x) => ['processing'].includes(String(x.status))).length,
    failed: failedJobs, activeJobs, aiOnline, lastSeen,
    currentJobType: heartbeat.data?.current_job_type || null,
    model: heartbeat.data?.model || null,
    hostname: heartbeat.data?.hostname || null,
    next,
  };
}

export default function CommandHome() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    let timer;
    const load = async () => {
      try {
        const next = await readCommandState();
        if (live) { setData(next); setError(''); }
      } catch (e) {
        if (live) setError(e?.message || String(e));
      }
    };
    load();
    timer = window.setInterval(load, 15000);
    return () => { live = false; window.clearInterval(timer); };
  }, []);

  const state = data || {
    recoveryValue: 0, contentReturn: 0, winners: 0, published: 0, queued: 0, processing: 0, failed: 0,
    activeJobs: 0, aiOnline: false, lastSeen: null, currentJobType: null, model: null, hostname: null,
    next: { label: 'Loading command state', href: '/system', reason: 'Reading the live operating system.' },
  };
  const queueStatus = state.failed ? 'BLOCKED' : state.activeJobs ? 'MOVING' : 'IDLE';
  const systemStatus = state.aiOnline ? 'ONLINE' : 'OFFLINE';
  const nextTone = useMemo(() => state.failed || !state.aiOnline ? 'attention' : 'normal', [state.failed, state.aiOnline]);

  return (
    <EnterpriseShell active="command" eyebrow="Command">
      <main className="command-dashboard">
        <style>{`
          .command-dashboard{padding-top:6px}
          .cmd-hero{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(300px,.45fr);gap:12px}
          .cmd-intro,.cmd-next-card{border:1px solid var(--border);background:var(--surface);border-radius:20px}
          .cmd-intro{padding:clamp(24px,4vw,44px)}
          .cmd-kicker{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-subtle);font-weight:850}
          .cmd-title{margin:11px 0 0;max-width:10ch;font-size:clamp(44px,7vw,82px);line-height:.9;letter-spacing:-.075em}
          .cmd-copy{max-width:64ch;margin:18px 0 0;color:var(--text-muted);font-size:14px;line-height:1.55}
          .cmd-next-card{padding:22px;display:flex;flex-direction:column;justify-content:space-between}
          .cmd-label{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--text-subtle);font-weight:850}
          .cmd-next-card h2{margin:12px 0 0;font-size:29px;line-height:1;letter-spacing:-.055em}
          .cmd-next-card p{margin:9px 0 0;color:var(--text-muted);font-size:11px;line-height:1.5}
          .cmd-next-card a{margin-top:20px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 14px;border-radius:11px;background:#ddd9cc;color:#171717;text-decoration:none;font-size:10px;font-weight:900}
          .cmd-next-card.attention{border-color:rgba(210,160,160,.35);background:linear-gradient(145deg,rgba(210,160,160,.07),var(--surface) 50%)}
          .cmd-section{margin-top:12px;border:1px solid var(--border);background:var(--surface);border-radius:18px;padding:20px}
          .cmd-section-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:14px}.cmd-section-head span:first-child{font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:var(--text-subtle);font-weight:850}.cmd-section-head span:last-child{font-size:9px;color:var(--text-subtle)}
          .cmd-values{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
          .cmd-value{min-height:116px;padding:15px;border:1px solid var(--border);border-radius:14px;background:var(--surface-2)}
          .cmd-value.gold{border-color:rgba(212,181,106,.28);background:linear-gradient(150deg,rgba(212,181,106,.08),var(--surface-2))}
          .cmd-value strong{display:block;font-size:26px;line-height:1;letter-spacing:-.045em}.cmd-value span{display:block;margin-top:7px;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-subtle)}.cmd-value small{display:block;margin-top:13px;color:var(--text-muted);font-size:10px;line-height:1.4}
          .cmd-flow{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}.cmd-flow a{padding:13px 9px;border:1px solid var(--border);border-radius:11px;color:var(--text);text-align:center;text-decoration:none;font-size:10px;font-weight:820}.cmd-flow a:hover{background:var(--surface-2);border-color:rgba(212,181,106,.35)}
          .cmd-flow-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:9px}.cmd-mini{padding:11px 12px;border:1px solid var(--border);border-radius:11px}.cmd-mini b{display:block;font-size:17px;letter-spacing:-.03em}.cmd-mini span{display:block;margin-top:4px;font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-subtle)}
          .cmd-bottom{display:grid;grid-template-columns:1fr 1fr;gap:12px}
          .cmd-health{display:grid;gap:0}.cmd-health-row{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--border);font-size:11px}.cmd-health-row:last-child{border-bottom:0}.cmd-health-row span{color:var(--text-muted)}.cmd-health-row strong{font-size:9px;letter-spacing:.1em}.ok{color:var(--success)}.bad{color:#d5a5a5}
          .cmd-system-note{margin-top:14px;padding:11px 12px;border:1px solid var(--border);border-radius:11px;color:var(--text-muted);font-size:10px;line-height:1.45}
          .cmd-error{margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid rgba(210,160,160,.25);color:#d9b2b2;font-size:10px}
          @media(max-width:950px){.cmd-hero{grid-template-columns:1fr}.cmd-bottom{grid-template-columns:1fr}}
          @media(max-width:780px){.cmd-values{grid-template-columns:1fr}.cmd-flow{grid-template-columns:repeat(3,1fr)}.cmd-flow-meta{grid-template-columns:1fr 1fr}}
          @media(max-width:520px){.cmd-flow{grid-template-columns:1fr 1fr}.cmd-flow-meta{grid-template-columns:1fr}.cmd-section{padding:16px}}
        `}</style>

        <section className="cmd-hero">
          <div className="cmd-intro">
            <div className="cmd-kicker">Cornerstone · command</div>
            <h1 className="cmd-title">See the business. Pick the move.</h1>
            <p className="cmd-copy">Command is not another workspace. It is the control plane above Revenue, Content, Operator and System. Value tells you whether the engines are returning money. Flow tells you what is moving. Health tells you whether the system can execute.</p>
          </div>
          <aside className={`cmd-next-card ${nextTone}`}>
            <div><div className="cmd-label">NEXT · one best action</div><h2>{state.next.label}</h2><p>{state.next.reason}</p></div>
            <a href={state.next.href}>Do it <span>→</span></a>
          </aside>
        </section>

        <section className="cmd-section">
          <div className="cmd-section-head"><span>VALUE</span><span>Revenue / recovery / content return</span></div>
          <div className="cmd-values">
            <div className="cmd-value gold"><strong>{money(state.recoveryValue)}</strong><span>Revenue recovery logged</span><small>Track A events recorded as value recovered or recovered opportunity.</small></div>
            <div className="cmd-value gold"><strong>{money(state.contentReturn)}</strong><span>Content return</span><small>Revenue captured against measured Track B content.</small></div>
            <div className="cmd-value"><strong>{state.winners}</strong><span>Measured winners</span><small>Performance records marked as winners by the operator.</small></div>
          </div>
        </section>

        <section className="cmd-section">
          <div className="cmd-section-head"><span>FLOW</span><span>Jobs / production / publish</span></div>
          <div className="cmd-flow">
            <a href="/content/remake">Remake</a><a href="/content/creators">Creators</a><a href="/content/profiles">Profiles</a><a href="/content/production">Production</a><a href="/content/publish">Publish</a><a href="/content/measurement">Measure</a>
          </div>
          <div className="cmd-flow-meta">
            <div className="cmd-mini"><b>{state.queued}</b><span>Queued</span></div>
            <div className="cmd-mini"><b>{state.processing}</b><span>Processing</span></div>
            <div className="cmd-mini"><b>{state.published}</b><span>Published</span></div>
            <div className="cmd-mini"><b>{state.activeJobs}</b><span>Active work</span></div>
          </div>
        </section>

        <div className="cmd-bottom">
          <section className="cmd-section">
            <div className="cmd-section-head"><span>HEALTH</span><span>AI / queue / errors / dependencies</span></div>
            <div className="cmd-health">
              <div className="cmd-health-row"><span>Local AI</span><strong className={state.aiOnline ? 'ok' : 'bad'}>{systemStatus}</strong></div>
              <div className="cmd-health-row"><span>Queue</span><strong className={state.failed ? 'bad' : 'ok'}>{queueStatus}</strong></div>
              <div className="cmd-health-row"><span>Errors</span><strong className={state.failed ? 'bad' : 'ok'}>{state.failed ? `${state.failed} BLOCKED` : 'CLEAR'}</strong></div>
              <div className="cmd-health-row"><span>Heartbeat</span><strong>{ageLabel(state.lastSeen)}</strong></div>
            </div>
            <div className="cmd-system-note">{state.currentJobType ? `Worker is handling ${state.currentJobType}.` : state.aiOnline ? 'Local worker is online and waiting for work.' : 'Start the local stack on the operator machine to process Qwen jobs.'} <a href="/system" style={{ color:'inherit' }}>Open System →</a></div>
          </section>
          <section className="cmd-section">
            <div className="cmd-section-head"><span>CONTROL RULE</span><span>What Command should do</span></div>
            <div style={{fontSize:18,lineHeight:1.1,letterSpacing:'-.04em'}}>Reduce decisions.<br/>Expose constraints.<br/>Point to the next move.</div>
            <p style={{margin:'16px 0 0',color:'var(--text-muted)',fontSize:11,lineHeight:1.55}}>The detailed work belongs inside Content or Revenue. System exists to make failures visible. Operator remains the execution layer outside this application.</p>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:15}}><a href="/content" className="cmd-flow a" style={{display:'inline-block',padding:'10px 12px',border:'1px solid var(--border)',borderRadius:9,color:'var(--text)',textDecoration:'none',fontSize:10,fontWeight:800}}>Content</a><a href="/revenue" style={{display:'inline-block',padding:'10px 12px',border:'1px solid var(--border)',borderRadius:9,color:'var(--text)',textDecoration:'none',fontSize:10,fontWeight:800}}>Revenue</a><a href="/system" style={{display:'inline-block',padding:'10px 12px',border:'1px solid var(--border)',borderRadius:9,color:'var(--text)',textDecoration:'none',fontSize:10,fontWeight:800}}>System</a></div>
          </section>
        </div>
        {error && <div className="cmd-error">Command could not refresh: {error}</div>}
      </main>
    </EnterpriseShell>
  );
}
