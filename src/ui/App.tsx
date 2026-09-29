import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { LETTER_MODEL } from '../data/words/letters';
import { readText } from '../engine/letters';
import { decodeModel } from '../engine/pronounce';
import { NEW_PUZZLE, type Puzzle } from '../engine/puzzle';
import { mulberry32, randomSeed } from '../engine/rng';
import { scramble, type Scramble } from '../engine/scramble';
import { Controls } from './Controls';
import { Output } from './Output';
import { PuzzleCard } from './PuzzleCard';
import { DEFAULT_SETTINGS, rulesOf, type Settings } from './settings';
import { handSearchFor, othersSearchFor, searchFor, usePhrases } from './usePhrases';
import { PLAYER_PREFIX } from './playerLink';
import { decodeState, encodeState, linkFor, type PageState } from './urlState';

interface AppProps {
  /** The page as a link left it. */
  initial?: Partial<PageState> | null;
}

/** Where the game master's own words are kept between visits. */
const YOUR_WORDS = 'sator:your-words';

/** The letter model for pronounceable scrambles. */
const MODEL = decodeModel(LETTER_MODEL);

/** No scrambles, for when the page isn't showing any. */
const NONE: Scramble = { arrangements: [], others: 0, fitting: null, complete: true, shortfalls: [] };

/** Where the choice to hide the answer is kept, for whoever's at this browser. */
const HIDDEN = 'sator:hide-answer';

/** Something kept in the browser, or `fallback`. Storage can be blocked (private windows); these are only conveniences. */
function saved(key: string, fallback = ''): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // As above.
  }
}

const savedWords = () => saved(YOUR_WORDS);

export default function App({ initial }: AppProps) {
  const [text, setText] = useState(initial?.text ?? '');
  // A link's own words come with it; otherwise they're the ones kept from last time.
  const [settings, setSettings] = useState<Settings>(() => {
    const settings = initial?.settings ?? DEFAULT_SETTINGS;
    return settings.yourWords ? settings : { ...settings, yourWords: savedWords() };
  });
  const [seed, setSeed] = useState(() => initial?.seed ?? randomSeed());
  const [puzzle, setPuzzle] = useState<Puzzle | null>(initial?.puzzle ?? null);
  const [hidden, setHidden] = useState(() => saved(HIDDEN) === 'yes');

  useEffect(() => save(YOUR_WORDS, settings.yourWords), [settings.yourWords]);
  useEffect(() => save(HIDDEN, hidden ? 'yes' : 'no'), [hidden]);

  // The URL always describes the page, so it can be bookmarked or shared.
  useEffect(() => {
    let current = true;
    encodeState({ text, seed, settings, puzzle }).then((hash) => {
      if (!current || window.location.hash === hash) return;
      window.history.replaceState(null, '', hash || window.location.pathname + window.location.search);
    });
    return () => {
      current = false;
    };
  }, [text, seed, settings, puzzle]);

  // A link pasted into the address bar of an open page changes only the hash.
  useEffect(() => {
    const apply = async () => {
      if (window.location.hash.startsWith(PLAYER_PREFIX)) return window.location.reload();
      const state = await decodeState(window.location.hash);
      if (!state) return;
      setText(state.text ?? '');
      const linked = state.settings ?? DEFAULT_SETTINGS;
      setSettings(linked.yourWords ? linked : { ...linked, yourWords: savedWords() });
      if (state.seed !== undefined) setSeed(state.seed);
      setPuzzle(state.puzzle ?? null);
    };
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  // A long text under strict rules takes a moment to scramble, so typing goes first.
  const shownText = useDeferredValue(text);
  const shownSettings = useDeferredValue(settings);
  const { punctuation, digits, accents, count, order, sayable, mode } = shownSettings;
  const read = useMemo(() => readText(shownText, { punctuation, digits, accents }), [shownText, punctuation, digits, accents]);
  const { shape, wordCount, pattern, keepFirst, keepLast, moveEvery, partNeighbours } = shownSettings;
  // Made afresh only when the rules' own settings change, so typing elsewhere doesn't scramble again.
  const rules = useMemo(
    () => rulesOf({ ...DEFAULT_SETTINGS, shape, wordCount, pattern, keepFirst, keepLast, moveEvery, partNeighbours }),
    [shape, wordCount, pattern, keepFirst, keepLast, moveEvery, partNeighbours],
  );
  // Scrambles are for their own page, and for real words when the letters have none.
  const result = useMemo(
    () =>
      mode === 'hand'
        ? NONE
        : scramble(read, rules, { count, order, sayable: sayable === 'off' ? undefined : { model: MODEL, level: sayable } }, mulberry32(seed)),
    [mode, read, rules, count, order, sayable, seed],
  );
  const search = useMemo(() => {
    if (shownSettings.mode === 'words') return searchFor(shownText, shownSettings);
    if (shownSettings.mode === 'hand') return handSearchFor(shownText, shownSettings);
    return null;
  }, [shownText, shownSettings]);
  const phrases = usePhrases(search);
  const change = (changes: Partial<Settings>) => setSettings((current) => ({ ...current, ...changes }));

  // The other answers a puzzle's clue could have, found alongside whatever else is searched for.
  const { wordList, yourWords } = shownSettings;
  const othersSearch = useMemo(
    () => (puzzle ? othersSearchFor(shownText, { ...DEFAULT_SETTINGS, wordList, yourWords }) : null),
    [puzzle !== null, shownText, wordList, yourWords],
  );
  const others = usePhrases(othersSearch, 'others');
  const useAsClue = (clue: string) => setPuzzle((current) => ({ ...NEW_PUZZLE, ...current, clue }));

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
          onSettings={change}
          letterCount={read.letters.length}
          hidden={hidden}
          onHidden={setHidden}
          seed={seed}
          onReroll={() => setSeed(randomSeed())}
        />

        <About className="about beside-text" />
      </aside>

      <main className="stage">
        {puzzle && (
          <PuzzleCard
            puzzle={puzzle}
            answer={text}
            hidden={hidden}
            others={others}
            settings={shownSettings}
            onChange={setPuzzle}
            onClose={() => setPuzzle(null)}
          />
        )}
        <Output
          typedText={shownSettings.mode === 'hand' ? text : shownText}
          typed={shownText.trim() !== ''}
          text={read}
          scramble={result}
          phrases={phrases}
          settings={shownSettings}
          seed={seed}
          hand={settings.hand}
          onHand={(hand) => change({ hand })}
          shareLink={() => linkFor({ text, seed, settings, puzzle })}
          onUse={useAsClue}
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
