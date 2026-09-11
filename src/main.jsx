import { StrictMode, Suspense, lazy, Component } from 'react'
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
const GenerationsHumanViewer = lazy(() => import('./GenerationsHumanViewer.jsx'))

const path = window.location.pathname.replace(/\/+$/, '') || '/'
document.documentElement.dataset.route = path
document.body.dataset.route = path

const LEGACY_REDIRECTS = {
  '/creative': '/content/remake',
  '/main-app': '/content/remake',
}
if (LEGACY_REDIRECTS[path]) window.location.replace(LEGACY_REDIRECTS[path])

function Loading(){return <div style={{minHeight:'100svh',display:'grid',placeItems:'center',color:'var(--text-muted)',background:'var(--bg)',fontSize:12}}>Opening Cornerstone…</div>}
function Crash({error}){return <div style={{minHeight:'100svh',display:'grid',placeItems:'center',padding:24,background:'#0c0e12',color:'#f0f1f4',fontFamily:'system-ui'}}><div style={{maxWidth:640,width:'100%',padding:24,border:'1px solid #2b303a',borderRadius:16,background:'#11151c'}}><div style={{fontSize:10,fontWeight:900,letterSpacing:'.14em',textTransform:'uppercase',color:'#d4af37'}}>Cornerstone · recovery</div><h1 style={{margin:'10px 0 8px',fontSize:28}}>The workspace hit an error.</h1><p style={{margin:0,color:'#9da6b5',lineHeight:1.6}}>Reload the page to recover. Cornerstone is showing the failure instead of a blank screen.</p><details style={{marginTop:16}}><summary style={{cursor:'pointer',color:'#c4cad3',fontSize:12}}>Technical detail</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',color:'#8f98a8',fontSize:10,lineHeight:1.5}}>{String(error?.stack||error?.message||error||'Unknown error')}</pre></details><button onClick={()=>window.location.reload()} style={{marginTop:16,border:0,borderRadius:9,padding:'10px 14px',fontWeight:900,background:'#e6e1d5',color:'#171717',cursor:'pointer'}}>Reload Cornerstone</button></div></div>}
class ErrorBoundary extends Component { state={error:null}; static getDerivedStateFromError(error){return {error}} componentDidCatch(error,info){console.error('[Cornerstone UI]',error,info)} render(){return this.state.error?<Crash error={this.state.error}/>:this.props.children} }

function Route(){
  if(path==='/'||path==='/command')return <CommandHome/>
  if(path==='/content'||path.startsWith('/content/'))return <ContentWorkspaceShell/>
  if(path==='/revenue'||path==='/outreach')return <RevenueWorkspaceShell/>
  if(path==='/system'||path==='/ceo')return <SystemWorkspace/>
  if(path==='/generations')return <GenerationsHumanViewer/>
  return <CommandHome/>
}

createRoot(document.getElementById('root')).render(<StrictMode><ErrorBoundary><AuthGate><Suspense fallback={<Loading/>}><Route/></Suspense></AuthGate></ErrorBoundary></StrictMode>)
