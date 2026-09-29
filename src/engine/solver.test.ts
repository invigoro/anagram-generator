import { beforeAll, describe, expect, it } from 'vitest';
import { loadSize } from '../data/words';
import { solveNow, type Query } from './solver';
import { keyOf, makeDictionary, type Dictionary } from './words';

const COSTS = [0, 0, 1, 2.5, 4];
const query = (text: string, changes: Partial<Query> = {}): Query => ({
  letters: [...text.toUpperCase().replace(/\s/g, '')],
  maxWords: 3,
  minLength: 1,
  exclude: new Set(),
  limit: 10_000,
  budget: 5_000_000,
  rankCosts: COSTS,
  ...changes,
});
/** Phrases as sets of words, in a fixed order, to compare. */
const asSets = (phrases: { words: string[] }[]) => phrases.map((phrase) => [...phrase.words].sort().join(' ')).sort();

describe('solve, on a small dictionary', () => {
  const words = ['a', 'at', 'tea', 'eat', 'ate', 'late', 'tale', 'teal', 'stale', 'least', 'steal', 'slate', 'set', 'east', 'seat', 'last', 'salt', 'lest', 'let', 'sat', 'ale', 'sale', 'seal', 'tales', 'as', 'es', 'la', 'ta'];
  const dict = makeDictionary([words]);

  /** Every phrase of up to three words whose letters are exactly the text's, by looking at every one. */
  function everyPhrase(text: string): string[] {
    const key = keyOf(text.toUpperCase());
    const found = new Set<string>();
    const list = dict.words;
    for (let a = 0; a < list.length; a++) {
      if (keyOf(list[a]) === key) found.add(list[a]);
      for (let b = a; b < list.length; b++) {
        if (keyOf(list[a] + list[b]) === key) found.add([list[a], list[b]].sort().join(' '));
        for (let c = b; c < list.length; c++) if (keyOf(list[a] + list[b] + list[c]) === key) found.add([list[a], list[b], list[c]].sort().join(' '));
      }
    }
    return [...found].sort();
  }

  it('finds every phrase there is, each once', () => {
    for (const text of ['steal', 'tales', 'saltate', 'eatlast', 'seatlate']) {
      const solution = solveNow(dict, query(text));
      expect(asSets(solution.phrases)).toEqual(everyPhrase(text));
      expect(solution.exhausted).toBe(true);
    }
  });

  it('keeps to the most words and the shortest word', () => {
    for (const phrase of solveNow(dict, query('saltate', { maxWords: 2 })).phrases) expect(phrase.words.length).toBeLessThanOrEqual(2);
    for (const phrase of solveNow(dict, query('saltate', { minLength: 3 })).phrases) {
      for (const word of phrase.words) expect(word.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('never uses a word it’s told to leave out', () => {
    const phrases = solveNow(dict, query('steal', { exclude: new Set(['STEAL', 'TALES']) })).phrases;
    expect(asSets(phrases)).not.toContain('STEAL');
    expect(asSets(phrases)).toContain('LEAST');
  });

  it('puts one-word phrases and common words first', () => {
    const phrases = solveNow(dict, query('steal')).phrases;
    expect(phrases[0].words).toHaveLength(1);
    for (let i = 1; i < phrases.length; i++) expect(phrases[i].score).toBeGreaterThanOrEqual(phrases[i - 1].score);
  });

  it('stops at the limit, and says it didn’t look everywhere', () => {
    const solution = solveNow(dict, query('seatlate', { limit: 3 }));
    expect(solution.phrases).toHaveLength(3);
    expect(solution.exhausted).toBe(false);
  });

  it('comes as close as it can when no phrase uses every letter', () => {
    const solution = solveNow(dict, query('stealq'));
    expect(solution.phrases).toEqual([]);
    expect(solution.nearMisses.length).toBeGreaterThan(0);
    for (const miss of solution.nearMisses) expect(miss.leftover).toEqual(['Q']);
    expect(asSets(solution.nearMisses)).toContain('STEAL');
  });

  it('leaves over what can’t be in a word, such as digits', () => {
    const solution = solveNow(dict, query('tea4'));
    expect(solution.phrases).toEqual([]);
    expect(solution.nearMisses.map((miss) => miss.leftover)).toContainEqual(['4']);
    expect(asSets(solution.nearMisses)).toContain('TEA');
  });
});

describe('solve, on the common words', () => {
  let common: Dictionary;
  beforeAll(async () => {
    common = makeDictionary([[], await loadSize(35)]);
  });

  it('finds DIRTY ROOM in DORMITORY, near the top', () => {
    const phrases = solveNow(common, query('dormitory', { minLength: 2, exclude: new Set(['DORMITORY']) })).phrases;
    expect(phrases.slice(0, 10).map((phrase) => phrase.words.join(' '))).toContain('DIRTY ROOM');
  });

  it('finds the one-word anagrams of LISTEN first', () => {
    const phrases = solveNow(common, query('listen', { exclude: new Set(['LISTEN']) })).phrases;
    expect(asSets(phrases.filter((phrase) => phrase.words.length === 1))).toEqual(['ENLIST', 'INLETS', 'SILENT', 'TINSEL']);
    expect(phrases[0].words).toHaveLength(1);
  });

  it('gives a long phrase results within its budget', () => {
    const start = performance.now();
    const solution = solveNow(common, query('Speak friend and enter', { minLength: 2, limit: 500, budget: 1_500_000 }));
    expect(solution.phrases.length).toBeGreaterThan(0);
    expect(performance.now() - start).toBeLessThan(3000);
  });

  it('gives the same phrases every time', () => {
    const once = solveNow(common, query('Open sesame', { minLength: 2, limit: 200 }));
    expect(solveNow(common, query('Open sesame', { minLength: 2, limit: 200 }))).toEqual(once);
  });
});
