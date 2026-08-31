import type { Bounds, Port, Side } from './types'
import { SIDE_N } from './internal'

const DEG2RAD = Math.PI / 180;

/** Rotate a vector by degrees */
function rotateVector(x: number, y: number, degrees: number): [number, number] {
  const rad = degrees * DEG2RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [x * cos - y * sin, x * sin + y * cos];
}

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

/** Recommend a sticky port (side+offset) for endpoint A looking at B.
 * Uses FIXED EDGE CENTERS to prevent sliding during entity movement. */
export function recommendPort(a: Bounds, b: Bounds, sticky?: Port): Port {
 const side = chooseSide(a, b, sticky?.side);
 
 // Always use center of edge (0.5 offset) instead of projecting target
 // This prevents connection points from sliding when entities move
 let offset = 0.5; // Fixed center position
 
 // Only apply small adjustments if we have a sticky port on the same side
 if (sticky && sticky.side === side) {
 // Keep existing offset with slight center-bias for stability
 offset = sticky.offset * 0.9 + 0.5 * 0.1;
 }
 
 return { side, offset };
}
