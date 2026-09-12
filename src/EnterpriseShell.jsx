import React from 'react'

const NEW_LIFE_URL = 'https://new-life-game-alpha.vercel.app/start-v2.html'

// Premium products do not put the entire pipeline in the primary nav.
const NAV = [
  { id: 'command', label: 'Home', href: '/' },
  { id: 'content', label: 'Create', href: '/content/remake' },
  { id: 'library', label: 'Library', href: '/generations' },
  { id: 'system', label: 'System', href: '/system' },
]

export default function EnterpriseShell({ active = 'command', children, eyebrow = '' }) {
  const resolved =
    active === 'remake' ||
    active === 'creators' ||
    active === 'profiles' ||
    active === 'production' ||
    active === 'publish' ||
    active === 'measurement' ||
    active === 'content'
      ? 'content'
      : active

  return (
    <div className="cornerstone-app">
      <aside className="cp-sidebar" aria-label="Primary">
        <a className="cp-brand" href="/" aria-label="Cornerstone home">
          <span className="cp-mark" aria-hidden="true"><span>C</span></span>
          <span className="cp-brand-copy">
            <strong>CORNERSTONE</strong>
            <small>Content Engine</small>
          </span>
        </a>

        <nav className="cp-nav" aria-label="Workspace">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={`cp-nav-item${resolved === item.id ? ' is-active' : ''}`}
              aria-current={resolved === item.id ? 'page' : undefined}
            >
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="cp-sidebar-foot">
          <a className="cp-foot-link" href="/system">
            <span className="cp-status-dot" aria-hidden="true" />
            System
          </a>
          <a className="cp-foot-link" href={NEW_LIFE_URL} target="_blank" rel="noreferrer">
            New Life <span aria-hidden="true">↗</span>
          </a>
        </div>
      </aside>

      <div className="cp-main-shell">
        <header className="cp-topbar">
          <div className="cp-top-left">
            <span className="cp-top-eyebrow">{eyebrow || 'Cornerstone'}</span>
          </div>
          <div className="cp-top-right">
            <span className="cp-live-dot" aria-hidden="true" />
            Private
          </div>
        </header>
        <main className="cp-main-content">{children}</main>
      </div>
    </div>
  )
}
