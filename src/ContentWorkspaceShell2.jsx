import React from 'react'
import EnterpriseShell from './EnterpriseShell.jsx'
import CreateWorkspace from './CreateWorkspace3.jsx'
import CreatorGrowthWorkspace from './CreatorEngineWorkspaceFixed.jsx'
import ProfileChannelsWorkspace from './ProfileChannelsWorkspace.jsx'
import CanonicalProductionWorkspace from './CanonicalProductionWorkspace.jsx'
import CanonicalPublishWorkspace from './CanonicalPublishWorkspace.jsx'
import CanonicalMeasureWorkspace from './CanonicalMeasureWorkspace.jsx'
import CreatorDnaDossier from './CreatorDnaDossier.jsx'

const STAGES = [
  ['research', 'Research', 'Capture outlier signals. Strip topic. Keep the attention mechanism.'],
  ['remake', 'Build', 'Start from evidence. Turn a winning mechanism into an original package.'],
  ['creators', 'Voices', 'Run Cara and Lila as distinct owned creator businesses, not generic personas.'],
  ['profiles', 'Channels', 'Decide where each asset lives, grows and earns.'],
  ['production', 'Make', 'Turn the package into finished media.'],
  ['publish', 'Publish', 'Put the right work into the market.'],
  ['measurement', 'Learn', 'Record the result. Turn evidence into the next move.'],
]

function stageFor(path) {
  const id = path.match(/^\/content(?:\/([^/]+))?/)?.[1] || 'remake'
  return STAGES.some(([x]) => x === id) ? id : 'remake'
}

function Workspace({ stage }) {
  switch (stage) {
    case 'research':
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/content/research')) {
        window.location.replace('/research')
      }
      return null
    case 'remake': return <CreateWorkspace />
    case 'creators': return <CreatorGrowthWorkspace />
    case 'profiles': return <ProfileChannelsWorkspace />
    case 'production': return <CanonicalProductionWorkspace />
    case 'publish': return <CanonicalPublishWorkspace />
    case 'measurement': return <CanonicalMeasureWorkspace />
    default: return null
  }
}

export default function ContentWorkspaceShell2() {
  const stage = stageFor(window.location.pathname)
  const item = STAGES.find(([id]) => id === stage) || STAGES[0]
  const n = STAGES.findIndex(([id]) => id === stage) + 1
  const shellActive = stage === 'creators' ? 'voices' : stage === 'remake' ? 'content' : stage

  return (
    <EnterpriseShell active={shellActive} eyebrow={item[1]}>
      <div className="cs-page">
        <header className="cs-page-head">
          <div className="eyebrow">The creator loop · Step {n} of {STAGES.length}</div>
          <h1>{item[1]}</h1>
          <p>{item[2]}</p>
        </header>

        <nav className="cs-flow" aria-label="Creator business loop">
          {STAGES.map(([id, label, desc], index) => (
            <a key={id} href={id === 'research' ? '/research' : `/content/${id}`} className={stage === id ? 'is-active' : ''}>
              <i />
              <span>{String(index + 1).padStart(2, '0')} · {label}</span>
              <small>{desc}</small>
            </a>
          ))}
        </nav>

        <section className="cs-loop-context">
          <div><span className="cs-loop-context-k">Owned creator system</span><strong>Cara + Lila run on one canonical intelligence layer.</strong></div>
          <div className="cs-loop-context-right"><span>IDENTITY</span><b>Frozen</b><span>GENERATION</span><b>DNA-first</b></div>
        </section>

        {stage === 'creators' ? <CreatorDnaDossier /> : null}

        <Workspace stage={stage} />
      </div>
    </EnterpriseShell>
  )
}
