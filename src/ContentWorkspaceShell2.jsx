import React from 'react'
import EnterpriseShell from './EnterpriseShell.jsx'
import CreateWorkspace from './CreateWorkspace3.jsx'
import CreatorGrowthWorkspace from './CreatorEngineWorkspaceFixed.jsx'
import ProfileChannelsWorkspace from './ProfileChannelsWorkspace.jsx'
import CanonicalProductionWorkspace from './CanonicalProductionWorkspace.jsx'
import CanonicalPublishWorkspace from './CanonicalPublishWorkspace.jsx'
import CanonicalMeasureWorkspace from './CanonicalMeasureWorkspace.jsx'

const STAGES = [
  ['remake', 'Create', 'Start from a winning reference or a clear idea.'],
  ['creators', 'Voices', 'Run Cara and Lila as owned creator businesses across every platform.'],
  ['profiles', 'Channels', 'Where it ships and earns.'],
  ['production', 'Make', 'Turn the package into media.'],
  ['publish', 'Publish', 'Schedule what goes live.'],
  ['measurement', 'Learn', 'Record the result. Improve the next one.'],
]

function stageFor(path) {
  const id = path.match(/^\/content(?:\/([^/]+))?/)?.[1] || 'remake'
  return STAGES.some(([x]) => x === id) ? id : 'remake'
}

function Workspace({ stage }) {
  switch (stage) {
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
  return <EnterpriseShell active="content" eyebrow={`Create · ${item[1]}`}>
    <div className="cs-page">
      <header className="cs-page-head"><div className="eyebrow">Step {n} of 6</div><h1>{item[1]}</h1><p>{item[2]}</p></header>
      <nav className="cs-flow" aria-label="Workflow">{STAGES.map(([id, label]) => <a key={id} href={`/content/${id}`} className={stage === id ? 'is-active' : ''}><i />{label}</a>)}</nav>
      <Workspace stage={stage} />
    </div>
  </EnterpriseShell>
}
