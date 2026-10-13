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
import { isSnapDisabled, nearestIsometricLatticePoint, readIsometricSnapStep } from '../snapGrid';
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
function isometricApexOf(
  svg: SVGSVGElement,
  drag: MoveDragState,
  declared = false,
): { x: number; y: number } | null {
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
  const frame = declared && geometry.bounds ? geometry.bounds : lead.draggedBounds;
  return { x: frame.x + geometry.depth * AXIS_COS, y: frame.y };
}

function snapIsometricGrid(svg: SVGSVGElement, drag: MoveDragState, rawDx: number, rawDy: number): MoveDelta | null {
  const step = readIsometricSnapStep(svg);
  const apex = step ? isometricApexOf(svg, drag, true) : null;
  if (!step || !apex) {
    return null;
  }
  const lattice = nearestIsometricLatticePoint({ x: apex.x + rawDx, y: apex.y + rawDy }, step);
  return { dx: lattice.x - apex.x, dy: lattice.y - apex.y, guides: [] };
}

function snapIsometricMove(svg: SVGSVGElement, drag: MoveDragState, rawDx: number, rawDy: number): MoveDelta | null {
  const apex = isometricApexOf(svg, drag);
  if (!apex) {
    return null;
  }
  const excludedIds = new Set(drag.canvasObjects.map(canvasObject => canvasObject.owner.id));
  const candidates = findIsometricApexCandidates(svg, excludedIds);
  const snap = snapIsometricDiagonal(apex, rawDx, rawDy, candidates, SNAP_THRESHOLD_PX / pxPerUnit(svg));
  return snap ? { dx: snap.dx, dy: snap.dy, guides: [snap.guide] } : null;
}

export function snapMove(svg: SVGSVGElement, drag: MoveDragState, rawDx: number, rawDy: number): MoveDelta {
  if (isSnapDisabled(svg)) {
    return { dx: rawDx, dy: rawDy, guides: [] };
  }
  const isometricSnap = snapIsometricMove(svg, drag, rawDx, rawDy);
  if (isometricSnap) {
    return isometricSnap;
  }
  const gridSnap = snapIsometricGrid(svg, drag, rawDx, rawDy);
  if (gridSnap) {
    return gridSnap;
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
