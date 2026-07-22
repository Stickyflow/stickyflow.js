// src/entities/links/geometry/router.ts
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

/** 
 * 🎯 NEW MIRO-STYLE: Orthogonal path with movable segment midpoints
 * Returns path points AND segment data for multi-handle manipulation
 */
export function routeOrthogonal(
  from:{x:number;y:number}, to:{x:number;y:number},
  fromSide: Side, toSide: Side,
  segmentOffsets?: number[], // 🎯 Array of perpendicular offsets, one per movable segment
  entityEdges?: { fromEdge?: Side; toEdge?: Side } // 🎯 Entity edges for forced orientation
): OrthoPath {
  // Snap near-aligned endpoints on directly-opposed sides (top/bottom or
  // left/right on both ends) to exactly aligned. Two ports that are only a
  // couple pixels off-axis (e.g. imported bounding boxes that are visually
  // aligned but not pixel-identical) would otherwise route through a tiny
  // extra dogleg in the middle segment — a visible "kink" in what should be
  // a straight connector.
  const ALIGNMENT_SNAP = 6;
  const verticalPair = (fromSide === 'top' || fromSide === 'bottom') && (toSide === 'top' || toSide === 'bottom');
  const horizontalPair = (fromSide === 'left' || fromSide === 'right') && (toSide === 'left' || toSide === 'right');
  if (verticalPair && Math.abs(to.x - from.x) < ALIGNMENT_SNAP) {
    to = { ...to, x: from.x };
  } else if (horizontalPair && Math.abs(to.y - from.y) < ALIGNMENT_SNAP) {
    to = { ...to, y: from.y };
  }

  const n0 = SIDE_N[fromSide];
  const n3 = SIDE_N[toSide];
  const K = 40; // default step away from node before turning (tunable)

  // prefer "one bend" if possible - BUT respect entity edges if provided
  let horizontalFirst = Math.abs(to.x - from.x) > Math.abs(to.y - from.y);

  // Override based on entity edges (forced orientation for approach segments)
  if (entityEdges?.toEdge) {
    // If approaching left/right edge → path must END HORIZONTALLY (approaching from side)
    // If approaching top/bottom edge → path must END VERTICALLY (approaching from top/bottom)
    const mustEndHorizontally = entityEdges.toEdge === 'left' || entityEdges.toEdge === 'right';
    horizontalFirst = mustEndHorizontally;
  } else if (entityEdges?.fromEdge) {
    // If leaving from left/right edge → path must START HORIZONTALLY (leaving from side)
    // If leaving from top/bottom edge → path must START VERTICALLY (leaving from top/bottom)
    const mustStartHorizontally = entityEdges.fromEdge === 'left' || entityEdges.fromEdge === 'right';
    horizontalFirst = mustStartHorizontally;
  }

  // 🎯 Adaptive step-out distances: the points a1/b1 are normally pushed out
  // by a fixed K=40px before the bend. When `from`/`to` are close together
  // (gap < 2*K) on the axis the bend travels along, a1/b1 can "cross" past
  // each other, making the bend column/row land on the wrong side and
  // producing a self-crossing zigzag ("Knick") instead of a clean bend.
  // Shrink k0/k3 so a1/b1 never cross - only for sides that face each other
  // along that axis; "same side" combinations need a real loop and aren't
  // fixable by shrinking the step-out (left as-is, rarer in practice).
  let k0 = K, k3 = K;
  if (horizontalFirst) {
    if (n0[0] !== 0) {
      if (n0[0] === -n3[0]) {
        const gap = (to.x - from.x) * n0[0];
        if (gap > 0 && gap < k0 + k3) k0 = k3 = gap / 2;
      }
    } else {
      const gap = (to.x - from.x) * -n3[0];
      if (gap > 0 && gap < k3) k3 = gap;
    }
  } else {
    if (n0[1] !== 0) {
      if (n0[1] === -n3[1]) {
        const gap = (to.y - from.y) * n0[1];
        if (gap > 0 && gap < k0 + k3) k0 = k3 = gap / 2;
      }
    } else {
      const gap = (to.y - from.y) * -n3[1];
      if (gap > 0 && gap < k3) k3 = gap;
    }
  }

  const a1 = [from.x + n0[0]*k0, from.y + n0[1]*k0];
  const b1 = [to.x   + n3[0]*k3, to.y   + n3[1]*k3];

  // Connect a1 -> b1 with Manhattan L or Z
  let midX = (a1[0] + b1[0]) / 2;
  let midY = (a1[1] + b1[1]) / 2;

  // 🎯 Perpendicular exits (e.g. leaving right, arriving bottom) only ever
  // need a single bend - a clean "L" from a1 straight to b1's column/row.
  // The midpoint-average above is only necessary for *parallel* exits
  // (e.g. left-to-right) where a real Z/S detour is unavoidable. Using it
  // unconditionally here added a second, usually tiny, redundant bend right
  // after the step-out even when an L would do - visually a stray "Knick"
  // right next to the start.
  //
  // The collapse can snap to EITHER a1's or b1's coordinate on the bend
  // axis - both give a single-bend L, but only one of them is guaranteed not
  // to run back through the entity we're entering. b1 already has clearance
  // from "to" along its own normal (n3); a1 is only guaranteed clear of
  // "from", not of "to". If a1's coordinate sits on the wrong side of "to"
  // relative to n3 (e.g. entering "top" but a1 is already level with or
  // below "to"), the straight run between a1 and b1 would have to cross back
  // through "to" itself to reach the entry side - that's the "180°"
  // round-trip case. Pick whichever endpoint's coordinate is on the correct
  // (already-clear) side of "to".
  const fromIsHorizontalSide = fromSide === 'left' || fromSide === 'right';
  const toIsHorizontalSide = toSide === 'left' || toSide === 'right';
  if (fromIsHorizontalSide !== toIsHorizontalSide) {
    if (horizontalFirst) {
      const a1IsClearOfTo = (a1[0] - to.x) * n3[0] >= 0;
      midX = a1IsClearOfTo ? a1[0] : b1[0];
    } else {
      const a1IsClearOfTo = (a1[1] - to.y) * n3[1] >= 0;
      midY = a1IsClearOfTo ? a1[1] : b1[1];
    }
  } else if (fromSide === toSide) {
    // Same-side loop-backs (e.g. a "send back for rework" link that leaves
    // and re-enters via "top" on both ends): n0 and n3 point the same way, so
    // the exit stub (from -> a1) always travels further out in that
    // direction. If the midpoint-average then sits back *between* from and
    // to - which it does whenever one entity is much farther out along that
    // axis than the other - the path has to reverse straight back past its
    // own starting point to reach it, producing the same "180°" backtrack as
    // the perpendicular case above. Going all the way out to whichever of
    // a1/b1 is furthest in the shared exit direction keeps the path
    // continuing outward instead of doubling back.
    if (horizontalFirst) {
      midX = n0[0] < 0 ? Math.min(a1[0], b1[0]) : Math.max(a1[0], b1[0]);
    } else {
      midY = n0[1] < 0 ? Math.min(a1[1], b1[1]) : Math.max(a1[1], b1[1]);
    }
  }

  // 🎯 STEP 1: Calculate ORIGINAL path (without offsets) to get original segment midpoints
  const originalPts: number[] = [from.x, from.y, a1[0], a1[1]];
  if (horizontalFirst) {
    originalPts.push(midX, a1[1], midX, b1[1]);
  } else {
    originalPts.push(a1[0], midY, b1[0], midY);
  }
  originalPts.push(b1[0], b1[1], to.x, to.y);

  // Extract original segment midpoints (before any offset)
  const originalSegmentMidpoints: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < originalPts.length - 2; i += 2) {
    const start = { x: originalPts[i], y: originalPts[i + 1] };
    const end = { x: originalPts[i + 2], y: originalPts[i + 3] };
    originalSegmentMidpoints.push({
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    });
  }
  
  const rawOffset1 = segmentOffsets?.[1] || 0; // First inner segment
  const offset2 = segmentOffsets?.[2] || 0; // Middle segment
  const rawOffset3 = segmentOffsets?.[3] || 0; // Last inner segment

  // Keep the first/last edge-adjacent segments orthogonal to entity edges.
  // When the adjacent fixed segment has the same orientation as the inner segment,
  // applying a perpendicular shift would create a diagonal start/end segment.
  const canMoveFirstInner = horizontalFirst
    ? !(fromSide === 'left' || fromSide === 'right')
    : !(fromSide === 'top' || fromSide === 'bottom');
  const canMoveLastInner = horizontalFirst
    ? !(toSide === 'left' || toSide === 'right')
    : !(toSide === 'top' || toSide === 'bottom');

  const offset1 = canMoveFirstInner ? rawOffset1 : 0;
  const offset3 = canMoveLastInner ? rawOffset3 : 0;
  
  const pts:number[] = [from.x, from.y];
  
  if (horizontalFirst) {
    const adjustedA1Y = a1[1] + offset1; // Segment 1: horizontal line moves up/down
    const adjustedMidX = midX + offset2; // Segment 2: vertical line moves left/right  
    const adjustedB1Y = b1[1] + offset3; // Segment 3: horizontal line moves up/down
    
    pts.push(
      a1[0], adjustedA1Y,           // End of segment 0 / Start of segment 1
      adjustedMidX, adjustedA1Y,    // End of segment 1 / Start of segment 2
      adjustedMidX, adjustedB1Y,    // End of segment 2 / Start of segment 3
      b1[0], adjustedB1Y            // End of segment 3 / Start of segment 4
    );
  } else {
    const adjustedA1X = a1[0] + offset1; // Segment 1: vertical line moves left/right
    const adjustedMidY = midY + offset2; // Segment 2: horizontal line moves up/down
    const adjustedB1X = b1[0] + offset3; // Segment 3: vertical line moves left/right
    
    pts.push(
      adjustedA1X, a1[1],           // End of segment 0 / Start of segment 1  
      adjustedA1X, adjustedMidY,    // End of segment 1 / Start of segment 2
      adjustedB1X, adjustedMidY,    // End of segment 2 / Start of segment 3
      adjustedB1X, b1[1]            // End of segment 3 / Start of segment 4
    );
  }
  pts.push(to.x, to.y);

  // 🎯 STEP 3: Build segments array with BOTH current AND original midpoints
  // Segments are based on the STRAIGHT geometry (for handle positioning)
  const segments: PathSegment[] = [];
  
  for (let i = 0; i < pts.length - 2; i += 2) {
    const start = { x: pts[i], y: pts[i + 1] };
    const end = { x: pts[i + 2], y: pts[i + 3] };
    const midpoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    };
    
    // Get original midpoint from pre-calculated array
    const segmentIndex = i / 2;
    const originalMidpoint = originalSegmentMidpoints[segmentIndex];
    
    // Determine if segment is horizontal or vertical
    const isHorizontal = Math.abs(end.x - start.x) > Math.abs(end.y - start.y);
    
    // First and last segments are fixed to entity edges (can't move).
    // Inner segments are movable, except when edge-adjacent movement would break orthogonality.
    const totalSegments = (pts.length - 2) / 2;
    let canMove = false;
    if (segmentIndex > 0 && segmentIndex < totalSegments - 1) {
      if (segmentIndex === 1) {
        canMove = canMoveFirstInner;
      } else if (segmentIndex === totalSegments - 2) {
        canMove = canMoveLastInner;
      } else {
        canMove = true;
      }
    }

    // 🎯 Degenerate (near-zero-length) segments can't be meaningfully
    // dragged - e.g. when the adaptive step-out above collapses this
    // segment to ~0 because `from`/`to` are close together. Hide its handle.
    if (canMove && Math.hypot(end.x - start.x, end.y - start.y) < 1) {
      canMove = false;
    }

    segments.push({ start, end, midpoint, originalMidpoint, isHorizontal, canMove });
  }
  
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