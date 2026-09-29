/**
 * Player links: a page for the players with only what they should see, the clue, the riddle, the
 * hints the game master allows and what to say when they get it, and fingerprints to check a
 * guess against, never the answer itself. "#p=", then JSON, packed as the page's own links are.
 */
import { fingerprint, newSalt } from '../engine/check';
import { hintLadder, type Hint } from '../engine/hints';
import { readFolded } from '../engine/letters';
import { comparable, type Puzzle } from '../engine/puzzle';
import { pack, unpack } from './packing';

export const PLAYER_PREFIX = '#p=';

export interface PlayerPuzzle {
  clue: string;
  riddle: string;
  success: string;
  /** The hints the players may take, in order. */
  hints: Hint[];
  salt: string;
  /** Fingerprints of each answer that counts: the answer, and any the game master accepts too. */
  answers: string[];
}

/** What a player link holds for a puzzle. */
export async function playerPuzzleOf(puzzle: Puzzle, answer: string): Promise<PlayerPuzzle> {
  const salt = newSalt();
  const letters = new Set([answer, ...puzzle.accepted].map((text) => comparable(readFolded(text))).filter((letters) => letters !== ''));
  return {
    clue: puzzle.clue,
    riddle: puzzle.riddle.trim(),
    success: puzzle.success.trim(),
    hints: hintLadder(readFolded(answer)).slice(0, puzzle.playerHints),
    salt,
    answers: await Promise.all([...letters].map((each) => fingerprint(each, salt))),
  };
}

/** The address of the players' page. */
export async function playerLinkFor(player: PlayerPuzzle, base = window.location.href): Promise<string> {
  const url = new URL(base);
  url.hash = PLAYER_PREFIX + (await pack({ v: 1, ...player }));
  return url.toString();
}

const textIn = (value: unknown, longest: number) => (typeof value === 'string' && value.length <= longest ? value : null);

/** A hint from untrusted data: words of letters, each shown (a short string) or not yet (null). */
function hintIn(data: unknown): Hint | null {
  if (!Array.isArray(data) || data.length > 50) return null;
  const words = data.map((word) =>
    Array.isArray(word) && word.length <= 100 && word.every((letter) => letter === null || (typeof letter === 'string' && letter.length <= 4))
      ? (word as (string | null)[])
      : null,
  );
  return words.every((word) => word !== null) ? (words as Hint) : null;
}

/** The puzzle a player link's fragment holds, checked, or null if it doesn't hold one. */
export async function readPlayerLink(hash: string): Promise<PlayerPuzzle | null> {
  if (!hash.startsWith(PLAYER_PREFIX)) return null;
  const data = await unpack(hash.slice(PLAYER_PREFIX.length));
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  const clue = textIn(input.clue, 1000);
  const salt = textIn(input.salt, 64);
  if (!clue?.trim() || !salt || !Array.isArray(input.answers)) return null;
  const answers = input.answers.filter((answer): answer is string => typeof answer === 'string' && answer.length <= 64).slice(0, 51);
  if (answers.length === 0) return null;
  const hints = Array.isArray(input.hints) ? input.hints.slice(0, 100).map(hintIn) : [];
  return {
    clue,
    riddle: textIn(input.riddle, 500) ?? '',
    success: textIn(input.success, 200) ?? '',
    // Every hint, or none: one that doesn't make sense would mix up the rest.
    hints: hints.every((hint) => hint !== null) ? (hints as Hint[]) : [],
    salt,
    answers,
  };
}

/** Whether a guess is an answer that counts: its letters are compared, whatever their case, spacing or punctuation. */
export async function isRight(player: PlayerPuzzle, guess: string): Promise<boolean> {
  const letters = comparable(readFolded(guess));
  return letters !== '' && player.answers.includes(await fingerprint(letters, player.salt));
}
