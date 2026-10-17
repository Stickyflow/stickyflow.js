import { symbolDeclaredBounds } from '../contract';
import { selectionOverlayGroup, svgElement } from './dom';
import { screenPx } from './scale';
import type { OverlayBounds, QuickDuplicateDirection } from './types';

export const BUBBLE_RADIUS_PX = 6;
const BUBBLE_MARGIN_PX = 14;
export const PLUS_HALF_SIZE_PX = 3;
export const BUBBLE_STROKE_WIDTH_PX = 1.5;

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

export function plusPath(x: number, y: number, halfSize: number): string {
  return `M ${x - halfSize} ${y} L ${x + halfSize} ${y} M ${x} ${y - halfSize} L ${x} ${y + halfSize}`;
}

const BUBBLE_FILL = '#e8e8e8';
const BUBBLE_STROKE = '#ccc';
const BUBBLE_HOVER_FILL = '#9b42df';
const BUBBLE_HOVER_STROKE = '#7c2fb5';
const BUBBLE_HOVER_SCALE = 1.2;

export function duplicateBubble(
  document: Document,
  x: number,
  y: number,
  radius: number,
  strokeWidth: number,
  direction: string,
): SVGCircleElement {
  const bubble = svgElement(document, 'circle');
  bubble.setAttribute('cx', String(x));
  bubble.setAttribute('cy', String(y));
  bubble.setAttribute('r', String(radius));
  bubble.setAttribute('fill', BUBBLE_FILL);
  bubble.setAttribute('stroke', BUBBLE_STROKE);
  bubble.setAttribute('stroke-width', String(strokeWidth));
  bubble.setAttribute('data-sf-quick-duplicate', direction);
  bubble.style.pointerEvents = 'auto';
  bubble.style.cursor = 'pointer';
  bubble.style.transition = 'r 120ms ease, fill 120ms ease, stroke 120ms ease';
  bubble.addEventListener('pointerenter', () => {
    bubble.setAttribute('r', String(radius * BUBBLE_HOVER_SCALE));
    bubble.setAttribute('fill', BUBBLE_HOVER_FILL);
    bubble.setAttribute('stroke', BUBBLE_HOVER_STROKE);
    const plus = bubble.nextElementSibling;
    plus?.setAttribute('stroke', '#ffffff');
  });
  bubble.addEventListener('pointerleave', () => {
    bubble.setAttribute('r', String(radius));
    bubble.setAttribute('fill', BUBBLE_FILL);
    bubble.setAttribute('stroke', BUBBLE_STROKE);
    const plus = bubble.nextElementSibling;
    plus?.setAttribute('stroke', '#999');
  });
  return bubble;
}

export function duplicatePlus(
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
