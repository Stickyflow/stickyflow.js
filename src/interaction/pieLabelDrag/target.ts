import { isCameraGesture, pointerUserPoint, resolveOwner } from '../../domContract';
import { readPieGeometry } from '../pieGeometry';
import type { PieLabelDragState } from './types';

function findLabelMark(event: PointerEvent): SVGGraphicsElement | null {
  return (event.target as Element | null)?.closest?.('[data-sf-mark="pie-label"]') as SVGGraphicsElement | null;
}

function isLabelPointer(event: PointerEvent): boolean {
  return event.button === 0 && !isCameraGesture(event);
}

export function resolvePieLabelDrag(svg: SVGSVGElement, event: PointerEvent): PieLabelDragState | null {
  if (!isLabelPointer(event)) {
    return null;
  }
  const clicked = findLabelMark(event);
  if (!clicked) {
    return null;
  }
  const owner = resolveOwner(clicked);
  if (owner?.role !== 'chart') {
    return null;
  }
  const seriesId = clicked.getAttribute('data-sf-series');
  if (!seriesId) {
    return null;
  }
  const geometry = readPieGeometry(svg, owner.id);
  if (!geometry) {
    return null;
  }
  const start = pointerUserPoint(svg, event);
  if (!start) {
    return null;
  }
  clicked.setPointerCapture?.(event.pointerId);
  return {
    owner,
    pointerId: event.pointerId,
    seriesId,
    centerX: geometry.centerX,
    centerY: geometry.centerY,
    outerRadius: geometry.outerRadius,
    startX: start.x,
    startY: start.y,
    moved: false,
    pulled: false,
    labelElement: clicked,
  };
}
