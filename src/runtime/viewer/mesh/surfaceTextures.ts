import type { MeshSurface } from '../../../model/mesh';
import { hideBaseGeometry, planeSurface } from '../shaders/createSurface';
import { shaderProgram } from '../shaders/programs';
import { uploadSurface } from '../shaders/renderSurface';
import { type Mat4, modelMatrix } from './matrix';
import type { MeshRenderer, PlaneLayer } from './renderer';
import { rasterize, surfaceLayers } from './surfaceLayers';

export type StageSurface = MeshSurface & { svg: string };

const WORLD_UNIT = 100;
const START_LEVEL = 2;
const MAX_LEVEL = 4;

// Takes a square from -1 to 1 to the place of a surface in the world.
export function surfaceMatrix({ position, rotation, scale, width, height }: StageSurface): Mat4 {
  return modelMatrix(position, rotation, [
    (width / WORLD_UNIT / 2) * scale[0],
    (height / WORLD_UNIT / 2) * scale[1],
    scale[2],
  ]);
}

interface SurfaceState {
  content: string;
  level: number;
  layers: PlaneLayer[];
}

// The pictures of the surfaces of a stage. They are made while the old ones stay on show, so a change never leaves a gap.
export class SurfaceTextures {
  private readonly states = new Map<string, SurfaceState>();
  private readonly hiddenOn = new Map<string, string[]>();
  private readonly renderer: MeshRenderer;
  private readonly canvas: HTMLCanvasElement;
  private readonly changed: () => void;
  private readonly failed: (message: string) => void;

  constructor(
    renderer: MeshRenderer,
    canvas: HTMLCanvasElement,
    changed: () => void,
    failed: (message: string) => void,
  ) {
    this.renderer = renderer;
    this.canvas = canvas;
    this.changed = changed;
    this.failed = failed;
  }

  // What is hidden on a surface is left out of its picture.
  layers(surface: StageSurface, hidden: ReadonlySet<string>): readonly PlaneLayer[] {
    const known = this.states.get(surface.id);
    this.hiddenOn.set(
      surface.id,
      [...hidden].filter(id => surface.svg.includes(`data-sf-id="${id}"`)),
    );
    this.sync(surface, known?.level ?? START_LEVEL);
    return this.states.get(surface.id)?.layers ?? [];
  }

  // A surface brought near is drawn again with more pixels. It does not lose them when it goes away.
  sharpen(surface: StageSurface, pixelsWide: number): void {
    const state = this.states.get(surface.id);
    const wanted = Math.min(MAX_LEVEL, 2 ** Math.ceil(Math.log2(Math.max(1, pixelsWide / surface.width))));
    if (state && wanted > state.level) {
      this.sync(surface, wanted);
    }
  }

  // Surfaces that left the document give back their pictures.
  keepOnly(ids: ReadonlySet<string>): void {
    for (const [id, state] of this.states) {
      if (!ids.has(id)) {
        this.free(state.layers);
        this.states.delete(id);
      }
    }
  }

  private free(layers: readonly PlaneLayer[]): void {
    for (const layer of layers) {
      if ('texture' in layer) {
        this.renderer.deleteTexture(layer.texture);
      }
    }
  }

  private sync(surface: StageSurface, level: number): void {
    const known = this.states.get(surface.id);
    const hidden = this.hiddenOn.get(surface.id) ?? [];
    const content = `${hidden.join()}|${surface.svg}`;
    if (known && known.content === content && known.level === level) {
      return;
    }
    const state: SurfaceState = { content, level, layers: known?.layers ?? [] };
    this.states.set(surface.id, state);
    this.make(surface, hidden, level, () => this.states.get(surface.id) === state)
      .then(made => {
        if (this.states.get(surface.id) !== state) {
          this.free(made);
          return;
        }
        this.free(state.layers);
        state.layers = made;
        this.changed();
      })
      .catch((failure: unknown) => {
        this.failed(`${surface.id}: ${failure instanceof Error ? failure.message : String(failure)}`);
      });
  }

  private async make(
    surface: StageSurface,
    hidden: readonly string[],
    level: number,
    current: () => boolean,
  ): Promise<PlaneLayer[]> {
    const page = this.canvas.ownerDocument;
    const parts = await surfaceLayers(surface.svg, surface.width, surface.height, page, root => {
      for (const id of hidden) {
        for (const node of root.querySelectorAll(`[data-sf-id="${id}"]`)) {
          node.remove();
        }
      }
      for (const shader of root.querySelectorAll('foreignObject[data-sf-shader]')) {
        hideBaseGeometry(shader);
      }
    });
    const made: PlaneLayer[] = [];
    for (const part of parts) {
      if (!current()) {
        break;
      }
      if ('svg' in part) {
        const width = Math.round(surface.width * level);
        const height = Math.round(surface.height * level);
        made.push({ texture: this.renderer.planeTexture(await rasterize(part.svg, width, height, page)) });
      } else {
        const layer = this.shaderLayer(part.shader, surface, level);
        if (layer) {
          made.push(layer);
        }
      }
    }
    return made;
  }

  private shaderLayer(owner: Element, surface: StageSurface, level: number): PlaneLayer | undefined {
    const definition = shaderProgram(owner.getAttribute('data-sf-shader') ?? '');
    if (!definition) {
      return undefined;
    }
    const program = this.renderer.linkPlane(definition.fragmentSource);
    const shader = planeSurface(owner, this.canvas, this.renderer.shaderContext, program, this.renderer.planeBuffer);
    if (!shader) {
      return undefined;
    }
    const width = Number(owner.getAttribute('width'));
    const height = Number(owner.getAttribute('height'));
    return {
      program,
      rect: [
        Number(owner.getAttribute('x')) / surface.width,
        Number(owner.getAttribute('y')) / surface.height,
        width / surface.width,
        height / surface.height,
      ],
      upload: (time?: number) =>
        uploadSurface(shader, width * level, height * level, level, time ?? performance.now() / 1000),
    };
  }
}
