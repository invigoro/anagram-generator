import { describe, expect, it } from 'vitest';
import { countsOf, keyOf, keyOfCounts, makeDictionary } from './words';

describe('makeDictionary', () => {
  const dict = makeDictionary([['listen', 'silent', 'room'], ['LISTEN', 'dirty', "don't", 'café', 'Room']]);

  it('puts words in capitals, each once, with the rank of the first list it’s in', () => {
    expect(dict.words).toEqual(['LISTEN', 'SILENT', 'ROOM', 'DIRTY']);
    expect([...dict.ranks]).toEqual([0, 0, 0, 1]);
  });

  it('files the words by their letters in alphabetical order', () => {
    expect(dict.byKey.get('EILNST')?.map((i) => dict.words[i])).toEqual(['LISTEN', 'SILENT']);
    expect(dict.byKey.get(keyOf('MOOR'))?.map((i) => dict.words[i])).toEqual(['ROOM']);
  });

  it('counts each word’s letters', () => {
    const room = dict.words.indexOf('ROOM');
    expect(dict.counts['O'.charCodeAt(0) - 65 + room * 26]).toBe(2);
    expect(dict.masks[room]).toBe((1 << 14) | (1 << 17) | (1 << 12));
  });
});

describe('keys and counts', () => {
  it('turn letters into counts and counts into a key', () => {
    expect(keyOfCounts(countsOf([...'DORMITORY']))).toBe(keyOf('DORMITORY'));
    expect(keyOfCounts(countsOf([]))).toBe('');
  });
});
