import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  async function sendMagicLink(event) {
    event.preventDefault();
    const value = email.trim();
    if (!value) return;
    setError('');
    setSent(false);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: value,
      options: { emailRedirectTo: window.location.origin },
    });
    if (authError) setError(authError.message);
    else setSent(true);
  }

  if (loading) return <div style={styles.full}><div style={styles.card}><div style={styles.logo}>C</div><strong style={styles.title}>Opening Cornerstone OS</strong><div style={styles.muted}>Checking operator session…</div></div></div>;
  if (session) return children;

  return (
    <div style={styles.full}>
      <form onSubmit={sendMagicLink} style={styles.card}>
        <div style={styles.logo}>C</div>
        <div style={styles.kicker}>CORNERSTONE AI ENTERPRISES</div>
        <h1 style={styles.title}>Operator access</h1>
        <p style={styles.muted}>Sign in to the internal operating system with a one-click email link.</p>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-label="Email address"
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Send access link</button>
        {sent && <div style={styles.success}>Access link sent. Check your email.</div>}
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.note}>Internal use only.</div>
      </form>
    </div>
  );
}

const styles = {
  full: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#07090d', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', padding: 24 },
  card: { width: '100%', maxWidth: 460, padding: 34, boxSizing: 'border-box', borderRadius: 28, border: '1px solid #262c38', background: 'linear-gradient(160deg,#131721,#0b0f15)', boxShadow: '0 24px 90px rgba(0,0,0,.35)' },
  logo: { width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 14, background: 'linear-gradient(135deg,#e4c25a,#9f7526)', color: '#171108', fontWeight: 950, fontSize: 20, marginBottom: 20 },
  kicker: { color: '#8e98aa', fontSize: 10, letterSpacing: '.16em', fontWeight: 900 },
  title: { display: 'block', margin: '9px 0 10px', fontSize: 32, lineHeight: 1, letterSpacing: '-.04em' },
  muted: { margin: 0, color: '#9da6b5', fontSize: 14, lineHeight: 1.6 },
  input: { width: '100%', marginTop: 22, boxSizing: 'border-box', padding: '14px 15px', borderRadius: 13, border: '1px solid #2a3140', background: '#0b0f15', color: '#fff', outline: 'none', fontSize: 14 },
  button: { width: '100%', marginTop: 10, padding: '14px 15px', borderRadius: 13, border: '1px solid #d4af37', background: 'linear-gradient(135deg,#e4c25a,#b38732)', color: '#171108', fontWeight: 950, cursor: 'pointer' },
  success: { marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(114,205,167,.08)', border: '1px solid rgba(114,205,167,.22)', color: '#a6dcc2', fontSize: 12 },
  error: { marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(255,100,100,.08)', border: '1px solid rgba(255,100,100,.22)', color: '#ffb4b4', fontSize: 12 },
  note: { marginTop: 18, color: '#596273', fontSize: 11 },
};
