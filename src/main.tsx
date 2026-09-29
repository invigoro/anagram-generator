import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const root = createRoot(document.getElementById('root')!);
const hash = window.location.hash;

// A player link opens the players' page, which loads nothing of the game master's: no
// scrambler, no word lists, no answer. Anything else opens the page itself, with a link's
// settings read before it first draws, so it never shows an empty page first.
if (hash.startsWith('#p=')) {
  const [{ default: Player }, { readPlayerLink }] = await Promise.all([import('./ui/Player'), import('./ui/playerLink')]);
  document.title = 'A puzzle';
  root.render(
    <StrictMode>
      <Player puzzle={await readPlayerLink(hash)} />
    </StrictMode>,
  );
} else {
  const [{ default: App }, { decodeState }] = await Promise.all([import('./ui/App'), import('./ui/urlState')]);
  root.render(
    <StrictMode>
      <App initial={await decodeState(hash)} />
    </StrictMode>,
  );
}
