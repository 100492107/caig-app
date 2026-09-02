import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './CreativeStudioTheme.css'
import './CornerstoneInstrument.css'
import './activeInstrumentOverrides.css'
import './trackBNavigationFix.css'
import './uxPolish.css'
import './enterpriseInteractionFix.css'
import EnterpriseHome from './EnterpriseHome.jsx'
import CEOHome from './CEOHome.jsx'
import AuthGate from './AuthGate.jsx'
import MainAppShell from './MainAppShell.jsx'
import TrackBApplication from './TrackBApplication.jsx'
import PersistentGenerations from './PersistentGenerations.jsx'
import TrackAOutreachWorkspace from './TrackAOutreachWorkspace.jsx'
import OperatorWorkbench from './OperatorWorkbench.jsx'
import TrackATerritoryBlock from './TrackATerritoryBlock.jsx'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const hour = new Date().getHours()

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
            : <EnterpriseHome defaultMode={hour >= 8 && hour < 13 ? 'revenue' : hour >= 13 && hour < 19 ? 'production' : 'revenue'} />

createRoot(document.getElementById('root')).render(
  <StrictMode><AuthGate>{component}</AuthGate></StrictMode>,
)
