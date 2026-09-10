import React, { useMemo } from 'react';
import EnterpriseShell from './EnterpriseShell.jsx';
import TrackBApplication from './TrackBApplication.jsx';

const STAGES = [
  ['remake', 'Remake'],
  ['creators', 'Creators'],
  ['profiles', 'Profiles'],
  ['production', 'Production'],
  ['publish', 'Publish'],
  ['measurement', 'Measure'],
];

function stageFor(pathname) {
  const match = pathname.match(/^\/content(?:\/([^/]+))?/);
  const value = match?.[1] || 'remake';
  return STAGES.some(([id]) => id === value) ? value : 'remake';
}

export default function ContentWorkspaceShell() {
  const stage = useMemo(() => stageFor(window.location.pathname), []);
  try { sessionStorage.setItem('caig_track_b_view', stage); } catch {}

  return (
    <EnterpriseShell active="content" eyebrow="Content Intelligence & Production">
      <nav className="es-subnav" aria-label="Content stages">
        {STAGES.map(([id, label]) => (
          <a key={id} href={`/content/${id}`} className={stage === id ? 'active' : ''}>{label}</a>
        ))}
      </nav>
      <div className="enterprise-content-stage">
        <style>{`\n          .enterprise-content-stage .tb-sidebar{display:none!important}\n          .enterprise-content-stage .tb-app{min-height:auto}\n          .enterprise-content-stage .tb-main{width:100%;max-width:none!important;padding:0!important}\n          .enterprise-content-stage .tb-content{max-width:none!important}\n        `}</style>
        <TrackBApplication key={stage} />
      </div>
    </EnterpriseShell>
  );
}
