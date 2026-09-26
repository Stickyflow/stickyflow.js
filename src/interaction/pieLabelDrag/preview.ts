import type { PieLabelDragState } from './types';

export function updatePieLabelDragPreview(drag: PieLabelDragState, dx: number, dy: number): void {
  for (const element of drag.labelElements) {
    element.setAttribute('transform', `translate(${dx}, ${dy})`);
  }
}

export function clearPieLabelDragPreview(drag: PieLabelDragState): void {
  for (const element of drag.labelElements) {
    element.removeAttribute('transform');
  }
}
