import { isBlocked } from './blocklist';
import { shuffled, type Random } from './rng';

/**
 * How many different ways `letters` can be arranged, their own order among them: n!/(k₁!·k₂!·…)
 * for n letters with k₁ of one letter, k₂ of another and so on. Counting stops at `cap`, since the
 * number soon passes any use: 20 different letters have 2.4 × 10¹⁸ arrangements.
 */
export function countArrangements(letters: readonly string[], cap = Number.MAX_SAFE_INTEGER): number {
  const copies = new Map<string, number>();
  const limit = BigInt(cap);
  // The arrangements of the first i letters, built up a letter at a time: each one multiplies
  // them by i and divides by how many of that letter there are so far, always giving a whole number.
  let count = 1n;
  for (let i = 1; i <= letters.length; i++) {
    const letter = letters[i - 1];
    const copy = (copies.get(letter) ?? 0) + 1;
    copies.set(letter, copy);
    count = (count * BigInt(i)) / BigInt(copy);
    if (count >= limit) return cap;
  }
  return Number(count);
}

/** Every different arrangement of `letters` once, in alphabetical order. */
export function* arrangements(letters: readonly string[]): Generator<string[]> {
  const order = [...letters].sort();
  while (true) {
    yield [...order];
    // The next arrangement in alphabetical order: find the last letter that comes before the one
    // after it, swap it with the last letter after it that comes later still, and reverse
    // everything after it. Repeated letters are never swapped with each other, so no
    // arrangement comes up twice.
    let i = order.length - 2;
    while (i >= 0 && order[i] >= order[i + 1]) i--;
    if (i < 0) return;
    let j = order.length - 1;
    while (order[j] <= order[i]) j--;
    [order[i], order[j]] = [order[j], order[i]];
    order.push(...order.splice(i + 1).reverse());
  }
}

/** When there are this many arrangements or fewer, they're listed and picked from, not shuffled for. */
const LIST_UP_TO = 5040; // 7!, every arrangement of seven different letters

export interface Scramble {
  /** Different arrangements of the letters, never their own order, each as a string. */
  arrangements: string[];
  /** How many arrangements there are besides the letters' own order, up to Number.MAX_SAFE_INTEGER. */
  others: number;
  /** Whether these are every arrangement there is to show. */
  complete: boolean;
}

/**
 * Up to `count` different arrangements of `letters`, each as likely as any other. Never the
 * letters' own order, and never one that spells a slur or a swear word. When there are only a
 * few, it has every one.
 */
export function scramble(letters: readonly string[], count: number, random: Random): Scramble {
  const own = letters.join('');
  const others = countArrangements(letters) - 1;
  if (others <= LIST_UP_TO) {
    const every = Array.from(arrangements(letters), (arrangement) => arrangement.join('')).filter(
      (arrangement) => arrangement !== own && !isBlocked(arrangement),
    );
    return { arrangements: shuffled(every, random).slice(0, count), others, complete: every.length <= count };
  }
  // Too many to list, so shuffle until there are enough different ones. With this many to choose
  // from, a repeat is rare, and the limit on tries is only a safeguard.
  const seen = new Set([own]);
  const found: string[] = [];
  for (let tries = 0; found.length < count && tries < count * 20; tries++) {
    const arrangement = shuffled(letters, random).join('');
    if (seen.has(arrangement)) continue;
    seen.add(arrangement);
    if (!isBlocked(arrangement)) found.push(arrangement);
  }
  return { arrangements: found, others, complete: false };
}
