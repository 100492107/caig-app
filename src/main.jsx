import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './CreativeStudioTheme.css'
import './CornerstoneInstrument.css'
import './activeInstrumentOverrides.css'
import './trackBNavigationFix.css'
import './uxPolish.css'
import './enterpriseInteractionFix.css'
import './enterpriseMobile.css'
import EnterpriseCommandHome from './CommandHome.jsx'
import AuthGate from './AuthGate.jsx'
import ContentWorkspaceShell from './ContentWorkspaceShell.jsx'
import RevenueWorkspaceShell from './RevenueWorkspaceShell.jsx'
import SystemWorkspace from './SystemWorkspace.jsx'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
document.documentElement.dataset.route = path
document.body.dataset.route = path

function Route() {
  if (path === '/' || path === '/command') return <EnterpriseCommandHome />
  if (path === '/content' || path.startsWith('/content/')) return <ContentWorkspaceShell />
  if (path === '/revenue' || path === '/outreach') return <RevenueWorkspaceShell />
  if (path === '/system' || path === '/ceo') return <SystemWorkspace />
  return <EnterpriseCommandHome />
}

createRoot(document.getElementById('root')).render(<StrictMode><AuthGate><Route /></AuthGate></StrictMode>)
