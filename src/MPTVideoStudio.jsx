import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const shell = { minHeight: '100vh', background: '#08070d', color: '#eef1f7', padding: '28px 32px 72px', fontFamily: 'Inter, system-ui, sans-serif' };
const card = { background: '#0e1017', border: '1px solid #252a39', borderRadius: 16, padding: 18 };
const button = { border: '1px solid #303648', background: '#151924', color: '#eef1f7', borderRadius: 9, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' };
const primary = { ...button, borderColor: '#d4af37', background: 'rgba(212,175,55,.14)', color: '#f7d77b' };

const MODES = [
  { id: 'static_image', label: 'Static Image', desc: 'One elite image. No video generation.', defaultSeconds: 1, tier: 'low' },
  { id: 'carousel', label: 'Carousel', desc: '4–6 coherent images from one creative.', defaultSeconds: 1, tier: 'low' },
  { id: 'cinematic_motion', label: 'Cinematic Motion', desc: 'One image with subtle 5–8s motion.', defaultSeconds: 8, tier: 'low' },
  { id: 'multi_image_motion', label: 'Multi-Image Motion', desc: '2–4 images with motion between each shot.', defaultSeconds: 16, tier: 'medium' },
  { id: 'ugc', label: 'UGC', desc: 'Character/product reference driven social content.', defaultSeconds: 15, tier: 'medium' },
  { id: 'short_form', label: 'Short-form', desc: '5–60s social-first production.', defaultSeconds: 30, tier: 'medium' },
  { id: 'long_form', label: 'Long-form', desc: 'YouTube-style story with scenes and derivatives.', defaultSeconds: 600, tier: 'high' },
];

const PROVIDERS = [
  { id: 'auto', label: 'Auto (recommended)' },
  { id: 'local', label: 'Free / local first' },
  { id: 'mpt', label: 'MPT fallback' },
  { id: 'premium', label: 'Premium AI where justified' },
];

function parsePayload(row) {
  let notes = {};
  try { notes = row.notes ? JSON.parse(row.notes) : {}; } catch {}
  const hypothesis = notes?.hypothesis || {};
  return {
    video_subject: hypothesis?.title || row.hook || row.content_label || 'Cornerstone creative',
    video_script: row.caption || hypothesis?.caption_direction || row.hook || '',
    video_terms: row.photo_direction || row.photo_idea || hypothesis?.visual_language || hypothesis?.scene || '',
    video_aspect: '9:16',
    video_source: 'pexels',
    match_materials_to_script: true,
    subtitle_enabled: true,
    subtitle_position: 'bottom',
    video_count: 1,
    custom_system_prompt: 'Create a socially native short-form video from this approved creative brief. Keep the result specific, understated and human. Do not add generic influencer language, fabricated claims or over-polished ad conventions.',
  };
}

function estimate(mode, seconds, outputs, provider) {
  const selected = MODES.find((m) => m.id === mode) || MODES[0];
  if (provider === 'local' || mode === 'static_image' || mode === 'carousel') return { credits: 0, tier: selected.tier === 'high' ? 'medium' : 'low' };
  if (provider === 'mpt') return { credits: 0, tier: 'low' };
  const motionSeconds = Math.max(0, Number(seconds) || 0);
  const base = selected.id === 'long_form' ? 24 : selected.id === 'ugc' ? 8 : selected.id === 'multi_image_motion' ? 6 : 3;
  const premium = Math.max(1, Math.ceil(motionSeconds / 5));
  return { credits: base + premium * Math.max(1, outputs), tier: selected.tier === 'high' ? 'high' : 'medium' };
}

export default function MPTVideoStudio() {
  const [rows, setRows] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState('cinematic_motion');
  const [duration, setDuration] = useState(8);
  const [outputs, setOutputs] = useState(1);
  const [provider, setProvider] = useState('auto');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: creative } = await supabase
      .from('content_queue')
      .select('id,content_label,persona_name,platform,status,caption,photo_direction,photo_idea,notes,created_at')
      .like('content_label', '%Creative Engine%')
      .order('created_at', { ascending: false })
      .limit(60);
    if (creative) setRows(creative);

    const { data: jobRows } = await supabase
      .from('mpt_video_jobs')
      .select('id,content_queue_id,status,mpt_task_id,output_url,error_message,created_at,completed_at,payload')
      .order('created_at', { ascending: false })
      .limit(30);
    if (jobRows) setJobs(jobRows);
  }

  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    const selectedMode = MODES.find((m) => m.id === mode);
    if (selectedMode) setDuration(selectedMode.defaultSeconds);
  }, [mode]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);
  const estimateResult = useMemo(() => estimate(mode, duration, outputs, provider), [mode, duration, outputs, provider]);
  const modeInfo = MODES.find((m) => m.id === mode) || MODES[0];

  async function queueProduction() {
    if (!selected) return;
    setBusy(true);
    setMessage('Saving production brief…');
    const payload = parsePayload(selected);
    payload.production_config = {
      mode,
      target_duration_seconds: Number(duration),
      output_count: Number(outputs),
      provider_strategy: provider,
      estimated_credits: estimateResult.credits,
      estimated_compute_tier: estimateResult.tier,
      reference_assets: [],
    };

    const { error } = await supabase.from('mpt_video_jobs').insert({
      content_queue_id: selected.id,
      status: 'queued',
      payload,
    });

    if (error) setMessage(`Could not queue production: ${error.message}`);
    else setMessage(`${modeInfo.label} queued. Phase 1 execution currently uses the local MPT adapter; richer local/premium adapters plug into the same production brief.`);
    await load();
    setBusy(false);
  }

  return (
    <div style={shell}>
      <div style={{ maxWidth: 1180, margin: '0 auto 18px' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '.16em', fontSize: 10, color: '#d4af37', fontWeight: 800 }}>CornerstoneAIAssets · Track B</div>
        <h1 style={{ margin: '8px 0 5px', fontSize: 32, letterSpacing: '-.04em' }}>Production Studio</h1>
        <p style={{ margin: 0, color: '#8d95a7', fontSize: 13 }}>One approved creative can become an image, carousel, motion reel, UGC, short-form or long-form production.</p>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 16 }}>
        <section style={card}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>1. Choose the creative source</div>
          <div style={{ color: '#7f8798', fontSize: 12, marginBottom: 14 }}>The Creative Engine remains the source of truth. Approved assets will become reusable production references as the Asset Library lands.</div>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ width: '100%', background: '#151822', color: '#fff', border: '1px solid #2a3040', borderRadius: 9, padding: 11 }}>
            <option value="">Choose a Creative Engine item…</option>
            {rows.map((r) => <option key={r.id} value={r.id}>{r.content_label} · {r.platform} · {r.status}</option>)}
          </select>
          {selected && (
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <div style={{ ...card, background: '#0a0c12' }}><b>{selected.content_label}</b><div style={{ color: '#768093', marginTop: 4, fontSize: 11 }}>{selected.persona_name} · {selected.platform}</div></div>
              <div style={{ ...card, background: '#0a0c12' }}><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#7c8495', letterSpacing: '.1em' }}>Caption / script input</div><div style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, color: '#d4dae5' }}>{selected.caption || 'No caption saved.'}</div></div>
            </div>
          )}

          <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>2. Production mode</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                {MODES.map((m) => (
                  <button key={m.id} onClick={() => setMode(m.id)} style={{ ...button, textAlign: 'left', borderColor: mode === m.id ? '#d4af37' : '#303648', background: mode === m.id ? 'rgba(212,175,55,.11)' : '#151924' }}>
                    <div style={{ fontSize: 12 }}>{m.label}</div>
                    <div style={{ color: '#7c8495', fontSize: 10, marginTop: 4, fontWeight: 500 }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <label style={{ fontSize: 11, color: '#9ca5b6' }}>Duration (sec)
                <input type="number" min="1" max="7200" value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={{ marginTop: 6, width: '100%', boxSizing: 'border-box', background: '#151822', color: '#fff', border: '1px solid #2a3040', borderRadius: 9, padding: 10 }} />
              </label>
              <label style={{ fontSize: 11, color: '#9ca5b6' }}>Outputs
                <select value={outputs} onChange={(e) => setOutputs(Number(e.target.value))} style={{ marginTop: 6, width: '100%', background: '#151822', color: '#fff', border: '1px solid #2a3040', borderRadius: 9, padding: 10 }}>
                  {[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 11, color: '#9ca5b6' }}>Provider strategy
                <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ marginTop: 6, width: '100%', background: '#151822', color: '#fff', border: '1px solid #2a3040', borderRadius: 9, padding: 10 }}>
                  {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </label>
            </div>

            <div style={{ ...card, background: '#0a0c12', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#6f788b' }}>Estimated credits</div><div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{estimateResult.credits}</div></div>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#6f788b' }}>Compute tier</div><div style={{ fontSize: 20, fontWeight: 900, marginTop: 4, textTransform: 'capitalize' }}>{estimateResult.tier}</div></div>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#6f788b' }}>Mode</div><div style={{ fontSize: 14, fontWeight: 900, marginTop: 7 }}>{modeInfo.label}</div></div>
            </div>

            <button style={primary} onClick={queueProduction} disabled={busy || !selected}>{busy ? 'Saving…' : `Queue ${modeInfo.label}`}</button>
          </div>
        </section>

        <section style={card}>
          <div style={{ fontWeight: 800 }}>Production history</div>
          <div style={{ color: '#7f8798', fontSize: 12, margin: '6px 0 14px' }}>The production brief persists even while the execution layer evolves beyond MPT.</div>
          {jobs.map((j) => {
            const cfg = j?.payload?.production_config || {};
            return (
              <div key={j.id} style={{ borderTop: '1px solid #252a39', padding: '11px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'capitalize' }}>{String(cfg.mode || 'legacy video').replaceAll('_', ' ')}</div>
                  <div style={{ fontSize: 10, color: j.status === 'completed' ? '#49d5a7' : j.status === 'error' ? '#ff8585' : '#c1c7d4' }}>{j.status}</div>
                </div>
                <div style={{ color: '#717b8f', fontSize: 10, marginTop: 4 }}>{cfg.target_duration_seconds || '—'}s · {cfg.output_count || 1} output · {cfg.provider_strategy || 'mpt'}</div>
                <div style={{ color: '#717b8f', fontSize: 10, marginTop: 2 }}>{new Date(j.created_at).toLocaleString()}</div>
                {j.output_url && <a href={j.output_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 7, color: '#d4af37', fontSize: 11 }}>Open finished video →</a>}
                {j.error_message && <div style={{ color: '#ff8585', fontSize: 10, marginTop: 5 }}>{j.error_message}</div>}
              </div>
            );
          })}
          {jobs.length === 0 && <div style={{ color: '#697286', fontSize: 12, paddingTop: 14 }}>No production jobs yet.</div>}
        </section>
      </div>

      {message && <div style={{ maxWidth: 1180, margin: '14px auto 0', ...card, color: '#d4af37', fontSize: 12 }}>{message}</div>}
    </div>
  );
}
