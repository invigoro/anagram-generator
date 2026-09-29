import { describe, expect, it } from 'vitest';
import { inPlace, longestRun, neighbourPairs, neighboursKept, pairOf, piecesOf } from './difficulty';

const letters = [...'OPENSESAME'];
const words = [4, 6];

describe('neighbourPairs', () => {
  it('finds the letters side by side in each word, either way round', () => {
    const pairs = neighbourPairs(letters, words);
    expect(pairs.has(pairOf('O', 'P'))).toBe(true);
    expect(pairs.has(pairOf('P', 'O'))).toBe(true);
    // N ends OPEN and S starts SESAME, so they're not side by side in a word.
    expect(pairs.has(pairOf('N', 'S'))).toBe(false);
  });
});

describe('inPlace', () => {
  it('counts the letters left where they were', () => {
    expect(inPlace(letters, [...'OPENEMASES'])).toBe(4);
    expect(inPlace(letters, [...'PNOEASEMSE'])).toBe(1);
    expect(inPlace(letters, [...'PNOEEMASES'])).toBe(0);
  });
});

describe('neighboursKept', () => {
  const pairs = neighbourPairs(letters, words);

  it('counts old neighbours still side by side, either way round', () => {
    // Each word backwards keeps every pair.
    expect(neighboursKept(pairs, [...'NEPOEMASES'], words)).toBe(8);
    expect(neighboursKept(pairs, [...'PNOEEEASMS'], words)).toBe(1);
  });

  it('only counts pairs within a word', () => {
    // The O and P either side of the break aren't side by side in a word.
    expect(neighboursKept(pairs, [...'NEOPSESAME'], [3, 7])).toBe(neighboursKept(pairs, [...'NEOPSESAME'], [10]) - 1);
  });
});

describe('longestRun', () => {
  const pieces = piecesOf(letters, words);

  it('finds the longest piece of the text left whole', () => {
    expect(longestRun(pieces, [...'OPENASEMSE'], words)).toBe(4);
    expect(longestRun(pieces, [...'PNOEAMESSE'], words)).toBe(3);
    expect(longestRun(pieces, [...'PNOEEMSSAE'], words)).toBe(2);
  });

  it('counts a piece read backwards as well', () => {
    expect(longestRun(piecesOf([...'OPEN'], [4]), [...'NEPO'], [4])).toBe(4);
    expect(longestRun(pieces, [...'NEPOEMASES'], words)).toBe(6);
  });
});
