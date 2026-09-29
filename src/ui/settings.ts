import type { WordList } from '../data/words';
import type { LetterCase } from '../engine/format';
import { DEFAULT_LETTER_OPTIONS, type LetterOptions } from '../engine/letters';
import type { Order, Rules, Shape } from '../engine/scramble';

/** How the arrangements are shown: letters together, spaced out, or on tiles. */
export type Spacing = 'together' | 'spaced' | 'tiles';

/** What the page makes: scrambles, phrases of real words, or an anagram written by hand. */
export type Mode = 'scramble' | 'words' | 'hand';
export const MODES: readonly Mode[] = ['scramble', 'words', 'hand'];

/** Everything the page lets you choose, besides the text and the seed. */
export interface Settings extends LetterOptions {
  mode: Mode;
  /** For real words: which list, how many words at most, and how short a word may be. */
  wordList: WordList;
  maxWords: number;
  minLength: number;
  /** Words every phrase must have, and words none may, as typed. */
  include: string;
  exclude: string;
  /** Whether a phrase may use the text's own words, and pieces of them. */
  allowOwn: boolean;
  /** The game master's own words, such as the campaign's names, as typed. */
  yourWords: string;
  shape: Shape;
  /** For the 'count' shape. */
  wordCount: number;
  /** For the 'pattern' shape, as typed: "3-4-3". */
  pattern: string;
  keepFirst: boolean;
  keepLast: boolean;
  moveEvery: boolean;
  partNeighbours: boolean;
  letterCase: LetterCase;
  spacing: Spacing;
  count: number;
  order: Order;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

type DifficultyRules = Pick<Settings, 'shape' | 'keepFirst' | 'keepLast' | 'moveEvery' | 'partNeighbours'>;

/** What each difficulty sets. */
export const DIFFICULTY_RULES: Readonly<Record<Difficulty, DifficultyRules>> = {
  easy: { shape: 'words', keepFirst: true, keepLast: false, moveEvery: false, partNeighbours: false },
  medium: { shape: 'words', keepFirst: false, keepLast: false, moveEvery: true, partNeighbours: false },
  hard: { shape: 'run', keepFirst: false, keepLast: false, moveEvery: true, partNeighbours: true },
};

export const SHAPES: readonly Shape[] = ['words', 'lengths', 'run', 'count', 'pattern'];
export const WORD_COUNTS: readonly number[] = [2, 3, 4, 5, 6, 7, 8];
export const COUNTS: readonly number[] = [10, 25, 50, 100];
export const ORDERS: readonly Order[] = ['best', 'az', 'shuffled'];
export const MOST_WORDS: readonly number[] = [1, 2, 3, 4, 5];
export const SHORTEST_WORDS: readonly number[] = [1, 2, 3, 4, 5];

export const DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_LETTER_OPTIONS,
  mode: 'scramble',
  wordList: 'common',
  maxWords: 3,
  minLength: 2,
  include: '',
  exclude: '',
  allowOwn: false,
  yourWords: '',
  ...DIFFICULTY_RULES.medium,
  wordCount: 3,
  pattern: '',
  letterCase: 'upper',
  spacing: 'together',
  count: 50,
  order: 'best',
};

/** The difficulty the settings amount to, or null for a mix of one's own. */
export function difficultyOf(settings: Settings): Difficulty | null {
  const matches = (difficulty: Difficulty) =>
    (Object.entries(DIFFICULTY_RULES[difficulty]) as [keyof DifficultyRules, unknown][]).every(([key, value]) => settings[key] === value);
  return DIFFICULTIES.find(matches) ?? null;
}

/** Word lengths from a pattern as typed: "3-4-3", "3 4 3" or "3, 4, 3". */
export function parsePattern(pattern: string): number[] {
  return (pattern.match(/\d+/g) ?? []).map(Number).filter((length) => length > 0);
}

export function rulesOf(settings: Settings): Rules {
  return {
    shape: settings.shape,
    wordCount: settings.wordCount,
    pattern: parsePattern(settings.pattern),
    keepFirst: settings.keepFirst,
    keepLast: settings.keepLast,
    moveEvery: settings.moveEvery,
    partNeighbours: settings.partNeighbours,
  };
}

/** Whether the rules leave some arrangements out, beyond fixing letters in place. */
export const isStrict = (settings: Settings) => settings.moveEvery || settings.partNeighbours;
