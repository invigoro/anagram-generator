/**
 * A text as the scrambler reads it: its letters, in capitals, how they fall into words, and any
 * punctuation kept in place. A letter is one character as a reader sees it, so É stays one
 * letter however it was typed.
 */

export interface LetterOptions {
  /** Punctuation left out, or kept where it was. */
  punctuation: 'drop' | 'keep';
  /** Digits scrambled with the letters, or left out. */
  digits: 'scramble' | 'drop';
  /** Accented letters kept as they are, or with their accents taken off (É becomes E). */
  accents: 'keep' | 'fold';
}

export const DEFAULT_LETTER_OPTIONS: LetterOptions = { punctuation: 'drop', digits: 'scramble', accents: 'keep' };

/**
 * Punctuation kept in place, after `at` of the text's letters. Where that falls between two words,
 * `joins` says which it goes with: the word before it (a comma), the word after it (an opening
 * bracket), or neither (a dash with spaces either side).
 */
export interface Mark {
  text: string;
  at: number;
  joins: 'before' | 'after' | 'neither';
}

export interface Text {
  letters: string[];
  /** How many letters each word has, in order. Words without any letters aren't counted. */
  words: number[];
  /** Punctuation kept in place, in order. */
  marks: Mark[];
}

const characters = new Intl.Segmenter('en', { granularity: 'grapheme' });
const LETTER = /\p{L}/u;
const DIGIT = /\p{Nd}/u;

/** Letters whose accent can't simply be taken off, as they're written without one. */
const UNACCENTED: Readonly<Record<string, string>> = { Æ: 'AE', Œ: 'OE', Ø: 'O', Ł: 'L', Đ: 'D', Ð: 'D', Þ: 'TH', Ħ: 'H' };

function withoutAccent(letter: string): string[] {
  const bare = letter.normalize('NFD').replace(/\p{M}/gu, '');
  return [...(UNACCENTED[bare] ?? bare)];
}

export function readText(text: string, options: LetterOptions = DEFAULT_LETTER_OPTIONS): Text {
  const letters: string[] = [];
  const words: number[] = [];
  const marks: Mark[] = [];
  // Capitals before anything else, since some letters become two: ß becomes SS.
  for (const token of text.toLocaleUpperCase('en').normalize('NFC').split(/\s+/)) {
    const start = letters.length;
    // Punctuation before the word's first letter, which opens the word.
    const opening: string[] = [];
    for (const { segment } of characters.segment(token)) {
      const letter = LETTER.test(segment);
      if (letter || (DIGIT.test(segment) && options.digits === 'scramble')) {
        if (opening.length > 0) marks.push(...opening.splice(0).map((mark) => ({ text: mark, at: start, joins: 'after' as const })));
        letters.push(...(letter && options.accents === 'fold' ? withoutAccent(segment) : [segment]));
      } else if (!DIGIT.test(segment) && options.punctuation === 'keep') {
        if (letters.length === start) opening.push(segment);
        else marks.push({ text: segment, at: letters.length, joins: 'before' });
      }
    }
    if (letters.length > start) words.push(letters.length - start);
    else if (opening.length > 0) marks.push({ text: opening.join(''), at: start, joins: 'neither' });
  }
  return { letters, words, marks };
}
