import React from 'react';
import EnterpriseShell from './EnterpriseShell.jsx';
import TrackAOutreachWorkspace from './TrackAOutreachWorkspace.jsx';

export default function RevenueWorkspaceShell() {
  return (
    <EnterpriseShell active="revenue" eyebrow="Revenue recovery">
      <main className="rev-shell">
        <style>{`
          .rev-shell{min-width:0}
          .rev-brief{display:grid;grid-template-columns:1.15fr .85fr;gap:10px;margin-bottom:16px}
          .rev-card{border:1px solid var(--border);background:var(--surface);border-radius:14px;padding:14px 16px}
          .rev-card b{display:block;font-size:12px;font-weight:850}
          .rev-card span{display:block;margin-top:6px;color:var(--text-muted);font-size:11px;line-height:1.45}
          .rev-card a{display:inline-flex;margin-top:10px;color:var(--text);font-size:10px;font-weight:850;text-decoration:none}
          @media(max-width:800px){.rev-brief{grid-template-columns:1fr}}
        `}</style>
        <div className="rev-brief">
          <div className="rev-card">
            <b>Revenue is the cash engine. Content is the compounding engine.</b>
            <span>This surface exists to recover missed revenue and open conversations — not to look busy. Every outreach should earn its place against the next best action on Command.</span>
          </div>
          <div className="rev-card">
            <b>If pipeline is quiet</b>
            <span>Do not invent activity. Return to Command, clear blockers, or ship content that compounds while outreach runs.</span>
            <a href="/">Back to Command →</a>
          </div>
        </div>
        <TrackAOutreachWorkspace />
      </main>
    </EnterpriseShell>
  );
}
