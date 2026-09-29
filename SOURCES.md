# Sources

## Word lists

Real words come from the **English Speller Database** (ESDB, previously known as SCOWLv2) by Kevin
Atkinson, <https://github.com/en-wl/wordlist>. Its words come mostly from Alan Beale's 12dicts and
from ENABLE2K, both in the public domain.

- **Release:** 2026.02.25 (tag `rel-2026.02.25`, commit `7e99eda`)
- **Files:** [`src/data/words/35.txt`](src/data/words/35.txt), [`50.txt`](src/data/words/50.txt),
  [`60.txt`](src/data/words/60.txt) and [`70.txt`](src/data/words/70.txt): the words that first
  appear at each of ESDB's sizes. Smaller sizes are commoner words. Common words are size 35,
  Standard adds size 50, and Large adds sizes 60 and 70. Size 80 and up is left out: it adds the
  unusual words that word games allow, which make poor clues.
- **Made by:** `npm run build-words -- path/to/esdb`, after building ESDB's database with
  `python combine.py create-db scowl.db` (with `PYTHONUTF8=1` on Windows). For each size, the script
  runs

  ```sh
  python scowl word-list <size> A 1 --deaccent --wo-poses abbr --categories= \
      --wo-usage-notes offensive-1,offensive-2,vulgar-1,vulgar-3
  ```

  That gives American spellings with their accents taken off, and leaves out abbreviations, Roman
  numerals, programmers' slang ("grepped"), and the words ESDB marks offensive or vulgar.
- **Filtered:** only words in lowercase letters are kept, which leaves out proper nouns (except I)
  and possessives. Single letters are left out except a and I. Words on the blocklist
  ([`src/engine/blocklist.ts`](src/engine/blocklist.ts)) are left out too, since ESDB marks only the
  worst words.
- **The letter model** for pronounceable scrambles,
  [`src/data/words/letters.ts`](src/data/words/letters.ts), is built by the same script from the
  Standard list (sizes 35 and 50): how surprising each letter is after the two before it. It keeps
  only those odds, no words. `npm run build-words -- --model` rebuilds it from the lists here.
- **License:** ESDB's notice below, which each file repeats at its top. For lists no larger than
  size 80 in American English, no other notice applies.

```
Copyright 2000-2026 by Kevin Atkinson

Permission to use, copy, modify, distribute, and sell any part of the English
Speller Database (ESDB, previously known as SCOWLv2), or word lists
created from it, is hereby granted without fee, provided that the above
copyright notice appears in all copies and that both the above copyright
notice and this notice appear in supporting documentation.  Kevin Atkinson
makes no representations about the suitability of this database for any
purpose.  It is provided "as is" without express or implied warranty.
```
