import type { BindingRuntime } from '../../binding';
import type { Viewer } from './types';

export interface InteractionOptions {
  enabled?: () => boolean;
  paused?: () => boolean;
}

const TAU = Math.PI * 2;
const LONGEST_TICK = 0.05;

const finite = (value: unknown, fallback: number): number =>
  Number.isFinite(Number(value)) && value !== '' ? Number(value) : fallback;

function parameters(surface: Element): Record<string, unknown> {
  try {
    return JSON.parse(surface.getAttribute('data-sf-shader-params') ?? '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

function pointerValue(svg: SVGSVGElement, id: string, x: number, y: number): number | undefined {
  const surface = svg.querySelector(`foreignObject[data-sf-shader][data-sf-id="${CSS.escape(id)}"]`);
  if (!surface) {
    return undefined;
  }
  const params = parameters(surface);
  const box = surface.getBoundingClientRect();
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  if (surface.getAttribute('data-sf-kind') === 'ruler') {
    const inset = finite(params.inset, 0) > 0 ? finite(params.inset, 0.05) : 0.05;
    const min = finite(params.min, 0);
    const max = finite(params.max, 100);
    const along = params.axis === 'horizontal' ? (x - box.left) / box.width : 1 - (y - box.top) / box.height;
    return min + clamp((along - inset) / (1 - 2 * inset)) * (max - min);
  }
  const start = (finite(params.start, 225) * Math.PI) / 180;
  const sweep = (finite(params.sweep, 270) * Math.PI) / 180;
  const gap = TAU - sweep;
  const angle = Math.atan2(-(y - (box.top + box.height / 2)), x - (box.left + box.width / 2));
  const shifted = start - angle + gap / 2;
  const fraction = clamp(((((shifted % TAU) + TAU) % TAU) - gap / 2) / sweep);
  return fraction * finite(params.max, 100);
}

function hit(svg: SVGSVGElement, ids: ReadonlySet<string>, x: number, y: number): string | null {
  let found: string | null = null;
  for (const node of svg.querySelectorAll('[data-sf-primary][data-sf-id]')) {
    const id = node.getAttribute('data-sf-id') ?? '';
    if (!ids.has(id)) {
      continue;
    }
    const box = node.getBoundingClientRect();
    if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
      found = id;
    }
  }
  return found;
}

export function connectInteraction(
  viewer: Viewer,
  runtime: BindingRuntime,
  options: InteractionOptions = {},
): () => void {
  const { pressable, scales } = runtime.interactive;
  const svg = viewer.svg;
  let active: string | null = null;
  let hovered: string | null = null;
  let swallowClick = false;

  const track = (event: PointerEvent) => {
    for (const id of scales) {
      const value = pointerValue(svg, id, event.clientX, event.clientY);
      if (value !== undefined) {
        runtime.setElementState(id, { pointer: value });
      }
    }
  };

  const hover = (event: PointerEvent) => {
    const over = options.enabled?.() === false ? null : hit(svg, pressable, event.clientX, event.clientY);
    if (over === hovered) {
      return;
    }
    if (hovered) {
      runtime.setElementState(hovered, { hovered: false });
    }
    hovered = over;
    if (over) {
      runtime.setElementState(over, { hovered: true });
    }
  };

  const down = (event: PointerEvent) => {
    swallowClick = false;
    if (
      event.button !== 0 ||
      options.enabled?.() === false ||
      !(event.target instanceof Node) ||
      !svg.contains(event.target)
    ) {
      return;
    }
    const id = hit(svg, pressable, event.clientX, event.clientY);
    if (!id) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    swallowClick = true;
    active = id;
    track(event);
    runtime.press(id);
    runtime.drag(id);
  };

  const move = (event: PointerEvent) => {
    if (!active) {
      hover(event);
      return;
    }
    track(event);
    runtime.drag(active);
  };

  const end = (tapOnElement: boolean) => (event: PointerEvent) => {
    if (!active) {
      return;
    }
    event.stopPropagation();
    const id = active;
    active = null;
    runtime.release(id, tapOnElement && hit(svg, pressable, event.clientX, event.clientY) === id);
    hover(event);
  };
  const up = end(true);
  const cancel = end(false);

  const click = (event: MouseEvent) => {
    if (!swallowClick) {
      return;
    }
    swallowClick = false;
    event.stopPropagation();
    event.preventDefault();
  };

  window.addEventListener('click', click, true);
  window.addEventListener('pointerdown', down, true);
  window.addEventListener('pointermove', move, true);
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', cancel, true);

  let frame = 0;
  if (runtime.graph.handlers.some(handler => handler.event === 'onTick')) {
    let previous = performance.now();
    const loop = (now: number) => {
      if (options.paused?.() !== true) {
        runtime.tick(Math.min((now - previous) / 1000, LONGEST_TICK));
      }
      previous = now;
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
  }

  return () => {
    window.removeEventListener('click', click, true);
    window.removeEventListener('pointerdown', down, true);
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', cancel, true);
    window.cancelAnimationFrame(frame);
    if (active) {
      runtime.release(active, false);
    }
    if (hovered) {
      runtime.setElementState(hovered, { hovered: false });
    }
  };
}
