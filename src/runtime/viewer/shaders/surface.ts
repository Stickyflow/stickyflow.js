import type { ShaderParameter } from '../../../model/shader';
import { captureShaderBackdrop } from './backdrop';
import { createSurface, releaseSurface } from './createSurface';
import { applyBackdrop, renderSurface } from './renderSurface';
import type { Surface } from './surfaceTypes';

export interface ShaderSurfaceHandle {
  capture(): Array<string | undefined>;
  setParameters(ownerId: string, parameters: Record<string, ShaderParameter>): boolean;
  setPaused(paused: boolean): void;
  refresh(): void;
  destroy(): void;
}

export function mountShaderSurfaces(svg: SVGSVGElement): ShaderSurfaceHandle {
  let surfaces: Surface[] = [];
  let frame: number | undefined;
  let backdropGeneration = 0;
  const view = svg.ownerDocument.defaultView;
  let pausedSince: number | null = null;
  let spentPaused = 0;
  const real = () => (view?.performance.now() ?? 0) / 1000;
  const clock = () => (pausedSince ?? real()) - spentPaused;

  const draw = (milliseconds: number) => {
    if (pausedSince === null) {
      for (const surface of surfaces) {
        renderSurface(surface, milliseconds / 1000 - spentPaused);
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

  const refresh = () => {
    stop();
    const generation = ++backdropGeneration;
    surfaces = [...svg.querySelectorAll<HTMLCanvasElement>('canvas[data-sf-shader-canvas]')].flatMap(canvas => {
      const surface = createSurface(canvas);
      return surface ? [surface] : [];
    });
    captureBackdrops(generation);
    if (surfaces.length > 0) {
      if (view?.requestAnimationFrame) {
        if (pausedSince !== null) {
          for (const surface of surfaces) {
            renderSurface(surface, clock());
          }
        }
        frame = view.requestAnimationFrame(draw);
      } else {
        for (const surface of surfaces) {
          renderSurface(surface, 0);
        }
      }
    }
  };

  const capture = (): Array<string | undefined> => {
    const seconds = clock();
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
  };

  const setParameters = (ownerId: string, parameters: Record<string, ShaderParameter>): boolean => {
    let changed = false;
    const seconds = clock();
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
  };

  let recapture: number | undefined;
  const scheduleRecapture = () => {
    if (recapture !== undefined) {
      view?.clearTimeout(recapture);
    }
    recapture = view?.setTimeout(() => {
      recapture = undefined;
      captureBackdrops(backdropGeneration);
    }, 120);
  };
  const viewObserver = view ? new view.MutationObserver(scheduleRecapture) : undefined;
  viewObserver?.observe(svg, { attributes: true, attributeFilter: ['viewBox'] });
  const sizeObserver = view?.ResizeObserver ? new view.ResizeObserver(scheduleRecapture) : undefined;
  sizeObserver?.observe(svg);

  refresh();
  const destroy = () => {
    backdropGeneration += 1;
    viewObserver?.disconnect();
    sizeObserver?.disconnect();
    if (recapture !== undefined) {
      view?.clearTimeout(recapture);
    }
    stop();
  };

  const setPaused = (paused: boolean) => {
    if (paused && pausedSince === null) {
      pausedSince = real();
    } else if (!paused && pausedSince !== null) {
      spentPaused += real() - pausedSince;
      pausedSince = null;
    }
  };

  return { capture, setParameters, setPaused, refresh, destroy };
}
