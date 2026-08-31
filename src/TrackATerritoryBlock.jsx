import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const card = { background: '#0e1219', border: '1px solid #252d3a', borderRadius: 18, padding: 18 };
const input = { width: '100%', boxSizing: 'border-box', background: '#0a0e14', color: '#eef1f6', border: '1px solid #2b3442', borderRadius: 10, padding: '10px 12px' };
const button = { border: '1px solid #313a49', background: '#131923', color: '#eef1f6', borderRadius: 10, padding: '9px 12px', fontWeight: 850, cursor: 'pointer' };
const primary = { ...button, background: '#d4af37', borderColor: '#d4af37', color: '#151108' };

function deriveWarm(events) {
  const byDealer = new Map();
  for (const row of events) {
    const key = String(row.dealer_id || row.dealer_name || '').trim().toLowerCase();
    if (!key) continue;
    const current = byDealer.get(key) || { ...row, stages: new Set() };
    current.stages.add(row.stage);
    if ((row.created_at || '') > (current.created_at || '')) Object.assign(current, row);
    byDealer.set(key, current);
  }
  return [...byDealer.values()]
    .filter((row) => row.stages.has('positive') && !row.stages.has('sample') && !row.stages.has('diagnostic') && !row.stages.has('pilot') && !row.stages.has('recurring'))
    .sort((a, b) => String(a.next_action_at || a.created_at || '').localeCompare(String(b.next_action_at || b.created_at || '')));
}

export default function TrackATerritoryBlock() {
  const [territories, setTerritories] = useState([]);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ zip_code: '', territory_name: '', target_dealers: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    const [t, e] = await Promise.all([
      supabase.from('track_a_territories').select('*').order('status', { ascending: true }).order('created_at', { ascending: false }),
      supabase.from('track_a_revenue_events').select('*').order('created_at', { ascending: false }).limit(800),
    ]);
    if (t.error) setMessage(t.error.message);
    else setTerritories(t.data || []);
    if (e.error) setMessage(e.error.message);
    else setEvents(e.data || []);
    setBusy(false);
  }

  useEffect(() => { load(); }, []);

  const warm = useMemo(() => deriveWarm(events), [events]);
  const active = useMemo(() => territories.filter((x) => x.status === 'active'), [territories]);

  async function addTerritory() {
    if (!form.zip_code.trim()) return setMessage('ZIP code is required.');
    const { error } = await supabase.from('track_a_territories').insert({ zip_code: form.zip_code.trim(), territory_name: form.territory_name.trim() || null, target_dealers: Number(form.target_dealers || 0) });
    if (error) setMessage(error.message);
    else { setForm({ zip_code: '', territory_name: '', target_dealers: '' }); setMessage('ZIP territory added.'); await load(); }
  }

  async function setStatus(id, status) {
    const patch = { status, last_activity_at: new Date().toISOString() };
    const { error } = await supabase.from('track_a_territories').update(patch).eq('id', id);
    if (error) setMessage(error.message); else await load();
  }

  return <div style={{ minHeight: '100vh', background: '#07090d', color: '#eef1f6', padding: '30px 24px 80px', fontFamily: 'Inter,system-ui,sans-serif' }}>
    <div style={{ maxWidth: 1350, margin: '0 auto' }}>
      <div style={{ color: '#d4af37', fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 900 }}>Track A · Territory Control</div>
      <h1 style={{ margin: '8px 0 6px', fontSize: 40, letterSpacing: '-.05em' }}>Work the territory. Work the warm lead.</h1>
      <p style={{ margin: 0, color: '#8791a1', maxWidth: 850, lineHeight: 1.6 }}>Keep one active ZIP focus, exhaust it systematically, and surface positive dealers until each one moves to a sample or diagnostic call.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 18 }}>
        <div style={card}><div style={{ color: '#7f8999', fontSize: 9, textTransform: 'uppercase' }}>Active ZIPs</div><div style={{ fontSize: 30, fontWeight: 950, marginTop: 6 }}>{active.length}</div></div>
        <div style={card}><div style={{ color: '#7f8999', fontSize: 9, textTransform: 'uppercase' }}>Unreplied positives</div><div style={{ fontSize: 30, fontWeight: 950, marginTop: 6 }}>{warm.length}</div></div>
        <div style={card}><div style={{ color: '#7f8999', fontSize: 9, textTransform: 'uppercase' }}>Territories exhausted</div><div style={{ fontSize: 30, fontWeight: 950, marginTop: 6 }}>{territories.filter((x) => x.status === 'exhausted').length}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <section style={card}>
          <div style={{ color: '#d4af37', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>ZIP control</div>
          <h2 style={{ margin: '7px 0 4px', fontSize: 23 }}>Current territories</h2>
          <div style={{ display: 'grid', gap: 9, marginTop: 12 }}>
            {territories.map((row) => {
              const coverage = Math.max(Number(row.discovered_dealers || 0), 0);
              const contacted = Math.max(Number(row.contacted_dealers || 0), 0);
              const pct = coverage ? Math.min(100, Math.round((contacted / coverage) * 100)) : 0;
              return <div key={row.id} style={{ padding: 12, borderRadius: 12, border: '1px solid #252e3a', background: '#0b0f15' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><div><div style={{ fontWeight: 900 }}>{row.zip_code}{row.territory_name ? ` · ${row.territory_name}` : ''}</div><div style={{ color: '#6f7889', fontSize: 10, marginTop: 3 }}>{row.status} · {contacted}/{coverage || Number(row.target_dealers || 0) || 0} contacted</div></div><div style={{ color: '#d4af37', fontWeight: 900 }}>{pct}%</div></div>
                <div style={{ height: 6, marginTop: 9, background: '#1b2230', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: '#d4af37' }} /></div>
                <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>{row.status === 'active' ? <><button style={button} onClick={() => setStatus(row.id, 'paused')}>Pause</button><button style={primary} onClick={() => setStatus(row.id, 'exhausted')}>Mark exhausted</button></> : row.status === 'paused' ? <button style={button} onClick={() => setStatus(row.id, 'active')}>Reactivate</button> : <button style={button} onClick={() => setStatus(row.id, 'active')}>Reopen</button>}</div>
              </div>;
            })}
            {!territories.length && <div style={{ color: '#667083', padding: 14, border: '1px dashed #2a3340', borderRadius: 12 }}>No ZIP territories yet.</div>}
          </div>
          <div style={{ borderTop: '1px solid #252e3a', marginTop: 15, paddingTop: 15 }}>
            <div style={{ color: '#7f8999', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>Add next territory</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr .7fr', gap: 8, marginTop: 9 }}><input style={input} placeholder="ZIP code" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} /><input style={input} placeholder="Territory name" value={form.territory_name} onChange={(e) => setForm({ ...form, territory_name: e.target.value })} /><input style={input} placeholder="Target dealers" type="number" value={form.target_dealers} onChange={(e) => setForm({ ...form, target_dealers: e.target.value })} /></div>
            <button style={{ ...primary, marginTop: 9 }} onClick={addTerritory} disabled={busy}>Add ZIP territory →</button>
          </div>
        </section>

        <section style={card}>
          <div style={{ color: '#d4af37', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>Warm queue</div>
          <h2 style={{ margin: '7px 0 4px', fontSize: 23 }}>Positive dealers that have not moved</h2>
          <p style={{ color: '#7f8999', fontSize: 11, lineHeight: 1.5 }}>These have a positive event recorded but no sample, diagnostic, pilot or recurring event yet.</p>
          <div style={{ display: 'grid', gap: 9, marginTop: 12 }}>
            {warm.map((row) => <div key={row.dealer_id || row.dealer_name} style={{ padding: 12, borderRadius: 12, border: '1px solid #252e3a', background: '#0b0f15' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><div><div style={{ fontWeight: 900 }}>{row.dealer_name}</div><div style={{ color: '#6f7889', fontSize: 10, marginTop: 3 }}>{row.zip_code || 'ZIP not recorded'} · positive</div></div><a href={`/outreach?dealer=${encodeURIComponent(JSON.stringify({ id: row.dealer_id || '', name: row.dealer_name || '' }))}`} style={{ ...button, textDecoration: 'none' }}>Work lead →</a></div></div>)}
            {!warm.length && <div style={{ color: '#667083', padding: 14, border: '1px dashed #2a3340', borderRadius: 12 }}>No unreplied positives right now.</div>}
          </div>
        </section>
      </div>
      {message && <div style={{ marginTop: 14, ...card, fontSize: 12, color: '#c9d0da' }}>{message}</div>}
    </div>
  </div>;
}
