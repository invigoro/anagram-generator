import { asText } from '../engine/format';
import type { Spacing } from './settings';

/** One line of a list: its words, as characters, and any letters left over. */
export interface Item {
  words: string[][];
  spare: string[];
}

/** An item as plain text: "LEMON + L" for one with a letter left over. */
export function itemText(item: Item, spaced: boolean): string {
  const words = asText(item.words, spaced);
  return item.spare.length > 0 ? `${words} + ${item.spare.join(spaced ? ' ' : '')}` : words;
}

/** An item as a clue: its words and any letters left over, every letter in it. */
export const clueText = (item: Item) => [...item.words.map((word) => word.join('')), ...(item.spare.length > 0 ? [item.spare.join('')] : [])].join(' ');

const characters = new Intl.Segmenter('en', { granularity: 'grapheme' });

/** A clue as an item, to show it: "NEPO EMASES" as two words of characters. */
export function clueItem(clue: string): Item {
  const words = clue
    .trim()
    .split(/\s+/)
    .filter((word) => word !== '')
    .map((word) => Array.from(characters.segment(word), ({ segment }) => segment));
  return { words, spare: [] };
}

/** An item in the spacing asked for: letters together, spaced out, or on tiles. */
export function Shown({ item, spacing }: { item: Item; spacing: Spacing }) {
  if (spacing !== 'tiles') {
    const words = asText(item.words, spacing === 'spaced');
    return (
      <span className={spacing === 'spaced' ? 'spaced' : undefined}>
        {words}
        {item.spare.length > 0 && <span className="spare">{` + ${item.spare.join(spacing === 'spaced' ? ' ' : '')}`}</span>}
      </span>
    );
  }
  return (
    <span className="tiles">
      {item.words.map((word, w) => (
        <span className="tile-word" key={w}>
          {word.map((character, c) => (
            <span className="tile" key={c}>
              {character}
            </span>
          ))}
        </span>
      ))}
      {item.spare.length > 0 && (
        <span className="tile-word spare" aria-label={`and ${item.spare.join(' ')} left over`}>
          {item.spare.map((character, c) => (
            <span className="tile" key={c}>
              {character}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
