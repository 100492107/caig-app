import React from 'react'

const CORE = [
  { id: 'command', label: 'Home', href: '/', key: '01' },
  { id: 'mission', label: 'Revenue', href: '/mission', key: '02' },
  { id: 'content', label: 'Make content', href: '/content/remake', key: '03' },
  { id: 'youtube', label: 'YouTube', href: '/youtube', key: '04' },
  { id: 'ai-anywhere', label: 'Other AI', href: '/system/ai-anywhere', key: '05' },
]

const CONTENT_TOOLS = [
  { id: 'research', label: 'Find ideas', href: '/research' },
  { id: 'references', label: 'Examples', href: '/references' },
  { id: 'commerce', label: 'Products & selling', href: '/commerce' },
  { id: 'voices', label: 'Creators', href: '/content/creators' },
  { id: 'production', label: 'Make the assets', href: '/content/production' },
  { id: 'publish', label: 'Post content', href: '/content/publish' },
  { id: 'measurement', label: 'Results', href: '/content/measurement' },
]

const MORE = [
  { id: 'library', label: 'Saved work', href: '/generations' },
  { id: 'system', label: 'Settings & system health', href: '/system' },
  { id: 'newlife', label: 'New Life', href: '/new-life' },
]

const RESOLVED = {
  remake: 'content',
  creators: 'voices',
  profiles: 'voices',
  production: 'production',
  publish: 'publish',
  measurement: 'measurement',
  youtube: 'youtube',
  content: 'content',
  command: 'command',
  commerce: 'commerce',
  business: 'business',
  mission: 'mission',
  research: 'research',
  references: 'references',
  library: 'library',
  system: 'system',
  newlife: 'newlife',
  aiBackup: 'ai-anywhere',
  'ai-anywhere': 'ai-anywhere',
}

function navActive(items, active) {
  return items.some((item) => item.id === active)
}

function link(item, active, compact = false) {
  const selected = active === item.id
  return (
    <a
      key={item.id}
      href={item.href}
      className={'cs-rail-link' + (selected ? ' is-active' : '') + (compact ? ' is-compact' : '')}
      aria-current={selected ? 'page' : undefined}
    >
      <span>{item.label}</span>
      {item.key && <kbd>{item.key}</kbd>}
    </a>
  )
}

export default function EnterpriseShell({ active = 'command', children, eyebrow = '' }) {
  const resolved = RESOLVED[active] || active
  const contentOpen = navActive(CONTENT_TOOLS, resolved)
  const moreOpen = navActive(MORE, resolved)
  const pageLabel = eyebrow || [...CORE, ...CONTENT_TOOLS, ...MORE].find((item) => item.id === resolved)?.label || 'Workspace'

  return (
    <div className="cs-app cs-app-simplified">
      <aside className="cs-rail" aria-label="Main navigation">
        <a className="cs-brand" href="/">
          <span className="cs-brand-mark">C</span>
          <span className="cs-brand-text"><strong>Cornerstone</strong><span>Business workspace</span></span>
        </a>

        <div className="cs-rail-intro">
          <span className="cs-rail-overline">Start here</span>
          <span className="cs-rail-copy">Choose a task. Keep moving.</span>
        </div>

        <nav className="cs-rail-nav" aria-label="Main tasks">
          <div className="cs-nav-group">
            <div className="cs-nav-group-label">Main tasks</div>
            {CORE.map((item) => link(item, resolved))}
          </div>

          <details className="cs-nav-group cs-nav-collapsible" open={contentOpen}>
            <summary className="cs-nav-group-label">Content tools <span aria-hidden="true">⌄</span></summary>
            <div className="cs-nav-subitems">
              {CONTENT_TOOLS.map((item) => link(item, resolved, true))}
            </div>
          </details>

          <details className="cs-nav-group cs-nav-collapsible" open={moreOpen}>
            <summary className="cs-nav-group-label">More <span aria-hidden="true">⌄</span></summary>
            <div className="cs-nav-subitems">
              {MORE.map((item) => link(item, resolved, true))}
            </div>
          </details>
        </nav>

        <div className="cs-rail-foot">
          <span>Work stays saved when you change AI models.</span>
        </div>
      </aside>

      <header className="cs-mobile-header" aria-label="Page header">
        <a className="cs-mobile-brand" href="/" aria-label="Cornerstone home">
          <span className="cs-brand-mark">C</span><strong>Cornerstone</strong>
        </a>
        <span className="cs-mobile-current">{pageLabel}</span>
      </header>

      <nav className="cs-mobile-nav" aria-label="Main tasks">
        <a href="/" className={resolved === 'command' ? 'is-active' : ''}><span aria-hidden="true">⌂</span><small>Home</small></a>
        <a href="/content/remake" className={resolved === 'content' || resolved === 'voices' || resolved === 'production' || resolved === 'publish' ? 'is-active' : ''}><span aria-hidden="true">✦</span><small>Make</small></a>
        <a href="/youtube" className={resolved === 'youtube' ? 'is-active' : ''}><span aria-hidden="true">▶</span><small>YouTube</small></a>
        <a href="/mission" className={resolved === 'mission' ? 'is-active' : ''}><span aria-hidden="true">£</span><small>Revenue</small></a>
        <details className="cs-mobile-more">
          <summary><span aria-hidden="true">•••</span><small>More</small></summary>
          <div className="cs-mobile-more-menu">
            <a href="/system/ai-anywhere">Other AI</a>
            <a href="/research">Find ideas</a>
            <a href="/references">Examples</a>
            <a href="/commerce">Products & selling</a>
            <a href="/content/creators">Creators</a>
            <a href="/content/production">Make the assets</a>
            <a href="/content/publish">Post content</a>
            <a href="/content/measurement">Results</a>
            <a href="/generations">Saved work</a>
            <a href="/system">Settings & system health</a>
            <a href="/new-life">New Life</a>
          </div>
        </details>
      </nav>

      <div className="cs-stage">
        <div className="cs-stage-bar">
          <div className="cs-stage-context"><span className="label">{pageLabel}</span><span className="cs-context-divider">/</span><span className="meta">Cornerstone</span></div>
          <div className="cs-stage-actions">
            <a className="cs-stage-new-life" href="/system/ai-anywhere">Switch AI ↗</a>
          </div>
        </div>
        <div className="cs-stage-body">{children}</div>
      </div>
    </div>
  )
}
