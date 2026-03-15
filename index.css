import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// רישום SW מותאם לניהול התראות
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-custom.js', { scope: '/' })
    .catch(err => console.warn('Custom SW registration failed:', err));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
