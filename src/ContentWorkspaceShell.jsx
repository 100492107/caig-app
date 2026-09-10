import React, { useMemo } from 'react';
import EnterpriseShell from './EnterpriseShell.jsx';
import ContentEngineWorkspace from './ContentEngineWorkspace.jsx';
import ProfileChannelsWorkspace from './ProfileChannelsWorkspace.jsx';
import CanonicalProductionWorkspace from './CanonicalProductionWorkspace.jsx';
import CanonicalPublishWorkspace from './CanonicalPublishWorkspace.jsx';
import CanonicalMeasureWorkspace from './CanonicalMeasureWorkspace.jsx';
import { CreatorsStaged } from './TrackBStagedSurfaces.jsx';

const STAGES = [
  ['remake', 'Remake', 'Evidence → original package'],
  ['creators', 'Creators', 'Owned faces & voices'],
  ['profiles', 'Profiles', 'Channels & publishing identity'],
  ['production', 'Production', 'Turn projects into media'],
  ['publish', 'Publish', 'Ship canonical publications'],
  ['measurement', 'Measure', 'Turn outcomes into intelligence'],
];

function stageFor(pathname){const match=pathname.match(/^\/content(?:\/([^/]+))?/);const value=match?.[1]||'remake';return STAGES.some(([id])=>id===value)?value:'remake'}
function StageHeader({stage}){const item=STAGES.find(([id])=>id===stage)||STAGES[0];return <div className='content-stage-header'><div><div className='content-stage-kicker'>Content · {item[1]}</div><h1>{item[1]}</h1><p>{item[2]}</p></div><div className='content-stage-index'>0{STAGES.findIndex(([id])=>id===stage)+1} / 06</div></div>}
function Workspace({stage}){switch(stage){case'remake':return <ContentEngineWorkspace onGo={()=>{}}/>;case'creators':return <CreatorsStaged stage={0} onAdvance={()=>{}}/>;case'profiles':return <ProfileChannelsWorkspace/>;case'production':return <CanonicalProductionWorkspace/>;case'publish':return <CanonicalPublishWorkspace/>;case'measurement':return <CanonicalMeasureWorkspace/>;default:return null}}
export default function ContentWorkspaceShell(){const stage=useMemo(()=>stageFor(window.location.pathname),[]);return <EnterpriseShell active='content' eyebrow='Content Intelligence & Production'><main className='content-shell'><style>{`.content-shell{min-width:0}.content-stage-nav{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;margin-bottom:22px}.content-stage-nav a{display:flex;flex-direction:column;gap:5px;min-height:58px;padding:10px 12px;border:1px solid var(--border);border-radius:11px;color:var(--text-muted);background:var(--surface);text-decoration:none}.content-stage-nav a:hover{background:var(--surface-2);color:var(--text)}.content-stage-nav a.active{border-color:rgba(212,181,106,.45);background:rgba(212,181,106,.08);color:var(--text)}.content-stage-nav b{font-size:8px;letter-spacing:.15em;color:var(--text-subtle)}.content-stage-nav span{font-size:11px;font-weight:850}.content-stage-nav small{font-size:8px;color:var(--text-subtle);line-height:1.25}.content-stage-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--border)}.content-stage-kicker{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--text-subtle);font-weight:850}.content-stage-header h1{margin:9px 0 0;font-size:clamp(34px,5vw,58px);line-height:.94;letter-spacing:-.07em}.content-stage-header p{margin:10px 0 0;color:var(--text-muted);font-size:13px;line-height:1.45}.content-stage-index{font-size:9px;letter-spacing:.14em;color:var(--text-subtle);white-space:nowrap;padding-bottom:5px}.content-workspace{min-width:0}.@media(max-width:980px){.content-stage-nav{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:560px){.content-stage-nav{grid-template-columns:1fr 1fr}.content-stage-header{align-items:flex-start;flex-direction:column;gap:8px}}`}</style><nav className='content-stage-nav' aria-label='Content stages'>{STAGES.map(([id,label,description],index)=><a key={id} href={`/content/${id}`} className={stage===id?'active':''} aria-current={stage===id?'page':undefined}><b>0{index+1}</b><span>{label}</span><small>{description}</small></a>)}</nav><StageHeader stage={stage}/><div className='content-workspace'><Workspace stage={stage}/></div></main></EnterpriseShell>}
