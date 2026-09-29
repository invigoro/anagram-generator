import type { Puzzle } from '../engine/puzzle';
import { DIFFICULTY_RULES, type Settings } from './settings';

/** A common kind of puzzle: the options that make its clue, and what its puzzle starts with. */
export interface Preset {
  name: string;
  hint: string;
  settings: Partial<Settings>;
  /** What a puzzle made with it starts with; an open puzzle takes these on when the preset is chosen. */
  puzzle: Partial<Omit<Puzzle, 'clue'>>;
}

export const PRESETS: readonly Preset[] = [
  {
    name: 'Password door',
    hint: 'A word or phrase to speak at a door: each word scrambled, every letter moved, and carved in granite.',
    settings: { mode: 'scramble', ...DIFFICULTY_RULES.medium, sayable: 'off', letterCase: 'upper', spacing: 'together' },
    puzzle: { success: 'The door grinds open.', split: 1, stele: { medium: 'granite', lettering: 'latin' } },
  },
  {
    name: 'Scattered letters',
    hint: 'Letters to find around the place: run together, with old neighbours parted, and split into three pieces.',
    settings: { mode: 'scramble', ...DIFFICULTY_RULES.hard, sayable: 'off', letterCase: 'upper', spacing: 'tiles' },
    puzzle: { success: 'The last piece falls into place.', split: 3, stele: { medium: 'parchment', lettering: 'latin' } },
  },
];

/** Whether the settings are still the preset's, so a puzzle made now would be one of its kind. */
export const isPreset = (preset: Preset, settings: Settings) =>
  (Object.entries(preset.settings) as [keyof Settings, unknown][]).every(([key, value]) => settings[key] === value);
