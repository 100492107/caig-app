import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

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
  if (persona.includes('cornerstone_track_a_social') || title.includes('track a') || type.includes('track_a') || type.includes('social_caption')) return 'track_a';
  if (persona.includes('youtube') || type.includes('youtube')) return 'youtube';
  if (persona.includes('cara') || persona.includes('lila') || type.includes('growth') || type.includes('commerce') || title.includes('cara') || title.includes('lila')) return 'creators';
  return 'other';
}

function prettyResult(value) {
  if (!value) return '';
  try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return String(value); }
}

function friendlyType(job) {
  const group = classify(job);
  if (group === 'track_a') return 'Track A Social';
  if (group === 'youtube') return 'YouTube';
  if (group === 'creators') return 'Creator Studio';
  return job?.job_type || 'Generation';
}

export default function PersistentGenerations() {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const { data, error: queryError } = await supabase
      .from('local_ai_jobs')
      .select('id,title,job_type,persona_id,status,result,error_message,production_status,created_at,completed_at,video_url,captioned_video_url')
      .in('status', ['completed', 'error', 'processing', 'queued'])
      .order('created_at', { ascending: false })
      .limit(500);
    if (queryError) throw queryError;
    setJobs(data || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message || String(e)));
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setInterval(() => { load().catch(() => {}); }, 8000);
    return () => clearInterval(timer);
  }, [open]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchFilter = filter === 'all' || classify(job) === filter;
      if (!matchFilter) return false;
      if (!q) return true;
      return [job.title, job.job_type, job.persona_id, job.status].some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [jobs, filter, search]);

  async function remove(job) {
    const confirmed = window.confirm(`Delete this saved generation?\n\n${job.title}\n\nThis cannot be undone.`);
    if (!confirmed) return;
    setBusy(true);
    setError('');
    try {
      const { error: deleteError } = await supabase.from('local_ai_jobs').delete().eq('id', job.id);
      if (deleteError) throw deleteError;
      setJobs((current) => current.filter((item) => item.id !== job.id));
      if (selected?.id === job.id) setSelected(null);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function copy(value) {
    navigator.clipboard?.writeText(String(value || ''));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', right: 20, bottom: 20, zIndex: 1200,
          border: '1px solid rgba(212,175,55,.45)',
          background: 'linear-gradient(135deg,#171a22,#0b0e14)',
          color: '#f5d97f', borderRadius: 999, padding: '11px 15px',
          fontWeight: 900, boxShadow: '0 18px 50px rgba(0,0,0,.38)', cursor: 'pointer'
        }}
      >
        Saved generations <span style={{ opacity: .7, marginLeft: 6 }}>{jobs.filter((j) => j.status === 'completed').length}</span>
      </button>

      {!open ? null : (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(4,6,10,.72)', backdropFilter: 'blur(14px)', padding: 22 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div style={{ maxWidth: 1320, height: 'calc(100vh - 44px)', margin: '0 auto', display: 'grid', gridTemplateColumns: '420px 1fr', gap: 14, background: '#0a0d12', border: '1px solid #252b38', borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 100px rgba(0,0,0,.5)' }}>
            <aside style={{ borderRight: '1px solid #202633', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ padding: 18, borderBottom: '1px solid #202633' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div><div style={{ color: '#d4af37', fontSize: 10, fontWeight: 950, letterSpacing: '.14em', textTransform: 'uppercase' }}>Persistent library</div><h2 style={{ margin: '6px 0 0', fontSize: 24, letterSpacing: '-.03em' }}>Saved generations</h2></div>
                  <button type="button" onClick={() => setOpen(false)} style={{ border: '1px solid #2a3140', background: '#121720', color: '#d8deea', borderRadius: 10, padding: '7px 10px', cursor: 'pointer' }}>Close</button>
                </div>
                <p style={{ margin: '10px 0 0', color: '#8791a3', fontSize: 12, lineHeight: 1.55 }}>Nothing here is cleared automatically. A generation stays available until you delete it.</p>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles, creator, workspace…" style={{ width: '100%', boxSizing: 'border-box', marginTop: 12, background: '#0e1219', color: '#fff', border: '1px solid #283041', borderRadius: 10, padding: '10px 11px' }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>{FILTERS.map(([id, label]) => <button type="button" key={id} onClick={() => setFilter(id)} style={{ border: `1px solid ${filter === id ? '#d4af37' : '#2a3140'}`, background: filter === id ? 'rgba(212,175,55,.12)' : '#10151d', color: filter === id ? '#f5d97f' : '#a3acbc', borderRadius: 999, padding: '6px 9px', fontSize: 10, fontWeight: 850, cursor: 'pointer' }}>{label}</button>)}</div>
                {error && <div style={{ marginTop: 10, color: '#ff9a9a', fontSize: 11 }}>{error}</div>}
              </div>

              <div style={{ overflowY: 'auto', padding: 10 }}>
                {visible.length === 0 ? <div style={{ padding: 18, color: '#687386', fontSize: 12 }}>No saved generations match this view.</div> : visible.map((job) => (
                  <button type="button" key={job.id} onClick={() => setSelected(job)} style={{ width: '100%', textAlign: 'left', border: `1px solid ${selected?.id === job.id ? '#d4af37' : '#202633'}`, background: selected?.id === job.id ? 'rgba(212,175,55,.07)' : '#0d1117', color: '#edf0f6', borderRadius: 12, padding: 12, marginBottom: 8, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ color: '#d4af37', fontSize: 9, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>{friendlyType(job)}</span><span style={{ color: job.status === 'completed' ? '#8fd4b4' : job.status === 'error' ? '#ff8e8e' : '#9aa5b5', fontSize: 9, fontWeight: 900 }}>{job.status}</span></div>
                    <div style={{ marginTop: 6, fontWeight: 850, fontSize: 12, lineHeight: 1.35 }}>{job.title}</div>
                    <div style={{ marginTop: 6, color: '#697486', fontSize: 10 }}>{new Date(job.created_at).toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </aside>

            <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {!selected ? (
                <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 40, textAlign: 'center' }}><div><div style={{ fontSize: 46, color: '#d4af37' }}>✦</div><h2 style={{ margin: '10px 0 6px', fontSize: 24 }}>Your work stays here.</h2><p style={{ maxWidth: 500, color: '#7f899b', fontSize: 13, lineHeight: 1.65, margin: 0 }}>Choose a saved generation to inspect the exact Qwen output, prompts and production package that was produced. Refreshing or leaving the app will not erase it.</p></div></div>
              ) : (
                <div style={{ height: '100%', overflowY: 'auto', padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start' }}>
                    <div><div style={{ color: '#d4af37', fontSize: 10, fontWeight: 950, letterSpacing: '.12em', textTransform: 'uppercase' }}>{friendlyType(selected)}</div><h2 style={{ margin: '7px 0 8px', fontSize: 28, lineHeight: 1.08, letterSpacing: '-.035em' }}>{selected.title}</h2><div style={{ color: '#717c8e', fontSize: 11 }}>{new Date(selected.created_at).toLocaleString()} · {selected.model || 'Qwen'}</div></div><div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={() => copy(prettyResult(selected.result || selected.error_message || ''))} style={{ border: '1px solid #303648', background: '#141922', color: '#e6ebf4', borderRadius: 10, padding: '8px 11px', fontWeight: 850, cursor: 'pointer' }}>Copy output</button><button type="button" disabled={busy} onClick={() => remove(selected)} style={{ border: '1px solid rgba(255,105,105,.35)', background: 'rgba(255,105,105,.08)', color: '#ff9f9f', borderRadius: 10, padding: '8px 11px', fontWeight: 850, cursor: 'pointer' }}>Delete</button></div></div>
                  {selected.status === 'error' ? <div style={{ marginTop: 18, border: '1px solid rgba(255,105,105,.3)', background: 'rgba(255,105,105,.06)', borderRadius: 12, padding: 14, color: '#ffb2b2', fontSize: 12 }}>{selected.error_message || 'Generation failed.'}</div> : <><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>{[['Workspace', friendlyType(selected)], ['Persona', selected.persona_id || '—'], ['Status', selected.status], ['Production', selected.production_status || 'not_started']].map(([k, v]) => <span key={k} style={{ border: '1px solid #262d3a', background: '#0e1219', color: '#9ca7b8', borderRadius: 999, padding: '7px 9px', fontSize: 10 }}><b style={{ color: '#d8deea' }}>{k}:</b> {v}</span>)}</div><div style={{ marginTop: 16, border: '1px solid #202633', borderRadius: 14, background: '#090c11', padding: 14 }}><div style={{ color: '#7f899b', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.09em' }}>Saved output</div><pre style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', color: '#c4ccd9', fontSize: 11, lineHeight: 1.65 }}>{prettyResult(selected.result)}</pre></div>{(selected.video_url || selected.captioned_video_url) && <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>{selected.video_url && <a href={selected.video_url} target="_blank" rel="noreferrer" style={{ color: '#a9c8ff' }}>Open generated video →</a>}{selected.captioned_video_url && <a href={selected.captioned_video_url} target="_blank" rel="noreferrer" style={{ color: '#a9c8ff' }}>Open captioned video →</a>}</div>}</>}
                </div>
              )}
            </main>
          </div>
        </div>
      )}
    </>
  );
}
