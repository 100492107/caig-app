import React from 'react'

const NEW_LIFE_URL='https://new-life-game-alpha.vercel.app/start-v2.html'
const NAV=[
  {id:'command',label:'Home',href:'/',glyph:'01'},
  {id:'content',label:'Create',href:'/content/remake',glyph:'02'},
  {id:'library',label:'Library',href:'/generations',glyph:'03'},
  {id:'voices',label:'Voices',href:'/content/creators',glyph:'04'},
  {id:'channels',label:'Channels',href:'/content/profiles',glyph:'05'},
  {id:'production',label:'Make',href:'/content/production',glyph:'06'},
  {id:'publish',label:'Publish',href:'/content/publish',glyph:'07'},
  {id:'learning',label:'Learn',href:'/content/measurement',glyph:'08'},
]

export default function EnterpriseShell({active='command',children,eyebrow=''}){
 return <div className="cornerstone-app">
  <aside className="cp-sidebar">
   <a className="cp-brand" href="/" aria-label="Cornerstone home">
    <span className="cp-mark"><span>C</span></span>
    <span className="cp-brand-copy"><strong>CORNERSTONE</strong><small>Creative intelligence</small></span>
   </a>
   <div className="cp-nav-heading">Studio</div>
   <nav className="cp-nav" aria-label="Cornerstone workspace">
    {NAV.map(item=><a key={item.id} href={item.href} className={`cp-nav-item${active===item.id?' is-active':''}`} aria-current={active===item.id?'page':undefined}>
      <span className="cp-nav-index">{item.glyph}</span><span>{item.label}</span><i aria-hidden="true" />
    </a>)}
   </nav>
   <div className="cp-sidebar-foot">
    <a className="cp-foot-link cp-foot-status" href="/system"><span className="cp-status-dot"/>System status</a>
    <a className="cp-foot-link" href={NEW_LIFE_URL} target="_blank" rel="noreferrer">New Life <span>↗</span></a>
   </div>
  </aside>
  <div className="cp-main-shell">
   <header className="cp-topbar">
    <div className="cp-top-left"><span className="cp-top-mark">C</span><span>{eyebrow||'Studio'}</span></div>
    <div className="cp-top-right"><span className="cp-live-dot"/>Private workspace</div>
   </header>
   <main className="cp-main-content">{children}</main>
  </div>
 </div>
}
