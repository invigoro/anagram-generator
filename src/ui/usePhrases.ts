import { useEffect, useState } from 'react';
import { lettersLeft } from '../engine/hand';
import { readText, type Text } from '../engine/letters';
import { wordsIn, type PhraseResult } from '../engine/phrases';
import { runSearch, type PhraseSearch, type SearchReply } from './phraseSearch';
import type { Settings } from './settings';

/** The most phrases a search finds, and how many steps it may take: enough for any use, quick for any text. */
const LIMIT = 2000;
const BUDGET = 1_500_000;

/** A text as the phrase search reads it. Words have no accents, and digits can't be in one, but they're kept to be left over. */
export const readForWords = (typed: string) => readText(typed, { punctuation: 'drop', digits: 'scramble', accents: 'fold' });

const wordsOf = (text: Text) => {
  let start = 0;
  return text.words.map((length) => text.letters.slice(start, (start += length)).join(''));
};

/** The search for phrases a page asks for, or null if the text has no letters to search. */
export function searchFor(typed: string, settings: Settings): PhraseSearch | null {
  const text = readForWords(typed);
  if (text.letters.length === 0) return null;
  const textWords = wordsOf(text);
  return {
    list: settings.wordList,
    yourWords: wordsIn(settings.yourWords),
    request: {
      letters: text.letters,
      textWords,
      maxWords: settings.maxWords,
      minLength: settings.minLength,
      include: wordsIn(settings.include),
      exclude: wordsIn(settings.exclude),
      allowOwn: settings.allowOwn,
      limit: LIMIT,
      budget: BUDGET,
    },
  };
}

/**
 * The search behind an anagram written by hand: words that fit in the letters it hasn't used, and
 * phrases that would use them all. Null when there's nothing left to suggest for.
 */
export function handSearchFor(typed: string, settings: Settings): PhraseSearch | null {
  const text = readForWords(typed);
  const { left, over } = lettersLeft(text.letters, readForWords(settings.hand).letters);
  if (left.length === 0 || over.length > 0) return null;
  return {
    list: settings.wordList,
    yourWords: wordsIn(settings.yourWords),
    request: {
      letters: left,
      textWords: wordsOf(text),
      maxWords: 3,
      minLength: 1,
      include: [],
      exclude: [],
      allowOwn: settings.allowOwn,
      limit: 200,
      budget: BUDGET / 3,
      within: 40,
    },
  };
}

/** The one worker, made when first needed; null where there are no workers. */
let worker: Worker | null | undefined;
const waiting = new Map<number, (reply: SearchReply) => void>();
let nextId = 1;
let latest = 0;

function theWorker(): Worker | null {
  if (worker === undefined) {
    worker = typeof Worker === 'undefined' ? null : new Worker(new URL('../workers/phrases.ts', import.meta.url), { type: 'module' });
    worker?.addEventListener('message', (event: MessageEvent<SearchReply>) => waiting.get(event.data.id)?.(event.data));
  }
  return worker;
}

/** Starts a search, overtaking any before it; `done` hears how it went, unless it's overtaken too. */
function startSearch(search: PhraseSearch, done: (reply: SearchReply) => void): () => void {
  const id = nextId++;
  latest = id;
  // An overtaken search never answers, so only the latest is waited for.
  waiting.clear();
  waiting.set(id, done);
  const running = theWorker();
  if (running) running.postMessage({ id, search });
  else {
    runSearch(search, () => latest !== id).then(
      (result) => result && waiting.get(id)?.({ id, result }),
      () => waiting.get(id)?.({ id, failed: true }),
    );
  }
  return () => waiting.delete(id);
}

export interface Phrases {
  /** Whether there's a search running, it finished, or the word list wouldn't load. */
  status: 'idle' | 'working' | 'done' | 'failed';
  /** The latest result, which may be for an earlier search while a new one runs. */
  result: PhraseResult | null;
  /** Whether `result` is for an earlier search. */
  stale: boolean;
  retry: () => void;
}

/** The phrases for a search, found in the worker: a new search starts whenever it changes. */
export function usePhrases(search: PhraseSearch | null): Phrases {
  const key = search ? JSON.stringify(search) : '';
  const [answer, setAnswer] = useState<{ key: string; result: PhraseResult | null; failed: boolean }>({ key: '', result: null, failed: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key) return;
    return startSearch(JSON.parse(key) as PhraseSearch, (reply) =>
      setAnswer((previous) => ('failed' in reply ? { key, result: previous.result, failed: true } : { key, result: reply.result, failed: false })),
    );
  }, [key, attempt]);

  const current = key !== '' && answer.key === key;
  return {
    status: !key ? 'idle' : !current ? 'working' : answer.failed ? 'failed' : 'done',
    result: key ? answer.result : null,
    stale: !current,
    retry: () => {
      setAnswer((previous) => ({ ...previous, key: '' }));
      setAttempt((count) => count + 1);
    },
  };
}
