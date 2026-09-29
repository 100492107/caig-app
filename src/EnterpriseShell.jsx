import React from 'react'

const NEW_LIFE = '/new-life'

const NAV_GROUPS = [
  { label: 'Operate', items: [
    { id: 'command', label: 'Command', href: '/', key: '01' },
    { id: 'mission', label: 'Directive', href: '/mission', key: '02' },
    { id: 'business', label: 'Business', href: '/business', key: '03' },
  ]},
  { label: 'Creator loop', items: [
    { id: 'research', label: 'Research', href: '/research', key: '04' },
    { id: 'references', label: 'References', href: '/references', key: '05' },
    { id: 'commerce', label: 'Commerce', href: '/commerce', key: '06' },
    { id: 'content', label: 'Build', href: '/content/remake', key: '07' },
    { id: 'voices', label: 'Voices', href: '/content/creators', key: '08' },
    { id: 'production', label: 'Make', href: '/content/production', key: '09' },
    { id: 'publish', label: 'Publish', href: '/content/publish', key: '10' },
    { id: 'measurement', label: 'Learn', href: '/content/measurement', key: '11' },
  ]},
]

const NAV = NAV_GROUPS.flatMap(group => group.items)

const UTILITY = [
  { id: 'library', label: 'Library', href: '/generations' },
  { id: 'system', label: 'System', href: '/system' },
  { id: 'newlife', label: 'New Life', href: '/new-life' },
]

export default function EnterpriseShell({ active = 'command', children, eyebrow = '' }) {
  const resolved = {
    remake: 'content', creators: 'voices', profiles: 'voices', production: 'production',
    publish: 'publish', measurement: 'measurement', content: 'content', command: 'command', commerce: 'commerce',
    business: 'business', mission: 'mission', research: 'research', references: 'references', commerce: 'commerce', library: 'library', system: 'system', newlife: 'newlife',
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
          <a href={NEW_LIFE} className="cs-new-life-link"><span className="cs-dot" /> New Life ↗</a>
        </div>
      </aside>
      <nav className="cs-mobile-header" aria-label="Mobile command header">
        <a className="cs-mobile-brand" href="/" aria-label="Cornerstone home"><span className="cs-brand-mark">C</span><strong>Cornerstone</strong></a>
        <span className="cs-mobile-current">{eyebrow || 'Command'}</span>
        <details className="cs-mobile-more">
          <summary aria-label="More navigation">More</summary>
          <div className="cs-mobile-more-menu">
            <a href="/mission">Directive</a>
            <a href="/research">Research</a>
            <a href="/references">References</a>
            <a href="/commerce">Commerce</a>
            <a href="/content/publish">Publish</a>
            <a href="/generations">Library</a>
            <a href="/system">System</a>
          </div>
        </details>
      </nav>
      <nav className="cs-mobile-nav" aria-label="Mobile primary navigation">
        <a href="/" className={resolved === 'command' ? 'is-active' : ''}><span>⌂</span><small>Home</small></a>
        <a href="/content/creators" className={resolved === 'voices' ? 'is-active' : ''}><span>◎</span><small>Voices</small></a>
        <a href="/content/production" className={resolved === 'production' ? 'is-active' : ''}><span>✦</span><small>Make</small></a>
        <a href="/content/measurement" className={resolved === 'measurement' ? 'is-active' : ''}><span>↗</span><small>Learn</small></a>
        <a href="/business" className={resolved === 'business' ? 'is-active' : ''}><span>◫</span><small>Business</small></a>
        <a href="/new-life" className={resolved === 'newlife' ? 'is-active' : ''}><span>+</span><small>New Life</small></a>
      </nav>
      <div className="cs-stage">
        <div className="cs-stage-bar">
          <div className="cs-stage-context"><span className="label">{eyebrow||'Creator OS'}</span><span className="cs-context-divider">/</span><span className="meta">Command centre</span></div>
          <div className="cs-stage-actions">
            <a className="cs-stage-new-life" href="/new-life">New Life <span>↗</span></a>
            <span className="cs-runtime"><i />Canonical DNA locked</span>
            <span className="cs-command-key">⌘ K</span>
          </div>
        </div>
        <div className="cs-stage-body">{children}</div>
      </div>
    </div>
  )
}
