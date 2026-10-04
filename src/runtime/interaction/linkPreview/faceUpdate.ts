import { isometricFaceCenter } from '../../../model/isometricObject';
import type { LiveFaceLink } from './types';

type IsometricObjectSize = Parameters<typeof isometricFaceCenter>[0];

function updateLiveFaceLink(link: LiveFaceLink, liveObject: IsometricObjectSize): void {
  const draggedPoint = isometricFaceCenter(liveObject, link.face);
  const from = link.draggedIsFrom ? draggedPoint : link.otherPoint;
  const to = link.draggedIsFrom ? link.otherPoint : draggedPoint;
  link.path.setAttribute('d', `M ${from.x} ${from.y} L ${to.x} ${to.y}`);
}

export function updateLiveFaceLinks(links: LiveFaceLink[], liveObject: IsometricObjectSize): void {
  for (const link of links) {
    updateLiveFaceLink(link, liveObject);
  }
}
