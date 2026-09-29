# Sator

Anagrams for tabletop puzzles: scramble a password, a clue or a name, and give the players the
letters to work back. It's growing into a tool for making and running those puzzles at the table;
[docs/PLAN.md](docs/PLAN.md) has the plan. It's named after the Sator square (SATOR AREPO TENET
OPERA ROTAS), the Roman word square whose letters rearrange into PATER NOSTER.

**Live site:** https://sator.invigoro.me/

## Using it

- **Type a word or phrase,** and 50 scrambles of it appear as you type. None is ever the text as
  typed, and none spells a slur or a swear word.
- **Pick a difficulty:**
  - **Easy** keeps the words, and their first letters.
  - **Medium** keeps the words, and moves every letter.
  - **Hard** runs the words together, moves every letter, and parts old neighbours: letters side by
    side in a word never end up side by side again.
- **Shape the words:** keep them, keep their lengths with the letters mixed across them, run them
  together, or split them into a number of new words or a pattern of lengths like 3-4-3.
- **Write them** in capitals, lowercase or title case, with the letters together, spaced out
  (S W O R D) or on tiles.
- **More options** has:
  - each rule on its own: keep each word's first or last letter, move every letter, part old
    neighbours
  - punctuation kept in place (DON'T → TON'D), digits left out, and accents taken off (É becomes E)
  - how many to show, and in what order. Best first puts at the top those that give away least: no
    piece of the text left whole, even backwards, and few old neighbours or letters in place.
- **When the letters can't do what's asked** (AAB can't move every letter), the page says so and
  shows the closest.
- **Short words get every arrangement there is** (CAT has five besides its own), and the count says
  how many there are in all.
- 🎲 **Reroll** for new arrangements. The seed is shown beside it: the same seed, text and settings
  always give the same arrangements.
- **Take it away:**
  - **Copy** copies the list, one arrangement to a line.
  - **Share link** copies a link that brings back the same list. The page's address always holds its
    settings, compressed, so it never spells out a password during a screen share.

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

Every push to `main` runs the tests, builds the site and deploys it to GitHub Pages
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). Pushes to other branches run the
tests and the build without deploying ([`.github/workflows/test.yml`](.github/workflows/test.yml)).

## Plan

[docs/PLAN.md](docs/PLAN.md) covers the approach, the output options and puzzle tools, the word
list, and the roadmap.
