import React from 'react';

const NEW_LIFE_URL = 'https://new-life-game-alpha.vercel.app/start-v2.html';
const NAV = [
  { id: 'command', label: 'Command', href: '/' },
  { id: 'content', label: 'Content', href: '/content' },
  { id: 'revenue', label: 'Revenue', href: '/revenue' },
  { id: 'operator', label: 'Operator', href: NEW_LIFE_URL, external: true },
  { id: 'system', label: 'System', href: '/system' },
];

export default function EnterpriseShell({ active = 'command', children, eyebrow = '' }) {
  return (
    <div className="enterprise-shell">
      <style>{`
        .enterprise-shell{min-height:100svh;background:var(--bg);color:var(--text);font-family:var(--sans)}
        .enterprise-shell *{box-sizing:border-box}
        .es-top{position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:18px;padding:12px clamp(14px,3vw,36px);border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(18px)}
        .es-brand{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;min-width:max-content}
        .es-mark{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#ddd9cc;color:#171717;font-weight:900}
        .es-brand strong{display:block;font-size:12px;letter-spacing:.02em}.es-brand small{display:block;margin-top:2px;font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-subtle)}
        .es-nav{display:flex;gap:3px;align-items:center;flex:1;overflow:auto}.es-nav a{padding:9px 10px;border-radius:9px;color:var(--text-muted);font-size:10px;font-weight:800;text-decoration:none;white-space:nowrap}.es-nav a:hover{background:var(--surface);color:var(--text)}.es-nav a.active{background:var(--surface-2);color:var(--text);box-shadow:inset 0 -1px var(--track-b)}
        .es-context{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-subtle);white-space:nowrap}
        .es-body{width:min(1440px,100%);margin:0 auto;padding:18px clamp(14px,3vw,42px) 56px}
        .es-subnav{display:flex;gap:6px;overflow:auto;margin:0 0 18px;padding-bottom:3px}.es-subnav a{color:var(--text-muted);text-decoration:none;font-size:10px;font-weight:800;padding:8px 10px;border:1px solid var(--border);border-radius:9px;white-space:nowrap}.es-subnav a.active{color:var(--text);border-color:rgba(212,181,106,.35);background:rgba(212,181,106,.08)}
        @media(max-width:720px){.es-top{gap:10px}.es-brand-copy{display:none}.es-context{display:none}}
      `}</style>
      <header className="es-top">
        <a className="es-brand" href="/" aria-label="Cornerstone command">
          <span className="es-mark">C</span>
          <span className="es-brand-copy"><strong>CORNERSTONE</strong><small>Operator system</small></span>
        </a>
        <nav className="es-nav" aria-label="Cornerstone">
          {NAV.map((item) => (
            <a key={item.id} href={item.href} className={active === item.id ? 'active' : ''} target={item.external ? '_blank' : undefined} rel={item.external ? 'noreferrer' : undefined}>{item.label}</a>
          ))}
        </nav>
        {eyebrow && <div className="es-context">{eyebrow}</div>}
      </header>
      <div className="es-body">{children}</div>
    </div>
  );
}
