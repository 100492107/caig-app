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
const ContentWorkspaceShell = lazy(() => import('./ContentWorkspaceShell2.jsx'))
const RevenueWorkspaceShell = lazy(() => import('./RevenueWorkspaceShell.jsx'))
const SystemWorkspace = lazy(() => import('./SystemWorkspace.jsx'))
const UserLibraryWorkspace = lazy(() => import('./UserLibraryWorkspace.jsx'))
const path = window.location.pathname.replace(/\/+$/, '') || '/'
document.documentElement.dataset.route = path
document.body.dataset.route = path
const LEGACY_REDIRECTS = {'/creative':'/content/remake','/main-app':'/content/remake'}
if (LEGACY_REDIRECTS[path]) window.location.replace(LEGACY_REDIRECTS[path])
function Loading(){return <div style={{minHeight:'100svh',display:'grid',placeItems:'center',color:'var(--muted)',background:'var(--bg)',fontSize:12}}>Opening Cornerstone…</div>}
function Crash({error}){return <div style={{minHeight:'100svh',display:'grid',placeItems:'center',padding:24,background:'var(--bg)',color:'var(--ink)',fontFamily:'var(--sans)'}}><div style={{maxWidth:640,width:'100%',padding:28,border:'1px solid var(--line)',borderRadius:14,background:'var(--surface)'}}><div style={{fontSize:10,fontWeight:900,letterSpacing:'.16em',textTransform:'uppercase',color:'var(--lime)'}}>Cornerstone</div><h1 style={{margin:'10px 0 8px',fontSize:32}}>Something needs attention.</h1><p style={{margin:0,color:'var(--muted)',lineHeight:1.6}}>Reload Cornerstone to recover this workspace.</p><details style={{marginTop:16}}><summary style={{cursor:'pointer',color:'var(--muted)',fontSize:11}}>Technical detail</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',color:'var(--quiet)',fontSize:10}}>{String(error?.stack||error?.message||error||'Unknown error')}</pre></details><button onClick={()=>window.location.reload()} style={{marginTop:16,border:0,borderRadius:8,padding:'11px 15px',fontWeight:900,background:'var(--lime)',color:'#08110d',cursor:'pointer'}}>Reload</button></div></div>}
class ErrorBoundary extends Component { state={error:null}; static getDerivedStateFromError(error){return {error}} componentDidCatch(error,info){console.error('[Cornerstone UI]',error,info)} render(){return this.state.error?<Crash error={this.state.error}/>:this.props.children} }
function Route(){if(path==='/'||path==='/command')return <CommandHome/>;if(path==='/content'||path.startsWith('/content/'))return <ContentWorkspaceShell/>;if(path==='/revenue'||path==='/outreach')return <RevenueWorkspaceShell/>;if(path==='/system'||path==='/ceo')return <SystemWorkspace/>;if(path==='/generations')return <UserLibraryWorkspace/>;return <CommandHome/>}
createRoot(document.getElementById('root')).render(<StrictMode><ErrorBoundary><AuthGate><Suspense fallback={<Loading/>}><Route/></Suspense></AuthGate></ErrorBoundary></StrictMode>)
