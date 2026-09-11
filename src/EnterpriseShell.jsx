import React from 'react';

const NEW_LIFE_URL='https://new-life-game-alpha.vercel.app/start-v2.html';
const NAV=[
  {id:'command',label:'Home',href:'/'},
  {id:'content',label:'Create',href:'/content/remake'},
  {id:'library',label:'Library',href:'/generations'},
  {id:'voices',label:'Voices',href:'/content/creators'},
  {id:'channels',label:'Channels',href:'/content/profiles'},
  {id:'production',label:'Make',href:'/content/production'},
  {id:'publish',label:'Publish',href:'/content/publish'},
  {id:'learning',label:'Learn',href:'/content/measurement'},
];
export default function EnterpriseShell({active='command',children,eyebrow=''}){
 return <div className="cs-app">
  <style>{`{
   .cs-app{--paper:#f7f5ef;--ink:#181b19;--muted:#70756e;--faint:#a0a49d;--line:#e1ded5;--card:#ffffff;--accent:#2f5bff;--accent-soft:#edf1ff;--warm:#d66e45;min-height:100svh;background:var(--paper);color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.cs-app *{box-sizing:border-box}
   .cs-shell{display:grid;grid-template-columns:236px minmax(0,1fr);min-height:100svh}.cs-sidebar{position:sticky;top:0;height:100svh;padding:24px 14px 18px;background:#171a18;color:#f4f3ee;display:flex;flex-direction:column}.cs-brand{display:flex;align-items:center;gap:11px;padding:2px 10px 28px;text-decoration:none;color:inherit}.cs-mark{width:38px;height:38px;border-radius:12px;background:#f4f1e8;color:#181b19;display:grid;place-items:center;font-family:Georgia,"Times New Roman",serif;font-weight:800;font-size:19px}.cs-brand-name{display:block;font-size:11px;letter-spacing:.15em;font-weight:850}.cs-brand-note{display:block;margin-top:5px;font-size:8px;color:#92968f;letter-spacing:.06em}.cs-section{margin:14px 10px 8px;font-size:8px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#6e746d}.cs-nav{display:grid;gap:3px}.cs-link{position:relative;display:flex;align-items:center;gap:10px;min-height:40px;padding:0 11px;border-radius:9px;color:#a1a59f;text-decoration:none;font-size:11px;font-weight:700;transition:.16s ease}.cs-link:before{content:"";width:6px;height:6px;border-radius:2px;background:transparent}.cs-link:hover{background:rgba(255,255,255,.05);color:#fff}.cs-link.is-active{background:#292d2a;color:#fff}.cs-link.is-active:before{background:#7b91ff;box-shadow:0 0 0 3px rgba(47,91,255,.18)}.cs-bottom{margin-top:auto;padding:14px 10px 0;border-top:1px solid rgba(255,255,255,.07)}.cs-bottom a{display:block;color:#7f857e;text-decoration:none;font-size:9px;margin-top:7px}.cs-bottom a:hover{color:#fff}
   .cs-workspace{min-width:0}.cs-top{height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(22px,4vw,54px);border-bottom:1px solid var(--line);background:rgba(247,245,239,.9);backdrop-filter:blur(18px);position:sticky;top:0;z-index:80}.cs-eyebrow{font-size:11px;font-weight:700;color:#4c514b}.cs-context{font-size:8px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#a1a59d}.cs-body{width:min(1320px,100%);margin:0 auto;padding:42px clamp(22px,4vw,54px) 100px}
   @media(max-width:920px){.cs-shell{display:block}.cs-sidebar{position:sticky;top:0;height:auto;padding:11px 12px 9px;z-index:120;border-bottom:1px solid #2d302d}.cs-brand{padding:0 4px 10px}.cs-brand-note{display:none}.cs-section{display:none}.cs-nav{display:flex;gap:3px;overflow:auto;scrollbar-width:none}.cs-nav::-webkit-scrollbar{display:none}.cs-link{min-height:36px;white-space:nowrap;padding:0 10px}.cs-bottom{display:none}.cs-top{height:48px;padding:0 16px}.cs-body{padding:28px 18px 68px}}
   @media(max-width:560px){.cs-brand-name{font-size:10px}.cs-mark{width:34px;height:34px;border-radius:10px}.cs-top{justify-content:flex-end}.cs-context{display:none}.cs-body{padding:22px 14px 58px}}
  `}</style>
  <div className="cs-shell">
   <aside className="cs-sidebar">
    <a className="cs-brand" href="/" aria-label="Cornerstone home"><span className="cs-mark">C</span><span><strong className="cs-brand-name">CORNERSTONE</strong><small className="cs-brand-note">Creative operating studio</small></span></a>
    <div className="cs-section">Studio</div>
    <nav className="cs-nav" aria-label="Studio navigation">{NAV.map(item=><a key={item.id} href={item.href} className={`cs-link${active===item.id?' is-active':''}`}>{item.label}</a>)}</nav>
    <div className="cs-bottom"><div style={{fontSize:8,fontWeight:800,letterSpacing:'.13em',color:'#6d726c'}}>CORNERSTONE</div><a href={NEW_LIFE_URL} target="_blank" rel="noreferrer">New Life ↗</a><a href="/system">Settings</a></div>
   </aside>
   <section className="cs-workspace"><header className="cs-top"><div className="cs-eyebrow">{eyebrow||'Studio'}</div><div className="cs-context">Cornerstone</div></header><div className="cs-body">{children}</div></section>
  </div>
 </div>
}
