import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker for offline-first resilience
if ('serviceWorker' in navigator && (import.meta.env.PROD || process.env.NODE_ENV === 'production')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('[PelatihKu] PWA Service Worker registered:', reg.scope))
      .catch((err) => console.warn('[PelatihKu] SW registration failed:', err));
  });
}

createRoot(document.getElementById('root')!).render(<App />);
