import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './CreativeStudioTheme.css'
import CEOHome from './CEOHome.jsx'
import AuthGate from './AuthGate.jsx'
import MainAppShell from './MainAppShell.jsx'
import CreativeEngineHub from './CreativeEngineHub.jsx'
import PersistentGenerations from './PersistentGenerations.jsx'
import TrackAOutreachWorkspace from './TrackAOutreachWorkspace.jsx'
import OperatorWorkbench from './OperatorWorkbench.jsx'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const hour = new Date().getHours()
const component = path === '/creative'
  ? <div className="creative-studio-surface"><CreativeEngineHub /><PersistentGenerations /></div>
  : path === '/outreach'
    ? <TrackAOutreachWorkspace />
    : path === '/main-app'
      ? <MainAppShell />
      : path === '/workbench'
        ? <OperatorWorkbench />
        : path === '/ceo'
          ? <CEOHome />
          : <OperatorWorkbench defaultMode={hour >= 8 && hour < 13 ? 'revenue' : hour >= 13 && hour < 19 ? 'production' : 'revenue'} />

createRoot(document.getElementById('root')).render(
  <StrictMode><AuthGate>{component}</AuthGate></StrictMode>,
)
