import { clipSegmentToRect } from '../../../renderScene/charts/primitives';
import type { PieLabelDragState } from './types';

const PREVIEW_TICK_COLOR = '#334155';
const PREVIEW_TICK_STROKE_WIDTH = '1.5';

export function updatePieLabelDragPreview(drag: PieLabelDragState, dx: number, dy: number): void {
  for (const element of drag.labelElements) {
    element.setAttribute('transform', `translate(${dx}, ${dy})`);
  }
  if (!drag.tickElement) {
    return;
  }
  const from = { x: drag.tickStartX, y: drag.tickStartY };
  const to = { x: drag.restX + dx, y: drag.restY + dy };
  const clipped = clipSegmentToRect(from, to, drag.halfWidth, drag.halfHeight);
  drag.tickElement.setAttribute('d', `M ${from.x} ${from.y} L ${clipped.x} ${clipped.y}`);
  drag.tickElement.setAttribute('stroke', PREVIEW_TICK_COLOR);
  drag.tickElement.setAttribute('stroke-width', PREVIEW_TICK_STROKE_WIDTH);
}

export function clearPieLabelDragPreview(drag: PieLabelDragState): void {
  for (const element of drag.labelElements) {
    element.removeAttribute('transform');
  }
  if (!drag.tickElement) {
    return;
  }
  restoreAttribute(drag.tickElement, 'd', drag.tickOriginalD);
  restoreAttribute(drag.tickElement, 'stroke', drag.tickOriginalStroke);
  restoreAttribute(drag.tickElement, 'stroke-width', drag.tickOriginalStrokeWidth);
}

function restoreAttribute(element: SVGGraphicsElement, name: string, value: string | null): void {
  if (value === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, value);
  }
}
