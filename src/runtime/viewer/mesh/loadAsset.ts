import { loadMeshAsset, type MaterialMapName } from './glb';
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
    mesh.primitives.flatMap((primitive, index) =>
      (Object.keys(primitive.material.maps) as MaterialMapName[]).map(async name => {
        const map = primitive.material.maps[name];
        if (!map) {
          return;
        }
        const { image } = map;
        const blob = typeof image === 'string' ? await (await fetch(image)).blob() : image;
        // Not converted, as a map of normals or of roughness holds numbers and not colors.
        const bitmap = await createImageBitmap(blob, {
          imageOrientation: 'none',
          premultiplyAlpha: 'none',
          colorSpaceConversion: 'none',
        });
        if (alive()) {
          renderer.setTexture(asset, index, name, bitmap);
        }
        bitmap.close();
      }),
    ),
  );
  changed();
}
