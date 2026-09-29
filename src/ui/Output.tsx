import { useEffect, useId, useState, type ReactNode } from 'react';
import { asText, formatWords, type LetterCase } from '../engine/format';
import { lettersLeft } from '../engine/hand';
import type { Text } from '../engine/letters';
import type { Phrase } from '../engine/solver';
import { mulberry32, shuffled } from '../engine/rng';
import type { Scramble, Shortfall } from '../engine/scramble';
import { isStrict, parsePattern, type Settings, type Spacing } from './settings';
import { readForWords, type Phrases } from './usePhrases';

interface OutputProps {
  /** The text as typed. */
  typedText: string;
  /** Whether anything has been typed, to tell an empty box from one without letters in it. */
  typed: boolean;
  text: Text;
  scramble: Scramble;
  phrases: Phrases;
  settings: Settings;
  seed: number;
  /** The anagram being written by hand, as typed just now, and a way to change it. */
  hand: string;
  onHand: (hand: string) => void;
  /** A link that brings back this list. */
  shareLink: () => Promise<string>;
}

/** One line of the list: its words, as characters, and any letters left over. */
interface Item {
  words: string[][];
  spare: string[];
}

/** A number of arrangements, briefly. */
const many = (n: number) => (n > 1_000_000 ? 'over a million' : n.toLocaleString('en'));

export function Output(props: OutputProps) {
  if (props.settings.mode === 'words') return <PhraseOutput {...props} />;
  if (props.settings.mode === 'hand') return <HandOutput {...props} />;
  return <ScrambleOutput {...props} />;
}

/** An anagram written by hand: the letters it has left to use, words that fit them, and ways to finish. */
function HandOutput({ typedText, hand, settings, phrases, onHand, shareLink }: OutputProps) {
  const id = useId();
  const answer = readForWords(typedText);
  if (answer.letters.length === 0) return <Message>Type a word or phrase, then write an anagram of it here.</Message>;
  const attempt = readForWords(hand);
  const { left, over } = lettersLeft(answer.letters, attempt.letters);
  const done = left.length === 0 && over.length === 0;
  const add = (words: string) => onHand(`${hand.trimEnd()}${hand.trim() ? ' ' : ''}${words.toLocaleLowerCase('en')}`);
  const preview: Item = { words: formatWords(attempt.letters, attempt.words, [], settings.letterCase), spare: [] };
  const { status, result, stale, retry } = phrases;
  return (
    <section className="output hand" aria-label="By hand">
      <div className="field">
        <label className="label" htmlFor={`${id}-hand`}>
          Your anagram
        </label>
        <input
          id={`${id}-hand`}
          type="text"
          value={hand}
          placeholder="Write it here"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => onHand(event.target.value)}
        />
      </div>

      <div className="bank" aria-live="polite">
        {over.length > 0 ? (
          <p className="problem">{`Too many: ${over.join(', ')}. The text doesn’t have ${over.length === 1 ? 'that letter' : 'those letters'} to spare.`}</p>
        ) : done ? (
          <p className="done">Uses every letter.</p>
        ) : (
          <>
            <p>{left.length === 1 ? '1 letter left:' : `${left.length} letters left:`}</p>
            <span className="tiles">
              {left.map((letter, i) => (
                <span className="tile" key={i}>
                  {settings.letterCase === 'lower' ? letter.toLocaleLowerCase('en') : letter}
                </span>
              ))}
            </span>
          </>
        )}
      </div>

      {attempt.letters.length > 0 && (
        <div className="preview">
          <div className="output-bar">
            <p className="count">{done ? 'Your anagram' : 'So far'}</p>
            <Actions copyText={itemText(preview, settings.spacing !== 'together')} shareLink={shareLink} />
          </div>
          <article className="page">
            <Shown item={preview} spacing={settings.spacing} />
          </article>
        </div>
      )}

      {!done && over.length === 0 && (
        <div className="suggestions" aria-busy={stale}>
          {status === 'failed' && !stale ? (
            <p className="message">
              Couldn’t load the word list. Check your connection, and try again.{' '}
              <button type="button" onClick={retry}>
                Try again
              </button>
            </p>
          ) : !result ? (
            <p className="message">Looking for words…</p>
          ) : result.phrases.length === 0 && result.within.length === 0 ? (
            <p className="message">No words fit in what’s left.</p>
          ) : (
            <>
              {result.phrases.length > 0 && (
                <Suggestions title="To finish it" items={result.phrases.slice(0, 12).map((phrase) => phrase.words.join(' '))} onPick={add} />
              )}
              {result.within.length > 0 && <Suggestions title="Words in what’s left" items={result.within} onPick={add} />}
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** Words or phrases to add to an anagram by hand, a click each. */
function Suggestions({ title, items, onPick }: { title: string; items: readonly string[]; onPick: (words: string) => void }) {
  const id = useId();
  return (
    <div className="suggestion-group" role="group" aria-labelledby={id}>
      <h2 className="label" id={id}>
        {title}
      </h2>
      <div className="suggestion-list">
        {items.map((item) => (
          <button type="button" key={item} className="suggestion" onClick={() => onPick(item)}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScrambleOutput({ typed, text, scramble, settings, shareLink, note }: OutputProps & { note?: string }) {
  const { arrangements } = scramble;
  if (arrangements.length === 0) return <Message>{emptyMessage(typed, text, scramble, settings)}</Message>;
  const items = arrangements.map((arrangement) => ({ words: formatWords(arrangement.letters, arrangement.words, text.marks, settings.letterCase), spare: [] }));
  const notes = [...(note ? [note] : []), ...scramble.shortfalls.map(shortfallMessage)];
  return <List items={items} summary={summary(scramble, isStrict(settings))} notes={notes} spacing={settings.spacing} shareLink={shareLink} />;
}

function PhraseOutput(props: OutputProps) {
  const { typed, phrases, settings, seed, shareLink } = props;
  const { status, result, stale, retry } = phrases;
  if (!typed) return <Message>Type a word or phrase to find real words in it.</Message>;
  if (status === 'failed' && !stale) {
    return (
      <Message>
        Couldn’t load the word list. Check your connection, and try again.{' '}
        <button type="button" onClick={retry}>
          Try again
        </button>
      </Message>
    );
  }
  if (!result) return <Message>Looking for words…</Message>;
  if (result.missing) return <Message>{`${result.missing} isn’t in the letters, so it can’t be put in.`}</Message>;
  const close = result.phrases.length === 0;
  const found = close ? result.nearMisses : result.phrases;
  if (found.length === 0) return <ScrambleOutput {...props} note="No real words are in these letters, so here are scrambles." />;

  // The best of them, then in the order asked for.
  let shown = found.slice(0, settings.count);
  if (settings.order === 'az') shown = [...shown].sort((a, b) => a.words.join(' ').localeCompare(b.words.join(' '), 'en'));
  if (settings.order === 'shuffled') shown = shuffled(shown, mulberry32(seed));
  const items = shown.map((phrase) => phraseItem(phrase, settings.letterCase));
  const all = result.exhausted && found.length === shown.length;
  const text = close
    ? all
      ? shown.length === 1
        ? 'The closest phrase'
        : `The ${shown.length} closest phrases`
      : `The ${shown.length} closest of ${many(found.length)} phrases found`
    : all
      ? shown.length === 1
        ? 'The only phrase'
        : `All ${shown.length} phrases`
      : `The best ${shown.length} of ${result.exhausted ? '' : 'the '}${many(found.length)} phrases${result.exhausted ? '' : ' found'}`;
  const notes = close ? ['No phrase of real words uses every letter, so each of these leaves a few over, set apart at the end.'] : [];
  return (
    <List
      items={items}
      summary={text}
      notes={notes}
      spacing={settings.spacing}
      shareLink={shareLink}
      busy={stale}
      credit={
        <p className="source">
          Words from the{' '}
          <a href="https://github.com/en-wl/wordlist" target="_blank" rel="noopener">
            English Speller Database
          </a>
          , by Kevin Atkinson.
        </p>
      }
    />
  );
}

function phraseItem(phrase: Phrase, letterCase: LetterCase): Item {
  const letters = phrase.words.flatMap((word) => [...word]);
  return {
    words: formatWords(
      letters,
      phrase.words.map((word) => word.length),
      [],
      letterCase,
    ),
    spare: phrase.leftover.map((letter) => (letterCase === 'lower' ? letter.toLocaleLowerCase('en') : letter)),
  };
}

/** An item as plain text: "LEMON + L" for one with a letter left over. */
function itemText(item: Item, spaced: boolean): string {
  const words = asText(item.words, spaced);
  return item.spare.length > 0 ? `${words} + ${item.spare.join(spaced ? ' ' : '')}` : words;
}

function Message({ children }: { children: ReactNode }) {
  return (
    <article className="page">
      <p className="message">{children}</p>
    </article>
  );
}

interface ListProps {
  items: Item[];
  summary: string;
  notes: string[];
  spacing: Spacing;
  shareLink: () => Promise<string>;
  /** Whether a newer list is on its way. */
  busy?: boolean;
  credit?: ReactNode;
}

function List({ items, summary: text, notes, spacing, shareLink, busy = false, credit }: ListProps) {
  const spaced = spacing !== 'together';
  const texts = items.map((item) => itemText(item, spaced));
  // Columns at least as wide as the widest line, as many as fit.
  const widest = Math.max(...texts.map((line) => line.length));
  const columnWidth = `${Math.ceil(widest * (spacing === 'tiles' ? 2.4 : 1.3)) + 3}ch`;
  return (
    <section className="output" aria-label="Scrambled">
      <div className="output-bar">
        <p className="count">{text}</p>
        <Actions copyText={texts.join('\n')} shareLink={shareLink} />
      </div>
      {notes.length > 0 && (
        <div className="notice" role="note">
          {notes.map((note, i) => (
            <p key={i}>{note}</p>
          ))}
        </div>
      )}
      <article className="page" aria-busy={busy}>
        {/* The list is numbered with a counter; the role keeps it a list for Safari's screen reader. */}
        <ol className="arrangements" role="list" aria-label="Arrangements" style={{ columnWidth }}>
          {items.map((item, i) => (
            <li key={i}>
              <Shown item={item} spacing={spacing} />
            </li>
          ))}
        </ol>
      </article>
      {credit}
    </section>
  );
}

function Shown({ item, spacing }: { item: Item; spacing: Spacing }) {
  if (spacing !== 'tiles') {
    const words = asText(item.words, spacing === 'spaced');
    return (
      <span className={spacing === 'spaced' ? 'spaced' : undefined}>
        {words}
        {item.spare.length > 0 && <span className="spare">{` + ${item.spare.join(spacing === 'spaced' ? ' ' : '')}`}</span>}
      </span>
    );
  }
  return (
    <span className="tiles">
      {item.words.map((word, w) => (
        <span className="tile-word" key={w}>
          {word.map((character, c) => (
            <span className="tile" key={c}>
              {character}
            </span>
          ))}
        </span>
      ))}
      {item.spare.length > 0 && (
        <span className="tile-word spare" aria-label={`and ${item.spare.join(' ')} left over`}>
          {item.spare.map((character, c) => (
            <span className="tile" key={c}>
              {character}
            </span>
          ))}
        </span>
      )}
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
      <button type="button" onClick={() => copy(copyText, 'Copied', 'Select the list and copy it instead.')}>
        Copy
      </button>
      <button type="button" onClick={() => copy(shareLink(), 'Link copied', 'Copy the address from the address bar instead.')}>
        Share link
      </button>
    </div>
  );
}
