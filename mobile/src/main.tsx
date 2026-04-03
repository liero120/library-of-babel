import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'

const errBox = document.createElement('pre');
errBox.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:#0a0a0f;color:#f87171;padding:20px;font-size:13px;white-space:pre-wrap;word-break:break-word;overflow:auto;font-family:monospace';
document.body.appendChild(errBox);

window.onerror = (_msg, _src, _line, _col, err) => {
  errBox.style.display = 'block';
  errBox.textContent = `JS Error:\n${err?.stack || err?.message || _msg}`;
};
window.onunhandledrejection = (e) => {
  errBox.style.display = 'block';
  const r = e.reason;
  errBox.textContent = `Unhandled Promise:\n${r?.stack || r?.message || String(r)}`;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
