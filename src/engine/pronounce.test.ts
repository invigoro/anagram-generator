import { describe, expect, it } from 'vitest';
import { LETTER_MODEL } from '../data/words/letters';
import { buildModel, decodeModel, encodeModel, guidedFill, sayCost } from './pronounce';
import { mulberry32 } from './rng';

const model = decodeModel(LETTER_MODEL);
const cost = (word: string) => sayCost(model, [...word], [word.length]);

describe('the letter model', () => {
  it('comes back the same from its encoding', () => {
    const built = buildModel(['open', 'sesame', 'password']);
    expect(decodeModel(encodeModel(built))).toEqual(built);
    expect(model.costs).toHaveLength(27 ** 3);
  });

  it('finds real words easier to say than jumbles of them', () => {
    for (const [word, jumble] of [
      ['STRENGTH', 'TGHSRNET'],
      ['DORMITORY', 'RMOYITDRO'],
      ['PASSWORD', 'WDRSASPO'],
      ['MELLON', 'LEMNOL'],
    ]) {
      expect(cost(word)).toBeLessThan(cost(jumble));
    }
    expect(cost('DORMITORY')).toBeLessThan(4);
    expect(cost('RMOYITDRO')).toBeGreaterThan(6);
  });

  it('counts each word’s start and end', () => {
    // NG ends English words, and doesn't start them.
    expect(cost('SING')).toBeLessThan(cost('NGSI'));
    expect(sayCost(model, [...'SINGSONG'], [4, 4])).toBeLessThan(sayCost(model, [...'SINGSONG'], [3, 5]));
  });
});

describe('guidedFill', () => {
  const ends = (words: number[]) => {
    const marks = new Uint8Array(words.reduce((sum, length) => sum + length, 0));
    let at = 0;
    for (const length of words) marks[(at += length) - 1] = 1;
    return marks;
  };

  it('uses every letter of the group once', () => {
    for (let seed = 0; seed < 100; seed++) {
      const letters = [...'OPENSESAME'];
      guidedFill(model, letters, [...Array(10).keys()], ends([10]), mulberry32(seed), 2, () => false);
      expect([...letters].sort()).toEqual([...'OPENSESAME'].sort());
    }
  });

  it('leaves letters outside the group alone', () => {
    const letters = [...'OPENSESAME'];
    guidedFill(model, letters, [1, 2, 3], ends([4, 6]), mulberry32(1), 2, () => false);
    expect(letters[0]).toBe('O');
    expect(letters.slice(4).join('')).toBe('SESAME');
  });

  it('mostly steers clear of what it’s told to avoid', () => {
    // It fills from the left without looking back, so now and then only an avoided letter is
    // left for the last slot; the scrambler repairs those afterwards.
    const inPlace = (avoid: boolean) => {
      let total = 0;
      for (let seed = 0; seed < 200; seed++) {
        const letters = [...'SESAME'];
        guidedFill(model, letters, [...Array(6).keys()], ends([6]), mulberry32(seed), 1, (slot, letter) => avoid && letter === 'SESAME'[slot]);
        total += letters.filter((letter, i) => letter === 'SESAME'[i]).length;
      }
      return total / 200;
    };
    expect(inPlace(true)).toBeLessThan(0.5);
    expect(inPlace(true)).toBeLessThan(inPlace(false) / 3);
  });
});
