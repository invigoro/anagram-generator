import { useId, type ReactNode } from 'react';
import type { LetterCase } from '../engine/format';
import type { Order, Shape } from '../engine/scramble';
import {
  COUNTS,
  DIFFICULTIES,
  DIFFICULTY_RULES,
  difficultyOf,
  ORDERS,
  parsePattern,
  SHAPES,
  WORD_COUNTS,
  type Difficulty,
  type Settings,
  type Spacing,
} from './settings';

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

interface ControlsProps {
  text: string;
  onText: (text: string) => void;
  settings: Settings;
  onSettings: (changes: Partial<Settings>) => void;
  /** How many letters the text has, for the pattern's hint. */
  letterCount: number;
  seed: number;
  onReroll: () => void;
}

export function Controls({ text, onText, settings, onSettings, letterCount, seed, onReroll }: ControlsProps) {
  const id = useId();
  const difficulty = difficultyOf(settings);
  return (
    <div className="controls">
      <div className="field">
        <label className="label" htmlFor={`${id}-text`}>
          Word or phrase
        </label>
        {/* A password shouldn't be corrected, or sent off to be spell-checked. */}
        <input
          id={`${id}-text`}
          type="text"
          value={text}
          placeholder="Open sesame"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => onText(event.target.value)}
        />
      </div>

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
        legend="Case"
        value={settings.letterCase}
        options={CASES}
        onChange={(letterCase) => onSettings({ letterCase })}
      />

      <Choice
        legend="Show"
        value={settings.spacing}
        options={SPACINGS}
        onChange={(spacing) => onSettings({ spacing })}
      />

      <details className="more">
        <summary>More options</summary>
        <div className="more-options">
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
              {ORDER_LABELS[settings.order].hint}
            </small>
          </div>
        </div>
      </details>

      <div className="reroll-row">
        <button type="button" className="reroll" onClick={onReroll}>
          <span aria-hidden="true">🎲</span> Reroll
        </button>
        <span className="seed" title="The same seed, text and settings always give the same arrangements">
          Seed {seed}
        </span>
      </div>
    </div>
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
