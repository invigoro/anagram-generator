import type { Random } from './rng';

/**
 * How easily a scramble could be said: a letter-trigram model of English words, which knows how
 * surprising each letter is after the two before it. The start and end of a word count as a 27th
 * letter, since STR starts words and NGT doesn't. The model is built from the Standard word list
 * by scripts/build-words.ts, and kept as 27 × 27 × 27 costs of a byte each.
 */

/** The start or end of a word. */
const EDGE = 0;
const SYMBOLS = 27;
/** Costs are kept in eighths of a bit, so a byte holds up to 32 bits of surprise. */
const SCALE = 8;

export interface LetterModel {
  /** How surprising each letter is after each pair of letters, in eighths of a bit. */
  costs: Uint8Array;
}

/** A letter's place in the model: A is 1, Z is 26, and anything else (a digit) ends a word. */
function symbolOf(letter: string): number {
  const code = letter.normalize('NFD').charCodeAt(0) - 64;
  return code >= 1 && code <= 26 ? code : EDGE;
}

const at = (a: number, b: number, c: number) => (a * SYMBOLS + b) * SYMBOLS + c;

/** A model from a list of words, each counted once. */
export function buildModel(words: readonly string[]): LetterModel {
  const counts = new Float64Array(SYMBOLS ** 3);
  for (const word of words) {
    const symbols = [EDGE, EDGE, ...[...word.toUpperCase()].map(symbolOf), EDGE];
    for (let i = 2; i < symbols.length; i++) counts[at(symbols[i - 2], symbols[i - 1], symbols[i])]++;
  }
  const costs = new Uint8Array(SYMBOLS ** 3);
  for (let context = 0; context < SYMBOLS * SYMBOLS; context++) {
    let total = 0;
    for (let next = 0; next < SYMBOLS; next++) total += counts[context * SYMBOLS + next];
    for (let next = 0; next < SYMBOLS; next++) {
      // A little for every letter, so none is impossible after any pair.
      const chance = (counts[context * SYMBOLS + next] + 0.1) / (total + 0.1 * SYMBOLS);
      costs[context * SYMBOLS + next] = Math.min(255, Math.round(-Math.log2(chance) * SCALE));
    }
  }
  return { costs };
}

export function encodeModel(model: LetterModel): string {
  let binary = '';
  for (const byte of model.costs) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeModel(encoded: string): LetterModel {
  return { costs: Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)) };
}

/**
 * How hard some words are to say: the average surprise of each letter after the two before it,
 * and of each word ending where it does, in bits. Real words score about 2 to 3, and a jumble 5 or more.
 */
export function sayCost(model: LetterModel, letters: readonly string[], words: readonly number[]): number {
  let total = 0;
  let steps = 0;
  let start = 0;
  for (const length of words) {
    let [a, b] = [EDGE, EDGE];
    for (let i = start; i < start + length; i++) {
      const c = symbolOf(letters[i]);
      total += model.costs[at(a, b, c)];
      [a, b] = [b, c];
    }
    total += model.costs[at(a, b, EDGE)];
    steps += length + 1;
    start += length;
  }
  return steps === 0 ? 0 : total / steps / SCALE;
}

/**
 * Fills a group's slots with the group's letters, in slot order, each letter chosen by how well it
 * follows the two before it in its word, and for a word's last letter, how well the word ends
 * there. With `sharpness` 1 a letter is chosen as often as the model expects it; higher, the
 * likeliest more often still. A letter `avoid` names is chosen only when nothing else is left.
 */
export function guidedFill(
  model: LetterModel,
  letters: string[],
  group: readonly number[],
  ends: Uint8Array,
  random: Random,
  sharpness: number,
  avoid: (slot: number, letter: string) => boolean,
): void {
  const pool = group.map((slot) => letters[slot]);
  const starts = (slot: number) => slot === 0 || ends[slot - 1] === 1;
  for (const slot of group) {
    const a = starts(slot) || starts(slot - 1) ? EDGE : symbolOf(letters[slot - 2]);
    const b = starts(slot) ? EDGE : symbolOf(letters[slot - 1]);
    const weights = pool.map((letter) => {
      const c = symbolOf(letter);
      let cost = model.costs[at(a, b, c)];
      if (ends[slot] === 1) cost += model.costs[at(b, c, EDGE)];
      return 2 ** (-(cost / SCALE) * sharpness) * (avoid(slot, letter) ? 1e-9 : 1);
    });
    let pick = random() * weights.reduce((sum, weight) => sum + weight, 0);
    let chosen = 0;
    while (chosen < pool.length - 1 && (pick -= weights[chosen]) > 0) chosen++;
    letters[slot] = pool[chosen];
    pool.splice(chosen, 1);
  }
}
