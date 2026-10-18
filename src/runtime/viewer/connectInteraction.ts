import type { BindingRuntime } from '../../binding';
import { connectKeyboard } from './connectKeyboard';
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

interface Session {
  active: string | null;
  hovered: string | null;
  swallowClick: boolean;
}

interface Wiring {
  runtime: BindingRuntime;
  svg: SVGSVGElement;
  options: InteractionOptions;
  session: Session;
}

function trackScales(wiring: Wiring, event: PointerEvent): void {
  const { runtime, svg } = wiring;
  for (const id of runtime.interactive.scales) {
    const value = pointerValue(svg, id, event.clientX, event.clientY);
    if (value !== undefined) {
      runtime.setElementState(id, { pointer: value });
    }
  }
}

function updateHover(wiring: Wiring, event: PointerEvent): void {
  const { runtime, svg, options, session } = wiring;
  const over =
    options.enabled?.() === false ? null : hit(svg, runtime.interactive.pressable, event.clientX, event.clientY);
  if (over === session.hovered) {
    return;
  }
  if (session.hovered) {
    runtime.setElementState(session.hovered, { hovered: false });
  }
  session.hovered = over;
  if (over) {
    runtime.setElementState(over, { hovered: true });
  }
}

function pressStart(wiring: Wiring, event: PointerEvent): void {
  const { runtime, svg, options, session } = wiring;
  session.swallowClick = false;
  const inside = event.target instanceof Node && svg.contains(event.target);
  if (event.button !== 0 || options.enabled?.() === false || !inside) {
    return;
  }
  const id = hit(svg, runtime.interactive.pressable, event.clientX, event.clientY);
  if (!id) {
    return;
  }
  event.stopPropagation();
  event.preventDefault();
  session.swallowClick = true;
  session.active = id;
  trackScales(wiring, event);
  runtime.press(id);
  runtime.drag(id);
}

function pressMove(wiring: Wiring, event: PointerEvent): void {
  const { runtime, session } = wiring;
  if (!session.active) {
    updateHover(wiring, event);
    return;
  }
  trackScales(wiring, event);
  runtime.drag(session.active);
}

function pressEnd(wiring: Wiring, event: PointerEvent, tapOnElement: boolean): void {
  const { runtime, svg, session } = wiring;
  if (!session.active) {
    return;
  }
  event.stopPropagation();
  const id = session.active;
  session.active = null;
  const tapped = tapOnElement && hit(svg, runtime.interactive.pressable, event.clientX, event.clientY) === id;
  runtime.release(id, tapped);
  updateHover(wiring, event);
}

function swallowClick(session: Session, event: MouseEvent): void {
  if (!session.swallowClick) {
    return;
  }
  session.swallowClick = false;
  event.stopPropagation();
  event.preventDefault();
}

function startTicks(runtime: BindingRuntime, options: InteractionOptions): () => void {
  if (!runtime.graph.handlers.some(handler => handler.event === 'onTick')) {
    return () => undefined;
  }
  let previous = performance.now();
  let frame = 0;
  const loop = (now: number) => {
    if (options.paused?.() !== true) {
      runtime.tick(Math.min((now - previous) / 1000, LONGEST_TICK));
    }
    previous = now;
    frame = window.requestAnimationFrame(loop);
  };
  frame = window.requestAnimationFrame(loop);
  return () => window.cancelAnimationFrame(frame);
}

export function connectInteraction(
  viewer: Viewer,
  runtime: BindingRuntime,
  options: InteractionOptions = {},
): () => void {
  const session: Session = { active: null, hovered: null, swallowClick: false };
  const wiring: Wiring = { runtime, svg: viewer.svg, options, session };
  const listeners: Array<[string, (event: never) => void]> = [
    ['click', (event: MouseEvent) => swallowClick(session, event)],
    ['pointerdown', (event: PointerEvent) => pressStart(wiring, event)],
    ['pointermove', (event: PointerEvent) => pressMove(wiring, event)],
    ['pointerup', (event: PointerEvent) => pressEnd(wiring, event, true)],
    ['pointercancel', (event: PointerEvent) => pressEnd(wiring, event, false)],
  ];
  for (const [type, listener] of listeners) {
    window.addEventListener(type, listener as EventListener, true);
  }
  const disconnectKeyboard = connectKeyboard(viewer, runtime, options);
  const stopTicks = startTicks(runtime, options);

  return () => {
    for (const [type, listener] of listeners) {
      window.removeEventListener(type, listener as EventListener, true);
    }
    disconnectKeyboard();
    stopTicks();
    if (session.active) {
      runtime.release(session.active, false);
    }
    if (session.hovered) {
      runtime.setElementState(session.hovered, { hovered: false });
    }
  };
}
