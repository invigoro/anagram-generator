import { describe, expect, it } from 'vitest';
import { hintLadder, hintText } from './hints';
import { readText } from './letters';

const read = (text: string) => readText(text, { punctuation: 'drop', digits: 'scramble', accents: 'fold' });
const ladder = (text: string) => hintLadder(read(text)).map(hintText);

describe('hintLadder', () => {
  it('gives the word lengths, then first letters, then a letter at a time from each word in turn', () => {
    expect(ladder('Open sesame').slice(0, 5)).toEqual([
      '_ _ _ _   _ _ _ _ _ _',
      'O _ _ _   S _ _ _ _ _',
      'O P _ _   S _ _ _ _ _',
      'O P _ _   S E _ _ _ _',
      'O P E _   S E _ _ _ _',
    ]);
  });

  it('always leaves one letter to find', () => {
    const hints = ladder('Open sesame');
    expect(hints.at(-1)).toBe('O P E N   S E S A M _');
    expect(hints).toHaveLength(9);
    expect(ladder('cat')).toEqual(['_ _ _', 'C _ _', 'C A _']);
  });

  it('stops at first letters when they’d leave nothing else to find', () => {
    expect(ladder('I am')).toEqual(['_   _ _', 'I   A _']);
    expect(ladder('a b')).toEqual(['_   _']);
  });

  it('has nothing to give for a single letter', () => {
    expect(ladder('A')).toEqual([]);
    expect(ladder('')).toEqual([]);
  });
});
