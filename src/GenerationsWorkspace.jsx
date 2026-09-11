import React, { useEffect, useMemo, useState } from 'react';
import EnterpriseShell from './EnterpriseShell.jsx';

const clean = (value) => String(value ?? '').trim();

function parseResult(value) {
  const raw = clean(value);
  if (!raw) return null;
  try { return typeof value === 'string' ? JSON.parse(raw) : value; } catch { return null; }
}

function firstDefined(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] != null && clean(obj[key])) return obj[key];
  }
  return null;
}

function ResultView({ value }) {
  const parsed = parseResult(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return <pre style={{ whiteSpace:'pre-wrap', overflowWrap:'anywhere', margin:0, padding:16, borderRadius:12, background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text)', fontFamily:'var(--mono)', fontSize:11, lineHeight:1.6 }}>{clean(value) || 'No output stored.'}</pre>;
  }

  const signal = firstDefined(parsed, ['mechanism','key_insight','core_mechanism','audience_promise']);
  const why = firstDefined(parsed, ['why_it_works','why_this_should_work','strategic_reasoning','rationale']);
  const opportunity = firstDefined(parsed, ['original_reconstruction_opportunity','opportunity','opportunity_statement']);
  const hook = firstDefined(parsed, ['hook','hook_0_5s']);
  const titles = Array.isArray(parsed.titles) ? parsed.titles : [];
  const loops = Array.isArray(parsed.curiosity_loops) ? parsed.curiosity_loops : [];
  const shorts = Array.isArray(parsed.shorts || parsed.short_form) ? (parsed.shorts || parsed.short_form) : [];
  const narrative = parsed.narrative_structure;
  const rawJson = JSON.stringify(parsed, null, 2);

  return <div style={{ display:'grid', gap:14 }}>
    <section style={{ padding:18, border:'1px solid rgba(212,181,106,.28)', borderRadius:16, background:'linear-gradient(135deg,rgba(212,181,106,.08),var(--surface))' }}>
      <div style={{ color:'var(--track-b)', fontSize:10, fontWeight:900, letterSpacing:'.12em', textTransform:'uppercase' }}>What Cornerstone found</div>
      <h3 style={{ margin:'7px 0 0', fontSize:22 }}>The useful signal, first.</h3>
      <p style={{ margin:'9px 0 0', color:'var(--text-muted)', fontSize:12, lineHeight:1.65 }}>{clean(signal) || 'The current generation does not contain a clear human-readable signal. The structured output is preserved below for inspection.'}</p>
    </section>

    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10 }}>
      {why ? <section style={{ padding:14, border:'1px solid var(--border)', borderRadius:14, background:'var(--surface)' }}><div style={{ color:'var(--text-subtle)', fontSize:9, fontWeight:900, letterSpacing:'.12em', textTransform:'uppercase' }}>Why it matters</div><div style={{ marginTop:7, color:'var(--text)', fontSize:12, lineHeight:1.6 }}>{clean(why)}</div></section> : null}
      {opportunity ? <section style={{ padding:14, border:'1px solid var(--border)', borderRadius:14, background:'var(--surface)' }}><div style={{ color:'var(--text-subtle)', fontSize:9, fontWeight:900, letterSpacing:'.12em', textTransform:'uppercase' }}>Original opportunity</div><div style={{ marginTop:7, color:'var(--text)', fontSize:12, lineHeight:1.6 }}>{clean(opportunity)}</div></section> : null}
    </div>

    {hook ? <section style={{ padding:14, border:'1px solid var(--border)', borderRadius:14, background:'var(--surface)' }}><div style={{ color:'var(--text-subtle)', fontSize:9, fontWeight:900, letterSpacing:'.12em', textTransform:'uppercase' }}>Hook</div><div style={{ marginTop:7, color:'var(--text)', fontSize:15, lineHeight:1.5, fontWeight:700 }}>{clean(hook)}</div></section> : null}

    {titles.length ? <section style={{ padding:14, border:'1px solid var(--border)', borderRadius:14, background:'var(--surface)' }}><div style={{ color:'var(--text-subtle)', fontSize:9, fontWeight:900, letterSpacing:'.12em', textTransform:'uppercase' }}>Title options</div><div style={{ display:'grid', gap:6, marginTop:8 }}>{titles.slice(0,10).map((title, i) => <div key={i} style={{ padding:'9px 10px', borderRadius:9, background:'var(--surface-2)', border:'1px solid var(--border)', fontSize:12, fontWeight:750 }}>{typeof title === 'string' ? title : title.title || title.name || JSON.stringify(title)}</div>)}</div></section> : null}

    {narrative ? <section style={{ padding:14, border:'1px solid var(--border)', borderRadius:14, background:'var(--surface)' }}><div style={{ color:'var(--text-subtle)', fontSize:9, fontWeight:900, letterSpacing:'.12em', textTransform:'uppercase' }}>Story structure</div><pre style={{ margin:'8px 0 0', whiteSpace:'pre-wrap', color:'var(--text)', fontFamily:'var(--sans,inherit)', fontSize:12, lineHeight:1.6 }}>{typeof narrative === 'string' ? narrative : JSON.stringify(narrative, null, 2)}</pre></section> : null}

    {loops.length ? <section style={{ padding:14, border:'1px solid var(--border)', borderRadius:14, background:'var(--surface)' }}><div style={{ color:'var(--text-subtle)', fontSize:9, fontWeight:900, letterSpacing:'.12em', textTransform:'uppercase' }}>Curiosity loops</div><div style={{ display:'grid', gap:6, marginTop:8 }}>{loops.map((item,i)=><div key={i} style={{ padding:'9px 10px', borderRadius:9, background:'var(--surface-2)', border:'1px solid var(--border)', fontSize:12 }}>{clean(item)}</div>)}</div></section> : null}

    {shorts.length ? <section style={{ padding:14, border:'1px solid var(--border)', borderRadius:14, background:'var(--surface)' }}><div style={{ color:'var(--text-subtle)', fontSize:9, fontWeight:900, letterSpacing:'.12em', textTransform:'uppercase' }}>Short-form derivatives</div><div style={{ display:'grid', gap:6, marginTop:8 }}>{shorts.map((item,i)=><div key={i} style={{ padding:'9px 10px', borderRadius:9, background:'var(--surface-2)', border:'1px solid var(--border)', fontSize:12 }}>{typeof item === 'string' ? item : item.short_title || item.title || item.hook || item.angle || JSON.stringify(item)}</div>)}</div></section> : null}

    <details style={{ border:'1px solid var(--border)', borderRadius:14, background:'var(--surface)', padding:14 }}>
      <summary style={{ cursor:'pointer', color:'var(--text-muted)', fontSize:11, fontWeight:800 }}>Developer / production data · JSON</summary>
      <pre style={{ margin:'10px 0 0', whiteSpace:'pre-wrap', overflowWrap:'anywhere', maxHeight:520, overflow:'auto', color:'var(--text-muted)', fontFamily:'var(--mono)', fontSize:10, lineHeight:1.55 }}>{rawJson}</pre>
    </details>
  </div>;
}

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
          <div><div style={{ color:'var(--track-b)', fontSize:10, fontWeight:900, letterSpacing:'.14em', textTransform:'uppercase' }}>Library</div><h1 style={{ margin:'6px 0', fontSize:'clamp(30px,5vw,48px)', letterSpacing:'-.045em' }}>Saved generations</h1><p style={{ margin:0, color:'var(--text-muted)', fontSize:13 }}>Cornerstone explains the decision first. Production JSON stays available when you need it.</p></div>
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
            {!selected ? <div style={{ minHeight:'58vh', display:'grid', placeItems:'center', color:'var(--text-muted)' }}>Select a saved generation.</div> : <div><div style={{ color:'var(--track-b)', fontSize:10, fontWeight:900, letterSpacing:'.12em', textTransform:'uppercase' }}>{selected.job_type || 'Generation'} · {selected.status}</div><h2 style={{ margin:'7px 0', fontSize:'clamp(22px,3vw,32px)' }}>{selected.title || 'Untitled generation'}</h2><div style={{ marginBottom:18, color:'var(--text-subtle)', fontSize:11 }}>{selected.created_at ? new Date(selected.created_at).toLocaleString() : ''} · {selected.model || 'model unavailable'}</div><ResultView value={selected.result || selected.error_message} /></div>}
          </section>
        </div>
      </div>
    </EnterpriseShell>
  );
}
