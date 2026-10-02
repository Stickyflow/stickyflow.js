import type { GuideLine } from '../../dom';
import { findSnapCandidateBounds, pxPerUnit } from '../../dom';
import { computeSnap, MOVE_ACTIVE_POINTS, nearestCandidates } from '../snapGeometry';
import { offsetBounds } from './geometry';
import type { MoveDragState } from './state';

const SNAP_THRESHOLD_PX = 20;
const GUIDE_OVERHANG = 10;

export interface MoveDelta {
  dx: number;
  dy: number;
  guides: GuideLine[];
}

export function snapMove(svg: SVGSVGElement, drag: MoveDragState, rawDx: number, rawDy: number): MoveDelta {
  const leadBounds = offsetBounds(drag.entities[0].draggedBounds, rawDx, rawDy);
  const excludedIds = new Set(drag.entities.map(entity => entity.owner.id));
  const candidates = nearestCandidates(leadBounds, findSnapCandidateBounds(svg, excludedIds));
  const snap = computeSnap(leadBounds, candidates, {
    threshold: SNAP_THRESHOLD_PX / pxPerUnit(svg),
    activeX: MOVE_ACTIVE_POINTS,
    activeY: MOVE_ACTIVE_POINTS,
    guideOverhang: GUIDE_OVERHANG,
  });
  return {
    dx: rawDx + snap.x.delta,
    dy: rawDy + snap.y.delta,
    guides: [snap.x.guide, snap.y.guide].filter((guide): guide is GuideLine => guide !== null),
  };
}
