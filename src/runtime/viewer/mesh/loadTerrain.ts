import { buildTerrain, heightsOfPixels, resampleHeights, type TerrainShape, terrainGrid } from '../../../model/terrain';
import { builtAsset } from './glb';
import { loadMapsInto } from './loadAsset';
import type { MeshRenderer } from './renderer';

// No picture of heights is read larger than this on its longer side: more does not show.
const LARGEST = 2048;

// Loads the picture of heights of a Terrain, builds its block and gives it to a renderer, then the picture on its top.
export async function loadTerrainInto(
  renderer: MeshRenderer,
  asset: string,
  shape: TerrainShape,
  addresses: { heights: string; picture?: string },
  alive: () => boolean,
  changed: () => void,
): Promise<void> {
  const blob = await (await fetch(addresses.heights)).blob();
  // Not converted, as the picture holds numbers and not colors.
  const bitmap = await createImageBitmap(blob, {
    imageOrientation: 'none',
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
  });
  const scale = Math.min(1, LARGEST / Math.max(bitmap.width, bitmap.height));
  // Read at its own size wherever it can be: a picture in colors holds a number in its channels, which scaling would blur.
  const columns = Math.max(2, Math.round(bitmap.width * scale));
  const rows = Math.max(2, Math.round(bitmap.height * scale));
  const context = new OffscreenCanvas(columns, rows).getContext('2d', { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error('the picture of heights cannot be read here');
  }
  context.imageSmoothingEnabled = scale < 1;
  context.drawImage(bitmap, 0, 0, columns, rows);
  bitmap.close();
  const field = heightsOfPixels(context.getImageData(0, 0, columns, rows).data, columns, rows);
  if (!alive()) {
    return;
  }
  const { top, sides } = buildTerrain(shape, resampleHeights(field, ...terrainGrid(shape, columns, rows)));
  const mesh = builtAsset([
    { geometry: top, picture: addresses.picture, pictured: Boolean(addresses.picture || shape.surface) },
    { geometry: sides },
  ]);
  renderer.addAsset(asset, mesh);
  changed();
  await loadMapsInto(renderer, asset, mesh, alive);
  changed();
}
