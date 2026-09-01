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
  const exhausted = useMemo(() => territories.filter((x) => x.status === 'exhausted'), [territories]);
  const nextWarm = warm[0] || null;

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

  function dealerLink(row) {
    return `/outreach?dealer=${encodeURIComponent(JSON.stringify({ id: row?.dealer_id || '', name: row?.dealer_name || '', zip_code: row?.zip_code || '' }))}`;
  }

  return <div style={{ minHeight: '100vh', background: '#07090d', color: '#eef1f6', padding: '30px 24px 80px', fontFamily: 'Inter,system-ui,sans-serif' }}>
    <div style={{ maxWidth: 1450, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#d4af37', fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 900 }}>Track A · Territory Control</div>
          <h1 style={{ margin: '8px 0 6px', fontSize: 40, letterSpacing: '-.05em' }}>Work the territory. Work the warm lead.</h1>
          <p style={{ margin: 0, color: '#8791a1', maxWidth: 860, lineHeight: 1.6 }}>Keep one active ZIP focus, exhaust it systematically, and move positive dealers to a sample or diagnostic call.</p>
        </div>
        {nextWarm && <a href={dealerLink(nextWarm)} style={{ ...primary, textDecoration: 'none', padding: '12px 16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>Next warm lead <span>→</span></a>}
      </div>

      {nextWarm && <section style={{ ...card, marginTop: 18, background: 'linear-gradient(135deg,#12100a,#0d1219)', borderColor: 'rgba(212,175,55,.28)' }}>
        <div style={{ color: '#d4af37', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 900 }}>Next action</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 7 }}>
          <div><div style={{ fontWeight: 950, fontSize: 20 }}>{nextWarm.dealer_name}</div><div style={{ color: '#8993a3', fontSize: 11, marginTop: 3 }}>{nextWarm.zip_code || 'ZIP not recorded'} · positive reply · no sample/diagnostic/pilot yet</div></div>
          <a href={dealerLink(nextWarm)} style={{ ...primary, textDecoration: 'none' }}>Open dealer workflow →</a>
        </div>
      </section>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginTop: 18 }}>
        <div style={card}><div style={{ color: '#7f8999', fontSize: 9, textTransform: 'uppercase' }}>Active ZIPs</div><div style={{ fontSize: 30, fontWeight: 950, marginTop: 6 }}>{active.length}</div></div>
        <div style={card}><div style={{ color: '#7f8999', fontSize: 9, textTransform: 'uppercase' }}>Unreplied positives</div><div style={{ fontSize: 30, fontWeight: 950, marginTop: 6 }}>{warm.length}</div></div>
        <div style={card}><div style={{ color: '#7f8999', fontSize: 9, textTransform: 'uppercase' }}>Territories exhausted</div><div style={{ fontSize: 30, fontWeight: 950, marginTop: 6 }}>{exhausted.length}</div></div>
        <div style={card}><div style={{ color: '#7f8999', fontSize: 9, textTransform: 'uppercase' }}>Dealers in focus</div><div style={{ fontSize: 30, fontWeight: 950, marginTop: 6 }}>{territories.reduce((sum, row) => sum + Number(row.discovered_dealers || row.target_dealers || 0), 0)}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16, marginTop: 16 }}>
        <section style={card}>
          <div style={{ color: '#d4af37', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 }}>ZIP control</div>
          <h2 style={{ margin: '7px 0 4px', fontSize: 23 }}>Current territories</h2>
          <div style={{ display: 'grid', gap: 9, marginTop: 12 }}>
            {territories.map((row) => {
              const discovered = Math.max(Number(row.discovered_dealers || 0), 0);
              const contacted = Math.max(Number(row.contacted_dealers || 0), 0);
              const target = Math.max(Number(row.target_dealers || 0), discovered);
              const base = Math.max(discovered || target, 1);
              const pct = Math.min(100, Math.round((contacted / base) * 100));
              const remaining = Math.max(target - contacted, 0);
              return <div key={row.id} style={{ padding: 14, borderRadius: 14, border: '1px solid #252e3a', background: '#0b0f15' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div><div style={{ fontWeight: 900 }}>{row.zip_code}{row.territory_name ? ` · ${row.territory_name}` : ''}</div><div style={{ color: '#6f7889', fontSize: 10, marginTop: 3 }}>{row.status} · {contacted}/{target} contacted · {discovered || '—'} discovered</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ color: '#d4af37', fontWeight: 950, fontSize: 18 }}>{pct}%</div><div style={{ color: '#667083', fontSize: 9 }}>{remaining} remaining</div></div>
                </div>
                <div style={{ height: 7, marginTop: 11, background: '#1b2230', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#d4af37,#74d3b0)' }} /></div>
                <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>{row.status === 'active' ? <><button style={button} onClick={() => setStatus(row.id, 'paused')}>Pause</button><button style={primary} onClick={() => setStatus(row.id, 'exhausted')}>Mark exhausted</button></> : row.status === 'paused' ? <button style={button} onClick={() => setStatus(row.id, 'active')}>Reactivate</button> : <button style={button} onClick={() => setStatus(row.id, 'active')}>Reopen</button>}</div>
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
          <p style={{ color: '#7f8999', fontSize: 11, lineHeight: 1.5 }}>Positive event recorded, but no sample, diagnostic, pilot or recurring event yet.</p>
          <div style={{ display: 'grid', gap: 9, marginTop: 12 }}>
            {warm.map((row, index) => <div key={row.dealer_id || row.dealer_name} style={{ padding: 12, borderRadius: 12, border: index === 0 ? '1px solid rgba(212,175,55,.32)' : '1px solid #252e3a', background: index === 0 ? '#111009' : '#0b0f15' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}><div><div style={{ fontWeight: 900 }}>{row.dealer_name}</div><div style={{ color: '#6f7889', fontSize: 10, marginTop: 3 }}>{row.zip_code || 'ZIP not recorded'} · positive{index === 0 ? ' · next' : ''}</div></div><a href={dealerLink(row)} style={{ ...button, textDecoration: 'none' }}>{index === 0 ? 'Open →' : 'Work lead →'}</a></div>
            </div>)}
            {!warm.length && <div style={{ color: '#667083', padding: 14, border: '1px dashed #2a3340', borderRadius: 12 }}>No unreplied positives right now.</div>}
          </div>
        </section>
      </div>
      {message && <div style={{ marginTop: 14, ...card, fontSize: 12, color: '#c9d0da' }}>{message}</div>}
    </div>
  </div>;
}
