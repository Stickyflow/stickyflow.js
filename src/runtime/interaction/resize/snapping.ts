import type { Rect } from '../../../model/geometry/types';
import type { GuideLine } from '../../dom';
import { findSnapCandidateBounds, pxPerUnit } from '../../dom';
import { hasDerivedHeight } from '../geometryRoles';
import { applyAxisSnap, computeSnap, nearestCandidates, resizeActivePoints } from '../snapGeometry';
import { isSnapDisabled, nearestLine, readSquareSnapStep, snapDistancePx } from '../snapGrid';
import { HANDLE_AXES, keepTextInside, lockDerivedHeight, MIN_SIZE, resizedBounds } from './geometry';
import type { ResizeDragState } from './state';

const GUIDE_OVERHANG = 10;

// The edge that is dragged goes to the nearest line of the grid, unless another object holds it and is nearer.
function snapEdgesToGrid(
  bounds: Rect,
  axes: (typeof HANDLE_AXES)[keyof typeof HANDLE_AXES],
  step: number,
  heldX: boolean,
  heldY: boolean,
): Rect {
  const next = { ...bounds };
  if (!heldX && axes.x === 'left') {
    const left = nearestLine(next.x, step);
    if (next.x + next.width - left >= MIN_SIZE) {
      next.width += next.x - left;
      next.x = left;
    }
  } else if (!heldX && axes.x === 'right') {
    const width = nearestLine(next.x + next.width, step) - next.x;
    if (width >= MIN_SIZE) {
      next.width = width;
    }
  }
  if (!heldY && axes.y === 'top') {
    const top = nearestLine(next.y, step);
    if (next.y + next.height - top >= MIN_SIZE) {
      next.height += next.y - top;
      next.y = top;
    }
  } else if (!heldY && axes.y === 'bottom') {
    const height = nearestLine(next.y + next.height, step) - next.y;
    if (height >= MIN_SIZE) {
      next.height = height;
    }
  }
  return next;
}

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
  const found = computeSnap(proposed, candidates, {
    threshold: snapDistancePx(svg) / pxPerUnit(svg),
    activeX: resizeActivePoints(axes.x),
    activeY: resizeActivePoints(axes.y),
    guideOverhang: GUIDE_OVERHANG,
  });

  const step = readSquareSnapStep(svg);
  const nearer = <T extends { delta: number; guide: unknown }>(axis: T, edge: number): T =>
    step && axis.guide && Math.abs(axis.delta) > Math.abs(nearestLine(edge, step) - edge)
      ? { ...axis, delta: 0, guide: null }
      : axis;
  const snap = {
    x: nearer(found.x, axes.x === 'left' ? proposed.x : proposed.x + proposed.width),
    y: nearer(found.y, axes.y === 'top' ? proposed.y : proposed.y + proposed.height),
  };
  const held = applyAxisSnap(proposed, axes.x, axes.y, snap, MIN_SIZE);
  const snapped = step ? snapEdgesToGrid(held, axes, step, Boolean(snap.x.guide), Boolean(snap.y.guide)) : held;
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
