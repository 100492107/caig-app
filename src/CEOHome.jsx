import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const actions = [
  { title: 'Track A acquisition', desc: 'Work the next dealer, reply to warm demand, make the sample and move the smallest justified pilot.', href: '/outreach', tag: 'Cash first' },
  { title: 'Creative Engine', desc: 'Research, choose the mechanism, pass the quality gate, produce the source asset and derive the finished media.', href: '/creative', tag: 'Production' },
  { title: 'Main operations', desc: 'Open the existing main app for calendar, queues and legacy operational tooling.', href: '/main-app', tag: 'Operations' },
];

function Metric({ label, value, detail }) {
  return <div style={styles.metric}><div style={styles.metricLabel}>{label}</div><div style={styles.metricValue}>{value}</div><div style={styles.metricDetail}>{detail}</div></div>;
}

export default function CEOHome() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch('/api/ceo-summary', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Could not load CEO summary');
      setSummary(json);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const metrics = useMemo(() => summary?.metrics || {}, [summary]);
  const nextAction = summary?.next_action;

  return <div style={styles.page}>
    <header style={styles.header}>
      <div style={styles.headerInner}>
        <button type="button" onClick={load} style={styles.brand} aria-label="Refresh CEO home">
          <span style={styles.logo}>C</span>
          <span><span style={styles.brandTop}>CORNERSTONE AI ENTERPRISES</span><span style={styles.brandBottom}>CEO OS</span></span>
        </button>
        <div style={styles.headerRight}><span style={styles.status}><span style={styles.dot} />Operator mode</span><button type="button" onClick={() => supabase.auth.signOut()} style={styles.signout}>Sign out</button></div>
      </div>
    </header>

    <main style={styles.shell}>
      <section style={styles.hero}>
        <div><div style={styles.kicker}>CEO CONTROL ROOM</div><h1 style={styles.h1}>What produces value next?</h1><p style={styles.sub}>One place to see the commercial bottleneck, move production and keep the two engines learning without mixing their evidence.</p></div>
        <div style={styles.rule}><div style={styles.ruleLabel}>OPERATING RULE</div><div style={styles.ruleText}>Build less. Sell more. Deliver better. Measure what matters.</div></div>
      </section>

      {error && <div style={styles.error}>{error} <button onClick={load} style={styles.retry}>Retry</button></div>}

      <section style={styles.metricsGrid}>
        <Metric label="Warm dealer demand" value={loading ? '…' : (metrics.warm_replies ?? '—')} detail="live replies / interested opportunities" />
        <Metric label="Calls due" value={loading ? '…' : (metrics.calls_due ?? '—')} detail="diagnostic conversations" />
        <Metric label="Pilots open" value={loading ? '…' : (metrics.pilots_open ?? '—')} detail="proposal / paid-pilot movement" />
        <Metric label="Creative jobs" value={loading ? '…' : (metrics.creative_queue ?? '—')} detail="queued or processing" />
      </section>

      <section style={styles.nextCard}>
        <div><div style={{ ...styles.kicker, color: '#d4af37' }}>NEXT BEST ACTION</div><h2 style={styles.nextTitle}>{nextAction?.label || 'Open Track A and work the next dealer'}</h2><p style={styles.nextDetail}>{nextAction?.detail || 'The cash engine has no recorded blocker.'}</p></div>
        <a href={nextAction?.href || '/outreach'} style={styles.nextButton}>Do it →</a>
      </section>

      <section style={styles.grid}>
        {actions.map((item) => <a key={item.href} href={item.href} style={styles.action}><div style={styles.actionTag}>{item.tag}</div><h3 style={styles.actionTitle}>{item.title}</h3><p style={styles.actionDesc}>{item.desc}</p><span style={styles.actionArrow}>Open →</span></a>)}
      </section>

      <section style={styles.footerCard}>
        <div><div style={styles.kicker}>EVIDENCE LOOP</div><div style={styles.footerTitle}>Research → decide → approve → produce → publish → measure → learn.</div></div>
        <div style={styles.footerCopy}>Track A and Track B remain separate. Current web research is not owned-account performance. Winners earn controlled replication only after real evidence.</div>
      </section>
    </main>
  </div>;
}

const styles = {
  page: { minHeight: '100vh', background: '#07090d', color: '#f3f5f8', fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { position: 'sticky', top: 0, zIndex: 20, background: 'rgba(7,9,13,.86)', backdropFilter: 'blur(22px)', borderBottom: '1px solid rgba(255,255,255,.06)' },
  headerInner: { maxWidth: 1400, margin: '0 auto', padding: '14px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  brand: { display: 'flex', alignItems: 'center', gap: 11, background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', padding: 0, textAlign: 'left' },
  logo: { width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 13, background: 'linear-gradient(135deg,#e4c25a,#9f7526)', color: '#171108', fontWeight: 950, fontSize: 18 },
  brandTop: { display: 'block', color: '#778192', fontSize: 8, letterSpacing: '.16em', fontWeight: 900 },
  brandBottom: { display: 'block', fontSize: 16, fontWeight: 950, marginTop: 2 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  status: { padding: '8px 11px', borderRadius: 999, border: '1px solid rgba(114,205,167,.22)', background: 'rgba(114,205,167,.06)', color: '#a6d9c2', fontSize: 10, fontWeight: 850 },
  dot: { display: 'inline-block', width: 6, height: 6, borderRadius: 99, background: '#72cda7', marginRight: 7 },
  signout: { padding: '8px 11px', borderRadius: 9, border: '1px solid #28303c', background: '#0c1016', color: '#8f98a8', cursor: 'pointer', fontSize: 10, fontWeight: 800 },
  shell: { maxWidth: 1400, margin: '0 auto', padding: '38px 26px 90px' },
  hero: { display: 'grid', gridTemplateColumns: '1.45fr .55fr', gap: 18, alignItems: 'stretch' },
  kicker: { color: '#7d8797', fontSize: 10, letterSpacing: '.16em', fontWeight: 900, textTransform: 'uppercase' },
  h1: { margin: '12px 0 11px', fontSize: 'clamp(42px,5vw,72px)', lineHeight: .94, letterSpacing: '-.058em' },
  sub: { maxWidth: 760, margin: 0, color: '#9da6b5', fontSize: 15, lineHeight: 1.68 },
  rule: { padding: 25, borderRadius: 24, border: '1px solid rgba(212,175,55,.2)', background: 'radial-gradient(circle at 85% 20%,rgba(212,175,55,.12),transparent 45%),linear-gradient(160deg,#131721,#0d1118)', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  ruleLabel: { color: '#d4af37', fontSize: 9, fontWeight: 900, letterSpacing: '.14em' },
  ruleText: { marginTop: 10, color: '#e5e8ed', fontSize: 20, lineHeight: 1.25, fontWeight: 850, letterSpacing: '-.03em' },
  error: { marginTop: 20, padding: 13, borderRadius: 13, border: '1px solid rgba(255,100,100,.25)', background: 'rgba(255,100,100,.06)', color: '#ffb7b7', fontSize: 12 },
  retry: { marginLeft: 10, padding: '6px 9px', borderRadius: 8, border: '1px solid #613b3b', background: '#171013', color: '#ffd0d0', cursor: 'pointer' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginTop: 20 },
  metric: { padding: 18, borderRadius: 18, border: '1px solid #242b37', background: '#0d1118' },
  metricLabel: { color: '#8791a0', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 },
  metricValue: { marginTop: 8, fontSize: 34, fontWeight: 950, letterSpacing: '-.045em' },
  metricDetail: { marginTop: 5, color: '#5f6979', fontSize: 10 },
  nextCard: { marginTop: 18, padding: 24, borderRadius: 23, border: '1px solid rgba(212,175,55,.24)', background: 'linear-gradient(150deg,#171913,#0d1117)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 },
  nextTitle: { margin: '7px 0 4px', fontSize: 26, letterSpacing: '-.035em' },
  nextDetail: { margin: 0, color: '#848e9f', fontSize: 12 },
  nextButton: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 17px', borderRadius: 12, background: '#d4af37', color: '#171108', textDecoration: 'none', fontWeight: 950, fontSize: 12, whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 14, marginTop: 18 },
  action: { position: 'relative', minHeight: 190, padding: 22, borderRadius: 22, border: '1px solid #252d39', background: 'linear-gradient(160deg,#121720,#0c1016)', textDecoration: 'none', color: '#eef1f5', overflow: 'hidden' },
  actionTag: { color: '#768193', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 900 },
  actionTitle: { margin: '12px 0 8px', fontSize: 23, letterSpacing: '-.035em' },
  actionDesc: { margin: 0, color: '#919baa', fontSize: 12, lineHeight: 1.6, maxWidth: 420 },
  actionArrow: { position: 'absolute', left: 22, bottom: 20, color: '#d4af37', fontSize: 11, fontWeight: 900 },
  footerCard: { marginTop: 18, padding: 21, borderRadius: 20, border: '1px solid #222a35', background: '#0b0f15', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 },
  footerTitle: { marginTop: 8, fontSize: 18, fontWeight: 900, letterSpacing: '-.025em' },
  footerCopy: { color: '#7d8796', fontSize: 11, lineHeight: 1.65, alignSelf: 'end' },
};
