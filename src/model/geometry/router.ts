export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface Bounds {
  x: number; y: number; width: number; height: number; rotation?: number;
}

export interface Port { side: Side; offset: number } // offset in [0..1]

export interface CubicPoints { p0:[number,number]; p1:[number,number]; p2:[number,number]; p3:[number,number] }
// 🎯 NEW: Segment-based representation for Miro-style multi-handle support
export interface PathSegment {
  start: { x: number; y: number };
  end: { x: number; y: number };
  midpoint: { x: number; y: number }; // Current midpoint (WITH offset applied)
  originalMidpoint: { x: number; y: number }; // 🎯 NEW: Original midpoint WITHOUT offset
  isHorizontal: boolean; // true = horizontal line, false = vertical line
  canMove: boolean; // false for start/end segments (fixed to entity edges)
}

export interface OrthoPath { 
  points: number[]; // [x0,y0, x1,y1, ...] - the complete path
  segments: PathSegment[]; // 🎯 Individual segments with their midpoints and orientations
}

/** Unit outward normals for each side in local axis-aligned space */
const SIDE_N: Record<Side, [number,number]> = {
  top:    [ 0,-1],
  right:  [ 1, 0],
  bottom: [ 0, 1],
  left:   [-1, 0],
};

// ============ ROTATION HELPERS ============

const DEG2RAD = Math.PI / 180;

/** Rotate a vector by degrees */
function rotateVector(x: number, y: number, degrees: number): [number, number] {
  const rad = degrees * DEG2RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [x * cos - y * sin, x * sin + y * cos];
}

// ============ CORNER ROUNDING ============

/**
 * 🎯 Round 90° corners in orthogonal polyline with circular arcs
 * Approximate each corner with small arc segments for smooth visual appearance
 * 
 * @param pts - Original orthogonal path [x0,y0, x1,y1, ...]
 * @param radius - Corner radius in pixels (8-12px recommended)
 * @returns New path with rounded corners
 */
export function roundOrthogonalPath(pts: number[], radius: number): number[] {
  if (pts.length < 6) return pts; // Less than 2 segments -> nothing to round

  const out: number[] = [];
  const n = pts.length / 2 - 1; // Number of segments

  // First point unchanged
  out.push(pts[0], pts[1]);

  const SAMPLES = 8; // Points on quarter circle (higher = smoother, 8 is sweet spot)

  for (let i = 1; i < n; i++) {
    const xPrev = pts[(i - 1) * 2];
    const yPrev = pts[(i - 1) * 2 + 1];
    const x     = pts[i * 2];
    const y     = pts[i * 2 + 1];
    const xNext = pts[(i + 1) * 2];
    const yNext = pts[(i + 1) * 2 + 1];

    const dx1 = x - xPrev;
    const dy1 = y - yPrev;
    const dx2 = xNext - x;
    const dy2 = yNext - y;

    // Only process true 90° corners (axis-aligned orthogonal segments)
    const isAxis1 = dx1 === 0 || dy1 === 0;
    const isAxis2 = dx2 === 0 || dy2 === 0;
    const isStraight = (dx1 === 0 && dx2 === 0) || (dy1 === 0 && dy2 === 0);

    if (!isAxis1 || !isAxis2 || isStraight) {
      // Not a corner -> keep original point
      out.push(x, y);
      continue;
    }

    // Segment lengths (Manhattan distance)
    const len1 = Math.abs(dx1) + Math.abs(dy1);
    const len2 = Math.abs(dx2) + Math.abs(dy2);

    // Effective radius limited to 40% of adjacent segment lengths
    const r = Math.min(radius, len1 * 0.4, len2 * 0.4);
    if (r <= 0) {
      out.push(x, y);
      continue;
    }

    // Direction vectors (normalized, orthogonal -> ±1 or 0)
    const v1x = dx1 !== 0 ? Math.sign(dx1) : 0;
    const v1y = dy1 !== 0 ? Math.sign(dy1) : 0;
    const v2x = dx2 !== 0 ? Math.sign(dx2) : 0;
    const v2y = dy2 !== 0 ? Math.sign(dy2) : 0;

    // Point on first segment, r before corner
    const p1x = x - v1x * r;
    const p1y = y - v1y * r;

    // Point on second segment, r after corner
    const p2x = x + v2x * r;
    const p2y = y + v2y * r;

    // Circle center for quarter arc
    const cx = x - v1x * r + v2x * r;
    const cy = y - v1y * r + v2y * r;

    // Start/end angles
    const a1 = Math.atan2(p1y - cy, p1x - cx);
    const a2 = Math.atan2(p2y - cy, p2x - cx);

    let startAngle = a1;
    let endAngle = a2;

    // Ensure we take the shorter 90° arc
    let diff = endAngle - startAngle;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    endAngle = startAngle + diff;

    // 1) Point before corner (where rounding starts)
    out.push(p1x, p1y);

    // 2) Intermediate points on quarter circle (smooth arc)
    for (let j = 1; j < SAMPLES - 1; j++) {
      const t = j / (SAMPLES - 1); // 0..1
      const ang = startAngle + diff * t;
      const qx = cx + Math.cos(ang) * r;
      const qy = cy + Math.sin(ang) * r;
      out.push(qx, qy);
    }

    // 3) Point after corner (start of next segment)
    out.push(p2x, p2y);
  }

  // Last point unchanged
  out.push(pts[pts.length - 2], pts[pts.length - 1]);

  return out;
}

/** Get the center point of bounds */
function centerOf(b: Bounds): {x: number; y: number} {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Transform a point from world to local space (relative to bounds center, unrotated) */
function worldToLocal(bounds: Bounds, worldPt: {x: number; y: number}): {x: number; y: number} {
  const center = centerOf(bounds);
  const relative = { x: worldPt.x - center.x, y: worldPt.y - center.y };
  if (!bounds.rotation) return relative;
  
  const [lx, ly] = rotateVector(relative.x, relative.y, -bounds.rotation);
  return { x: lx, y: ly };
}

/** Transform a point from local to world space (relative to bounds center, rotated) */
function localToWorld(bounds: Bounds, localPt: {x: number; y: number}): {x: number; y: number} {
  const center = centerOf(bounds);
  if (!bounds.rotation) {
    return { x: center.x + localPt.x, y: center.y + localPt.y };
  }
  
  const [wx, wy] = rotateVector(localPt.x, localPt.y, bounds.rotation);
  return { x: center.x + wx, y: center.y + wy };
}

/** Convert (side,offset) to world point with rotation support */
export function portToPoint(b: Bounds, port: Port): {x:number;y:number} {
  const t = Math.max(0, Math.min(1, port.offset));
  
  // Calculate local point (relative to center)
  let localX = 0, localY = 0;
  const hw = b.width / 2, hh = b.height / 2;
  
  switch (port.side) {
    case 'top':    localX = (t - 0.5) * b.width;  localY = -hh; break;
    case 'right':  localX = hw;  localY = (t - 0.5) * b.height; break;
    case 'bottom': localX = (t - 0.5) * b.width;  localY = hh; break;
    case 'left':   localX = -hw; localY = (t - 0.5) * b.height; break;
  }
  
  // Transform to world space with rotation
  return localToWorld(b, { x: localX, y: localY });
}

/** Convert a Symbol's normalized named-port `at` (0..1, relative to the
 *  instance's bounding box - same convention as Symbol.points) to a world
 *  point, with rotation support. Reuses the same center-relative
 *  local-to-world transform as portToPoint - no new rotation math. */
export function namedPortToPoint(b: Bounds, at: [number, number]): {x:number;y:number} {
  const localX = (at[0] - 0.5) * b.width;
  const localY = (at[1] - 0.5) * b.height;
  return localToWorld(b, { x: localX, y: localY });
}

/** Project a world point onto an edge to get an offset in [0..1] with rotation support */
export function projectOffsetOnSide(b: Bounds, side: Side, worldPt:{x:number;y:number}): number {
  // Transform world point to local space
  const localPt = worldToLocal(b, worldPt);
  
  switch (side) {
    case 'top':
    case 'bottom':
      return (localPt.x + b.width/2) / b.width;
    case 'left':
    case 'right':
      return (localPt.y + b.height/2) / b.height;
  }
}

/** Choose a side with hysteresis in local space. Prefer stickySide until the
 *  vector-to-target exits the side's cone + margin. */
export function chooseSide(
  a: Bounds, b: Bounds, sticky?: Side
): Side {
  // Work in A's local space for rotation-aware side selection
  const centerA = centerOf(a);
  const centerB = centerOf(b);
  const worldVector = { x: centerB.x - centerA.x, y: centerB.y - centerA.y };
  
  // Transform the direction vector to A's local space
  const localVector = worldToLocal(a, { x: centerA.x + worldVector.x, y: centerA.y + worldVector.y });
  const localCenter = worldToLocal(a, centerA);
  
  const vx = localVector.x - localCenter.x;
  const vy = localVector.y - localCenter.y;

  const scoreSide = (s: Side) => {
    const n = SIDE_N[s];
    const dot = n[0]*vx + n[1]*vy;     // alignment with normal
    const absx = Math.abs(vx), absy = Math.abs(vy);
    // prefer sides aligned with primary axis
    const axisBias = (s==='left'||s==='right') ? absx - absy : absy - absx;
    // higher is better; we want max
    return dot + 0.5*axisBias;
  };

  const best = (['left','right','top','bottom'] as Side[]).reduce((acc, s) =>
    scoreSide(s) > scoreSide(acc) ? s : acc, 'right');

  if (!sticky) return best;

  // keep sticky unless it's clearly wrong
  const stickyScore = scoreSide(sticky);
  const bestScore = scoreSide(best);
  const hysteresis = 40; // tune: require ~"big" advantage to switch
  if (bestScore > stickyScore + hysteresis) return best;
  return sticky;
}

/** Compute cubic control distances to ensure orthogonal endpoints and nice S-curves */
function controlDistances(
  p0:{x:number;y:number}, p3:{x:number;y:number},
  n0:[number,number], n3:[number,number],
  opts?: {min?:number; max?:number; sMult?:number}
): {d1:number; d2:number} {
  const min = opts?.min ?? 50;
  const max = opts?.max ?? 240;
  const sMult = opts?.sMult ?? 0.9; // how aggressively we enlarge for S

  // components along normals (how far we need to "push out")
  const vx = p3.x - p0.x, vy = p3.y - p0.y;

  const along0 = Math.abs(vx*n0[0] + vy*n0[1]);
  const along3 = Math.abs(vx*n3[0] + vy*n3[1]);

  // secondary separation pushes stronger S if small or negative along components
  const perp0 = Math.abs(vx*n0[1] - vy*n0[0]);
  const perp3 = Math.abs(vx*n3[1] - vy*n3[0]);

  // normals parallel? boost to create S
  const parallel = (n0[0]===n3[0] && n0[1]===n3[1]) || (n0[0]===-n3[0] && n0[1]===-n3[1]);

  let d1 = Math.max(min, Math.min(max, Math.max(along0, perp0*sMult)));
  let d2 = Math.max(min, Math.min(max, Math.max(along3, perp3*sMult)));

  if (parallel) {
    d1 = Math.min(max, d1 + perp0 * 0.75);
    d2 = Math.min(max, d2 + perp3 * 0.75);
  }

  return { d1, d2 };
}

/** Build a cubic with orthogonal endpoints */
export function routeCubic(
  from:{x:number;y:number}, to:{x:number;y:number},
  fromSide: Side, toSide: Side,
  opts?: {min?:number; max?:number; sMult?:number}
): CubicPoints {
  const n0 = SIDE_N[fromSide];
  const n3 = SIDE_N[toSide];

  const { d1, d2 } = controlDistances(from, to, n0, n3, opts);
  const p1:[number,number] = [ from.x + n0[0]*d1, from.y + n0[1]*d1 ];
  const p2:[number,number] = [ to.x   + n3[0]*d2, to.y   + n3[1]*d2 ];

  return { p0:[from.x, from.y], p1, p2, p3:[to.x, to.y] };
}

type Point = { x: number; y: number };

function snapAlignedEndpoints(from: Point, to: Point, fromSide: Side, toSide: Side): [Point, Point] {
  const threshold = 6;
  const verticalPair = ['top', 'bottom'].includes(fromSide) && ['top', 'bottom'].includes(toSide);
  const horizontalPair = ['left', 'right'].includes(fromSide) && ['left', 'right'].includes(toSide);

  if (verticalPair && Math.abs(to.x - from.x) < threshold) return [from, { ...to, x: from.x }];
  if (horizontalPair && Math.abs(to.y - from.y) < threshold) return [from, { ...to, y: from.y }];
  return [from, to];
}

function chooseInitialOrientation(from: Point, to: Point, entityEdges?: { fromEdge?: Side; toEdge?: Side }): boolean {
  if (entityEdges?.toEdge) return entityEdges.toEdge === 'left' || entityEdges.toEdge === 'right';
  if (entityEdges?.fromEdge) return entityEdges.fromEdge === 'left' || entityEdges.fromEdge === 'right';
  return Math.abs(to.x - from.x) > Math.abs(to.y - from.y);
}

function stepOutDistances(
  from: Point,
  to: Point,
  fromNormal: [number, number],
  toNormal: [number, number],
  horizontalFirst: boolean,
): [number, number] {
  let fromDistance = 40;
  let toDistance = 40;
  const axis = horizontalFirst ? 0 : 1;
  const delta = (horizontalFirst ? to.x - from.x : to.y - from.y);

  if (fromNormal[axis] !== 0 && fromNormal[axis] === -toNormal[axis]) {
    const gap = delta * fromNormal[axis];
    if (gap > 0 && gap < fromDistance + toDistance) {
      fromDistance = gap / 2;
      toDistance = gap / 2;
    }
  } else if (fromNormal[axis] === 0) {
    const gap = delta * -toNormal[axis];
    if (gap > 0 && gap < toDistance) toDistance = gap;
  }

  return [fromDistance, toDistance];
}

function chooseBend(
  fromStub: [number, number],
  toStub: [number, number],
  to: Point,
  fromSide: Side,
  toSide: Side,
  fromNormal: [number, number],
  toNormal: [number, number],
  horizontalFirst: boolean,
): [number, number] {
  let x = (fromStub[0] + toStub[0]) / 2;
  let y = (fromStub[1] + toStub[1]) / 2;
  const fromHorizontal = fromSide === 'left' || fromSide === 'right';
  const toHorizontal = toSide === 'left' || toSide === 'right';

  if (fromHorizontal !== toHorizontal) {
    if (horizontalFirst) {
      x = (fromStub[0] - to.x) * toNormal[0] >= 0 ? fromStub[0] : toStub[0];
    } else {
      y = (fromStub[1] - to.y) * toNormal[1] >= 0 ? fromStub[1] : toStub[1];
    }
  } else if (fromSide === toSide) {
    if (horizontalFirst) {
      x = fromNormal[0] < 0 ? Math.min(fromStub[0], toStub[0]) : Math.max(fromStub[0], toStub[0]);
    } else {
      y = fromNormal[1] < 0 ? Math.min(fromStub[1], toStub[1]) : Math.max(fromStub[1], toStub[1]);
    }
  }

  return [x, y];
}

function segmentMidpoints(points: number[]): Point[] {
  const midpoints: Point[] = [];
  for (let index = 0; index < points.length - 2; index += 2) {
    midpoints.push({
      x: (points[index] + points[index + 2]) / 2,
      y: (points[index + 1] + points[index + 3]) / 2,
    });
  }
  return midpoints;
}

function baseOrthogonalPoints(
  from: Point,
  to: Point,
  fromStub: [number, number],
  toStub: [number, number],
  bend: [number, number],
  horizontalFirst: boolean,
): number[] {
  const points = [from.x, from.y, fromStub[0], fromStub[1]];
  if (horizontalFirst) {
    points.push(bend[0], fromStub[1], bend[0], toStub[1]);
  } else {
    points.push(fromStub[0], bend[1], toStub[0], bend[1]);
  }
  points.push(toStub[0], toStub[1], to.x, to.y);
  return points;
}

function movableInnerSegments(horizontalFirst: boolean, fromSide: Side, toSide: Side): [boolean, boolean] {
  const fixedSides = horizontalFirst ? ['left', 'right'] : ['top', 'bottom'];
  return [!fixedSides.includes(fromSide), !fixedSides.includes(toSide)];
}

function offsetOrthogonalPoints(
  from: Point,
  to: Point,
  fromStub: [number, number],
  toStub: [number, number],
  bend: [number, number],
  horizontalFirst: boolean,
  segmentOffsets: number[] | undefined,
  movable: [boolean, boolean],
): number[] {
  const first = movable[0] ? segmentOffsets?.[1] || 0 : 0;
  const middle = segmentOffsets?.[2] || 0;
  const last = movable[1] ? segmentOffsets?.[3] || 0 : 0;

  if (horizontalFirst) {
    const fromY = fromStub[1] + first;
    const bendX = bend[0] + middle;
    const toY = toStub[1] + last;
    return [from.x, from.y, fromStub[0], fromY, bendX, fromY, bendX, toY, toStub[0], toY, to.x, to.y];
  }

  const fromX = fromStub[0] + first;
  const bendY = bend[1] + middle;
  const toX = toStub[0] + last;
  return [from.x, from.y, fromX, fromStub[1], fromX, bendY, toX, bendY, toX, toStub[1], to.x, to.y];
}

function describeSegments(
  points: number[],
  originalMidpoints: Point[],
  canMoveFirstInner: boolean,
  canMoveLastInner: boolean,
): PathSegment[] {
  const totalSegments = (points.length - 2) / 2;
  return originalMidpoints.map((originalMidpoint, segmentIndex) => {
    const offset = segmentIndex * 2;
    const start = { x: points[offset], y: points[offset + 1] };
    const end = { x: points[offset + 2], y: points[offset + 3] };
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const isInner = segmentIndex > 0 && segmentIndex < totalSegments - 1;
    const isMovableEdge = segmentIndex === 1
      ? canMoveFirstInner
      : segmentIndex === totalSegments - 2
        ? canMoveLastInner
        : true;
    const hasLength = Math.hypot(end.x - start.x, end.y - start.y) >= 1;

    return {
      start,
      end,
      midpoint,
      originalMidpoint,
      isHorizontal: Math.abs(end.x - start.x) > Math.abs(end.y - start.y),
      canMove: isInner && isMovableEdge && hasLength,
    };
  });
}

/** Build an orthogonal path and the segment metadata used by drag handles. */
export function routeOrthogonal(
  from:{x:number;y:number}, to:{x:number;y:number},
  fromSide: Side, toSide: Side,
  segmentOffsets?: number[], // 🎯 Array of perpendicular offsets, one per movable segment
  entityEdges?: { fromEdge?: Side; toEdge?: Side } // 🎯 Entity edges for forced orientation
): OrthoPath {
  [from, to] = snapAlignedEndpoints(from, to, fromSide, toSide);

  const n0 = SIDE_N[fromSide];
  const n3 = SIDE_N[toSide];
  const horizontalFirst = chooseInitialOrientation(from, to, entityEdges);

  const [k0, k3] = stepOutDistances(from, to, n0, n3, horizontalFirst);
  const a1: [number, number] = [from.x + n0[0] * k0, from.y + n0[1] * k0];
  const b1: [number, number] = [to.x + n3[0] * k3, to.y + n3[1] * k3];
  const [midX, midY] = chooseBend(a1, b1, to, fromSide, toSide, n0, n3, horizontalFirst);
  const bend: [number, number] = [midX, midY];
  const originalPoints = baseOrthogonalPoints(from, to, a1, b1, bend, horizontalFirst);
  const originalSegmentMidpoints = segmentMidpoints(originalPoints);
  const movable = movableInnerSegments(horizontalFirst, fromSide, toSide);
  const pts = offsetOrthogonalPoints(from, to, a1, b1, bend, horizontalFirst, segmentOffsets, movable);
  const [canMoveFirstInner, canMoveLastInner] = movable;
  const segments = describeSegments(
    pts,
    originalSegmentMidpoints,
    canMoveFirstInner,
    canMoveLastInner,
  );
  
  // 🎯 STEP 4: Apply corner rounding to visible path (segments remain unchanged for handles)
  const cornerRadius = 10; // Radius in pixels (8-12px recommended for Miro/Figma look)
  const roundedPoints = roundOrthogonalPath(pts, cornerRadius);
  
  return { points: roundedPoints, segments };
}

/** Recommend a sticky port (side+offset) for endpoint A looking at B.
 *  Uses FIXED EDGE CENTERS to prevent sliding during entity movement. */
export function recommendPort(a: Bounds, b: Bounds, sticky?: Port): Port {
  const side = chooseSide(a, b, sticky?.side);
  
  // FIXED: Always use center of edge (0.5 offset) instead of projecting target
  // This prevents connection points from sliding when entities move
  let offset = 0.5; // Fixed center position
  
  // Only apply small adjustments if we have a sticky port on the same side
  if (sticky && sticky.side === side) {
    // Keep existing offset with slight center-bias for stability
    offset = sticky.offset * 0.9 + 0.5 * 0.1;
  }
  
  return { side, offset };
}
