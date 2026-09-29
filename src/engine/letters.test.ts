import { describe, expect, it } from 'vitest';
import { readText, type LetterOptions } from './letters';

const options = (changes: Partial<LetterOptions> = {}): LetterOptions => ({ punctuation: 'drop', digits: 'scramble', accents: 'keep', ...changes });

describe('readText', () => {
  it('finds the letters, in capitals, and how they fall into words', () => {
    expect(readText('Open sesame!', options())).toEqual({ letters: [...'OPENSESAME'], words: [4, 6], marks: [] });
  });

  it('keeps an accented letter as one letter, however it was typed', () => {
    expect(readText('café', options()).letters).toEqual(['C', 'A', 'F', 'É']);
    expect(readText('café', options()).letters).toEqual(['C', 'A', 'F', 'É']);
  });

  it('takes accents off when asked, spelling out letters that have no plain form', () => {
    expect(readText('Crème brûlée', options({ accents: 'fold' })).letters.join('')).toBe('CREMEBRULEE');
    expect(readText('Æsir Øre', options({ accents: 'fold' })).letters.join('')).toBe('AESIRORE');
  });

  it('spells out letters whose capitals are two letters', () => {
    expect(readText('Straße', options()).letters.join('')).toBe('STRASSE');
  });

  it('scrambles digits, or leaves them out', () => {
    expect(readText('Door 42', options())).toMatchObject({ letters: [...'DOOR42'], words: [4, 2] });
    expect(readText('Door 42', options({ digits: 'drop' }))).toMatchObject({ letters: [...'DOOR'], words: [4] });
  });

  it('leaves out punctuation, symbols and emoji', () => {
    expect(readText("🗝️ Don't — panic!", options())).toEqual({ letters: [...'DONTPANIC'], words: [4, 5], marks: [] });
  });

  it('keeps punctuation where it was when asked, with the word it goes with', () => {
    expect(readText("(Don't) — panic!", options({ punctuation: 'keep' })).marks).toEqual([
      { text: '(', at: 0, joins: 'after' },
      { text: "'", at: 3, joins: 'before' },
      { text: ')', at: 4, joins: 'before' },
      { text: '—', at: 4, joins: 'neither' },
      { text: '!', at: 9, joins: 'before' },
    ]);
  });

  it('finds nothing in text without letters or digits', () => {
    expect(readText('', options())).toEqual({ letters: [], words: [], marks: [] });
    expect(readText('  ?! ', options())).toEqual({ letters: [], words: [], marks: [] });
  });
});
