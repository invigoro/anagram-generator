import { describe, expect, it } from 'vitest';
import { lettersLeft } from './hand';

describe('lettersLeft', () => {
  it('finds the letters not used yet, in the text’s order', () => {
    expect(lettersLeft([...'DORMITORY'], [...'DIRTY'])).toEqual({ left: [...'OMOR'], over: [] });
    expect(lettersLeft([...'DORMITORY'], [...'DIRTYROOM'])).toEqual({ left: [], over: [] });
    expect(lettersLeft([...'DORMITORY'], [])).toEqual({ left: [...'DORMITORY'], over: [] });
  });

  it('finds letters used more often than the text has them', () => {
    expect(lettersLeft([...'DORMITORY'], [...'DIRTYY'])).toEqual({ left: [...'OMOR'], over: ['Y'] });
    expect(lettersLeft([...'CAT'], [...'CATZZ'])).toEqual({ left: [], over: ['Z', 'Z'] });
  });

  it('counts an accented letter as the letter', () => {
    expect(lettersLeft(['C', 'A', 'F', 'É'], [...'FACE'])).toEqual({ left: [], over: [] });
  });
});
