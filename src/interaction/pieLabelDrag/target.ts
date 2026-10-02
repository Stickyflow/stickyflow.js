import { isCameraGesture, pointerUserPoint, resolveOwner } from '../../domContract';
import { LABEL_WIDTH, LEADER_INSET } from '../../renderScene/charts/renderers/pie/labels';
import { readPieGeometry } from '../pieGeometry';
import type { PieLabelDragState } from './types';

const LABEL_MARKS = ['pie-label', 'polar-area-label'];
const TICK_MARKS: Record<string, string> = {
  'pie-label': 'pie-label-tick',
  'polar-area-label': 'polar-area-label-tick',
};

function findLabelMark(event: PointerEvent): SVGGraphicsElement | null {
  const selector = LABEL_MARKS.map(mark => `[data-sf-mark="${mark}"]`).join(', ');
  return (event.target as Element | null)?.closest?.(selector) as SVGGraphicsElement | null;
}

function isLabelPointer(event: PointerEvent): boolean {
  return event.button === 0 && !isCameraGesture(event);
}

function findLabelSiblings(svg: SVGSVGElement, ownerId: string, seriesId: string, mark: string): SVGGraphicsElement[] {
  const selector = `[data-sf-id="${CSS.escape(ownerId)}"][data-sf-series="${CSS.escape(seriesId)}"][data-sf-mark="${mark}"]`;
  return [...svg.querySelectorAll<SVGGraphicsElement>(selector)];
}

function findTickElement(
  svg: SVGSVGElement,
  ownerId: string,
  seriesId: string,
  tickMark: string,
): SVGGraphicsElement | null {
  const selector = `[data-sf-id="${CSS.escape(ownerId)}"][data-sf-series="${CSS.escape(seriesId)}"][data-sf-mark="${tickMark}"]`;
  return svg.querySelector<SVGGraphicsElement>(selector);
}

function combinedCenter(elements: SVGGraphicsElement[]): { x: number; y: number } {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const element of elements) {
    const box = element.getBBox();
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
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
  const midAngle = Number(clicked.getAttribute('data-sf-pie-mid-angle'));
  if (!Number.isFinite(midAngle)) {
    return null;
  }
  const geometry = readPieGeometry(svg, owner.id);
  if (!geometry) {
    return null;
  }
  const explicitRadius = Number(clicked.getAttribute('data-sf-pie-wedge-radius'));
  const outerRadius = Number.isFinite(explicitRadius) ? explicitRadius : geometry.outerRadius;
  const start = pointerUserPoint(svg, event);
  if (!start) {
    return null;
  }
  const mark = clicked.getAttribute('data-sf-mark') ?? 'pie-label';
  const labelElements = findLabelSiblings(svg, owner.id, seriesId, mark);
  if (!labelElements.length) {
    return null;
  }
  const fontSize = Number.parseFloat(clicked.getAttribute('font-size') ?? '12') || 12;
  const { x: restX, y: restY } = combinedCenter(labelElements);
  const tickElement = findTickElement(svg, owner.id, seriesId, TICK_MARKS[mark] ?? 'pie-label-tick');
  clicked.setPointerCapture?.(event.pointerId);
  return {
    owner,
    pointerId: event.pointerId,
    seriesId,
    centerX: geometry.centerX,
    centerY: geometry.centerY,
    outerRadius,
    anchorX: geometry.centerX + outerRadius * Math.cos(midAngle),
    anchorY: geometry.centerY + outerRadius * Math.sin(midAngle),
    tickStartX: geometry.centerX + (outerRadius + LEADER_INSET) * Math.cos(midAngle),
    tickStartY: geometry.centerY + (outerRadius + LEADER_INSET) * Math.sin(midAngle),
    restX,
    restY,
    startX: start.x,
    startY: start.y,
    halfWidth: LABEL_WIDTH / 2,
    halfHeight: fontSize * 1.2,
    moved: false,
    lastDx: 0,
    lastDy: 0,
    labelElements,
    tickElement,
    tickOriginalD: tickElement?.getAttribute('d') ?? null,
    tickOriginalStroke: tickElement?.getAttribute('stroke') ?? null,
    tickOriginalStrokeWidth: tickElement?.getAttribute('stroke-width') ?? null,
  };
}
