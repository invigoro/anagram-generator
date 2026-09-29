import { countsOf, keyOfCounts, type Dictionary } from './words';

/**
 * Finding phrases of real words that use a text's letters exactly. The search looks for one-word
 * phrases first, then two words, and so on. At each step it branches on the rarest letter left:
 * every phrase must include some word that has it, so trying only those words prunes hard
 * without missing anything. The last word comes from the dictionary's keys rather than a search.
 */

export interface Query {
  /** The letters to use, in capitals. Any that aren't A to Z (digits, accented letters) can't be in a word, so are left over. */
  letters: readonly string[];
  /** The most words a phrase may have. */
  maxWords: number;
  /** The fewest letters a word may have. */
  minLength: number;
  /** Words never to use, in capitals. */
  exclude: ReadonlySet<string>;
  /** How many phrases to find before stopping. */
  limit: number;
  /**
   * How many steps the search may take, so a long text can't search forever. It's counted rather
   * than timed, so the same text always gives the same phrases.
   */
  budget: number;
  /** What a word of each rank costs a phrase, commonest rank first: see `scoreOf`. */
  rankCosts: readonly number[];
  /** Words that give the answer away, such as pieces of its words: allowed, but costly. */
  giveaways?: ReadonlySet<string>;
}

/** What a word that gives the answer away costs a phrase: more than a rare word. */
const GIVEAWAY_COST = 5;

export interface Phrase {
  words: string[];
  /** Letters it leaves unused: none for a phrase that uses every letter. */
  leftover: string[];
  /** How good it is as a clue: lower is better. */
  score: number;
}

export interface Solution {
  /** Phrases that use every letter, best first. */
  phrases: Phrase[];
  /** When no phrase uses every letter: phrases that use all but a few, fewest left over first. */
  nearMisses: Phrase[];
  /** Whether the search looked everywhere, rather than stopping at its limit or budget. */
  exhausted: boolean;
}

/** How often the search pauses, in steps, so whoever runs it can stop it for a newer one. */
const PAUSE_EVERY = 4096;
/** The most letters a near miss may leave over. */
const MOST_LEFT_OVER = 3;
const PLAIN = /^[A-Z]$/;

function fitsIn(dict: Dictionary, word: number, counts: Uint8Array): boolean {
  const at = word * 26;
  for (let letter = 0; letter < 26; letter++) if (dict.counts[at + letter] > counts[letter]) return false;
  return true;
}

/** Takes a word's letters from the counts (-1), or gives them back (+1). */
function move(dict: Dictionary, word: number, counts: Uint8Array, sign: 1 | -1): void {
  const at = word * 26;
  for (let letter = 0; letter < 26; letter++) counts[letter] += sign * dict.counts[at + letter];
}

/**
 * How good a phrase is as a clue, lower being better: each word costs 1, so fewer words are
 * better, plus its rank's cost, so commoner words are better, plus a little for a very short word,
 * and a lot for one that gives the answer away.
 */
export function scoreOf(dict: Dictionary, words: readonly number[], rankCosts: readonly number[], giveaways?: ReadonlySet<string>): number {
  let score = 0;
  for (const word of words) {
    const length = dict.words[word].length;
    score += 1 + (rankCosts[dict.ranks[word]] ?? rankCosts[rankCosts.length - 1]) + (length <= 2 ? 1.5 : length === 3 ? 0.5 : 0);
    if (giveaways?.has(dict.words[word])) score += GIVEAWAY_COST;
  }
  return score;
}

/** A phrase's words, longest first: DIRTY ROOM rather than ROOM DIRTY. */
const inOrder = (dict: Dictionary, words: readonly number[]) =>
  words.map((word) => dict.words[word]).sort((a, b) => b.length - a.length || a.localeCompare(b, 'en'));

/** Every way to take `m` letters from the counts, the letters fewest words have first. */
function* takings(counts: Uint8Array, m: number, order: readonly number[], from = 0): Generator<number[]> {
  if (m === 0) {
    yield [];
    return;
  }
  for (let i = from; i < order.length; i++) {
    const letter = order[i];
    if (counts[letter] === 0) continue;
    counts[letter]--;
    for (const rest of takings(counts, m - 1, order, i)) yield [letter, ...rest];
    counts[letter]++;
  }
}

/** The phrases of real words in some letters: those that use them all, or failing that the nearest. */
export function* solve(dict: Dictionary, query: Query): Generator<void, Solution> {
  const minLength = Math.max(1, query.minLength);
  const plain = query.letters.filter((letter) => PLAIN.test(letter));
  const others = query.letters.filter((letter) => !PLAIN.test(letter));
  const target = countsOf(plain);

  // The words that fit in the letters at all, commonest and longest first, and for each letter the ones that have it.
  const usable = new Uint8Array(dict.words.length);
  const fitting: number[] = [];
  for (let word = 0; word < dict.words.length; word++) {
    const length = dict.words[word].length;
    if (length < minLength || length > plain.length || query.exclude.has(dict.words[word]) || !fitsIn(dict, word, target)) continue;
    usable[word] = 1;
    fitting.push(word);
  }
  fitting.sort((a, b) => dict.ranks[a] - dict.ranks[b] || dict.words[b].length - dict.words[a].length || a - b);
  const having = Array.from({ length: 26 }, () => [] as number[]);
  for (const word of fitting) for (let letter = 0; letter < 26; letter++) if (dict.masks[word] & (1 << letter)) having[letter].push(word);

  let steps = 0;
  let stopped = false;
  const remaining = Uint8Array.from(target);
  const chosen: number[] = [];
  const phrases: Phrase[] = [];
  const nearMisses: Phrase[] = [];
  const seen = new Set<string>();

  function keep(words: readonly number[], leftover: string[]): void {
    const key = `${[...words].sort((a, b) => a - b).join(',')}|${[...leftover].sort().join('')}`;
    if (seen.has(key)) return;
    seen.add(key);
    (leftover.length === 0 ? phrases : nearMisses).push({
      words: inOrder(dict, words),
      leftover,
      score: scoreOf(dict, words, query.rankCosts, query.giveaways),
    });
    if (phrases.length + nearMisses.length >= query.limit) stopped = true;
  }

  /** Every phrase of `wordsLeft` more words that uses exactly the remaining letters, `left` of them. */
  function* search(left: number, wordsLeft: number, leftover: string[]): Generator<void, void> {
    if (wordsLeft === 1) {
      for (const word of dict.byKey.get(keyOfCounts(remaining)) ?? []) if (usable[word]) keep([...chosen, word], leftover);
      return;
    }
    let rarest = -1;
    let mask = 0;
    for (let letter = 0; letter < 26; letter++) {
      if (remaining[letter] === 0) continue;
      mask |= 1 << letter;
      if (rarest < 0 || having[letter].length < having[rarest].length) rarest = letter;
    }
    for (const word of having[rarest]) {
      if (++steps % PAUSE_EVERY === 0) yield;
      if (steps > query.budget) stopped = true;
      if (stopped) return;
      const length = dict.words[word].length;
      // A word with a letter that's used up can't fit, whatever the counts.
      if (length > left - minLength * (wordsLeft - 1) || dict.masks[word] & ~mask || !fitsIn(dict, word, remaining)) continue;
      move(dict, word, remaining, -1);
      chosen.push(word);
      yield* search(left - length, wordsLeft - 1, leftover);
      chosen.pop();
      move(dict, word, remaining, 1);
      if (stopped) return;
    }
  }

  for (let k = 1; k <= query.maxWords && !stopped && plain.length > 0; k++) yield* search(plain.length, k, others);

  // No phrase uses every letter: find those that use all but one, or two, or three, leaving out the
  // letters fewest words have first, since they're the likeliest to be in the way.
  if (phrases.length === 0 && nearMisses.length === 0) {
    const rarity = Array.from({ length: 26 }, (_, letter) => letter).sort((a, b) => having[a].length - having[b].length || a - b);
    for (let m = 1; m <= Math.min(MOST_LEFT_OVER, plain.length - 1) && nearMisses.length === 0 && !stopped; m++) {
      for (const taken of takings(Uint8Array.from(remaining), m, rarity)) {
        const leftover = [...others, ...taken.map((letter) => String.fromCharCode(65 + letter))];
        for (const letter of taken) remaining[letter]--;
        for (let k = 1; k <= query.maxWords && !stopped; k++) yield* search(plain.length - m, k, leftover);
        for (const letter of taken) remaining[letter]++;
        if (stopped) break;
      }
    }
  }

  phrases.sort((a, b) => a.score - b.score || a.words.join(' ').localeCompare(b.words.join(' '), 'en'));
  nearMisses.sort((a, b) => a.leftover.length - b.leftover.length || a.score - b.score || a.words.join(' ').localeCompare(b.words.join(' '), 'en'));
  return { phrases, nearMisses, exhausted: !stopped };
}

/** Runs a search to the end, all at once. */
export function solveNow(dict: Dictionary, query: Query): Solution {
  const search = solve(dict, query);
  for (let step = search.next(); ; step = search.next()) if (step.done) return step.value;
}
