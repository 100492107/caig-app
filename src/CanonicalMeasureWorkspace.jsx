import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

export default function CanonicalMeasureWorkspace() {
  const [publications, setPublications] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [views, setViews] = useState('');
  const [engagement, setEngagement] = useState('');
  const [revenue, setRevenue] = useState('');
  const [winner, setWinner] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const selected = useMemo(() => publications.find((p) => p.id === selectedId) || null, [publications, selectedId]);
  const winners = evidence.filter((e) => e.winner).length;

  async function load() {
    const [p, e] = await Promise.all([
      supabase.from('track_b_publications').select('id,title,platform,status,scheduled_at,created_at,updated_at,project_id').order('updated_at', { ascending: false }).limit(100),
      supabase.from('track_b_performance_evidence').select('id,publication_id,views,revenue,winner,operator_note,created_at').order('created_at', { ascending: false }).limit(100),
    ]);
    if (!p.error) setPublications(p.data || []);
    if (e.error) setEvidence([]);
    else setEvidence(e.data || []);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!selected) return;
    setBusy(true);
    setMessage('Saving what we learned…');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error('Sign in required.');
      const payload = {
        owner_id: userData.user.id,
        publication_id: selected.id,
        creator_id: 'owned',
        proof_type: 'public_social',
        platform: String(selected.platform || 'YouTube'),
        title: selected.title || null,
        views: Number(views) || 0,
        comments: Number(engagement) || 0,
        revenue: Number(revenue) || 0,
        winner,
        operator_note: note || null,
      };
      const { error } = await supabase.from('track_b_performance_evidence').insert(payload);
      if (error) throw new Error(error.message);
      setMessage(winner ? 'Marked as a winning format. Command will prefer this next.' : 'Evidence saved. The engine can learn from this.');
      setViews(''); setEngagement(''); setRevenue(''); setWinner(false); setNote('');
      await load();
    } catch (err) {
      setMessage(err.message || 'Could not save evidence.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="paid-measure">
      <style>{`
        .paid-measure{color:var(--text)}
        .pm-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:16px}
        .pm-stat{border:1px solid var(--border);background:var(--surface);border-radius:14px;padding:14px}
        .pm-stat b{display:block;font-size:24px;letter-spacing:-.04em}
        .pm-stat span{display:block;margin-top:6px;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-subtle)}
        .pm-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:12px}
        .pm-card{border:1px solid var(--border);background:var(--surface);border-radius:18px;padding:18px}
        .pm-k{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-subtle);font-weight:850}
        .pm-h{margin:10px 0 0;font-size:clamp(28px,4vw,40px);line-height:.95;letter-spacing:-.05em}
        .pm-s{margin:10px 0 0;color:var(--text-muted);font-size:12px;line-height:1.5}
        .pm-list{display:grid;gap:8px;margin-top:14px}
        .pm-item{text-align:left;width:100%;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);color:var(--text);cursor:pointer}
        .pm-item.active{border-color:rgba(212,181,106,.45);background:rgba(212,181,106,.08)}
        .pm-item strong{display:block;font-size:13px}
        .pm-item span{display:block;margin-top:4px;font-size:10px;color:var(--text-muted)}
        .pm-field{width:100%;margin-top:7px;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--text);font:inherit}
        .pm-btn{margin-top:14px;width:100%;min-height:46px;border:1px solid #ddd9cc;border-radius:11px;background:#ddd9cc;color:#171717;font-weight:900;cursor:pointer}
        .pm-btn:disabled{opacity:.55}
        .pm-empty{padding:16px;border:1px dashed var(--border);border-radius:14px;color:var(--text-muted);font-size:12px;line-height:1.5}
        .pm-empty a{color:var(--text);font-weight:850}
        .pm-msg{margin-top:10px;color:var(--text-muted);font-size:11px;line-height:1.45}
        .pm-check{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px}
        @media(max-width:900px){.pm-strip{grid-template-columns:1fr 1fr}.pm-grid{grid-template-columns:1fr}}
      `}</style>

      <div className="pm-strip">
        <div className="pm-stat"><b>{publications.length}</b><span>Shipped / scheduled</span></div>
        <div className="pm-stat"><b>{evidence.length}</b><span>Lessons captured</span></div>
        <div className="pm-stat"><b>{winners}</b><span>Winning formats</span></div>
        <div className="pm-stat"><b>£{evidence.reduce((n, e) => n + (Number(e.revenue) || 0), 0).toLocaleString('en-GB')}</b><span>Attributed here</span></div>
      </div>

      <div className="pm-grid">
        <section className="pm-card">
          <div className="pm-k">What worked</div>
          <h2 className="pm-h">Turn results into the next decision.</h2>
          <p className="pm-s">Measurement is not a report. It is how Cornerstone learns which formats to remake, which to stop, and which to scale.</p>
          <div className="pm-list">
            {publications.length ? publications.map((p) => (
              <button key={p.id} type="button" className={`pm-item${selectedId === p.id ? ' active' : ''}`} onClick={() => setSelectedId(p.id)}>
                <strong>{p.title || 'Untitled'}</strong>
                <span>{p.platform} · {p.status}</span>
              </button>
            )) : (
              <div className="pm-empty">
                Nothing has shipped yet, so there is nothing to learn from. That is expected on day one.
                <br /><a href="/content/publish">Schedule the first publication →</a>
              </div>
            )}
          </div>
        </section>

        <section className="pm-card">
          <div className="pm-k">Capture the lesson</div>
          {selected ? (
            <>
              <div style={{ marginTop: 10, fontSize: 15, fontWeight: 850 }}>{selected.title || 'Publication'}</div>
              <label className="pm-k" style={{ display: 'block', marginTop: 14 }}>Views
                <input className="pm-field" inputMode="numeric" value={views} onChange={(e) => setViews(e.target.value)} placeholder="e.g. 12400" />
              </label>
              <label className="pm-k" style={{ display: 'block', marginTop: 12 }}>Engagement
                <input className="pm-field" inputMode="numeric" value={engagement} onChange={(e) => setEngagement(e.target.value)} placeholder="likes + comments + shares" />
              </label>
              <label className="pm-k" style={{ display: 'block', marginTop: 12 }}>Revenue attributed (£)
                <input className="pm-field" inputMode="decimal" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="0" />
              </label>
              <label className="pm-k" style={{ display: 'block', marginTop: 12 }}>What we noticed
                <textarea className="pm-field" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hook worked. First 3 seconds carried retention. CTA underperformed." />
              </label>
              <label className="pm-check">
                <input type="checkbox" checked={winner} onChange={(e) => setWinner(e.target.checked)} />
                Mark as a winning format to remake
              </label>
              <button className="pm-btn" type="button" disabled={busy} onClick={save}>
                {busy ? 'Saving…' : 'Save lesson →'}
              </button>
            </>
          ) : (
            <div className="pm-empty" style={{ marginTop: 12 }}>Select a shipped or scheduled item. Tell Cornerstone what the market rewarded.</div>
          )}
          {message ? <div className="pm-msg">{message}</div> : null}
          <div className="pm-msg" style={{ marginTop: 16 }}>
            <a href="/content/remake" style={{ color: 'inherit', fontWeight: 850 }}>Use a winner as the next Remake reference →</a>
          </div>
        </section>
      </div>
    </main>
  );
}
