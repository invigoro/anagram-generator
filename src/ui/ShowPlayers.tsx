import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { hintLadder, type Hint } from '../engine/hints';
import type { Puzzle } from '../engine/puzzle';
import { mulberry32, randomSeed, shuffled } from '../engine/rng';
import { clueItem, Shown, type Item } from './Shown';
import { readForWords } from './usePhrases';

/** Type sizes for the table, in rem. */
const SIZES = [1.5, 2, 2.6, 3.3, 4.2] as const;

interface ShowPlayersProps {
  puzzle: Puzzle;
  /** The answer, as typed: shown only when asked for, twice. */
  answer: string;
  onClose: () => void;
}

/**
 * The clue in large tiles over the page, to show the players: hints one at a time, the letters
 * shuffled afresh for a new look, and the answer at the end, but only when asked for twice.
 */
export function ShowPlayers({ puzzle, answer, onClose }: ShowPlayersProps) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [size, setSize] = useState(2);
  const [hints, setHints] = useState(0);
  const [reshuffled, setReshuffled] = useState<Item | null>(null);
  const [reveal, setReveal] = useState<'no' | 'sure' | 'yes'>('no');
  const ladder = useMemo(() => hintLadder(readForWords(answer)), [answer]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    // A modal dialog keeps focus inside it, and closes on Escape.
    if (typeof element.showModal === 'function') element.showModal();
    else element.setAttribute('open', '');
    return () => {
      if (element.open && typeof element.close === 'function') element.close();
    };
  }, []);

  /** The clue's letters in a new order, each word's among themselves. */
  function shuffle() {
    const random = mulberry32(randomSeed());
    const { words } = clueItem(puzzle.clue);
    setReshuffled({ words: words.map((word) => shuffled(word, random)), spare: [] });
  }

  return (
    <dialog ref={dialog} className="show-players" aria-labelledby={`${id}-title`} onClose={onClose} onCancel={onClose}>
      <div className="show-bar">
        <h2 id={`${id}-title`}>The clue</h2>
        <div className="show-size">
          <button type="button" aria-label="Smaller" disabled={size === 0} onClick={() => setSize(size - 1)}>
            A−
          </button>
          <button type="button" aria-label="Larger" disabled={size === SIZES.length - 1} onClick={() => setSize(size + 1)}>
            A+
          </button>
        </div>
        <button type="button" onClick={shuffle}>
          Shuffle again
        </button>
        {reshuffled && (
          <button type="button" className="quiet" onClick={() => setReshuffled(null)}>
            Put back
          </button>
        )}
        <button type="button" disabled={hints >= ladder.length} onClick={() => setHints(hints + 1)}>
          {hints === 0 ? 'Give a hint' : 'Another hint'}
        </button>
        <button type="button" disabled={reveal === 'yes'} onClick={() => setReveal(reveal === 'no' ? 'sure' : 'yes')}>
          {reveal === 'sure' ? 'Sure? Reveal it' : 'Reveal the answer'}
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="show-body" style={{ fontSize: `${SIZES[size]}rem` }}>
        {puzzle.riddle.trim() && <p className="riddle">{puzzle.riddle.trim()}</p>}
        <div className="show-clue" aria-label="Clue">
          <Shown item={reshuffled ?? clueItem(puzzle.clue)} spacing="tiles" />
        </div>
        {hints > 0 && (
          <div className="show-hint" aria-label={`Hint ${hints} of ${ladder.length}`}>
            <HintTiles hint={ladder[hints - 1]} />
          </div>
        )}
        {reveal === 'yes' && (
          <div className="show-answer" role="status">
            <p className="answer">{answer.trim()}</p>
            {puzzle.success.trim() && <p>{puzzle.success.trim()}</p>}
          </div>
        )}
      </div>
    </dialog>
  );
}

/** A hint as tiles: the letters given, and blanks for the rest. */
export function HintTiles({ hint }: { hint: Hint }) {
  return (
    <span className="tiles">
      {hint.map((word, w) => (
        <span className="tile-word" key={w}>
          {word.map((letter, i) => (
            <span className={letter ? 'tile' : 'tile blank'} key={i} aria-label={letter ?? 'a letter to find'}>
              {letter ?? ''}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
