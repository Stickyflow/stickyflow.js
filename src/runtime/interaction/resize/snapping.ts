import type { Rect } from '../../../model/geometry/types';
import type { GuideLine } from '../../dom';
import { findSnapCandidateBounds, pxPerUnit } from '../../dom';
import { hasDerivedHeight } from '../geometryRoles';
import { applyAxisSnap, computeSnap, nearestCandidates, resizeActivePoints } from '../snapGeometry';
import { isSnapDisabled, snapDistancePx } from '../snapGrid';
import { HANDLE_AXES, keepTextInside, lockDerivedHeight, MIN_SIZE, resizedBounds } from './geometry';
import type { ResizeDragState } from './state';

const GUIDE_OVERHANG = 10;

export function snapResize(
  svg: SVGSVGElement,
  drag: ResizeDragState,
  pointer: { x: number; y: number },
): { bounds: Rect; guides: GuideLine[] } {
  const proposed = resizedBounds(drag.startBounds, drag.handle, pointer);
  if (isSnapDisabled(svg)) {
    return {
      bounds: keepTextInside(
        lockDerivedHeight(proposed, drag.startBounds, hasDerivedHeight(drag.owner)),
        drag.startBounds,
        drag.handle,
        drag.textFit,
      ),
      guides: [],
    };
  }
  const axes = HANDLE_AXES[drag.handle];
  const candidates = nearestCandidates(proposed, findSnapCandidateBounds(svg, new Set([drag.owner.id])));
  const snap = computeSnap(proposed, candidates, {
    threshold: snapDistancePx(svg) / pxPerUnit(svg),
    activeX: resizeActivePoints(axes.x),
    activeY: resizeActivePoints(axes.y),
    guideOverhang: GUIDE_OVERHANG,
  });

  const snapped = applyAxisSnap(proposed, axes.x, axes.y, snap, MIN_SIZE);
  return {
    bounds: keepTextInside(
      lockDerivedHeight(snapped, drag.startBounds, hasDerivedHeight(drag.owner)),
      drag.startBounds,
      drag.handle,
      drag.textFit,
    ),
    guides: [snap.x.guide, snap.y.guide].filter(guide => guide !== null),
  };
}
