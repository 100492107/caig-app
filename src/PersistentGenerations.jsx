import React, { useEffect, useMemo, useState } from 'react';

const FILTERS = [
  ['all', 'Everything'],
  ['track_a', 'Track A'],
  ['creators', 'Cara / Lila'],
  ['youtube', 'YouTube'],
  ['other', 'Other'],
];

function classify(job) {
  const type = String(job?.job_type || '').toLowerCase();
  const persona = String(job?.persona_id || '').toLowerCase();
  const title = String(job?.title || '').toLowerCase();
  if (persona.includes('cornerstone_track_a') || title.includes('track a') || type.includes('track_a') || type.includes('social_caption')) return 'track_a';
  if (persona.includes('youtube') || type.includes('youtube') || title.includes('youtube')) return 'youtube';
  if (persona.includes('cara') || persona.includes('lila') || type.includes('growth') || type.includes('commerce') || title.includes('cara') || title.includes('lila')) return 'creators';
  return 'other';
}

function clean(value) {
  return String(value ?? '').trim();
}

function toText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function parseResult(value) {
  const raw = clean(value);
  if (!raw) return null;
  try { return typeof value === 'string' ? JSON.parse(raw) : value; } catch { return null; }
}

function prettyResult(value) {
  const parsed = parseResult(value);
  if (parsed && typeof parsed === 'object') return JSON.stringify(parsed, null, 2);
  return clean(value)
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/^\s*(<\|im_end\|>|<\|endoftext\|>)\s*$/gim, '')
    .trim();
}

function firstDefined(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] != null && clean(obj[key])) return obj[key];
  }
  return null;
}

function listify(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
}

function displayListItem(value, fallback = 'Untitled') {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return clean(value) || fallback;
  return value.title || value.name || value.short_title || value.hook || value.angle || value.description || fallback;
}

function friendlyType(job) {
  const group = classify(job);
  if (group === 'track_a') return 'Track A';
  if (group === 'youtube') return 'YouTube';
  if (group === 'creators') return 'Cara / Lila';
  return job?.job_type || 'Generation';
}

function ExplainResult({ job }) {
  const parsed = parseResult(job?.result);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return <section style={ui.card}><Label>Saved output</Label><pre style={ui.raw}>{prettyResult(job?.result) || clean(job?.error_message) || 'No output stored.'}</pre></section>;
  }

  const signal = firstDefined(parsed, ['core_mechanism', 'mechanism', 'key_insight', 'audience_promise', 'hook']);
  const why = firstDefined(parsed, ['why_it_works', 'why_this_should_work', 'strategic_reasoning', 'rationale']);
  const opportunity = firstDefined(parsed, ['original_reconstruction_opportunity', 'opportunity_statement', 'opportunity']);
  const nextStep = firstDefined(parsed, ['recommended_next_action', 'next_action', 'best_next_move', 'recommendation']);
  const hook = firstDefined(parsed, ['hook_0_5s', 'hook']);
  const titles = listify(parsed.titles || parsed.title_options || parsed.title_ideas);
  const loops = listify(parsed.curiosity_loops || parsed.curiosityLoops);
  const shorts = listify(parsed.shorts || parsed.short_form || parsed.short_form_derivatives);
  const narrative = parsed.narrative_structure;
  const evidence = parsed.evidence || parsed.source_evidence || parsed.evidence_summary;
  const limitations = parsed.limitations || parsed.uncertainties || parsed.confidence_note;
  const rawJson = JSON.stringify(parsed, null, 2);

  const hasDecision = signal || why || opportunity || nextStep || hook;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section style={{ ...ui.hero, borderColor: hasDecision ? 'rgba(212,175,55,.28)' : '#303648' }}>
        <div style={ui.kicker}>What Cornerstone found</div>
        <h3 style={ui.heroTitle}>{clean(firstDefined(parsed, ['recommended_next_action', 'next_action', 'best_next_move'])) || 'The useful signal, first.'}</h3>
        <p style={ui.body}>{clean(signal) || 'This generation does not yet contain a dedicated human-readable conclusion. The structured analysis is preserved below.'}</p>
      </section>

      <div style={ui.grid2}>
        {why ? <Card title="Why it matters">{clean(why)}</Card> : null}
        {opportunity ? <Card title="Original opportunity">{clean(opportunity)}</Card> : null}
      </div>

      {hook ? <Card title="Hook"><div style={{ fontSize: 15, fontWeight: 750, lineHeight: 1.5 }}>{clean(hook)}</div></Card> : null}

      {titles.length ? <ListCard title="Title options" items={titles} /> : null}
      {narrative ? <Card title="Story structure"><div style={{ whiteSpace: 'pre-wrap' }}>{typeof narrative === 'string' ? narrative : JSON.stringify(narrative, null, 2)}</div></Card> : null}
      {loops.length ? <ListCard title="Curiosity loops" items={loops} /> : null}
      {shorts.length ? <ListCard title="Short-form derivatives" items={shorts} /> : null}
      {evidence ? <Card title="Evidence / confidence"><div style={{ whiteSpace: 'pre-wrap' }}>{typeof evidence === 'string' ? evidence : JSON.stringify(evidence, null, 2)}</div></Card> : null}
      {limitations ? <section style={{ ...ui.card, borderColor: 'rgba(238,182,102,.25)', background: 'rgba(238,182,102,.05)' }}><Label>Check before publishing</Label><div style={ui.body}>{typeof limitations === 'string' ? limitations : JSON.stringify(limitations, null, 2)}</div></section> : null}

      {nextStep && nextStep !== (firstDefined(parsed, ['recommended_next_action', 'next_action', 'best_next_move'])) ? <Card title="Recommended next action">{clean(nextStep)}</Card> : null}

      <details style={ui.card}>
        <summary style={ui.summary}>Developer / production data · JSON</summary>
        <pre style={{ ...ui.raw, maxHeight: 520, overflow: 'auto' }}>{rawJson}</pre>
      </details>
    </div>
  );
}

function Label({ children }) {
  return <div style={ui.label}>{children}</div>;
}

function Card({ title, children }) {
  return <section style={ui.card}><Label>{title}</Label><div style={ui.body}>{children}</div></section>;
}

function ListCard({ title, items }) {
  return <section style={ui.card}><Label>{title}</Label><div style={ui.list}>{items.slice(0, 10).map((item, i) => <div key={i} style={ui.listItem}>{displayListItem(item, `${title} ${i + 1}`)}</div>)}</div></section>;
}

const ui = {
  launcher: {
    position: 'fixed', top: 72, right: 20, zIndex: 900,
    border: '1px solid rgba(212,175,55,.45)', background: 'linear-gradient(135deg,#171a22,#0b0e14)',
    color: '#f5d97f', borderRadius: 999, padding: '10px 14px', fontWeight: 900,
    boxShadow: '0 14px 36px rgba(0,0,0,.34)', cursor: 'pointer',
  },
  overlay: { position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(4,6,10,.72)', backdropFilter: 'blur(14px)', padding: 22 },
  card: { border: '1px solid #202633', borderRadius: 14, background: '#0b0f15', padding: 16 },
  hero: { border: '1px solid rgba(212,175,55,.28)', borderRadius: 16, background: 'linear-gradient(135deg,rgba(212,175,55,.08),#10141c)', padding: 18 },
  heroTitle: { margin: '7px 0 0', fontSize: 22, lineHeight: 1.15, letterSpacing: '-.025em' },
  kicker: { color: '#d4af37', fontSize: 10, fontWeight: 950, letterSpacing: '.14em', textTransform: 'uppercase' },
  label: { color: '#7f899b', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em' },
  body: { marginTop: 8, color: '#d9dfe8', fontSize: 12, lineHeight: 1.65, whiteSpace: 'pre-wrap' },
  raw: { margin: '10px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: '#aeb8c7', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10, lineHeight: 1.6 },
  summary: { cursor: 'pointer', color: '#9ca7b8', fontSize: 11, fontWeight: 850 },
  list: { display: 'grid', gap: 7, marginTop: 9 },
  listItem: { padding: '9px 10px', borderRadius: 9, background: '#121720', border: '1px solid #262d3a', color: '#e2e7ef', fontSize: 12, lineHeight: 1.45 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 },
};

export default function PersistentGenerations() {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(null);
  const [error, setError] = useState('');
  const [loadedAt, setLoadedAt] = useState(null);

  async function loadPage({ reset = false } = {}) {
    const offset = reset ? 0 : jobs.length;
    if (reset) setLoading(true); else setLoadingMore(true);
    setError('');
    try {
      const response = await fetch(`/api/queue-update?action=generations&limit=50&offset=${offset}`, { cache: 'no-store' });
      const text = await response.text();
      let payload = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { throw new Error(`Saved generations returned invalid data (${response.status})`); }
      if (!response.ok) throw new Error(payload.error || `Saved generations failed (${response.status})`);
      const page = Array.isArray(payload.jobs) ? payload.jobs : [];
      setTotal(Number.isFinite(Number(payload.total)) ? Number(payload.total) : null);
      setHasMore(Boolean(payload.hasMore));
      setJobs((current) => {
        if (reset) return page;
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...page.filter((item) => !seen.has(item.id))];
      });
      setLoadedAt(new Date());
      if (selected) {
        const refreshed = page.find((job) => job.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      if (reset) setLoading(false); else setLoadingMore(false);
    }
  }

  async function refresh() {
    setJobs([]); setHasMore(true); setTotal(null); setSelected(null);
    await loadPage({ reset: true });
  }

  useEffect(() => { loadPage({ reset: true }); }, []);
  useEffect(() => {
    if (!open) return undefined;
    const timer = setInterval(() => refresh(), 15000);
    return () => clearInterval(timer);
  }, [open]);

  const counts = useMemo(() => ({
    all: total ?? jobs.length,
    track_a: jobs.filter((job) => classify(job) === 'track_a').length,
    creators: jobs.filter((job) => classify(job) === 'creators').length,
    youtube: jobs.filter((job) => classify(job) === 'youtube').length,
    other: jobs.filter((job) => classify(job) === 'other').length,
  }), [jobs, total]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((job) => {
      if (filter !== 'all' && classify(job) !== filter) return false;
      if (!q) return true;
      return [job.title, job.job_type, job.persona_id, job.status, job.user_prompt, job.result]
        .map((value) => String(value || '').toLowerCase()).join(' ').includes(q);
    });
  }, [jobs, filter, search]);

  async function remove(job) {
    if (!window.confirm(`Delete this saved generation?\n\n${job.title}\n\nThis cannot be undone.`)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/queue-update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_generation', id: job.id }) });
      const text = await response.text(); let payload = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { throw new Error(`Delete returned invalid data (${response.status})`); }
      if (!response.ok) throw new Error(payload.error || `Delete failed (${response.status})`);
      setJobs((current) => current.filter((item) => item.id !== job.id));
      setSelected((current) => current?.id === job.id ? null : current);
      if (total != null) setTotal((value) => Math.max(0, value - 1));
    } catch (e) { setError(e.message || String(e)); }
    finally { setBusy(false); }
  }

  function copy(value) { const text = String(value || ''); if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text); }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); if (!jobs.length) loadPage({ reset: true }); }} style={ui.launcher} aria-label="Open saved generations">
        Saved generations <span style={{ opacity: .7, marginLeft: 6 }}>{counts.all}</span>
      </button>

      {!open ? null : (
        <div style={ui.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div style={{ maxWidth: 1380, height: 'calc(100vh - 44px)', margin: '0 auto', display: 'grid', gridTemplateColumns: '430px 1fr', gap: 14, background: '#0a0d12', border: '1px solid #252b38', borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 100px rgba(0,0,0,.5)', minHeight: 0 }}>
            <aside style={{ borderRight: '1px solid #202633', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
              <div style={{ padding: 18, borderBottom: '1px solid #202633', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div><div style={{ color: '#d4af37', fontSize: 10, fontWeight: 950, letterSpacing: '.14em', textTransform: 'uppercase' }}>Library</div><h2 style={{ margin: '6px 0 0', fontSize: 24, letterSpacing: '-.03em' }}>Saved generations</h2></div>
                  <div style={{ display: 'flex', gap: 6 }}><button type="button" onClick={refresh} disabled={loading} style={{ border: '1px solid #2a3140', background: '#121720', color: '#d8deea', borderRadius: 10, padding: '7px 10px', cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Refreshing…' : 'Refresh'}</button><button type="button" onClick={() => setOpen(false)} style={{ border: '1px solid #2a3140', background: '#121720', color: '#d8deea', borderRadius: 10, padding: '7px 10px', cursor: 'pointer' }}>Close</button></div>
                </div>
                <p style={{ margin: '10px 0 0', color: '#8791a3', fontSize: 12, lineHeight: 1.55 }}>Cornerstone explains the decision first. Execution data stays available underneath.</p>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles, creator, prompt, output…" style={{ width: '100%', boxSizing: 'border-box', marginTop: 12, background: '#0e1219', color: '#fff', border: '1px solid #283041', borderRadius: 10, padding: '10px 11px' }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>{FILTERS.map(([id, label]) => <button type="button" key={id} onClick={() => setFilter(id)} style={{ border: `1px solid ${filter === id ? '#d4af37' : '#2a3140'}`, background: filter === id ? 'rgba(212,175,55,.12)' : '#10151d', color: filter === id ? '#f5d97f' : '#a3acbc', borderRadius: 999, padding: '6px 9px', fontSize: 10, fontWeight: 850, cursor: 'pointer' }}>{label} <span style={{ opacity: .55 }}>· {counts[id]}</span></button>)}</div>
                <div style={{ marginTop: 8, color: '#5f6a7c', fontSize: 10 }}>{loadedAt ? `Updated ${loadedAt.toLocaleTimeString()}` : 'Loading library…'}{total != null ? ` · ${total.toLocaleString()} saved` : ''}</div>
                {error && <div style={{ marginTop: 10, color: '#ff9a9a', fontSize: 11, lineHeight: 1.5 }}>{error}</div>}
              </div>
              <div style={{ overflowY: 'auto', minHeight: 0, flex: 1, padding: 10 }}>
                {visible.length === 0 ? <div style={{ padding: 18, color: '#687386', fontSize: 12 }}>{loading ? 'Loading saved work…' : 'No saved generations match this view.'}</div> : visible.map((job) => <button type="button" key={job.id} onClick={() => setSelected(job)} style={{ width: '100%', textAlign: 'left', border: `1px solid ${selected?.id === job.id ? '#d4af37' : '#202633'}`, background: selected?.id === job.id ? 'rgba(212,175,55,.07)' : '#0d1117', color: '#edf0f6', borderRadius: 12, padding: 12, marginBottom: 8, cursor: 'pointer' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ color: '#d4af37', fontSize: 9, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>{friendlyType(job)}</span><span style={{ color: job.status === 'completed' ? '#8fd4b4' : job.status === 'error' ? '#ff8e8e' : '#9aa5b5', fontSize: 9, fontWeight: 900 }}>{job.status}</span></div><div style={{ marginTop: 6, fontWeight: 850, fontSize: 12, lineHeight: 1.35 }}>{job.title || 'Untitled generation'}</div><div style={{ marginTop: 6, color: '#697486', fontSize: 10 }}>{job.created_at ? new Date(job.created_at).toLocaleString() : 'Unknown date'}</div></button>)}
              </div>
            </aside>

            <main style={{ minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {!selected ? <div style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', padding: 40, textAlign: 'center' }}><div><div style={{ fontSize: 46, color: '#d4af37' }}>✦</div><h2 style={{ margin: '10px 0 6px', fontSize: 24 }}>Your work stays here.</h2><p style={{ maxWidth: 500, color: '#7f899b', fontSize: 13, lineHeight: 1.65, margin: 0 }}>Select a generation. Cornerstone will show the conclusion first, then the reasoning, evidence and execution data.</p></div></div> : <div style={{ flex: 1, minHeight: 0, height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start' }}><div><div style={{ color: '#d4af37', fontSize: 10, fontWeight: 950, letterSpacing: '.12em', textTransform: 'uppercase' }}>{friendlyType(selected)}</div><h2 style={{ margin: '7px 0 8px', fontSize: 28, lineHeight: 1.08, letterSpacing: '-.035em' }}>{selected.title || 'Untitled generation'}</h2><div style={{ color: '#717c8e', fontSize: 11 }}>{selected.created_at ? new Date(selected.created_at).toLocaleString() : ''} · {selected.model || 'Qwen'}</div></div><div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={() => copy(prettyResult(selected.result || selected.error_message || ''))} style={{ border: '1px solid #303648', background: '#141922', color: '#e6ebf4', borderRadius: 10, padding: '8px 11px', fontWeight: 850, cursor: 'pointer' }}>Copy output</button><button type="button" disabled={busy} onClick={() => remove(selected)} style={{ border: '1px solid rgba(255,105,105,.35)', background: 'rgba(255,105,105,.08)', color: '#ff9f9f', borderRadius: 10, padding: '8px 11px', fontWeight: 850, cursor: 'pointer' }}>Delete</button></div></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>{[['Workspace', friendlyType(selected)], ['Persona', selected.persona_id || '—'], ['Status', selected.status || '—'], ['Production', selected.production_status || 'not_started']].map(([k, v]) => <span key={k} style={{ border: '1px solid #262d3a', background: '#0e1219', color: '#9ca7b8', borderRadius: 999, padding: '7px 9px', fontSize: 10 }}><b style={{ color: '#d8deea' }}>{k}:</b> {v}</span>)}</div>
                {selected.status === 'error' && <div style={{ marginTop: 18, border: '1px solid rgba(255,105,105,.3)', background: 'rgba(255,105,105,.06)', borderRadius: 12, padding: 14, color: '#ffb2b2', fontSize: 12 }}>{selected.error_message || 'Generation failed.'}</div>}
                <div style={{ marginTop: 18 }}><ExplainResult job={selected} /></div>
                {selected.user_prompt && <details style={{ ...ui.card, marginTop: 14 }}><summary style={ui.summary}>Input prompt</summary><pre style={ui.raw}>{toText(selected.user_prompt)}</pre></details>}
                {selected.system_prompt && <details style={{ ...ui.card, marginTop: 14 }}><summary style={ui.summary}>System context</summary><pre style={ui.raw}>{toText(selected.system_prompt)}</pre></details>}
                {selected.options && <details style={{ ...ui.card, marginTop: 14 }}><summary style={ui.summary}>Generation settings</summary><pre style={ui.raw}>{toText(selected.options)}</pre></details>}
                {(selected.video_url || selected.captioned_video_url) && <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>{selected.video_url && <a href={selected.video_url} target="_blank" rel="noreferrer" style={{ color: '#a9c8ff' }}>Open generated video →</a>}{selected.captioned_video_url && <a href={selected.captioned_video_url} target="_blank" rel="noreferrer" style={{ color: '#a9c8ff' }}>Open captioned video →</a>}</div>}
              </div>}
            </main>
          </div>
        </div>
      )}
    </>
  );
}
