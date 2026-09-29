/**
 * Hints for a puzzle, each giving away a little more of the answer: its word lengths, then the first
 * letter of each word, then one more letter at a time, taking the words in turn, until only one
 * letter is left to find. The last hint never gives the whole answer away.
 */
import type { Text } from './letters';

/** A hint: the answer's words, each letter shown or not yet (null). */
export type Hint = (string | null)[][];

export function hintLadder(answer: Text): Hint[] {
  let start = 0;
  const words = answer.words.map((length) => answer.letters.slice(start, (start += length)));
  const shown = words.map((word) => word.map(() => false));
  const hint = (): Hint => words.map((word, w) => word.map((letter, i) => (shown[w][i] ? letter : null)));
  const hidden = () => shown.reduce((count, word) => count + word.filter((letter) => !letter).length, 0);
  const ladder: Hint[] = [];
  if (answer.letters.length < 2) return ladder;
  ladder.push(hint());
  // First letters, as long as that leaves something to find.
  words.forEach((_, w) => (shown[w][0] = true));
  if (hidden() >= 1) ladder.push(hint());
  // Then a letter at a time, from each word in turn, left to right.
  for (let i = 1; hidden() > 1; i++) {
    for (let w = 0; w < words.length && hidden() > 1; w++) {
      if (i >= words[w].length) continue;
      shown[w][i] = true;
      ladder.push(hint());
    }
  }
  return ladder;
}

/** A hint as text: "O _ _ _   S _ _ _ _ _". */
export const hintText = (hint: Hint) => hint.map((word) => word.map((letter) => letter ?? '_').join(' ')).join('   ');
