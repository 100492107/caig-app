import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
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
    if (!value || sending) {
      if (!value) setError('Enter your email address.');
      return;
    }
    setSending(true);
    setError('');
    setSent(false);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: value,
      options: { emailRedirectTo: window.location.origin },
    });
    if (authError) setError(authError.message);
    else setSent(true);
    setSending(false);
  }

  if (session) return children;

  if (loading) {
    return (
      <div className="cs-auth-page">
        <div className="cs-auth-form" role="status" aria-live="polite">
          <div className="cs-auth-mark">C</div>
          <div className="cs-auth-kicker">CORNERSTONE</div>
          <h1 className="cs-auth-title">Opening workspace</h1>
          <p className="cs-auth-doctrine">Checking access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cs-auth-page">
      <form onSubmit={sendMagicLink} className="cs-auth-form">
        <div className="cs-auth-mark">C</div>
        <div className="cs-auth-kicker">CORNERSTONE AI ENTERPRISE</div>
        <h1 className="cs-auth-title">Operator access</h1>
        <p className="cs-auth-doctrine">Cash first. Evidence always.</p>
        <label htmlFor="operator-email" className="sr-only">Email address</label>
        <input
          id="operator-email"
          value={email}
          onChange={(event) => { setEmail(event.target.value); if (error) setError(''); if (sent) setSent(false); }}
          type="email"
          autoComplete="email"
          autoFocus
          inputMode="email"
          placeholder="Email address"
          aria-label="Email address"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'operator-auth-message' : undefined}
          className="cs-auth-input"
          disabled={sending}
        />
        <button type="submit" className="cs-auth-button" disabled={sending} aria-busy={sending}>
          {sending ? 'Sending…' : 'Continue'}
        </button>
        {sent && <div id="operator-auth-message" className="cs-auth-message success" role="status" aria-live="polite">Access link sent. Check your email.</div>}
        {error && <div id="operator-auth-message" className="cs-auth-message error" role="alert">{error}</div>}
        <div className="cs-auth-note">Internal workspace.</div>
      </form>
    </div>
  );
}
