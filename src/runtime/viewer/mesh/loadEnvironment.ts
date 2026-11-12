import {
  darkStudioEnvironment,
  type EnvironmentImage,
  fromPixels,
  MADE_ENVIRONMENTS,
  parseHdr,
  STUDIO,
  studioEnvironment,
} from './environment';

// Pictures of the world are kept for the page, as several stages often share one and making one takes a moment.
const environments = new Map<string, Promise<EnvironmentImage>>();

async function fetchEnvironment(address: string): Promise<EnvironmentImage> {
  const response = await fetch(address);
  if (!response.ok) {
    throw new Error(`${address}: ${response.status}`);
  }
  const bytes = await response.arrayBuffer();
  if (new Uint8Array(bytes, 0, 2).every((value, index) => value === '#?'.charCodeAt(index))) {
    return parseHdr(bytes);
  }
  const bitmap = await createImageBitmap(new Blob([bytes]), { colorSpaceConversion: 'none' });
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('the picture could not be read');
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return fromPixels(canvas.width, canvas.height, context.getImageData(0, 0, canvas.width, canvas.height).data);
}

export function environmentFor(name: string, address: string): Promise<EnvironmentImage> {
  const made = MADE_ENVIRONMENTS.includes(name);
  const key = made ? name : address;
  let known = environments.get(key);
  if (!known) {
    known = made
      ? Promise.resolve(name === STUDIO ? studioEnvironment() : darkStudioEnvironment())
      : fetchEnvironment(address);
    environments.set(key, known);
    known.catch(() => environments.delete(key));
  }
  return known;
}
