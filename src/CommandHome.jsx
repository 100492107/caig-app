import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import EnterpriseShell from './EnterpriseShell.jsx';

function money(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
}

export default function CommandHome() {
  const [data, setData] = useState({ recoveryValue: 0, contentReturn: 0, winners: 0, published: 0, queued: 0, processing: 0, failed: 0, aiOnline: false, next: 'Remake a winner' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token || '';
        const [summaryResponse, revenueResponse, metricsResponse, queueResponse, hbResponse] = await Promise.all([
          fetch('/api/ceo-summary', { headers: token ? { Authorization: `Bearer ${token}` } : {} , cache: 'no-store' }),
          supabase.from('track_a_revenue_events').select('value,event_type').order('created_at', { ascending: false }).limit(1000),
          supabase.from('track_b_content_metrics').select('revenue,winner').order('captured_at', { ascending: false }).limit(1000),
          supabase.from('content_queue').select('id,status,content_label,scheduled_date,scheduled_time').order('created_at', { ascending: false }).limit(100),
          supabase.from('local_ai_worker_heartbeat').select('status,last_seen,current_job_type').eq('id', 'qwen').maybeSingle(),
        ]);
        const summary = summaryResponse.ok ? await summaryResponse.json().catch(() => ({})) : {};
        const revenue = revenueResponse.data || [];
        const metrics = metricsResponse.data || [];
        const queue = queueResponse.data || [];
        const lastSeen = hbResponse.data?.last_seen ? new Date(hbResponse.data.last_seen).getTime() : 0;
        const aiOnline = Boolean(lastSeen && Date.now() - lastSeen < 20000);
        const recoveryValue = revenue.reduce((sum, row) => sum + Number(row.value || 0), 0);
        const contentReturn = metrics.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
        const winners = metrics.filter((row) => row.winner).length || Number(summary.winners || 0);
        const queued = queue.filter((row) => ['queued', 'ready', 'scheduled'].includes(String(row.status))).length;
        const processing = queue.filter((row) => ['processing', 'publishing'].includes(String(row.status))).length;
        const failed = queue.filter((row) => ['error', 'failed'].includes(String(row.status))).length;
        let next = 'Remake a winner';
        if (!aiOnline) next = 'Bring local AI online';
        else if (failed) next = 'Resolve the blocked job';
        else if (queued) next = 'Move the next job through Production';
        else if (Number(summary.published || 0) || queue.some((row) => row.status === 'published')) next = 'Measure the latest published asset';
        if (live) setData({ recoveryValue, contentReturn, winners, published: Number(summary.published || queue.filter((row) => row.status === 'published').length || 0), queued, processing, failed, aiOnline, next });
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, []);

  const health = useMemo(() => data.aiOnline ? 'ONLINE' : 'OFFLINE', [data.aiOnline]);

  return (
    <EnterpriseShell active="command" eyebrow="Command">
      <main className="command-dashboard">
        <style>{`\n          .command-dashboard{padding-top:14px}\n          .cmd-kicker{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--text-subtle);font-weight:850}\n          .cmd-title{font-size:clamp(42px,7vw,82px);line-height:.9;letter-spacing:-.075em;margin:12px 0 0;max-width:10ch}\n          .cmd-sub{margin:18px 0 0;max-width:58ch;color:var(--text-muted);font-size:14px;line-height:1.55}\n          .cmd-grid{display:grid;grid-template-columns:1.35fr .85fr;gap:12px;margin-top:26px}\n          .cmd-card{border:1px solid var(--border);background:var(--surface);border-radius:18px;padding:22px}\n          .cmd-section-title{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin:0 0 16px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-subtle)}\n          .cmd-values{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}\n          .cmd-value{min-height:116px;border:1px solid var(--border);border-radius:14px;padding:15px;background:var(--surface-2)}\n          .cmd-value strong{display:block;font-size:25px;letter-spacing:-.04em}.cmd-value span{display:block;margin-top:6px;font-size:9px;color:var(--text-subtle);letter-spacing:.12em;text-transform:uppercase}\n          .cmd-value small{display:block;margin-top:14px;color:var(--text-muted);font-size:10px;line-height:1.4}\n          .cmd-value.gold{border-color:rgba(212,181,106,.28)}\n          .cmd-flow{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}\n          .cmd-flow a{padding:13px 10px;border:1px solid var(--border);border-radius:12px;text-decoration:none;color:var(--text);font-size:10px;font-weight:800;text-align:center}.cmd-flow a:hover{border-color:rgba(212,181,106,.35);background:var(--surface-2)}\n          .cmd-health{display:grid;gap:9px}.cmd-health-row{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);font-size:12px}.cmd-health-row:last-child{border-bottom:0}.cmd-health-row span{color:var(--text-muted)}.cmd-health-row strong{font-size:10px;letter-spacing:.08em}\n          .cmd-health-row .ok{color:var(--success)}.cmd-health-row .bad{color:#d8a5a5}\n          .cmd-next{display:flex;align-items:center;justify-content:space-between;gap:18px}.cmd-next-copy strong{display:block;font-size:24px;letter-spacing:-.04em}.cmd-next-copy span{display:block;margin-top:5px;color:var(--text-muted);font-size:11px}\n          .cmd-next a{display:inline-flex;align-items:center;gap:8px;padding:12px 15px;border-radius:11px;background:#ddd9cc;color:#171717;text-decoration:none;font-size:10px;font-weight:900;white-space:nowrap}\n          @media(max-width:900px){.cmd-grid{grid-template-columns:1fr}.cmd-flow{grid-template-columns:repeat(3,1fr)}}\n          @media(max-width:560px){.cmd-values{grid-template-columns:1fr}.cmd-flow{grid-template-columns:1fr 1fr}.cmd-next{align-items:flex-start;flex-direction:column}}\n        `}</style>
        <div className="cmd-kicker">Cornerstone · command</div>
        <h1 className="cmd-title">See the business. Pick the move.</h1>
        <p className="cmd-sub">One command layer. Value shows whether the engines are returning money. Flow shows what is moving. Health shows whether the system can execute. Next shows the single action worth doing now.</p>

        <section className="cmd-card" style={{ marginTop: 26 }}>
          <div className="cmd-section-title"><span>VALUE</span><span>Revenue / recovery / content return</span></div>
          <div className="cmd-values">
            <div className="cmd-value gold"><strong>{loading ? '…' : money(data.recoveryValue)}</strong><span>Recovery value logged</span><small>Track A revenue events currently recorded.</small></div>
            <div className="cmd-value gold"><strong>{loading ? '…' : money(data.contentReturn)}</strong><span>Content return</span><small>Revenue attributed to measured Track B content.</small></div>
            <div className="cmd-value"><strong>{loading ? '…' : data.winners}</strong><span>Content winners</span><small>Assets marked as winners by measurement evidence.</small></div>
          </div>
        </section>

        <section className="cmd-card" style={{ marginTop: 12 }}>
          <div className="cmd-section-title"><span>FLOW</span><span>Jobs / production / publish</span></div>
          <div className="cmd-flow">
            <a href="/content/remake">Remake</a><a href="/content/creators">Creators</a><a href="/content/production">Production</a><a href="/content/publish">Publish</a><a href="/content/measurement">Measure</a><a href="/revenue">Revenue</a>
          </div>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            <div className="cmd-value"><strong>{loading ? '…' : data.queued}</strong><span>Moving</span></div>
            <div className="cmd-value"><strong>{loading ? '…' : data.processing}</strong><span>Processing</span></div>
            <div className="cmd-value"><strong>{loading ? '…' : data.published}</strong><span>Published</span></div>
          </div>
        </section>

        <div className="cmd-grid">
          <section className="cmd-card">
            <div className="cmd-section-title"><span>HEALTH</span><span>AI / queue / errors / dependencies</span></div>
            <div className="cmd-health">
              <div className="cmd-health-row"><span>Local AI</span><strong className={data.aiOnline ? 'ok' : 'bad'}>{health}</strong></div>
              <div className="cmd-health-row"><span>Queue</span><strong className={data.processing || data.queued ? 'ok' : ''}>{data.processing || data.queued ? 'MOVING' : 'IDLE'}</strong></div>
              <div className="cmd-health-row"><span>Errors</span><strong className={data.failed ? 'bad' : 'ok'}>{data.failed ? `${data.failed} BLOCKED` : 'CLEAR'}</strong></div>
              <div className="cmd-health-row"><span>System detail</span><strong><a href="/system" style={{ color: 'inherit' }}>OPEN SYSTEM →</a></strong></div>
            </div>
          </section>
          <section className="cmd-card">
            <div className="cmd-section-title"><span>NEXT</span><span>One best action</span></div>
            <div className="cmd-next">
              <div className="cmd-next-copy"><strong>{data.next}</strong><span>The command layer should reduce decisions, not create more.</span></div>
              <a href={data.next.includes('Revenue') ? '/revenue' : data.next.includes('Production') ? '/content/production' : data.next.includes('Measure') ? '/content/measurement' : data.next.includes('AI') || data.next.includes('blocked') ? '/system' : '/content/remake'}>Do it →</a>
            </div>
          </section>
        </div>
      </main>
    </EnterpriseShell>
  );
}
