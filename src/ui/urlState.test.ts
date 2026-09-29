import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import { decodeState, encodeState, MAX_TEXT } from './urlState';

/** Anything at all, packed the way the page packs its state, to see what a doctored link does. */
async function pack(data: unknown): Promise<string> {
  const stream = new Blob([JSON.stringify(data)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return '#s=' + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** What a link holds, unchecked. */
async function unpack(hash: string): Promise<Record<string, unknown>> {
  const bytes = Uint8Array.from(atob(hash.slice(3).replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return JSON.parse(await new Response(stream).text());
}

const settings = (changes: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...changes });

describe('encodeState and decodeState', () => {
  it('bring back the text, the seed and the settings', async () => {
    const state = { text: 'Open sesame', seed: 3_000_000_000, settings: settings({ shape: 'pattern', pattern: '3-4-3', letterCase: 'title', count: 25 }) };
    const hash = await encodeState(state);
    expect(hash).toMatch(/^#s=[\w-]+$/);
    expect(await decodeState(hash)).toEqual(state);
  });

  it('never spell out the text', async () => {
    for (const text of ['swordfish', 'Open sesame', 'xyzzy', 'mellon']) {
      const hash = (await encodeState({ text, seed: 1, settings: DEFAULT_SETTINGS })).toLowerCase();
      for (const word of text.toLowerCase().split(' ')) expect(hash).not.toContain(word);
    }
  });

  it('keep only the settings that differ from the defaults', async () => {
    const hash = await encodeState({ text: 'Open sesame', seed: 7, settings: settings({ order: 'az' }) });
    expect(await unpack(hash)).toEqual({ v: 1, text: 'Open sesame', seed: 7, settings: { order: 'az' } });
  });

  it('leave an empty page out of the URL, but keep settings without text', async () => {
    expect(await encodeState({ text: '', seed: 5, settings: DEFAULT_SETTINGS })).toBe('');
    const hash = await encodeState({ text: '', seed: 5, settings: settings({ spacing: 'tiles' }) });
    expect(await decodeState(hash)).toEqual({ text: '', seed: 5, settings: settings({ spacing: 'tiles' }) });
  });

  it('ignore what isn’t one of the page’s own', async () => {
    for (const hash of ['', '#', '#text=hello', '#s=', '#s=!!!', '#s=bm90IGRlZmxhdGVk']) expect(await decodeState(hash)).toBeNull();
    expect(await decodeState(await pack(['not', 'an', 'object']))).toBeNull();
  });

  it('check everything a link says, and leave out what doesn’t fit', async () => {
    const hash = await pack({
      v: 1,
      text: 42,
      seed: -1,
      settings: { shape: 'spiral', count: 7, order: 'az', moveEvery: 'yes', keepLast: true, pattern: 'x'.repeat(100), wordCount: 3 },
    });
    expect(await decodeState(hash)).toEqual({ settings: settings({ order: 'az', keepLast: true, wordCount: 3 }) });
  });

  it('bring back the puzzle being made, checked', async () => {
    const puzzle = { clue: 'NEPO EMASES', accepted: ['PEON SESAME'], riddle: 'What opens the cave?', success: 'The rock rolls aside.' };
    const hash = await encodeState({ text: 'Open sesame', seed: 1, settings: DEFAULT_SETTINGS, puzzle });
    expect((await decodeState(hash))?.puzzle).toEqual(puzzle);
    expect(await encodeState({ text: '', seed: 1, settings: DEFAULT_SETTINGS, puzzle })).not.toBe('');
    const doctored = await pack({ v: 1, text: 'x', seed: 1, puzzle: { clue: 42, accepted: 'all' } });
    expect((await decodeState(doctored))?.puzzle).toBeUndefined();
    const partly = await pack({ v: 1, text: 'x', seed: 1, puzzle: { clue: 'X', accepted: ['A', 7], riddle: 'r'.repeat(900) } });
    expect((await decodeState(partly))?.puzzle).toEqual({ clue: 'X', accepted: ['A'], riddle: '', success: 'The way opens.' });
  });

  it('keep at most so much text', async () => {
    const state = await decodeState(await encodeState({ text: 'a'.repeat(5000), seed: 1, settings: DEFAULT_SETTINGS }));
    expect(state?.text).toHaveLength(MAX_TEXT);
  });
});
