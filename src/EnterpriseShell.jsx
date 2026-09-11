import React from 'react';
import PersistentGenerations from './PersistentGenerations.jsx';

const NEW_LIFE_URL = 'https://new-life-game-alpha.vercel.app/start-v2.html';
const NAV = [
  { id: 'command', label: 'Home', href: '/' },
  { id: 'content', label: 'Content', href: '/content/remake' },
  { id: 'library', label: 'Library', href: '/generations' },
  { id: 'newlife', label: 'New Life', href: NEW_LIFE_URL, external: true },
  { id: 'system', label: 'System', href: '/system' },
];

export default function EnterpriseShell({ active = 'command', children, eyebrow = '' }) {
  return (
    <div className="enterprise-shell">
      <style>{`
        .enterprise-shell{min-height:100svh;background:var(--bg);color:var(--text);font-family:var(--sans)}
        .enterprise-shell *{box-sizing:border-box}
        .es-top{position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:18px;padding:11px clamp(14px,3vw,36px);border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(20px)}
        .es-brand{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;min-width:max-content}
        .es-mark{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#ddd9cc;color:#171717;font-weight:900;box-shadow:0 5px 18px rgba(0,0,0,.12)}
        .es-brand strong{display:block;font-size:12px;letter-spacing:.04em}
        .es-brand small{display:block;margin-top:2px;font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-subtle)}
        .es-nav{display:flex;gap:4px;align-items:center;flex:1;overflow:auto;scrollbar-width:none}
        .es-nav::-webkit-scrollbar{display:none}
        .es-nav a{position:relative;padding:9px 11px;border-radius:9px;color:var(--text-muted);font-size:10px;font-weight:820;text-decoration:none;white-space:nowrap}
        .es-nav a:hover{background:var(--surface);color:var(--text)}
        .es-nav a.active{background:var(--surface-2);color:var(--text)}
        .es-nav a.active::after{content:"";position:absolute;left:11px;right:11px;bottom:3px;height:1px;background:var(--track-b);opacity:.85}
        .es-context{max-width:280px;overflow:hidden;text-overflow:ellipsis;font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-subtle);white-space:nowrap}
        .es-body{width:min(1480px,100%);margin:0 auto;padding:18px clamp(14px,3vw,42px) 64px}
        @media(max-width:720px){.es-top{gap:9px}.es-brand-copy,.es-context{display:none}.es-nav{justify-content:flex-start}}
      `}</style>
      <header className="es-top">
        <a className="es-brand" href="/" aria-label="Cornerstone home">
          <span className="es-mark">C</span>
          <span className="es-brand-copy"><strong>CORNERSTONE</strong><small>Content Engine</small></span>
        </a>
        <nav className="es-nav" aria-label="Cornerstone">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={active === item.id ? 'active' : ''}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noreferrer' : undefined}
            >
              {item.label}{item.external ? ' ↗' : ''}
            </a>
          ))}
        </nav>
        {eyebrow ? <div className="es-context">{eyebrow}</div> : null}
      </header>
      <div className="es-body">{children}</div>
      <PersistentGenerations />
    </div>
  );
}
