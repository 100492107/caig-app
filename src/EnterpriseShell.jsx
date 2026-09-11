import React from 'react';

const NEW_LIFE_URL = 'https://new-life-game-alpha.vercel.app/start-v2.html';
const NAV = [
  { id: 'command', label: 'Home', href: '/' },
  { id: 'content', label: 'Create', href: '/content/remake' },
  { id: 'library', label: 'Library', href: '/generations' },
  { id: 'voices', label: 'Voices', href: '/content/creators' },
  { id: 'channels', label: 'Channels', href: '/content/profiles' },
  { id: 'production', label: 'Make', href: '/content/production' },
  { id: 'publish', label: 'Publish', href: '/content/publish' },
  { id: 'learning', label: 'Learn', href: '/content/measurement' },
];

export default function EnterpriseShell({ active = 'command', children }) {
  return (
    <div className="cs-app">
      <style>{`
        .cs-app{min-height:100svh;background:var(--bg);color:var(--text)}
        .cs-bar{position:sticky;top:0;z-index:100;background:rgba(244,241,233,.94);backdrop-filter:blur(18px);border-bottom:1px solid var(--border)}
        .cs-bar-inner{width:min(1420px,100%);margin:0 auto;padding:13px 28px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:34px}
        .cs-brand{display:flex;align-items:center;gap:11px;color:var(--text);text-decoration:none;min-width:max-content}
        .cs-mark{width:34px;height:34px;border:1.5px solid #1b1d1f;border-radius:50%;display:grid;place-items:center;font-size:17px;font-weight:800;position:relative;background:#fffdf8}
        .cs-mark:after{content:"";position:absolute;right:-2px;bottom:2px;width:7px;height:7px;border-radius:50%;background:var(--accent);border:2px solid var(--bg)}
        .cs-brand-name{display:block;font-size:13px;font-weight:800;letter-spacing:.12em}
        .cs-brand-note{display:block;margin-top:2px;font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-subtle)}
        .cs-nav{display:flex;justify-content:center;gap:2px;overflow:auto;scrollbar-width:none}
        .cs-nav::-webkit-scrollbar{display:none}
        .cs-link{position:relative;padding:9px 10px;color:var(--text-muted);text-decoration:none;font-size:10px;font-weight:700;white-space:nowrap}
        .cs-link:after{content:"";position:absolute;left:10px;right:10px;bottom:1px;height:2px;background:transparent}
        .cs-link:hover{color:var(--text)}
        .cs-link.is-active{color:var(--text)}
        .cs-link.is-active:after{background:var(--accent)}
        .cs-right{display:flex;align-items:center;gap:8px;min-width:max-content}
        .cs-system{display:inline-flex;align-items:center;gap:7px;padding:7px 9px;border:1px solid var(--border);border-radius:999px;color:var(--text-muted);font-size:9px;text-decoration:none;background:rgba(255,255,255,.45)}
        .cs-system-dot{width:6px;height:6px;border-radius:50%;background:var(--success)}
        .cs-life{padding:7px 9px;color:var(--text-muted);font-size:9px;font-weight:700;text-decoration:none}
        .cs-main{width:min(1420px,100%);margin:0 auto;padding:44px 28px 100px}
        @media(max-width:980px){.cs-bar-inner{grid-template-columns:auto 1fr;gap:16px;padding:11px 18px}.cs-right{display:none}.cs-nav{justify-content:flex-end}}
        @media(max-width:680px){.cs-bar-inner{display:block;padding:10px 12px}.cs-brand{margin-bottom:8px}.cs-brand-note{display:none}.cs-nav{justify-content:flex-start;margin:0 -2px;padding-bottom:1px}.cs-link{padding:8px 9px}.cs-main{padding:28px 14px 70px}}
      `}</style>
      <header className="cs-bar">
        <div className="cs-bar-inner">
          <a className="cs-brand" href="/" aria-label="Cornerstone home">
            <span className="cs-mark">C</span>
            <span><strong className="cs-brand-name">CORNERSTONE</strong><small className="cs-brand-note">Content studio</small></span>
          </a>
          <nav className="cs-nav" aria-label="Cornerstone">
            {NAV.map(item => <a key={item.id} href={item.href} className={`cs-link${active===item.id?' is-active':''}`}>{item.label}</a>)}
          </nav>
          <div className="cs-right">
            <a className="cs-system" href="/system"><i className="cs-system-dot"/>System</a>
            <a className="cs-life" href={NEW_LIFE_URL} target="_blank" rel="noreferrer">New Life ↗</a>
          </div>
        </div>
      </header>
      <main className="cs-main">{children}</main>
    </div>
  );
}
