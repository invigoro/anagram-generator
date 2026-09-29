import { useId, type ReactNode } from 'react';
import { WORD_LISTS, type WordList } from '../data/words';
import type { LetterCase } from '../engine/format';
import type { Order, Shape } from '../engine/scramble';
import { PRESETS, type Preset } from './presets';
import {
  COUNTS,
  DIFFICULTIES,
  DIFFICULTY_RULES,
  difficultyOf,
  MODES,
  MOST_WORDS,
  ORDERS,
  parsePattern,
  SAYABILITIES,
  SHAPES,
  SHORTEST_WORDS,
  WORD_COUNTS,
  type Difficulty,
  type Mode,
  type Sayability,
  type Settings,
  type Spacing,
} from './settings';

const SAYABLE_LABELS: Record<Sayability, { label: string; hint: string }> = {
  off: { label: 'Off', hint: 'The letters in any order.' },
  some: { label: 'Somewhat', hint: 'Leaning towards letters that could be said aloud.' },
  very: { label: 'Very', hint: 'Reading as much like words as the letters allow.' },
};

const MODE_LABELS: Record<Mode, { label: string; hint: string }> = {
  scramble: { label: 'Scrambles', hint: 'The letters jumbled, as hard as you like.' },
  words: { label: 'Real words', hint: 'Phrases of real words that use every letter.' },
  hand: { label: 'By hand', hint: 'Write your own, with the letters left over and words that fit them.' },
};

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; hint: string }> = {
  easy: { label: 'Easy', hint: 'Keeps the words, and their first letters.' },
  medium: { label: 'Medium', hint: 'Keeps the words, and moves every letter.' },
  hard: { label: 'Hard', hint: 'Runs the words together, moves every letter, and parts old neighbours.' },
};

const SHAPE_LABELS: Record<Shape, { label: string; hint: string }> = {
  words: { label: 'Keep the words', hint: 'Each word scrambled on its own.' },
  lengths: { label: 'Keep the word lengths', hint: 'The words’ lengths, with the letters mixed across them.' },
  run: { label: 'Run together', hint: 'Every letter in one run, with no spaces.' },
  count: { label: 'A number of words', hint: 'New words, of two letters or more where there are enough.' },
  pattern: { label: 'A pattern of lengths', hint: 'New words of the lengths given.' },
};

const LIST_LABELS: Record<WordList, { label: string; hint: string }> = {
  common: { label: 'Common', hint: '38,612 everyday words.' },
  standard: { label: 'Standard', hint: '61,037 words, with some less common ones.' },
  large: { label: 'Large', hint: '124,697 words, some of them rare.' },
};

const CASES: readonly { value: LetterCase; label: string; name: string }[] = [
  { value: 'upper', label: 'ABC', name: 'Capitals' },
  { value: 'lower', label: 'abc', name: 'Lowercase' },
  { value: 'title', label: 'Abc', name: 'Title case' },
];

const SPACINGS: readonly { value: Spacing; label: string; name: string }[] = [
  { value: 'together', label: 'SWORD', name: 'Letters together' },
  { value: 'spaced', label: 'S W O R D', name: 'Letters spaced out' },
  { value: 'tiles', label: 'Tiles', name: 'Tiles' },
];

const ORDER_LABELS: Record<Order, { label: string; hint: string }> = {
  best: { label: 'Best first', hint: 'Those that give away least come first.' },
  az: { label: 'A to Z', hint: 'In alphabetical order.' },
  shuffled: { label: 'Shuffled', hint: 'In no order at all.' },
};

const PHRASE_ORDER_HINT = 'Few, common words first.';

interface ControlsProps {
  text: string;
  onText: (text: string) => void;
  settings: Settings;
  onSettings: (changes: Partial<Settings>) => void;
  /** How many letters the text has, for the pattern's hint. */
  letterCount: number;
  /** Whether the text is kept off the screen, for tables where players can see it. */
  hidden: boolean;
  onHidden: (hidden: boolean) => void;
  seed: number;
  onReroll: () => void;
  /** The kind of puzzle chosen, while the settings are still its. */
  preset: Preset | null;
  onPreset: (preset: Preset) => void;
}

export function Controls({ text, onText, settings, onSettings, letterCount, hidden, onHidden, seed, onReroll, preset, onPreset }: ControlsProps) {
  const id = useId();
  const { mode } = settings;
  return (
    <div className="controls">
      <div className="field">
        <div className="label-row">
          <label className="label" htmlFor={`${id}-text`}>
            Word or phrase
          </label>
          <button type="button" className="link" aria-pressed={hidden} onClick={() => onHidden(!hidden)}>
            {hidden ? 'Show it' : 'Hide it'}
          </button>
        </div>
        {/* A password shouldn't be corrected, or sent off to be spell-checked. It's masked rather
            than made a password field, so browsers don't offer to save it. */}
        <input
          id={`${id}-text`}
          type="text"
          className={hidden ? 'masked' : undefined}
          value={text}
          placeholder="Open sesame"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => onText(event.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor={`${id}-preset`}>
          Kind of puzzle
        </label>
        <select
          id={`${id}-preset`}
          value={preset?.name ?? ''}
          aria-describedby={`${id}-preset-hint`}
          onChange={(event) => {
            const chosen = PRESETS.find((option) => option.name === event.target.value);
            if (chosen) onPreset(chosen);
          }}
        >
          <option value="" disabled>
            Choose one…
          </option>
          {PRESETS.map((option) => (
            <option key={option.name} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
        <small className="hint" id={`${id}-preset-hint`}>
          {preset ? preset.hint : 'Sets the options below, and the puzzle’s, for a common kind of puzzle.'}
        </small>
      </div>

      <Choice
        legend="Make"
        value={mode}
        options={MODES.map((value) => ({ value, label: MODE_LABELS[value].label }))}
        onChange={(value) => onSettings({ mode: value })}
        hint={MODE_LABELS[mode].hint}
      />

      {mode === 'scramble' && <ScrambleShape settings={settings} onSettings={onSettings} letterCount={letterCount} />}
      {mode !== 'scramble' && <WordListChoice settings={settings} onSettings={onSettings} />}

      <Choice legend="Case" value={settings.letterCase} options={CASES} onChange={(letterCase) => onSettings({ letterCase })} />
      <Choice legend="Show" value={settings.spacing} options={SPACINGS} onChange={(spacing) => onSettings({ spacing })} />

      <details className="more">
        <summary>More options</summary>
        <div className="more-options">
          {mode === 'scramble' && <ScrambleOptions settings={settings} onSettings={onSettings} />}
          {mode !== 'scramble' && <WordOptions settings={settings} onSettings={onSettings} />}
          {mode !== 'hand' && (
            <>
              <div className="field">
                <label className="label" htmlFor={`${id}-count`}>
                  How many
                </label>
                <select id={`${id}-count`} value={settings.count} onChange={(event) => onSettings({ count: Number(event.target.value) })}>
                  {COUNTS.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor={`${id}-order`}>
                  Order
                </label>
                <select
                  id={`${id}-order`}
                  aria-describedby={`${id}-order-hint`}
                  value={settings.order}
                  onChange={(event) => onSettings({ order: event.target.value as Order })}
                >
                  {ORDERS.map((order) => (
                    <option key={order} value={order}>
                      {ORDER_LABELS[order].label}
                    </option>
                  ))}
                </select>
                <small className="hint" id={`${id}-order-hint`}>
                  {mode === 'words' && settings.order === 'best' ? PHRASE_ORDER_HINT : ORDER_LABELS[settings.order].hint}
                </small>
              </div>
            </>
          )}
        </div>
      </details>

      {mode !== 'hand' && (
        <div className="reroll-row">
          <button type="button" className="reroll" onClick={onReroll}>
            <span aria-hidden="true">🎲</span> Reroll
          </button>
          <span className="seed" title="The same seed, text and settings always give the same list">
            Seed {seed}
          </span>
        </div>
      )}
    </div>
  );
}

interface PartProps {
  settings: Settings;
  onSettings: (changes: Partial<Settings>) => void;
}

/** A scramble's difficulty, and how its letters fall into words. */
function ScrambleShape({ settings, onSettings, letterCount }: PartProps & { letterCount: number }) {
  const id = useId();
  const difficulty = difficultyOf(settings);
  return (
    <>
      <Choice
        legend="Difficulty"
        value={difficulty}
        options={DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABELS[value].label }))}
        onChange={(value) => onSettings(DIFFICULTY_RULES[value])}
        hint={difficulty ? DIFFICULTY_LABELS[difficulty].hint : 'Your own mix, under More options.'}
      />

      <div className="field">
        <label className="label" htmlFor={`${id}-shape`}>
          Words
        </label>
        <div className="row">
          <select
            id={`${id}-shape`}
            aria-describedby={`${id}-shape-hint`}
            value={settings.shape}
            onChange={(event) => onSettings({ shape: event.target.value as Shape })}
          >
            {SHAPES.map((shape) => (
              <option key={shape} value={shape}>
                {SHAPE_LABELS[shape].label}
              </option>
            ))}
          </select>
          {settings.shape === 'count' && (
            <select aria-label="How many words" value={settings.wordCount} onChange={(event) => onSettings({ wordCount: Number(event.target.value) })}>
              {WORD_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count} words
                </option>
              ))}
            </select>
          )}
          {settings.shape === 'pattern' && (
            <input
              type="text"
              className="pattern"
              aria-label="Word lengths"
              placeholder="3-4-3"
              inputMode="numeric"
              autoComplete="off"
              value={settings.pattern}
              onChange={(event) => onSettings({ pattern: event.target.value })}
            />
          )}
        </div>
        <small className="hint" id={`${id}-shape-hint`}>
          {settings.shape === 'pattern' ? patternHint(settings.pattern, letterCount) : SHAPE_LABELS[settings.shape].hint}
        </small>
      </div>

      <Choice
        legend="Pronounceable"
        value={settings.sayable}
        options={SAYABILITIES.map((value) => ({ value, label: SAYABLE_LABELS[value].label }))}
        onChange={(sayable) => onSettings({ sayable })}
        hint={SAYABLE_LABELS[settings.sayable].hint}
      />
    </>
  );
}

/** Which word list, and for phrases, how many words. */
function WordListChoice({ settings, onSettings }: PartProps) {
  const id = useId();
  return (
    <>
      <Choice
        legend="Word list"
        value={settings.wordList}
        options={WORD_LISTS.map((value) => ({ value, label: LIST_LABELS[value].label }))}
        onChange={(wordList) => onSettings({ wordList })}
        hint={LIST_LABELS[settings.wordList].hint}
      />
      {settings.mode === 'words' && (
        <div className="field">
          <label className="label" htmlFor={`${id}-most`}>
            Most words
          </label>
          <select id={`${id}-most`} value={settings.maxWords} onChange={(event) => onSettings({ maxWords: Number(event.target.value) })}>
            {MOST_WORDS.map((count) => (
              <option key={count} value={count}>
                {count === 1 ? '1 word' : `${count} words`}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}

/** The rules a scramble follows, and what counts as a letter. */
function ScrambleOptions({ settings, onSettings }: PartProps) {
  return (
    <>
      <fieldset>
        <legend className="label">Letters</legend>
        <div className="checks">
          <Check checked={settings.keepFirst} onChange={(keepFirst) => onSettings({ keepFirst })}>
            Keep each word’s first letter
          </Check>
          <Check checked={settings.keepLast} onChange={(keepLast) => onSettings({ keepLast })}>
            Keep each word’s last letter
          </Check>
          <Check checked={settings.moveEvery} onChange={(moveEvery) => onSettings({ moveEvery })}>
            Move every letter
          </Check>
          <Check
            checked={settings.partNeighbours}
            onChange={(partNeighbours) => onSettings({ partNeighbours })}
            hint="Letters side by side in a word don’t end up side by side again."
          >
            Part old neighbours
          </Check>
        </div>
      </fieldset>

      <Choice
        legend="Punctuation"
        value={settings.punctuation}
        options={[
          { value: 'drop', label: 'Leave out' },
          { value: 'keep', label: 'Keep in place' },
        ]}
        onChange={(punctuation) => onSettings({ punctuation })}
      />

      <Choice
        legend="Digits"
        value={settings.digits}
        options={[
          { value: 'scramble', label: 'Scramble' },
          { value: 'drop', label: 'Leave out' },
        ]}
        onChange={(digits) => onSettings({ digits })}
      />

      <Choice
        legend="Accents"
        value={settings.accents}
        options={[
          { value: 'keep', label: 'Keep' },
          { value: 'fold', label: 'Take off' },
        ]}
        onChange={(accents) => onSettings({ accents })}
        hint={settings.accents === 'fold' ? 'É becomes E, and Æ becomes AE.' : undefined}
      />
    </>
  );
}

/** What a phrase may and mustn't have, and the game master's own words. */
function WordOptions({ settings, onSettings }: PartProps) {
  const id = useId();
  return (
    <>
      {settings.mode === 'words' && (
        <>
          <div className="field">
            <label className="label" htmlFor={`${id}-shortest`}>
              Shortest word
            </label>
            <select id={`${id}-shortest`} value={settings.minLength} onChange={(event) => onSettings({ minLength: Number(event.target.value) })}>
              {SHORTEST_WORDS.map((length) => (
                <option key={length} value={length}>
                  {length === 1 ? '1 letter' : `${length} letters`}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor={`${id}-include`}>
              Put in
            </label>
            <input
              id={`${id}-include`}
              type="text"
              aria-describedby={`${id}-include-hint`}
              autoComplete="off"
              spellCheck={false}
              value={settings.include}
              onChange={(event) => onSettings({ include: event.target.value })}
            />
            <small className="hint" id={`${id}-include-hint`}>
              Words every phrase must have.
            </small>
          </div>

          <div className="field">
            <label className="label" htmlFor={`${id}-exclude`}>
              Leave out
            </label>
            <input
              id={`${id}-exclude`}
              type="text"
              aria-describedby={`${id}-exclude-hint`}
              autoComplete="off"
              spellCheck={false}
              value={settings.exclude}
              onChange={(event) => onSettings({ exclude: event.target.value })}
            />
            <small className="hint" id={`${id}-exclude-hint`}>
              Words no phrase may have.
            </small>
          </div>

          <div className="checks">
            <Check
              checked={settings.allowOwn}
              onChange={(allowOwn) => onSettings({ allowOwn })}
              hint="Otherwise they’re left out, and pieces of them put last."
            >
              Use the text’s own words
            </Check>
          </div>
        </>
      )}

      <div className="field">
        <label className="label" htmlFor={`${id}-yours`}>
          Your words
        </label>
        <textarea
          id={`${id}-yours`}
          rows={3}
          aria-describedby={`${id}-yours-hint`}
          spellCheck={false}
          placeholder="Strahd, Barovia"
          value={settings.yourWords}
          onChange={(event) => onSettings({ yourWords: event.target.value })}
        />
        <small className="hint" id={`${id}-yours-hint`}>
          Names and places from your game, for phrases to use too. They’re kept in this browser.
        </small>
      </div>
    </>
  );
}

/** What a pattern of word lengths comes to, beside the text's letters. */
function patternHint(pattern: string, letters: number): string {
  const lengths = parsePattern(pattern);
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const has = `The text has ${letters} ${letters === 1 ? 'letter' : 'letters'}.`;
  if (lengths.length === 0 || letters === 0 || total === letters) return `Word lengths, like 3-4-3. ${has}`;
  return `That makes ${total} ${total === 1 ? 'letter' : 'letters'}. ${has}`;
}

interface ChoiceProps<T extends string> {
  legend: string;
  /** The one chosen, or null for none of them. */
  value: T | null;
  /** Each choice, with a name for screen readers where its label is only an example. */
  options: readonly { value: T; label: string; name?: string }[];
  onChange: (value: T) => void;
  hint?: string;
}

/** A row of buttons, one of them chosen. */
function Choice<T extends string>({ legend, value, options, onChange, hint }: ChoiceProps<T>) {
  const id = useId();
  return (
    <fieldset aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend className="label">{legend}</legend>
      <div className="segmented">
        {options.map((option) => (
          <label key={option.value} title={option.name}>
            <input
              type="radio"
              name={id}
              value={option.value}
              aria-label={option.name}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {hint && (
        <small className="hint" id={`${id}-hint`}>
          {hint}
        </small>
      )}
    </fieldset>
  );
}

interface CheckProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  children: ReactNode;
}

function Check({ checked, onChange, hint, children }: CheckProps) {
  const id = useId();
  return (
    <div className="check-row">
      <label className="check">
        <input type="checkbox" checked={checked} aria-describedby={hint ? id : undefined} onChange={(event) => onChange(event.target.checked)} />
        {children}
      </label>
      {hint && (
        <small className="hint" id={id}>
          {hint}
        </small>
      )}
    </div>
  );
}
