/** Anything packed into a string for a link: as JSON, deflate-raw compressed and base64url encoded, as Stele's links are. */

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

/** Anything, as JSON packed into a URL-safe string: deflate-raw compressed and base64url encoded. */
export async function pack(data: unknown): Promise<string> {
  return toBase64Url(await transform(new TextEncoder().encode(JSON.stringify(data)), new CompressionStream('deflate-raw')));
}

/** What `pack` packed, or null if the string isn't one of its. */
export async function unpack(packed: string): Promise<unknown> {
  try {
    return JSON.parse(new TextDecoder().decode(await transform(fromBase64Url(packed), new DecompressionStream('deflate-raw'))));
  } catch {
    return null;
  }
}
