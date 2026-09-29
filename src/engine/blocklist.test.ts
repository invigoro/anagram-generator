import { describe, expect, it } from 'vitest';
import { isBlocked } from './blocklist';

describe('isBlocked', () => {
  it('catches a listed word whatever its case, accents or hyphens', () => {
    expect(isBlocked('shit')).toBe(true);
    expect(isBlocked('SHIT')).toBe(true);
    expect(isBlocked('Shït')).toBe(true);
    expect(isBlocked('HALFBREED')).toBe(true);
  });

  it('catches plurals', () => {
    expect(isBlocked('TURDS')).toBe(true);
  });

  it('catches the worst roots inside longer runs of letters', () => {
    expect(isBlocked('XQFUCKZ')).toBe(true);
    expect(isBlocked('OSHITE')).toBe(true);
  });

  it('lets ordinary words and scrambles through, even with a listed word inside', () => {
    for (const word of ['HITS', 'PASSWORD', 'CLASSIC', 'COCKATOO', 'SCRAPE', 'NEPO', 'EMASES']) expect(isBlocked(word)).toBe(false);
  });
});
