/**
 * Runs a search for phrases, in the worker or, where there are no workers (as in tests), on the
 * page. It pauses every few milliseconds, so a newer search can stop it.
 */
import { loadDictionary, type WordList } from '../data/words';
import { findPhrases, type PhraseRequest, type PhraseResult } from '../engine/phrases';

export interface PhraseSearch {
  list: WordList;
  yourWords: readonly string[];
  request: PhraseRequest;
}

/** What the worker sends back for a search. */
export type SearchReply = { id: number; result: PhraseResult } | { id: number; failed: true };

/** How long a search runs between pauses, in milliseconds. */
const SLICE = 12;
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Runs a search to the end, or returns null if `stale` says a newer one has overtaken it. */
export async function runSearch({ list, yourWords, request }: PhraseSearch, stale: () => boolean): Promise<PhraseResult | null> {
  const dictionary = await loadDictionary(list, yourWords);
  if (stale()) return null;
  const search = findPhrases(dictionary, request);
  let started = performance.now();
  for (let step = search.next(); ; step = search.next()) {
    if (step.done) return step.value;
    if (performance.now() - started > SLICE) {
      await pause();
      if (stale()) return null;
      started = performance.now();
    }
  }
}
