import type { GuideLine } from '../../domContract';
import { findSnapCandidateBounds, pxPerUnit } from '../../domContract';
import type { Rect } from '../../model/geometry/router';
import { applyAxisSnap, computeSnap, nearestCandidates, resizeActivePoints } from '../snapGeometry';
import { HANDLE_AXES, MIN_SIZE, resizedBounds } from './geometry';
import type { ResizeDragState } from './state';

const SNAP_THRESHOLD_PX = 20;
const GUIDE_OVERHANG = 10;

export function snapResize(
  svg: SVGSVGElement,
  drag: ResizeDragState,
  pointer: { x: number; y: number },
): { bounds: Rect; guides: GuideLine[] } {
  const proposed = resizedBounds(drag.startBounds, drag.handle, pointer);
  const axes = HANDLE_AXES[drag.handle];
  const candidates = nearestCandidates(proposed, findSnapCandidateBounds(svg, new Set([drag.owner.id])));
  const snap = computeSnap(proposed, candidates, {
    threshold: SNAP_THRESHOLD_PX / pxPerUnit(svg),
    activeX: resizeActivePoints(axes.x),
    activeY: resizeActivePoints(axes.y),
    guideOverhang: GUIDE_OVERHANG,
  });

  return {
    bounds: applyAxisSnap(proposed, axes.x, axes.y, snap, MIN_SIZE),
    guides: [snap.x.guide, snap.y.guide].filter((guide): guide is GuideLine => guide !== null),
  };
}
