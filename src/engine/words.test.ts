import { describe, expect, it } from 'vitest';
import { countsOf, keyOf, keyOfCounts, makeDictionary, withWords } from './words';

describe('withWords', () => {
  const list = makeDictionary([[], ['listen', 'silent', 'room']]);

  it('adds words at their rank, filed with the rest', () => {
    const more = withWords(list, ['Strahd', 'tinsel', 'o’brien'], 0);
    expect(more.words).toEqual(['LISTEN', 'SILENT', 'ROOM', 'STRAHD', 'TINSEL']);
    expect([...more.ranks]).toEqual([1, 1, 1, 0, 0]);
    expect(more.byKey.get('EILNST')?.map((i) => more.words[i])).toEqual(['LISTEN', 'SILENT', 'TINSEL']);
    const strahd = more.words.indexOf('STRAHD');
    expect(more.counts['S'.charCodeAt(0) - 65 + strahd * 26]).toBe(1);
    expect(more.masks[strahd]).toBe(makeDictionary([['strahd']]).masks[0]);
  });

  it('gives a word it already has the commoner rank, without adding it twice', () => {
    const more = withWords(list, ['room'], 0);
    expect(more.words).toEqual(list.words);
    expect([...more.ranks]).toEqual([1, 1, 0]);
  });

  it('leaves the list it was given as it was', () => {
    withWords(list, ['strahd', 'room'], 0);
    expect(list.words).toEqual(['LISTEN', 'SILENT', 'ROOM']);
    expect([...list.ranks]).toEqual([1, 1, 1]);
    expect(list.byKey.get('EILNST')).toHaveLength(2);
    expect(withWords(list, [], 0)).toBe(list);
  });
});

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
