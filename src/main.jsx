import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Register service worker for offline loading & PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[SW] Service worker registration error:', err);
    });
  });
}

createRoot(document.getElementById('root')).render(<App />);
