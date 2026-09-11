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
const SECONDARY = [
  { id: 'newlife', label: 'New Life', href: NEW_LIFE_URL, external: true },
  { id: 'system', label: 'System', href: '/system' },
];

export default function EnterpriseShell({ active = 'command', children }) {
  return (
    <div className="cornerstone-shell">
      <style>{`
        .cornerstone-shell{min-height:100svh;background:var(--bg);color:var(--text);font-family:var(--sans)}
        .cornerstone-shell *{box-sizing:border-box}
        .cs-top{position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:28px;padding:12px clamp(18px,4vw,52px);border-bottom:1px solid rgba(255,255,255,.065);background:rgba(11,12,15,.88);backdrop-filter:blur(22px)}
        .cs-brand{display:flex;align-items:center;gap:11px;min-width:max-content;color:inherit;text-decoration:none}
        .cs-mark{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:#eee9dd;color:#171614;font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:800}
        .cs-brand-copy strong{display:block;font-size:12px;line-height:1;letter-spacing:.16em;font-weight:800}
        .cs-brand-copy small{display:block;margin-top:5px;font-size:8px;letter-spacing:.07em;color:#777b83}
        .cs-nav{display:flex;align-items:center;gap:2px;flex:1;overflow:auto;scrollbar-width:none}
        .cs-nav::-webkit-scrollbar{display:none}
        .cs-link{display:inline-flex;align-items:center;gap:5px;padding:9px 11px;border-radius:9px;color:#8e9198;text-decoration:none;font-size:10px;font-weight:780;white-space:nowrap;transition:all .18s ease}
        .cs-link:hover{color:#f4f1e9;background:rgba(255,255,255,.045)}
        .cs-link.is-active{color:#f4f1e9;background:#191c22}
        .cs-link.is-active::after{content:"";width:14px;height:1px;margin-top:11px;margin-left:-7px;background:#d4b56a;position:absolute}
        .cs-more{display:flex;align-items:center;gap:5px;margin-left:auto;white-space:nowrap}
        .cs-more .cs-link{padding-left:9px;padding-right:9px}
        .cs-main{min-height:calc(100svh - 61px)}
        .cs-body{width:min(1320px,100%);margin:0 auto;padding:32px clamp(18px,4vw,52px) 84px}
        @media(max-width:980px){.cs-top{gap:16px}.cs-brand-copy small{display:none}.cs-nav{order:3;flex-basis:100%}.cornerstone-shell{overflow-x:hidden}.cs-top{flex-wrap:wrap}.cs-more{margin-left:0}.cs-main{min-height:0}}
        @media(max-width:620px){.cs-top{padding:10px 12px;gap:10px}.cs-brand-copy{display:none}.cs-mark{width:33px;height:33px;border-radius:10px}.cs-link{font-size:10px;padding:8px 9px}.cs-body{padding:24px 14px 60px}.cs-nav{margin:0 -4px;padding:0 4px}}
      `}</style>
      <header className="cs-top">
        <a className="cs-brand" href="/" aria-label="Cornerstone home">
          <span className="cs-mark">C</span>
          <span className="cs-brand-copy"><strong>CORNERSTONE</strong><small>AI content studio</small></span>
        </a>
        <nav className="cs-nav" aria-label="Cornerstone workspace">
          {NAV.map((item) => (
            <a key={item.id} href={item.href} className={`cs-link${active === item.id ? ' is-active' : ''}`}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="cs-more">
          {SECONDARY.map((item) => (
            <a key={item.id} href={item.href} className={`cs-link${active === item.id ? ' is-active' : ''}`} target={item.external ? '_blank' : undefined} rel={item.external ? 'noreferrer' : undefined}>
              {item.label}{item.external ? ' ↗' : ''}
            </a>
          ))}
        </div>
      </header>
      <main className="cs-main"><div className="cs-body">{children}</div></main>
    </div>
  );
}
