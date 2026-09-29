import { useId } from 'react';
import { fits, otherAnswers, readout, type Puzzle, type Readout } from '../engine/puzzle';
import type { Settings } from './settings';
import { clueItem, Shown } from './Shown';
import { readForWords, type Phrases } from './usePhrases';

interface PuzzleCardProps {
  puzzle: Puzzle;
  /** The answer, as typed. */
  answer: string;
  /** Whether the answer is kept off the screen. */
  hidden: boolean;
  /** The phrases the answer's letters spell, for its other answers. */
  others: Phrases;
  settings: Settings;
  onChange: (puzzle: Puzzle) => void;
  onClose: () => void;
}

/** How many other answers to list. */
const SHOWN_OTHERS = 12;

const LIST_NAMES = { common: 'Common', standard: 'Standard', large: 'Large' } as const;

/** A puzzle's answer, its clue, how much the clue gives away, and what else it could be. */
export function PuzzleCard({ puzzle, answer, hidden, others, settings, onChange, onClose }: PuzzleCardProps) {
  const id = useId();
  const answerText = readForWords(answer);
  const clue = readForWords(puzzle.clue);
  const fitting = fits(answerText, clue);
  const alternatives = fitting && others.result ? otherAnswers(answerText, others.result.phrases) : [];
  const accept = (text: string, yes: boolean) =>
    onChange({ ...puzzle, accepted: yes ? [...puzzle.accepted, text] : puzzle.accepted.filter((accepted) => accepted !== text) });
  return (
    <section className="puzzle" aria-labelledby={`${id}-title`}>
      <div className="puzzle-bar">
        <h2 id={`${id}-title`}>Puzzle</h2>
        <button type="button" className="quiet" onClick={onClose}>
          Close
        </button>
      </div>

      <dl className="puzzle-facts">
        <dt>Answer</dt>
        <dd>{hidden ? <span className="muted">Hidden</span> : answer.trim()}</dd>
        <dt>Clue</dt>
        <dd className="clue">
          <Shown item={clueItem(puzzle.clue)} spacing="tiles" />
        </dd>
      </dl>

      {fitting ? (
        <p className="readout">{readoutText(readout(answerText, clue))}</p>
      ) : (
        <p className="problem">The clue doesn’t use the answer’s letters any more. Choose another from the list.</p>
      )}

      {fitting && (
        <div className="others" aria-busy={others.stale}>
          <h3 className="label">Other answers</h3>
          {others.status === 'failed' && !others.stale ? (
            <p className="message">Couldn’t load the word list to look for them.</p>
          ) : !others.result ? (
            <p className="message">Looking for other answers…</p>
          ) : alternatives.length === 0 ? (
            <p className="message">{`No other phrase from the ${LIST_NAMES[settings.wordList]} word list uses these letters.`}</p>
          ) : (
            <>
              <p className="hint">Players might find these too. Tick any you’d accept.</p>
              <ul className="other-answers">
                {alternatives.slice(0, SHOWN_OTHERS).map((other) => (
                  <li key={other.text}>
                    <label className="check">
                      <input type="checkbox" checked={puzzle.accepted.includes(other.text)} onChange={(event) => accept(other.text, event.target.checked)} />
                      {other.text}
                      {other.sameLengths && <span className="badge">same lengths</span>}
                    </label>
                  </li>
                ))}
              </ul>
              {alternatives.length > SHOWN_OTHERS && (
                <p className="hint">{`And ${(alternatives.length - SHOWN_OTHERS).toLocaleString('en')} more, with more words or rarer ones.`}</p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** "No letter is where it was, 3 pairs of old neighbours are still side by side, and SES is left whole." */
function readoutText({ inPlace, neighboursKept, piece }: Readout): string {
  const placed = inPlace === 0 ? 'No letter is where it was' : inPlace === 1 ? '1 letter is where it was' : `${inPlace} letters are where they were`;
  const neighbours =
    neighboursKept === 0
      ? 'no old neighbours are side by side'
      : neighboursKept === 1
        ? '1 pair of old neighbours is still side by side'
        : `${neighboursKept} pairs of old neighbours are still side by side`;
  const whole = piece.length >= 3 ? `, and ${piece} is left whole` : '';
  return `${placed}, ${neighbours}${whole}.`;
}
