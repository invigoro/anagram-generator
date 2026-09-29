// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DEFAULT_SETTINGS } from './settings';
import { decodeState, encodeState } from './urlState';

// Seeds come in a fixed sequence, so every run shows the same arrangements.
let nextSeed = 1;
vi.mock('../engine/rng', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../engine/rng')>()),
  randomSeed: () => nextSeed++,
}));

beforeEach(() => {
  nextSeed = 1;
  window.history.replaceState(null, '', '/');
});
afterEach(cleanup);

const textBox = () => screen.getByRole('textbox', { name: 'Word or phrase' });

/** The arrangements on the page, in order. */
function shown(): string[] {
  const list = screen.queryByRole('list', { name: 'Arrangements' });
  return list ? within(list).getAllByRole('listitem').map((item) => item.textContent ?? '') : [];
}

const sorted = (text: string) => [...text].sort().join('');

/** Types the text into a fresh page. */
async function start(text: string) {
  const user = userEvent.setup();
  const view = render(<App />);
  await user.type(textBox(), text);
  return { user, ...view };
}

async function moreOptions(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText('More options'));
}

describe('App', () => {
  it('starts empty, asking for something to scramble', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sator' })).toBeInTheDocument();
    expect(screen.getByText('Type a word or phrase to scramble it.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeChecked();
    expect(shown()).toEqual([]);
  });

  it('scrambles each word on its own as you type, moving every letter, in capitals', async () => {
    await start('Open sesame!');
    const found = shown();
    expect(found).toHaveLength(50);
    expect(screen.getByText('50 of 261 arrangements that fit')).toBeInTheDocument();
    for (const arrangement of found) {
      expect(arrangement).toMatch(/^[A-Z]{4} [A-Z]{6}$/);
      const [open, sesame] = arrangement.split(' ');
      expect([sorted(open), sorted(sesame)]).toEqual([sorted('OPEN'), sorted('SESAME')]);
      [...open + sesame].forEach((letter, i) => expect(letter).not.toBe('OPENSESAME'[i]));
    }
  });

  it('lists every arrangement of a short word that fits, and more with fewer rules', async () => {
    const { user } = await start('cat');
    expect([...shown()].sort()).toEqual(['ATC', 'TCA']);
    expect(screen.getByText('All 2 arrangements that fit')).toBeInTheDocument();
    await moreOptions(user);
    await user.click(screen.getByRole('checkbox', { name: 'Move every letter' }));
    expect([...shown()].sort()).toEqual(['ACT', 'ATC', 'CTA', 'TAC', 'TCA']);
    expect(screen.getByText('All 5 other arrangements')).toBeInTheDocument();
    // That's no longer one of the difficulties.
    for (const name of ['Easy', 'Medium', 'Hard']) expect(screen.getByRole('radio', { name })).not.toBeChecked();
    expect(screen.getByText('Your own mix, under More options.')).toBeInTheDocument();
  });

  it('sets the difficulty', async () => {
    const { user } = await start('Open sesame');
    await user.click(screen.getByRole('radio', { name: 'Easy' }));
    for (const arrangement of shown()) expect(arrangement).toMatch(/^O[A-Z]{3} S[A-Z]{5}$/);
    await user.click(screen.getByRole('radio', { name: 'Hard' }));
    expect(screen.getByRole('combobox', { name: 'Words' })).toHaveValue('run');
    expect(shown()).toHaveLength(50);
    for (const arrangement of shown()) expect(arrangement).toMatch(/^[A-Z]{10}$/);
  });

  it('says when not every letter can move, and shows the closest', async () => {
    await start('aab');
    expect(screen.getByRole('note')).toHaveTextContent('Not every letter of AAB can move: more than half of them are A.');
    expect(screen.getByText('The 2 closest arrangements')).toBeInTheDocument();
  });

  it('runs the words together, or splits them anew', async () => {
    const { user } = await start('Open sesame');
    const words = screen.getByRole('combobox', { name: 'Words' });
    await user.selectOptions(words, 'run');
    for (const arrangement of shown()) expect(arrangement).toMatch(/^[A-Z]{10}$/);
    await user.selectOptions(words, 'count');
    await user.selectOptions(screen.getByRole('combobox', { name: 'How many words' }), '4');
    for (const arrangement of shown()) expect(arrangement.split(' ')).toHaveLength(4);
    await user.selectOptions(words, 'pattern');
    expect(screen.getByText('Type the words’ lengths, like 3-4-3.')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Word lengths' }), '3-4');
    expect(screen.getByText('The pattern 3-4 makes 7 letters, but the text has 10.')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Word lengths' }), '-3');
    expect(shown()).toHaveLength(50);
    for (const arrangement of shown()) expect(arrangement).toMatch(/^[A-Z]{3} [A-Z]{4} [A-Z]{3}$/);
  });

  it('writes them in lowercase or title case, spaced out or on tiles', async () => {
    const { user, container } = await start('Open sesame');
    await user.click(screen.getByRole('radio', { name: 'Lowercase' }));
    for (const arrangement of shown()) expect(arrangement).toMatch(/^[a-z]{4} [a-z]{6}$/);
    await user.click(screen.getByRole('radio', { name: 'Title case' }));
    for (const arrangement of shown()) expect(arrangement).toMatch(/^[A-Z][a-z]{3} [A-Z][a-z]{5}$/);
    await user.click(screen.getByRole('radio', { name: 'Letters spaced out' }));
    for (const arrangement of shown()) expect(arrangement).toMatch(/^[A-Z]( [a-z]){3} {3}[A-Z]( [a-z]){5}$/);
    await user.click(screen.getByRole('radio', { name: 'Tiles' }));
    expect(container.querySelectorAll('.tile')).toHaveLength(500);
  });

  it('keeps punctuation in place, and leaves out digits or takes off accents', async () => {
    const { user } = await start("Don't panic! 42 é");
    await moreOptions(user);
    await user.click(screen.getByRole('radio', { name: 'Keep in place' }));
    for (const arrangement of shown()) expect(arrangement).toMatch(/^[A-Z]{3}'[A-Z] [A-Z]{5}! (42|24) É$/);
    // Punctuation, then digits.
    const [punctuation, digits] = screen.getAllByRole('radio', { name: 'Leave out' });
    await user.click(punctuation);
    await user.click(digits);
    await user.click(screen.getByRole('radio', { name: 'Take off' }));
    for (const arrangement of shown()) expect(arrangement).toMatch(/^[A-Z]{4} [A-Z]{5} E$/);
  });

  it('shows as many as asked, in the order asked', async () => {
    const { user } = await start('Open sesame');
    await moreOptions(user);
    await user.selectOptions(screen.getByRole('combobox', { name: 'How many' }), '10');
    expect(shown()).toHaveLength(10);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Order' }), 'az');
    expect(shown()).toEqual([...shown()].sort());
  });

  it('rerolls for new arrangements, and shows the seed', async () => {
    const { user } = await start('password');
    expect(screen.getByText('Seed 1')).toBeInTheDocument();
    const first = shown();
    await user.click(screen.getByRole('button', { name: 'Reroll' }));
    expect(screen.getByText('Seed 2')).toBeInTheDocument();
    expect(shown()).toHaveLength(50);
    expect(shown()).not.toEqual(first);
  });

  it('copies the arrangements, one to a line', async () => {
    const { user } = await start('listen');
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await navigator.clipboard.readText()).toBe(shown().join('\n'));
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
  });

  it('says so when it can’t copy', async () => {
    const { user } = await start('listen');
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'));
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(screen.getByRole('status')).toHaveTextContent(/Couldn’t copy/);
  });
});

describe('Links', () => {
  it('keeps the page in its URL, without spelling out the text', async () => {
    await start('Open sesame');
    await waitFor(() => expect(window.location.hash).toMatch(/^#s=/));
    expect(window.location.hash.toLowerCase()).not.toContain('sesame');
    expect(await decodeState(window.location.hash)).toEqual({ text: 'Open sesame', seed: 1, settings: DEFAULT_SETTINGS });
  });

  it('shares a link that brings back the same list', async () => {
    const { user } = await start('Open sesame');
    await user.click(screen.getByRole('radio', { name: 'Hard' }));
    await user.click(screen.getByRole('radio', { name: 'Tiles' }));
    const list = shown();
    await user.click(screen.getByRole('button', { name: 'Share link' }));
    expect(screen.getByRole('status')).toHaveTextContent('Link copied');
    const link = new URL(await navigator.clipboard.readText());
    cleanup();

    render(<App initial={await decodeState(link.hash)} />);
    expect(textBox()).toHaveValue('Open sesame');
    expect(screen.getByRole('radio', { name: 'Hard' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Tiles' })).toBeChecked();
    expect(screen.getByText('Seed 1')).toBeInTheDocument();
    expect(shown()).toEqual(list);
  });

  it('follows a link pasted into the address bar', async () => {
    render(<App />);
    window.location.hash = await encodeState({ text: 'Mellon', seed: 42, settings: { ...DEFAULT_SETTINGS, letterCase: 'lower' } });
    await waitFor(() => expect(textBox()).toHaveValue('Mellon'));
    expect(screen.getByText('Seed 42')).toBeInTheDocument();
    for (const arrangement of shown()) expect(arrangement).toMatch(/^[a-z]{6}$/);
  });

  it('clears the URL when the page is emptied', async () => {
    const { user } = await start('a');
    await waitFor(() => expect(window.location.hash).toMatch(/^#s=/));
    await user.clear(textBox());
    await waitFor(() => expect(window.location.hash).toBe(''));
  });
});
