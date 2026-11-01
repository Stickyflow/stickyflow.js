import { PATH_POINT_INDEX_ATTR, PATH_POINT_SELECTED_ATTR } from '../../../svg/domContract/attributes';
import type { OwnerRef } from '../../viewer';
import { resolvePathReshapeTarget } from './target';

export interface PathReshapeDragState {
  owner: OwnerRef;
  pathNode: SVGPathElement;
  handle: Element;
  overlay: Element | null;
  pointIndex: number;
  inserted: boolean;
  points: Array<[number, number]>;
  tension: number;
  closed: boolean;
  cornerRadii: number[];
  pointerId: number;
  startScreen: { x: number; y: number };
  moved: boolean;
  // The other picked points, which move along when a picked point is dragged.
  together: number[];
}

export function createPathReshapeDragState(svg: SVGSVGElement, event: PointerEvent): PathReshapeDragState | null {
  const target = resolvePathReshapeTarget(svg, event);
  if (!target) {
    return null;
  }

  (target.handle as SVGGraphicsElement & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(
    event.pointerId,
  );
  const overlay = target.handle.closest('[data-sf-selection-overlay]');
  return {
    ...target,
    overlay,
    pointerId: event.pointerId,
    startScreen: { x: event.clientX, y: event.clientY },
    moved: false,
    together: target.handle.hasAttribute(PATH_POINT_SELECTED_ATTR)
      ? [...(overlay?.querySelectorAll(`[${PATH_POINT_SELECTED_ATTR}]`) ?? [])]
          .map(handle => Number(handle.getAttribute(PATH_POINT_INDEX_ATTR)))
          .filter(index => index !== target.pointIndex)
      : [],
  };
}
