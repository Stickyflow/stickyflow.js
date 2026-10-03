import type { IsometricLabelDragState } from './types';

export function updateIsometricLabelDragPreview(drag: IsometricLabelDragState, dx: number, dy: number): void {
  for (const element of drag.labelElements) {
    element.setAttribute('transform', `translate(${dx}, ${dy})`);
  }
  if (!drag.guideElement) {
    return;
  }
  drag.guideElement.setAttribute('d', `M ${drag.anchorX} ${drag.anchorY} L ${drag.restX + dx} ${drag.restY + dy}`);
}

export function clearIsometricLabelDragPreview(drag: IsometricLabelDragState): void {
  for (const element of drag.labelElements) {
    element.removeAttribute('transform');
  }
  if (!drag.guideElement) {
    return;
  }
  if (drag.guideOriginalD === null) {
    drag.guideElement.removeAttribute('d');
  } else {
    drag.guideElement.setAttribute('d', drag.guideOriginalD);
  }
}
