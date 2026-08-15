import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppLanding from './AppLanding.jsx'
import CreativeEngineWorkspace from './CreativeEngineWorkspaceV2.jsx'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const component = path === '/creative'
  ? <CreativeEngineWorkspace />
  : path === '/main-app'
    ? <App />
    : <AppLanding />

createRoot(document.getElementById('root')).render(
  <StrictMode>{component}</StrictMode>,
)
