import { useEffect, useState } from 'react';
import type { Scramble } from '../engine/scramble';

interface OutputProps {
  /** Whether anything has been typed, to tell an empty box from one without letters in it. */
  typed: boolean;
  letters: readonly string[];
  scramble: Scramble;
}

/** Letters in a text long enough that its arrangements go one to a line. */
const LONG = 16;

export function Output({ typed, letters, scramble }: OutputProps) {
  const { arrangements } = scramble;
  if (arrangements.length === 0) {
    return (
      <article className="page">
        <p className="message">
          {!typed
            ? 'Type a word or phrase to scramble it.'
            : letters.length === 0
              ? 'There are no letters or digits to scramble.'
              : 'There’s no other way to arrange these letters.'}
        </p>
      </article>
    );
  }
  return (
    <section className="output" aria-label="Scrambled">
      <div className="output-bar">
        <p className="count">{summary(scramble)}</p>
        <Actions copyText={arrangements.join('\n')} />
      </div>
      <article className={letters.length > LONG ? 'page long' : 'page'}>
        {/* The list is numbered with a counter; the role keeps it a list for Safari's screen reader. */}
        <ol className="arrangements" role="list" aria-label="Arrangements">
          {arrangements.map((arrangement) => (
            <li key={arrangement}>{arrangement}</li>
          ))}
        </ol>
      </article>
    </section>
  );
}

/** "50 of 20,159 other arrangements", or "All 5 other arrangements" when that's every one. */
function summary({ arrangements, others, complete }: Scramble): string {
  const shown = arrangements.length;
  if (complete) return shown === 1 ? 'The only other arrangement' : `All ${shown} other arrangements`;
  const total = others > 1_000_000 ? 'over a million' : others.toLocaleString('en');
  return `${shown} of ${total} other arrangements`;
}

function Actions({ copyText }: { copyText: string }) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setStatus('Copied');
    } catch {
      // No clipboard access (an insecure page, or permission refused).
      setStatus('Couldn’t copy. Select the arrangements and copy them instead.');
    }
  }

  return (
    <div className="actions">
      <span role="status" className="status">
        {status ?? ''}
      </span>
      <button type="button" onClick={copy}>
        Copy
      </button>
    </div>
  );
}
