import { describe, expect, it } from 'vitest';
import { asText, formatWords } from './format';
import { readText } from './letters';

const keep = { punctuation: 'keep', digits: 'scramble', accents: 'keep' } as const;
const plain = (words: string[][]) => words.map((word) => word.join(''));

describe('formatWords', () => {
  it('splits the letters into words, in the case asked for', () => {
    const letters = [...'PNOEASEMSE'];
    expect(plain(formatWords(letters, [4, 6], [], 'upper'))).toEqual(['PNOE', 'ASEMSE']);
    expect(plain(formatWords(letters, [4, 6], [], 'lower'))).toEqual(['pnoe', 'asemse']);
    expect(plain(formatWords(letters, [4, 6], [], 'title'))).toEqual(['Pnoe', 'Asemse']);
    expect(plain(formatWords(letters, [3, 4, 3], [], 'title'))).toEqual(['Pno', 'Ease', 'Mse']);
  });

  it('puts punctuation back after the same number of letters', () => {
    const { marks } = readText("Don't panic!", keep);
    expect(asText(formatWords([...'TONDCINAP'], [4, 5], marks, 'upper'), false)).toBe("TON'D CINAP!");
  });

  it('keeps punctuation with the word it went with, where it falls between words', () => {
    const { marks } = readText('(Open) — sesame!', keep);
    expect(asText(formatWords([...'PNOEASEMSE'], [4, 6], marks, 'title'), false)).toBe('(Pnoe) — Asemse!');
    // Run together, it stays after the same letters.
    expect(asText(formatWords([...'PNOEASEMSE'], [10], marks, 'upper'), false)).toBe('(PNOE)—ASEMSE!');
  });

  it('keeps punctuation inside a word when the words are split anew', () => {
    const { marks } = readText("Don't", keep);
    expect(asText(formatWords([...'TOND'], [2, 2], marks, 'upper'), false)).toBe("TO N'D");
  });
});

describe('asText', () => {
  it('puts a space between words, or spaces every character out', () => {
    const words = [['N', "'", 'T'], ['A', 'B']];
    expect(asText(words, false)).toBe("N'T AB");
    expect(asText(words, true)).toBe("N ' T   A B");
  });
});
