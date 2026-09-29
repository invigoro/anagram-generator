/**
 * Builds the word lists under src/data/words/ from the English Speller Database (ESDB,
 * https://github.com/en-wl/wordlist), using its own tools, which need Python 3:
 *
 *   git clone --depth 1 --branch rel-2026.02.25 https://github.com/en-wl/wordlist.git esdb
 *   cd esdb && python combine.py create-db scowl.db    # with PYTHONUTF8=1 on Windows
 *   npm run build-words -- path/to/esdb
 *
 * ESDB ranks words by how common they are, in sizes. Each size gets a file of the words that first
 * appear at that size, so a list is the files up to its size. Set PYTHON if Python isn't `python`.
 * SOURCES.md records the release and the filters.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isBlocked } from '../src/engine/blocklist.ts';

const RELEASE = '2026.02.25';
const SIZES = [35, 50, 60, 70];
const OUTPUT = 'src/data/words';

/** ESDB's notice, which goes with every copy of a list made from it. */
const NOTICE = `Copyright 2000-2026 by Kevin Atkinson

Permission to use, copy, modify, distribute, and sell any part of the English
Speller Database (ESDB, previously known as SCOWLv2), or word lists
created from it, is hereby granted without fee, provided that the above
copyright notice appears in all copies and that both the above copyright
notice and this notice appear in supporting documentation.  Kevin Atkinson
makes no representations about the suitability of this database for any
purpose.  It is provided "as is" without express or implied warranty.`;

/**
 * ESDB's words up to a size: American spellings with their accents taken off, and none of its
 * abbreviations, Roman numerals, programmers' slang, or words it marks offensive or vulgar.
 */
function exportList(esdb: string, size: number): string[] {
  const args = ['scowl', 'word-list', String(size), 'A', '1', '--deaccent', '--wo-poses', 'abbr', '--categories='];
  args.push('--wo-usage-notes', 'offensive-1,offensive-2,vulgar-1,vulgar-3');
  const output = execFileSync(process.env.PYTHON ?? 'python', args, {
    cwd: esdb,
    env: { ...process.env, PYTHONUTF8: '1' },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return output.split(/\r?\n/);
}

/**
 * The words fit for an anagram: lowercase letters only, which leaves out proper nouns and
 * possessives; no single letters but a and I; and nothing on the blocklist, which catches the
 * words ESDB doesn't mark.
 */
function fit(words: readonly string[]): Set<string> {
  const kept = new Set<string>();
  for (const word of words) {
    const plain = word === 'I' ? 'i' : word;
    if (!/^[a-z]+$/.test(plain) || (plain.length === 1 && plain !== 'a' && plain !== 'i') || isBlocked(plain)) continue;
    kept.add(plain);
  }
  return kept;
}

const esdb = process.argv[2];
if (!esdb) {
  console.error('Usage: npm run build-words -- <an ESDB checkout, with scowl.db built>');
  process.exit(1);
}

let before = new Set<string>();
for (const size of SIZES) {
  const words = fit(exportList(esdb, size));
  const added = [...words].filter((word) => !before.has(word)).sort();
  const header = [
    `Words from the English Speller Database (ESDB), release ${RELEASE}: those that first appear at size ${size}.`,
    'SOURCES.md says how this list was made.',
    '',
    ...NOTICE.split('\n'),
  ].map((line) => `# ${line}`.trimEnd());
  writeFileSync(join(OUTPUT, `${size}.txt`), [...header, ...added, ''].join('\n'));
  console.log(`size ${size}: ${added.length.toLocaleString('en')} words`);
  before = words;
}
