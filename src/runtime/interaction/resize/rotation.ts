import type { Rect } from '../../../model/geometry/types';

export function recenterRotation(element: SVGGraphicsElement, bounds: Rect): void {
  const transform = element.getAttribute('transform');
  const rotation = transform && /rotate\(([-\d.]+)/.exec(transform);
  if (!rotation) {
    return;
  }

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  element.setAttribute('transform', `rotate(${rotation[1]} ${centerX} ${centerY})`);
}
