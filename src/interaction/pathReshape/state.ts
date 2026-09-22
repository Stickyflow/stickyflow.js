import type { OwnerRef } from '../../viewer';
import { resolvePathReshapeTarget } from './target';

export interface PathReshapeDragState {
  owner: OwnerRef;
  pathNode: SVGPathElement;
  handle: Element;
  overlay: Element | null;
  pointIndex: number;
  points: Array<[number, number]>;
  tension: number;
  closed: boolean;
  pointerId: number;
  startScreen: { x: number; y: number };
  moved: boolean;
}

export function createPathReshapeDragState(svg: SVGSVGElement, event: PointerEvent): PathReshapeDragState | null {
  const target = resolvePathReshapeTarget(svg, event);
  if (!target) {
    return null;
  }

  (target.handle as SVGGraphicsElement & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(
    event.pointerId,
  );
  return {
    ...target,
    overlay: target.handle.closest('[data-sf-selection-overlay]'),
    pointerId: event.pointerId,
    startScreen: { x: event.clientX, y: event.clientY },
    moved: false,
  };
}
