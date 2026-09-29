/**
 * Checking a guess without knowing the answer: a player link holds only a fingerprint of each
 * answer it accepts, made with a slow salted hash (PBKDF2), and a guess is right when its
 * fingerprint is one of them.
 *
 * A player who knows the clue knows the letters, so could try every arrangement of them. The slow
 * hash makes that take a while (OPEN SESAME's 302,400 arrangements, most of an hour), which is
 * plenty for a game; it isn't meant to stop a determined programmer.
 */

/** How many rounds of hashing each check takes: a few milliseconds a guess. */
const ROUNDS = 50_000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A fresh random salt, so two links to the same answer don't share fingerprints. */
export function newSalt(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(12)));
}

/** The fingerprint of some letters, with a salt: the same letters and salt always give the same one. */
export async function fingerprint(letters: string, salt: string): Promise<string> {
  const encode = (text: string) => new TextEncoder().encode(text);
  const key = await crypto.subtle.importKey('raw', encode(letters), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encode(salt), iterations: ROUNDS }, key, 128);
  return toBase64Url(new Uint8Array(bits));
}
