import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

export default function CanonicalPublishWorkspace() {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);
  const scheduled = rows.filter((r) => r.scheduled_at || /schedul/i.test(String(r.status || ''))).length;
  const live = rows.filter((r) => /publish|live|ship/i.test(String(r.status || ''))).length;
  const drafts = rows.filter((r) => /draft|ready|pending/i.test(String(r.status || ''))).length;

  async function load() {
    const { data, error } = await supabase
      .from('track_b_publications')
      .select('id,title,platform,status,scheduled_at,publish_attempts,last_error,created_at,updated_at,project_id,production_job_id')
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) setMessage(error.message);
    else setRows(data || []);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  async function schedule() {
    if (!selected) return;
    if (!date) {
      setMessage('Choose a date so Cornerstone can schedule this.');
      return;
    }
    setBusy(true);
    setMessage('Scheduling…');
    try {
      const scheduledAt = new Date(`${date}T${time || '09:00'}:00`).toISOString();
      const { error } = await supabase
        .from('track_b_publications')
        .update({ status: 'scheduled', scheduled_at: scheduledAt })
        .eq('id', selected.id);
      if (error) throw new Error(error.message);
      setMessage('Scheduled. This is now part of what is going live.');
      await load();
    } catch (err) {
      setMessage(err.message || 'Could not schedule.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="paid-pub">
      <style>{`
        .paid-pub{color:var(--text)}
        .pu-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:16px}
        .pu-stat{border:1px solid var(--border);background:var(--surface);border-radius:14px;padding:14px}
        .pu-stat b{display:block;font-size:24px;letter-spacing:-.04em}
        .pu-stat span{display:block;margin-top:6px;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-subtle)}
        .pu-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:12px}
        .pu-card{border:1px solid var(--border);background:var(--surface);border-radius:18px;padding:18px}
        .pu-k{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-subtle);font-weight:850}
        .pu-h{margin:10px 0 0;font-size:clamp(28px,4vw,40px);line-height:.95;letter-spacing:-.05em}
        .pu-s{margin:10px 0 0;color:var(--text-muted);font-size:12px;line-height:1.5}
        .pu-list{display:grid;gap:8px;margin-top:14px}
        .pu-item{text-align:left;width:100%;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);color:var(--text);cursor:pointer}
        .pu-item.active{border-color:rgba(212,181,106,.45);background:rgba(212,181,106,.08)}
        .pu-item strong{display:block;font-size:13px}
        .pu-meta{display:block;margin-top:4px;font-size:10px;color:var(--text-muted)}
        .pu-pill{display:inline-block;margin-top:8px;padding:4px 7px;border-radius:999px;background:rgba(212,181,106,.1);font-size:9px;color:#cdbf9d}
        .pu-field{width:100%;margin-top:7px;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--text);font:inherit}
        .pu-btn{margin-top:14px;width:100%;min-height:46px;border:1px solid #ddd9cc;border-radius:11px;background:#ddd9cc;color:#171717;font-weight:900;cursor:pointer}
        .pu-btn:disabled{opacity:.55}
        .pu-empty{padding:16px;border:1px dashed var(--border);border-radius:14px;color:var(--text-muted);font-size:12px;line-height:1.5}
        .pu-empty a{color:var(--text);font-weight:850}
        .pu-msg{margin-top:10px;color:var(--text-muted);font-size:11px}
        @media(max-width:900px){.pu-strip{grid-template-columns:1fr 1fr}.pu-grid{grid-template-columns:1fr}}
      `}</style>

      <div className="pu-strip">
        <div className="pu-stat"><b>{rows.length}</b><span>Ready to ship</span></div>
        <div className="pu-stat"><b>{drafts}</b><span>Awaiting schedule</span></div>
        <div className="pu-stat"><b>{scheduled}</b><span>Scheduled</span></div>
        <div className="pu-stat"><b>{live}</b><span>Marked live</span></div>
      </div>

      <div className="pu-grid">
        <section className="pu-card">
          <div className="pu-k">Going live</div>
          <h2 className="pu-h">What is ready to leave the building.</h2>
          <p className="pu-s">These are publication records created from production. Pick one, choose when it should go live, and let Cornerstone carry the schedule.</p>
          <div className="pu-list">
            {rows.length ? rows.map((r) => (
              <button key={r.id} type="button" className={`pu-item${selectedId === r.id ? ' active' : ''}`} onClick={() => setSelectedId(r.id)}>
                <strong>{r.title || 'Untitled publication'}</strong>
                <span className="pu-meta">{r.platform} · {r.status} · {r.publish_attempts || 0} attempts</span>
                {r.scheduled_at ? <span className="pu-pill">{new Date(r.scheduled_at).toLocaleString('en-GB')}</span> : null}
              </button>
            )) : (
              <div className="pu-empty">
                Nothing is ready to go live yet. Produce a package first — then it appears here to schedule.
                <br /><a href="/content/production">Open production →</a>
              </div>
            )}
          </div>
        </section>

        <section className="pu-card">
          <div className="pu-k">Schedule</div>
          {selected ? (
            <>
              <div style={{ marginTop: 10, fontSize: 15, fontWeight: 850 }}>{selected.title || 'Publication'}</div>
              <span className="pu-meta">{selected.platform} · {selected.status}</span>
              <label className="pu-k" style={{ display: 'block', marginTop: 16 }}>Date
                <input className="pu-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="pu-k" style={{ display: 'block', marginTop: 12 }}>Time
                <input className="pu-field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
              <button className="pu-btn" type="button" disabled={busy} onClick={schedule}>
                {busy ? 'Scheduling…' : 'Schedule this →'}
              </button>
              {selected.last_error ? <div style={{ marginTop: 10, color: '#d4a6a6', fontSize: 11 }}>{selected.last_error}</div> : null}
            </>
          ) : (
            <div className="pu-empty" style={{ marginTop: 12 }}>Select something on the left. One decision: when it goes live.</div>
          )}
          {message ? <div className="pu-msg">{message}</div> : null}
          <div className="pu-msg" style={{ marginTop: 16 }}>
            <a href="/content/measurement" style={{ color: 'inherit', fontWeight: 850 }}>After it ships, capture what worked →</a>
          </div>
        </section>
      </div>
    </main>
  );
}
