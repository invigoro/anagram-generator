// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

// Seeds come in a fixed sequence, so every run shows the same arrangements.
let nextSeed = 1;
vi.mock('../engine/rng', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../engine/rng')>()),
  randomSeed: () => nextSeed++,
}));

beforeEach(() => {
  nextSeed = 1;
});
afterEach(cleanup);

const textBox = () => screen.getByRole('textbox', { name: 'Word or phrase' });

/** The arrangements on the page, in order. */
function shown(): string[] {
  const list = screen.queryByRole('list', { name: 'Arrangements' });
  return list ? within(list).getAllByRole('listitem').map((item) => item.textContent ?? '') : [];
}

const sorted = (text: string) => [...text].sort().join('');

describe('App', () => {
  it('starts empty, asking for something to scramble', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Anagram' })).toBeInTheDocument();
    expect(screen.getByText('Type a word or phrase to scramble it.')).toBeInTheDocument();
    expect(shown()).toEqual([]);
  });

  it('scrambles the letters as you type, in capitals, never as typed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(textBox(), 'Open sesame!');
    const found = shown();
    expect(found).toHaveLength(50);
    expect(new Set(found).size).toBe(50);
    expect(found).not.toContain('OPENSESAME');
    for (const arrangement of found) expect(sorted(arrangement)).toBe(sorted('OPENSESAME'));
    expect(screen.getByText('50 of 302,399 other arrangements')).toBeInTheDocument();
  });

  it('lists every arrangement of a short word', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(textBox(), 'cat');
    expect([...shown()].sort()).toEqual(['ACT', 'ATC', 'CTA', 'TAC', 'TCA']);
    expect(screen.getByText('All 5 other arrangements')).toBeInTheDocument();
    await user.type(textBox(), 's');
    expect(shown()).toHaveLength(23);
    expect(screen.getByText('All 23 other arrangements')).toBeInTheDocument();
  });

  it('says when there’s nothing to rearrange', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(textBox(), 'aaa');
    expect(screen.getByText('There’s no other way to arrange these letters.')).toBeInTheDocument();
    await user.clear(textBox());
    await user.type(textBox(), '?!');
    expect(screen.getByText('There are no letters or digits to scramble.')).toBeInTheDocument();
  });

  it('rerolls for new arrangements, and shows the seed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(textBox(), 'password');
    expect(screen.getByText('Seed 1')).toBeInTheDocument();
    const first = shown();
    await user.click(screen.getByRole('button', { name: 'Reroll' }));
    expect(screen.getByText('Seed 2')).toBeInTheDocument();
    expect(shown()).toHaveLength(50);
    expect(shown()).not.toEqual(first);
  });

  it('copies the arrangements, one to a line', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(textBox(), 'listen');
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await navigator.clipboard.readText()).toBe(shown().join('\n'));
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
  });

  it('says so when it can’t copy', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(textBox(), 'listen');
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'));
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(screen.getByRole('status')).toHaveTextContent(/Couldn’t copy/);
  });
});
