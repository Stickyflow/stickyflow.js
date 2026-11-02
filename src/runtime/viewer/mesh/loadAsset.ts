import { loadMeshAsset } from './glb';
import type { MeshRenderer } from './renderer';

// Loads a file and gives it to a renderer: the geometry first, so it can be seen, and its pictures as they come.
export async function loadAssetInto(
  renderer: MeshRenderer,
  asset: string,
  address: string,
  alive: () => boolean,
  changed: () => void,
): Promise<void> {
  const mesh = await loadMeshAsset(address);
  if (!alive()) {
    return;
  }
  renderer.addAsset(asset, mesh);
  changed();
  await Promise.all(
    mesh.primitives.map(async (primitive, index) => {
      const { image } = primitive.material;
      if (!image) {
        return;
      }
      const blob = typeof image === 'string' ? await (await fetch(image)).blob() : image;
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: 'none',
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none',
      });
      if (alive()) {
        renderer.setTexture(asset, index, bitmap);
      }
      bitmap.close();
    }),
  );
  changed();
}
