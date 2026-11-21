import type { Mesh } from '../../../model/mesh';
import { terrainOfAsset } from '../../../model/terrain';
import type { MeshRenderer } from './renderer';
import { rasterize, surfaceLayers } from './surfaceLayers';
import type { StageSurface } from './surfaceTextures';

// How many pixels the longer side of the picture on a Terrain has.
const LONGER_SIDE = 2048;

// The Canvases that are the picture of a Terrain. They lie on its land and are not drawn as surfaces of their own.
export function pictureSurfaces(meshes: readonly Mesh[]): Set<string> {
  const ids = new Set<string>();
  for (const mesh of meshes) {
    const surface = terrainOfAsset(mesh.asset)?.surface;
    if (surface) {
      ids.add(surface);
    }
  }
  return ids;
}

// The drawings of Canvases that lie on Terrains, each made into the picture of the top of its Terrain.
export class TerrainPictures {
  // What each Terrain shows, or is getting.
  private readonly shown = new Map<string, string>();
  private readonly renderer: MeshRenderer;
  private readonly page: Document;
  private readonly changed: () => void;
  private readonly failed: (message: string) => void;

  constructor(renderer: MeshRenderer, page: Document, changed: () => void, failed: (message: string) => void) {
    this.renderer = renderer;
    this.page = page;
    this.changed = changed;
    this.failed = failed;
  }

  // Brings the picture of every Terrain up to the drawing of its Canvas, once the Terrain is there.
  sync(meshes: readonly Mesh[], surfaces: readonly StageSurface[]): void {
    for (const { asset } of meshes) {
      const surface = surfaces.find(item => item.id === terrainOfAsset(asset)?.surface);
      if (!surface) {
        continue;
      }
      if (!this.renderer.hasAsset(asset)) {
        this.shown.delete(asset);
        continue;
      }
      const content = `${surface.width}x${surface.height}|${surface.svg}`;
      if (this.shown.get(asset) === content) {
        continue;
      }
      this.shown.set(asset, content);
      this.make(surface)
        .then(picture => {
          if (this.shown.get(asset) === content && this.renderer.hasAsset(asset)) {
            this.renderer.setTexture(asset, 0, 'base', picture);
            this.changed();
          }
          picture.close();
        })
        .catch((failure: unknown) => {
          this.failed(`${surface.id}: ${failure instanceof Error ? failure.message : String(failure)}`);
        });
    }
  }

  // A shader on the Canvas is left out: only what is drawn lies on the land.
  private async make(surface: StageSurface): Promise<ImageBitmap> {
    const scale = LONGER_SIDE / Math.max(surface.width, surface.height);
    const width = Math.max(1, Math.round(surface.width * scale));
    const height = Math.max(1, Math.round(surface.height * scale));
    const sheet = this.page.createElement('canvas');
    sheet.width = width;
    sheet.height = height;
    const context = sheet.getContext('2d');
    for (const part of await surfaceLayers(surface.svg, surface.width, surface.height, this.page, () => undefined)) {
      if ('svg' in part) {
        context?.drawImage(await rasterize(part.svg, width, height, this.page), 0, 0);
      }
    }
    return createImageBitmap(sheet);
  }
}
