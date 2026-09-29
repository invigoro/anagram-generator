/**
 * The letters a text is scrambled from: its letters and digits, in capitals, one per character as
 * a reader sees it, so É stays one letter however it was typed. Spaces and punctuation are left
 * out.
 */

const characters = new Intl.Segmenter('en', { granularity: 'grapheme' });

/** A character with a letter or a digit in it. */
const LETTER_OR_DIGIT = /[\p{L}\p{Nd}]/u;

export function lettersOf(text: string): string[] {
  // Capitals before splitting, since some letters become two: ß becomes SS.
  const capitals = text.toLocaleUpperCase('en').normalize('NFC');
  return Array.from(characters.segment(capitals), ({ segment }) => segment).filter((char) => LETTER_OR_DIGIT.test(char));
}
