import { STUDIO } from './environment';
import { loadAssetInto } from './loadAsset';
import { environmentFor } from './loadEnvironment';
import type { MeshRenderer } from './renderer';

// A document names what it loads, so it stays on the ways a page normally loads a picture.
function defaultAsset(asset: string): string | null {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(asset)?.[1].toLowerCase();
  return !scheme || ['http', 'https', 'blob', 'data'].includes(scheme) ? asset : null;
}

interface LoaderTarget {
  // Says what address an asset is loaded from, or that it is not loaded at all.
  resolveAsset?: (asset: string) => string | null;
  // Whether what was loaded for a renderer is still wanted.
  alive(renderer: MeshRenderer): boolean;
  report(message: string): void;
  // Something has arrived. With `reframe`, what stands on the stage has changed and the camera frames it again.
  arrived(reframe: boolean): void;
}

// Loads what a stage names into its renderer: the files of its meshes, and its environment.
export class StageLoader {
  private readonly target: LoaderTarget;
  private readonly loading = new Set<string>();
  // The environment the renderer has, or is getting.
  private environment = '';

  constructor(target: LoaderTarget) {
    this.target = target;
  }

  // A new renderer has nothing yet.
  reset(): void {
    this.environment = '';
  }

  asset(renderer: MeshRenderer, asset: string): void {
    if (renderer.hasAsset(asset) || this.loading.has(asset)) {
      return;
    }
    const address = this.address(asset);
    this.loading.add(asset);
    if (address === null) {
      this.target.report(`${asset}: this address is not allowed`);
      return;
    }
    const alive = () => this.target.alive(renderer);
    void loadAssetInto(renderer, asset, address, alive, () => this.target.arrived(true))
      .catch((failure: unknown) => this.fail(asset, failure))
      .finally(() => this.loading.delete(asset));
  }

  environmentOf(renderer: MeshRenderer, name: string): void {
    if (name === this.environment) {
      return;
    }
    this.environment = name;
    if (!name) {
      renderer.setEnvironment(null);
      this.target.arrived(false);
      return;
    }
    const address = name === STUDIO ? STUDIO : this.address(name);
    if (address === null) {
      this.target.report(`${name}: this address is not allowed`);
      return;
    }
    environmentFor(name, address)
      .then(image => {
        if (this.target.alive(renderer) && this.environment === name) {
          renderer.setEnvironment(image);
          this.target.arrived(false);
        }
      })
      .catch((failure: unknown) => this.fail(name, failure));
  }

  private address(name: string): string | null {
    return this.target.resolveAsset ? this.target.resolveAsset(name) : defaultAsset(name);
  }

  private fail(name: string, failure: unknown): void {
    this.target.report(`${name}: ${failure instanceof Error ? failure.message : String(failure)}`);
  }
}
