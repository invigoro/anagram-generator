import { describe, expect, it } from 'vitest';
import { STELE_URL, steleLink } from './steleLink';

/** A link decoded the way Stele decodes its own: base64url, inflate, JSON. */
async function decode(link: string): Promise<Record<string, unknown>> {
  expect(link.startsWith(`${STELE_URL}#s=`)).toBe(true);
  const encoded = link.slice(`${STELE_URL}#s=`.length);
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return JSON.parse(new TextDecoder().decode(await new Response(stream).arrayBuffer()));
}

describe('steleLink', () => {
  it('opens Stele with the clue on the medium, kept clear of damage and only a little faded', async () => {
    const settings = await decode(await steleLink('NEPO EMASES', 'What opens the cave?', { medium: 'sandstone', lettering: 'latin' }));
    expect(settings).toEqual({
      v: 1,
      medium: 'sandstone',
      textEdited: true,
      fade: 0.1,
      blocks: [{ kind: 'text', role: 'main', text: '{{What opens the cave?}}\n{{NEPO EMASES}}' }],
    });
  });

  it('asks for the runes chosen', async () => {
    const settings = await decode(await steleLink('TSAHERT', '', { medium: 'granite', lettering: 'elder-futhark' }));
    expect(settings.blocks).toEqual([{ kind: 'text', role: 'main', text: '{{TSAHERT}}', script: 'elder-futhark', font: 'noto-sans-runic' }]);
  });
});
