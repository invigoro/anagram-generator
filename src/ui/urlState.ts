/**
 * The page in its URL, so a link brings back the same list: "#s=", then the text, the seed and
 * any settings that differ from the defaults, as JSON, deflate-raw compressed and base64url
 * encoded, as in Stele's links. The text is often a password, so the address bar never spells it
 * out, say during a screen share.
 */
import { COUNTS, DEFAULT_SETTINGS, ORDERS, SHAPES, WORD_COUNTS, type Settings } from './settings';

/** Bumped when the shape of the state changes incompatibly. */
const VERSION = 1;
const PREFIX = '#s=';
/** Longest text kept from a link, so a pasted novel can't make a link unusable. */
export const MAX_TEXT = 1000;

export interface PageState {
  text: string;
  seed: number;
  settings: Settings;
}

async function transform(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const input = new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const reader = input.pipeThrough(stream).getReader();
  const chunks: Uint8Array[] = [];
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) chunks.push(chunk.value);
  const out = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** The settings that differ from the defaults, to keep links short. */
function changed(settings: Settings): Partial<Settings> {
  return Object.fromEntries(Object.entries(settings).filter(([key, value]) => DEFAULT_SETTINGS[key as keyof Settings] !== value));
}

/** The page's state as a URL fragment, or an empty string for a page with nothing on it. */
export async function encodeState({ text, seed, settings }: PageState): Promise<string> {
  const differences = changed(settings);
  if (text === '' && Object.keys(differences).length === 0) return '';
  const json = new TextEncoder().encode(JSON.stringify({ v: VERSION, text, seed, settings: differences }));
  return PREFIX + toBase64Url(await transform(json, new CompressionStream('deflate-raw')));
}

const oneOf = <T>(value: unknown, allowed: readonly T[]): value is T => allowed.includes(value as T);

/** Valid settings from untrusted data; anything missing or malformed is left out. */
export function sanitizeSettings(data: unknown): Partial<Settings> {
  if (!data || typeof data !== 'object') return {};
  const input = data as Record<string, unknown>;
  const settings: Partial<Settings> = {};
  if (oneOf(input.shape, SHAPES)) settings.shape = input.shape;
  if (oneOf(input.wordCount, WORD_COUNTS)) settings.wordCount = input.wordCount;
  if (typeof input.pattern === 'string' && input.pattern.length <= 60) settings.pattern = input.pattern;
  for (const rule of ['keepFirst', 'keepLast', 'moveEvery', 'partNeighbours'] as const) {
    if (typeof input[rule] === 'boolean') settings[rule] = input[rule];
  }
  if (oneOf(input.letterCase, ['upper', 'lower', 'title'] as const)) settings.letterCase = input.letterCase;
  if (oneOf(input.spacing, ['together', 'spaced', 'tiles'] as const)) settings.spacing = input.spacing;
  if (oneOf(input.punctuation, ['drop', 'keep'] as const)) settings.punctuation = input.punctuation;
  if (oneOf(input.digits, ['scramble', 'drop'] as const)) settings.digits = input.digits;
  if (oneOf(input.accents, ['keep', 'fold'] as const)) settings.accents = input.accents;
  if (oneOf(input.count, COUNTS)) settings.count = input.count;
  if (oneOf(input.order, ORDERS)) settings.order = input.order;
  return settings;
}

/** What a URL fragment says about the page, or null if it isn't one of this page's. */
export async function decodeState(hash: string): Promise<Partial<PageState> | null> {
  if (!hash.startsWith(PREFIX)) return null;
  try {
    const json = await transform(fromBase64Url(hash.slice(PREFIX.length)), new DecompressionStream('deflate-raw'));
    const data: unknown = JSON.parse(new TextDecoder().decode(json));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const input = data as Record<string, unknown>;
    const state: Partial<PageState> = { settings: { ...DEFAULT_SETTINGS, ...sanitizeSettings(input.settings) } };
    if (typeof input.text === 'string') state.text = input.text.slice(0, MAX_TEXT);
    if (typeof input.seed === 'number' && Number.isInteger(input.seed) && input.seed >= 0 && input.seed < 2 ** 32) state.seed = input.seed;
    return state;
  } catch {
    return null;
  }
}

/** The address of the page with this state. */
export async function linkFor(state: PageState): Promise<string> {
  const url = new URL(window.location.href);
  url.hash = await encodeState(state);
  return url.toString();
}
