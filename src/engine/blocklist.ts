/**
 * Words a scramble must never spell. Innocent letters can make a slur or a swear word (GINGER
 * has one among its arrangements), so every arrangement is checked, a word at a time. The lists
 * are Jabberwock's English ones: its slurs from old fiction, and the words an invented word
 * mustn't turn out to be, including spellings that read the same ("kunt").
 */

const SLURS = [
  // Racial and ethnic terms common in 19th- and early 20th-century fiction.
  'negro', 'negroes', 'negress', 'negresses', 'nigger', 'niggers',
  'darkey', 'darkeys', 'darkie', 'darkies', 'darky',
  'half-blood', 'half-bloods', 'half-breed', 'half-breeds', 'mulatto', 'mulattoes', 'mulattos', 'quadroon', 'quadroons',
  'coolie', 'coolies', 'chinaman', 'chinamen', 'jap', 'japs',
  'squaw', 'squaws', 'redskin', 'redskins', 'kaffir', 'kaffirs',
  'gypsy', 'gypsies', 'gipsy', 'gipsies',
];

const OFFENSIVE = [
  'fuck', 'fuk', 'fucker', 'shit', 'shite', 'shyt', 'cunt', 'kunt', 'cock', 'kok', 'dick', 'dik', 'piss',
  'bitch', 'bich', 'twat', 'wank', 'wanker', 'slut', 'whore', 'hore', 'fag', 'fagot', 'faggot', 'nigger', 'nigga',
  'niga', 'niger', 'negro', 'spic', 'spik', 'kike', 'kyke', 'chink', 'gook', 'coon', 'kaffir', 'retard', 'rape',
  'rapist', 'porn', 'dildo', 'penis', 'vagina', 'tits', 'arse', 'ass', 'arsehole', 'asshole', 'bastard',
  'bollocks', 'bugger', 'crap', 'turd', 'jizz', 'cum', 'kum', 'anal', 'anus', 'nazi', 'hitler',
];

/**
 * Roots too offensive to allow even inside a longer run of letters. Scrambles run words together,
 * so these are looked for anywhere in a word.
 */
const ROOTS = ['fuck', 'fuk', 'cunt', 'kunt', 'nigg', 'nigr', 'niga', 'fagot', 'faggot', 'shit'];

/** In capitals, without accents, and only letters: "Half-blood" and "HALFBLOOD" are the same. */
const plain = (word: string) =>
  word
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');

const BLOCKED: ReadonlySet<string> = new Set([...SLURS, ...OFFENSIVE].map(plain));
const BLOCKED_ROOTS = ROOTS.map(plain);

/** Whether a word spells a slur or a swear word, or its plural, or has one of the worst anywhere in it. */
export function isBlocked(word: string): boolean {
  const form = plain(word);
  if (BLOCKED.has(form) || (form.endsWith('S') && BLOCKED.has(form.slice(0, -1)))) return true;
  return BLOCKED_ROOTS.some((root) => form.includes(root));
}
