/** A source of random floats in [0, 1). */
export type Random = () => number;

/**
 * Small, fast, seedable PRNG (mulberry32) returning floats in [0, 1). The same seed gives the
 * same sequence in every browser, which is what makes generated text reproducible.
 */
export function mulberry32(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A 32-bit hash of a string (FNV-1a), to seed things that must come out the same every time. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A fresh random 32-bit seed, for "reroll" buttons. */
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

/** A whole number from 0 up to, but not including, `max`. */
export function randomInt(random: Random, max: number): number {
  return Math.floor(random() * max);
}

/** A shuffled copy of `items` (Fisher–Yates); `items` itself is left alone. */
export function shuffled<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(random, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
