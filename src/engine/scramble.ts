import { isBlocked } from './blocklist';
import { inPlace, longestRun, neighbourPairs, neighboursKept, pairOf, piecesOf } from './difficulty';
import type { Text } from './letters';
import { guidedFill, sayCost, type LetterModel } from './pronounce';
import { randomInt, shuffled, type Random } from './rng';

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

/**
 * How the letters fall into words: all run together, each word scrambled on its own, the text's
 * word lengths with the letters mixed across them, a number of words, or a pattern of lengths.
 */
export type Shape = 'run' | 'words' | 'lengths' | 'count' | 'pattern';

export type Order = 'best' | 'az' | 'shuffled';

/** How a text is scrambled. */
export interface Rules {
  shape: Shape;
  /** For 'count': how many words. */
  wordCount: number;
  /** For 'pattern': how many letters each word has. */
  pattern: readonly number[];
  /** Each of the text's words keeps its first letter where it is. */
  keepFirst: boolean;
  /** Each of the text's words keeps its last letter where it is. */
  keepLast: boolean;
  /** No letter stays where it was, of those that can move at all. */
  moveEvery: boolean;
  /** No two letters that sat side by side in a word sit side by side in one again. */
  partNeighbours: boolean;
}

export interface Arrangement {
  letters: string[];
  /** How many letters each of its words has. */
  words: number[];
  /** Letters left where they were. */
  inPlace: number;
  /** Pairs of letters side by side in a word that were side by side in the text. */
  neighboursKept: number;
  /** The longest piece of the text left whole. */
  longestRun: number;
}

/** Something the rules ask for that the letters can't give. */
export type Shortfall =
  /** More than half the letters that can move (of a word, or of the text) are `letter`. */
  | { kind: 'move'; letter: string; word: string | null }
  /** Every arrangement found keeps some old neighbours together. */
  | { kind: 'neighbours' }
  /** No arrangement found meets every rule at once. */
  | { kind: 'rules' }
  /** The pattern's lengths don't add up to the text's letters. */
  | { kind: 'pattern'; letters: number };

export interface Scramble {
  arrangements: Arrangement[];
  /** How many ways the letters can be arranged in this shape besides their own order, up to Number.MAX_SAFE_INTEGER. */
  others: number;
  /** How many of those meet the rules, where there were few enough to look at every one; otherwise null. */
  fitting: number | null;
  /** Whether the list has every arrangement there is to show. */
  complete: boolean;
  shortfalls: Shortfall[];
}

export interface ScrambleOptions {
  count: number;
  order: Order;
  /** Scrambles that could be said, somewhat or very: chosen and built with a letter model. */
  sayable?: Sayable;
}

export interface Sayable {
  model: LetterModel;
  level: 'some' | 'very';
}

/** How strongly a sayable scramble's letters lean to the likeliest: see `guidedFill`. */
const SHARPNESS = { some: 1, very: 2 } as const;

/** How many more candidates to find for sayable scrambles, to choose the most sayable of. */
const SAYABLE_POOL = 6;

/** When there are this many arrangements or fewer, every one is looked at, rather than shuffling for them. */
const LIST_UP_TO = 5040; // 7!, every arrangement of seven different letters

/**
 * A limit on the search for arrangements that meet the rules, counted in letters looked at, so a
 * long text can't freeze the page. It's counted rather than timed, so a seed always gives the same list.
 */
const WORK_LIMIT = 2_000_000;

interface Plan {
  original: readonly string[];
  /** The slots whose letters may move, in groups that trade letters only among themselves. */
  groups: number[][];
  /** Each slot's group, or -1 where the letter stays put. */
  groupOf: number[];
  /** For each group, when each word is scrambled on its own: the word, and where it starts and ends. */
  groupWords: ({ text: string; start: number; end: number } | null)[];
  pairs: Set<string>;
  pieces: Set<string>;
}

interface Candidate {
  letters: string[];
  words: number[];
  /** How many times it breaks the rules. */
  cost: number;
}

const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i);
const sum = (numbers: readonly number[]) => numbers.reduce((total, n) => total + n, 0);
const same = (a: readonly string[], b: readonly string[]) => a.every((letter, i) => letter === b[i]);

function planOf(text: Text, rules: Rules): Plan {
  const { letters, words } = text;
  const spans: [number, number][] = [];
  for (const length of words) {
    const start = spans.length > 0 ? spans[spans.length - 1][1] : 0;
    spans.push([start, start + length]);
  }
  const fixed = new Set<number>();
  for (const [start, end] of spans) {
    if (rules.keepFirst) fixed.add(start);
    if (rules.keepLast) fixed.add(end - 1);
  }
  const together = rules.shape === 'words' ? spans : [[0, letters.length] as [number, number]];
  const groups: number[][] = [];
  const groupWords: Plan['groupWords'] = [];
  for (const [start, end] of together) {
    const movable = range(start, end).filter((slot) => !fixed.has(slot));
    // Letters that are all the same have nowhere to go.
    if (new Set(movable.map((slot) => letters[slot])).size < 2) continue;
    groups.push(movable);
    groupWords.push(rules.shape === 'words' ? { text: letters.slice(start, end).join(''), start, end } : null);
  }
  const groupOf = new Array<number>(letters.length).fill(-1);
  groups.forEach((group, g) => group.forEach((slot) => (groupOf[slot] = g)));
  return { original: letters, groups, groupOf, groupWords, pairs: neighbourPairs(letters, words), pieces: piecesOf(letters, words) };
}

/** The fewest letters each word gets when splitting `n` letters into `k` words: two, where there are enough. */
const shortest = (n: number, k: number) => (n >= 2 * k ? 2 : 1);

/** How many words to split into, for 'count'. */
const wordsWanted = (n: number, rules: Rules) => Math.max(1, Math.min(rules.wordCount, n));

/** Every way to split `n` letters into `k` words of at least `least` letters. */
function* splits(n: number, k: number, least: number): Generator<number[]> {
  if (k === 1) {
    if (n >= least) yield [n];
    return;
  }
  for (let first = least; n - first >= least * (k - 1); first++) for (const rest of splits(n - first, k - 1, least)) yield [first, ...rest];
}

/** How many ways there are to split `n` letters into `k` words of at least `least` letters. */
function countSplits(n: number, k: number, least: number): number {
  // Stars and bars: the letters beyond each word's least, shared out among the words.
  const spare = n - k * least;
  if (spare < 0) return 0;
  let count = 1;
  for (let i = 1; i < k; i++) count = Math.min(Number.MAX_SAFE_INTEGER, (count * (spare + i)) / i);
  return Math.round(count);
}

/** A split of `n` letters into `k` words, every split as likely as any other. */
function randomSplit(n: number, k: number, random: Random): number[] {
  const least = shortest(n, k);
  const spare = n - k * least;
  // Stars and bars again: choose where the k - 1 bars go among the spare letters.
  const bars = shuffled(range(0, spare + k - 1), random)
    .slice(0, k - 1)
    .sort((a, b) => a - b);
  const lengths: number[] = [];
  let previous = -1;
  for (const bar of [...bars, spare + k - 1]) {
    lengths.push(least + bar - previous - 1);
    previous = bar;
  }
  return lengths;
}

/** Which slots end a word, so the letter after isn't a neighbour. */
function endsOf(words: readonly number[], n: number): Uint8Array {
  const ends = new Uint8Array(n);
  let at = 0;
  for (const length of words) {
    at += length;
    if (at > 0) ends[at - 1] = 1;
  }
  return ends;
}

function spellsBlocked(letters: readonly string[], words: readonly number[]): boolean {
  let start = 0;
  for (const length of words) {
    if (isBlocked(letters.slice(start, start + length).join(''))) return true;
    start += length;
  }
  return false;
}

/** How many times an arrangement breaks the rules: letters left in place, and old neighbours kept. */
function costOf(letters: readonly string[], ends: Uint8Array, plan: Plan, rules: Rules): number {
  let cost = 0;
  for (let i = 0; i < letters.length; i++) {
    if (rules.moveEvery && plan.groupOf[i] >= 0 && letters[i] === plan.original[i]) cost++;
    if (rules.partNeighbours && i < letters.length - 1 && !ends[i] && plan.pairs.has(pairOf(letters[i], letters[i + 1]))) cost++;
  }
  return cost;
}

/**
 * Swaps letters within their groups until the arrangement meets the rules, or `steps` run out:
 * each step takes a letter that breaks a rule and trades it for the best swap there is, now and
 * then a worse one, to find a way out of a dead end. Only `only`'s letters move, if it's given.
 * Returns the work done.
 */
function repair(letters: string[], ends: Uint8Array, plan: Plan, rules: Rules, random: Random, steps: number, only = -1): number {
  const n = letters.length;
  const movable = (i: number) => plan.groupOf[i] >= 0 && (only < 0 || plan.groupOf[i] === only);
  const place = (i: number) => (rules.moveEvery && plan.groupOf[i] >= 0 && letters[i] === plan.original[i] ? 1 : 0);
  const pair = (i: number) =>
    rules.partNeighbours && i >= 0 && i < n - 1 && !ends[i] && plan.pairs.has(pairOf(letters[i], letters[i + 1])) ? 1 : 0;
  // The rules a swap of slots a and b can change: their places, and the pairs either side of each.
  const around = (a: number, b: number) =>
    place(a) + place(b) + pair(a - 1) + pair(a) + (b - 1 === a ? 0 : pair(b - 1)) + (b === a - 1 ? 0 : pair(b));
  const swap = (a: number, b: number) => ([letters[a], letters[b]] = [letters[b], letters[a]]);

  let work = 0;
  for (let step = steps; step > 0; step--) {
    const broken: number[] = [];
    for (let i = 0; i < n; i++) if (movable(i) && place(i) + pair(i - 1) + pair(i) > 0) broken.push(i);
    work += n;
    if (broken.length === 0) break;
    const a = broken[randomInt(random, broken.length)];
    const group = plan.groups[plan.groupOf[a]];
    work += group.length;
    let best = Infinity;
    let partners: number[] = [];
    for (const b of group) {
      if (letters[b] === letters[a]) continue;
      const before = around(a, b);
      swap(a, b);
      const change = around(a, b) - before;
      swap(a, b);
      if (change < best) {
        best = change;
        partners = [b];
      } else if (change === best) partners.push(b);
    }
    if (partners.length === 0 || (best > 0 && random() >= 0.1)) continue;
    swap(a, partners[randomInt(random, partners.length)]);
  }
  return work;
}

/** Every arrangement of the plan's groups, each group's letters in every order, with the other letters where they were. */
function* everyArrangement(plan: Plan): Generator<string[]> {
  const orders = plan.groups.map((group) => Array.from(arrangements(group.map((slot) => plan.original[slot]))));
  const index = orders.map(() => 0);
  while (true) {
    const letters = [...plan.original];
    orders.forEach((order, g) => order[index[g]].forEach((letter, i) => (letters[plan.groups[g][i]] = letter)));
    yield letters;
    let g = orders.length - 1;
    while (g >= 0 && ++index[g] === orders[g].length) index[g--] = 0;
    if (g < 0) return;
  }
}

/** A group's letters shuffled into its slots. */
function shuffleGroup(letters: string[], group: readonly number[], original: readonly string[], random: Random): void {
  const order = shuffled(
    group.map((slot) => original[slot]),
    random,
  );
  group.forEach((slot, i) => (letters[slot] = order[i]));
}

/** How long a search for an arrangement that meets the rules goes on, for `n` letters. */
const stepsFor = (n: number) => Math.min(1500, 30 * n);

/**
 * A group's letters put in its slots: shuffled, or for sayable scrambles, chosen a letter at a time
 * by how well each follows the letters before it, steering clear of what the rules forbid.
 */
function fillGroup(letters: string[], group: readonly number[], ends: Uint8Array, plan: Plan, rules: Rules, random: Random, sayable?: Sayable): void {
  if (!sayable) return shuffleGroup(letters, group, plan.original, random);
  const avoid = (slot: number, letter: string) =>
    (rules.moveEvery && letter === plan.original[slot]) ||
    (rules.partNeighbours && slot > 0 && !ends[slot - 1] && plan.pairs.has(pairOf(letters[slot - 1], letter)));
  guidedFill(sayable.model, letters, group, ends, random, SHARPNESS[sayable.level], avoid);
}

/**
 * Up to `count` arrangements shuffled for, the text having too many to look at every one. The tries
 * are limited by `need`, how many are wanted in the end: sayable scrambles want more to choose
 * from, but not at the cost of searching for long.
 */
function sample(text: Text, plan: Plan, rules: Rules, count: number, random: Random, sayable?: Sayable, need = count): Candidate[] {
  const n = plan.original.length;
  const strict = rules.moveEvery || rules.partNeighbours;
  const seen = new Set<string>();
  const found: Candidate[] = [];
  let fits = 0;
  let work = 0;
  for (let tries = 0; tries < need * 10 && fits < count && work < WORK_LIMIT; tries++) {
    const words = rules.shape === 'count' ? randomSplit(n, wordsWanted(n, rules), random) : wordsOf(text, rules);
    const letters = [...plan.original];
    const ends = endsOf(words, n);
    for (const group of plan.groups) fillGroup(letters, group, ends, plan, rules, random, sayable);
    // Once the rules look impossible, search less hard for each of the closest.
    const steps = fits === 0 && tries >= 10 ? Math.ceil(stepsFor(n) / 10) : stepsFor(n);
    work += n + (strict ? repair(letters, ends, plan, rules, random, steps) : 0);
    if (same(letters, plan.original) || spellsBlocked(letters, words)) continue;
    const key = `${letters.join('\u0000')}|${words.join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cost = strict ? costOf(letters, ends, plan, rules) : 0;
    found.push({ letters, words, cost });
    if (cost === 0) fits++;
    // When nothing has met the rules after a fair try, they probably can't be met: settle for the closest.
    if (fits === 0 && tries >= 50 && found.length >= count) break;
  }
  return fits > 0 ? found.filter((candidate) => candidate.cost === 0) : found.sort((a, b) => a.cost - b.cost).slice(0, count);
}

/** How many times a word, starting at slot `start`, breaks the rules. */
function wordCost(word: readonly string[], start: number, plan: Plan, rules: Rules): number {
  let cost = 0;
  for (let i = 0; i < word.length; i++) {
    if (rules.moveEvery && plan.groupOf[start + i] >= 0 && word[i] === plan.original[start + i]) cost++;
    if (rules.partNeighbours && i < word.length - 1 && plan.pairs.has(pairOf(word[i], word[i + 1]))) cost++;
  }
  return cost;
}

/** A word's best arrangements, when each word is scrambled on its own. */
interface WordChoices {
  start: number;
  /** The word's letters in each of its best arrangements. */
  words: string[][];
  /** How many times each of them breaks the rules. */
  cost: number;
  /** How many of the word's arrangements meet the rules, if every one was looked at. */
  fitting: number | null;
  /** Whether the word as typed is among them. */
  hasOwn: boolean;
  /** Whether some were left out as less sayable. */
  trimmed: boolean;
}

function choicesFor(
  plan: Plan,
  g: number,
  rules: Rules,
  count: number,
  ends: Uint8Array,
  random: Random,
  sayable?: Sayable & { keep: number; need: number },
): WordChoices {
  const { start, end } = plan.groupWords[g]!;
  const group = plan.groups[g];
  const own = plan.original.slice(start, end);
  const strict = rules.moveEvery || rules.partNeighbours;
  const options: { word: string[]; cost: number }[] = [];
  let fitting: number | null = null;
  const letters = group.map((slot) => plan.original[slot]);
  if (countArrangements(letters, LIST_UP_TO + 1) <= LIST_UP_TO) {
    for (const order of arrangements(letters)) {
      const word = [...own];
      group.forEach((slot, i) => (word[slot - start] = order[i]));
      if (!isBlocked(word.join(''))) options.push({ word, cost: wordCost(word, start, plan, rules) });
    }
    fitting = options.filter((option) => option.cost === 0).length;
  } else {
    // Too many to list, so shuffle for them, as for a whole text.
    const text = [...plan.original];
    const seen = new Set<string>();
    let fits = 0;
    for (let tries = 0, work = 0; tries < (sayable?.need ?? count) * 10 && fits < count && work < WORK_LIMIT; tries++) {
      fillGroup(text, group, ends, plan, rules, random, sayable);
      const steps = fits === 0 && tries >= 10 ? Math.ceil(stepsFor(own.length) / 10) : stepsFor(own.length);
      work += own.length + (strict ? repair(text, ends, plan, rules, random, steps, g) : 0);
      const word = text.slice(start, end);
      const key = word.join('\u0000');
      if (seen.has(key) || isBlocked(word.join(''))) continue;
      seen.add(key);
      const cost = strict ? wordCost(word, start, plan, rules) : 0;
      options.push({ word, cost });
      if (cost === 0) fits++;
      if (fits === 0 && tries >= 50 && options.length >= count) break;
    }
  }
  const least = options.reduce((lowest, option) => Math.min(lowest, option.cost), Infinity);
  let words = options.filter((option) => option.cost === least).map((option) => option.word);
  // For sayable scrambles, only the word's most sayable arrangements.
  let trimmed = false;
  if (sayable && words.length > sayable.keep) {
    const cost = (word: string[]) => sayCost(sayable.model, word, [word.length]);
    words = words
      .map((word) => ({ word, say: cost(word) }))
      .sort((a, b) => a.say - b.say)
      .slice(0, sayable.keep)
      .map((option) => option.word);
    trimmed = true;
  }
  return { start, words, cost: least, fitting, hasOwn: words.some((word) => same(word, own)), trimmed };
}

/**
 * Arrangements with each word scrambled on its own. The rules only look within a word, so the best
 * arrangements of the whole text are the best of each word put together: each word is solved
 * alone, exactly where it's short enough to look at every one of its arrangements.
 */
function byWord(text: Text, plan: Plan, rules: Rules, count: number, random: Random, sayable?: Sayable, need = count) {
  const ends = endsOf(text.words, plan.original.length);
  // Enough of each word's most sayable arrangements that together they make at least `count`.
  const keep = Math.max(3, Math.ceil(count ** (1 / Math.max(1, plan.groups.length))));
  const choices = plan.groups.map((_, g) => choicesFor(plan, g, rules, count, ends, random, sayable && { ...sayable, keep, need }));
  const cost = choices.reduce((total, choice) => total + choice.cost, 0);
  const combinations = choices.reduce(
    (total, choice) => (total > Number.MAX_SAFE_INTEGER / Math.max(1, choice.words.length) ? Number.MAX_SAFE_INTEGER : total * choice.words.length),
    1,
  );
  const build = (picks: readonly number[]) => {
    const letters = [...plan.original];
    choices.forEach((choice, g) => choice.words[picks[g]].forEach((letter, i) => (letters[choice.start + i] = letter)));
    return letters;
  };

  const candidates: Candidate[] = [];
  if (combinations <= LIST_UP_TO) {
    const picks = choices.map(() => 0);
    while (combinations > 0) {
      const letters = build(picks);
      if (!same(letters, plan.original)) candidates.push({ letters, words: text.words, cost });
      let g = picks.length - 1;
      while (g >= 0 && ++picks[g] === choices[g].words.length) picks[g--] = 0;
      if (g < 0) break;
    }
  } else {
    const seen = new Set<string>();
    for (let tries = 0; candidates.length < count && tries < count * 20; tries++) {
      const picks = choices.map((choice) => randomInt(random, choice.words.length));
      const key = picks.join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      const letters = build(picks);
      if (!same(letters, plan.original)) candidates.push({ letters, words: text.words, cost });
    }
  }

  const exact = choices.every((choice) => choice.fitting !== null);
  const own = cost === 0 && choices.every((choice) => choice.hasOwn) ? 1 : 0;
  const fitting = !exact ? null : cost > 0 ? 0 : choices.reduce((total, choice) => total * choice.fitting!, 1) - own;
  return {
    candidates: shuffled(candidates, random),
    fitting,
    complete: exact && !choices.some((choice) => choice.trimmed) && combinations <= LIST_UP_TO && candidates.length <= count,
  };
}

/** The word lengths for every shape but 'count', whose lengths change from one arrangement to the next. */
function wordsOf(text: Text, rules: Rules): number[] {
  if (rules.shape === 'run') return text.letters.length > 0 ? [text.letters.length] : [];
  if (rules.shape === 'pattern') return [...rules.pattern];
  return text.words;
}

function shortfallsOf(plan: Plan, rules: Rules, shown: readonly Candidate[]): Shortfall[] {
  if (shown.length === 0 || shown.some((candidate) => candidate.cost === 0)) return [];
  const shortfalls: Shortfall[] = [];
  if (rules.moveEvery) {
    plan.groups.forEach((group, g) => {
      const copies = new Map<string, number>();
      for (const slot of group) copies.set(plan.original[slot], (copies.get(plan.original[slot]) ?? 0) + 1);
      for (const [letter, copy] of copies) {
        if (copy * 2 > group.length) shortfalls.push({ kind: 'move', letter, word: plan.groupWords[g]?.text ?? null });
      }
    });
  }
  if (rules.partNeighbours && shown.every((candidate) => neighboursKept(plan.pairs, candidate.letters, candidate.words) > 0)) {
    shortfalls.push({ kind: 'neighbours' });
  }
  return shortfalls.length > 0 ? shortfalls : [{ kind: 'rules' }];
}

/** Letters in their words, for sorting from A to Z. */
const wordsText = (arrangement: Arrangement) => {
  let start = 0;
  return arrangement.words
    .map((length) => {
      start += length;
      return arrangement.letters.slice(start - length, start).join('');
    })
    .join(' ');
};

/**
 * Up to `count` different arrangements of a text's letters, following the rules as far as the
 * letters allow. Never the letters in their own order, and never one that spells a slur or a swear
 * word. When there are few enough, every one is looked at, and when there are only a few, the
 * list has them all.
 */
export function scramble(text: Text, rules: Rules, { count, order, sayable }: ScrambleOptions, random: Random): Scramble {
  const n = text.letters.length;
  if (rules.shape === 'pattern' && sum(rules.pattern) !== n) {
    return { arrangements: [], others: 0, fitting: null, complete: true, shortfalls: n > 0 ? [{ kind: 'pattern', letters: n }] : [] };
  }
  const plan = planOf(text, rules);
  const strict = rules.moveEvery || rules.partNeighbours;
  const k = wordsWanted(n, rules);
  const skeletons = rules.shape === 'count' ? countSplits(n, k, shortest(n, k)) : 1;
  const each = plan.groups.reduce((total, group) => {
    const ways = countArrangements(group.map((slot) => plan.original[slot]));
    return total > Number.MAX_SAFE_INTEGER / ways ? Number.MAX_SAFE_INTEGER : total * ways;
  }, 1);
  const others = each - 1 > Number.MAX_SAFE_INTEGER / skeletons ? Number.MAX_SAFE_INTEGER : (each - 1) * skeletons;

  // Sayable scrambles are the most sayable of more candidates.
  const pool = sayable ? Math.max(count * SAYABLE_POOL, 150) : count;
  let candidates: Candidate[];
  let fitting: number | null = null;
  let complete = false;
  if (rules.shape === 'words') {
    ({ candidates, fitting, complete } = byWord(text, plan, rules, pool, random, sayable, count));
    complete &&= candidates.length <= count;
  } else if (others <= LIST_UP_TO) {
    const all: Candidate[] = [];
    const shapes = rules.shape === 'count' ? Array.from(splits(n, k, shortest(n, k))) : [wordsOf(text, rules)];
    for (const words of shapes) {
      const ends = endsOf(words, n);
      for (const letters of everyArrangement(plan)) {
        if (same(letters, plan.original) || spellsBlocked(letters, words)) continue;
        all.push({ letters, words, cost: strict ? costOf(letters, ends, plan, rules) : 0 });
      }
    }
    fitting = all.filter((candidate) => candidate.cost === 0).length;
    const least = all.reduce((lowest, candidate) => Math.min(lowest, candidate.cost), Infinity);
    candidates = shuffled(
      all.filter((candidate) => candidate.cost === least),
      random,
    );
    complete = candidates.length <= count;
  } else {
    candidates = sample(text, plan, rules, pool, random, sayable, count);
  }

  const measure = (candidate: Candidate): Arrangement & { cost: number; say: number } => ({
    letters: candidate.letters,
    words: candidate.words,
    cost: candidate.cost,
    inPlace: inPlace(plan.original, candidate.letters),
    neighboursKept: neighboursKept(plan.pairs, candidate.letters, candidate.words),
    longestRun: longestRun(plan.pieces, candidate.letters, candidate.words),
    say: sayable ? sayCost(sayable.model, candidate.letters, candidate.words) : 0,
  });
  type Measured = ReturnType<typeof measure>;
  // Best first: those that break the fewest rules, then give away the least, whole pieces of the
  // text first, then old neighbours, then letters in place. Sorting keeps the shuffled order among equals.
  const byGiveaway = (a: Measured, b: Measured) =>
    a.cost - b.cost || a.longestRun - b.longestRun || a.neighboursKept - b.neighboursKept || a.inPlace - b.inPlace;
  // Sayable: those that break the fewest rules, then those that leave no piece of the text whole
  // (SESAME backwards is very sayable, and no puzzle at all), then the most sayable.
  const bySaying = (a: Measured, b: Measured) =>
    a.cost - b.cost || Number(a.longestRun > 2) - Number(b.longestRun > 2) || a.say - b.say || byGiveaway(a, b);
  let shown: Measured[];
  if (sayable) {
    const ranked = candidates.map(measure).sort(bySaying);
    // Very: the most sayable. Somewhat: a random handful of the more sayable half.
    shown =
      sayable.level === 'very'
        ? ranked.slice(0, count)
        : shuffled(ranked.slice(0, Math.max(count, Math.ceil(ranked.length / 2))), random)
            .slice(0, count)
            .sort(order === 'best' ? bySaying : () => 0);
    if (order === 'shuffled') shown = shuffled(shown, random);
  } else {
    shown = order === 'best' ? candidates.map(measure).sort(byGiveaway).slice(0, count) : candidates.slice(0, count).map(measure);
  }
  if (order === 'az') shown.sort((a, b) => wordsText(a).localeCompare(wordsText(b), 'en'));

  return {
    arrangements: shown.map((arrangement) => ({
      letters: arrangement.letters,
      words: arrangement.words,
      inPlace: arrangement.inPlace,
      neighboursKept: arrangement.neighboursKept,
      longestRun: arrangement.longestRun,
    })),
    others,
    fitting,
    complete,
    shortfalls: shortfallsOf(plan, rules, shown),
  };
}
