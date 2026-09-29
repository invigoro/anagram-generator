import { useEffect, useState } from 'react';
import { asText, formatWords } from '../engine/format';
import type { Text } from '../engine/letters';
import type { Scramble, Shortfall } from '../engine/scramble';
import { isStrict, parsePattern, type Settings, type Spacing } from './settings';

interface OutputProps {
  /** Whether anything has been typed, to tell an empty box from one without letters in it. */
  typed: boolean;
  text: Text;
  scramble: Scramble;
  settings: Settings;
  /** A link that brings back this list. */
  shareLink: () => Promise<string>;
}

/** A number of arrangements, briefly. */
const many = (n: number) => (n > 1_000_000 ? 'over a million' : n.toLocaleString('en'));

export function Output({ typed, text, scramble, settings, shareLink }: OutputProps) {
  const { arrangements } = scramble;
  if (arrangements.length === 0) {
    return (
      <article className="page">
        <p className="message">{emptyMessage(typed, text, scramble, settings)}</p>
      </article>
    );
  }
  const shown = arrangements.map((arrangement) => formatWords(arrangement.letters, arrangement.words, text.marks, settings.letterCase));
  const spaced = settings.spacing !== 'together';
  const copyText = shown.map((words) => asText(words, spaced)).join('\n');
  // Columns at least as wide as the widest arrangement, as many as fit.
  const widest = Math.max(...shown.map((words) => asText(words, spaced).length));
  const columnWidth = `${Math.ceil(widest * (settings.spacing === 'tiles' ? 2.4 : 1.3)) + 3}ch`;
  return (
    <section className="output" aria-label="Scrambled">
      <div className="output-bar">
        <p className="count">{summary(scramble, isStrict(settings))}</p>
        <Actions copyText={copyText} shareLink={shareLink} />
      </div>
      {scramble.shortfalls.length > 0 && (
        <div className="notice" role="note">
          {scramble.shortfalls.map((shortfall, i) => (
            <p key={i}>{shortfallMessage(shortfall)}</p>
          ))}
        </div>
      )}
      <article className="page">
        {/* The list is numbered with a counter; the role keeps it a list for Safari's screen reader. */}
        <ol className="arrangements" role="list" aria-label="Arrangements" style={{ columnWidth }}>
          {shown.map((words, i) => (
            <li key={i}>
              <Arrangement words={words} spacing={settings.spacing} />
            </li>
          ))}
        </ol>
      </article>
    </section>
  );
}

function Arrangement({ words, spacing }: { words: string[][]; spacing: Spacing }) {
  if (spacing !== 'tiles') return <span className={spacing === 'spaced' ? 'spaced' : undefined}>{asText(words, spacing === 'spaced')}</span>;
  return (
    <span className="tiles">
      {words.map((word, w) => (
        <span className="tile-word" key={w}>
          {word.map((character, c) => (
            <span className="tile" key={c}>
              {character}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

function emptyMessage(typed: boolean, text: Text, scramble: Scramble, settings: Settings): string {
  if (!typed) return 'Type a word or phrase to scramble it.';
  if (text.letters.length === 0) return 'There are no letters or digits to scramble.';
  if (scramble.shortfalls.some((shortfall) => shortfall.kind === 'pattern')) {
    const lengths = parsePattern(settings.pattern);
    if (lengths.length === 0) return 'Type the words’ lengths, like 3-4-3.';
    const total = lengths.reduce((sum, length) => sum + length, 0);
    return `The pattern ${lengths.join('-')} makes ${total} letters, but the text has ${text.letters.length}.`;
  }
  if ((settings.keepFirst || settings.keepLast) && scramble.others === 0) return 'With each word’s first or last letter kept, there’s nothing left to move.';
  return 'There’s no other way to arrange these letters.';
}

/** "50 of 261 arrangements that fit", "All 5 other arrangements", or "The 2 closest arrangements". */
function summary({ arrangements, others, fitting, complete, shortfalls }: Scramble, strict: boolean): string {
  const shown = arrangements.length;
  if (shortfalls.length > 0) {
    if (!complete) return `The ${shown} closest of ${many(others)} other arrangements`;
    return shown === 1 ? 'The closest arrangement' : `The ${shown} closest arrangements`;
  }
  const fit = strict && fitting !== null;
  if (complete) {
    if (shown === 1) return fit ? 'The only arrangement that fits' : 'The only other arrangement';
    return fit ? `All ${shown} arrangements that fit` : `All ${shown} other arrangements`;
  }
  return `${shown} of ${many(fitting ?? others)} ${fit ? 'arrangements that fit' : 'other arrangements'}`;
}

function shortfallMessage(shortfall: Shortfall): string {
  switch (shortfall.kind) {
    case 'move':
      return `Not every letter${shortfall.word ? ` of ${shortfall.word}` : ''} can move: more than half of them are ${shortfall.letter}.`;
    case 'neighbours':
      return 'Some old neighbours are still side by side: these part as many as could be found.';
    case 'rules':
      return 'No arrangement keeps every rule at once: these come closest.';
    case 'pattern':
      return '';
  }
}

function Actions({ copyText, shareLink }: { copyText: string; shareLink: () => Promise<string> }) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  async function copy(text: string | Promise<string>, done: string, instead: string) {
    try {
      await navigator.clipboard.writeText(await text);
      setStatus(done);
    } catch {
      // No clipboard access (an insecure page, or permission refused).
      setStatus(`Couldn’t copy. ${instead}`);
    }
  }

  return (
    <div className="actions">
      <span role="status" className="status">
        {status ?? ''}
      </span>
      <button type="button" onClick={() => copy(copyText, 'Copied', 'Select the arrangements and copy them instead.')}>
        Copy
      </button>
      <button type="button" onClick={() => copy(shareLink(), 'Link copied', 'Copy the address from the address bar instead.')}>
        Share link
      </button>
    </div>
  );
}
