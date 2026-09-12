import { StrictMode, Suspense, lazy, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './CornerstoneSignature.css'
import './CornerstoneFinal.css'
import CommandHome from './CommandHome.jsx'
import AuthGate from './AuthGate.jsx'

const ContentWorkspaceShell = lazy(() => import('./ContentWorkspaceShell2.jsx'))
const RevenueWorkspaceShell = lazy(() => import('./RevenueWorkspaceShell.jsx'))
const SystemWorkspace = lazy(() => import('./SystemWorkspace.jsx'))
const UserLibraryWorkspace = lazy(() => import('./UserLibraryWorkspace.jsx'))

const path = window.location.pathname.replace(/\/+$/, '') || '/'
document.documentElement.dataset.route = path
document.body.dataset.route = path
const LEGACY_REDIRECTS = {'/creative':'/content/remake','/main-app':'/content/remake'}
if (LEGACY_REDIRECTS[path]) window.location.replace(LEGACY_REDIRECTS[path])

function Loading(){return <div className="cs-loading">Opening Cornerstone…</div>}
function Crash({error}){return <div className="cs-crash"><div className="cs-crash-card"><div className="cs-crash-k">Cornerstone</div><h1>Something needs attention.</h1><p>Reload Cornerstone to recover this workspace.</p><details><summary>Technical detail</summary><pre>{String(error?.stack||error?.message||error||'Unknown error')}</pre></details><button onClick={()=>window.location.reload()}>Reload</button></div></div>}
class ErrorBoundary extends Component { state={error:null}; static getDerivedStateFromError(error){return {error}} componentDidCatch(error,info){console.error('[Cornerstone UI]',error,info)} render(){return this.state.error?<Crash error={this.state.error}/>:this.props.children} }
function Route(){if(path==='/'||path==='/command')return <CommandHome/>;if(path==='/content'||path.startsWith('/content/'))return <ContentWorkspaceShell/>;if(path==='/revenue'||path==='/outreach')return <RevenueWorkspaceShell/>;if(path==='/system'||path==='/ceo')return <SystemWorkspace/>;if(path==='/generations')return <UserLibraryWorkspace/>;return <CommandHome/>}
createRoot(document.getElementById('root')).render(<StrictMode><ErrorBoundary><AuthGate><Suspense fallback={<Loading/>}><Route/></Suspense></AuthGate></ErrorBoundary></StrictMode>)
