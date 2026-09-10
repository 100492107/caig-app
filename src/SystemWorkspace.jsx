import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import EnterpriseShell from './EnterpriseShell.jsx';

function age(lastSeen) {
  if (!lastSeen) return 'No heartbeat';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(lastSeen).getTime()) / 1000));
  return `${seconds}s ago`;
}

export default function SystemWorkspace() {
  const [state, setState] = useState({ ai: null, jobs: 0, errors: 0, lastSeen: null, currentJob: null });
  const [loading, setLoading] = useState(true);

  async function load() {
    const [heartbeat, jobs] = await Promise.all([
      supabase.from('local_ai_worker_heartbeat').select('status,last_seen,current_job_id,current_job_type,model,hostname').eq('id', 'qwen').maybeSingle(),
      supabase.from('local_ai_jobs').select('status').order('created_at', { ascending: false }).limit(100),
    ]);
    const rows = jobs.data || [];
    setState({
      ai: heartbeat.data?.status || null,
      jobs: rows.filter((x) => ['queued','processing'].includes(String(x.status))).length,
      errors: rows.filter((x) => ['error','failed'].includes(String(x.status))).length,
      lastSeen: heartbeat.data?.last_seen || null,
      currentJob: heartbeat.data?.current_job_type || null,
      model: heartbeat.data?.model || null,
      hostname: heartbeat.data?.hostname || null,
    });
    setLoading(false);
  }

  useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id); }, []);
  const online = Boolean(state.lastSeen && Date.now() - new Date(state.lastSeen).getTime() < 20000);

  return (
    <EnterpriseShell active="system" eyebrow="System">
      <main className="system-workspace">
        <style>{`
          .system-workspace{padding-top:12px}.sys-kicker{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-subtle);font-weight:850}.sys-title{margin:11px 0 0;font-size:clamp(38px,6vw,68px);letter-spacing:-.07em;line-height:.92}.sys-sub{margin:14px 0 0;color:var(--text-muted);font-size:14px;line-height:1.5;max-width:58ch}.sys-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:24px}.sys-card{border:1px solid var(--border);background:var(--surface);border-radius:16px;padding:17px}.sys-card strong{display:block;font-size:19px;letter-spacing:-.03em}.sys-card span{display:block;margin-top:6px;color:var(--text-subtle);font-size:9px;letter-spacing:.12em;text-transform:uppercase}.sys-card small{display:block;margin-top:10px;color:var(--text-muted);font-size:11px;line-height:1.4}.sys-ok{color:#9dba9a}.sys-bad{color:#d4a6a6}.sys-panel{margin-top:16px;border:1px solid var(--border);background:var(--surface);border-radius:18px;padding:18px}.sys-panel h2{margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-subtle)}.sys-list{display:grid;gap:8px;margin-top:14px}.sys-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}.sys-row span{color:var(--text-muted);font-size:11px}.sys-row strong{font-size:11px;text-align:right}.sys-command{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.sys-command a{padding:10px 12px;border:1px solid var(--border);border-radius:10px;color:var(--text);text-decoration:none;font-size:10px;font-weight:800}.sys-command a.primary{background:#ddd9cc;border-color:#ddd9cc;color:#161616}@media(max-width:900px){.sys-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.sys-grid{grid-template-columns:1fr}}
        `}</style>
        <div className="sys-kicker">Cornerstone · system</div>
        <h1 className="sys-title">Show only what can stop the engine.</h1>
        <p className="sys-sub">This is the constraint panel. If Local AI is offline or the queue is blocked, Command cannot finish intelligence work. Fix constraints here, then return to the brief.</p>
        <div className="sys-grid">
          <div className="sys-card"><strong className={online ? 'sys-ok' : 'sys-bad'}>{loading ? '…' : online ? 'ONLINE' : 'OFFLINE'}</strong><span>Local AI</span><small>{online ? `Heartbeat ${age(state.lastSeen)}` : 'Run the local stack on your Mac.'}</small></div>
          <div className="sys-card"><strong>{loading ? '…' : state.jobs}</strong><span>Active jobs</span><small>Queued or processing work visible to this operator.</small></div>
          <div className="sys-card"><strong className={state.errors ? 'sys-bad' : 'sys-ok'}>{loading ? '…' : state.errors}</strong><span>Recent errors</span><small>Last 100 job states sampled for immediate attention.</small></div>
          <div className="sys-card"><strong>{loading ? '…' : state.currentJob || 'Idle'}</strong><span>Current stage</span><small>Reported by the local worker heartbeat.</small></div>
        </div>
        <section className="sys-panel">
          <h2>Dependencies</h2>
          <div className="sys-list">
            <div className="sys-row"><span>Qwen model</span><strong>{state.model || 'Not reported'}</strong></div>
            <div className="sys-row"><span>Operator machine</span><strong>{state.hostname || 'Not reported'}</strong></div>
            <div className="sys-row"><span>Heartbeat</span><strong>{state.lastSeen ? `${new Date(state.lastSeen).toLocaleString('en-GB')} · ${age(state.lastSeen)}` : 'No heartbeat'}</strong></div>
            <div className="sys-row"><span>Queue state</span><strong>{state.errors ? 'Needs attention' : state.jobs ? 'Moving' : 'Idle'}</strong></div>
          </div>
          <div className="sys-command"><a className="primary" href="/content/remake">Back to the engine →</a><a href="/revenue">Open Revenue →</a><a href="/">Back to Command →</a></div>
        </section>
      </main>
    </EnterpriseShell>
  );
}
