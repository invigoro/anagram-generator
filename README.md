# Sator

Anagrams for tabletop puzzles: scramble a password, a clue or a name, and give the players the
letters to work back. It's growing into a tool for making and running those puzzles at the table;
[docs/PLAN.md](docs/PLAN.md) has the plan. It's named after the Sator square (SATOR AREPO TENET
OPERA ROTAS), the Roman word square whose letters rearrange into PATER NOSTER.

**Live site:** https://sator.invigoro.me/

## Using it

Type a word or phrase, and pick what to make from it: scrambles, phrases of real words, or an
anagram of your own. The list updates as you type. Nothing is ever the text as typed, and nothing
spells a slur or a swear word.

- **Scrambles:**
  - **Pick a difficulty.** Easy keeps the words and their first letters. Medium keeps the words and
    moves every letter. Hard runs the words together, moves every letter, and parts old neighbours:
    letters side by side in a word never end up side by side again.
  - **Shape the words:** keep them, keep their lengths with the letters mixed across them, run them
    together, or split them into a number of new words or a pattern of lengths like 3-4-3.
  - **Make them pronounceable,** somewhat or very, so they read like words on a handout and can be
    read aloud: SPEAK FRIEND AND ENTER as RATIONSESTARDARDISED… rather than NKLEEOESFIITTSARHOE….
  - **More options** has each rule on its own (keep each word's first or last letter, move every
    letter, part old neighbours), punctuation kept in place (DON'T → TON'D), digits left out, and
    accents taken off (É becomes E).
  - **When the letters can't do what's asked** (AAB can't move every letter), the page says so and
    shows the closest. Short words get every arrangement there is: CAT has five besides its own.
- **Real words:** phrases of real words that use every letter, few and common words first.
  DORMITORY gives DIRTY ROOM.
  - **Pick a word list**, Common, Standard or Large, and the most words a phrase may have.
  - **More options** has the shortest word, words every phrase must have or mustn't, and whether
    the text's own words may be used. They're left out unless you say, and words that are pieces of
    the text (PASS and WORD in PASSWORD) go last.
  - **Your words:** names and places from your game, for phrases to use too. They're kept in your
    browser, and travel in share links.
  - **When no phrase uses every letter,** the closest ones, with the letters they leave over set
    apart: MELLON gives LEMON, with an L over. With no real words in the letters at all, scrambles.
- **By hand:** write an anagram of your own, as the best ones are (I AM LORD VOLDEMORT). The page
  shows the letters you haven't used yet, or any you've used too often, with phrases that would
  finish it and words that fit in what's left: a click adds one.
- **Write them** in capitals, lowercase or title case, with the letters together, spaced out
  (S W O R D) or on tiles. More options also has how many to show, and in what order. For
  scrambles, best first puts at the top those that give away least: no piece of the text left
  whole, even backwards, and few old neighbours or letters in place.
- 🎲 **Reroll** for new scrambles. The seed is shown beside it: the same seed, text and settings
  always give the same list.
- **Take it away:**
  - **Copy** copies the list, one arrangement to a line.
  - **Share link** copies a link that brings back the same list. The page's address always holds its
    settings, compressed, so it never spells out a password during a screen share.

### Puzzles

**Use as clue**, on any line of the list or on an anagram of your own, opens a puzzle card, with
the text as the answer.

- **Check the clue:** how much it gives away (letters in place, old neighbours still side by side,
  and pieces of the answer left whole), and the other answers its letters spell. OPEN SESAME also
  makes ENEMAS POSE, with the same word lengths. Tick the ones you'd accept.
- **Hints:** the word lengths, then the first letters, then a letter more each time. Add a riddle,
  and a line for when they get it.
- **Show players** puts the clue over the page in large tiles, with a hint at a time, a fresh
  shuffle, and the answer only when you ask twice.
- **Player link** copies a link to a page for the players. They drag or swap the tiles, or type a
  guess, and take as many hints as you allow. The page checks answers without holding them.
- **Print** tiles to cut out and hand round the table, or a card with the riddle and the clue.
- **In Stele:** carve it in granite, cast it in bronze or write it on parchment, with Stele's damage
  kept off the writing. Roman lettering and runes can lose letters (Younger Futhark writes D and T
  with one rune), so Sator says which of the clue's would suffer, and which runes keep them all.
- **Pieces:** split the clue to hide around the place, a word to a piece or its letters shared out,
  each piece to copy, print or put in Stele.
- **Kind of puzzle** sets everything for a common one: a **password door**, or **scattered
  letters** in three pieces.
- **Hide it,** beside the text box, masks the answer on screen, for tables where players can see
  your laptop.

The puzzle is kept in the page's address too, so one made before the session comes back with it.

It pairs with [Stele](https://stele.invigoro.me/), which carves or inks text onto a weathered
object, and [Jabberwock](https://jabberwock.invigoro.me/), which writes text in made-up languages.

## Development

Requires Node.js 22.12 or newer. The repo pins 24 in [`.nvmrc`](.nvmrc).

```sh
npm install
npm run dev       # dev server with hot reload
npm test          # unit tests
npm run build     # type-check, then build to dist/
npm run preview   # serve the production build locally
```

The word lists come from the English Speller Database. [SOURCES.md](SOURCES.md) says how they were
made, and how to make them again with `npm run build-words`.

Every push to `main` runs the tests, builds the site and deploys it to GitHub Pages
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). Pushes to other branches run the
tests and the build without deploying ([`.github/workflows/test.yml`](.github/workflows/test.yml)).

## Plan

[docs/PLAN.md](docs/PLAN.md) covers the approach, the output options and puzzle tools, the word
list, and the roadmap.
