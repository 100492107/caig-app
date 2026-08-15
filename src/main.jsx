import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import CreativeEngineWorkspace from './CreativeEngineWorkspace.jsx'

const isCreativeRoute = window.location.pathname === '/creative' || window.location.pathname === '/creative/'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isCreativeRoute ? <CreativeEngineWorkspace /> : <App />}
  </StrictMode>,
)
