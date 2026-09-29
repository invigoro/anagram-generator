/**
 * A word list made ready for finding anagrams: each word's letters counted, and the words filed by
 * their letters in alphabetical order (their key), so the words that use exactly some letters are
 * found at once: EILNST files ENLIST, INLETS, LISTEN, SILENT and TINSEL.
 */

const A = 'A'.charCodeAt(0);

export interface Dictionary {
  /** Each word, in capitals. */
  words: string[];
  /** How common each word is, from 0 (the commonest list given) up. */
  ranks: Uint8Array;
  /** Each word's letter counts, A to Z: 26 to a word. */
  counts: Uint8Array;
  /** Which letters each word has, one bit per letter. */
  masks: Uint32Array;
  /** The words with each key. */
  byKey: Map<string, number[]>;
}

/** A word's letters in alphabetical order. */
export const keyOf = (word: string) => [...word].sort().join('');

/** The key for letter counts, A to Z. */
export function keyOfCounts(counts: ArrayLike<number>): string {
  let key = '';
  for (let letter = 0; letter < 26; letter++) key += String.fromCharCode(A + letter).repeat(counts[letter]);
  return key;
}

/** Letter counts, A to Z, of letters that are all A to Z. */
export function countsOf(letters: Iterable<string>): Uint8Array {
  const counts = new Uint8Array(26);
  for (const letter of letters) counts[letter.charCodeAt(0) - A]++;
  return counts;
}

const indexes = new WeakMap<Dictionary, Map<string, number>>();

/** Where each word is in a dictionary, worked out once for each. */
function indexOf(dict: Dictionary): Map<string, number> {
  let index = indexes.get(dict);
  if (!index) indexes.set(dict, (index = new Map(dict.words.map((word, i) => [word, i]))));
  return index;
}

/**
 * A dictionary with more words in it, ranked `rank`: the game master's own, added to a word list's
 * without building the list's again. A word already there takes the new rank if it's commoner.
 */
export function withWords(dict: Dictionary, added: readonly string[], rank: number): Dictionary {
  if (added.length === 0) return dict;
  const ranks = Uint8Array.from(dict.ranks);
  const known = indexOf(dict);
  const extra: string[] = [];
  for (const listed of added) {
    const word = listed.toUpperCase();
    if (!/^[A-Z]+$/.test(word) || extra.includes(word)) continue;
    const at = known.get(word);
    if (at === undefined) extra.push(word);
    else ranks[at] = Math.min(ranks[at], rank);
  }
  if (extra.length === 0) return { ...dict, ranks };
  const more = makeDictionary([extra]);
  const counts = new Uint8Array(dict.counts.length + more.counts.length);
  counts.set(dict.counts);
  counts.set(more.counts, dict.counts.length);
  const masks = new Uint32Array(dict.masks.length + more.masks.length);
  masks.set(dict.masks);
  masks.set(more.masks, dict.masks.length);
  const byKey = new Map(dict.byKey);
  more.words.forEach((word, i) => {
    const key = keyOf(word);
    byKey.set(key, [...(byKey.get(key) ?? []), dict.words.length + i]);
  });
  return {
    words: [...dict.words, ...more.words],
    ranks: Uint8Array.from([...ranks, ...more.words.map(() => rank)]),
    counts,
    masks,
    byKey,
  };
}

/**
 * A dictionary from lists of words, commonest list first: each word takes the rank of the first
 * list it's in. Words are put in capitals, and any not wholly of the letters A to Z are left out.
 */
export function makeDictionary(lists: readonly (readonly string[])[]): Dictionary {
  const words: string[] = [];
  const ranks: number[] = [];
  const seen = new Set<string>();
  lists.forEach((list, rank) => {
    for (const listed of list) {
      const word = listed.toUpperCase();
      if (seen.has(word) || !/^[A-Z]+$/.test(word)) continue;
      seen.add(word);
      words.push(word);
      ranks.push(rank);
    }
  });
  const counts = new Uint8Array(words.length * 26);
  const masks = new Uint32Array(words.length);
  const byKey = new Map<string, number[]>();
  words.forEach((word, i) => {
    for (let c = 0; c < word.length; c++) {
      const letter = word.charCodeAt(c) - A;
      counts[i * 26 + letter]++;
      masks[i] |= 1 << letter;
    }
    const key = keyOf(word);
    const filed = byKey.get(key);
    if (filed) filed.push(i);
    else byKey.set(key, [i]);
  });
  return { words, ranks: Uint8Array.from(ranks), counts, masks, byKey };
}
