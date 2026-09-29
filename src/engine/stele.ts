/**
 * The clue on an object in Stele (https://stele.invigoro.me/): the settings an "Open in Stele" link
 * carries, and what Stele's lettering would do to the clue's letters. A clue only works if every
 * letter survives: `{{double braces}}` keep Stele's damage off the writing, fade is kept low since
 * nothing keeps it off, and Roman lettering and runes are checked letter by letter.
 */

export type SteleMedium = 'marble' | 'sandstone' | 'granite' | 'slate' | 'clay' | 'bronze' | 'wood' | 'paper' | 'parchment' | 'papyrus';

/** Stele's media, with its names for them. */
export const STELE_MEDIA: Record<SteleMedium, string> = {
  granite: 'Granite',
  marble: 'Marble',
  sandstone: 'Sandstone',
  slate: 'Slate',
  bronze: 'Bronze plaque',
  wood: 'Wood',
  clay: 'Clay tablet',
  paper: 'Paper',
  parchment: 'Parchment',
  papyrus: 'Papyrus',
};

export type RuneScript = 'elder-futhark' | 'younger-futhark' | 'futhorc';

export const RUNE_SCRIPTS: readonly RuneScript[] = ['elder-futhark', 'younger-futhark', 'futhorc'];

/**
 * How the letters are written. Stele's cuneiform isn't offered: it writes a word's sounds, not its
 * letters, so no anagram can be read back from it.
 */
export type Lettering = 'latin' | 'roman' | RuneScript;

export const LETTERINGS: Record<Lettering, string> = {
  latin: 'Letters as they are',
  roman: 'Roman lettering',
  'elder-futhark': 'Elder Futhark',
  'younger-futhark': 'Younger Futhark',
  futhorc: 'Anglo-Saxon Futhorc',
};

export const isRunes = (lettering: Lettering): lettering is RuneScript => (RUNE_SCRIPTS as readonly string[]).includes(lettering);

export interface SteleOptions {
  medium: SteleMedium;
  lettering: Lettering;
}

export const DEFAULT_STELE: SteleOptions = { medium: 'granite', lettering: 'latin' };

export const isSteleMedium = (value: unknown): value is SteleMedium => typeof value === 'string' && Object.hasOwn(STELE_MEDIA, value);
export const isLettering = (value: unknown): value is Lettering => typeof value === 'string' && Object.hasOwn(LETTERINGS, value);

/** Fade wears writing away, and `{{ }}` doesn't keep it off, so a clue gets only a little. */
const FADE = 0.1;

/** Stele's typeface with the runes in it, which its own page switches to for them. */
const RUNIC_FONT = 'noto-sans-runic';

/** Text that can't start or end damage markup of its own: doubled brackets and braces made single. */
const unmarked = (line: string) => line.replace(/([{}[\]])\1+/g, '$1').trim();

/** The writing: the riddle, if there is one, above the clue, each line kept clear of damage. */
export function steleText(clue: string, riddle = ''): string {
  return [...riddle.split('\n'), clue]
    .map(unmarked)
    .filter((line) => line !== '')
    .map((line) => `{{${line}}}`)
    .join('\n');
}

/**
 * Stele's settings for the clue: one text block on the medium, marked as edited so Stele keeps it.
 * Stele fills in everything left out from the medium's defaults.
 */
export function steleSettings(clue: string, riddle: string, { medium, lettering }: SteleOptions): Record<string, unknown> {
  const block: Record<string, unknown> = { kind: 'text', role: 'main', text: steleText(clue, riddle) };
  if (lettering === 'roman') block.roman = true;
  if (isRunes(lettering)) {
    block.script = lettering;
    block.font = RUNIC_FONT;
  }
  return { v: 1, medium, textEdited: true, fade: FADE, blocks: [block] };
}

// Stele's rune tables (its src/text/scripts.ts), to tell what the runes do to a clue. Each maps
// letters, and a few pairs of letters, to runes; "Y" is y as a consonant, before a vowel.

interface RuneTable {
  letters: Record<string, string>;
  /** A rune twice in a row is carved once, as early carvers did. */
  single: boolean;
}

const RUNES: Record<RuneScript, RuneTable> = {
  'elder-futhark': {
    letters: {
      a: 'ᚨ', b: 'ᛒ', c: 'ᚲ', d: 'ᛞ', e: 'ᛖ', f: 'ᚠ', g: 'ᚷ', h: 'ᚺ', i: 'ᛁ', j: 'ᛃ', k: 'ᚲ', l: 'ᛚ', m: 'ᛗ',
      n: 'ᚾ', o: 'ᛟ', p: 'ᛈ', q: 'ᚲ', r: 'ᚱ', s: 'ᛊ', t: 'ᛏ', u: 'ᚢ', v: 'ᚹ', w: 'ᚹ', x: 'ᚲᛊ', y: 'ᛁ', Y: 'ᛃ', z: 'ᛉ',
      th: 'ᚦ', ng: 'ᛜ', ck: 'ᚲ', ph: 'ᚠ', qu: 'ᚲᚹ',
    },
    single: true,
  },
  'younger-futhark': {
    letters: {
      a: 'ᛅ', b: 'ᛒ', c: 'ᚴ', d: 'ᛏ', e: 'ᛁ', f: 'ᚠ', g: 'ᚴ', h: 'ᚼ', i: 'ᛁ', j: 'ᛁ', k: 'ᚴ', l: 'ᛚ', m: 'ᛘ',
      n: 'ᚾ', o: 'ᚬ', p: 'ᛒ', q: 'ᚴ', r: 'ᚱ', s: 'ᛋ', t: 'ᛏ', u: 'ᚢ', v: 'ᚢ', w: 'ᚢ', x: 'ᚴᛋ', y: 'ᛦ', Y: 'ᛁ', z: 'ᛋ',
      th: 'ᚦ', ng: 'ᚾᚴ', ck: 'ᚴ', ph: 'ᚠ', qu: 'ᚴᚢ',
    },
    single: true,
  },
  futhorc: {
    letters: {
      a: 'ᚪ', b: 'ᛒ', c: 'ᚳ', d: 'ᛞ', e: 'ᛖ', f: 'ᚠ', g: 'ᚷ', h: 'ᚻ', i: 'ᛁ', j: 'ᛄ', k: 'ᛣ', l: 'ᛚ', m: 'ᛗ',
      n: 'ᚾ', o: 'ᚩ', p: 'ᛈ', q: 'ᚳ', r: 'ᚱ', s: 'ᛋ', t: 'ᛏ', u: 'ᚢ', v: 'ᚠ', w: 'ᚹ', x: 'ᛉ', y: 'ᚣ', z: 'ᛋ',
      th: 'ᚦ', ng: 'ᛝ', ea: 'ᛠ', st: 'ᛥ', ae: 'ᚫ', ck: 'ᛣ', ph: 'ᚠ', qu: 'ᚳᚹ',
    },
    single: false,
  },
};

/** A rune, or a few, and the letters they were written for. */
interface Carved {
  runes: string;
  letters: string;
}

/**
 * The clue in runes as Stele writes them, word by word: a pair of letters with a rune of its own
 * first, then y before a vowel as a consonant, then each letter. With `single`, a rune the same as
 * the one before it isn't carved, and is kept in `once` with the letters it would have been for.
 */
function carve(text: string, { letters, single }: RuneTable): { carved: Carved[]; once: string[] } {
  const carved: Carved[] = [];
  const once: string[] = [];
  for (const [word] of text.matchAll(/[A-Za-z]+/g)) {
    const lower = word.toLowerCase();
    let last: Carved | null = null;
    for (let i = 0; i < lower.length; ) {
      const pair = i + 1 < lower.length ? letters[lower.slice(i, i + 2)] : undefined;
      const consonantY = lower[i] === 'y' && /[aeiou]/.test(lower[i + 1] ?? '') ? letters.Y : undefined;
      const size = pair ? 2 : 1;
      const rune = { runes: pair ?? consonantY ?? letters[lower[i]], letters: word.slice(i, i + size).toUpperCase() };
      if (single && last?.runes === rune.runes) once.push(last.letters + rune.letters);
      else carved.push(rune);
      last = rune;
      i += size;
    }
  }
  return { carved, once };
}

/** The letters each rune stands for on its own: in Elder Futhark, ᚲ is C, K or Q. */
function readings({ letters }: RuneTable): Map<string, string[]> {
  const read = new Map<string, string[]>();
  for (const [letter, rune] of Object.entries(letters)) {
    if (letter.length !== 1 || rune.length !== 1) continue;
    const upper = letter.toUpperCase();
    const known = read.get(rune) ?? [];
    if (!known.includes(upper)) read.set(rune, [...known, upper].sort());
  }
  return read;
}

/** "A", "A and B", "A, B and C", or with "or". */
function andList(items: readonly string[], joiner = 'and'): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ${joiner} ${items[items.length - 1]}`;
}

const unique = (items: readonly string[]) => [...new Set(items)];

/** What runes do to a clue's letters. */
function runeChanges(clue: string, table: RuneTable): string[] {
  const changes: string[] = [];
  const bare = clue.normalize('NFD');
  // Stele takes accents, apostrophes and quotation marks off before it writes runes.
  if (/[̀-ͯ]/.test(bare)) changes.push('Accents come off.');
  const { carved, once } = carve(bare.replace(/[̀-ͯ]/g, '').replace(/['’‘"“”]/g, ''), table);
  const read = readings(table);
  const shared = unique(carved.flatMap(({ runes }) => [...runes].map((rune) => read.get(rune) ?? []).filter((group) => group.length > 1).map((group) => andList(group)))).sort();
  if (shared.length > 0) changes.push(`These share a rune, so the players can’t tell them apart: ${shared.join('; ')}.`);
  const pairs = unique(carved.filter(({ runes, letters }) => letters.length === 2 && runes.length === 1).map(({ letters }) => letters));
  if (pairs.length > 0) changes.push(`${andList(pairs)} ${pairs.length === 1 ? 'is' : 'are each'} carved as one rune.`);
  // A pair written as two runes can come out as other letters: QU as KW.
  const swapped = carved.flatMap(({ runes, letters }) =>
    letters.length < 2 || runes.length !== letters.length
      ? []
      : [...letters].flatMap((letter, i) => {
          const reads = read.get(runes[i]) ?? [];
          return reads.includes(letter) ? [] : [`In ${letters}, ${letter} is carved as ${andList(reads, 'or')}.`];
        }),
  );
  changes.push(...unique(swapped));
  const split = unique(carved.filter(({ runes, letters }) => letters.length === 1 && runes.length > 1).map(({ letters }) => letters));
  if (split.length > 0) changes.push(`${andList(split)} ${split.length === 1 ? 'is' : 'are each'} carved as two runes.`);
  const lost = unique(once);
  if (lost.length > 0) changes.push(`A rune twice in a row is carved once, so ${andList(lost)} ${lost.length === 1 ? 'loses' : 'each lose'} a letter.`);
  return changes;
}

/**
 * What the lettering does to the clue's letters, in sentences, or nothing if every one survives.
 * Roman lettering has no U or J; runes can share one rune between letters, give a pair of letters
 * one rune, and carve a rune written twice in a row once.
 */
export function letterChanges(clue: string, lettering: Lettering): string[] {
  if (lettering === 'latin') return [];
  if (lettering === 'roman') {
    const upper = clue.toLocaleUpperCase('en');
    const changed = [upper.includes('U') && 'U as V', upper.includes('J') && 'J as I'].filter((change) => change !== false);
    return changed.length > 0 ? [`Roman lettering carves ${changed.join(', and ')}.`] : [];
  }
  return runeChanges(clue, RUNES[lettering]);
}

/** The runes that keep every letter of the clue, if any do. */
export function runesThatKeep(clue: string): RuneScript[] {
  return RUNE_SCRIPTS.filter((script) => letterChanges(clue, script).length === 0);
}
