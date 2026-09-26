import type { PieLabelDragState } from './types';

export function updatePieLabelDragPreview(drag: PieLabelDragState, dx: number, dy: number): void {
  drag.labelElement.setAttribute('transform', `translate(${dx}, ${dy})`);
}

export function clearPieLabelDragPreview(drag: PieLabelDragState): void {
  drag.labelElement.removeAttribute('transform');
}
