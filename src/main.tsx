import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App';
import { decodeState } from './ui/urlState';
import './style.css';

// A link's settings are read before the page first draws, so it never shows an empty page first.
const initial = await decodeState(window.location.hash);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App initial={initial} />
  </StrictMode>,
);
