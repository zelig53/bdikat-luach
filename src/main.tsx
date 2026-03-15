import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// רישום SW של PWA — בלי immediate כדי למנוע reload אוטומטי
registerSW({ immediate: false });

// רישום SW מותאם לניהול התראות בנפרד
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-custom.js', { scope: '/' })
    .catch(err => console.warn('Custom SW registration failed:', err));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
