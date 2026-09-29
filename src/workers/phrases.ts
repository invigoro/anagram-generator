/**
 * The worker that searches for phrases, off the page's thread, so typing never waits on a search.
 * Searches on different channels run side by side, taking turns at their pauses; a newer search
 * stops the one before it on its own channel.
 */
import { runSearch, type PhraseSearch, type SearchReply } from '../ui/phraseSearch';

/** The little of a worker's global scope this uses. */
const scope = self as unknown as {
  addEventListener(type: 'message', listener: (event: MessageEvent<{ id: number; channel: string; search: PhraseSearch }>) => void): void;
  postMessage(reply: SearchReply): void;
};

const latest = new Map<string, number>();

scope.addEventListener('message', ({ data: { id, channel, search } }) => {
  latest.set(channel, id);
  runSearch(search, () => latest.get(channel) !== id).then(
    (result) => {
      if (result) scope.postMessage({ id, result });
    },
    () => scope.postMessage({ id, failed: true }),
  );
});
