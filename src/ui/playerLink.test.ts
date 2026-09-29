import { describe, expect, it } from 'vitest';
import { NEW_PUZZLE, type Puzzle } from '../engine/puzzle';
import { pack, unpack } from './packing';
import { isRight, playerLinkFor, playerPuzzleOf, readPlayerLink } from './playerLink';

const puzzle: Puzzle = { ...NEW_PUZZLE, clue: 'NEPO EMASES', accepted: ['PEON SESAME'], riddle: 'What opens the cave?', success: 'The rock rolls aside.' };
const BASE = 'https://sator.invigoro.me/';

describe('player links', () => {
  it('hold the clue, the riddle and the line for getting it right, and never the answer', async () => {
    const link = await playerLinkFor(await playerPuzzleOf(puzzle, 'Open sesame'), BASE);
    expect(link.startsWith(`${BASE}#p=`)).toBe(true);
    const held = JSON.stringify(await unpack(new URL(link).hash.slice(3)));
    expect(held).toContain('NEPO EMASES');
    expect(held).toContain('What opens the cave?');
    expect(held).toContain('The rock rolls aside.');
    for (const answer of ['OPENSESAME', 'OPEN SESAME', 'Open sesame', 'PEONSESAME', 'PEON SESAME']) expect(held).not.toContain(answer);
  });

  it('come back as they went', async () => {
    const player = await playerPuzzleOf(puzzle, 'Open sesame');
    expect(await readPlayerLink(new URL(await playerLinkFor(player, BASE)).hash)).toEqual(player);
  });

  it('carry only the hints the game master allows', async () => {
    expect((await playerPuzzleOf({ ...puzzle, playerHints: 0 }, 'Open sesame')).hints).toEqual([]);
    const two = (await playerPuzzleOf(puzzle, 'Open sesame')).hints;
    expect(two).toHaveLength(2);
    expect(two[1]).toEqual([
      ['O', null, null, null],
      ['S', null, null, null, null, null],
    ]);
  });

  it('take the answer however it’s typed, and any other answer accepted', async () => {
    const player = await playerPuzzleOf(puzzle, 'Open sesame');
    for (const guess of ['open sesame', 'OPENSESAME', 'Open, Sesame!', 'peon sesame']) expect(await isRight(player, guess)).toBe(true);
    for (const guess of ['sesame open', 'enema poses', 'open', '']) expect(await isRight(player, guess)).toBe(false);
  });

  it('get a fresh salt each time, so two links to one answer don’t match', async () => {
    const [a, b] = await Promise.all([playerPuzzleOf(puzzle, 'Open sesame'), playerPuzzleOf(puzzle, 'Open sesame')]);
    expect(a.salt).not.toBe(b.salt);
    expect(a.answers).not.toEqual(b.answers);
  });

  it('leave out what doesn’t fit, and hold nothing without a clue or answers', async () => {
    for (const data of [null, [], { clue: 'X' }, { clue: '', salt: 's', answers: ['a'] }, { clue: 'X', salt: 's', answers: [] }]) {
      expect(await readPlayerLink('#p=' + (await pack(data)))).toBeNull();
    }
    expect(await readPlayerLink('#s=abc')).toBeNull();
    const odd = await readPlayerLink('#p=' + (await pack({ clue: 'X', salt: 's', answers: ['a', 5], hints: [[['A', 7]]], riddle: 9 })));
    expect(odd).toEqual({ clue: 'X', riddle: '', success: '', hints: [], salt: 's', answers: ['a'] });
  });
});
