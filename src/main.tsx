import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// רישום SW של PWA
registerSW({ immediate: true });

// רישום SW מותאם לניהול התראות
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw-custom.js', { scope: '/' })
      .then(reg => console.log('Custom SW registered:', reg.scope))
      .catch(err => console.warn('Custom SW registration failed:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
