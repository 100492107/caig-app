import React from 'react';
import EnterpriseShell from './EnterpriseShell.jsx';
import TrackAOutreachWorkspace from './TrackAOutreachWorkspace.jsx';

export default function RevenueWorkspaceShell() {
  return (
    <EnterpriseShell active="revenue" eyebrow="Track A · Revenue Recovery">
      <TrackAOutreachWorkspace />
    </EnterpriseShell>
  );
}
