import { useMemo, useState } from 'react';
import { lettersOf } from '../engine/letters';
import { mulberry32, randomSeed } from '../engine/rng';
import { scramble } from '../engine/scramble';
import { Controls } from './Controls';
import { Output } from './Output';

/** How many arrangements the list shows. */
const COUNT = 50;

export default function App() {
  const [text, setText] = useState('');
  const [seed, setSeed] = useState(randomSeed);
  const letters = useMemo(() => lettersOf(text), [text]);
  const result = useMemo(() => scramble(letters, COUNT, mulberry32(seed)), [letters, seed]);

  return (
    <div className="app">
      <aside className="panel">
        <header className="brand">
          <h1>Sator</h1>
          <p>Scrambled words for tabletop puzzles</p>
        </header>

        <Controls text={text} onText={setText} seed={seed} onReroll={() => setSeed(randomSeed())} />

        <About className="about beside-text" />
      </aside>

      <main className="stage">
        <Output typed={text.trim() !== ''} letters={letters} scramble={result} />
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
