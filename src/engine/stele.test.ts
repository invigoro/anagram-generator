import { describe, expect, it } from 'vitest';
import { letterChanges, runesThatKeep, steleSettings, steleText } from './stele';

describe('steleText', () => {
  it('keeps damage off the clue, with the riddle above it', () => {
    expect(steleText('NEPO EMASES', 'What opens the cave?')).toBe('{{What opens the cave?}}\n{{NEPO EMASES}}');
    expect(steleText('NEPO EMASES')).toBe('{{NEPO EMASES}}');
    expect(steleText(' NEPO EMASES ', '  ')).toBe('{{NEPO EMASES}}');
  });

  it('keeps braces and brackets typed in from marking damage of their own', () => {
    expect(steleText('A}}B', '[[gone]] {{kept}}')).toBe('{{[gone] {kept}}}\n{{A}B}}');
  });
});

describe('steleSettings', () => {
  it('asks for Roman lettering, or runes in the typeface that has them', () => {
    const block = (lettering: Parameters<typeof steleSettings>[2]['lettering']) =>
      (steleSettings('NEPO', '', { medium: 'granite', lettering }).blocks as Record<string, unknown>[])[0];
    expect(block('latin')).toEqual({ kind: 'text', role: 'main', text: '{{NEPO}}' });
    expect(block('roman')).toEqual({ kind: 'text', role: 'main', text: '{{NEPO}}', roman: true });
    expect(block('futhorc')).toEqual({ kind: 'text', role: 'main', text: '{{NEPO}}', script: 'futhorc', font: 'noto-sans-runic' });
  });
});

describe('letterChanges', () => {
  it('finds nothing to change in letters as they are', () => {
    expect(letterChanges('JUXTAPOSE', 'latin')).toEqual([]);
  });

  it('says when Roman lettering has no letter for one of the clue’s', () => {
    expect(letterChanges('TSAHERT', 'roman')).toEqual([]);
    expect(letterChanges('Ujst', 'roman')).toEqual(['Roman lettering carves U as V, and J as I.']);
    expect(letterChanges('TUB', 'roman')).toEqual(['Roman lettering carves U as V.']);
  });

  it('says which of the clue’s letters share a rune', () => {
    expect(letterChanges('TSAHERT', 'elder-futhark')).toEqual([]);
    expect(letterChanges('TSAHERT', 'younger-futhark')).toEqual([
      'These share a rune, so the players can’t tell them apart: D and T; E, I, J and Y; S and Z.',
    ]);
    expect(letterChanges('TSAHERT', 'futhorc')).toEqual(['These share a rune, so the players can’t tell them apart: S and Z.']);
  });

  it('says when two letters are carved as one rune, or one as two', () => {
    expect(letterChanges('THE', 'elder-futhark')).toEqual(['TH is carved as one rune.']);
    expect(letterChanges('FOX', 'elder-futhark')).toEqual([
      'These share a rune, so the players can’t tell them apart: C, K and Q.',
      'X is carved as two runes.',
    ]);
    expect(letterChanges('STEAD', 'futhorc')).toEqual(['ST and EA are each carved as one rune.']);
  });

  it('says when a pair of letters comes out as other letters', () => {
    expect(letterChanges('QUOD', 'futhorc')).toEqual([
      'These share a rune, so the players can’t tell them apart: C and Q.',
      'In QU, U is carved as W.',
    ]);
  });

  it('says when a rune twice in a row is carved once, a doubled letter or not', () => {
    expect(letterChanges('HELLO', 'elder-futhark')).toEqual(['A rune twice in a row is carved once, so LL loses a letter.']);
    expect(letterChanges('HELLO', 'futhorc')).toEqual([]);
    // Y before a vowel is the rune for I, as E is, in Younger Futhark.
    expect(letterChanges('YES', 'younger-futhark')).toEqual([
      'These share a rune, so the players can’t tell them apart: E, I, J and Y; S and Z.',
      'A rune twice in a row is carved once, so YE loses a letter.',
    ]);
  });

  it('says when accents come off', () => {
    expect(letterChanges('ÉTÉ', 'elder-futhark')).toEqual(['Accents come off.']);
  });
});

describe('runesThatKeep', () => {
  it('finds the runes that keep every letter of the clue', () => {
    expect(runesThatKeep('TSAHERT')).toEqual(['elder-futhark']);
    expect(runesThatKeep('HELLO')).toEqual(['futhorc']);
    expect(runesThatKeep('QUICK')).toEqual([]);
  });
});
