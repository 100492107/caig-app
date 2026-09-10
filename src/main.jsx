import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './CreativeStudioTheme.css'
import './CornerstoneInstrument.css'
import './activeInstrumentOverrides.css'
import './trackBNavigationFix.css'
import './uxPolish.css'
import './enterpriseInteractionFix.css'
import './enterpriseMobile.css'
import CommandHome from './CommandHome.jsx'
import AuthGate from './AuthGate.jsx'

const ContentWorkspaceShell = lazy(() => import('./ContentWorkspaceShell.jsx'))
const RevenueWorkspaceShell = lazy(() => import('./RevenueWorkspaceShell.jsx'))
const SystemWorkspace = lazy(() => import('./SystemWorkspace.jsx'))

const path = window.location.pathname.replace(/\/+$/, '') || '/'
document.documentElement.dataset.route = path
document.body.dataset.route = path

function Loading(){return <div style={{minHeight:'100svh',display:'grid',placeItems:'center',color:'var(--text-muted)',background:'var(--bg)',fontSize:12}} role="status" aria-live="polite">Opening Cornerstone…</div>}
function Route(){
  if(path==='/'||path==='/command')return <CommandHome/>
  if(path==='/content'||path.startsWith('/content/'))return <ContentWorkspaceShell/>
  if(path==='/revenue'||path==='/outreach')return <RevenueWorkspaceShell/>
  if(path==='/system'||path==='/ceo')return <SystemWorkspace/>
  return <CommandHome/>
}

createRoot(document.getElementById('root')).render(<StrictMode><AuthGate><Suspense fallback={<Loading/>}><Route/></Suspense></AuthGate></StrictMode>)
