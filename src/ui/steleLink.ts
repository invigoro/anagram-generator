/**
 * "Open in Stele": a link that opens Stele with the clue already on the object, in Stele's own
 * share-link format, as Jabberwock's are: "#s=", then the settings as JSON, deflate-raw compressed
 * and base64url encoded. If Stele's format changes, this and engine/stele.ts are the places to update.
 */
import { steleSettings, type SteleOptions } from '../engine/stele';
import { pack } from './packing';

export const STELE_URL = 'https://stele.invigoro.me/';

export async function steleLink(clue: string, riddle: string, options: SteleOptions): Promise<string> {
  return `${STELE_URL}#s=${await pack(steleSettings(clue, riddle, options))}`;
}
