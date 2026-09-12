import React, { useMemo } from 'react'
import EnterpriseShell from './EnterpriseShell.jsx'
import CreateWorkspace from './CreateWorkspace.jsx'
import ProfileChannelsWorkspace from './ProfileChannelsWorkspace.jsx'
import CanonicalProductionWorkspace from './CanonicalProductionWorkspace.jsx'
import CanonicalPublishWorkspace from './CanonicalPublishWorkspace.jsx'
import CanonicalMeasureWorkspace from './CanonicalMeasureWorkspace.jsx'
import { CreatorsStaged } from './TrackBStagedSurfaces.jsx'

const STAGES = [
  ['remake', 'Create', 'Start from a winning reference or a blank idea.'],
  ['creators', 'Voices', 'Choose who this piece sounds like.'],
  ['profiles', 'Channels', 'Where it will live and earn.'],
  ['production', 'Make', 'Turn the package into finished media.'],
  ['publish', 'Publish', 'Schedule what goes into the world.'],
  ['measurement', 'Learn', 'Capture what worked. Feed the next create.'],
]

const NEXT = {
  remake: ['creators', 'Voices'],
  creators: ['profiles', 'Channels'],
  profiles: ['production', 'Make'],
  production: ['publish', 'Publish'],
  publish: ['measurement', 'Learn'],
  measurement: ['remake', 'Create'],
}

function stageFor(pathname) {
  const id = pathname.match(/^\/content(?:\/([^/]+))?/)?.[1] || 'remake'
  return STAGES.some(([x]) => x === id) ? id : 'remake'
}

function Workspace({ stage }) {
  switch (stage) {
    case 'remake':
      return <CreateWorkspace />
    case 'creators':
      return <CreatorsStaged stage={0} onAdvance={() => { window.location.href = '/content/profiles' }} />
    case 'profiles':
      return <ProfileChannelsWorkspace />
    case 'production':
      return <CanonicalProductionWorkspace />
    case 'publish':
      return <CanonicalPublishWorkspace />
    case 'measurement':
      return <CanonicalMeasureWorkspace />
    default:
      return null
  }
}

export default function ContentWorkspaceShell2() {
  const stage = useMemo(() => stageFor(window.location.pathname), [])
  const item = STAGES.find(([id]) => id === stage) || STAGES[0]
  const next = NEXT[stage] || NEXT.remake
  const index = STAGES.findIndex(([id]) => id === stage) + 1

  return (
    <EnterpriseShell active="content" eyebrow={`Create · ${item[1]}`}>
      <main className="cs-work">
        <div className="cs-context">
          <span>Studio / <b>{item[1]}</b> · {index} of 6</span>
          <a href={`/content/${next[0]}`}>Next · {next[1]} →</a>
        </div>

        <header className="cs-hero">
          <div>
            <div className="cs-over">Cornerstone studio</div>
            <h1>{item[1]}</h1>
            <p>{item[2]}</p>
          </div>
          <nav className="cs-progress" aria-label="Create workflow">
            {STAGES.map(([id, label]) => (
              <a
                key={id}
                href={`/content/${id}`}
                className={`cs-step${stage === id ? ' active' : ''}`}
                aria-current={stage === id ? 'step' : undefined}
              >
                <span />
                {label}
              </a>
            ))}
          </nav>
        </header>

        <Workspace stage={stage} />
      </main>
    </EnterpriseShell>
  )
}
