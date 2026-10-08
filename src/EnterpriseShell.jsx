import React from 'react'

const NEW_LIFE = '/new-life'

const NAV_GROUPS = [
  { label: 'Main', items: [
    { id: 'command', label: 'Home', href: '/', key: '01' },
    { id: 'mission', label: 'Today', href: '/mission', key: '02' },
    { id: 'business', label: 'Money', href: '/business', key: '03' },
  ]},
  { label: 'Create & learn', items: [
    { id: 'research', label: 'Find ideas', href: '/research', key: '04' },
    { id: 'references', label: 'Examples', href: '/references', key: '05' },
    { id: 'commerce', label: 'Selling', href: '/commerce', key: '06' },
    { id: 'content', label: 'Plan', href: '/content/remake', key: '07' },
    { id: 'voices', label: 'Creators', href: '/content/creators', key: '08' },
    { id: 'production', label: 'Make content', href: '/content/production', key: '09' },
    { id: 'publish', label: 'Post', href: '/content/publish', key: '10' },
    { id: 'measurement', label: 'Results', href: '/content/measurement', key: '11' },
    { id: 'youtube', label: 'YouTube', href: '/youtube', key: '12' },
  ]},
]

const NAV = NAV_GROUPS.flatMap(group => group.items)

const UTILITY = [
  { id: 'library', label: 'Saved work', href: '/generations' },
  { id: 'system', label: 'Settings', href: '/system' },
  { id: 'ai-backup', label: 'AI Backup', href: '/system/ai-backup' },
  { id: 'newlife', label: 'New Life', href: '/new-life' },
]

export default function EnterpriseShell({ active = 'command', children, eyebrow = '' }) {
  const resolved = {
    remake: 'content', creators: 'voices', profiles: 'voices', production: 'production',
    publish: 'publish', measurement: 'measurement', youtube: 'youtube', content: 'content', command: 'command', commerce: 'commerce', aiBackup: 'ai-backup', 'ai-backup': 'ai-backup',
    business: 'business', mission: 'mission', research: 'research', references: 'references', commerce: 'commerce', library: 'library', system: 'system', newlife: 'newlife',
  }[active] || active
  return (
    <div className="cs-app">
      <aside className="cs-rail" aria-label="Primary navigation">
        <a className="cs-brand" href="/">
          <span className="cs-brand-mark">C</span>
          <span className="cs-brand-text"><strong>Cornerstone</strong><span>Creator workspace</span></span>
        </a>
        <div className="cs-rail-intro">
          <span className="cs-rail-overline">Your workspace</span>
          <span className="cs-rail-copy">Create. Post. See what works. Improve.</span>
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
          <div className="cs-nav-group-label">More</div>
          {UTILITY.map(item=><a key={item.id} href={item.href}>{item.label}</a>)}
          <a href={NEW_LIFE} className="cs-new-life-link"><span className="cs-dot" /> New Life ↗</a>
        </div>
      </aside>
      <nav className="cs-mobile-header" aria-label="Mobile command header">
        <a className="cs-mobile-brand" href="/" aria-label="Cornerstone home"><span className="cs-brand-mark">C</span><strong>Cornerstone</strong></a>
        <span className="cs-mobile-current">{eyebrow || 'Home'}</span>
        <details className="cs-mobile-more">
          <summary aria-label="More navigation">More</summary>
          <div className="cs-mobile-more-menu">
            <a href="/mission">Today</a>
            <a href="/research">Find ideas</a>
            <a href="/references">Examples</a>
            <a href="/commerce">Selling</a>
            <a href="/content/publish">Post</a>
            <a href="/youtube">YouTube</a>
            <a href="/generations">Saved work</a>
            <a href="/system">Settings</a>
            <a href="/system/ai-backup">AI Backup</a>
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
          <div className="cs-stage-context"><span className="label">{eyebrow||'Creator workspace'}</span><span className="cs-context-divider">/</span><span className="meta">Home</span></div>
          <div className="cs-stage-actions">
            <a className="cs-stage-new-life" href="/new-life">New Life <span>↗</span></a>
            <span className="cs-runtime"><i />Core rules loaded</span>
            <span className="cs-command-key">⌘ K</span>
          </div>
        </div>
        <div className="cs-stage-body">{children}</div>
      </div>
    </div>
  )
}
