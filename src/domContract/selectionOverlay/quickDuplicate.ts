import { selectionOverlayGroup, svgElement } from './dom';
import type { OverlayBounds, QuickDuplicateDirection } from './types';

const BUBBLE_RADIUS = 8;
const BUBBLE_OFFSET = BUBBLE_RADIUS + 15;
const PLUS_HALF_SIZE = 4;

function quickDuplicatePositions(bounds: OverlayBounds): Array<[number, number, QuickDuplicateDirection]> {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return [
    [centerX, bounds.y - BUBBLE_OFFSET, 'top'],
    [bounds.x + bounds.width + BUBBLE_OFFSET, centerY, 'right'],
    [centerX, bounds.y + bounds.height + BUBBLE_OFFSET, 'bottom'],
    [bounds.x - BUBBLE_OFFSET, centerY, 'left'],
  ];
}

function plusPath(x: number, y: number): string {
  return `M ${x - PLUS_HALF_SIZE} ${y} L ${x + PLUS_HALF_SIZE} ${y} M ${x} ${y - PLUS_HALF_SIZE} L ${x} ${y + PLUS_HALF_SIZE}`;
}

function duplicateBubble(
  document: Document,
  x: number,
  y: number,
  direction: QuickDuplicateDirection,
): SVGCircleElement {
  const bubble = svgElement(document, 'circle');
  bubble.setAttribute('cx', String(x));
  bubble.setAttribute('cy', String(y));
  bubble.setAttribute('r', String(BUBBLE_RADIUS));
  bubble.setAttribute('fill', '#e8e8e8');
  bubble.setAttribute('stroke', '#ccc');
  bubble.setAttribute('stroke-width', '1.5');
  bubble.setAttribute('data-sf-quick-duplicate', direction);
  bubble.style.pointerEvents = 'auto';
  bubble.style.cursor = 'pointer';
  return bubble;
}

function duplicatePlus(document: Document, x: number, y: number): SVGPathElement {
  const plus = svgElement(document, 'path');
  plus.setAttribute('d', plusPath(x, y));
  plus.setAttribute('stroke', '#999');
  plus.setAttribute('stroke-width', '1.5');
  plus.setAttribute('stroke-linecap', 'round');
  return plus;
}

export function quickDuplicateBubbles(document: Document, primary: SVGGraphicsElement, id: string): SVGGElement {
  const group = selectionOverlayGroup(document, id, primary);
  for (const [x, y, direction] of quickDuplicatePositions(primary.getBBox())) {
    group.append(duplicateBubble(document, x, y, direction), duplicatePlus(document, x, y));
  }
  return group;
}

export function updateQuickDuplicateBubbles(group: SVGGElement, bounds: OverlayBounds): void {
  const bubbles = group.querySelectorAll('circle[data-sf-quick-duplicate]');
  for (const [index, [x, y]] of quickDuplicatePositions(bounds).entries()) {
    const bubble = bubbles[index];
    if (!bubble) {
      continue;
    }
    bubble.setAttribute('cx', String(x));
    bubble.setAttribute('cy', String(y));
    const plus = bubble.nextElementSibling;
    if (plus) {
      plus.setAttribute('d', plusPath(x, y));
    }
  }
}
