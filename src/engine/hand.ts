/**
 * An anagram written by hand, against the text it's an anagram of: the text's letters it hasn't
 * used yet, and any it uses more often than the text has them. Letters are compared in capitals
 * without accents, so É counts as E.
 */

const plain = (letter: string) => letter.normalize('NFD').replace(/\p{M}/gu, '');

export interface Bank {
  /** The text's letters not used yet, in the text's order. */
  left: string[];
  /** Letters used more often than the text has them, each as many times as it's over. */
  over: string[];
}

export function lettersLeft(text: readonly string[], anagram: readonly string[]): Bank {
  const left = text.map(plain);
  const over: string[] = [];
  for (const letter of anagram.map(plain)) {
    const at = left.indexOf(letter);
    if (at >= 0) left.splice(at, 1);
    else over.push(letter);
  }
  return { left, over };
}
