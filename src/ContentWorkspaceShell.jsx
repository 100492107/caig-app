import React, { useMemo } from 'react';
import EnterpriseShell from './EnterpriseShell.jsx';
import ContentEngineWorkspace from './ContentEngineWorkspace.jsx';
import ProfileChannelsWorkspace from './ProfileChannelsWorkspace.jsx';
import CanonicalProductionWorkspace from './CanonicalProductionWorkspace.jsx';
import CanonicalPublishWorkspace from './CanonicalPublishWorkspace.jsx';
import CanonicalMeasureWorkspace from './CanonicalMeasureWorkspace.jsx';
import { CreatorsStaged } from './TrackBStagedSurfaces.jsx';

const STAGES = [
  ['remake', 'Create', 'Find a strong idea and make it yours.'],
  ['creators', 'Voices', 'Choose who brings it to life.'],
  ['profiles', 'Channels', 'Choose where it should win.'],
  ['production', 'Make', 'Turn the package into finished work.'],
  ['publish', 'Publish', 'Put approved work into the world.'],
  ['measurement', 'Learn', 'See what worked and use it.'],
];

const NEXT = {
  remake: ['creators', 'Choose a voice'],
  creators: ['profiles', 'Choose a channel'],
  profiles: ['production', 'Make the work'],
  production: ['publish', 'Publish it'],
  publish: ['measurement', 'See the result'],
  measurement: ['remake', 'Use the learning'],
};

function stageFor(pathname) {
  const match = pathname.match(/^\/content(?:\/([^/]+))?/);
  const value = match?.[1] || 'remake';
  return STAGES.some(([id]) => id === value) ? value : 'remake';
}

function Workspace({ stage }) {
  const go = (id) => { window.location.href = `/content/${id}`; };
  switch (stage) {
    case 'remake': return <ContentEngineWorkspace onGo={go} />;
    case 'creators': return <CreatorsStaged stage={0} onAdvance={() => go('profiles')} />;
    case 'profiles': return <ProfileChannelsWorkspace />;
    case 'production': return <CanonicalProductionWorkspace />;
    case 'publish': return <CanonicalPublishWorkspace />;
    case 'measurement': return <CanonicalMeasureWorkspace />;
    default: return null;
  }
}

export default function ContentWorkspaceShell() {
  const stage = useMemo(() => stageFor(window.location.pathname), []);
  return (
    <EnterpriseShell active={stage === 'remake' ? 'content' : stage} eyebrow="Create">
      <main className="studio-shell">
        <style>{`
          .studio-shell{min-width:0;max-width:1240px;margin:0 auto}
          .studio-back{display:inline-flex;align-items:center;gap:7px;color:var(--text-muted);font-size:10px;font-weight:800;text-decoration:none;margin-bottom:18px}.studio-back:hover{color:var(--text)}
          .studio-title{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:22px}.studio-title h1{margin:6px 0 0;font-size:clamp(34px,5vw,58px);line-height:.92;letter-spacing:-.065em}.studio-title p{margin:9px 0 0;color:var(--text-muted);font-size:12px;line-height:1.55;max-width:62ch}.studio-kicker{font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--track-b)}
          .studio-next{flex:0 0 auto;text-align:right}.studio-next span{display:block;color:var(--text-subtle);font-size:8px;letter-spacing:.14em;text-transform:uppercase}.studio-next a{display:inline-flex;margin-top:5px;align-items:center;gap:6px;color:var(--text);font-size:10px;font-weight:900;text-decoration:none}.studio-next a b{color:#d4b56a;font-size:14px}
          .studio-nav{display:flex;gap:4px;padding:4px;margin-bottom:24px;border:1px solid var(--border);border-radius:13px;background:rgba(255,255,255,.02);overflow:auto;scrollbar-width:none}.studio-nav::-webkit-scrollbar{display:none}.studio-nav a{position:relative;min-width:112px;flex:1;padding:10px 11px;border-radius:9px;color:var(--text-muted);text-decoration:none;font-size:10px;font-weight:850;white-space:nowrap}.studio-nav a:hover{background:rgba(255,255,255,.04);color:var(--text)}.studio-nav a.active{background:rgba(196,180,154,.10);color:var(--text)}.studio-nav a.active:after{content:'';position:absolute;left:11px;right:11px;bottom:4px;height:1px;background:var(--track-b)}.studio-nav small{display:block;margin-top:3px;color:var(--text-subtle);font-size:8px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          @media(max-width:850px){.studio-title{display:block}.studio-next{display:none}.studio-nav a{min-width:105px}}@media(max-width:560px){.studio-shell{width:100%}.studio-nav{margin-bottom:18px}.studio-nav a{min-width:92px}.studio-nav small{display:none}.studio-title h1{font-size:38px}}
        `}</style>
        <a href="/" className="studio-back">← Home</a>
        <nav className="studio-nav" aria-label="Content workflow">
          {STAGES.map(([id, label, description]) => <a key={id} href={`/content/${id}`} className={stage === id ? 'active' : ''}>{label}<small>{description}</small></a>)}
        </nav>
        <header className="studio-title">
          <div><div className="studio-kicker">Your content workspace</div><h1>{STAGES.find(([id]) => id === stage)?.[1]}</h1><p>{STAGES.find(([id]) => id === stage)?.[2]}</p></div>
          <div className="studio-next"><span>Next</span><a href={`/content/${NEXT[stage]?.[0] || 'remake'}`}>{NEXT[stage]?.[1] || 'Continue'} <b>→</b></a></div>
        </header>
        <div className="studio-workspace"><Workspace stage={stage} /></div>
      </main>
    </EnterpriseShell>
  );
}
