// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { isRight, readPlayerLink } from './playerLink';
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
  localStorage.clear();
});
afterEach(cleanup);

const textBox = () => screen.getByRole('textbox', { name: 'Word or phrase' });

/** The arrangements on the page, in order, without the button beside each. */
function shown(): string[] {
  const list = screen.queryByRole('list', { name: 'Arrangements' });
  return list ? within(list).getAllByRole('listitem').map((item) => item.firstElementChild?.textContent ?? '') : [];
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

  it('makes scrambles pronounceable', async () => {
    const { user } = await start('Speak friend and enter');
    const any = shown();
    await user.click(screen.getByRole('radio', { name: 'Very' }));
    expect(screen.getByText('Reading as much like words as the letters allow.')).toBeInTheDocument();
    const sayable = shown();
    expect(sayable).toHaveLength(50);
    expect(sayable).not.toEqual(any);
    for (const arrangement of sayable) expect(sorted(arrangement.replace(/ /g, ''))).toBe(sorted('SPEAKFRIENDANDENTER'));
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

describe('Real words', () => {
  /** Types the text and asks for real words. Each test waits for what it expects to see. */
  async function words(text: string) {
    const started = await start(text);
    await started.user.click(screen.getByRole('radio', { name: 'Real words' }));
    return started;
  }

  it('finds phrases of real words, best first, and says where the words are from', async () => {
    await words('dormitory');
    await waitFor(() => expect(shown().slice(0, 5)).toContain('DIRTY ROOM'));
    expect(screen.getByText(/^All \d+ phrases$/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'English Speller Database' })).toBeInTheDocument();
  });

  it('comes as close as it can when no phrase uses every letter', async () => {
    await words('mellon');
    await waitFor(() => expect(shown()).toContain('LEMON + L'));
    expect(screen.getByRole('note')).toHaveTextContent('No phrase of real words uses every letter');
  });

  it('gives scrambles when there are no real words in the letters', async () => {
    await words('xyzzy');
    await waitFor(() => expect(screen.getByRole('note')).toHaveTextContent('No real words are in these letters, so here are scrambles.'));
    for (const arrangement of shown()) expect(sorted(arrangement)).toBe(sorted('XYZZY'));
  });

  it('puts words in, and keeps them out', async () => {
    const { user } = await words('dormitory');
    await moreOptions(user);
    await user.type(screen.getByRole('textbox', { name: 'Put in' }), 'room');
    await waitFor(() => expect(shown()).toContain('DIRTY ROOM'));
    for (const phrase of shown()) expect(phrase.split(' ')).toContain('ROOM');
    await user.clear(screen.getByRole('textbox', { name: 'Put in' }));
    await user.type(screen.getByRole('textbox', { name: 'Leave out' }), 'dirty');
    await waitFor(() => expect(shown()).not.toContain('DIRTY ROOM'));
    for (const phrase of shown()) expect(phrase.split(' ')).not.toContain('DIRTY');
  });

  it('says when a word to put in isn’t in the letters', async () => {
    const { user } = await words('dormitory');
    await moreOptions(user);
    await user.type(screen.getByRole('textbox', { name: 'Put in' }), 'lord');
    expect(await screen.findByText('LORD isn’t in the letters, so it can’t be put in.')).toBeInTheDocument();
  });

  it('uses your own words, and keeps them in the browser', async () => {
    const { user } = await words('hard st');
    await moreOptions(user);
    await user.type(screen.getByRole('textbox', { name: 'Your words' }), 'Strahd');
    await waitFor(() => expect(shown()[0]).toBe('STRAHD'));
    expect(localStorage.getItem('sator:your-words')).toBe('Strahd');
    cleanup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Real words' }));
    await moreOptions(user);
    expect(screen.getByRole('textbox', { name: 'Your words' })).toHaveValue('Strahd');
  });

  it('keeps the choice of real words in the link', async () => {
    await words('dormitory');
    await waitFor(async () => expect((await decodeState(window.location.hash))?.settings?.mode).toBe('words'));
  });
});

describe('By hand', () => {
  async function byHand(text: string) {
    const started = await start(text);
    await started.user.click(screen.getByRole('radio', { name: 'By hand' }));
    return { ...started, anagram: screen.getByRole('textbox', { name: 'Your anagram' }) };
  }
  const letters = (container: HTMLElement) => [...container.querySelectorAll('.bank .tile')].map((tile) => tile.textContent).join('');

  it('shows the letters left to use, and words to finish with', async () => {
    const { user, anagram, container } = await byHand('dormitory');
    expect(letters(container)).toBe('DORMITORY');
    await user.type(anagram, 'dirty');
    expect(screen.getByText('4 letters left:')).toBeInTheDocument();
    expect(letters(container)).toBe('OMOR');
    const finish = await screen.findByRole('group', { name: 'To finish it' }, { timeout: 10_000 });
    await user.click(within(finish).getByRole('button', { name: 'ROOM' }));
    expect(anagram).toHaveValue('dirty room');
    expect(screen.getByText('Uses every letter.')).toBeInTheDocument();
    expect(screen.getByRole('article')).toHaveTextContent('DIRTY ROOM');
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await navigator.clipboard.readText()).toBe('DIRTY ROOM');
  });

  it('offers words that fit in what’s left', async () => {
    const { user, anagram } = await byHand('dormitory');
    await user.type(anagram, 'room');
    const words = await screen.findByRole('group', { name: 'Words in what’s left' }, { timeout: 10_000 });
    await user.click(within(words).getByRole('button', { name: 'DIRTY' }));
    expect(anagram).toHaveValue('room dirty');
    expect(screen.getByText('Uses every letter.')).toBeInTheDocument();
  });

  it('says when a letter is used more often than the text has it', async () => {
    const { user, anagram } = await byHand('dormitory');
    await user.type(anagram, 'dirtyy');
    expect(screen.getByText('Too many: Y. The text doesn’t have that letter to spare.')).toBeInTheDocument();
  });
});

describe('Puzzles', () => {
  const card = () => screen.getByRole('region', { name: 'Puzzle' });

  it('makes a line of the list the clue, and says how much it gives away', async () => {
    const { user } = await start('Open sesame');
    const [first] = shown();
    await user.click(screen.getByRole('button', { name: `Use ${first} as the clue` }));
    expect(within(card()).getByText('Open sesame')).toBeInTheDocument();
    expect(within(card()).getByText(/letters? (is|are) where|No letter is where it was/)).toBeInTheDocument();
    expect([...card().querySelectorAll('.clue .tile')].map((tile) => tile.textContent).join('')).toBe(first.replace(' ', ''));
    await user.click(within(card()).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', { name: 'Puzzle' })).not.toBeInTheDocument();
  });

  it('lists the other answers players might find, to accept or not, and keeps them in the link', async () => {
    const { user } = await start('Open sesame');
    await user.click(screen.getAllByRole('button', { name: /^Use .* as the clue$/ })[0]);
    const other = await within(card()).findByRole('checkbox', { name: 'ENEMA POSES' });
    await user.click(other);
    expect(other).toBeChecked();
    await waitFor(async () => expect((await decodeState(window.location.hash))?.puzzle?.accepted).toEqual(['ENEMA POSES']));
  });

  it('hides the answer from anyone looking at the screen', async () => {
    const { user } = await start('Open sesame');
    await user.click(screen.getAllByRole('button', { name: /^Use .* as the clue$/ })[0]);
    await user.click(screen.getByRole('button', { name: 'Hide it' }));
    expect(textBox()).toHaveClass('masked');
    expect(within(card()).queryByText('Open sesame')).not.toBeInTheDocument();
    expect(within(card()).getByText('Hidden')).toBeInTheDocument();
    expect(localStorage.getItem('sator:hide-answer')).toBe('yes');
  });

  it('says when the clue no longer fits the answer', async () => {
    const { user } = await start('Open sesame');
    await user.click(screen.getAllByRole('button', { name: /^Use .* as the clue$/ })[0]);
    await user.type(textBox(), 's');
    expect(within(card()).getByText('The clue doesn’t use the answer’s letters any more. Choose another from the list.')).toBeInTheDocument();
  });

  it('shows the clue to the players, a hint at a time, and the answer only when asked twice', async () => {
    const { user } = await start('Open sesame');
    await user.click(screen.getAllByRole('button', { name: /^Use .* as the clue$/ })[0]);
    await user.type(within(card()).getByRole('textbox', { name: 'Riddle' }), 'What opens the cave?');
    await user.click(within(card()).getByRole('button', { name: 'Show players' }));
    const showing = screen.getByRole('dialog', { name: 'The clue' });
    expect(within(showing).getByText('What opens the cave?')).toBeInTheDocument();
    expect(showing).not.toHaveTextContent(/open sesame/i);
    await user.click(within(showing).getByRole('button', { name: 'Give a hint' }));
    expect(within(showing).getAllByLabelText('a letter to find')).toHaveLength(10);
    await user.click(within(showing).getByRole('button', { name: 'Another hint' }));
    expect(within(showing).getByLabelText('Hint 2 of 9')).toHaveTextContent('OS');
    await user.click(within(showing).getByRole('button', { name: 'Reveal the answer' }));
    expect(showing).not.toHaveTextContent(/open sesame/i);
    await user.click(within(showing).getByRole('button', { name: 'Sure? Reveal it' }));
    expect(within(showing).getByRole('status')).toHaveTextContent('Open sesame');
    expect(within(showing).getByRole('status')).toHaveTextContent('The way opens.');
    await user.click(within(showing).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shuffles the clue afresh for the players, and puts it back', async () => {
    const { user } = await start('Open sesame');
    await user.click(screen.getAllByRole('button', { name: /^Use .* as the clue$/ })[0]);
    await user.click(within(card()).getByRole('button', { name: 'Show players' }));
    const showing = screen.getByRole('dialog', { name: 'The clue' });
    const clue = () => within(showing).getByLabelText('Clue').textContent ?? '';
    const before = clue();
    await user.click(within(showing).getByRole('button', { name: 'Shuffle again' }));
    expect(sorted(clue())).toBe(sorted(before));
    await user.click(within(showing).getByRole('button', { name: 'Put back' }));
    expect(clue()).toBe(before);
  });

  it('lists the hints for the game master, and hides them with the answer', async () => {
    const { user } = await start('Open sesame');
    await user.click(screen.getAllByRole('button', { name: /^Use .* as the clue$/ })[0]);
    expect(within(card()).getByText('9 hints, a letter more each time')).toBeInTheDocument();
    // Queries collapse the page's spaces, so the gap between words is one here.
    expect(within(card()).getByText('O P E N S E S A M _')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hide it' }));
    expect(within(card()).queryByText('9 hints, a letter more each time')).not.toBeInTheDocument();
  });

  it('copies a link for the players that checks answers without holding them', async () => {
    const { user } = await start('Open sesame');
    await user.click(screen.getAllByRole('button', { name: /^Use .* as the clue$/ })[0]);
    await user.selectOptions(within(card()).getByRole('combobox', { name: 'Hints on the players’ page' }), '1');
    await user.click(within(card()).getByRole('button', { name: 'Player link' }));
    expect(await within(card()).findByRole('link', { name: 'Try it' })).toBeInTheDocument();
    expect(within(card()).getByRole('status')).toHaveTextContent('Player link copied');
    const link = new URL(await navigator.clipboard.readText());
    expect(link.hash.startsWith('#p=')).toBe(true);
    const player = await readPlayerLink(link.hash);
    expect(player?.hints).toHaveLength(1);
    expect(await isRight(player!, 'open sesame')).toBe(true);
  });

  it('makes an anagram written by hand the clue', async () => {
    const { user } = await start('dormitory');
    await user.click(screen.getByRole('radio', { name: 'By hand' }));
    await user.type(screen.getByRole('textbox', { name: 'Your anagram' }), 'dirty room');
    await user.click(screen.getByRole('button', { name: 'Use as clue' }));
    expect([...card().querySelectorAll('.clue .tile')].map((tile) => tile.textContent).join('')).toBe('DIRTYROOM');
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
