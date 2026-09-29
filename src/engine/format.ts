import type { Mark } from './letters';

export type LetterCase = 'upper' | 'lower' | 'title';

/**
 * An arrangement as it's shown: its words, each a list of characters, with the letters in the case
 * asked for and the punctuation back in place. Punctuation goes after the same number of letters
 * as in the text; where that falls between words, it goes with the word it went with before.
 */
export function formatWords(letters: readonly string[], words: readonly number[], marks: readonly Mark[], letterCase: LetterCase): string[][] {
  const shown: string[][] = [];
  let next = 0;
  /** The marks after `at` letters, taken in order. */
  const marksAt = (at: number) => {
    const found: Mark[] = [];
    while (next < marks.length && marks[next].at === at) found.push(marks[next++]);
    return found;
  };
  const cased = (letter: string, first: boolean) =>
    letterCase === 'lower' || (letterCase === 'title' && !first) ? letter.toLocaleLowerCase('en') : letter;

  let at = 0;
  for (const length of words) {
    const word: string[] = [];
    for (const mark of marksAt(at)) {
      if (mark.joins === 'neither') shown.push([mark.text]);
      else if (mark.joins === 'before' && shown.length > 0) shown[shown.length - 1].push(mark.text);
      else word.push(mark.text);
    }
    for (let i = 0; i < length; i++) {
      if (i > 0) for (const mark of marksAt(at)) word.push(mark.text);
      word.push(cased(letters[at], i === 0));
      at++;
    }
    shown.push(word);
  }
  for (const mark of marksAt(at)) {
    if (mark.joins === 'neither' || shown.length === 0) shown.push([mark.text]);
    else shown[shown.length - 1].push(mark.text);
  }
  return shown;
}

/** Words as plain text: a space between words, or every character spaced out and three spaces between words. */
export function asText(words: readonly (readonly string[])[], spaced: boolean): string {
  return spaced ? words.map((word) => word.join(' ')).join('   ') : words.map((word) => word.join('')).join(' ');
}
