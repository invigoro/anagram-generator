import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { readText } from '../engine/letters';
import { mulberry32, randomSeed } from '../engine/rng';
import { scramble } from '../engine/scramble';
import { Controls } from './Controls';
import { Output } from './Output';
import { DEFAULT_SETTINGS, rulesOf, type Settings } from './settings';
import { decodeState, encodeState, linkFor, type PageState } from './urlState';

interface AppProps {
  /** The page as a link left it. */
  initial?: Partial<PageState> | null;
}

export default function App({ initial }: AppProps) {
  const [text, setText] = useState(initial?.text ?? '');
  const [settings, setSettings] = useState<Settings>(initial?.settings ?? DEFAULT_SETTINGS);
  const [seed, setSeed] = useState(() => initial?.seed ?? randomSeed());

  // The URL always describes the page, so it can be bookmarked or shared.
  useEffect(() => {
    let current = true;
    encodeState({ text, seed, settings }).then((hash) => {
      if (!current || window.location.hash === hash) return;
      window.history.replaceState(null, '', hash || window.location.pathname + window.location.search);
    });
    return () => {
      current = false;
    };
  }, [text, seed, settings]);

  // A link pasted into the address bar of an open page changes only the hash.
  useEffect(() => {
    const apply = async () => {
      const state = await decodeState(window.location.hash);
      if (!state) return;
      setText(state.text ?? '');
      setSettings(state.settings ?? DEFAULT_SETTINGS);
      if (state.seed !== undefined) setSeed(state.seed);
    };
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  // A long text under strict rules takes a moment to scramble, so typing goes first.
  const shownText = useDeferredValue(text);
  const shownSettings = useDeferredValue(settings);
  const { punctuation, digits, accents, count, order } = shownSettings;
  const read = useMemo(() => readText(shownText, { punctuation, digits, accents }), [shownText, punctuation, digits, accents]);
  const rules = useMemo(() => rulesOf(shownSettings), [shownSettings]);
  const result = useMemo(() => scramble(read, rules, { count, order }, mulberry32(seed)), [read, rules, count, order, seed]);

  return (
    <div className="app">
      <aside className="panel">
        <header className="brand">
          <h1>Sator</h1>
          <p>Scrambled words for tabletop puzzles</p>
        </header>

        <Controls
          text={text}
          onText={setText}
          settings={settings}
          onSettings={(changes) => setSettings((current) => ({ ...current, ...changes }))}
          letterCount={read.letters.length}
          seed={seed}
          onReroll={() => setSeed(randomSeed())}
        />

        <About className="about beside-text" />
      </aside>

      <main className="stage">
        <Output
          typed={shownText.trim() !== ''}
          text={read}
          scramble={result}
          settings={shownSettings}
          shareLink={() => linkFor({ text, seed, settings })}
        />
      </main>

      <About className="about below-text" />
    </div>
  );
}

/** Links to Stele, Jabberwock and the source. Beside the list on wide screens, after it on narrow ones. */
function About({ className }: { className: string }) {
  return (
    <footer className={className}>
      <p>
        Carve a scramble over a door, or write it in an old letter, with{' '}
        <a href="https://stele.invigoro.me/" target="_blank" rel="noopener">
          Stele
        </a>
        .
      </p>
      <p>
        Write text in made-up languages with{' '}
        <a href="https://jabberwock.invigoro.me/" target="_blank" rel="noopener">
          Jabberwock
        </a>
        .
      </p>
      <p>
        <a href="https://github.com/invigoro/anagram-generator" target="_blank" rel="noopener">
          Source on GitHub
        </a>
      </p>
    </footer>
  );
}
