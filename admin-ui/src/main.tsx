import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import { AuthProvider } from './stores/auth';
import './styles.css';

console.log('[Main] Starting React App');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
