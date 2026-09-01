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

  if (session) return children;

  if (loading) {
    return (
      <div className="cs-auth-page">
        <div className="cs-auth-form">
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
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          placeholder="Email address"
          aria-label="Email address"
          className="cs-auth-input"
        />
        <button type="submit" className="cs-auth-button">Continue</button>
        {sent && <div className="cs-auth-message success">Access link sent. Check your email.</div>}
        {error && <div className="cs-auth-message error">{error}</div>}
        <div className="cs-auth-note">Internal workspace.</div>
      </form>
    </div>
  );
}
