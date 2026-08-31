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

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const component = path === '/creative'
  ? <div className="creative-studio-surface"><CreativeEngineHub /><PersistentGenerations /></div>
  : path === '/outreach'
    ? <TrackAOutreachWorkspace />
    : path === '/main-app'
      ? <MainAppShell />
      : <CEOHome />

createRoot(document.getElementById('root')).render(
  <StrictMode><AuthGate>{component}</AuthGate></StrictMode>,
)
