import { StrictMode, Suspense, lazy, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './CornerstoneBrand.css'
import './CreativeStudioTheme.css'
import './CornerstoneInstrument.css'
import './activeInstrumentOverrides.css'
import './trackBNavigationFix.css'
import './uxPolish.css'
import './enterpriseInteractionFix.css'
import './enterpriseMobile.css'
import './CornerstoneDesignReset.css'
import CommandHome from './CommandHome.jsx'
import AuthGate from './AuthGate.jsx'

const ContentWorkspaceShell = lazy(() => import('./ContentWorkspaceShell.jsx'))
const RevenueWorkspaceShell = lazy(() => import('./RevenueWorkspaceShell.jsx'))
const SystemWorkspace = lazy(() => import('./SystemWorkspace.jsx'))
const UserLibraryWorkspace = lazy(() => import('./UserLibraryWorkspace.jsx'))

const path = window.location.pathname.replace(/\/+$/, '') || '/'
document.documentElement.dataset.route = path
document.body.dataset.route = path

const LEGACY_REDIRECTS = {
  '/creative': '/content/remake',
  '/main-app': '/content/remake',
}
if (LEGACY_REDIRECTS[path]) window.location.replace(LEGACY_REDIRECTS[path])

function Loading(){return <div style={{minHeight:'100svh',display:'grid',placeItems:'center',color:'var(--text-muted)',background:'var(--bg)',fontSize:12}}>Opening Cornerstone…</div>}
function Crash({error}){return <div style={{minHeight:'100svh',display:'grid',placeItems:'center',padding:24,background:'var(--bg)',color:'var(--text)',fontFamily:'var(--sans)'}}><div style={{maxWidth:640,width:'100%',padding:28,border:'1px solid var(--border)',borderRadius:18,background:'var(--surface)'}}><div style={{fontSize:10,fontWeight:900,letterSpacing:'.16em',textTransform:'uppercase',color:'var(--accent)'}}>Cornerstone</div><h1 style={{margin:'10px 0 8px',fontSize:32,fontFamily:'var(--display)'}}>Something needs attention.</h1><p style={{margin:0,color:'var(--text-muted)',lineHeight:1.6}}>Reload Cornerstone to recover this workspace.</p><details style={{marginTop:16}}><summary style={{cursor:'pointer',color:'var(--text-muted)',fontSize:11}}>Technical detail</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',color:'var(--text-subtle)',fontSize:10,lineHeight:1.5}}>{String(error?.stack||error?.message||error||'Unknown error')}</pre></details><button onClick={()=>window.location.reload()} style={{marginTop:16,border:0,borderRadius:10,padding:'11px 15px',fontWeight:900,background:'var(--accent)',color:'#fff',cursor:'pointer'}}>Reload</button></div></div>}
class ErrorBoundary extends Component { state={error:null}; static getDerivedStateFromError(error){return {error}} componentDidCatch(error,info){console.error('[Cornerstone UI]',error,info)} render(){return this.state.error?<Crash error={this.state.error}/>:this.props.children} }

function Route(){
  if(path==='/'||path==='/command')return <CommandHome/>
  if(path==='/content'||path.startsWith('/content/'))return <ContentWorkspaceShell/>
  if(path==='/revenue'||path==='/outreach')return <RevenueWorkspaceShell/>
  if(path==='/system'||path==='/ceo')return <SystemWorkspace/>
  if(path==='/generations')return <UserLibraryWorkspace/>
  return <CommandHome/>
}

createRoot(document.getElementById('root')).render(<StrictMode><ErrorBoundary><AuthGate><Suspense fallback={<Loading/>}><Route/></Suspense></AuthGate></ErrorBoundary></StrictMode>)
