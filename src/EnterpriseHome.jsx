import React from 'react';

const cardStyle = {
  display: 'block',
  padding: 28,
  borderRadius: 22,
  textDecoration: 'none',
  color: '#eef1f7',
  background: 'linear-gradient(180deg, #111623 0%, #0b0f18 100%)',
  border: '1px solid #262d3d',
  minHeight: 190,
  transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
};

const eyebrowStyle = {
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: '.22em',
  textTransform: 'uppercase',
  color: '#d4af37',
};

function ExternalOrInternalCard({ href, title, description, label, external }) {
  const disabled = !href;
  const props = disabled
    ? { 'aria-disabled': true, onClick: (event) => event.preventDefault() }
    : { href, target: external ? '_blank' : undefined, rel: external ? 'noreferrer' : undefined };

  return (
    <a
      {...props}
      style={{
        ...cardStyle,
        opacity: disabled ? 0.58 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <div style={eyebrowStyle}>{label}</div>
      <h2 style={{ margin: '9px 0 9px', fontSize: 28, letterSpacing: '-.04em' }}>{title}</h2>
      <p style={{ margin: 0, color: '#9ca6b9', lineHeight: 1.55, maxWidth: 460 }}>{description}</p>
      <div style={{ marginTop: 22, fontSize: 12, fontWeight: 800, color: disabled ? '#70798d' : '#eef1f7' }}>
        {disabled ? 'Link not configured yet' : external ? 'Open ↗' : 'Enter →'}
      </div>
    </a>
  );
}

export default function EnterpriseHome() {
  const trackAUrl = String(import.meta.env.VITE_TRACK_A_URL || '').trim();
  const newLifeUrl = String(import.meta.env.VITE_NEW_LIFE_URL || '').trim();

  return (
    <div style={{ minHeight: '100vh', background: '#06080d', color: '#eef1f7', padding: '34px 28px 60px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ padding: '22px 0 30px' }}>
          <div style={eyebrowStyle}>CORNERSTONE AI ENTERPRISE</div>
          <h1 style={{ margin: '10px 0 10px', fontSize: 46, lineHeight: 1.02, letterSpacing: '-.05em', maxWidth: 760 }}>
            One company. Three operating worlds.
          </h1>
          <p style={{ margin: 0, color: '#8e98aa', fontSize: 16, lineHeight: 1.6, maxWidth: 720 }}>
            Choose where you are working. Track A runs the cash engine. Track B runs the creative engine. New Life is the game.
          </p>
        </header>

        <main style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          <ExternalOrInternalCard
            href={trackAUrl || undefined}
            title="Track A"
            label="CASH ENGINE"
            description="Open the existing Track A system for territory, outreach, samples, diagnostics and pilots. Cornerstone does not duplicate it here."
            external
          />

          <ExternalOrInternalCard
            href="/creative"
            title="Track B"
            label="CREATIVE STATION"
            description="Return to the familiar Creative Station for research, ideas, production, captions, assets and publishing. The new intelligence and QA capabilities sit underneath this workflow."
          />

          <ExternalOrInternalCard
            href={newLifeUrl || undefined}
            title="New Life"
            label="LIFE GAME"
            description="Open the New Life game as a separate experience. It stays intentionally outside the Cornerstone operating system."
            external
          />
        </main>

        <section style={{ marginTop: 18, padding: '16px 18px', borderRadius: 18, border: '1px solid #1f2635', background: '#0a0d14' }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#8f98aa', letterSpacing: '.14em', textTransform: 'uppercase' }}>Architecture</div>
          <div style={{ marginTop: 8, color: '#c4cbd7', fontSize: 13, lineHeight: 1.55 }}>
            The Enterprise home is navigation only. It does not replace Track A or Track B and it does not duplicate their data. New operational capabilities remain inside the workflow they support.
          </div>
        </section>
      </div>
    </div>
  );
}
