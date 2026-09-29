# Sator

Anagrams for tabletop puzzles: scramble a password, a clue or a name, and give the players the
letters to work back. It's growing into a tool for making and running those puzzles at the table;
[docs/PLAN.md](docs/PLAN.md) has the plan. It's named after the Sator square (SATOR AREPO TENET
OPERA ROTAS), the Roman word square whose letters rearrange into PATER NOSTER.

**Live site:** https://sator.invigoro.me/

## Using it

- **Type a word or phrase.** Its letters and digits are scrambled into 50 different arrangements,
  in capitals, as you type. Spaces and punctuation are left out.
- **Short words get every arrangement there is:** CAT has five besides its own. No arrangement is
  ever the text as typed.
- 🎲 **Reroll** for new arrangements. The seed is shown beside it: the same seed and text always
  give the same arrangements.
- **Copy** copies the list, one arrangement to a line.

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
