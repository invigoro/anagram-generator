import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { readText } from '../engine/letters';

export type Printout = 'tiles' | 'card';

interface PrintSheetProps {
  kind: Printout;
  clue: string;
  riddle: string;
  /** Called once the browser's print dialog has closed. */
  onDone: () => void;
}

/**
 * What gets printed, and nothing else of the page: letter tiles to cut out, or a card with the
 * riddle and the clue. It's drawn beside the page rather than in it, and prints as it appears.
 * It's never seen on screen, so it can wait for the print dialog to close before it goes.
 */
export function PrintSheet({ kind, clue, riddle, onDone }: PrintSheetProps) {
  useEffect(() => {
    window.addEventListener('afterprint', onDone);
    window.print();
    return () => window.removeEventListener('afterprint', onDone);
  }, [onDone]);

  const letters = readText(clue, { punctuation: 'drop', digits: 'scramble', accents: 'keep' }).letters;
  return createPortal(
    <div className="print-sheet">
      {kind === 'tiles' ? (
        <>
          <p className="print-note">Cut along the dashed lines.</p>
          <div className="print-tiles">
            {letters.map((letter, i) => (
              <span className="print-tile" key={i}>
                {letter}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="print-card">
          {riddle.trim() && <p className="print-riddle">{riddle.trim()}</p>}
          <p className="print-clue">{clue}</p>
        </div>
      )}
    </div>,
    document.body,
  );
}
