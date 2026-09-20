import React from 'react'

const NEW_LIFE = 'https://new-life-game-alpha.vercel.app/start-v2.html'

const NAV = [
  { id: 'command', label: 'Command', href: '/', key: '⌘1' },
  { id: 'content', label: 'Build', href: '/content/remake', key: '⌘2' },
  { id: 'voices', label: 'Voices', href: '/content/creators', key: '⌘3' },
  { id: 'production', label: 'Make', href: '/content/production', key: '⌘4' },
  { id: 'publish', label: 'Publish', href: '/content/publish', key: '⌘5' },
  { id: 'measurement', label: 'Learn', href: '/content/measurement', key: '⌘6' },
]

const UTILITY = [
  { id: 'library', label: 'Library', href: '/generations' },
  { id: 'system', label: 'System', href: '/system' },
]

export default function EnterpriseShell({ active = 'command', children, eyebrow = '' }) {
  const resolved = {
    remake: 'content',
    creators: 'voices',
    profiles: 'voices',
    production: 'production',
    publish: 'publish',
    measurement: 'measurement',
    content: 'content',
    command: 'command',
    library: 'library',
    system: 'system',
  }[active] || active

  return (
    <div className="cs-app">
      <aside className="cs-rail" aria-label="Primary">
        <a className="cs-brand" href="/">
          <span className="cs-brand-mark">C</span>
          <span className="cs-brand-text">
            <strong>Cornerstone</strong>
            <span>Creator OS</span>
          </span>
        </a>

        <nav className="cs-rail-nav" aria-label="Workspace">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={`cs-rail-link${resolved === item.id ? ' is-active' : ''}`}
              aria-current={resolved === item.id ? 'page' : undefined}
            >
              <span>{item.label}</span>
              <kbd>{item.key}</kbd>
            </a>
          ))}
        </nav>

        <div className="cs-rail-foot">
          <div style={{padding:'0 12px 9px',fontSize:9,letterSpacing:'.13em',textTransform:'uppercase',color:'var(--cs-os-subtle)',fontWeight:800}}>
            Utilities
          </div>
          {UTILITY.map((item) => (
            <a key={item.id} href={item.href}>{item.label}</a>
          ))}
          <a href={NEW_LIFE} target="_blank" rel="noreferrer">
            <span className="cs-dot" /> New Life ↗
          </a>
        </div>
      </aside>

      <div className="cs-stage">
        <div className="cs-stage-bar">
          <span className="label">{eyebrow || 'Creator OS'}</span>
          <span className="meta">Evidence → Build → Make → Publish → Learn</span>
        </div>
        <div className="cs-stage-body">{children}</div>
      </div>
    </div>
  )
}
