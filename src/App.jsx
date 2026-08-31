import React from 'react';
import CEOHome from './CEOHome.jsx';

// Compatibility export for older imports. The CEO OS is now the canonical
// application shell; dedicated production workspaces remain available by route.
export default function App() {
  return <CEOHome />;
}
