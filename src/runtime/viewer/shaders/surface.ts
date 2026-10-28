import type { ShaderParameter } from '../../../model/shader';
import { captureShaderBackdrop } from './backdrop';
import { createSurface, releaseSurface } from './createSurface';
import { updateReactiveLightFields } from './reactiveLightField';
import { applyBackdrop, renderSurface } from './renderSurface';
import { createSurfaceClock, type SurfaceClock } from './surfaceClock';
import type { Surface } from './surfaceTypes';

export interface ShaderSurfaceHandle {
  capture(): Array<string | undefined>;
  setParameters(ownerId: string, parameters: Record<string, ShaderParameter>): boolean;
  setPaused(paused: boolean): void;
  refresh(): void;
  destroy(): void;
}

const RECAPTURE_DELAY_MS = 120;
// A new place of the trail after this many seconds of movement, and as many places as the shaders read.
const TRAIL_SPACING = 0.055;
const TRAIL_LENGTH = 16;

function capturePngs(svg: SVGSVGElement, surfaces: Surface[], seconds: number): Array<string | undefined> {
  const surfaceByCanvas = new Map(surfaces.map(surface => [surface.canvas, surface]));
  return [...svg.querySelectorAll<HTMLCanvasElement>('canvas[data-sf-shader-canvas]')].map(canvas => {
    const surface = surfaceByCanvas.get(canvas);
    if (!surface) {
      return undefined;
    }
    try {
      renderSurface(surface, seconds);
      return surface.canvas.toDataURL('image/png');
    } catch {
      return undefined;
    }
  });
}

function updateParameters(
  surfaces: Surface[],
  ownerId: string,
  parameters: Record<string, ShaderParameter>,
  seconds: number,
): boolean {
  let changed = false;
  for (const surface of surfaces) {
    if (surface.owner.getAttribute('data-sf-id') !== ownerId) {
      continue;
    }
    Object.assign(surface.parameters, parameters);
    surface.owner.setAttribute('data-sf-shader-params', JSON.stringify(surface.parameters));
    changed = true;
  }
  if (changed) {
    updateReactiveLightFields(surfaces);
    for (const surface of surfaces) {
      renderSurface(surface, seconds);
    }
  }
  return changed;
}

function watchSvgChanges(
  svg: SVGSVGElement,
  view: (Window & typeof globalThis) | null,
  onChange: () => void,
): () => void {
  if (!view) {
    return () => undefined;
  }
  const mutations = new view.MutationObserver(onChange);
  mutations.observe(svg, { attributes: true, attributeFilter: ['viewBox'] });
  const sizes = view.ResizeObserver ? new view.ResizeObserver(onChange) : undefined;
  sizes?.observe(svg);
  return () => {
    mutations.disconnect();
    sizes?.disconnect();
  };
}

// What a surface has gathered while it ran, which a refresh gives to the new surface of the same owner so the picture does not start over.
type SurfaceMemory = Pick<Surface, 'smoothed' | 'reactiveLight' | 'pointer' | 'hover' | 'hovering' | 'trail'>;

function rememberSurfaces(surfaces: Surface[]): Map<string, SurfaceMemory> {
  return new Map(
    surfaces.flatMap(surface => {
      const ownerId = surface.owner.getAttribute('data-sf-id');
      return ownerId
        ? [
            [
              ownerId,
              {
                smoothed: new Map(surface.smoothed),
                reactiveLight: surface.reactiveLight,
                pointer: surface.pointer,
                hover: surface.hover,
                hovering: surface.hovering,
                trail: surface.trail,
              },
            ],
          ]
        : [];
    }),
  );
}

function createSurfaces(svg: SVGSVGElement, memory: Map<string, SurfaceMemory>): Surface[] {
  return [...svg.querySelectorAll<HTMLCanvasElement>('canvas[data-sf-shader-canvas]')].flatMap(canvas => {
    const surface = createSurface(canvas);
    const ownerId = surface?.owner.getAttribute('data-sf-id');
    const previous = ownerId ? memory.get(ownerId) : undefined;
    if (surface && previous) {
      Object.assign(surface, previous);
    }
    return surface ? [surface] : [];
  });
}

// A shader that reacts to the pointer reads where it is over the surface, and how far it is over it.
function followPointer(surface: Surface, event: PointerEvent, now: number): void {
  const box = surface.canvas.getBoundingClientRect();
  const inside =
    box.width > 0 &&
    box.height > 0 &&
    event.clientX >= box.left &&
    event.clientX <= box.right &&
    event.clientY >= box.top &&
    event.clientY <= box.bottom;
  surface.hovering = inside;
  if (!inside) {
    return;
  }
  surface.pointer = { x: (event.clientX - box.left) / box.width, y: 1 - (event.clientY - box.top) / box.height };
  const last = surface.trail[surface.trail.length - 1];
  if (!last || now - last.at >= TRAIL_SPACING) {
    surface.trail.push({ ...surface.pointer, at: now });
    if (surface.trail.length > TRAIL_LENGTH) {
      surface.trail.shift();
    }
  }
}

// The shader surfaces of one drawing: it makes them from the canvases in it, draws them every frame, keeps their backdrops up to date and
// lets them follow the pointer.
class ShaderSurfaces implements ShaderSurfaceHandle {
  private surfaces: Surface[] = [];
  private frame: number | undefined;
  private backdropGeneration = 0;
  private recapture: number | undefined;
  private readonly view: (Window & typeof globalThis) | null;
  private readonly clock: SurfaceClock;
  private readonly unwatch: () => void;

  constructor(private readonly svg: SVGSVGElement) {
    this.view = svg.ownerDocument.defaultView;
    this.clock = createSurfaceClock(this.view);
    this.unwatch = watchSvgChanges(svg, this.view, this.scheduleRecapture);
    svg.addEventListener('pointermove', this.track);
    svg.addEventListener('pointerleave', this.leave);
    this.refresh();
  }

  capture(): Array<string | undefined> {
    return capturePngs(this.svg, this.surfaces, this.clock.now());
  }

  setParameters(ownerId: string, parameters: Record<string, ShaderParameter>): boolean {
    return updateParameters(this.surfaces, ownerId, parameters, this.clock.now());
  }

  setPaused(paused: boolean): void {
    this.clock.setPaused(paused);
  }

  refresh(): void {
    const memory = rememberSurfaces(this.surfaces);
    this.stop();
    const generation = ++this.backdropGeneration;
    this.surfaces = createSurfaces(this.svg, memory);
    updateReactiveLightFields(this.surfaces);
    this.captureBackdrops(generation);
    if (this.surfaces.length > 0) {
      this.startFrames();
    }
  }

  destroy(): void {
    this.backdropGeneration += 1;
    this.unwatch();
    this.svg.removeEventListener('pointermove', this.track);
    this.svg.removeEventListener('pointerleave', this.leave);
    if (this.recapture !== undefined) {
      this.view?.clearTimeout(this.recapture);
    }
    this.stop();
  }

  private readonly draw = (milliseconds: number): void => {
    if (!this.clock.paused()) {
      updateReactiveLightFields(this.surfaces);
      for (const surface of this.surfaces) {
        renderSurface(surface, milliseconds / 1000 - this.clock.spent());
      }
    }
    this.frame = this.view?.requestAnimationFrame(this.draw);
  };

  private stop(): void {
    if (this.frame !== undefined) {
      this.view?.cancelAnimationFrame(this.frame);
      this.frame = undefined;
    }
    for (const surface of this.surfaces) {
      releaseSurface(surface);
    }
    this.surfaces = [];
  }

  private captureBackdrops(generation: number): void {
    for (const surface of this.surfaces) {
      if (!surface.usesBackdrop) {
        continue;
      }
      void captureShaderBackdrop(this.svg, surface.owner).then(backdrop => {
        if (backdrop && generation === this.backdropGeneration) {
          applyBackdrop(surface, backdrop);
        }
      });
    }
  }

  private startFrames(): void {
    if (!this.view?.requestAnimationFrame) {
      for (const surface of this.surfaces) {
        renderSurface(surface, 0);
      }
      return;
    }
    if (this.clock.paused()) {
      for (const surface of this.surfaces) {
        renderSurface(surface, this.clock.now());
      }
    }
    this.frame = this.view.requestAnimationFrame(this.draw);
  }

  private readonly scheduleRecapture = (): void => {
    if (this.recapture !== undefined) {
      this.view?.clearTimeout(this.recapture);
    }
    this.recapture = this.view?.setTimeout(() => {
      this.recapture = undefined;
      this.captureBackdrops(this.backdropGeneration);
    }, RECAPTURE_DELAY_MS);
  };

  private readonly track = (event: PointerEvent): void => {
    const now = this.clock.now();
    for (const surface of this.surfaces) {
      followPointer(surface, event, now);
    }
  };

  private readonly leave = (): void => {
    for (const surface of this.surfaces) {
      surface.hovering = false;
    }
  };
}

export function mountShaderSurfaces(svg: SVGSVGElement): ShaderSurfaceHandle {
  return new ShaderSurfaces(svg);
}
