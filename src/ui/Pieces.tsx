import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { fragmentsOf, MOST_PIECES, type Puzzle, type Split } from '../engine/puzzle';
import { PrintSheet } from './PrintSheet';
import { clueItem, Shown } from './Shown';
import { steleLink } from './steleLink';

interface PiecesProps {
  puzzle: Puzzle;
  onChange: (puzzle: Puzzle) => void;
}

/** The clue split into pieces, to hand out or hide around the place, each to copy, print or put in Stele. */
export function Pieces({ puzzle, onChange }: PiecesProps) {
  const id = useId();
  const { clue, split, stele } = puzzle;
  const pieces = useMemo(() => fragmentsOf(clue, split), [clue, split]);
  const words = fragmentsOf(clue, 'words').length;
  const letters = clueItem(clue).words.flat().length;
  // A split that no longer suits the clue, such as a word to a piece for one word, shows as what it does.
  const shown: Split = split === 'words' ? (words > 1 ? 'words' : 1) : Math.max(1, Math.min(split, letters));
  const counts = Array.from({ length: Math.max(0, Math.min(MOST_PIECES, letters) - 1) }, (_, i) => i + 2);

  const [links, setLinks] = useState<string[]>([]);
  useEffect(() => {
    let current = true;
    Promise.all(pieces.map((piece) => steleLink(piece, '', stele))).then(
      (made) => current && setLinks(made),
      () => current && setLinks([]),
    );
    return () => {
      current = false;
    };
  }, [pieces, stele]);

  const [status, setStatus] = useState('');
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(''), 2500);
    return () => clearTimeout(timer);
  }, [status]);
  async function copy(piece: string, number: number) {
    try {
      await navigator.clipboard.writeText(piece);
      setStatus(`Piece ${number} copied`);
    } catch {
      setStatus('Couldn’t copy it. Select its letters and copy them instead.');
    }
  }

  // Each request to print draws the sheet afresh, and so prints again.
  const [printing, setPrinting] = useState<{ piece: string; request: number } | null>(null);
  const printed = useCallback(() => setPrinting(null), []);

  return (
    <div className="pieces" role="group" aria-labelledby={`${id}-title`}>
      <h3 className="label" id={`${id}-title`}>
        Pieces
      </h3>
      <div className="field">
        <label className="label" htmlFor={`${id}-split`}>
          Split the clue
        </label>
        <select
          id={`${id}-split`}
          value={String(shown)}
          onChange={(event) => onChange({ ...puzzle, split: event.target.value === 'words' ? 'words' : Number(event.target.value) })}
        >
          <option value="1">Not split</option>
          {words > 1 && <option value="words">{`A word to a piece (${words})`}</option>}
          {counts.map((count) => (
            <option key={count} value={count}>
              {`${count} pieces`}
            </option>
          ))}
        </select>
      </div>

      {pieces.length > 1 && (
        <>
          <ol className="piece-list" aria-label="Pieces of the clue">
            {pieces.map((piece, i) => (
              <li key={i}>
                <Shown item={clueItem(piece)} spacing="tiles" />
                <span className="piece-actions">
                  <button type="button" aria-label={`Copy piece ${i + 1}`} onClick={() => copy(piece, i + 1)}>
                    Copy
                  </button>
                  <button
                    type="button"
                    aria-label={`Print piece ${i + 1}`}
                    onClick={() => setPrinting((current) => ({ piece, request: (current?.request ?? 0) + 1 }))}
                  >
                    Print
                  </button>
                  <a
                    className="button"
                    href={links[i]}
                    aria-disabled={!links[i]}
                    aria-label={`Open piece ${i + 1} in Stele`}
                    target="_blank"
                    rel="noopener"
                  >
                    Stele
                  </a>
                </span>
              </li>
            ))}
          </ol>
          <p className="hint">
            Hide them around the place, or hand them out. The players need every piece to solve the clue.{' '}
            <span role="status">{status}</span>
          </p>
        </>
      )}
      {printing && <PrintSheet key={printing.request} kind="card" clue={printing.piece} riddle="" onDone={printed} />}
    </div>
  );
}
