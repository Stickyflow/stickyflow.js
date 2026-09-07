import { findOwnerNode, isCameraGesture, isPrimary, pointerUserPoint, resolveOwner } from '../../domContract';
import { type PieSliceInfo, resolvePieBoundary } from './boundary';
import type { PieSliceDragState } from './types';

interface PieGeometry {
  centerX: number;
  centerY: number;
  outerRadius: number;
  innerRadius: number;
}

function parsePieGeometry(node: SVGGraphicsElement | null): PieGeometry | null {
  const raw = node?.getAttribute('data-sf-pie-geometry');
  if (!raw) {
    return null;
  }
  const [centerX, centerY, outerRadius, innerRadius] = raw.split(',').map(Number);
  return [centerX, centerY, outerRadius, innerRadius].every(Number.isFinite)
    ? { centerX, centerY, outerRadius, innerRadius }
    : null;
}

function findSliceMark(event: PointerEvent): SVGGraphicsElement | null {
  return (event.target as Element | null)?.closest?.('[data-sf-mark="pie-slice"]') as SVGGraphicsElement | null;
}

function pieSlices(svg: SVGSVGElement, ownerId: string): SVGGraphicsElement[] {
  const selector = `[data-sf-id="${CSS.escape(ownerId)}"][data-sf-mark="pie-slice"]`;
  return [...svg.querySelectorAll<SVGGraphicsElement>(selector)].sort(
    (a, b) => Number(a.getAttribute('data-sf-pie-start')) - Number(b.getAttribute('data-sf-pie-start')),
  );
}

function sliceInfo(element: SVGGraphicsElement): PieSliceInfo | null {
  const seriesId = element.getAttribute('data-sf-series');
  const start = Number(element.getAttribute('data-sf-pie-start'));
  const end = Number(element.getAttribute('data-sf-pie-end'));
  const value = Number(element.getAttribute('data-sf-pie-value'));
  if (!seriesId || ![start, end, value].every(Number.isFinite)) {
    return null;
  }
  return { seriesId, start, end, value };
}

export function pointerAngle(
  svg: SVGSVGElement,
  event: PointerEvent,
  center: { centerX: number; centerY: number },
): number | null {
  const point = pointerUserPoint(svg, event);
  if (!point) {
    return null;
  }
  return Math.atan2(point.y - center.centerY, point.x - center.centerX);
}

function isPieSlicePointer(event: PointerEvent): boolean {
  return event.button === 0 && !isCameraGesture(event);
}

export function resolvePieSliceDrag(svg: SVGSVGElement, event: PointerEvent): PieSliceDragState | null {
  if (!isPieSlicePointer(event)) {
    return null;
  }
  const clickedElement = findSliceMark(event);
  if (!clickedElement) {
    return null;
  }
  const owner = resolveOwner(clickedElement);
  if (owner?.role !== 'chart') {
    return null;
  }
  const geometry = parsePieGeometry(findOwnerNode(svg, owner.id, isPrimary));
  if (!geometry) {
    return null;
  }
  const elements = pieSlices(svg, owner.id);
  const slices = elements.map(sliceInfo);
  if (slices.some(slice => slice === null)) {
    return null;
  }
  const clickedIndex = elements.indexOf(clickedElement);
  const angle = pointerAngle(svg, event, geometry);
  if (clickedIndex === -1 || angle === null) {
    return null;
  }
  const boundary = resolvePieBoundary(slices as PieSliceInfo[], clickedIndex, angle);
  if (!boundary) {
    return null;
  }
  const beforeElement = elements.find(el => el.getAttribute('data-sf-series') === boundary.before.seriesId);
  const afterElement = elements.find(el => el.getAttribute('data-sf-series') === boundary.after.seriesId);
  if (!beforeElement || !afterElement) {
    return null;
  }
  clickedElement.setPointerCapture?.(event.pointerId);
  return {
    owner,
    pointerId: event.pointerId,
    moved: false,
    centerX: geometry.centerX,
    centerY: geometry.centerY,
    boundary,
    beforeElement,
    afterElement,
    outerRadius: geometry.outerRadius,
    innerRadius: geometry.innerRadius,
    total: (slices as PieSliceInfo[]).reduce((sum, slice) => sum + slice.value, 0),
  };
}
