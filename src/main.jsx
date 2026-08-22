import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './CreativeStudioTheme.css'
import AppLanding from './AppLanding.jsx'
import MainAppShell from './MainAppShell.jsx'
import CreativeEngineHub from './CreativeEngineHub.jsx'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const component = path === '/creative'
  ? <div className="creative-studio-surface"><CreativeEngineHub /></div>
  : path === '/main-app'
    ? <MainAppShell />
    : <AppLanding />

createRoot(document.getElementById('root')).render(
  <StrictMode>{component}</StrictMode>,
)
