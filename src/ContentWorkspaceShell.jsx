import React, { useMemo } from 'react';
import EnterpriseShell from './EnterpriseShell.jsx';
import CreateWorkspace from './CreateWorkspace.jsx';
import ProfileChannelsWorkspace from './ProfileChannelsWorkspace.jsx';
import CanonicalProductionWorkspace from './CanonicalProductionWorkspace.jsx';
import CanonicalPublishWorkspace from './CanonicalPublishWorkspace.jsx';
import CanonicalMeasureWorkspace from './CanonicalMeasureWorkspace.jsx';
import { CreatorsStaged } from './TrackBStagedSurfaces.jsx';

const STAGES=[
 ['remake','Create','Start with an idea, reference or learning signal.'],
 ['creators','Voices','Choose the point of view behind the piece.'],
 ['profiles','Channels','Choose where the piece should live.'],
 ['production','Make','Turn the idea into finished creative.'],
 ['publish','Publish','Choose when the finished piece enters the world.'],
 ['measurement','Learn','Capture the result and improve the next one.']
];

function stageFor(pathname){const id=pathname.match(/^\/content(?:\/([^/]+))?/)?.[1]||'remake';return STAGES.some(x=>x[0]===id)?id:'remake';}
function Workspace({stage}){
 switch(stage){
  case 'remake': return <CreateWorkspace/>;
  case 'creators': return <CreatorsStaged stage={0} onAdvance={()=>{window.location.href='/content/profiles'}}/>;
  case 'profiles': return <ProfileChannelsWorkspace/>;
  case 'production': return <CanonicalProductionWorkspace/>;
  case 'publish': return <CanonicalPublishWorkspace/>;
  case 'measurement': return <CanonicalMeasureWorkspace/>;
  default: return null;
 }
}

export default function ContentWorkspaceShell(){
 const stage=useMemo(()=>stageFor(window.location.pathname),[]);
 const item=STAGES.find(x=>x[0]===stage)||STAGES[0];
 const active=stage==='remake'?'content':stage;
 return <EnterpriseShell active={active} eyebrow={item[1]}>
  <div className="product-page">
   <div className="product-breadcrumb"><span>Cornerstone</span><b>/</b><strong>{item[1]}</strong></div>
   <header className="product-header">
    <div>
      <div className="product-kicker">{item[0]==='remake'?'Create something worth making':'Content studio'}</div>
      <h1>{item[1]}</h1>
      <p>{item[2]}</p>
    </div>
    <div className="product-steps" aria-label="Content workflow">
      {STAGES.map(([id,label],i)=><a key={id} href={`/content/${id}`} className={id===stage?'active':''}><span>{String(i+1).padStart(2,'0')}</span><b>{label}</b></a>)}
    </div>
   </header>
   <div className="product-work"><Workspace stage={stage}/></div>
  </div>
 </EnterpriseShell>;
}
