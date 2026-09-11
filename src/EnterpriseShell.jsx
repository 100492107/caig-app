import React from 'react';

const NEW_LIFE_URL = 'https://new-life-game-alpha.vercel.app/start-v2.html';
const PRIMARY = [
  { id: 'command', label: 'Home', href: '/' },
  { id: 'content', label: 'Create', href: '/content/remake' },
  { id: 'library', label: 'Library', href: '/generations' },
];
const WORK = [
  { id: 'voices', label: 'Voices', href: '/content/creators' },
  { id: 'channels', label: 'Channels', href: '/content/profiles' },
  { id: 'production', label: 'Production', href: '/content/production' },
  { id: 'publish', label: 'Publishing', href: '/content/publish' },
  { id: 'learning', label: 'Learning', href: '/content/measurement' },
];
const SECONDARY = [
  { id: 'newlife', label: 'New Life', href: NEW_LIFE_URL, external: true },
  { id: 'system', label: 'System', href: '/system' },
];

function Item({ item, active }) {
  return (
    <a
      href={item.href}
      className={`cs-link${active === item.id ? ' is-active' : ''}`}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noreferrer' : undefined}
    >
      <span>{item.label}</span>
      {item.external ? <small>↗</small> : null}
    </a>
  );
}

export default function EnterpriseShell({ active = 'command', children, eyebrow = '' }) {
  const workActive = ['voices', 'channels', 'production', 'publish', 'learning'].includes(active) ? active : null;
  return (
    <div className="cornerstone-shell">
      <style>{`
        .cornerstone-shell{min-height:100svh;background:radial-gradient(circle at 88% -10%,rgba(196,180,154,.08),transparent 34%),var(--bg);color:var(--text);font-family:var(--sans)}
        .cornerstone-shell *{box-sizing:border-box}
        .cs-rail{position:fixed;inset:0 auto 0 0;width:228px;padding:20px 14px 16px;border-right:1px solid var(--border);background:rgba(12,14,18,.82);backdrop-filter:blur(22px);z-index:100;display:flex;flex-direction:column}
        .cs-brand{display:flex;align-items:center;gap:11px;padding:2px 10px 22px;color:inherit;text-decoration:none}
        .cs-mark{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:#eee9dd;color:#171717;font-weight:950;font-size:18px;box-shadow:0 8px 28px rgba(0,0,0,.18)}
        .cs-brand-copy strong{display:block;font-size:12px;letter-spacing:.12em}
        .cs-brand-copy small{display:block;margin-top:5px;color:var(--text-subtle);font-size:8px;letter-spacing:.14em;text-transform:uppercase}
        .cs-section{padding:0 7px;margin:12px 0 7px;font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--text-subtle)}
        .cs-nav{display:grid;gap:3px}
        .cs-link{display:flex;align-items:center;justify-content:space-between;min-height:40px;padding:0 11px;border:1px solid transparent;border-radius:10px;color:var(--text-muted);text-decoration:none;font-size:11px;font-weight:800;transition:.16s ease}
        .cs-link:hover{background:rgba(255,255,255,.045);color:var(--text)}
        .cs-link.is-active{background:linear-gradient(135deg,rgba(196,180,154,.14),rgba(255,255,255,.035));border-color:rgba(196,180,154,.22);color:var(--text);box-shadow:inset 0 0 0 1px rgba(255,255,255,.015)}
        .cs-link small{font-size:11px;color:var(--text-subtle)}
        .cs-footer{margin-top:auto;padding:13px 10px;border-top:1px solid var(--border)}
        .cs-footer .status{display:flex;align-items:center;gap:8px;color:var(--text-muted);font-size:9px}
        .cs-footer .dot{width:7px;height:7px;border-radius:50%;background:var(--success);box-shadow:0 0 12px rgba(111,155,122,.45)}
        .cs-main{margin-left:228px;min-height:100svh}
        .cs-top{height:62px;position:sticky;top:0;z-index:80;display:flex;align-items:center;justify-content:space-between;padding:0 30px;border-bottom:1px solid var(--border);background:rgba(12,14,18,.74);backdrop-filter:blur(22px)}
        .cs-context{font-size:9px;font-weight:850;letter-spacing:.14em;text-transform:uppercase;color:var(--text-subtle)}
        .cs-breadcrumb{color:var(--text-muted);font-size:11px}
        .cs-body{width:min(1320px,100%);margin:0 auto;padding:30px 34px 80px}
        @media(max-width:900px){.cs-rail{position:sticky;width:auto;height:auto;inset:auto;display:block;padding:8px 10px;border-right:0;border-bottom:1px solid var(--border)}.cs-brand{padding:4px 6px 9px}.cs-brand-copy small{display:none}.cs-nav{display:flex;overflow:auto;scrollbar-width:none}.cs-nav::-webkit-scrollbar{display:none}.cs-section{display:none}.cs-link{min-height:38px;white-space:nowrap;padding:0 12px}.cs-footer{display:none}.cs-main{margin-left:0}.cs-top{height:46px;padding:0 16px}.cs-body{padding:22px 16px 60px}}
        @media(max-width:560px){.cs-context{display:none}.cs-top{justify-content:flex-end}}
      `}</style>
      <aside className="cs-rail">
        <a className="cs-brand" href="/" aria-label="Cornerstone home">
          <span className="cs-mark">C</span>
          <span className="cs-brand-copy"><strong>CORNERSTONE</strong><small>Content workspace</small></span>
        </a>
        <div className="cs-section">Workspace</div>
        <nav className="cs-nav" aria-label="Primary workspace navigation">{PRIMARY.map((item) => <Item key={item.id} item={item} active={active === 'command' && item.id === 'command' ? 'command' : active === 'content' && item.id === 'content' ? 'content' : active === 'library' && item.id === 'library' ? 'library' : null} />)}</nav>
        <div className="cs-section">Work</div>
        <nav className="cs-nav" aria-label="Content work navigation">{WORK.map((item) => <Item key={item.id} item={item} active={workActive} />)}</nav>
        <div className="cs-section">More</div>
        <nav className="cs-nav" aria-label="Secondary navigation">{SECONDARY.map((item) => <Item key={item.id} item={item} active={active} />)}</nav>
        <div className="cs-footer"><div className="status"><i className="dot" /> <span>Workspace ready</span></div></div>
      </aside>
      <div className="cs-main">
        <header className="cs-top"><div className="cs-breadcrumb">{eyebrow || 'Your workspace'}</div><div className="cs-context">Cornerstone</div></header>
        <div className="cs-body">{children}</div>
      </div>
    </div>
  );
}
