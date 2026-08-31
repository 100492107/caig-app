import React from 'react';
import LegacyMainApp from './AppLegacy.jsx';

// Canonical entry point for the older operational surface.
// The CEO OS and Creative Engine are now the primary shells; this wrapper keeps
// the mature legacy tools available without allowing the legacy monolith to own routing.
export default function App() {
  return <LegacyMainApp />;
}
