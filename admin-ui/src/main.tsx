import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LoyaltyTmaView } from './LoyaltyTmaView'
import './styles.css'

console.error('[Main] Starting React App')

const isTma = window.location.pathname.startsWith('/tma')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isTma ? <LoyaltyTmaView /> : <App />}
  </React.StrictMode>
)
