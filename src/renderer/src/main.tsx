import './assets/main.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app'

const ua = navigator.userAgent
if (ua.indexOf('Mac') !== -1) {
  document.documentElement.dataset.platform = 'darwin'
} else if (ua.indexOf('Win') !== -1) {
  document.documentElement.dataset.platform = 'win32'
} else {
  document.documentElement.dataset.platform = 'linux'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
