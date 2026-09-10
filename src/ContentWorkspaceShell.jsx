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
  ['creators', 'Creators', 'Owned voices and repeatable formats'],
  ['profiles', 'Channels', 'Where the work ships and earns'],
  ['production', 'Production', 'Build the finished assets'],
  ['publish', 'Publishing', 'Put approved work into market'],
  ['measurement', 'Learning', 'See what worked and what changes next'],
];

const NEXT = {
  remake: ['creators', 'Choose a voice'],
  creators: ['profiles', 'Set channels'],
  profiles: ['production', 'Open production'],
  production: ['publish', 'Send to publishing'],
  publish: ['measurement', 'Measure the result'],
  measurement: ['remake', 'Build from the lesson'],
};

function stageFor(pathname) {
  const match = pathname.match(/^\/content(?:\/([^/]+))?/);
  const value = match?.[1] || 'remake';
  return STAGES.some(([id]) => id === value) ? value : 'remake';
}

function StageHeader({ stage }) {
  const item = STAGES.find(([id]) => id === stage) || STAGES[0];
  const index = STAGES.findIndex(([id]) => id === stage) + 1;
  const [nextId, nextLabel] = NEXT[stage] || NEXT.remake;
  return (
    <header className="content-stage-header">
      <div className="content-stage-heading">
        <div className="content-stage-kicker"><span>CONTENT ENGINE</span><i /> <span>0{index} / 06</span></div>
        <h1>{item[1]}</h1>
        <p>{item[2]}</p>
      </div>
      <div className="content-stage-next">
        <span>Next</span>
        <a href={`/content/${nextId}`}>{nextLabel} <b>→</b></a>
      </div>
    </header>
  );
}

function Workspace({ stage }) {
  const go = (id) => {
    const next = ['production', 'publish', 'measurement', 'creators', 'profiles'].includes(id) ? id : 'production';
    window.location.href = `/content/${next}`;
  };
  switch (stage) {
    case 'remake': return <ContentEngineWorkspace onGo={go} />;
    case 'creators': return <CreatorsStaged stage={0} onAdvance={() => { window.location.href = '/content/profiles'; }} />;
    case 'profiles': return <ProfileChannelsWorkspace />;
    case 'production': return <CanonicalProductionWorkspace />;
    case 'publish': return <CanonicalPublishWorkspace />;
    case 'measurement': return <CanonicalMeasureWorkspace />;
    default: return null;
  }
}

export default function ContentWorkspaceShell() {
  const stage = useMemo(() => stageFor(window.location.pathname), []);
  const currentIndex = Math.max(0, STAGES.findIndex(([id]) => id === stage));
  return (
    <EnterpriseShell active="content" eyebrow="Content">
      <main className="content-shell">
        <style>{`
          .content-shell{min-width:0;max-width:1240px;margin:0 auto;padding-bottom:52px}
          .content-command-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 2px 14px}
          .content-command-bar .eyebrow{font-size:9px;letter-spacing:.19em;text-transform:uppercase;color:var(--text-subtle);font-weight:900}
          .content-command-bar a{display:inline-flex;align-items:center;gap:6px;color:var(--text-muted);font-size:10px;font-weight:800;text-decoration:none}
          .content-command-bar a:hover{color:var(--text)}
          .content-stage-nav{display:flex;align-items:stretch;gap:5px;margin-bottom:22px;padding:5px;border:1px solid var(--border);background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(0,0,0,.08));border-radius:16px;overflow-x:auto;scrollbar-width:none}
          .content-stage-nav::-webkit-scrollbar{display:none}
          .content-stage-nav a{position:relative;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:9px;min-width:165px;flex:1;padding:11px 12px;border:1px solid transparent;border-radius:11px;color:var(--text-muted);background:transparent;text-decoration:none;transition:background .16s,border-color .16s,color .16s,transform .16s}
          .content-stage-nav a:hover{background:var(--surface-2);color:var(--text);transform:translateY(-1px)}
          .content-stage-nav a.active{background:linear-gradient(145deg,rgba(212,181,106,.13),rgba(255,255,255,.025));border-color:rgba(212,181,106,.34);color:var(--text)}
          .content-stage-nav b{grid-row:1 / span 2;align-self:center;font-size:8px;letter-spacing:.13em;color:var(--text-subtle)}
          .content-stage-nav span{font-size:11px;font-weight:900;line-height:1.1;white-space:nowrap}
          .content-stage-nav small{margin-top:4px;font-size:8px;line-height:1.2;color:var(--text-subtle);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          .content-stage-nav a.active b{color:#d4b56a}
          .content-stage-nav a.active::after{content:"";position:absolute;left:18px;right:18px;bottom:-5px;height:2px;background:#d4b56a;border-radius:99px;box-shadow:0 0 16px rgba(212,181,106,.45)}
          .content-stage-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:20px;padding:0 2px 19px;border-bottom:1px solid var(--border)}
          .content-stage-heading{min-width:0}
          .content-stage-kicker{display:flex;align-items:center;gap:8px;font-size:8px;letter-spacing:.19em;text-transform:uppercase;color:var(--text-subtle);font-weight:900}
          .content-stage-kicker i{width:3px;height:3px;border-radius:50%;background:var(--text-subtle);display:inline-block}
          .content-stage-heading h1{margin:10px 0 0;font-size:clamp(36px,5vw,60px);line-height:.9;letter-spacing:-.077em}
          .content-stage-heading p{margin:10px 0 0;color:var(--text-muted);font-size:13px;line-height:1.5;max-width:68ch}
          .content-stage-next{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:0 0 auto;padding-bottom:2px}
          .content-stage-next span{font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-subtle);font-weight:900}
          .content-stage-next a{display:inline-flex;align-items:center;gap:8px;color:var(--text);text-decoration:none;font-size:11px;font-weight:900}
          .content-stage-next a:hover{color:#d4b56a}
          .content-stage-next a b{color:#d4b56a;font-size:14px}
          .content-workspace{min-width:0;position:relative}
          @media(max-width:980px){.content-stage-nav a{min-width:150px}.content-stage-next{display:none}}
          @media(max-width:620px){
            .content-shell{padding-bottom:36px}
            .content-command-bar{margin-bottom:10px}
            .content-stage-nav{margin-bottom:15px;padding:5px;border-radius:13px}
            .content-stage-nav a{min-width:138px;padding:9px 10px}
            .content-stage-nav small{display:none}
            .content-stage-header{align-items:flex-start;margin-bottom:15px;padding-bottom:15px}
            .content-stage-heading h1{font-size:clamp(32px,11vw,44px)}
            .content-stage-heading p{font-size:12px;max-width:48ch}
          }
        `}</style>
        <div className="content-command-bar">
          <span className="eyebrow">Workroom</span>
          <a href="/">Back to Command <b>→</b></a>
        </div>
        <nav className="content-stage-nav" aria-label="Content engine stages">
          {STAGES.map(([id, label, description], index) => (
            <a key={id} href={`/content/${id}`} className={stage === id ? 'active' : ''} aria-current={stage === id ? 'page' : undefined}>
              <b>0{index + 1}</b><span>{label}</span><small>{description}</small>
            </a>
          ))}
        </nav>
        <StageHeader stage={stage} />
        <div className="content-workspace" data-stage-index={currentIndex}><Workspace stage={stage} /></div>
      </main>
    </EnterpriseShell>
  );
}
