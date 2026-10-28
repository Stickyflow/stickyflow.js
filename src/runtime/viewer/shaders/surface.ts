import type { ShaderParameter } from '../../../model/shader';
import { captureShaderBackdrop } from './backdrop';
import { createSurface, releaseSurface } from './createSurface';
import { updateReactiveLightFields } from './reactiveLightField';
import { applyBackdrop, renderSurface } from './renderSurface';
import { createSurfaceClock } from './surfaceClock';
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

export function mountShaderSurfaces(svg: SVGSVGElement): ShaderSurfaceHandle {
  let surfaces: Surface[] = [];
  let frame: number | undefined;
  let backdropGeneration = 0;
  let recapture: number | undefined;
  const view = svg.ownerDocument.defaultView;
  const clock = createSurfaceClock(view);

  const draw = (milliseconds: number) => {
    if (!clock.paused()) {
      updateReactiveLightFields(surfaces);
      for (const surface of surfaces) {
        renderSurface(surface, milliseconds / 1000 - clock.spent());
      }
    }
    frame = view?.requestAnimationFrame(draw);
  };

  const stop = () => {
    if (frame !== undefined) {
      view?.cancelAnimationFrame(frame);
      frame = undefined;
    }
    for (const surface of surfaces) {
      releaseSurface(surface);
    }
    surfaces = [];
  };

  const captureBackdrops = (generation: number) => {
    for (const surface of surfaces) {
      if (!surface.usesBackdrop) {
        continue;
      }
      void captureShaderBackdrop(svg, surface.owner).then(backdrop => {
        if (backdrop && generation === backdropGeneration) {
          applyBackdrop(surface, backdrop);
        }
      });
    }
  };

  const startFrames = () => {
    if (!view?.requestAnimationFrame) {
      for (const surface of surfaces) {
        renderSurface(surface, 0);
      }
      return;
    }
    if (clock.paused()) {
      for (const surface of surfaces) {
        renderSurface(surface, clock.now());
      }
    }
    frame = view.requestAnimationFrame(draw);
  };

  const refresh = () => {
    const memory = rememberSurfaces(surfaces);
    stop();
    const generation = ++backdropGeneration;
    surfaces = createSurfaces(svg, memory);
    updateReactiveLightFields(surfaces);
    captureBackdrops(generation);
    if (surfaces.length > 0) {
      startFrames();
    }
  };

  const scheduleRecapture = () => {
    if (recapture !== undefined) {
      view?.clearTimeout(recapture);
    }
    recapture = view?.setTimeout(() => {
      recapture = undefined;
      captureBackdrops(backdropGeneration);
    }, RECAPTURE_DELAY_MS);
  };
  const unwatch = watchSvgChanges(svg, view, scheduleRecapture);

  const track = (event: PointerEvent) => {
    const now = clock.now();
    for (const surface of surfaces) {
      followPointer(surface, event, now);
    }
  };
  const leave = () => {
    for (const surface of surfaces) {
      surface.hovering = false;
    }
  };
  svg.addEventListener('pointermove', track);
  svg.addEventListener('pointerleave', leave);

  refresh();

  const destroy = () => {
    backdropGeneration += 1;
    unwatch();
    svg.removeEventListener('pointermove', track);
    svg.removeEventListener('pointerleave', leave);
    if (recapture !== undefined) {
      view?.clearTimeout(recapture);
    }
    stop();
  };

  return {
    capture: () => capturePngs(svg, surfaces, clock.now()),
    setParameters: (ownerId, parameters) => updateParameters(surfaces, ownerId, parameters, clock.now()),
    setPaused: clock.setPaused,
    refresh,
    destroy,
  };
}
