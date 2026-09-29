import { describe, expect, it } from 'vitest';
import { mulberry32, randomInt, randomSeed, shuffled } from './rng';

const take = (random: () => number, n: number) => Array.from({ length: n }, random);

describe('mulberry32', () => {
  it('gives the same sequence for the same seed', () => {
    expect(take(mulberry32(42), 20)).toEqual(take(mulberry32(42), 20));
  });

  it('gives different sequences for different seeds', () => {
    expect(take(mulberry32(1), 5)).not.toEqual(take(mulberry32(2), 5));
  });

  it('keeps producing the values old share links depend on', () => {
    expect(take(mulberry32(1), 3)).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
  });

  it('stays within [0, 1)', () => {
    for (const value of take(mulberry32(7), 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomSeed', () => {
  it('returns an unsigned 32-bit integer', () => {
    const seed = randomSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});

describe('randomInt', () => {
  it('covers 0 to max - 1 and nothing else', () => {
    const random = mulberry32(3);
    const seen = new Set(Array.from({ length: 1000 }, () => randomInt(random, 6)));
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('shuffled', () => {
  const items = Array.from({ length: 50 }, (_, i) => i);

  it('returns a permutation and leaves the input alone', () => {
    const copy = [...items];
    const result = shuffled(items, mulberry32(9));
    expect(items).toEqual(copy);
    expect([...result].sort((a, b) => a - b)).toEqual(items);
    expect(result).not.toEqual(items);
  });

  it('is reproducible from the seed', () => {
    expect(shuffled(items, mulberry32(5))).toEqual(shuffled(items, mulberry32(5)));
    expect(shuffled(items, mulberry32(5))).not.toEqual(shuffled(items, mulberry32(6)));
  });

  it('handles empty and single-item lists', () => {
    expect(shuffled([], mulberry32(1))).toEqual([]);
    expect(shuffled(['only'], mulberry32(1))).toEqual(['only']);
  });
});
