import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const shell = { minHeight: '100vh', background: '#08070d', color: '#eef1f7', padding: '28px 32px 72px', fontFamily: 'Inter, system-ui, sans-serif' };
const card = { background: '#0e1017', border: '1px solid #252a39', borderRadius: 16, padding: 18 };
const button = { border: '1px solid #303648', background: '#151924', color: '#eef1f7', borderRadius: 9, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' };
const primary = { ...button, borderColor: '#d4af37', background: 'rgba(212,175,55,.14)', color: '#f7d77b' };

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

export default function MPTVideoStudio() {
  const [rows, setRows] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState('');
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
      .select('id,content_queue_id,status,mpt_task_id,output_url,error_message,created_at,completed_at')
      .order('created_at', { ascending: false })
      .limit(30);
    if (jobRows) setJobs(jobRows);
  }

  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, []);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);

  async function queueVideo() {
    if (!selected) return;
    setBusy(true); setMessage('Queueing video for MoneyPrinterTurbo…');
    const payload = parsePayload(selected);
    const { error } = await supabase.from('mpt_video_jobs').insert({
      content_queue_id: selected.id,
      status: 'queued',
      payload,
    });
    if (error) setMessage(`Could not queue video: ${error.message}`);
    else setMessage('Queued. Keep the MoneyPrinterTurbo worker running on the Mac.');
    await load();
    setBusy(false);
  }

  return (
    <div style={shell}>
      <div style={{ maxWidth: 1180, margin: '0 auto 18px' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '.16em', fontSize: 10, color: '#d4af37', fontWeight: 800 }}>Production worker</div>
        <h1 style={{ margin: '8px 0 5px', fontSize: 32, letterSpacing: '-.04em' }}>MoneyPrinterTurbo</h1>
        <p style={{ margin: 0, color: '#8d95a7', fontSize: 13 }}>Creative Engine → approved brief → local video production → saved result.</p>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 16 }}>
        <section style={card}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>1. Pick an approved creative</div>
          <div style={{ color: '#7f8798', fontSize: 12, marginBottom: 14 }}>The worker only produces from a Creative Engine record already saved to the queue.</div>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ width: '100%', background: '#151822', color: '#fff', border: '1px solid #2a3040', borderRadius: 9, padding: 11 }}>
            <option value="">Choose a Creative Engine item…</option>
            {rows.map((r) => <option key={r.id} value={r.id}>{r.content_label} · {r.platform} · {r.status}</option>)}
          </select>
          {selected && (
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <div style={{ ...card, background: '#0a0c12' }}><b>{selected.content_label}</b><div style={{ color: '#768093', marginTop: 4, fontSize: 11 }}>{selected.persona_name} · {selected.platform}</div></div>
              <div style={{ ...card, background: '#0a0c12' }}><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#7c8495', letterSpacing: '.1em' }}>Caption / script input</div><div style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6, color: '#d4dae5' }}>{selected.caption || 'No caption saved.'}</div></div>
              <button style={primary} onClick={queueVideo} disabled={busy}>{busy ? 'Queueing…' : 'Generate Reel with MoneyPrinterTurbo'}</button>
            </div>
          )}
        </section>

        <section style={card}>
          <div style={{ fontWeight: 800 }}>2. Local worker status</div>
          <div style={{ color: '#7f8798', fontSize: 12, margin: '6px 0 14px' }}>The Mac worker watches Supabase and calls <code>127.0.0.1:8080</code>.</div>
          <div style={{ ...card, background: '#0a0c12', marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: '#9ca5b6' }}>MoneyPrinterTurbo API</div>
            <div style={{ color: '#49d5a7', fontWeight: 800, marginTop: 4 }}>Local v1.3.4 · :8080</div>
          </div>
          {jobs.map((j) => (
            <div key={j.id} style={{ borderTop: '1px solid #252a39', padding: '10px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 800 }}>{j.status}</div>
              <div style={{ color: '#717b8f', fontSize: 10, marginTop: 3 }}>{new Date(j.created_at).toLocaleString()}</div>
              {j.output_url && <a href={j.output_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 7, color: '#d4af37', fontSize: 11 }}>Open finished video →</a>}
              {j.error_message && <div style={{ color: '#ff8585', fontSize: 10, marginTop: 5 }}>{j.error_message}</div>}
            </div>
          ))}
          {jobs.length === 0 && <div style={{ color: '#697286', fontSize: 12, paddingTop: 14 }}>No MoneyPrinterTurbo jobs yet.</div>}
        </section>
      </div>

      {message && <div style={{ maxWidth: 1180, margin: '14px auto 0', ...card, color: '#d4af37', fontSize: 12 }}>{message}</div>}
    </div>
  );
}
