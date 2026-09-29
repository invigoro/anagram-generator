# Sator implementation plan

Sator makes anagrams for tabletop puzzles. The game master picks the answer (the password for a
door, a clue, a villain's real name) and the tool scrambles its letters, or rearranges them into
other real words, for the players to work back. It does two jobs:

- **Make the clue:** scrambles and real-word anagrams, with control over how they look and how
  hard they are.
- **Run the puzzle:** check the clue has no answers the game master didn't intend, give hints,
  show it to the players or send them a page to solve it on, and put it on a handout, printed or
  carved in [Stele](https://stele.invigoro.me/).

The site must be static, hosted on GitHub Pages, and everything runs in the browser.

**Current phase:** Phase 2. Phases 0 and 1 are done. See [Milestones](#milestones).

## The approach

The engine (`src/engine/`, plain TypeScript with no React or DOM) works in four steps:

1. **Letters:** the text becomes the letters to use, plus the shape of its words: where the
   breaks are, how long each word is, and where punctuation sat. Case, accents, digits and
   punctuation are settled here.
2. **Generate:**
   - *Scrambles:* a seeded Fisher–Yates shuffle, under the difficulty constraints. When there are
     few enough arrangements (n!/(k₁!·k₂!·…) for n letters with k₁ of one, k₂ of another), it
     lists every one instead.
   - *Real words:* phrases of dictionary words that use every letter, from the
     [solver](#the-solver).
3. **Check and rank:** the constraints, the blocklist and the difficulty measures.
4. **Format:** case, the word pattern, punctuation put back, and letter spacing.

Each result is kept as letters and word breaks and formatted last, so changing the case or the
spacing never changes which anagrams you got. Randomness comes from seeds: the same text, settings
and seed always give the same results, which is what makes tests and share links possible.

### Scrambles that meet the rules

- **Few arrangements** (up to 5,040, every arrangement of seven different letters) are all looked
  at, so the list, and the count of those that fit, are exact.
- **With the words kept,** the rules only look within a word. So each word is solved on its own,
  and the best of each put together: a phrase of short words is exact however many arrangements it
  has.
- **Otherwise** a shuffle is repaired a swap at a time. A letter that breaks a rule trades places
  in the best swap there is, and now and then in a worse one, to get out of a dead end.
- The search has a budget, counted in work rather than time, so a seed always gives the same list
  and a long text under strict rules can't freeze the page.
- When the rules can't be met, the page says which one (AAB can't move every letter, since more
  than half of it is A) and shows the closest.
- **Best first** ranks by how much each arrangement gives away: the longest piece of the text left
  whole, read either way (NEPO is plainly OPEN), then old neighbours side by side, then letters in
  place.

### The solver

Finding every phrase of real words that uses a set of letters exactly is the hard part, and the
work grows fast with the length of the text.

- Each word in the list is stored as its letter counts. A map from sorted letters to words
  (`eilnst` → enlist, inlets, listen, silent, tinsel) finds one-word anagrams at once.
- The search always branches on the **rarest letter left**. Every solution must include a word
  containing it, so trying only those words prunes hard without missing anything. The last word
  comes from the map rather than a search.
- It finds one-word results first, then two words, and so on, and tries common words before rare
  ones, so the best results turn up early.
- Limits on the number of words, the shortest word, the number of results and the time taken keep
  long phrases in check, and the results say when the search stopped early.
- It runs in a **Web Worker**, sends results as it finds them, and starts again on each
  keystroke, so typing never freezes the page.

### Pronounceable scrambles

A scramble that reads like a word (PENOSE MASE rather than EEAEOSMNPS for OPEN SESAME) looks
better on a handout and can be read aloud. A letter-trigram model built from the word list scores
how English a string looks. A pronounceable scramble is built letter by letter, each next letter
chosen by the model from those left, and the best of several tries is kept.

## Output options

| Option | Choices (examples from OPEN SESAME) |
|---|---|
| Case | CAPITALS · lowercase · Title Case |
| Punctuation | drop · keep in place (DON'T → TON'D) |
| Digits, accents | scramble digits or drop them · fold é to E, or keep it |
| Word shape | one run (EMASNEPOSE) · keep the words (NEPO EMASES) · keep the word lengths, mixing letters across words (SMEE PANOSE) · a number of words, or a pattern like 3-4-3 (ESA PEMS NOE) |
| Real words | off · on. When no phrase uses every letter, near misses (real words and the letters left over) come next, then scrambles, with a note saying so |
| Word list | Common · Standard · Large, plus your own words (the campaign's names); the most words; the shortest word; words to include or leave out; never the answer's own words |
| Difficulty | presets over the constraints: **Easy** keeps the words and their first letters, **Medium** keeps the words but moves every letter, **Hard** runs them together, moves every letter and parts every pair of old neighbours |
| Pronounceable | off · somewhat · reads like a word |
| Display | SWORD · S W O R D · tiles; how many; best first · A–Z · shuffled |

A constraint that can't be met says so rather than searching forever. "Every letter moved" is
impossible when one letter makes up more than half the text (AAB), and short texts can't always
part their old neighbours.

## Puzzle tools

Any result can be chosen as the **clue** for a puzzle, which opens a puzzle card:

- **Other answers:** the solver runs on the answer's letters and lists the other phrases players
  might find. OPEN SESAME also makes PEON SESAME, with the same word lengths, and ONE MAPS SEE.
  Each has "accept this too", for the player page's check.
- **How much it gives away:** letters left in their places, old neighbours still together, and the
  longest piece of the answer left whole (a clue containing SAME gives away most of SESAME).
- **A hint ladder:** the word lengths (`_ _ _ _  _ _ _ _ _ _`), then the first letters, then one
  more letter at a time, and a riddle line of the game master's own.
- **Show players:** the clue in large tiles over the page, like Jabberwock's Read aloud, with
  larger and smaller type, "Reveal next hint" and "Shuffle again".
- **Player link:** a page with only the clue on it.
  - Players drag the tiles (or swap them from the keyboard), or type a guess.
  - Guesses are checked against salted hashes of the answer and any accepted alternatives.
  - A right answer shows the game master's line ("The door grinds open").
  - The page never loads the word list or the solver.
- **Print:** letter tiles to cut out, or a card with the clue.
- **Open in Stele:** see [Working with Stele](#working-with-stele).
- **Fragments:** the clue's letters split across rooms, statues or handouts, each with its own
  copy, print and Stele buttons.
- **Presets** such as "Password door" and "Scattered letters" set the options for common puzzles.

### Keeping the answer secret

- The game master's page keeps its settings in its URL compressed (Stele's `#s=` format, rather
  than Jabberwock's readable parameters), so the address bar never spells out the password during
  a screen share. A player link holds only what players should see, and a test checks that it
  never contains the answer.
- A "Hide answer" switch masks the answer on screen, for tables where players can see the game
  master's laptop.
- A determined player could still work the answer out from a player page's hashes, or paste the
  clue into a solver. That's for the table to settle, not the tool.

## Working with Stele

This tool makes the clue, and [Stele](https://github.com/invigoro/Stele) puts it on an object.
**Open in Stele** builds a link in Stele's share-link format, as Jabberwock does: `#s=`, then JSON
that has been deflate-raw compressed and base64url encoded, holding one text block on a medium.
The encoder lives in one module, with a test that decodes a link the way Stele does.

A clue only works if every letter survives, and three things in Stele can break one:

- **Damage** can take letters away. The clue goes in `{{double braces}}`, which keeps damage off
  it.
- **Fade** wears the writing away, and `{{ }}` doesn't stop it, so the link sets fade low.
- **Roman lettering** turns U into V and J into I, and **runes** can merge letters: Younger
  Futhark writes B and P, D and T, and G and K with the same rune. The tool warns before either;
  Elder Futhark merges the fewest.

## The word list

Real words come from the [English Speller Database](https://github.com/en-wl/wordlist) (ESDB,
formerly SCOWL) by Kevin Atkinson.

- Its **sizes** rank words by how common they are: 35 is small, 50 medium, 60 medium-large and 70
  large. Size 80 adds the unusual words that word games allow, which make poor clues. Common,
  Standard and Large are sizes 35, 50 and 70.
- It marks **offensive and vulgar words**, which are left out, along with Jabberwock's blocklist.
  The blocklist checks scrambles too, since a random shuffle can spell a slur.
- Proper nouns and abbreviations are left out. The campaign's own names come from the game
  master's list.
- Its words come mostly from 12dicts and ENABLE2K, both in the public domain, and the whole is
  under an MIT-style license whose notice goes with the lists. Lists up to size 80 need nothing
  more. SOURCES.md records the release, the export commands and the filters.
- `scripts/build-words.ts` exports the lists and builds the letter model. ESDB's own tools need
  Python and SQLite, so the script is run by hand and its output committed, as Jabberwock's source
  texts are.
- Each size is its own file, fetched only when real words are switched on.

## Stack and hosting

- **Vite + React + TypeScript**, set up as Jabberwock is, deployed to GitHub Pages by
  [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) on every push to `main`. The
  workflow runs the tests and the type check before deploying. Pushes to other branches run the
  same checks without deploying ([`.github/workflows/test.yml`](../.github/workflows/test.yml)).
  The site is served at `sator.invigoro.me`, set as the custom domain in the repository's Pages
  settings. Vite uses a relative `base`, so the same build works there, at
  `invigoro.github.io/anagram-generator/`, or locally.
- **Node 24**, pinned in `.nvmrc` and used by CI. Anything from 22.12 up works locally.
- **The engine is plain TypeScript** (`src/engine/`) with no React in it.
- **Vitest** for the engine, and **Testing Library** for the UI. The solver runs inline where
  there's no Worker, as in jsdom.
- **Fully static.** Word lists are static files, the solver runs in the browser, and links carry
  their state in the URL's fragment, which never reaches a server. Nothing is sent anywhere.

## Project layout

Items marked *(planned)* don't exist yet.

```
.github/workflows/               # deploy.yml (main → Pages), test.yml (other branches)
index.html · vite.config.ts · package.json · .nvmrc · tsconfig.json
docs/PLAN.md                     # this file
SOURCES.md                       # the word list's release, filters and copyright notice (planned)
scripts/build-words.ts           # ESDB → word lists and the letter model (planned)
public/                          # copied as-is (favicon)
src/
  main.tsx · style.css           # app entry and styles
  engine/                        # the generator: no React, no DOM
    rng.ts                       # seeded PRNG, shuffling, string hashing
    letters.ts                   # text → its letters, its words' lengths, and punctuation kept in place
    scramble.ts                  # arrangements: counted, listed or shuffled for, in a shape, under the rules
    difficulty.ts                # letters in place, old neighbours, pieces of the text left whole
    format.ts                    # case, punctuation put back, spacing
    blocklist.ts                 # words a scramble never spells (Jabberwock's lists)
    pronounce.ts                 # the letter-trigram model (planned)
    words.ts · solver.ts · rank.ts  # word lists and your words; the search; scoring phrases (planned)
    hints.ts · puzzle.ts         # the hint ladder; puzzles and player links (planned)
    stele.ts                     # Open in Stele links (planned, from Jabberwock)
  workers/solver.ts              # the solver, off the main thread (planned)
  data/words/                    # word lists and the letter model (planned)
  ui/                            # React components, settings and difficulties, and the page's state in its URL
```

## Milestones

**Phase 0: Setup and deploy.** *(done)*
- Replace the jQuery page with Vite + React + TypeScript, set up as Jabberwock is.
- The original idea, done properly:
  - fair, seeded shuffles, with a 🎲 Reroll
  - every arrangement when there are only a few
  - never the text as typed
  - letters and digits only, in capitals
  - results that update as you type
  - a Copy button
- Tests for all of it, and the deploy and test workflows.
- *Done when* a push to `main` updates the site. Pages deploys from GitHub Actions (Settings →
  Pages → Source).

**Phase 1: Output options.** *(done. The blocklist came forward from Phase 2, since GINGER has a
slur among its arrangements. Best first counts a piece of the text read backwards as given away too.
With the words kept, each word is solved on its own; see
[Scrambles that meet the rules](#scrambles-that-meet-the-rules).)*
- Everything in [Output options](#output-options) but real words and pronounceable scrambles,
  with the difficulty presets.
- The page's settings in its URL, compressed (see
  [Keeping the answer secret](#keeping-the-answer-secret)), and a Share link.
- *Done when* OPEN SESAME comes out as a Medium scramble that keeps its words, in capitals, and a
  link brings back the same list.

**Phase 2: Real words.**
- The ESDB import (sizes, filters, the letter model) and SOURCES.md.
- The solver in its worker, its options, and the fallback to near misses.
- Pronounceable scrambles, and your own words.
- **By hand:** type a phrase, see the letters left over, and get suggestions to finish it. The
  memorable clues (I AM LORD VOLDEMORT) are written by people, with a solver's help.
- *Done when* DORMITORY gives DIRTY ROOM near the top with Common words, and a 20-letter phrase
  gives results within a second without freezing the page.

**Phase 3: Puzzles at the table.**
- Everything in [Puzzle tools](#puzzle-tools) and [Working with Stele](#working-with-stele).
- *Done when* a game master can run a password door from start to finish: pick a clue with no
  unwanted other answers, reveal hints on screen, send a player link where the right arrangement
  opens the door, and carve the clue in Stele with every letter whole.

**Backlog:**
- aliases: a name rearranged into another name, with titles (Lord, Sister, Baron) and name-like
  words
- circled-letter puzzles: several scrambled words whose circled letters spell the final answer, as
  in the newspaper puzzle
- a notebook of a session's puzzles, kept in the browser and exported as a file
- word lists in other languages, such as Latin for Roman ruins
- offline use

## Risks

- **The search blowing up on long phrases:** the pruning, the limits, the time budget and the
  worker are there for this.
- **Ugly or offensive words:** Common words by default, ESDB's marks, and the blocklist.
- **The answer leaking:** see [Keeping the answer secret](#keeping-the-answer-secret).
- **Stele's link format changing:** the encoder lives in one tested module. It now lives in two
  projects, and a plain `#text=` parameter in Stele would remove the coupling for both.
- **Download size:** each word list is its own file, loaded only when needed. The import script
  reports their sizes, and Large can be dropped if it's too heavy.

## Decisions

- **React for the UI,** as in Jabberwock: this tool is forms and text that updates as you type.
  Stele uses plain TypeScript because its hard part is the renderer.
- **Real words before the table tools** (Phase 2 before 3): the solver is the riskiest part, and
  the other-answers check needs it.
- **Never the text as typed:** a scramble that leaves every letter in place isn't one.
- **Letters and digits only, until Phase 1's options:** the original page shuffled spaces and
  punctuation in with the letters.
- **English first.**
- **The name:** Sator, after the Sator square (SATOR AREPO TENET OPERA ROTAS), the Roman word
  square found at Pompeii, whose letters rearrange into PATER NOSTER twice with A and O left over.
- Everything runs in the browser; nothing is sent anywhere.
- The deploy workflow doesn't cache dependencies, following setup-node's guidance for workflows
  that publish.
