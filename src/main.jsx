// Compiler helper polyfills for optional chaining and nullish coalescing
globalThis._nullishCoalesce = globalThis._nullishCoalesce || function (lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } };
globalThis._optionalChain = globalThis._optionalChain || function (ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; };

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
