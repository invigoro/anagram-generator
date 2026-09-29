/**
 * The word lists, by ESDB size: the words that first appear at each size, commonest first.
 * SOURCES.md records where they came from. Each file is built as its own chunk and fetched only
 * when first used.
 */
import { makeDictionary, type Dictionary } from '../../engine/words';

export const SIZES = [35, 50, 60, 70] as const;
export type Size = (typeof SIZES)[number];

const FILES: Record<Size, () => Promise<string>> = {
  35: () => import('./35.txt?raw').then((module) => module.default),
  50: () => import('./50.txt?raw').then((module) => module.default),
  60: () => import('./60.txt?raw').then((module) => module.default),
  70: () => import('./70.txt?raw').then((module) => module.default),
};

export type WordList = 'common' | 'standard' | 'large';
export const WORD_LISTS: readonly WordList[] = ['common', 'standard', 'large'];

/** The sizes each list is made of. */
export const LIST_SIZES: Readonly<Record<WordList, readonly Size[]>> = {
  common: [35],
  standard: [35, 50],
  large: [35, 50, 60, 70],
};

/** The words that first appear at a size, without the notice at the top of the file. */
export async function loadSize(size: Size): Promise<string[]> {
  const text = await FILES[size]();
  return text.split('\n').filter((line) => line !== '' && !line.startsWith('#'));
}

const dictionaries = new Map<string, Promise<Dictionary>>();

/**
 * A word list as a dictionary, with the game master's own words in it too, ranked first (see
 * RANK_COSTS). The last few are kept, since building one takes a moment.
 */
export function loadDictionary(list: WordList, yourWords: readonly string[]): Promise<Dictionary> {
  const key = `${list}|${yourWords.join(',')}`;
  let dictionary = dictionaries.get(key);
  if (!dictionary) {
    dictionary = Promise.all(LIST_SIZES[list].map(loadSize)).then((sizes) => makeDictionary([yourWords, ...sizes]));
    dictionaries.set(key, dictionary);
    if (dictionaries.size > 4) dictionaries.delete(dictionaries.keys().next().value!);
    // A list that failed to load is tried again next time.
    dictionary.catch(() => dictionaries.delete(key));
  }
  return dictionary;
}
