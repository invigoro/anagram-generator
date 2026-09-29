// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { NEW_PUZZLE } from '../engine/puzzle';
import Player from './Player';
import { playerPuzzleOf, type PlayerPuzzle } from './playerLink';

let puzzle: PlayerPuzzle;
beforeAll(async () => {
  puzzle = await playerPuzzleOf({ ...NEW_PUZZLE, clue: 'TAC', riddle: 'What purrs?', success: 'It purrs.', playerHints: 2 }, 'cat');
});
afterEach(cleanup);

const tiles = () =>
  within(screen.getByRole('group', { name: 'Your answer' }))
    .getAllByRole('button')
    .map((tile) => tile.textContent);
const tile = (name: string) => screen.getByRole('button', { name });

describe('the players’ page', () => {
  it('shows the riddle and the clue, and never the answer', () => {
    render(<Player puzzle={puzzle} />);
    expect(screen.getByText('What purrs?')).toBeInTheDocument();
    expect(tiles()).toEqual(['T', 'A', 'C']);
    expect(document.body).not.toHaveTextContent(/cat/i);
  });

  it('swaps two letters picked in turn, and says so when they spell the answer', async () => {
    const user = userEvent.setup();
    render(<Player puzzle={puzzle} />);
    await user.click(tile('T, 1 of 3'));
    expect(tile('T, 1 of 3')).toHaveAttribute('aria-pressed', 'true');
    await user.click(tile('C, 3 of 3'));
    expect(tiles()).toEqual(['C', 'A', 'T']);
    expect(await screen.findByText('It purrs.')).toBeInTheDocument();
  });

  it('moves a picked letter with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Player puzzle={puzzle} />);
    await user.click(tile('C, 3 of 3'));
    await user.keyboard('{ArrowLeft}{ArrowLeft}{Escape}');
    expect(tiles()).toEqual(['C', 'T', 'A']);
    expect(screen.queryByText('It purrs.')).not.toBeInTheDocument();
    await user.click(tile('T, 2 of 3'));
    await user.keyboard('{ArrowRight}');
    expect(tiles()).toEqual(['C', 'A', 'T']);
    expect(await screen.findByText('It purrs.')).toBeInTheDocument();
  });

  it('checks a guess typed in', async () => {
    const user = userEvent.setup();
    render(<Player puzzle={puzzle} />);
    const guess = screen.getByRole('textbox', { name: 'Or type it' });
    await user.type(guess, 'act');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Not quite. Try again.')).toBeInTheDocument();
    await user.clear(guess);
    await user.type(guess, 'Cat!');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('It purrs.')).toBeInTheDocument();
  });

  it('gives the hints the game master allows, one at a time', async () => {
    const user = userEvent.setup();
    render(<Player puzzle={puzzle} />);
    await user.click(screen.getByRole('button', { name: 'Take a hint' }));
    expect(within(screen.getByLabelText('Hint 1 of 2')).getAllByLabelText('a letter to find')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Another hint (1 of 2 taken)' }));
    expect(screen.getByLabelText('Hint 2 of 2')).toHaveTextContent('C');
    expect(screen.getByRole('button', { name: 'Another hint (2 of 2 taken)' })).toBeDisabled();
  });

  it('says so when a link holds no puzzle', () => {
    render(<Player puzzle={null} />);
    expect(screen.getByText('This link doesn’t hold a puzzle. Ask whoever sent it for it again.')).toBeInTheDocument();
  });
});
