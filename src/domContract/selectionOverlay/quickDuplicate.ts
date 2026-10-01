import { symbolDeclaredBounds } from '../contract';
import { selectionOverlayGroup, svgElement } from './dom';
import { screenPx } from './scale';
import type { OverlayBounds, QuickDuplicateDirection } from './types';

const BUBBLE_RADIUS_PX = 8;
const BUBBLE_MARGIN_PX = 15;
const PLUS_HALF_SIZE_PX = 4;
const BUBBLE_STROKE_WIDTH_PX = 1.5;

function quickDuplicatePositions(
  bounds: OverlayBounds,
  offset: number,
): Array<[number, number, QuickDuplicateDirection]> {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return [
    [centerX, bounds.y - offset, 'top'],
    [bounds.x + bounds.width + offset, centerY, 'right'],
    [centerX, bounds.y + bounds.height + offset, 'bottom'],
    [bounds.x - offset, centerY, 'left'],
  ];
}

function plusPath(x: number, y: number, halfSize: number): string {
  return `M ${x - halfSize} ${y} L ${x + halfSize} ${y} M ${x} ${y - halfSize} L ${x} ${y + halfSize}`;
}

function duplicateBubble(
  document: Document,
  x: number,
  y: number,
  radius: number,
  strokeWidth: number,
  direction: QuickDuplicateDirection,
): SVGCircleElement {
  const bubble = svgElement(document, 'circle');
  bubble.setAttribute('cx', String(x));
  bubble.setAttribute('cy', String(y));
  bubble.setAttribute('r', String(radius));
  bubble.setAttribute('fill', '#e8e8e8');
  bubble.setAttribute('stroke', '#ccc');
  bubble.setAttribute('stroke-width', String(strokeWidth));
  bubble.setAttribute('data-sf-quick-duplicate', direction);
  bubble.style.pointerEvents = 'auto';
  bubble.style.cursor = 'pointer';
  return bubble;
}

function duplicatePlus(
  document: Document,
  x: number,
  y: number,
  halfSize: number,
  strokeWidth: number,
): SVGPathElement {
  const plus = svgElement(document, 'path');
  plus.setAttribute('d', plusPath(x, y, halfSize));
  plus.setAttribute('stroke', '#999');
  plus.setAttribute('stroke-width', String(strokeWidth));
  plus.setAttribute('stroke-linecap', 'round');
  return plus;
}

export function quickDuplicateBubbles(
  document: Document,
  primary: SVGGraphicsElement,
  id: string,
  svg: SVGSVGElement,
): SVGGElement {
  const group = selectionOverlayGroup(document, id, primary);
  const radius = screenPx(svg, BUBBLE_RADIUS_PX);
  const offset = radius + screenPx(svg, BUBBLE_MARGIN_PX);
  const halfSize = screenPx(svg, PLUS_HALF_SIZE_PX);
  const strokeWidth = screenPx(svg, BUBBLE_STROKE_WIDTH_PX);
  const bounds = symbolDeclaredBounds(primary) ?? primary.getBBox();
  for (const [x, y, direction] of quickDuplicatePositions(bounds, offset)) {
    group.append(
      duplicateBubble(document, x, y, radius, strokeWidth, direction),
      duplicatePlus(document, x, y, halfSize, strokeWidth),
    );
  }
  return group;
}

export function updateQuickDuplicateBubbles(group: SVGGElement, bounds: OverlayBounds): void {
  const bubbles = group.querySelectorAll('circle[data-sf-quick-duplicate]');
  const firstRadius = Number(bubbles[0]?.getAttribute('r')) || BUBBLE_RADIUS_PX;
  const offset = firstRadius * ((BUBBLE_RADIUS_PX + BUBBLE_MARGIN_PX) / BUBBLE_RADIUS_PX);
  const halfSize = firstRadius * (PLUS_HALF_SIZE_PX / BUBBLE_RADIUS_PX);
  for (const [index, [x, y]] of quickDuplicatePositions(bounds, offset).entries()) {
    const bubble = bubbles[index];
    if (!bubble) {
      continue;
    }
    bubble.setAttribute('cx', String(x));
    bubble.setAttribute('cy', String(y));
    const plus = bubble.nextElementSibling;
    if (plus) {
      plus.setAttribute('d', plusPath(x, y, halfSize));
    }
  }
}
