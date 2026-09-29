import { describe, expect, it } from 'vitest';
import { readText, type LetterOptions } from './letters';
import { comparable, fits, fragmentsOf, otherAnswers, readout } from './puzzle';

const folded: LetterOptions = { punctuation: 'drop', digits: 'scramble', accents: 'fold' };
const read = (text: string) => readText(text, folded);
const phrase = (text: string) => ({ words: text.split(' '), leftover: [], score: 0 });

describe('fits', () => {
  it('says whether a clue uses exactly the answer’s letters', () => {
    expect(fits(read('Open sesame'), read('NEPO EMASES'))).toBe(true);
    expect(fits(read('Open sesame'), read('nepo, emases!'))).toBe(true);
    expect(fits(read('Open sesame'), read('NEPO EMASE'))).toBe(false);
    expect(fits(read('Open sesame'), read('NEPO EMASESS'))).toBe(false);
    expect(fits(read('Café'), read('FACE'))).toBe(true);
    expect(fits(read(''), read(''))).toBe(false);
  });
});

describe('readout', () => {
  it('says how much a clue gives away', () => {
    // Each word backwards: nothing in place, every pair kept, and SESAME whole, backwards.
    expect(readout(read('Open sesame'), read('NEPO EMASES'))).toEqual({ inPlace: 0, neighboursKept: 8, piece: 'EMASES' });
    expect(readout(read('Open sesame'), read('PNOE EAEMSS'))).toEqual({ inPlace: 0, neighboursKept: 1, piece: 'EM' });
    expect(readout(read('Open sesame'), read('OPEN EMASSE')).inPlace).toBe(5);
  });
});

describe('otherAnswers', () => {
  it('leaves out the answer itself, in any order, and puts those of the answer’s lengths first', () => {
    const others = otherAnswers(read('Open sesame'), ['ENEMA POSES', 'SESAME OPEN', 'ONE MAPS SEE', 'PEON SESAME'].map(phrase));
    expect(others).toEqual([
      { text: 'PEON SESAME', sameLengths: true },
      { text: 'ENEMA POSES', sameLengths: false },
      { text: 'ONE MAPS SEE', sameLengths: false },
    ]);
  });

  it('leaves out near misses', () => {
    expect(otherAnswers(read('Mellon'), [{ words: ['LEMON'], leftover: ['L'], score: 0 }])).toEqual([]);
  });
});

describe('comparable', () => {
  it('is a text’s letters only, in capitals', () => {
    expect(comparable(read('Open, sesame!'))).toBe('OPENSESAME');
  });
});

describe('fragmentsOf', () => {
  it('leaves the clue whole, or gives each word a piece', () => {
    expect(fragmentsOf('NEPO EMASES', 1)).toEqual(['NEPO EMASES']);
    expect(fragmentsOf(' NEPO  EMASES ', 'words')).toEqual(['NEPO', 'EMASES']);
  });

  it('shares the letters out as evenly as they go, in order, keeping the spaces inside a piece', () => {
    expect(fragmentsOf('NEPO EMASES', 3)).toEqual(['NEPO', 'EMA', 'SES']);
    expect(fragmentsOf('NEPO EMASES', 4)).toEqual(['NEP', 'O EM', 'AS', 'ES']);
    expect(fragmentsOf('TSAHERT', 2)).toEqual(['TSAH', 'ERT']);
  });

  it('never makes more pieces than there are letters', () => {
    expect(fragmentsOf('CAT', 5)).toEqual(['C', 'A', 'T']);
    expect(fragmentsOf('', 3)).toEqual([]);
  });

  it('keeps a letter with its accent', () => {
    expect(fragmentsOf('ÉTÉ', 3)).toEqual(['É', 'T', 'É']);
  });
});
