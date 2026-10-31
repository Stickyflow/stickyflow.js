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
import type { AxisSnap, GapSnap } from '../snapGeometry';
import {
  computeGapSnap,
  computeSnap,
  MOVE_ACTIVE_POINTS,
  nearestCandidates,
  snapIsometricDiagonal,
} from '../snapGeometry';
import { isSnapDisabled, nearestIsometricLatticePoint, readIsometricSnapStep, snapDistancePx } from '../snapGrid';
import { offsetBounds } from './geometry';
import type { MoveDragState } from './state';

const GUIDE_OVERHANG = 10;

export interface MoveDelta {
  dx: number;
  dy: number;
  guides: GuideLine[];
}

function isometricApexOf(svg: SVGSVGElement, drag: MoveDragState, declared = false): { x: number; y: number } | null {
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
  const snap = snapIsometricDiagonal(apex, rawDx, rawDy, candidates, snapDistancePx(svg) / pxPerUnit(svg));
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
  const threshold = snapDistancePx(svg) / pxPerUnit(svg);
  const snap = computeSnap(leadBounds, candidates, {
    threshold,
    activeX: MOVE_ACTIVE_POINTS,
    activeY: MOVE_ACTIVE_POINTS,
    guideOverhang: GUIDE_OVERHANG,
  });
  // On each axis the nearer of the two wins: lining up with an edge, or keeping the gaps of a row equal.
  const gaps = computeGapSnap(leadBounds, candidates, threshold);
  const pick = (align: AxisSnap, gap: GapSnap | null): GapSnap => {
    if (gap && (!align.guide || Math.abs(gap.delta) < Math.abs(align.delta))) {
      return gap;
    }
    return { delta: align.delta, guides: align.guide ? [align.guide] : [] };
  };
  const x = pick(snap.x, gaps.x);
  const y = pick(snap.y, gaps.y);
  return { dx: rawDx + x.delta, dy: rawDy + y.delta, guides: [...x.guides, ...y.guides] };
}
