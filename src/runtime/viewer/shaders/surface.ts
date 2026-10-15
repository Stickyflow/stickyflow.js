import type { ShaderParameter } from '../../../model/shader';
import { captureShaderBackdrop } from './backdrop';
import { createSurface, releaseSurface } from './createSurface';
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
    renderSurface(surface, seconds);
    changed = true;
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

export function mountShaderSurfaces(svg: SVGSVGElement): ShaderSurfaceHandle {
  let surfaces: Surface[] = [];
  let frame: number | undefined;
  let backdropGeneration = 0;
  let recapture: number | undefined;
  const view = svg.ownerDocument.defaultView;
  const clock = createSurfaceClock(view);

  const draw = (milliseconds: number) => {
    if (!clock.paused()) {
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
    stop();
    const generation = ++backdropGeneration;
    surfaces = [...svg.querySelectorAll<HTMLCanvasElement>('canvas[data-sf-shader-canvas]')].flatMap(canvas => {
      const surface = createSurface(canvas);
      return surface ? [surface] : [];
    });
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

  refresh();

  const destroy = () => {
    backdropGeneration += 1;
    unwatch();
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
