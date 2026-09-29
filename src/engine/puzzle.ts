/**
 * A puzzle: an answer, and the clue the players get, an anagram of it. This is what the page knows
 * about a clue: whether it fits the answer, how much it gives away, and what else its letters spell.
 */
import { inPlace, longestPiece, neighbourPairs, neighboursKept, piecesOf } from './difficulty';
import { lettersLeft } from './hand';
import type { Text } from './letters';
import type { Phrase } from './solver';
import { DEFAULT_STELE, type SteleOptions } from './stele';

export interface Puzzle {
  /** The clue, as it's shown: "NEPO EMASES". */
  clue: string;
  /** Other answers the game master accepts too, in capitals with single spaces: "PEON SESAME". */
  accepted: string[];
  /** A riddle line of the game master's own, told to the players with the clue. */
  riddle: string;
  /** What the players see when they get it right. */
  success: string;
  /** How many of the hints a player link lets players take. */
  playerHints: number;
  /** What Stele puts the clue on, and in what letters. */
  stele: SteleOptions;
  /** How the clue is split, to hand out or hide in pieces: not at all (1), a word to a piece, or into so many. */
  split: Split;
}

export type Split = number | 'words';

/** The most pieces a clue is split into. */
export const MOST_PIECES = 12;

export const NEW_PUZZLE: Omit<Puzzle, 'clue'> = { accepted: [], riddle: '', success: 'The way opens.', playerHints: 2, stele: DEFAULT_STELE, split: 1 };

/** Whether a clue uses exactly the answer's letters. */
export function fits(answer: Text, clue: Text): boolean {
  const { left, over } = lettersLeft(answer.letters, clue.letters);
  return left.length === 0 && over.length === 0 && answer.letters.length > 0;
}

export interface Readout {
  /** The clue's letters left where they are in the answer. */
  inPlace: number;
  /** Pairs of letters side by side in the answer's words that still are in the clue's. */
  neighboursKept: number;
  /** The longest piece of the answer left whole, either way round. */
  piece: string;
}

/** How much a clue gives away of the answer. */
export function readout(answer: Text, clue: Text): Readout {
  return {
    inPlace: inPlace(answer.letters, clue.letters),
    neighboursKept: neighboursKept(neighbourPairs(answer.letters, answer.words), clue.letters, clue.words),
    piece: longestPiece(piecesOf(answer.letters, answer.words), clue.letters, clue.words).join(''),
  };
}

/** A text's words, as strings. */
export function wordsOf(text: Text): string[] {
  let start = 0;
  return text.words.map((length) => text.letters.slice(start, (start += length)).join(''));
}

/** A phrase's words in a fixed order, to tell two phrases of the same words apart from different ones. */
const sameWords = (words: readonly string[]) => [...words].sort().join(' ');

export interface OtherAnswer {
  /** The phrase, in capitals with single spaces. */
  text: string;
  /** Whether its words have the answer's lengths, so a hint of the lengths wouldn't tell them apart. */
  sameLengths: boolean;
}

/**
 * The other answers players might find, from the phrases the answer's letters spell: never the
 * answer itself, in any order, and those with the answer's word lengths first.
 */
export function otherAnswers(answer: Text, phrases: readonly Phrase[]): OtherAnswer[] {
  const own = sameWords(wordsOf(answer));
  const lengths = [...answer.words].sort().join(',');
  const others = phrases
    .filter((phrase) => phrase.leftover.length === 0 && sameWords(phrase.words) !== own)
    .map((phrase) => ({ text: phrase.words.join(' '), sameLengths: phrase.words.map((word) => word.length).sort().join(',') === lengths }));
  // A stable sort keeps the search's order, best first, within each kind.
  return others.sort((a, b) => Number(b.sameLengths) - Number(a.sameLengths));
}

const characters = new Intl.Segmenter('en', { granularity: 'grapheme' });

/**
 * The clue in pieces, to hand out or hide around the place: a word to a piece, or its letters
 * shared out as evenly as they go, in the clue's order. A piece keeps the spaces inside it, so
 * each still shows where the clue's words part.
 */
export function fragmentsOf(clue: string, split: Split): string[] {
  const words = clue.trim().split(/\s+/).filter((word) => word !== '');
  if (split === 'words') return words;
  const joined = words.join(' ');
  const all = Array.from(characters.segment(joined), ({ segment }) => segment);
  const letters = all.filter((character) => character !== ' ').length;
  const count = Math.max(1, Math.min(split, letters));
  const pieces: string[] = [];
  let piece = '';
  let size = 0;
  for (const character of all) {
    if (character === ' ') {
      if (piece !== '') piece += ' ';
      continue;
    }
    piece += character;
    size += 1;
    // The first pieces take the letters left over from sharing them out evenly.
    if (size === Math.floor(letters / count) + (pieces.length < letters % count ? 1 : 0)) {
      pieces.push(piece);
      piece = '';
      size = 0;
    }
  }
  return pieces;
}

/** A guess or an answer as it's compared: its letters only, in capitals, accents off. */
export const comparable = (text: Text) => text.letters.join('');
