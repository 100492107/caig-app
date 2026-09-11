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

function NavItem({item,active}){
  return <a className={`cp-nav-item${active===item.id?' is-active':''}`} href={item.href} aria-current={active===item.id?'page':undefined}>
    <span className="cp-nav-index">{String(NAV.indexOf(item)+1).padStart(2,'0')}</span>
    <span>{item.label}</span>
  </a>;
}

export default function EnterpriseShell({active='command',children,eyebrow=''}){
  return <div className="cornerstone-app">
    <aside className="cp-sidebar">
      <a className="cp-brand" href="/" aria-label="Cornerstone home">
        <span className="cp-mark"><span>C</span></span>
        <span className="cp-brand-copy"><strong>CORNERSTONE</strong><small>Content intelligence studio</small></span>
      </a>

      <div className="cp-nav-heading">Workspace</div>
      <nav className="cp-nav" aria-label="Cornerstone workspace">
        {NAV.map(item=><NavItem key={item.id} item={item} active={active}/>)}
      </nav>

      <div className="cp-sidebar-foot">
        <a className="cp-foot-link cp-foot-status" href="/system"><span className="cp-status-dot"/>System</a>
        <a className="cp-foot-link" href={NEW_LIFE_URL} target="_blank" rel="noreferrer">New Life <span>↗</span></a>
      </div>
    </aside>

    <div className="cp-main-shell">
      <header className="cp-topbar">
        <div className="cp-top-left"><span className="cp-top-mark">C</span><span>{eyebrow || 'Workspace'}</span></div>
        <div className="cp-top-right"><span className="cp-live-dot"/> Cornerstone</div>
      </header>
      <main className="cp-main-content">{children}</main>
    </div>
  </div>;
}
