/**
 * How much an arrangement gives away: letters left where they were, letters that sat side by
 * side in a word and still do, and the longest piece of the text left whole. An arrangement's
 * words can differ from the text's, so each is given as its letters and its words' lengths.
 */

/** A pair of letters, either way round: AB and BA are the same pair. */
export const pairOf = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

/** Each word's letters, from all the letters and the words' lengths. */
function eachWord(letters: readonly string[], words: readonly number[]): string[][] {
  const split: string[][] = [];
  let start = 0;
  for (const length of words) {
    split.push(letters.slice(start, start + length));
    start += length;
  }
  return split;
}

/** Every pair of letters that sits side by side in a word of the text. */
export function neighbourPairs(letters: readonly string[], words: readonly number[]): Set<string> {
  const pairs = new Set<string>();
  for (const word of eachWord(letters, words)) for (let i = 1; i < word.length; i++) pairs.add(pairOf(word[i - 1], word[i]));
  return pairs;
}

/**
 * Every run of letters in a word of the text, forwards and backwards, for `longestRun`: a word
 * written backwards gives itself away as surely as one left alone.
 */
export function piecesOf(letters: readonly string[], words: readonly number[]): Set<string> {
  const pieces = new Set<string>();
  for (const word of eachWord(letters, words)) {
    for (let start = 0; start < word.length; start++) {
      for (let end = start + 1; end <= word.length; end++) {
        const piece = word.slice(start, end);
        pieces.add(piece.join('\u0000'));
        pieces.add(piece.reverse().join('\u0000'));
      }
    }
  }
  return pieces;
}

/** How many letters are where they were in the text. */
export function inPlace(original: readonly string[], letters: readonly string[]): number {
  return letters.reduce((count, letter, i) => count + (letter === original[i] ? 1 : 0), 0);
}

/** How many pairs of letters side by side in a word were side by side in a word of the text. */
export function neighboursKept(pairs: ReadonlySet<string>, letters: readonly string[], words: readonly number[]): number {
  let kept = 0;
  for (const word of eachWord(letters, words)) for (let i = 1; i < word.length; i++) if (pairs.has(pairOf(word[i - 1], word[i]))) kept++;
  return kept;
}

/** The most letters in a row, within a word, that read as they did somewhere in the text's words, either way. */
export function longestRun(pieces: ReadonlySet<string>, letters: readonly string[], words: readonly number[]): number {
  let longest = 0;
  for (const word of eachWord(letters, words)) {
    for (let start = 0; start + longest < word.length; start++) {
      // A piece of the text, either way, has every shorter piece of it among them too, so stop at the first miss.
      let end = start + longest + 1;
      while (end <= word.length && pieces.has(word.slice(start, end).join('\u0000'))) end++;
      longest = Math.max(longest, end - 1 - start);
    }
  }
  return longest;
}
