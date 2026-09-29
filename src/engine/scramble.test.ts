import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import { arrangements, countArrangements, scramble } from './scramble';

const letters = (text: string) => [...text];
/** The letters in alphabetical order: the same for any two arrangements of the same letters. */
const sorted = (text: string) => [...text].sort().join('');
const listed = (text: string) => Array.from(arrangements(letters(text)), (arrangement) => arrangement.join(''));

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
    const found = scramble(letters('PASSWORD'), 50, mulberry32(1)).arrangements;
    expect(found).toHaveLength(50);
    expect(new Set(found).size).toBe(50);
    expect(found).not.toContain('PASSWORD');
    for (const arrangement of found) expect(sorted(arrangement)).toBe(sorted('PASSWORD'));
  });

  it('keeps every letter, whatever the seed', () => {
    for (let seed = 0; seed < 500; seed++) {
      for (const arrangement of scramble(letters('OPENSESAME'), 5, mulberry32(seed)).arrangements) {
        expect(sorted(arrangement)).toBe(sorted('OPENSESAME'));
      }
    }
  });

  it('counts the arrangements besides the letters’ own order', () => {
    expect(scramble(letters('OPENSESAME'), 50, mulberry32(1)).others).toBe(302_399);
  });

  it('gives every arrangement when there are only a few', () => {
    const result = scramble(letters('CAT'), 50, mulberry32(3));
    expect(result.others).toBe(5);
    expect([...result.arrangements].sort()).toEqual(['ACT', 'ATC', 'CTA', 'TAC', 'TCA']);
  });

  it('has nothing to give when every arrangement is the same', () => {
    for (const text of ['', 'A', 'AAA']) {
      expect(scramble(letters(text), 50, mulberry32(1))).toEqual({ arrangements: [], others: 0 });
    }
  });

  it('is reproducible from the seed', () => {
    const first = scramble(letters('LISTEN'), 20, mulberry32(8));
    expect(scramble(letters('LISTEN'), 20, mulberry32(8))).toEqual(first);
    expect(scramble(letters('LISTEN'), 20, mulberry32(9)).arrangements).not.toEqual(first.arrangements);
  });

  // Sorting with a random comparison, as the first version of this page did, favours some
  // arrangements over others. These check that each is as likely as any other.
  it('picks fairly from a listed few', () => {
    // ABBC has 12 arrangements: 11 besides its own.
    const runs = 22_000;
    const picks = new Map<string, number>();
    for (let seed = 0; seed < runs; seed++) {
      const [first] = scramble(letters('ABBC'), 1, mulberry32(seed)).arrangements;
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
      const [first] = scramble(letters('ABCDEFGH'), 1, mulberry32(seed)).arrangements;
      starts.set(first[0], (starts.get(first[0]) ?? 0) + 1);
    }
    expect(starts.size).toBe(8);
    for (const count of starts.values()) expect(Math.abs(count - runs / 8)).toBeLessThan((runs / 8) * 0.1);
  });
});
