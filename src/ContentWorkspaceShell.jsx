import React, { useMemo } from 'react';
import EnterpriseShell from './EnterpriseShell.jsx';
import ContentEngineWorkspace from './ContentEngineWorkspace.jsx';
import ProfileChannelsWorkspace from './ProfileChannelsWorkspace.jsx';
import CanonicalProductionWorkspace from './CanonicalProductionWorkspace.jsx';
import CanonicalPublishWorkspace from './CanonicalPublishWorkspace.jsx';
import CanonicalMeasureWorkspace from './CanonicalMeasureWorkspace.jsx';
import { CreatorsStaged } from './TrackBStagedSurfaces.jsx';

const STAGES = [
  ['remake', 'Find & build', 'Turn a winner into an original package'],
  ['creators', 'Creators', 'Cara, Lila, and owned voices'],
  ['profiles', 'Channels', 'Where it ships and what it earns'],
  ['production', 'Making', 'Packages currently being produced'],
  ['publish', 'Going live', 'Scheduled and shipped work'],
  ['measurement', 'What worked', 'Performance that teaches the next move'],
];

function stageFor(pathname) {
  const match = pathname.match(/^\/content(?:\/([^/]+))?/);
  const value = match?.[1] || 'remake';
  return STAGES.some(([id]) => id === value) ? value : 'remake';
}

function StageHeader({ stage }) {
  const item = STAGES.find(([id]) => id === stage) || STAGES[0];
  const index = STAGES.findIndex(([id]) => id === stage) + 1;
  return (
    <div className="content-stage-header">
      <div>
        <div className="content-stage-kicker">Content · step {index} of 6</div>
        <h1>{item[1]}</h1>
        <p>{item[2]}</p>
      </div>
    </div>
  );
}

function Workspace({ stage }) {
  const go = (id) => {
    const next = ['production', 'publish', 'measurement', 'creators', 'profiles'].includes(id) ? id : 'production';
    window.location.href = `/content/${next}`;
  };
  switch (stage) {
    case 'remake':
      return <ContentEngineWorkspace onGo={go} />;
    case 'creators':
      return <CreatorsStaged stage={0} onAdvance={() => { window.location.href = '/content/profiles'; }} />;
    case 'profiles':
      return <ProfileChannelsWorkspace />;
    case 'production':
      return <CanonicalProductionWorkspace />;
    case 'publish':
      return <CanonicalPublishWorkspace />;
    case 'measurement':
      return <CanonicalMeasureWorkspace />;
    default:
      return null;
  }
}

export default function ContentWorkspaceShell() {
  const stage = useMemo(() => stageFor(window.location.pathname), []);
  return (
    <EnterpriseShell active="content" eyebrow="Content">
      <main className="content-shell">
        <style>{`
          .content-shell{min-width:0}
          .content-stage-nav{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;margin-bottom:18px}
          .content-stage-nav a{display:flex;flex-direction:column;gap:4px;min-height:54px;padding:10px 11px;border:1px solid var(--border);border-radius:11px;color:var(--text-muted);background:var(--surface);text-decoration:none}
          .content-stage-nav a:hover{background:var(--surface-2);color:var(--text)}
          .content-stage-nav a.active{border-color:rgba(212,181,106,.45);background:rgba(212,181,106,.08);color:var(--text)}
          .content-stage-nav b{font-size:8px;letter-spacing:.14em;color:var(--text-subtle)}
          .content-stage-nav span{font-size:11px;font-weight:850;line-height:1.15}
          .content-stage-nav small{font-size:8px;color:var(--text-subtle);line-height:1.25}
          .content-stage-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--border)}
          .content-stage-kicker{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-subtle);font-weight:850}
          .content-stage-header h1{margin:8px 0 0;font-size:clamp(30px,4.6vw,48px);line-height:.94;letter-spacing:-.06em}
          .content-stage-header p{margin:8px 0 0;color:var(--text-muted);font-size:13px;line-height:1.45;max-width:52ch}
          .content-workspace{min-width:0}
          @media(max-width:980px){.content-stage-nav{grid-template-columns:repeat(3,minmax(0,1fr))}}
          @media(max-width:560px){
            .content-stage-nav{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:14px}
            .content-stage-nav a{min-height:46px;padding:8px 6px;gap:2px;justify-content:center}
            .content-stage-nav b{font-size:7px}.content-stage-nav span{font-size:10px;text-align:center}.content-stage-nav small{display:none}
            .content-stage-header{flex-direction:column;align-items:flex-start;gap:6px}
            .content-stage-header h1{font-size:clamp(28px,11vw,40px)}
          }
        `}</style>
        <nav className="content-stage-nav" aria-label="Content steps">
          {STAGES.map(([id, label, description], index) => (
            <a key={id} href={`/content/${id}`} className={stage === id ? 'active' : ''} aria-current={stage === id ? 'page' : undefined}>
              <b>0{index + 1}</b>
              <span>{label}</span>
              <small>{description}</small>
            </a>
          ))}
        </nav>
        <StageHeader stage={stage} />
        <div className="content-workspace">
          <Workspace stage={stage} />
        </div>
      </main>
    </EnterpriseShell>
  );
}
