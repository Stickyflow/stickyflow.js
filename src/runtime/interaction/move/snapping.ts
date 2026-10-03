import { AXIS_COS } from '../../../model/isometricObject';
import type { GuideLine } from '../../dom';
import {
  findIsometricApexCandidates,
  findOwnerNode,
  findSnapCandidateBounds,
  isometricGeometryOf,
  isPrimary,
  pxPerUnit,
} from '../../dom';
import { computeSnap, MOVE_ACTIVE_POINTS, nearestCandidates, snapIsometricDiagonal } from '../snapGeometry';
import { offsetBounds } from './geometry';
import type { MoveDragState } from './state';

const SNAP_THRESHOLD_PX = 20;
const GUIDE_OVERHANG = 10;

export interface MoveDelta {
  dx: number;
  dy: number;
  guides: GuideLine[];
}

// Single isometric object, dragged alone: try snapping its apex onto the
// true-isometric diagonal through another isometric object's apex first -
// this is what actually lets two boxes land in the same "Flucht" instead of
// an eyeballed stagger. Multi-select or non-isometric drags skip straight
// to the regular horizontal/vertical bounds snap below.
function snapIsometricMove(svg: SVGSVGElement, drag: MoveDragState, rawDx: number, rawDy: number): MoveDelta | null {
  if (drag.canvasObjects.length !== 1) {
    return null;
  }
  const lead = drag.canvasObjects[0];
  if (lead.owner.role !== 'isometric') {
    return null;
  }
  const primary = findOwnerNode(svg, lead.owner.id, isPrimary);
  const geometry = primary && isometricGeometryOf(primary);
  if (!geometry) {
    return null;
  }
  const apex = { x: lead.draggedBounds.x + geometry.depth * AXIS_COS, y: lead.draggedBounds.y };
  const excludedIds = new Set(drag.canvasObjects.map(canvasObject => canvasObject.owner.id));
  const candidates = findIsometricApexCandidates(svg, excludedIds);
  const snap = snapIsometricDiagonal(apex, rawDx, rawDy, candidates, SNAP_THRESHOLD_PX / pxPerUnit(svg));
  return snap ? { dx: snap.dx, dy: snap.dy, guides: [snap.guide] } : null;
}

export function snapMove(svg: SVGSVGElement, drag: MoveDragState, rawDx: number, rawDy: number): MoveDelta {
  const isometricSnap = snapIsometricMove(svg, drag, rawDx, rawDy);
  if (isometricSnap) {
    return isometricSnap;
  }

  const leadBounds = offsetBounds(drag.canvasObjects[0].draggedBounds, rawDx, rawDy);
  const excludedIds = new Set(drag.canvasObjects.map(canvasObject => canvasObject.owner.id));
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
    guides: [snap.x.guide, snap.y.guide].filter(guide => guide !== null),
  };
}
