import React from 'react'

const NEW_LIFE_URL='https://new-life-game-alpha.vercel.app/start-v2.html'
const NAV=[
  {id:'command',label:'Home',href:'/',glyph:'⌂'},
  {id:'content',label:'Create',href:'/content/remake',glyph:'＋'},
  {id:'library',label:'Library',href:'/generations',glyph:'▦'},
  {id:'voices',label:'Voices',href:'/content/creators',glyph:'◉'},
  {id:'channels',label:'Channels',href:'/content/profiles',glyph:'◌'},
  {id:'production',label:'Make',href:'/content/production',glyph:'◆'},
  {id:'publish',label:'Publish',href:'/content/publish',glyph:'↗'},
  {id:'learning',label:'Learn',href:'/content/measurement',glyph:'↺'},
]

export default function EnterpriseShell({active='command',children,eyebrow=''}){
 return <div className="cornerstone-app">
  <style>{`
    .cornerstone-app{--paper:#f4f5f7;--ink:#111318;--muted:#6c727d;--quiet:#9aa0aa;--line:#e1e4e8;--card:#fff;--sidebar:#101217;--sidebar2:#171a21;--accent:#6f63ff;--accent2:#a49cff;min-height:100svh;background:var(--paper);color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .cornerstone-app *{box-sizing:border-box}
    .cp-sidebar{position:fixed;inset:0 auto 0 0;width:238px;padding:18px 12px 14px;background:var(--sidebar);color:#f2f4f7;border-right:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;z-index:1000}
    .cp-brand{display:flex;align-items:center;gap:11px;padding:5px 9px 19px;text-decoration:none;color:inherit;border-bottom:1px solid rgba(255,255,255,.07)}
    .cp-mark{width:36px;height:36px;display:grid;place-items:center;border-radius:10px;background:#f2f1ff;color:#19172f;font-size:16px;font-weight:900;letter-spacing:-.08em}.cp-mark span{transform:translateY(-1px)}
    .cp-brand-copy{min-width:0}.cp-brand-copy strong{display:block;font-size:12px;line-height:1;letter-spacing:.17em;font-weight:850}.cp-brand-copy small{display:block;margin-top:5px;color:#808692;font-size:8px;line-height:1;letter-spacing:.05em}
    .cp-nav-heading{padding:20px 10px 8px;color:#676d78;font-size:8px;font-weight:850;letter-spacing:.15em;text-transform:uppercase}.cp-nav{display:grid;gap:2px}.cp-nav-item{display:grid;grid-template-columns:24px 1fr;align-items:center;min-height:39px;padding:0 10px;border-radius:8px;color:#8f959f;text-decoration:none;font-size:11px;font-weight:650;transition:.16s ease}.cp-nav-index{font-size:8px;color:#555c68;letter-spacing:.05em}.cp-nav-item:hover{color:#f5f6f8;background:rgba(255,255,255,.045)}.cp-nav-item.is-active{color:#fff;background:#1c2029;box-shadow:inset 2px 0 0 var(--accent)}.cp-nav-item.is-active .cp-nav-index{color:var(--accent2)}
    .cp-sidebar-foot{margin-top:auto;padding:14px 9px 0;border-top:1px solid rgba(255,255,255,.07)}.cp-foot-link{display:flex;align-items:center;gap:8px;padding:9px 2px;color:#8b919b;text-decoration:none;font-size:9px}.cp-foot-link:hover{color:#fff}.cp-foot-status{font-weight:700}.cp-status-dot{width:6px;height:6px;border-radius:50%;background:#75d7a2;box-shadow:0 0 0 3px rgba(117,215,162,.10)}
    .cp-main-shell{min-height:100svh;margin-left:238px}.cp-topbar{height:58px;position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 32px;border-bottom:1px solid var(--line);background:rgba(244,245,247,.92);backdrop-filter:blur(16px)}.cp-top-left{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:750;color:#434852}.cp-top-mark{width:20px;height:20px;border-radius:6px;background:#1a1d24;color:#fff;display:grid;place-items:center;font-size:10px;font-weight:900}.cp-top-right{display:flex;align-items:center;gap:7px;color:#8b919b;font-size:8px;letter-spacing:.14em;text-transform:uppercase}.cp-live-dot{width:6px;height:6px;border-radius:50%;background:#59b884}
    .cp-main-content{width:min(1480px,100%);margin:0 auto;padding:0 32px 90px}
    @media(max-width:920px){.cp-sidebar{position:sticky;width:100%;height:auto;inset:auto;padding:10px 10px 8px;flex-direction:row;align-items:center;border-right:0;border-bottom:1px solid rgba(255,255,255,.08)}.cp-brand{padding:0 7px;border-bottom:0;margin-right:8px}.cp-brand-copy small,.cp-nav-heading,.cp-sidebar-foot{display:none}.cp-nav{display:flex;gap:2px;overflow:auto;scrollbar-width:none}.cp-nav::-webkit-scrollbar{display:none}.cp-nav-item{grid-template-columns:1fr;min-height:34px;padding:0 10px;white-space:nowrap}.cp-nav-index{display:none}.cp-main-shell{margin-left:0}.cp-topbar{height:46px;padding:0 18px}.cp-main-content{padding:0 18px 72px}}
    @media(max-width:560px){.cp-brand-copy strong{font-size:10px}.cp-mark{width:32px;height:32px}.cp-nav-item:nth-child(n+6){display:none}.cp-top-right{display:none}.cp-main-content{padding:0 14px 72px}}
  `}</style>
  <aside className="cp-sidebar">
   <a className="cp-brand" href="/" aria-label="Cornerstone home"><span className="cp-mark"><span>C</span></span><span className="cp-brand-copy"><strong>CORNERSTONE</strong><small>Creative intelligence</small></span></a>
   <div className="cp-nav-heading">Workspace</div>
   <nav className="cp-nav" aria-label="Cornerstone workspace">{NAV.map((item,i)=><a key={item.id} href={item.href} className={`cp-nav-item${active===item.id?' is-active':''}`} aria-current={active===item.id?'page':undefined}><span className="cp-nav-index">{String(i+1).padStart(2,'0')}</span><span>{item.label}</span></a>)}</nav>
   <div className="cp-sidebar-foot"><a className="cp-foot-link cp-foot-status" href="/system"><span className="cp-status-dot"/>System status</a><a className="cp-foot-link" href={NEW_LIFE_URL} target="_blank" rel="noreferrer">New Life ↗</a></div>
  </aside>
  <div className="cp-main-shell"><header className="cp-topbar"><div className="cp-top-left"><span className="cp-top-mark">C</span><span>{eyebrow||'Creative intelligence'}</span></div><div className="cp-top-right"><span className="cp-live-dot"/>Private workspace</div></header><main className="cp-main-content">{children}</main></div>
 </div>
}
