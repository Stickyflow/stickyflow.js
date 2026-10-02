import type { Emitter } from '../events';
import { clampMoveDelta } from './geometry';
import { movePointerDelta } from './pointer';
import { snapMove } from './snapping';
import type { MoveDragState } from './state';

export function emitMoveCompletion(
  svg: SVGSVGElement,
  emitter: Emitter,
  drag: MoveDragState,
  event: PointerEvent,
): void {
  if (!drag.moved) {
    return;
  }

  const rawDelta = movePointerDelta(svg, drag, event);
  const snapped = snapMove(svg, drag, rawDelta.dx, rawDelta.dy);
  const { dx, dy } = clampMoveDelta(drag.entities, snapped.dx, snapped.dy);
  for (const entity of drag.entities) {
    emitter.emit('moveChange', { owner: entity.owner, dx, dy });
  }
}
