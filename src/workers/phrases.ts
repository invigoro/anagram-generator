/**
 * The worker that searches for phrases, off the page's thread, so typing never waits on a search.
 * A newer search stops the one before it at its next pause.
 */
import { runSearch, type PhraseSearch, type SearchReply } from '../ui/phraseSearch';

/** The little of a worker's global scope this uses. */
const scope = self as unknown as {
  addEventListener(type: 'message', listener: (event: MessageEvent<{ id: number; search: PhraseSearch }>) => void): void;
  postMessage(reply: SearchReply): void;
};

let latest = 0;

scope.addEventListener('message', ({ data: { id, search } }) => {
  latest = id;
  runSearch(search, () => latest !== id).then(
    (result) => {
      if (result) scope.postMessage({ id, result });
    },
    () => scope.postMessage({ id, failed: true }),
  );
});
