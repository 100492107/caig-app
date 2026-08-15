import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppLanding from './AppLanding.jsx'
import MainAppShell from './MainAppShell.jsx'
import CreativeEngineWorkspace from './CreativeEngineWorkspaceV3.jsx'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const component = path === '/creative'
  ? <CreativeEngineWorkspace />
  : path === '/main-app'
    ? <MainAppShell />
    : <AppLanding />

createRoot(document.getElementById('root')).render(
  <StrictMode>{component}</StrictMode>,
)
