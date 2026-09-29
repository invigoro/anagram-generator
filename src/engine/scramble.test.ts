import { describe, expect, it } from 'vitest';
import { LETTER_MODEL } from '../data/words/letters';
import { neighbourPairs, neighboursKept } from './difficulty';
import { readText } from './letters';
import { decodeModel, sayCost } from './pronounce';
import { mulberry32 } from './rng';
import { arrangements, countArrangements, scramble, type Arrangement, type Order, type Rules } from './scramble';

const letters = (text: string) => [...text];
/** The letters in alphabetical order: the same for any two arrangements of the same letters. */
const sorted = (text: string | readonly string[]) => [...text].sort().join('');
const listed = (text: string) => Array.from(arrangements(letters(text)), (arrangement) => arrangement.join(''));

/** Scrambles with no rules but the shape, unless told otherwise. */
const RUN: Rules = { shape: 'run', wordCount: 2, pattern: [], keepFirst: false, keepLast: false, moveEvery: false, partNeighbours: false };
function scrambled(text: string, rules: Partial<Rules> = {}, count = 50, seed = 1, order: Order = 'shuffled') {
  return scramble(readText(text), { ...RUN, ...rules }, { count, order }, mulberry32(seed));
}
const joined = (arrangement: Arrangement) => arrangement.letters.join('');
/** An arrangement's words, as strings. */
function wordsIn(arrangement: Arrangement): string[] {
  let start = 0;
  return arrangement.words.map((length) => arrangement.letters.slice(start, (start += length)).join(''));
}
/** How many arrangements of `text` leave no letter where it was, counted by looking at every one. */
const derangements = (text: string) => listed(text).filter((arrangement) => [...arrangement].every((letter, i) => letter !== text[i])).length;

describe('countArrangements', () => {
  it('counts different arrangements, not orders of the same letters', () => {
    expect(countArrangements(letters('ABC'))).toBe(6);
    expect(countArrangements(letters('AAB'))).toBe(3);
    expect(countArrangements(letters('PASSWORD'))).toBe(20_160);
    expect(countArrangements(letters('MISSISSIPPI'))).toBe(34_650);
  });

  it('counts one arrangement of nothing, of one letter, or of one letter repeated', () => {
    expect(countArrangements([])).toBe(1);
    expect(countArrangements(['A'])).toBe(1);
    expect(countArrangements(letters('AAAA'))).toBe(1);
  });

  it('stops counting at the cap', () => {
    const alphabet = letters('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(countArrangements(alphabet, 1000)).toBe(1000);
    expect(countArrangements(alphabet)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('arrangements', () => {
  it('lists every different arrangement once, in alphabetical order', () => {
    expect(listed('BAA')).toEqual(['AAB', 'ABA', 'BAA']);
    expect(listed('CAB')).toEqual(['ABC', 'ACB', 'BAC', 'BCA', 'CAB', 'CBA']);
    expect(listed('')).toEqual(['']);
  });

  it('lists as many as it counts', () => {
    for (const text of ['BANANA', 'LISTEN', 'AABBCC', 'MISSISSIPPI']) {
      const all = listed(text);
      expect(all).toHaveLength(countArrangements(letters(text)));
      expect(new Set(all).size).toBe(all.length);
      for (const arrangement of all) expect(sorted(arrangement)).toBe(sorted(text));
    }
  });
});

describe('scramble', () => {
  it('rearranges the letters, never into their own order, and never the same way twice', () => {
    const found = scrambled('PASSWORD').arrangements.map(joined);
    expect(found).toHaveLength(50);
    expect(new Set(found).size).toBe(50);
    expect(found).not.toContain('PASSWORD');
    for (const arrangement of found) expect(sorted(arrangement)).toBe(sorted('PASSWORD'));
  });

  it('keeps every letter, whatever the seed', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const arrangement of scrambled('Open sesame', {}, 5, seed).arrangements) expect(sorted(arrangement.letters)).toBe(sorted('OPENSESAME'));
    }
  });

  it('counts the arrangements besides the letters’ own order', () => {
    expect(scrambled('Open sesame').others).toBe(302_399);
  });

  it('gives every arrangement when there are only a few', () => {
    const result = scrambled('CAT');
    expect(result.others).toBe(5);
    expect(result.arrangements.map(joined).sort()).toEqual(['ACT', 'ATC', 'CTA', 'TAC', 'TCA']);
    expect(result.complete).toBe(true);
  });

  it('has nothing to give when every arrangement is the same', () => {
    for (const text of ['', 'A', 'AAA']) expect(scrambled(text)).toMatchObject({ arrangements: [], others: 0, complete: true });
  });

  it('never spells a slur or a swear word', () => {
    const hits = scrambled('HITS');
    expect(hits.arrangements).toHaveLength(22);
    expect(hits.arrangements.map(joined)).not.toContain('SHIT');
    expect(hits.complete).toBe(true);
    // The worst are kept out from inside longer runs of letters too, whether the arrangements are
    // listed (720 of them) or shuffled for (362,880, where about 1 in 500 would have it).
    for (const text of ['FUCKAB', 'FUCKABDEG']) {
      for (let seed = 0; seed < 50; seed++) {
        for (const arrangement of scrambled(text, {}, 50, seed).arrangements) expect(joined(arrangement)).not.toContain('FUCK');
      }
    }
  });

  it('says whether it has every arrangement', () => {
    expect(scrambled('CAT').complete).toBe(true);
    expect(scrambled('CAT', {}, 3).complete).toBe(false);
    expect(scrambled('PASSWORD').complete).toBe(false);
  });

  it('is reproducible from the seed', () => {
    for (const rules of [{}, { shape: 'words', moveEvery: true }, { moveEvery: true, partNeighbours: true }] as Partial<Rules>[]) {
      const first = scrambled('Listen here', rules, 20, 8);
      expect(scrambled('Listen here', rules, 20, 8)).toEqual(first);
      expect(scrambled('Listen here', rules, 20, 9).arrangements).not.toEqual(first.arrangements);
    }
  });

  // Sorting with a random comparison, as the first version of this page did, favours some
  // arrangements over others. These check that each is as likely as any other.
  it('picks fairly from a listed few', () => {
    // ABBC has 12 arrangements: 11 besides its own.
    const runs = 22_000;
    const picks = new Map<string, number>();
    for (let seed = 0; seed < runs; seed++) {
      const first = joined(scrambled('ABBC', {}, 1, seed).arrangements[0]);
      picks.set(first, (picks.get(first) ?? 0) + 1);
    }
    expect(picks.size).toBe(11);
    for (const count of picks.values()) expect(Math.abs(count - runs / 11)).toBeLessThan((runs / 11) * 0.1);
  });

  it('shuffles fairly when there are too many to list', () => {
    // Each of ABCDEFGH's 40,320 arrangements is as likely as any other, so each letter should
    // start an eighth of them.
    const runs = 16_000;
    const starts = new Map<string, number>();
    for (let seed = 0; seed < runs; seed++) {
      const first = scrambled('ABCDEFGH', {}, 1, seed).arrangements[0].letters[0];
      starts.set(first, (starts.get(first) ?? 0) + 1);
    }
    expect(starts.size).toBe(8);
    for (const count of starts.values()) expect(Math.abs(count - runs / 8)).toBeLessThan((runs / 8) * 0.1);
  });
});

describe('shapes', () => {
  it('runs the words together', () => {
    for (const arrangement of scrambled('Open sesame').arrangements) expect(arrangement.words).toEqual([10]);
  });

  it('scrambles each word on its own', () => {
    const result = scrambled('Open sesame', { shape: 'words' });
    expect(result.others).toBe(24 * 180 - 1);
    for (const arrangement of result.arrangements) {
      const [open, sesame] = wordsIn(arrangement);
      expect(sorted(open)).toBe(sorted('OPEN'));
      expect(sorted(sesame)).toBe(sorted('SESAME'));
    }
  });

  it('keeps the words’ lengths but mixes the letters across them', () => {
    const result = scrambled('Open sesame', { shape: 'lengths' });
    for (const arrangement of result.arrangements) expect(arrangement.words).toEqual([4, 6]);
    expect(result.arrangements.some((arrangement) => sorted(wordsIn(arrangement)[0]) !== sorted('OPEN'))).toBe(true);
  });

  it('splits into a number of words, of two letters or more each, split every which way', () => {
    const result = scrambled('Open sesame', { shape: 'count', wordCount: 3 });
    for (const arrangement of result.arrangements) {
      expect(arrangement.words).toHaveLength(3);
      expect(arrangement.words.reduce((total, length) => total + length, 0)).toBe(10);
      for (const length of arrangement.words) expect(length).toBeGreaterThanOrEqual(2);
    }
    expect(new Set(result.arrangements.map((arrangement) => arrangement.words.join('-'))).size).toBeGreaterThan(3);
  });

  it('lists every split when there are only a few', () => {
    // Five other arrangements of CAT, each split two ways: C AT and CA T.
    const result = scrambled('CAT', { shape: 'count', wordCount: 2 });
    expect(result.others).toBe(10);
    expect(result.arrangements).toHaveLength(10);
    expect(result.complete).toBe(true);
    expect(result.arrangements.map((arrangement) => wordsIn(arrangement).join(' '))).not.toContain('CA T');
  });

  it('splits to a pattern', () => {
    for (const arrangement of scrambled('Open sesame', { shape: 'pattern', pattern: [3, 4, 3] }).arrangements) {
      expect(arrangement.words).toEqual([3, 4, 3]);
    }
  });

  it('says when a pattern doesn’t add up to the letters', () => {
    expect(scrambled('Open sesame', { shape: 'pattern', pattern: [3, 4] })).toMatchObject({
      arrangements: [],
      shortfalls: [{ kind: 'pattern', letters: 10 }],
    });
  });
});

describe('rules', () => {
  it('keeps each word’s first or last letter where it is', () => {
    for (const shape of ['words', 'run'] as const) {
      for (const arrangement of scrambled('Open sesame', { shape, keepFirst: true }).arrangements) {
        expect([arrangement.letters[0], arrangement.letters[4]]).toEqual(['O', 'S']);
      }
      for (const arrangement of scrambled('Open sesame', { shape, keepLast: true }).arrangements) {
        expect([arrangement.letters[3], arrangement.letters[9]]).toEqual(['N', 'E']);
      }
    }
  });

  it('moves every letter, and counts the arrangements that do', () => {
    const result = scrambled('Open sesame', { shape: 'words', moveEvery: true });
    expect(result.fitting).toBe(derangements('OPEN') * derangements('SESAME'));
    for (const arrangement of result.arrangements) expect(arrangement.inPlace).toBe(0);
    expect(result.shortfalls).toEqual([]);
  });

  it('moves every letter of a text with too many arrangements to list', () => {
    const result = scrambled('The key lies beneath the altar', { moveEvery: true });
    expect(result.arrangements).toHaveLength(50);
    for (const arrangement of result.arrangements) expect(arrangement.inPlace).toBe(0);
  });

  it('leaves a word that can’t change alone, without calling it a shortfall', () => {
    const result = scrambled('I am', { shape: 'words', moveEvery: true });
    expect(result.arrangements.map((arrangement) => wordsIn(arrangement).join(' '))).toEqual(['I MA']);
    expect(result.shortfalls).toEqual([]);
  });

  it('says which letters can’t all move, and gives the closest', () => {
    const result = scrambled('Aab tree', { shape: 'words', moveEvery: true });
    expect(result.shortfalls).toContainEqual({ kind: 'move', letter: 'A', word: 'AAB' });
    expect(result.arrangements.length).toBeGreaterThan(0);
    for (const arrangement of result.arrangements) expect(arrangement.inPlace).toBe(1);
  });

  it('parts old neighbours, and moves every letter too', () => {
    const pairs = neighbourPairs([...'OPENSESAME'], [4, 6]);
    const result = scrambled('Open sesame', { moveEvery: true, partNeighbours: true });
    expect(result.arrangements).toHaveLength(50);
    expect(result.shortfalls).toEqual([]);
    for (const arrangement of result.arrangements) {
      expect(arrangement.inPlace).toBe(0);
      expect(neighboursKept(pairs, arrangement.letters, arrangement.words)).toBe(0);
    }
  });

  it('says when old neighbours can’t all be parted', () => {
    // SESAME's E can sit by nothing but A or E, and its S by nothing but M or S.
    expect(scrambled('Sesame', { shape: 'words', partNeighbours: true }).shortfalls).toEqual([{ kind: 'neighbours' }]);
  });
});

describe('sayable scrambles', () => {
  const model = decodeModel(LETTER_MODEL);
  const sayable = (level: 'some' | 'very') => ({ model, level });
  /** Scrambles in no particular order, so without sayability they're a random pick. */
  function average(text: string, rules: Partial<Rules>, level?: 'some' | 'very') {
    const shown = scramble(readText(text), { ...RUN, ...rules }, { count: 25, order: 'shuffled', sayable: level && sayable(level) }, mulberry32(3)).arrangements;
    return { shown, cost: shown.reduce((sum, arrangement) => sum + sayCost(model, arrangement.letters, arrangement.words), 0) / shown.length };
  }

  it('reads more like words than a random pick', () => {
    for (const [text, rules] of [
      ['Open sesame', { shape: 'words', moveEvery: true }],
      ['The key lies beneath the altar', { moveEvery: true }],
      ['Speak friend and enter', { shape: 'lengths' }],
    ] as [string, Partial<Rules>][]) {
      const [off, some, very] = [average(text, rules), average(text, rules, 'some'), average(text, rules, 'very')];
      expect(some.cost).toBeLessThan(off.cost);
      expect(very.cost).toBeLessThan(off.cost);
      expect(very.shown).toHaveLength(25);
    }
  });

  it('leaves fewer pieces of the text whole very sayable than somewhat, and reads more like words', () => {
    // Pieces of the text (THE, SES) read like English, so they flatter somewhat's sayability; very
    // puts them last, which costs it a little elsewhere.
    const whole = (shown: Arrangement[]) => shown.filter((arrangement) => arrangement.longestRun > 2).length;
    for (const [text, rules] of [
      ['Open sesame', { shape: 'words', moveEvery: true }],
      ['The key lies beneath the altar', { moveEvery: true }],
      ['Speak friend and enter', { shape: 'lengths' }],
    ] as [string, Partial<Rules>][]) {
      expect(whole(average(text, rules, 'very').shown)).toBeLessThanOrEqual(whole(average(text, rules, 'some').shown));
    }
    expect(average('Speak friend and enter', { shape: 'lengths' }, 'very').cost).toBeLessThan(
      average('Speak friend and enter', { shape: 'lengths' }, 'some').cost,
    );
  });

  it('still follows the rules, and keeps every letter', () => {
    const { shown } = average('The key lies beneath the altar', { moveEvery: true, partNeighbours: true }, 'very');
    const pairs = neighbourPairs([...'THEKEYLIESBENEATHTHEALTAR'], [3, 3, 4, 7, 3, 5]);
    for (const arrangement of shown) {
      expect(arrangement.inPlace).toBe(0);
      expect(neighboursKept(pairs, arrangement.letters, arrangement.words)).toBe(0);
      expect(sorted(arrangement.letters)).toBe(sorted('THEKEYLIESBENEATHTHEALTAR'));
    }
  });

  it('puts last any that leave a piece of the text whole, however sayable', () => {
    // SESAME backwards, EMASES, is among the most sayable of its arrangements.
    const shown = scramble(readText('Sesame'), { ...RUN, shape: 'words', moveEvery: true }, { count: 25, order: 'best', sayable: sayable('very') }, mulberry32(3))
      .arrangements;
    expect(shown[0].longestRun).toBeLessThanOrEqual(2);
    const firstWhole = shown.findIndex((arrangement) => arrangement.longestRun > 2);
    expect(firstWhole).toBeGreaterThan(0);
    for (const arrangement of shown.slice(firstWhole)) expect(arrangement.longestRun).toBeGreaterThan(2);
    expect(shown.map(joined).indexOf('EMASES')).not.toBeLessThan(firstWhole);
  });

  it('is reproducible from the seed', () => {
    const once = scramble(readText('Open sesame'), { ...RUN, moveEvery: true }, { count: 10, order: 'best', sayable: sayable('some') }, mulberry32(4));
    expect(scramble(readText('Open sesame'), { ...RUN, moveEvery: true }, { count: 10, order: 'best', sayable: sayable('some') }, mulberry32(4))).toEqual(once);
  });
});

describe('order', () => {
  it('puts first those that give away least', () => {
    const shown = scrambled('Open sesame', { shape: 'words' }, 50, 1, 'best').arrangements;
    for (let i = 1; i < shown.length; i++) {
      const [a, b] = [shown[i - 1], shown[i]];
      expect(a.longestRun < b.longestRun || (a.longestRun === b.longestRun && a.neighboursKept <= b.neighboursKept)).toBe(true);
    }
  });

  it('sorts from A to Z', () => {
    const shown = scrambled('Open sesame', { shape: 'words' }, 50, 1, 'az').arrangements.map((arrangement) => wordsIn(arrangement).join(' '));
    expect(shown).toEqual([...shown].sort());
  });
});
