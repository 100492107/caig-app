import React from 'react'

const NEW_LIFE = 'https://new-life-game-alpha.vercel.app/start-v2.html'
const NAV = [
  { id: 'command', label: 'Home', href: '/', key: 'H' },
  { id: 'content', label: 'Create', href: '/content/remake', key: 'C' },
  { id: 'library', label: 'Library', href: '/generations', key: 'L' },
  { id: 'system', label: 'System', href: '/system', key: 'S' },
]

export default function EnterpriseShell({ active = 'command', children, eyebrow = '' }) {
  const resolved = ['remake','creators','profiles','production','publish','measurement','content'].includes(active)
    ? 'content'
    : active

  return (
    <div className="cs-app">
      <aside className="cs-rail" aria-label="Primary">
        <a className="cs-brand" href="/">
          <span className="cs-brand-mark">C</span>
          <span className="cs-brand-text">
            <strong>Cornerstone</strong>
            <span>Content engine</span>
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
              {item.label}
              <kbd>{item.key}</kbd>
            </a>
          ))}
        </nav>
        <div className="cs-rail-foot">
          <a href="/system"><span className="cs-dot" /> Status</a>
          <a href={NEW_LIFE} target="_blank" rel="noreferrer">New Life ↗</a>
        </div>
      </aside>
      <div className="cs-stage">
        <div className="cs-stage-bar">
          <span className="label">{eyebrow || 'Cornerstone'}</span>
          <span className="meta">Private workspace</span>
        </div>
        <div className="cs-stage-body">{children}</div>
      </div>
    </div>
  )
}
