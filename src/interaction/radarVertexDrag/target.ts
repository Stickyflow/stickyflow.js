import { findOwnerNode, isCameraGesture, isPrimary, resolveOwner } from '../../domContract';
import type { RadarFrame } from '../../rendering/charts/primitives/radarShape';
import type { RadarVertexDragState } from './types';

function parseRadarFrame(node: SVGGraphicsElement | null): RadarFrame | null {
  const raw = node?.getAttribute('data-sf-radar-geometry');
  if (!raw) {
    return null;
  }
  const [centerX, centerY, radius, min, max, count, curved] = raw.split(',').map(Number);
  if (![centerX, centerY, radius, min, max, count].every(Number.isFinite) || count < 3 || max === min) {
    return null;
  }
  return { centerX, centerY, radius, min, max, count, curved: curved === 1 };
}

function findVertex(event: PointerEvent): SVGGraphicsElement | null {
  return (event.target as Element | null)?.closest?.('[data-sf-mark="radar-vertex"]') as SVGGraphicsElement | null;
}

function isVertexPointer(event: PointerEvent): boolean {
  return event.button === 0 && !isCameraGesture(event);
}

export function resolveRadarVertexDrag(svg: SVGSVGElement, event: PointerEvent): RadarVertexDragState | null {
  if (!isVertexPointer(event)) {
    return null;
  }
  const element = findVertex(event);
  if (!element) {
    return null;
  }
  const owner = resolveOwner(element);
  if (owner?.role !== 'chart') {
    return null;
  }
  const series = element.getAttribute('data-sf-series');
  const index = Number(element.getAttribute('data-sf-value-index'));
  if (!series || !Number.isInteger(index) || index < 0) {
    return null;
  }
  const frame = parseRadarFrame(findOwnerNode(svg, owner.id, isPrimary));
  if (!frame || index >= frame.count) {
    return null;
  }
  element.setPointerCapture?.(event.pointerId);
  return { owner, series, index, pointerId: event.pointerId, moved: false, frame, element, lastValue: null };
}
