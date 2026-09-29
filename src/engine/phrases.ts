import { solve, wordsWithin, type Phrase, type Solution } from './solver';
import type { Dictionary } from './words';

/**
 * Everything around the search for phrases: the words a phrase may not use (the text's own), the
 * ones that give it away (pieces of the text's words), and the words every phrase must have.
 */

export interface PhraseRequest {
  /** The text's letters, in capitals with their accents off. */
  letters: readonly string[];
  /** The text's words, in capitals. */
  textWords: readonly string[];
  maxWords: number;
  minLength: number;
  /** Words every phrase must have. */
  include: readonly string[];
  /** Words no phrase may have. */
  exclude: readonly string[];
  /** Whether the text's own words, and pieces of them, are as good as any others. */
  allowOwn: boolean;
  limit: number;
  budget: number;
  /** How many single words that fit in the letters to list too, for writing an anagram by hand. */
  within?: number;
}

export interface PhraseResult extends Solution {
  /** A word to include whose letters aren't all in the text, if there's one. */
  missing: string | null;
  /** Words that fit in the letters, when asked for. */
  within: string[];
}

/**
 * What a word of each rank costs a phrase, in the order the lists are given to the dictionary: the
 * game master's own words, then ESDB's sizes 35, 50, 60 and 70.
 */
export const RANK_COSTS: readonly number[] = [0, 0, 1, 2.5, 4];

/** Words from a list typed by hand, in capitals, each once: "Strahd, Barovia; ireena" gives STRAHD, BAROVIA and IREENA. */
export function wordsIn(text: string): string[] {
  const words = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((word) => word !== '');
  return [...new Set(words)];
}

/** The text's own words, with their plurals and singulars: a phrase never uses them unless asked. */
export function ownWords(words: readonly string[]): Set<string> {
  const own = new Set<string>();
  for (const word of words) {
    own.add(word).add(`${word}S`).add(`${word}ES`);
    if (word.endsWith('S')) own.add(word.slice(0, -1));
    if (word.endsWith('ES')) own.add(word.slice(0, -2));
  }
  return own;
}

/** Pieces of the text's words, three letters or more, read either way: PASS and WORD give PASSWORD away. */
export function giveawaysOf(words: readonly string[]): Set<string> {
  const pieces = new Set<string>();
  for (const word of words) {
    for (let start = 0; start < word.length; start++) {
      for (let end = start + 3; end <= word.length; end++) {
        const piece = word.slice(start, end);
        pieces.add(piece).add([...piece].reverse().join(''));
      }
    }
  }
  return pieces;
}

/** A phrase with the words that had to be in it put back, longest first like the rest. */
const withIncluded = (phrase: Phrase, include: readonly string[]): Phrase => ({
  ...phrase,
  words: [...include, ...phrase.words].sort((a, b) => b.length - a.length || a.localeCompare(b, 'en')),
});

/** Phrases of real words in a text's letters, following the request. */
export function* findPhrases(dict: Dictionary, request: PhraseRequest): Generator<void, PhraseResult> {
  const letters = [...request.letters];
  for (const word of request.include) {
    for (const letter of word) {
      const at = letters.indexOf(letter);
      if (at < 0) return { phrases: [], nearMisses: [], exhausted: true, missing: word, within: [] };
      letters.splice(at, 1);
    }
  }
  const exclude = new Set(request.exclude);
  if (!request.allowOwn) for (const word of ownWords(request.textWords)) exclude.add(word);
  const within = request.within ? wordsWithin(dict, letters, request.within, Math.max(2, request.minLength), exclude) : [];

  const words = request.maxWords - request.include.length;
  if (letters.length === 0) {
    return { phrases: [{ words: [...request.include], leftover: [], score: 0 }], nearMisses: [], exhausted: true, missing: null, within };
  }
  if (words <= 0) {
    return { phrases: [], nearMisses: [{ words: [...request.include], leftover: letters, score: 0 }], exhausted: true, missing: null, within };
  }
  const solution = yield* solve(dict, {
    letters,
    maxWords: words,
    minLength: request.minLength,
    exclude,
    limit: request.limit,
    budget: request.budget,
    rankCosts: RANK_COSTS,
    giveaways: request.allowOwn ? undefined : giveawaysOf(request.textWords),
  });
  return {
    phrases: solution.phrases.map((phrase) => withIncluded(phrase, request.include)),
    nearMisses: solution.nearMisses.map((phrase) => withIncluded(phrase, request.include)),
    exhausted: solution.exhausted,
    missing: null,
    within,
  };
}
