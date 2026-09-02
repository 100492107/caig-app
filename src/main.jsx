import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './CreativeStudioTheme.css'
import './CornerstoneInstrument.css'
import './activeInstrumentOverrides.css'
import './trackBNavigationFix.css'
import './uxPolish.css'
import './enterpriseInteractionFix.css'
import EnterpriseCommandHome from './EnterpriseCommandHome.jsx'
import CEOHome from './CEOHome.jsx'
import AuthGate from './AuthGate.jsx'
import MainAppShell from './MainAppShell.jsx'
import TrackBApplication from './TrackBApplication.jsx'
import PersistentGenerations from './PersistentGenerations.jsx'
import TrackAOutreachWorkspace from './TrackAOutreachWorkspace.jsx'
import OperatorWorkbench from './OperatorWorkbench.jsx'
import TrackATerritoryBlock from './TrackATerritoryBlock.jsx'

const path = window.location.pathname.replace(/\/+$/, '') || '/'

 document.documentElement.dataset.route = path
document.body.dataset.route = path

const component = path === '/creative'
  ? <div className="creative-studio-surface"><TrackBApplication /><PersistentGenerations /></div>
  : path === '/outreach'
    ? <TrackAOutreachWorkspace />
    : path === '/main-app'
      ? <MainAppShell />
      : path === '/workbench'
        ? <OperatorWorkbench />
        : path === '/territory'
          ? <TrackATerritoryBlock />
          : path === '/ceo'
            ? <CEOHome />
            : <EnterpriseCommandHome />

createRoot(document.getElementById('root')).render(
  <StrictMode><AuthGate>{component}</AuthGate></StrictMode>,
)
