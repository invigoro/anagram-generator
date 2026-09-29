import { describe, expect, it } from 'vitest';
import { lettersOf } from './letters';

describe('lettersOf', () => {
  it('keeps letters and digits, in capitals, and leaves out spaces and punctuation', () => {
    expect(lettersOf('Open sesame!')).toEqual([...'OPENSESAME']);
    expect(lettersOf("Don't panic, 42")).toEqual([...'DONTPANIC42']);
  });

  it('keeps an accented letter as one letter, however it was typed', () => {
    expect(lettersOf('café')).toEqual(['C', 'A', 'F', 'É']);
    expect(lettersOf('café')).toEqual(['C', 'A', 'F', 'É']);
  });

  it('spells out letters whose capitals are two letters', () => {
    expect(lettersOf('Straße')).toEqual([...'STRASSE']);
  });

  it('leaves out symbols and emoji', () => {
    expect(lettersOf('🗝️ key ✦')).toEqual([...'KEY']);
  });

  it('finds nothing in text without letters or digits', () => {
    expect(lettersOf('')).toEqual([]);
    expect(lettersOf('  ?! — ')).toEqual([]);
  });
});
