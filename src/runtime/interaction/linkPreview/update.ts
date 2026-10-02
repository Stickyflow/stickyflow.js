import type { Rect } from '../../../model/geometry/types';
import { labelGapDash } from '../../../renderScene/entities/link/geometry';
import { previewPathData, routePreviewLink } from './geometry';
import type { LiveLink } from './types';

function updateLabelPosition(link: LiveLink, midpoint: { x: number; y: number }): void {
  if (!link.labelText || !link.initialMidpoint) {
    return;
  }
  const dx = midpoint.x - link.initialMidpoint.x;
  const dy = midpoint.y - link.initialMidpoint.y;
  link.labelText.setAttribute('transform', `translate(${dx} ${dy})`);
}

function updateLabelGap(link: LiveLink, points: number[]): void {
  if (!link.labelGapSize) {
    return;
  }
  const gap = labelGapDash(points, link.pathType, link.labelGapSize.width, link.labelGapSize.height);
  if (gap) {
    link.path.setAttribute('stroke-dasharray', `${gap.dashBefore} ${gap.gapLength} 1000000`);
  } else {
    link.path.removeAttribute('stroke-dasharray');
  }
}

function updateLiveLink(link: LiveLink, draggedBounds: Rect): void {
  const fromBounds = link.draggedIsFrom ? draggedBounds : link.otherBounds;
  const toBounds = link.draggedIsFrom ? link.otherBounds : draggedBounds;
  const { points, segments, midpoint } = routePreviewLink(
    fromBounds,
    toBounds,
    link.fromSide,
    link.toSide,
    link.pathType,
  );
  link.path.setAttribute('d', previewPathData(points, segments, link.pathType, link.strokeWidth));
  updateLabelPosition(link, midpoint);
  updateLabelGap(link, points);
}

export function updateLiveLinks(liveLinks: LiveLink[], draggedBounds: Rect): void {
  for (const link of liveLinks) {
    updateLiveLink(link, draggedBounds);
  }
}
