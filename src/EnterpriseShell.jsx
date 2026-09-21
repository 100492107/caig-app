import React from 'react'

const NEW_LIFE = 'https://new-life-game-alpha.vercel.app/start-v2.html'

const NAV_GROUPS = [
  { label: 'Operate', items: [
    { id: 'command', label: 'Command', href: '/', key: '01' },
    { id: 'business', label: 'Business', href: '/business', key: '02' },
  ]},
  { label: 'Creator loop', items: [
    { id: 'content', label: 'Build', href: '/content/remake', key: '03' },
    { id: 'voices', label: 'Voices', href: '/content/creators', key: '04' },
    { id: 'production', label: 'Make', href: '/content/production', key: '05' },
    { id: 'publish', label: 'Publish', href: '/content/publish', key: '06' },
    { id: 'measurement', label: 'Learn', href: '/content/measurement', key: '07' },
  ]},
]

const NAV = NAV_GROUPS.flatMap(group => group.items)

const UTILITY = [
  { id: 'library', label: 'Library', href: '/generations' },
  { id: 'system', label: 'System', href: '/system' },
]

export default function EnterpriseShell({ active = 'command', children, eyebrow = '' }) {
  const resolved = {
    remake: 'content', creators: 'voices', profiles: 'voices', production: 'production',
    publish: 'publish', measurement: 'measurement', content: 'content', command: 'command',
    business: 'business', library: 'library', system: 'system',
  }[active] || active
  return (
    <div className="cs-app">
      <aside className="cs-rail" aria-label="Primary navigation">
        <a className="cs-brand" href="/">
          <span className="cs-brand-mark">C</span>
          <span className="cs-brand-text"><strong>Cornerstone</strong><span>Creator OS · 1.0</span></span>
        </a>
        <div className="cs-rail-intro">
          <span className="cs-rail-overline">Operating system</span>
          <span className="cs-rail-copy">Build owned attention. Publish. Learn. Compound.</span>
        </div>
        <nav className="cs-rail-nav" aria-label="Workspace">
          {NAV_GROUPS.map(group=>(
            <div className="cs-nav-group" key={group.label}>
              <div className="cs-nav-group-label">{group.label}</div>
              {group.items.map(item=><a key={item.id} href={item.href} className={'cs-rail-link'+(resolved===item.id?' is-active':'')} aria-current={resolved===item.id?'page':undefined}>
                <span>{item.label}</span><kbd>{item.key}</kbd>
              </a>)}
            </div>
          ))}
        </nav>
        <div className="cs-rail-foot">
          <div className="cs-nav-group-label">Manage</div>
          {UTILITY.map(item=><a key={item.id} href={item.href}>{item.label}</a>)}
          <a href={NEW_LIFE} target="_blank" rel="noreferrer"><span className="cs-dot" /> New Life ↗</a>
        </div>
      </aside>
      <div className="cs-stage">
        <div className="cs-stage-bar">
          <div className="cs-stage-context"><span className="label">{eyebrow||'Creator OS'}</span><span className="cs-context-divider">/</span><span className="meta">Command centre</span></div>
          <div className="cs-stage-actions">
            <span className="cs-runtime"><i />Canonical DNA locked</span>
            <span className="cs-command-key">⌘ K</span>
          </div>
        </div>
        <div className="cs-stage-body">{children}</div>
      </div>
    </div>
  )
}
