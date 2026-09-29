import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { readText } from '../engine/letters';
import { mulberry32, randomSeed, shuffled } from '../engine/rng';
import { isRight, type PlayerPuzzle } from './playerLink';
import { clueItem, HintTiles, Shown } from './Shown';

/** A clue's letters as tiles to move: its letters and digits, in the clue's order. */
const tilesOf = (clue: string) => readText(clue, { punctuation: 'drop', digits: 'scramble', accents: 'keep' }).letters;

/** The players' page: a puzzle's clue, to solve by moving its letters or typing a guess. */
export default function Player({ puzzle }: { puzzle: PlayerPuzzle | null }) {
  // Another link pasted into the address bar opens whatever it holds.
  useEffect(() => {
    const reload = () => window.location.reload();
    window.addEventListener('hashchange', reload);
    return () => window.removeEventListener('hashchange', reload);
  }, []);
  return (
    <div className="player">
      <header className="player-brand">
        <h1>A puzzle</h1>
      </header>
      {puzzle ? <Solve puzzle={puzzle} /> : <p className="message">This link doesn’t hold a puzzle. Ask whoever sent it for it again.</p>}
      <footer className="about">
        <p>
          Made with{' '}
          <a href="https://sator.invigoro.me/" target="_blank" rel="noopener">
            Sator
          </a>
          .
        </p>
      </footer>
    </div>
  );
}

function Solve({ puzzle }: { puzzle: PlayerPuzzle }) {
  const id = useId();
  const [tiles, setTiles] = useState(() => tilesOf(puzzle.clue));
  const [picked, setPicked] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [guess, setGuess] = useState('');
  const [wrong, setWrong] = useState(false);
  const [hints, setHints] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const dragging = useRef<{ from: number; moved: boolean } | null>(null);
  // A drag ends in a click on the tile it started from, which shouldn't pick it.
  const justDragged = useRef(false);

  // Checked after every move.
  useEffect(() => {
    let current = true;
    isRight(puzzle, tiles.join('')).then((right) => {
      if (current && right) setSolved(true);
    });
    return () => {
      current = false;
    };
  }, [puzzle, tiles]);

  // A tile picked with the keyboard keeps the focus as it moves.
  useEffect(() => {
    if (picked !== null) buttons.current[picked]?.focus();
  }, [picked, tiles]);

  const move = (from: number, to: number) =>
    setTiles((current) => {
      const next = [...current];
      const [tile] = next.splice(from, 1);
      next.splice(to, 0, tile);
      return next;
    });

  function click(i: number) {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    if (picked === null) setPicked(i);
    else if (picked === i) setPicked(null);
    else {
      // Swap the two.
      setTiles((current) => {
        const next = [...current];
        [next[picked], next[i]] = [next[i], next[picked]];
        return next;
      });
      setPicked(null);
    }
  }

  function key(event: KeyboardEvent, i: number) {
    if (picked !== i) return;
    const to = event.key === 'ArrowLeft' ? i - 1 : event.key === 'ArrowRight' ? i + 1 : null;
    if (to !== null && to >= 0 && to < tiles.length) {
      event.preventDefault();
      move(i, to);
      setPicked(to);
    } else if (event.key === 'Escape') setPicked(null);
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>, i: number) {
    if (event.button !== 0 || solved) return;
    dragging.current = { from: i, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event: PointerEvent) {
    const drag = dragging.current;
    if (!drag) return;
    const over = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-tile]');
    const to = over ? Number(over.dataset.tile) : drag.from;
    if (to === drag.from) return;
    move(drag.from, to);
    dragging.current = { from: to, moved: true };
    setPicked(null);
  }

  function pointerUp() {
    justDragged.current = dragging.current?.moved ?? false;
    dragging.current = null;
  }

  async function check(event: FormEvent) {
    event.preventDefault();
    if (await isRight(puzzle, guess)) setSolved(true);
    else setWrong(true);
  }

  const shuffle = () => {
    setTiles((current) => shuffled(current, mulberry32(randomSeed())));
    setPicked(null);
  };

  return (
    <main className="solve">
      {puzzle.riddle && <p className="riddle">{puzzle.riddle}</p>}
      <div className="player-clue">
        <span className="label">The clue</span>
        <Shown item={clueItem(puzzle.clue)} spacing="together" />
      </div>

      <div className="field">
        <span className="label" id={`${id}-tiles`}>
          Your answer
        </span>
        <div className={solved ? 'player-tiles solved' : 'player-tiles'} role="group" aria-labelledby={`${id}-tiles`} onPointerMove={pointerMove}>
          {tiles.map((letter, i) => (
            <button
              key={i}
              ref={(button) => {
                buttons.current[i] = button;
              }}
              type="button"
              className={picked === i ? 'tile picked' : 'tile'}
              data-tile={i}
              aria-label={`${letter}, ${i + 1} of ${tiles.length}`}
              aria-pressed={picked === i}
              disabled={solved}
              onClick={() => click(i)}
              onKeyDown={(event) => key(event, i)}
              onPointerDown={(event) => pointerDown(event, i)}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
            >
              {letter}
            </button>
          ))}
        </div>
        {!solved && (
          <small className="hint">
            Drag the letters into place, or pick one and then another to swap them. A picked letter moves with the arrow keys.
          </small>
        )}
      </div>

      {solved ? (
        <p className="solved-line" role="status">
          <span aria-hidden="true">✓ </span>
          {puzzle.success || 'That’s it!'}
        </p>
      ) : (
        <>
          <div className="player-actions">
            <button type="button" onClick={shuffle}>
              Shuffle the letters
            </button>
            {puzzle.hints.length > 0 && (
              <button type="button" disabled={hints >= puzzle.hints.length} onClick={() => setHints(hints + 1)}>
                {hints === 0 ? 'Take a hint' : `Another hint (${hints} of ${puzzle.hints.length} taken)`}
              </button>
            )}
          </div>
          {hints > 0 && (
            <div className="player-hint" aria-label={`Hint ${hints} of ${puzzle.hints.length}`}>
              <HintTiles hint={puzzle.hints[hints - 1]} />
            </div>
          )}
          <form className="field" onSubmit={check}>
            <label className="label" htmlFor={`${id}-guess`}>
              Or type it
            </label>
            <div className="row">
              <input
                id={`${id}-guess`}
                type="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={guess}
                onChange={(event) => {
                  setGuess(event.target.value);
                  setWrong(false);
                }}
              />
              <button type="submit">Check</button>
            </div>
            <Said>{wrong ? 'Not quite. Try again.' : ''}</Said>
          </form>
        </>
      )}
    </main>
  );
}

/** A line read out as it changes. */
function Said({ children }: { children: ReactNode }) {
  return (
    <span className="status" role="status">
      {children}
    </span>
  );
}
