import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LoyaltyTmaView } from './LoyaltyTmaView';
import { AuthProvider } from './stores/auth';
import './i18n';
import './styles.css';

console.error('[Main] Starting React App');

const isTma = window.location.pathname.startsWith('/tma');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>{isTma ? <LoyaltyTmaView /> : <App />}</AuthProvider>
  </React.StrictMode>
);
