import React, { useEffect, useMemo, useState } from 'react';
import EnterpriseShell from './EnterpriseShell.jsx';

const clean = (value) => String(value ?? '').replace(/<think>[\\s\\S]*?<\\/think>/gi, '').trim();

export default function GenerationsWorkspace() {
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/queue-update?action=generations&limit=100&offset=0', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Library failed (${response.status})`);
      const rows = Array.isArray(payload.jobs) ? payload.jobs : [];
      setJobs(rows);
      setSelected((current) => current ? rows.find((job) => job.id === current.id) || current : rows[0] || null);
    } catch (e) { setError(e.message || String(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((job) => !q || [job.title, job.job_type, job.status, job.user_prompt, job.result].map((v) => String(v || '').toLowerCase()).join(' ').includes(q));
  }, [jobs, search]);

  return (
    <EnterpriseShell active="library" eyebrow="Saved work">
      <div style={{ paddingTop: 18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:18, marginBottom:18 }}>
          <div><div style={{ color:'var(--track-b)', fontSize:10, fontWeight:900, letterSpacing:'.14em', textTransform:'uppercase' }}>Library</div><h1 style={{ margin:'6px 0', fontSize:'clamp(30px,5vw,48px)', letterSpacing:'-.045em' }}>Saved generations</h1><p style={{ margin:0, color:'var(--text-muted)', fontSize:13 }}>Every generation is retained here. Select one to inspect it.</p></div>
          <button type="button" onClick={load} disabled={loading} style={{ border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', borderRadius:10, padding:'9px 12px', fontWeight:800 }}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search saved generations…" style={{ width:'100%', boxSizing:'border-box', marginBottom:14, background:'var(--surface)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 13px' }} />
        {error ? <div style={{ marginBottom:14, padding:12, borderRadius:12, border:'1px solid rgba(255,120,120,.3)', color:'#ffadad' }}>{error}</div> : null}
        <div style={{ display:'grid', gridTemplateColumns:'minmax(260px,360px) minmax(0,1fr)', gap:14, minHeight:'62vh' }}>
          <section style={{ border:'1px solid var(--border)', background:'var(--surface)', borderRadius:16, overflow:'auto', padding:10 }}>
            <div style={{ padding:'7px 8px 11px', color:'var(--text-subtle)', fontSize:10, fontWeight:850 }}>{visible.length} SAVED</div>
            {visible.map((job) => <button key={job.id} type="button" onClick={() => setSelected(job)} style={{ width:'100%', textAlign:'left', border:`1px solid ${selected?.id === job.id ? 'var(--track-b)' : 'var(--border)'}`, background:selected?.id === job.id ? 'var(--surface-2)' : 'transparent', color:'var(--text)', borderRadius:12, padding:12, marginBottom:8 }}><div style={{ display:'flex', justifyContent:'space-between', gap:10, fontSize:9, fontWeight:900, textTransform:'uppercase' }}><span style={{ color:'var(--track-b)' }}>{job.job_type || 'generation'}</span><span>{job.status}</span></div><div style={{ marginTop:7, fontWeight:850, fontSize:12 }}>{job.title || 'Untitled generation'}</div><div style={{ marginTop:6, color:'var(--text-subtle)', fontSize:10 }}>{job.created_at ? new Date(job.created_at).toLocaleString() : ''}</div></button>)}
            {!loading && visible.length === 0 ? <div style={{ padding:16, color:'var(--text-muted)', fontSize:12 }}>No saved generations found for this account.</div> : null}
          </section>
          <section style={{ border:'1px solid var(--border)', background:'var(--surface)', borderRadius:16, overflow:'auto', padding:20, minWidth:0 }}>
            {!selected ? <div style={{ minHeight:'58vh', display:'grid', placeItems:'center', color:'var(--text-muted)' }}>Select a saved generation.</div> : <div><div style={{ color:'var(--track-b)', fontSize:10, fontWeight:900, letterSpacing:'.12em', textTransform:'uppercase' }}>{selected.job_type || 'Generation'} · {selected.status}</div><h2 style={{ margin:'7px 0', fontSize:'clamp(22px,3vw,32px)' }}>{selected.title || 'Untitled generation'}</h2><pre style={{ whiteSpace:'pre-wrap', overflowWrap:'anywhere', margin:'18px 0 14px', padding:14, borderRadius:12, background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text-muted)', fontFamily:'var(--mono)', fontSize:11 }}>{clean(selected.user_prompt) || 'No prompt stored.'}</pre><pre style={{ whiteSpace:'pre-wrap', overflowWrap:'anywhere', margin:0, padding:16, borderRadius:12, background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text)', fontFamily:'var(--mono)', fontSize:11, lineHeight:1.6 }}>{clean(selected.result) || clean(selected.error_message) || 'No output stored.'}</pre></div>}
          </section>
        </div>
      </div>
    </EnterpriseShell>
  );
}
