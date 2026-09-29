import { beforeAll, describe, expect, it } from 'vitest';
import { loadDictionary } from '../data/words';
import { findPhrases, giveawaysOf, ownWords, wordsIn, type PhraseRequest } from './phrases';
import { solveNow } from './solver';
import type { Dictionary } from './words';

let common: Dictionary;
beforeAll(async () => {
  common = await loadDictionary('common', []);
});

const request = (text: string, changes: Partial<PhraseRequest> = {}): PhraseRequest => ({
  letters: [...text.toUpperCase().replace(/\s/g, '')],
  textWords: text.toUpperCase().split(/\s+/),
  maxWords: 3,
  minLength: 2,
  include: [],
  exclude: [],
  allowOwn: false,
  limit: 2000,
  budget: 1_500_000,
  ...changes,
});
/** Runs the search to the end. */
function run(dict: Dictionary, changes: PhraseRequest) {
  const search = findPhrases(dict, changes);
  for (let step = search.next(); ; step = search.next()) if (step.done) return step.value;
}
const texts = (phrases: { words: string[] }[]) => phrases.map((phrase) => phrase.words.join(' '));

describe('wordsIn', () => {
  it('reads a list of words typed by hand, each once, in capitals, accents off', () => {
    expect(wordsIn('Strahd, Barovia;\nireena  Ravenloft strahd Ez Anzalôr')).toEqual(['STRAHD', 'BAROVIA', 'IREENA', 'RAVENLOFT', 'EZ', 'ANZALOR']);
  });
});

describe('ownWords and giveawaysOf', () => {
  it('find the text’s own words, with plurals and singulars', () => {
    expect([...ownWords(['OPEN', 'DOORS'])].sort()).toEqual(['DOOR', 'DOORS', 'DOORSES', 'DOORSS', 'OPEN', 'OPENES', 'OPENS']);
  });

  it('find the pieces of the text’s words that give it away, either way round', () => {
    const pieces = giveawaysOf(['PASSWORD']);
    for (const piece of ['PASS', 'WORD', 'SWORD', 'DROW']) expect(pieces.has(piece)).toBe(true);
    expect(pieces.has('PA')).toBe(false);
  });
});

describe('findPhrases', () => {
  it('never uses the text’s own words, unless asked to', () => {
    expect(texts(run(common, request('listen')).phrases)).not.toContain('LISTEN');
    expect(texts(run(common, request('listen', { allowOwn: true })).phrases)).toContain('LISTEN');
  });

  it('sinks the phrases that give the answer away', () => {
    const phrases = texts(run(common, request('password')).phrases);
    expect(phrases).toContain('PASS WORD');
    expect(phrases.indexOf('PASS WORD')).toBeGreaterThan(phrases.length / 2);
    expect(texts(run(common, request('password', { allowOwn: true })).phrases).slice(0, 10)).toContain('PASS WORD');
  });

  it('puts in the words it must, and keeps out the ones it mustn’t', () => {
    const phrases = run(common, request('dormitory', { include: ['ROOM'] })).phrases;
    expect(phrases.length).toBeGreaterThan(0);
    for (const phrase of phrases) expect(phrase.words).toContain('ROOM');
    expect(texts(phrases)).toContain('DIRTY ROOM');
    for (const phrase of run(common, request('dormitory', { exclude: ['DIRTY'] })).phrases) expect(phrase.words).not.toContain('DIRTY');
  });

  it('says when a word to put in isn’t in the letters', () => {
    expect(run(common, request('dormitory', { include: ['LORD'] })).missing).toBe('LORD');
  });

  it('gives just the words to put in when they use every letter', () => {
    expect(texts(run(common, request('dormitory', { include: ['DIRTY', 'ROOM'] })).phrases)).toEqual(['DIRTY ROOM']);
  });

  it('lists words that fit in the letters, longest first, when asked', () => {
    const within = run(common, request('dormitory', { within: 20 })).within;
    expect(within.length).toBe(20);
    expect(within).toContain('DIRTY');
    for (let i = 1; i < within.length; i++) expect(within[i].length).toBeLessThanOrEqual(within[i - 1].length);
    expect(within).not.toContain('DORMITORY');
    expect(run(common, request('dormitory')).within).toEqual([]);
  });

  it('matches the search it wraps', () => {
    const wrapped = run(common, request('open sesame')).phrases;
    const bare = solveNow(common, {
      letters: [...'OPENSESAME'],
      maxWords: 3,
      minLength: 2,
      exclude: ownWords(['OPEN', 'SESAME']),
      limit: 2000,
      budget: 1_500_000,
      rankCosts: [0, 0, 1, 2.5, 4],
      giveaways: giveawaysOf(['OPEN', 'SESAME']),
    }).phrases;
    expect(wrapped).toEqual(bare);
  });
});
